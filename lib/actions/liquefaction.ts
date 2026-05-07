// lib/actions/liquefaction.ts
'use server'

// IMPORTANT: Make sure .env.local has this:
// PYTHON_SERVICE_URL=http://localhost:8000

const PYTHON_API_URL = (process.env.PYTHON_SERVICE_URL || 'http://localhost:8000').replace(/\.$/, '');
const pythonHeaders = { 'Content-Type': 'application/json', 'x-api-key': process.env.API_SECRET_KEY! };

// Log on startup to debug
console.log('[Server Action] Python API URL:', PYTHON_API_URL);


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
        risk_level: 'VERY LOW' | 'LOW' | 'HIGH' | 'VERY HIGH';
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
    let url = `${PYTHON_API_URL}/predict-by-location?latitude=${latitude}&longitude=${longitude}`;
    if (qActual !== undefined) url += `&q_actual=${qActual}`;
    if (magnitude !== undefined) url += `&magnitude=${magnitude}`;
    if (depth !== undefined) url += `&depth=${depth}`;
    if (tYears !== undefined) url += `&t_years=${tYears}`;

    console.log('[Server Action] Fetching prediction from:', url);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: pythonHeaders,
            cache: 'no-store',
            signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        console.log('[Server Action] Response status:', response.status);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            console.error('[Server Action] API error:', error);
            throw new Error(error.detail || `API returned ${response.status}`);
        }

        const data: PredictionResult = await response.json();
        console.log('[Server Action] Prediction successful');
        return { success: true, data };

    } catch (error) {
        console.error('[Server Action] Prediction error:', error);

        // Provide helpful error messages
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Request timeout - Python API took too long to respond'
                };
            }

            if (error.message.includes('ECONNREFUSED')) {
                return {
                    success: false,
                    error: `Cannot connect to Python API at ${PYTHON_API_URL}. Make sure it's running: python api_corrected.py`
                };
            }

            if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
                return {
                    success: false,
                    error: `Cannot resolve hostname in ${PYTHON_API_URL}. Check your PYTHON_SERVICE_URL environment variable.`
                };
            }

            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: false,
            error: 'Prediction failed with unknown error'
        };
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
            signal: AbortSignal.timeout(15000),
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
            error: error instanceof Error ? error.message : 'Prediction failed'
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
            signal: AbortSignal.timeout(15000),
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
            error: error instanceof Error ? error.message : 'Failed to fetch borehole data'
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
            signal: AbortSignal.timeout(5000), // Shorter timeout for health check
        });

        if (!response.ok) {
            throw new Error(`Health check returned ${response.status}`);
        }

        const data = await response.json();
        console.log('[Server Action] Backend is healthy:', data);
        return { success: true, data };

    } catch (error) {
        console.error('[Server Action] Health check failed:', error);

        if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
            return {
                success: false,
                error: `Backend unavailable at ${PYTHON_API_URL}. Start it with: python api_corrected.py`
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
            signal: AbortSignal.timeout(30000), // Longer timeout for pipeline start
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
            error: error instanceof Error ? error.message : 'Failed to start pipeline'
        };
    }
}

export async function getTrainingPipelineStatus() {
    try {
        const response = await fetch(`${PYTHON_API_URL}/pipeline/status`, {
            method: 'GET',
            headers: pythonHeaders,
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            throw new Error('Failed to get pipeline status');
        }

        const data: PipelineStatus = await response.json();
        return { success: true, data };

    } catch (error) {
        console.error('[Server Action] Pipeline status error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get status'
        };
    }
}

export async function getTrainingPipelineLogs(limit: number = 50) {
    try {
        const response = await fetch(`${PYTHON_API_URL}/pipeline/logs?limit=${limit}`, {
            method: 'GET',
            headers: pythonHeaders,
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            throw new Error('Failed to get pipeline logs');
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error) {
        console.error('[Server Action] Pipeline logs error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get logs'
        };
    }
}

