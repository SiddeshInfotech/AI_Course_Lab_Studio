"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Play, X } from "lucide-react";
import type { RecordingDetectionEvent } from "@/types/electron";

export default function SecurityWarningOverlay() {
  const [showWarning, setShowWarning] = useState(false);
  const [detectedProcesses, setDetectedProcesses] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) {
      return;
    }

    const cleanup = window.electronAPI.onRecordingDetected(
      (data: RecordingDetectionEvent) => {
        if (data.detected) {
          setDetectedProcesses(data.processes || []);
          setShowWarning(true);
        }
      }
    );

    return cleanup;
  }, []);

  const handleDismiss = () => {
    setShowWarning(false);
  };

  if (!showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Warning Card */}
      <div className="relative z-10 max-w-md w-full mx-4 p-6 bg-white rounded-2xl shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-center text-slate-900 mb-2">
          Screen Capture Detected
        </h2>

        {/* Description */}
        <p className="text-slate-600 text-center mb-4">
          We detected that you may be using screen recording or screenshot
          software. Please close any of the following applications:
        </p>

        {/* Detected Processes */}
        {detectedProcesses.length > 0 && (
          <div className="bg-slate-100 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-slate-700 mb-2">
              Detected:
            </p>
            <div className="flex flex-wrap gap-2">
              {detectedProcesses.map((process, index) => (
                <span
                  key={index}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full"
                >
                  {process}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Warning Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Video playback is paused while this warning
            is displayed. Please close the recording software and click
            &quot;I Understand&quot; to resume.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleDismiss}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          <Play className="w-4 h-4" />
          I Understand - Resume
        </button>

        {/* Close button (alternative dismiss) */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
