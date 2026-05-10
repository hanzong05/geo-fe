"use client";

import { useState } from "react";

interface InputModalProps {
  open: boolean;
  onSubmit: (
    qActual: number,
    magnitude: number,
    depth: number,
    tYears: number,
  ) => void;
  onClose: () => void;
}

const FOOTING_WIDTH_B = 3.0; // default footing width in metres

export default function InputModal({
  open,
  onSubmit,
  onClose,
}: InputModalProps) {
  const [depth, setDepth] = useState("1.5");
  const [buildingLoad, setBuildingLoad] = useState("1500"); // P in kN
  const [magnitude, setMagnitude] = useState("7.0");
  const [tYears, setTYears] = useState("50");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const P = parseFloat(buildingLoad); // kN
    const d = parseFloat(depth); // m
    const mw = parseFloat(magnitude); // Mw
    const t = parseFloat(tYears); // years

    if (isNaN(P) || P < 0) return;
    if (isNaN(d) || d < 0) return;
    if (isNaN(t) || t < 0) return;

    // Convert building load (kN) → contact pressure (kPa)
    // q_actual = P / B²  where B = footing width (m)
    const q_actual = P / (FOOTING_WIDTH_B * FOOTING_WIDTH_B);

    onSubmit(q_actual, isNaN(mw) ? 7.0 : mw, d, t);

    // reset to defaults
    setDepth("1.5");
    setBuildingLoad("1500");
    setMagnitude("7.0");
    setTYears("50");
  };

  const handleClose = () => {
    setDepth("1.5");
    setBuildingLoad("1500");
    setMagnitude("7.0");
    setTYears("50");
    onClose();
  };

  const P = parseFloat(buildingLoad);
  const d = parseFloat(depth);
  const t = parseFloat(tYears);
  const isValid =
    !isNaN(P) && P >= 0 && !isNaN(d) && d >= 0 && !isNaN(t) && t >= 0;

  // live preview of q_actual
  const qPreview = isNaN(P)
    ? null
    : (P / (FOOTING_WIDTH_B * FOOTING_WIDTH_B)).toFixed(2);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl px-6 py-6 w-[340px] sm:w-[400px]">
        <h2 className="text-base font-semibold text-slate-900 mb-1">
          Location Parameters
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Enter building and site details before running the analysis.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Foundation Depth */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Foundation Depth — Df (m)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 1.5"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Building Load */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Building Load — P (kN)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 1500"
              value={buildingLoad}
              onChange={(e) => setBuildingLoad(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
            {qPreview && (
              <p className="text-xs text-slate-400 mt-1">
                q_actual = {qPreview} kPa (P / B² = P / {FOOTING_WIDTH_B}²)
              </p>
            )}
          </div>

          {/* Earthquake Magnitude */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Earthquake Magnitude (Mw)
            </label>
            <input
              type="number"
              min="0"
              max="9.5"
              step="0.1"
              placeholder="e.g. 7.0"
              value={magnitude}
              onChange={(e) => setMagnitude(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 mt-1">
              Use 0 for static (no-earthquake) analysis
            </p>
          </div>

          {/* Design Life */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Design Life — t (years)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 50"
              value={tYears}
              onChange={(e) => setTYears(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Analyze
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
