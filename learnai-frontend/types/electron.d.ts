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
  onWindowFullscreenChanged: (
    callback: (isFullscreen: boolean) => void,
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
