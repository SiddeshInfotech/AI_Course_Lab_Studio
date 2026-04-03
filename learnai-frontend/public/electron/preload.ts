import { contextBridge, ipcRenderer } from "electron";

// Declare global window type for TypeScript
declare const window: Window & typeof globalThis;

// Expose only necessary APIs to renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  getDeviceId: () => ipcRenderer.invoke("get-device-id"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getPlatform: () => ipcRenderer.invoke("get-platform"),
  setWindowFullscreen: (enabled: boolean) =>
    ipcRenderer.invoke("set-window-fullscreen", enabled),
  isWindowFullscreen: () => ipcRenderer.invoke("is-window-fullscreen"),
  onWindowFullscreenChanged: (callback: (isFullscreen: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, value: boolean) => {
      callback(value);
    };

    ipcRenderer.on("window-fullscreen-changed", listener);
    return () => {
      ipcRenderer.removeListener("window-fullscreen-changed", listener);
    };
  },
});

// Security: Disable eval
try {
  (window as any).eval = undefined;
} catch (e) {
  // Ignore if eval is not available
}

// Security: Disable Function constructor
try {
  (window as any).Function = undefined;
} catch (e) {
  // Ignore if Function is not available
}

// Log if in dev mode
if (process.env.NODE_ENV === "development") {
  console.log("[Preload] Security context initialized");
}
