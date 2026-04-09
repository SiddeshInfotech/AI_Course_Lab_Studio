"use client";

import { Suspense } from "react";
import { LearningPage } from "@/components/learning";
import { Loader } from "lucide-react";

export default function LearningPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      }
    >
      <LearningPage />
    </Suspense>
  );
}
