"use client";

import { useState } from "react";

interface InputModalProps {
  open: boolean;
  onSubmit: (qActual: number, magnitude: number, depth: number, tYears: number) => void;
  onClose: () => void;
}

export default function InputModal({ open, onSubmit, onClose }: InputModalProps) {
  const [depth, setDepth] = useState("");
  const [qActual, setQActual] = useState("");
  const [magnitude, setMagnitude] = useState("0");
  const [tYears, setTYears] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(qActual);
    const d = parseFloat(depth);
    const t = parseFloat(tYears);
    if (isNaN(q) || q < 0) return;
    if (isNaN(d) || d < 0) return;
    if (isNaN(t) || t < 0) return;
    onSubmit(q, parseFloat(magnitude), d, t);
    setDepth("");
    setQActual("");
    setMagnitude("0");
    setTYears("");
  };

  const handleClose = () => {
    setDepth("");
    setQActual("");
    setMagnitude("0");
    setTYears("");
    onClose();
  };

  const isValid =
    qActual && parseFloat(qActual) >= 0 &&
    depth && parseFloat(depth) >= 0 &&
    tYears && parseFloat(tYears) >= 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl px-6 py-6 w-[320px] sm:w-[380px]">
        <h2 className="text-base font-semibold text-slate-900 mb-1">
          Location Parameters
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Enter building details before running the analysis.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Depth */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Depth (m)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 3.0"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Building Weight */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Building Weight — q actual (Kilonewtons)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 120"
              value={qActual}
              onChange={(e) => setQActual(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          {/* Earthquake Magnitude */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Earthquake Magnitude (Mw)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={magnitude}
              onChange={(e) => setMagnitude(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          {/* t in years */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              t (years)
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
