import { contextBridge, ipcRenderer } from "electron";

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
(window as any).eval = undefined;

// Security: Disable Function constructor
(window as any).Function = undefined;

// Log if in dev mode
if (process.env.NODE_ENV === "development") {
  console.log("[Preload] Security context initialized");
}
