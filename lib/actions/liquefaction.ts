// lib/actions/liquefaction.ts
'use server'

// IMPORTANT: Make sure .env.local has this:
// PYTHON_SERVICE_URL=http://localhost:8000

const PYTHON_API_URL = (process.env.PYTHON_SERVICE_URL || 'http://localhost:8000').replace(/\.$/, '');
const pythonHeaders = { 'Content-Type': 'application/json', 'x-api-key': process.env.API_SECRET_KEY! };

// Log on startup to debug
console.log('[Server Action] Python API URL:', PYTHON_API_URL);

// ── Constants ──────────────────────────────────────────────────────────────
/** Minimum physically valid moment magnitude.
 *  Passing anything below this (including 0 from uninitialised form state)
 *  inflates MSF to ~5.86 and zeroes out LPI entirely — BUG F.
 */
const MW_MIN = 5.0;
const MW_MAX = 9.5;
const MW_DEFAULT = 6.5;   // design earthquake for Central Luzon / Tarlac

/**
 * Sanitise a magnitude value received from the frontend.
 * Returns MW_DEFAULT when the value is falsy, NaN, or below MW_MIN.
 * Logs a warning so the issue is visible in Next.js server logs.
 */
function sanitiseMagnitude(raw: number | undefined | null): number {
    if (raw === undefined || raw === null || isNaN(raw) || raw < MW_MIN) {
        if (raw !== undefined && raw !== null && !isNaN(raw) && raw < MW_MIN) {
            console.warn(
                `[BUG F] predictByLocation received magnitude=${raw}. ` +
                `Values below ${MW_MIN} inflate MSF by up to 5× and zero all LPI. ` +
                `Using default Mw=${MW_DEFAULT}.`
            );
        }
        return MW_DEFAULT;
    }
    return Math.min(raw, MW_MAX);
}


export interface PredictionInput {
    latitude: number;
    longitude: number;
    spt_n60?: number;
    unit_weight?: number;
    csr?: number;
    crr?: number;
    gwl?: number;
    fines_percent?: number;
}

export interface PredictionResult {
    location: {
        latitude: number;
        longitude: number;
        nearest_borehole_distance_km: number;
        municipality?: string;
    };
    risk_assessment: {
        risk_level: 'VERY LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH';
        probability: number;
        severity: string;
        factor_of_safety?: number;
        confidence?: string;
        data_source?: string;
    };
    soil_parameters: {
        spt_n60: number;
        unit_weight: number;
        csr: number;
        crr: number;
        gwl: number;
        fines_percent: number;
        source: string;
    };
    settlement: {
        settlement_cm: number;
        severity: string;
        lpi?: number;
        lpi_severity?: string;
    };
    bearing_capacity: {
        allowable_bearing_capacity_kpa: number;
        capacity_reduction_percent: number;
    };
    foundation_recommendation?: {
        base_m: number;
        depth_m: number;
        mitigation_required?: boolean;
        settlement_mm?: number;
        allowable_settlement_mm?: number;
    };
    recommendations: string[];
    analysis_parameters?: {
        q_actual_kpa: number;
        magnitude_mw: number;
        msf: number;
        [key: string]: unknown;
    };
    interpolation_info?: {
        boreholes_used: number;
        nearest_distance_km: number;
        confidence: string;
        borehole_contributions: Array<{
            id: string;
            distance_km: number;
            weight: number;
        }>;
        [key: string]: unknown;
    };
}

export interface NearestBoreholeResult {
    success: boolean;
    nearest_borehole: {
        id: number;
        borehole_id: string;
        distance_km: number;
        latitude: number;
        longitude: number;
    };
    soil_parameters: {
        spt_n60: number;
        unit_weight: number;
        csr: number;
        crr: number;
        gwl: number;
        fines_percent: number;
    };
}


