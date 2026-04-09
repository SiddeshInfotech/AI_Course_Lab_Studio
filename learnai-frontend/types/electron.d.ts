export interface RecordingDetectionEvent {
  detected: boolean;
  processes?: string[];
  timestamp: number;
}

export interface ElectronAPI {
  getDeviceId: () => Promise<string>;
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<{
    platform: string;
    arch: string;
    version: string;
  }>;
  setWindowFullscreen: (enabled: boolean) => Promise<boolean>;
  isWindowFullscreen: () => Promise<boolean>;
  getHardwareId: () => Promise<string>;
  isVmDetected: () => Promise<boolean>;
  checkRecordingActive: () => Promise<boolean>;
  onWindowFullscreenChanged: (
    callback: (isFullscreen: boolean) => void,
  ) => () => void;
  onRecordingDetected: (
    callback: (data: RecordingDetectionEvent) => void,
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
