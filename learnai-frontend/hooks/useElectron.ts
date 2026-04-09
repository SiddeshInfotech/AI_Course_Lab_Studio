import { useEffect, useState } from "react";

export function useElectron() {
  const [isElectron, setIsElectron] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [platform, setPlatform] = useState<any>(null);

  useEffect(() => {
    // Check if running in Electron
    const hasElectronAPI =
      typeof window !== "undefined" && window.electronAPI !== undefined;

    setIsElectron(hasElectronAPI);

    if (hasElectronAPI && window.electronAPI) {
      // Get device ID
      window.electronAPI.getDeviceId().then(setDeviceId);

      // Get app version
      window.electronAPI.getAppVersion().then(setAppVersion);

      // Get platform info
      window.electronAPI.getPlatform().then(setPlatform);

      console.log("[useElectron] Electron environment detected");
    }
  }, []);

  return {
    isElectron,
    deviceId,
    appVersion,
    platform,
    electronAPI: isElectron ? window.electronAPI : null,
  };
}

export function useDeviceBinding() {
  const { deviceId, isElectron } = useElectron();

  const validateDeviceLicense = async (
    licenseKey: string,
  ): Promise<boolean> => {
    if (!isElectron || !deviceId) {
      console.warn("Not in Electron or device ID not available");
      return false;
    }

    try {
      // TODO: Implement license validation against backend
      // This should verify that the device is authorized for this license
      console.log(`[Device Binding] Validating for device: ${deviceId}`);
      return true;
    } catch (error) {
      console.error("Device binding validation failed:", error);
      return false;
    }
  };

  return {
    deviceId,
    isElectron,
    validateDeviceLicense,
  };
}
