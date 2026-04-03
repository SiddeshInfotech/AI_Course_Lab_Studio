import { contextBridge, ipcRenderer } from "electron";
// Expose only necessary APIs to renderer process
contextBridge.exposeInMainWorld("electronAPI", {
    getDeviceId: () => ipcRenderer.invoke("get-device-id"),
    getAppVersion: () => ipcRenderer.invoke("get-app-version"),
    getPlatform: () => ipcRenderer.invoke("get-platform"),
    setWindowFullscreen: (enabled) => ipcRenderer.invoke("set-window-fullscreen", enabled),
    isWindowFullscreen: () => ipcRenderer.invoke("is-window-fullscreen"),
    onWindowFullscreenChanged: (callback) => {
        const listener = (_event, value) => {
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
