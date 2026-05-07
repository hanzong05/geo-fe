"use client";

import React from "react";
import { IoHourglassOutline } from "react-icons/io5";

interface PredictingModalProps {
  open: boolean;
  message?: string;
}

export default function PredictingModal({
  open,
  message = "Running soil liquefaction analysis…",
}: PredictingModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl px-6 py-6 flex flex-col items-center gap-4 w-[280px] sm:w-[320px]">
        {/* Spinner */}
        <div className="animate-spin text-blue-600">
          <IoHourglassOutline size={36} />
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900">Please wait</p>
          <p className="text-xs text-slate-500 mt-1">{message}</p>
        </div>
      </div>
    </div>
  );
}
