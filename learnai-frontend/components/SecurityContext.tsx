"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { RecordingDetectionEvent } from "@/types/electron";

interface SecurityContextType {
  isSecurityWarningVisible: boolean;
  detectedProcesses: string[];
  dismissWarning: () => void;
}

const SecurityContext = createContext<SecurityContextType>({
  isSecurityWarningVisible: false,
  detectedProcesses: [],
  dismissWarning: () => {},
});

export function useSecurityWarning() {
  return useContext(SecurityContext);
}

interface SecurityProviderProps {
  children: ReactNode;
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const [isSecurityWarningVisible, setIsSecurityWarningVisible] = useState(false);
  const [detectedProcesses, setDetectedProcesses] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) {
      return;
    }

    const cleanup = window.electronAPI.onRecordingDetected(
      (data: RecordingDetectionEvent) => {
        if (data.detected) {
          setDetectedProcesses(data.processes || []);
          setIsSecurityWarningVisible(true);
        }
      }
    );

    return cleanup;
  }, []);

  const dismissWarning = () => {
    setIsSecurityWarningVisible(false);
  };

  return (
    <SecurityContext.Provider
      value={{
        isSecurityWarningVisible,
        detectedProcesses,
        dismissWarning,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}
