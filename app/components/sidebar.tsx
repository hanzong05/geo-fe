"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type ExcelJS from "exceljs";
import {
  IoLocation,
  IoDocumentText,
  IoSearchOutline,
  IoRefresh,
  IoExpandOutline,
  IoContractOutline,
} from "react-icons/io5";

interface PredictionData {
  location: {
    latitude: number;
    longitude: number;
    nearest_borehole_distance_km?: number;
  };
  risk_assessment: {
    risk_level: "VERY LOW" | "LOW" | "HIGH" | "VERY HIGH";
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
    source?: string;
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
  };
  recommendations: string[];
}

interface LiquefactionSidebarProps {
  location?: string;
  predictionData?: PredictionData | null;
  onToggleComparison?: () => void;
  onReinput?: () => void;
}

function SectionHeader({ title }: { title: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    </div>
  );
}

function SubRow({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-slate-600">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-bold ${accent ?? "text-slate-900"}`}>
          {value}
        </span>
        {unit && <span className="text-xs text-slate-400 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

export default function LiquefactionSidebar({
  location = "Tarlac City",
  predictionData,
  onReinput,
}: LiquefactionSidebarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const hasValidData =
    predictionData &&
    predictionData.soil_parameters.spt_n60 > 0 &&
    predictionData.soil_parameters.unit_weight > 0;

  const latitude = predictionData?.location.latitude ?? 15.4754;
  const longitude = predictionData?.location.longitude ?? 120.5963;
  const distanceKm = predictionData?.location.nearest_borehole_distance_km;

  const riskLevel = predictionData?.risk_assessment.risk_level ?? "VERY LOW";

  const probability = predictionData?.risk_assessment.probability ?? 0;
  const factorOfSafety = predictionData?.risk_assessment.factor_of_safety;
  const confidence = predictionData?.risk_assessment.confidence;

  const sptN60 = predictionData?.soil_parameters.spt_n60 ?? 0;
  const unitWeight = predictionData?.soil_parameters.unit_weight ?? 0;
  const csr = predictionData?.soil_parameters.csr ?? 0;
  const crr = predictionData?.soil_parameters.crr ?? 0;
  const gwl = predictionData?.soil_parameters.gwl ?? 0;
  const finesPercent = predictionData?.soil_parameters.fines_percent ?? 0;

  const allowableBearing = predictionData?.bearing_capacity.allowable_bearing_capacity_kpa ?? 0;

  const settlementCm = predictionData?.settlement.settlement_cm ?? 0;
  const settlementMm = (settlementCm * 10).toFixed(1);
  const lpi = predictionData?.settlement.lpi ?? 0;
  const lpiSeverity = predictionData?.settlement.lpi_severity ?? "None";

  const lpiSeverityColor: Record<string, string> = {
    "None": "text-green-600",
    "Low": "text-yellow-600",
    "Moderate": "text-orange-500",
    "High": "text-red-600",
    "Very High": "text-red-800",
  };

  const foundationBase = predictionData?.foundation_recommendation?.base_m;
  const foundationDepth = predictionData?.foundation_recommendation?.depth_m;

  type RiskColor = { bg: string; border: string; text: string; bar: string; badge: string };
  const riskColorMap: Record<string, RiskColor> = {
    "VERY HIGH": {
      bg: "bg-red-100",
      border: "border-red-400",
      text: "text-red-700",
      bar: "bg-red-700",
      badge: "bg-red-700",
    },
    HIGH: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-600",
      bar: "bg-red-500",
      badge: "bg-red-600",
    },
    LOW: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-700",
      bar: "bg-yellow-500",
      badge: "bg-yellow-600",
    },
    "VERY LOW": {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-600",
      bar: "bg-green-500",
      badge: "bg-green-600",
    },
  };
  const riskColors: RiskColor = riskColorMap[riskLevel] ?? {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-600",
    bar: "bg-gray-500",
    badge: "bg-gray-500",
  };

  const handleDownload = async () => {
    if (!hasValidData) {
      alert("No prediction data available. Please make a prediction first.");
      return;
    }

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "LIQUEFACT";
    wb.created = new Date();

    const riskFill: Record<string, ExcelJS.Fill> = {
      "VERY HIGH": { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECACA" } },
      HIGH:        { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } },
      LOW:         { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEFCE8" } },
      "VERY LOW":  { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } },
    };

    const riskFont: Record<string, Partial<ExcelJS.Font>> = {
      "VERY HIGH": { color: { argb: "FFB91C1C" }, bold: true },
      HIGH:        { color: { argb: "FFDC2626" }, bold: true },
      LOW:         { color: { argb: "FFB45309" }, bold: true },
      "VERY LOW":  { color: { argb: "FF16A34A" }, bold: true },
    };

    const headerFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    };

    const sectionFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF334155" },
    };

    const subHeaderFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };

    const applyHeaderStyle = (row: ExcelJS.Row) => {
      row.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
          wrapText: true,
        };
        cell.border = thinBorder;
      });
      row.height = 20;
    };

    const applySectionStyle = (row: ExcelJS.Row) => {
      row.eachCell((cell) => {
        cell.fill = sectionFill;
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };
        cell.alignment = { vertical: "middle" };
        cell.border = thinBorder;
      });
      row.height = 18;
    };

    const applySubHeaderStyle = (row: ExcelJS.Row) => {
      row.eachCell((cell) => {
        cell.fill = subHeaderFill;
        cell.font = { bold: true, size: 9, color: { argb: "FF475569" } };
        cell.alignment = { vertical: "middle" };
        cell.border = thinBorder;
      });
      row.height = 16;
    };

    const applyDataStyle = (row: ExcelJS.Row) => {
      row.eachCell((cell) => {
        cell.font = { size: 10 };
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.border = thinBorder;
      });
      row.height = 16;
    };

    const ws = wb.addWorksheet("Summary");
    ws.columns = [
      { key: "a", width: 38 },
      { key: "b", width: 22 },
      { key: "c", width: 12 },
    ];

    const titleRow = ws.addRow(["LIQUEFACTION RISK ASSESSMENT REPORT"]);
    ws.mergeCells(`A${titleRow.number}:C${titleRow.number}`);
    titleRow.getCell(1).fill = headerFill;
    titleRow.getCell(1).font = {
      color: { argb: "FFFFFFFF" },
      bold: true,
      size: 14,
    };
    titleRow.getCell(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    titleRow.height = 28;

    const genRow = ws.addRow(["Generated", new Date().toLocaleString(), ""]);
    applyDataStyle(genRow);
    genRow.getCell(1).font = {
      bold: true,
      size: 10,
      color: { argb: "FF64748B" },
    };

    ws.addRow([]);

    applySectionStyle(ws.addRow(["LOCATION", "", ""]));
    applySubHeaderStyle(ws.addRow(["Field", "Value", ""]));
    [
      ["Location Name", location, ""],
      ["Latitude", latitude.toFixed(6), "°N"],
      ["Longitude", longitude.toFixed(6), "°E"],
      ["Nearest Borehole Distance", distanceKm ? distanceKm.toFixed(2) : "N/A", "km"],
    ].forEach((r) => applyDataStyle(ws.addRow(r)));

    ws.addRow([]);

    applySectionStyle(ws.addRow(["LIQUEFACTION ANALYSIS", "", ""]));
    applySubHeaderStyle(ws.addRow(["Parameter", "Value", ""]));

    const riskRow = ws.addRow(["Risk Level", riskLevel, ""]);
    applyDataStyle(riskRow);
    riskRow.getCell(2).fill = riskFill[riskLevel] ?? subHeaderFill;
    riskRow.getCell(2).font = riskFont[riskLevel] ?? { bold: true };
    riskRow.getCell(2).alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    [
      ["Liquefaction Probability", `${probability}%`, ""],
      ["Factor of Safety", factorOfSafety !== undefined ? factorOfSafety.toFixed(3) : "N/A", ""],
      ["Confidence Level", confidence ?? "N/A", ""],
      ["Data Source", predictionData?.risk_assessment.data_source ?? "N/A", ""],
    ].forEach((r) => applyDataStyle(ws.addRow(r)));

    ws.addRow([]);

    applySectionStyle(ws.addRow(["SOIL PARAMETERS (Critical Layer)", "", ""]));
    applySubHeaderStyle(ws.addRow(["Parameter", "Value", "Unit"]));
    [
      ["SPT N60", sptN60, "blows/ft"],
      ["Unit Weight (γ)", unitWeight, "kN/m³"],
      ["Cyclic Stress Ratio (CSR)", csr.toFixed(4), "—"],
      ["Cyclic Resistance Ratio (CRR)", crr.toFixed(4), "—"],
      ["Groundwater Level (GWL)", gwl, "m"],
      ["Fines Content", finesPercent, "%"],
    ].forEach((r) => applyDataStyle(ws.addRow(r)));

    ws.addRow([]);

    applySectionStyle(ws.addRow(["SOIL PERFORMANCE", "", ""]));
    applySubHeaderStyle(ws.addRow(["Condition", "Value", "Unit"]));

    [
      ["Allowable Soil Bearing Capacity", Math.round(allowableBearing), "kN/m²"],
      ["Settlement", settlementMm, "mm"],
      ["Liquefaction Potential Index (LPI)", lpi !== undefined ? lpi.toFixed(2) : "N/A", lpiSeverity ?? "—"],
    ].forEach((r) => applyDataStyle(ws.addRow(r)));

    ws.addRow([]);

    applySectionStyle(ws.addRow(["FOUNDATION RECOMMENDATION", "", ""]));
    applySubHeaderStyle(ws.addRow(["Parameter", "Value", "Unit"]));
    [
      ["Base Width (B)", foundationBase !== undefined ? foundationBase.toFixed(2) : "N/A", "m"],
      ["Foundation Depth (D)", foundationDepth !== undefined ? foundationDepth.toFixed(2) : "N/A", "m"],
    ].forEach((r) => applyDataStyle(ws.addRow(r)));

    const wsRecs = wb.addWorksheet("Recommendations");
    wsRecs.columns = [
      { key: "a", width: 6 },
      { key: "b", width: 90 },
    ];
    applyHeaderStyle(wsRecs.addRow(["#", "Recommendation"]));

    (predictionData?.recommendations ?? []).forEach((r, i) => {
      const row = wsRecs.addRow([i + 1, r]);
      applyDataStyle(row);
      row.getCell(2).alignment = { wrapText: true, vertical: "middle" };
      row.height = 30;
    });

    const wsRaw = wb.addWorksheet("Raw Data");
    wsRaw.columns = [
      { key: "a", width: 32 },
      { key: "b", width: 22 },
    ];

    applyHeaderStyle(wsRaw.addRow(["Parameter", "Value"]));
    [
      ["latitude", latitude],
      ["longitude", longitude],
      ["risk_level", riskLevel],
      ["probability_%", probability],
      ["factor_of_safety", factorOfSafety ?? ""],
      ["confidence", confidence ?? ""],
      ["spt_n60", sptN60],
      ["unit_weight_kn_m3", unitWeight],
      ["csr", csr],
      ["crr", crr],
      ["gwl_m", gwl],
      ["fines_content_%", finesPercent],
      ["allowable_bearing_capacity_kpa", allowableBearing],
      ["capacity_reduction_%", predictionData?.bearing_capacity.capacity_reduction_percent ?? ""],
      ["settlement_mm", settlementCm * 10],
      ["foundation_base_m", foundationBase ?? ""],
      ["foundation_depth_m", foundationDepth ?? ""],
      ["nearest_borehole_km", distanceKm ?? ""],
    ].forEach((r) => applyDataStyle(wsRaw.addRow(r)));

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liquefaction-report-${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sidebarContent = (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[9999] bg-white flex flex-col overflow-hidden shadow-2xl"
          : "w-full md:w-96 h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden"
      }
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-slate-900 p-2 rounded-md flex-shrink-0 mt-0.5">
              <IoLocation className="text-white" size={18} />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-slate-900 truncate">
                {location}
              </h2>
              <p className="text-xs text-slate-500">
                {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
              </p>
              {mounted && distanceKm && hasValidData && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {distanceKm.toFixed(2)} km from nearest borehole
                </p>
              )}
            </div>

            <button
              onClick={() => setIsFullscreen((v) => !v)}
              className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <IoContractOutline size={18} />
              ) : (
                <IoExpandOutline size={18} />
              )}
            </button>
          </div>

          {mounted && !hasValidData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <IoSearchOutline
                  className="text-blue-600 flex-shrink-0 mt-0.5"
                  size={20}
                />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">
                    No Prediction Data
                  </h3>
                  <p className="text-xs text-blue-700">
                    Click on the map or enter coordinates to get a liquefaction
                    risk prediction.
                  </p>
                </div>
              </div>
            </div>
          )}

          {mounted && hasValidData && (
            <>
              <div
                className={`${riskColors.bg} ${riskColors.border} border rounded-lg p-4`}
              >
                <SectionHeader title="Liquefaction Analysis" />

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Risk Level</p>
                    <p className={`text-2xl font-bold ${riskColors.text}`}>
                      {riskLevel}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-0.5">Probability</p>
                    <p className={`text-2xl font-bold ${riskColors.text}`}>
                      {probability}%
                    </p>
                  </div>
                </div>

                <div className="h-1.5 bg-white/70 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full ${riskColors.bar} transition-all duration-500`}
                    style={{ width: `${probability}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <SectionHeader title="Soil Performance" />

                <SubRow
                  label="Allowable Soil Bearing Capacity"
                  value={Math.round(allowableBearing)}
                  unit="kN/m²"
                />
                <SubRow
                  label="Settlement"
                  value={settlementMm}
                  unit="mm"
                />
                <SubRow
                  label="Liquefaction Potential Index (LPI)"
                  value={`${lpi.toFixed(2)} (${lpiSeverity})`}
                  accent={lpiSeverityColor[lpiSeverity] ?? "text-slate-900"}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <SectionHeader title="Foundation Recommendation" />

                {foundationBase !== undefined ? (
                  <SubRow
                    label="Base (B) of Foundation"
                    value={foundationBase.toFixed(2)}
                    unit="m"
                    accent="text-blue-700"
                  />
                ) : (
                  <div className="py-2 text-xs text-slate-400">
                    Base (B) — awaiting API data
                  </div>
                )}

                {foundationDepth !== undefined ? (
                  <SubRow
                    label="Depth (D) of Foundation"
                    value={foundationDepth.toFixed(2)}
                    unit="m"
                    accent="text-blue-700"
                  />
                ) : (
                  <div className="py-2 text-xs text-slate-400">
                    Depth (D) — awaiting API data
                  </div>
                )}
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <button
                  onClick={handleDownload}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-5 rounded-lg flex items-center justify-center gap-2.5 transition-all shadow-sm hover:shadow-md"
                >
                  <IoDocumentText size={18} />
                  Export Excel Report
                </button>

                <button
                  onClick={onReinput}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 font-medium py-3 px-5 rounded-lg flex items-center justify-center gap-2.5 transition-all border border-slate-300 hover:border-slate-400 shadow-sm"
                >
                  <IoRefresh size={18} />
                  Re-input Parameters
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (isFullscreen && typeof window !== "undefined") {
    return createPortal(sidebarContent, document.body);
  }

  return sidebarContent;
}