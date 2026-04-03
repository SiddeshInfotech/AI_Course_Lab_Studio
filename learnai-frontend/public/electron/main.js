import { app, BrowserWindow, Menu, ipcMain } from "electron";
import path from "path";
import isDev from "electron-is-dev";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import { exec } from "child_process";
import { setInterval, clearInterval } from "timers";
// ==================== SECURITY CONFIGURATIONS ====================
// Disable debugging and inspection
app.commandLine.appendSwitch("remote-debugging-port", "0");
app.commandLine.appendSwitch("disable-remote-debugging");
// Enable security features
app.commandLine.appendSwitch("disable-gpu-sandbox");
// Disable extensions
app.commandLine.appendSwitch("disable-extensions");
// Disable printing
app.commandLine.appendSwitch("disable-print-preview");
// ==================== END SECURITY CONFIG ====================
let mainWindow = null;
// Get device fingerprint for licensing
function getDeviceFingerprint() {
    const networkInterfaces = os.networkInterfaces();
    const macAddress = Object.values(networkInterfaces)
        .flat()
        .find((iface) => iface?.mac && iface.mac !== "00:00:00:00:00:00")?.mac;
    const cpuCount = os.cpus().length;
    const platformInfo = `${os.platform()}-${os.arch()}`;
    const fingerprint = `${macAddress}-${cpuCount}-${platformInfo}`;
    const hash = crypto.createHash("sha256").update(fingerprint).digest("hex");
    return hash.substring(0, 16);
}
// Store device fingerprint
function getOrCreateDeviceId() {
    const dataDir = path.join(app.getPath("userData"), "security");
    const deviceIdFile = path.join(dataDir, "device.id");
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(deviceIdFile)) {
        return fs.readFileSync(deviceIdFile, "utf-8").trim();
    }
    const deviceId = getDeviceFingerprint();
    fs.writeFileSync(deviceIdFile, deviceId);
    return deviceId;
}
// Helper to get the correct preload path based on whether we're in dev or production
function getPreloadPath() {
    if (isDev) {
        // In development, use .ts files directly (ts-node will handle it)
        return path.join(process.cwd(), "public", "electron", "preload.ts");
    }
    else {
        // In production, use compiled .js files
        return path.join(process.resourcesPath, "public", "electron", "preload.js");
    }
}
// Helper to get the correct path for static files
function getProductionHtmlPath() {
    const isWindows = process.platform === "win32";
    // Use path.join which handles OS-specific separators
    let htmlPath = path.join(process.resourcesPath, "public", "electron", "..", "..", ".next", "standalone", "pages", "index.html");
    // For Windows, ensure the path works with file:// protocol
    if (isWindows) {
        // Convert backslashes to forward slashes for file:// protocol
        htmlPath = htmlPath.replace(/\\/g, "/");
    }
    return `file://${htmlPath}`;
}
// Helper to get icon path
function getIconPath() {
    if (isDev) {
        return undefined;
    }
    const isWindows = process.platform === "win32";
    let iconPath = path.join(process.resourcesPath, "public", "electron", "..", "..", "assets", "icon.png");
    // For Windows, ensure the path works
    if (isWindows) {
        iconPath = iconPath.replace(/\\/g, "/");
    }
    return iconPath;
}
// Create window
function createWindow() {
    const preloadPath = getPreloadPath();
    const iconPath = getIconPath();
    console.log("[Electron] Preload path:", preloadPath);
    console.log("[Electron] Icon path:", iconPath);
    console.log("[Electron] Platform:", process.platform);
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        fullscreenable: true,
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            devTools: isDev,
            allowRunningInsecureContent: false,
        },
        icon: iconPath,
    });
    // Allow video fullscreen
    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: "allow" };
    });
    const startUrl = isDev
        ? "http://localhost:3000"
        : getProductionHtmlPath();
    console.log("[Electron] Loading URL:", startUrl);
    mainWindow.loadURL(startUrl);
    // Set Content Security Policy headers
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                "Content-Security-Policy": [
                    "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; " +
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; " +
                        "style-src 'self' 'unsafe-inline' http://localhost:*; " +
                        "img-src 'self' data: blob: https: http://localhost:*; " +
                        "media-src 'self' blob: data: https: http://localhost:* http://*; " +
                        "font-src 'self' data: http://localhost:*; " +
                        "connect-src 'self' ws: wss: http://localhost:* https://* http://*; " +
                        "frame-src 'self' http://localhost:* https://*.youtube.com https://www.youtube.com; " +
                        "object-src 'self' blob: http://localhost:*; " +
                        "child-src 'self' blob: http://localhost:* https://*.youtube.com;",
                ],
            },
        });
    });
    // Only open dev tools in development, and only if explicitly requested
    if (isDev && process.env.SHOW_DEV_TOOLS === "true") {
        mainWindow.webContents.openDevTools();
    }
    // Block keyboard shortcuts for dev tools (only in production)
    if (!isDev) {
        mainWindow.webContents.on("before-input-event", (event, input) => {
            // Block F12 (DevTools)
            if (input.key.toLowerCase() === "f12") {
                event.preventDefault();
                return;
            }
            // Block Ctrl+Shift+I (Windows/Linux DevTools)
            if (input.control && input.shift && input.key.toLowerCase() === "i") {
                event.preventDefault();
                return;
            }
            // Block Cmd+Option+I (macOS DevTools)
            if (process.platform === "darwin" &&
                input.meta &&
                input.alt &&
                input.key === "i") {
                event.preventDefault();
                return;
            }
            // Block Ctrl+Shift+C/J (inspect element & console)
            if (input.control &&
                input.shift &&
                (input.key.toLowerCase() === "c" || input.key.toLowerCase() === "j")) {
                event.preventDefault();
                return;
            }
            // Block Cmd+Shift+C/J (macOS inspect element & console)
            if (process.platform === "darwin" &&
                input.meta &&
                input.shift &&
                (input.key.toLowerCase() === "c" || input.key.toLowerCase() === "j")) {
                event.preventDefault();
                return;
            }
            // Block Cmd+D (macOS DevTools)
            if (process.platform === "darwin" && input.meta && input.key === "d") {
                event.preventDefault();
                return;
            }
            // NOTE: Removed Ctrl+D blocking - it's a useful shortcut on Windows
        });
    }
    // Disable right-click context menu (which shows "Inspect Element") in production only
    if (!isDev) {
        mainWindow.webContents.on("context-menu", (e) => {
            e.preventDefault();
        });
    }
    // Prevent screen recording/capture - allow webcam but block screen capture
    mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
        // Allow fullscreen
        if (permission === "fullscreen") {
            return true;
        }
        // Block screen capture requests (getDisplayMedia)
        if (permission === "media" && details.mediaType === "screen") {
            return false;
        }
        // Allow webcam (getUserMedia) for legitimate features
        return true;
    });
    // Recording software detection (adds friction but not full protection)
    const KNOWN_RECORDING_SOFTWARE = {
        darwin: ["QuickTime", "ScreenFlow", "OBS", "Camtasia"],
        win32: [
            "obs64",
            "obs32",
            "GameBarPresenceWriter",
            "fraps",
            "camtasia",
            "ShareX",
            "Lightshot",
        ],
    };
    const checkForRecordingSoftware = () => {
        const platform = process.platform;
        const softwareList = KNOWN_RECORDING_SOFTWARE[platform];
        if (!softwareList)
            return;
        const searchPattern = softwareList.join("|").replace(/\s/g, "");
        const cmd = platform === "darwin"
            ? `pgrep -fl "${searchPattern}"`
            : `tasklist | findstr /i "${softwareList.join(" ")}"`;
        exec(cmd, (error, stdout) => {
            if (stdout && stdout.trim()) {
                console.warn("[Security] Recording software detected:", stdout);
                mainWindow?.webContents.send("recording-detected", {
                    detected: true,
                    timestamp: Date.now(),
                });
            }
        });
    };
    // Check every 3 seconds
    const recordingCheckInterval = setInterval(checkForRecordingSoftware, 3000);
    const syncRendererFullscreenState = () => {
        if (!mainWindow || mainWindow.isDestroyed())
            return;
        const isFs = mainWindow.isFullScreen();
        mainWindow.webContents.send("window-fullscreen-changed", isFs);
    };
    mainWindow.on("enter-full-screen", syncRendererFullscreenState);
    mainWindow.on("leave-full-screen", syncRendererFullscreenState);
    // Handle HTML fullscreen for video player
    mainWindow.webContents.on("enter-html-full-screen", () => {
        console.log("[Electron] HTML element entered fullscreen (video player only)");
        if (mainWindow && mainWindow.isFullScreen()) {
            console.log("[Electron] Exiting window fullscreen to allow only HTML fullscreen");
            mainWindow.setFullScreen(false);
        }
    });
    mainWindow.webContents.on("leave-html-full-screen", () => {
        console.log("[Electron] HTML element left fullscreen (video player exited)");
    });
    mainWindow.on("closed", () => {
        if (recordingCheckInterval) {
            clearInterval(recordingCheckInterval);
        }
        mainWindow = null;
    });
}
// App event handlers
app.on("ready", createWindow);
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});
// IPC handlers for device authentication
ipcMain.handle("get-device-id", () => {
    return getOrCreateDeviceId();
});
ipcMain.handle("get-app-version", () => {
    return app.getVersion();
});
ipcMain.handle("get-platform", () => {
    return {
        platform: process.platform,
        arch: process.arch,
        version: process.versions.node,
    };
});
ipcMain.handle("set-window-fullscreen", (_event, enabled) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return false;
    }
    mainWindow.setFullScreen(Boolean(enabled));
    return mainWindow.isFullScreen();
});
ipcMain.handle("is-window-fullscreen", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return false;
    }
    return mainWindow.isFullScreen();
});
// Security: Disable navigation to external sites
app.on("web-contents-created", (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("http://localhost") || url.startsWith("file://")) {
            return { action: "allow" };
        }
        return { action: "deny" };
    });
    contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ["fullscreen"];
        if (allowedPermissions.includes(permission)) {
            callback(true);
        }
        else {
            callback(false);
        }
    });
});
// Create app menu
const template = [
    {
        label: "File",
        submenu: [
            {
                label: "Exit",
                accelerator: "CmdOrCtrl+Q",
                click: () => {
                    app.quit();
                },
            },
        ],
    },
    {
        label: "View",
        submenu: [
            {
                label: "Reload",
                accelerator: "CmdOrCtrl+R",
                click: () => {
                    mainWindow?.reload();
                },
            },
            {
                label: "Toggle Developer Tools",
                accelerator: process.platform === "darwin" ? "Alt+Cmd+I" : "Ctrl+Shift+I",
                click: () => {
                    if (isDev && mainWindow) {
                        mainWindow.webContents.toggleDevTools();
                    }
                },
            },
        ],
    },
    {
        label: "Help",
        submenu: [
            {
                label: "About",
                click: () => {
                    // You can create an about dialog here
                },
            },
        ],
    },
];
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(isDev ? menu : null);
