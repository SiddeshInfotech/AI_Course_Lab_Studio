import { contextBridge, ipcRenderer } from "electron";
// Expose only necessary APIs to renderer process
contextBridge.exposeInMainWorld("electronAPI", {
    getDeviceId: () => ipcRenderer.invoke("get-device-id"),
    getAppVersion: () => ipcRenderer.invoke("get-app-version"),
    getPlatform: () => ipcRenderer.invoke("get-platform"),
    setWindowFullscreen: (enabled) => ipcRenderer.invoke("set-window-fullscreen", enabled),
    isWindowFullscreen: () => ipcRenderer.invoke("is-window-fullscreen"),
    // Security APIs
    getHardwareId: () => ipcRenderer.invoke("get-hardware-id"),
    isVmDetected: () => ipcRenderer.invoke("is-vm-detected"),
    checkRecordingActive: () => ipcRenderer.invoke("check-recording-active"),
    // Event listeners
    onWindowFullscreenChanged: (callback) => {
        const listener = (_event, value) => {
            callback(value);
        };
        ipcRenderer.on("window-fullscreen-changed", listener);
        return () => {
            ipcRenderer.removeListener("window-fullscreen-changed", listener);
        };
    },
    onRecordingDetected: (callback) => {
        const listener = (_event, data) => {
            callback(data);
        };
        ipcRenderer.on("recording-detected", listener);
        return () => {
            ipcRenderer.removeListener("recording-detected", listener);
        };
    },
});
// Security: Disable eval
try {
    window.eval = undefined;
}
catch (e) {
    // Ignore if eval is not available
}
// Security: Disable Function constructor
try {
    window.Function = undefined;
}
catch (e) {
    // Ignore if Function is not available
}
// Log if in dev mode
if (process.env.NODE_ENV === "development") {
    console.log("[Preload] Security context initialized");
}
