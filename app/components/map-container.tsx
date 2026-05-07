"use client";

import { useEffect, useRef, memo, useMemo } from "react";
import type { FeatureCollection } from "geojson";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _L: any = null;

if (typeof window !== "undefined") {
  import("leaflet").then((L) => {
    _L = L;
    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
      ._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BoreholeFeature {
  borehole_id: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  municipality?: string;
  risk_level: string;
  liquefaction_status: string;
  marker_color: "red" | "orange" | "green" | "gray";
  layer_count: number;
  liquefiable_layers: number;
  avg_csr?: number | null;
  avg_crr?: number | null;
  avg_spt_n?: number | null;
}

export interface BoreholeLegend {
  label: string;
  risk_levels: string[];
  count: number;
}

// ── SVG pin icon factory ──────────────────────────────────────────────────────
function createBoreholeIcon(color: string) {
  if (!_L) return null;

  const colorMap: Record<
    string,
    { fill: string; stroke: string; label: string }
  > = {
    red: { fill: "#ef4444", stroke: "#991b1b", label: "H" },
    orange: { fill: "#f97316", stroke: "#9a3412", label: "M" },
    green: { fill: "#22c55e", stroke: "#15803d", label: "L" },
    gray: { fill: "#9ca3af", stroke: "#4b5563", label: "?" },
  };
  const c = colorMap[color] ?? colorMap.gray;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <defs>
        <filter id="ds"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/></filter>
      </defs>
      <path d="M14 2 C7.373 2 2 7.373 2 14 C2 22 14 34 14 34 C14 34 26 22 26 14 C26 7.373 20.627 2 14 2 Z"
            fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5" filter="url(#ds)"/>
      <circle cx="14" cy="14" r="7" fill="white" opacity="0.9"/>
      <text x="14" y="18" text-anchor="middle" font-family="system-ui,sans-serif"
            font-size="9" font-weight="700" fill="${c.stroke}">${c.label}</text>
    </svg>`;

  return _L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -34],
  });
}

// ── Internal sub-components (unchanged from original) ────────────────────────
const ZoomToTarlac = memo(() => {
  const map = useMap();
  const hasZoomed = useRef(false);
  useEffect(() => {
    if (!map || hasZoomed.current) return;
    hasZoomed.current = true;
    setTimeout(() => {
      try {
        map.setView([12.8797, 121.774], 6);
        setTimeout(
          () =>
            map.flyTo([15.4754, 120.5963], 10, {
              duration: 2.5,
              easeLinearity: 0.25,
            }),
          800,
        );
      } catch (e) {
        console.error(e);
      }
    }, 100);
  }, [map]);
  return null;
});
ZoomToTarlac.displayName = "ZoomToTarlac";

const FlyToLocation = memo(
  ({ position }: { position: [number, number] | null }) => {
    const map = useMap();
    useEffect(() => {
      if (position && map) map.flyTo(position, 13, { duration: 1.5 });
    }, [position, map]);
    return null;
  },
);
FlyToLocation.displayName = "FlyToLocation";

const InvalidateMapSize = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
};

const LocationMarker = memo(
  ({
    position,
    setPosition,
    onRequestPrediction,
    tarlacGeoJson,
  }: {
    position: [number, number] | null;
    setPosition: (pos: [number, number]) => void;
    onRequestPrediction: (lat: number, lng: number) => void;
    tarlacGeoJson: FeatureCollection | null;
  }) => {
    const map = useMapEvents({
      click(e) {
        if (!isInsideTarlac(e.latlng.lat, e.latlng.lng, tarlacGeoJson)) return;
        const pos: [number, number] = [e.latlng.lat, e.latlng.lng];
        setPosition(pos);
        onRequestPrediction(e.latlng.lat, e.latlng.lng);
      },
      mousemove(e) {
        const inside = isInsideTarlac(e.latlng.lat, e.latlng.lng, tarlacGeoJson);
        map.getContainer().style.cursor = inside ? "" : "not-allowed";
      },
    });
    return position ? <Marker position={position} /> : null;
  },
);
LocationMarker.displayName = "LocationMarker";

// ── BoreholeMarkers ───────────────────────────────────────────────────────────
const BoreholeMarkers = memo(
  ({ boreholes }: { boreholes: BoreholeFeature[] }) => {
    const BG = {
      red: "#fef2f2",
      orange: "#fff7ed",
      green: "#f0fdf4",
      gray: "#f9fafb",
    };
    const BDR = {
      red: "#fca5a5",
      orange: "#fdba74",
      green: "#86efac",
      gray: "#d1d5db",
    };
    const TEXT = {
      red: "#991b1b",
      orange: "#9a3412",
      green: "#15803d",
      gray: "#4b5563",
    };

    return (
      <>
        {boreholes.map((bh) => {
          const icon = createBoreholeIcon(bh.marker_color);
          if (!icon) return null;
          const bg = BG[bh.marker_color] ?? "#f9fafb";
          const bdr = BDR[bh.marker_color] ?? "#d1d5db";
          const txt = TEXT[bh.marker_color] ?? "#4b5563";

          return (
            <Marker
              key={bh.borehole_id}
              position={[bh.latitude, bh.longitude]}
              icon={icon}
            >
              <Popup minWidth={220} maxWidth={280}>
                <div
                  style={{
                    fontFamily: "system-ui, sans-serif",
                    padding: "4px 0",
                  }}
                >
                  {/* Header badge */}
                  <div
                    style={{
                      background: bg,
                      border: `1px solid ${bdr}`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "#6b7280",
                        fontWeight: 500,
                        marginBottom: 2,
                      }}
                    >
                      BOREHOLE ID
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      {bh.borehole_id}
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        marginTop: 6,
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: txt,
                        color: "white",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {bh.liquefaction_status}
                    </div>
                  </div>

                  {/* Detail grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    {[
                      ["Risk Level", bh.risk_level],
                      ["Municipality", bh.municipality ?? "—"],
                      ["Soil Layers", bh.layer_count],
                      ["Liquefiable Layers", bh.liquefiable_layers],
                      [
                        "Avg CSR",
                        bh.avg_csr != null ? bh.avg_csr.toFixed(4) : "—",
                      ],
                      [
                        "Avg CRR",
                        bh.avg_crr != null ? bh.avg_crr.toFixed(4) : "—",
                      ],
                      [
                        "Avg SPT-N",
                        bh.avg_spt_n != null ? bh.avg_spt_n.toFixed(1) : "—",
                      ],
                      [
                        "Elevation",
                        bh.elevation != null ? `${bh.elevation} m` : "—",
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        style={{
                          background: "#f8fafc",
                          borderRadius: 6,
                          padding: "5px 8px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: "#9ca3af",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#1f2937",
                            marginTop: 1,
                          }}
                        >
                          {String(value)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coordinates */}
                  <div
                    style={{
                      fontSize: 10,
                      color: "#9ca3af",
                      textAlign: "center",
                      borderTop: "1px solid #f3f4f6",
                      paddingTop: 6,
                    }}
                  >
                    {bh.latitude.toFixed(5)}°N, {bh.longitude.toFixed(5)}°E
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </>
    );
  },
);
BoreholeMarkers.displayName = "BoreholeMarkers";

// ── Point-in-polygon (ray casting, GeoJSON coords: [lng, lat]) ───────────────
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function isInsideTarlac(lat: number, lng: number, geoJson: FeatureCollection | null): boolean {
  if (!geoJson) return true; // allow clicks while boundary loads
  for (const feature of geoJson.features) {
    const geom = feature.geometry;
    if (!geom) continue;
    if (geom.type === "Polygon") {
      if (pointInRing(lng, lat, geom.coordinates[0] as number[][])) return true;
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates as number[][][][]) {
        if (pointInRing(lng, lat, poly[0])) return true;
      }
    }
  }
  return false;
}

// ── Inverse mask — grays out everything outside Tarlac ────────────────────────
const TarlacMask = memo(({ geoJson }: { geoJson: FeatureCollection }) => {
  const maskFeature = useMemo(() => {
    const holes: number[][][] = [];
    for (const feature of geoJson.features) {
      const geom = feature.geometry;
      if (!geom) continue;
      if (geom.type === "Polygon") {
        holes.push(geom.coordinates[0] as number[][]);
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates as number[][][][]) {
          holes.push(poly[0]);
        }
      }
    }
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Polygon" as const,
        // world bbox as outer ring, Tarlac polygon(s) as holes
        coordinates: [
          [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]],
          ...holes,
        ],
      },
    };
  }, [geoJson]);

  return (
    <GeoJSON
      key="tarlac-mask"
      data={maskFeature}
      style={{ fillColor: "#475569", fillOpacity: 0.45, color: "transparent", weight: 0 }}
      interactive={false}
    />
  );
});
TarlacMask.displayName = "TarlacMask";

const geoJsonStyle = {
  fillColor: "#3b82f6",
  fillOpacity: 0.08,
  color: "#1d4ed8",
  weight: 2.5,
};

const LEGEND_CONFIG = [
  {
    key: "red",
    fill: "#ef4444",
    stroke: "#991b1b",
    label: "Liquefiable",
    sub: "HIGH / VERY HIGH",
  },
  {
    key: "orange",
    fill: "#f97316",
    stroke: "#9a3412",
    label: "Marginal",
    sub: "MEDIUM",
  },
  {
    key: "green",
    fill: "#22c55e",
    stroke: "#15803d",
    label: "Non-Liquefiable",
    sub: "LOW / VERY LOW",
  },
  {
    key: "gray",
    fill: "#9ca3af",
    stroke: "#4b5563",
    label: "No Data",
    sub: "—",
  },
];

// ── Main component props ──────────────────────────────────────────────────────
interface LeafletMapContainerProps {
  markerPosition: [number, number] | null;
  setMarkerPosition: (pos: [number, number]) => void;
  tarlacGeoJson: FeatureCollection | null;
  loading: boolean;
  onRequestPrediction: (lat: number, lng: number) => void;
  // NEW ↓
  boreholes?: BoreholeFeature[];
  boreholesLoading?: boolean;
  legend?: Record<string, BoreholeLegend>;
}

export const LeafletMapContainer = memo(
  ({
    markerPosition,
    setMarkerPosition,
    tarlacGeoJson,
    loading,
    onRequestPrediction,
    boreholes = [],
    boreholesLoading = false,
    legend = {},
  }: LeafletMapContainerProps) => {
    return (
      <>
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={6}
          scrollWheelZoom
          className="w-full h-full"
          zoomControl
        >
          <InvalidateMapSize />
          <ZoomToTarlac />
          <FlyToLocation position={markerPosition} />
          <LocationMarker
            position={markerPosition}
            setPosition={setMarkerPosition}
            onRequestPrediction={onRequestPrediction}
            tarlacGeoJson={tarlacGeoJson}
          />
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {tarlacGeoJson && <TarlacMask geoJson={tarlacGeoJson} />}
          {tarlacGeoJson && (
            <GeoJSON data={tarlacGeoJson} style={geoJsonStyle} />
          )}
          {boreholes.length > 0 && <BoreholeMarkers boreholes={boreholes} />}
        </MapContainer>

        {/* Boundary loading */}
        {loading && (
          <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-md shadow-md border border-gray-200 z-[1000]">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-900" />
              <span className="text-xs font-medium text-slate-700">
                Loading boundary data...
              </span>
            </div>
          </div>
        )}

        {/* Boreholes loading */}
        {boreholesLoading && (
          <div className="absolute top-14 right-4 bg-white px-4 py-2 rounded-md shadow-md border border-blue-200 z-[1000]">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
              <span className="text-xs font-medium text-blue-700">
                Loading boreholes...
              </span>
            </div>
          </div>
        )}

        {/* Legend panel */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 12,
            zIndex: 1000,
            background: "rgba(255,255,255,0.97)",
            borderRadius: 12,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            border: "1px solid rgba(0,0,0,0.08)",
            padding: "12px 14px",
            minWidth: 196,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6b7280",
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle
                cx="6"
                cy="6"
                r="5"
                fill="#3b82f6"
                opacity="0.2"
                stroke="#3b82f6"
                strokeWidth="1"
              />
              <circle cx="6" cy="6" r="2" fill="#3b82f6" />
            </svg>
            Liquefaction Risk
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {LEGEND_CONFIG.map(({ key, fill, stroke, label, sub }) => (
              <div
                key={key}
                style={{ display: "flex", alignItems: "center", gap: 9 }}
              >
                <svg
                  width="16"
                  height="20"
                  viewBox="0 0 28 36"
                  style={{ flexShrink: 0 }}
                >
                  <path
                    d="M14 2 C7.373 2 2 7.373 2 14 C2 22 14 34 14 34 C14 34 26 22 26 14 C26 7.373 20.627 2 14 2 Z"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="2"
                  />
                  <circle cx="14" cy="14" r="7" fill="white" opacity="0.85" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#1f2937",
                      lineHeight: 1.2,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.2 }}
                  >
                    {sub}
                  </div>
                </div>
                {(legend[key]?.count ?? 0) > 0 && (
                  <div
                    style={{
                      background: fill,
                      color: "white",
                      borderRadius: 10,
                      padding: "1px 7px",
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                      minWidth: 22,
                      textAlign: "center",
                    }}
                  >
                    {legend[key].count}
                  </div>
                )}
              </div>
            ))}
          </div>

          {boreholes.length > 0 && (
            <div
              style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: "1px solid #f3f4f6",
                fontSize: 11,
                color: "#6b7280",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Total boreholes</span>
              <span style={{ fontWeight: 700, color: "#1f2937" }}>
                {boreholes.length}
              </span>
            </div>
          )}
        </div>

        <style jsx global>{`
          .leaflet-popup-content-wrapper {
            border-radius: 12px !important;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
            border: 1px solid rgba(0, 0, 0, 0.06) !important;
          }
          .leaflet-popup-content {
            margin: 10px 12px !important;
          }
          .leaflet-popup-tip {
            box-shadow: none !important;
          }
        `}</style>
      </>
    );
  },
);
LeafletMapContainer.displayName = "LeafletMapContainer";