export async function predictByLocation(
    latitude: number,
    longitude: number,
    qActual?: number,
    magnitude?: number,
    depth?: number,
    tYears?: number,
) {
    // ── BUG F FIX ────────────────────────────────────────────────────────
    // magnitude=0 comes from uninitialised form state (e.g. a slider that
    // starts at 0 before the user touches it, or a number input left blank
    // that coerces to 0).  Passing it to the API causes MSF≈5.86 which
    // multiplies every FS by ~5.9 and makes LPI = 0.00 for all sites.
    const safeMagnitude = sanitiseMagnitude(magnitude);

    const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        magnitude: String(safeMagnitude),  // always sent — never omitted
    });

    if (qActual !== undefined && !isNaN(qActual)) params.set('q_actual', String(qActual));
    if (depth !== undefined && !isNaN(depth)) params.set('depth', String(depth));
    if (tYears !== undefined && !isNaN(tYears)) params.set('t_years', String(tYears));

    const url = `${PYTHON_API_URL}/predict-by-location?${params.toString()}`;

    console.log('[Server Action] Fetching prediction from:', url);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: pythonHeaders,
            cache: 'no-store',
            signal: AbortSignal.timeout(30_000),
        });

        console.log('[Server Action] Response status:', response.status);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            console.error('[Server Action] API error:', error);
            const detail = Array.isArray(error.detail)
                ? error.detail.map((e: { msg: string; loc?: string[] }) =>
                    `${e.loc?.slice(-1)[0] ?? 'field'}: ${e.msg}`).join('; ')
                : (typeof error.detail === 'string'
                    ? error.detail
                    : `API returned ${response.status}`);
            throw new Error(detail);
        }

        const data: PredictionResult = await response.json();

        // ── Sanity-check the response so callers don't silently see LPI=0 ──
        const lpi = data.settlement?.lpi;
        if (lpi === 0 || lpi === undefined) {
            const mswUsed = data.analysis_parameters?.msf;
            const mwUsed = data.analysis_parameters?.magnitude_mw;
            if (mswUsed !== undefined && mswUsed > 1.5) {
                console.error(
                    `[BUG F DETECTED] Response has LPI=0 and MSF=${mswUsed} (Mw=${mwUsed}). ` +
                    `The Python API received an inflated magnitude. ` +
                    `Check that magnitude was not sent as 0 or below ${MW_MIN}.`
                );
            }
        }

        console.log(
            `[Server Action] Prediction OK — LPI=${data.settlement?.lpi} ` +
            `risk=${data.risk_assessment?.risk_level} ` +
            `Mw=${data.analysis_parameters?.magnitude_mw} ` +
            `MSF=${data.analysis_parameters?.msf}`
        );

        return { success: true, data };

    } catch (error) {
        console.error('[Server Action] Prediction error:', error);

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Request timeout — Python API took too long to respond',
                };
            }
            if (error.message.includes('ECONNREFUSED')) {
                return {
                    success: false,
                    error: `Cannot connect to Python API at ${PYTHON_API_URL}. Make sure it's running.`,
                };
            }
            if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
                return {
                    success: false,
                    error: `Cannot resolve hostname in ${PYTHON_API_URL}. Check PYTHON_SERVICE_URL.`,
                };
            }
            return { success: false, error: error.message };
        }

        return { success: false, error: 'Prediction failed with unknown error' };
    }
}


export async function predictLiquefaction(input: PredictionInput) {
    const url = `${PYTHON_API_URL}/predict`;

    console.log('[Server Action] Posting prediction to:', url);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: pythonHeaders,
            body: JSON.stringify(input),
            cache: 'no-store',
            signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || 'Prediction failed');
        }

        const data: PredictionResult = await response.json();
        return { success: true, data };

    } catch (error) {
        console.error('[Server Action] Prediction error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Prediction failed',
        };
    }
}


export async function getNearestBorehole(latitude: number, longitude: number) {
    const url = `${PYTHON_API_URL}/nearest-borehole?latitude=${latitude}&longitude=${longitude}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: pythonHeaders,
            cache: 'no-store',
            signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || 'Failed to fetch borehole data');
        }

        const data: NearestBoreholeResult = await response.json();
        return { success: true, data };

    } catch (error) {
        console.error('[Server Action] Borehole fetch error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch borehole data',
        };
    }
}


export async function checkBackendHealth() {
    const url = `${PYTHON_API_URL}/health`;

    console.log('[Server Action] Checking health at:', url);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: pythonHeaders,
            signal: AbortSignal.timeout(5_000),
        });

        if (!response.ok) throw new Error(`Health check returned ${response.status}`);

        const data = await response.json();
        console.log('[Server Action] Backend is healthy:', data);
        return { success: true, data };

    } catch (error) {
        console.error('[Server Action] Health check failed:', error);

        if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
            return {
                success: false,
                error: `Backend unavailable at ${PYTHON_API_URL}. Start it with: python main.py`,
            };
        }

        return { success: false, error: 'Backend service unavailable' };
    }
}


export interface PipelineStatus {
    is_running: boolean;
    current_step: string | null;
    progress: number;
    start_time: string | null;
    end_time: string | null;
    steps_completed: string[];
    error: string | null;
    total_logs: number;
}

export async function startTrainingPipeline() {
    try {
        const response = await fetch(`${PYTHON_API_URL}/pipeline/start`, {
            method: 'POST',
            headers: pythonHeaders,
            cache: 'no-store',
            signal: AbortSignal.timeout(30_000),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || 'Failed to start pipeline');
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error) {
        console.error('[Server Action] Pipeline start error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to start pipeline',
        };
    }
}

export async function getTrainingPipelineStatus() {
    try {
        const response = await fetch(`${PYTHON_API_URL}/pipeline/status`, {
            method: 'GET',
            headers: pythonHeaders,
            cache: 'no-store',
            signal: AbortSignal.timeout(5_000),
        });

        if (!response.ok) throw new Error('Failed to get pipeline status');

        const data: PipelineStatus = await response.json();
        return { success: true, data };

    } catch (error) {
        console.error('[Server Action] Pipeline status error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get status',
        };
    }
}

export async function getTrainingPipelineLogs(limit: number = 50) {
    try {
        const response = await fetch(`${PYTHON_API_URL}/pipeline/logs?limit=${limit}`, {
            method: 'GET',
            headers: pythonHeaders,
            cache: 'no-store',
            signal: AbortSignal.timeout(5_000),
        });

        if (!response.ok) throw new Error('Failed to get pipeline logs');

        const data = await response.json();
        return { success: true, data };

    } catch (error) {
        console.error('[Server Action] Pipeline logs error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get logs',
        };
    }
}