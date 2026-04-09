import { app, BrowserWindow, Menu, ipcMain } from "electron";
import path from "path";
import isDev from "electron-is-dev";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import { exec, execSync } from "child_process";
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
// ==================== RECORDING SOFTWARE LIST ====================
const KNOWN_RECORDING_SOFTWARE = {
    darwin: [
        "QuickTime Player",
        "ScreenFlow",
        "OBS",
        "Camtasia",
        "ShadowPlay",
        "Fraps",
        "ScreenCapture",
        "screencap",
        "recordmydesktop",
        "peek",
        "kooha",
        "vokoscreen",
        "kazam",
        "simplescreenrecorder",
    ],
    win32: [
        "obs64",
        "obs32",
        "obs.exe",
        "GameBarPresenceWriter",
        "xboxgips",
        "fraps",
        "fraps.exe",
        "camtasia",
        "camtasia.exe",
        "screencapture",
        "ShareX",
        "ShareX.exe",
        "Lightshot",
        "Lightshot.exe",
        "Bandicam",
        "bandicam.exe",
        "Action",
        "action.exe",
        "Dxtory",
        "dxtory.exe",
        "Snagit",
        "snagit.exe",
        "Movavi",
        "movavi.exe",
        "ScreenRec",
        "ScreenRec.exe",
        "Bandizip",
        "bandizip.exe",
    ],
    linux: [
        "obs",
        "obs-studio",
        "obs64",
        "kazam",
        "simplescreenrecorder",
        "ffmpeg",
        "recordmydesktop",
        "vlc",
        "kooha",
        "peek",
        "vokoscreen",
        "vokoscreen-ng",
        "blue-recorder",
        "green-recorder",
        "spectacle",
        "flameshot",
        "gscreenshot",
    ],
};
// ==================== HARDWARE FINGERPRINTING ====================
// Get MAC address
function getMacAddress() {
    const networkInterfaces = os.networkInterfaces();
    const macs = [];
    for (const ifaces of Object.values(networkInterfaces)) {
        if (!ifaces)
            continue;
        for (const iface of ifaces) {
            if (iface.mac && iface.mac !== "00:00:00:00:00:00" && !iface.internal) {
                macs.push(iface.mac);
            }
        }
    }
    if (macs.length === 0)
        return "00:00:00:00:00:00";
    macs.sort();
    return macs[0];
}
// Get System UUID (more robust)
function getSystemUUID() {
    try {
        if (process.platform === "win32") {
            // Try to get MachineGuid from registry
            const { execSync } = require("child_process");
            const result = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { encoding: "utf8" });
            const match = result.match(/MachineGuid\s+REG_SZ\s+(\S+)/);
            if (match)
                return match[1].trim();
        }
        else if (process.platform === "darwin" || process.platform === "linux") {
            // Try /etc/machine-id on Linux
            if (fs.existsSync("/etc/machine-id")) {
                return fs.readFileSync("/etc/machine-id", "utf8").trim();
            }
            // Try platform-specific methods on macOS
            if (process.platform === "darwin") {
                const { execSync } = require("child_process");
                return execSync("ioreg -rd1 -c IOPlatformExpertDevice -a", { encoding: "utf8" })
                    .toString()
                    .match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/)?.[1] || "";
            }
        }
    }
    catch (e) {
        // Fall through
    }
    return "";
}
// Get disk serial (for additional binding)
function getDiskSerial() {
    try {
        if (process.platform === "win32") {
            const { execSync } = require("child_process");
            // Try to get volume serial
            const result = execSync('vol C:', { encoding: "utf8" });
            const match = result.match(/Volume Serial Number is\s+(\S+)/);
            if (match)
                return match[1].trim();
        }
        else if (process.platform === "linux") {
            // Try common block device serials
            const serials = ["/sys/block/sda/device/serial", "/sys/block/nvme0n1/device/serial"];
            for (const serialPath of serials) {
                if (fs.existsSync(serialPath)) {
                    return fs.readFileSync(serialPath, "utf8").trim();
                }
            }
        }
    }
    catch (e) {
        // Fall through
    }
    return "";
}
// Get enhanced device fingerprint
function getDeviceFingerprint() {
    const mac = getMacAddress().replace(/:/g, "");
    const uuid = getSystemUUID();
    const disk = getDiskSerial();
    const cpuCount = os.cpus().length;
    const platformInfo = `${os.platform()}-${os.arch()}`;
    // Combine: disk serial | UUID | MAC | CPU count
    const composite = (disk || "NOSSD") + "|" +
        (uuid || "NOUUID") + "|" +
        (mac || "NOMAC") + "|" +
        cpuCount + "|" +
        platformInfo;
    const hash = crypto.createHash("sha256").update(composite).digest("hex");
    return hash.substring(0, 32);
}
// Check if running in VM
function isVirtualMachine() {
    try {
        const fingerprint = getDeviceFingerprint().toLowerCase();
        const vmIndicators = ["vbox", "virtualbox", "vmware", "qemu", "kvm", "parallels"];
        if (process.platform === "darwin") {
            // Check for MacVM indicators using system_profiler
            const { execSync } = require("child_process");
            const result = execSync("system_profiler SPHardwareDataType", { encoding: "utf8" });
            return vmIndicators.some(ind => result.toLowerCase().includes(ind));
        }
        else if (process.platform === "win32") {
            // Check systeminfo for VM
            const { execSync } = require("child_process");
            const result = execSync("systeminfo", { encoding: "utf8", timeout: 5000 });
            return vmIndicators.some(ind => result.toLowerCase().includes(ind));
        }
        else if (process.platform === "linux") {
            // Check dmidecode
            try {
                const { execSync } = require("child_process");
                const result = execSync("dmidecode", { encoding: "utf8", timeout: 5000 });
                return vmIndicators.some(ind => result.toLowerCase().includes(ind));
            }
            catch {
                // Fallback: check /proc/cpuinfo
                const cpuinfo = fs.readFileSync("/proc/cpuinfo", "utf8").toLowerCase();
                return vmIndicators.some(ind => cpuinfo.includes(ind));
            }
        }
    }
    catch (e) {
        console.log("[Security] VM detection error:", e);
    }
    return false;
}
// ==================== END HARDWARE FINGERPRINTING ====================
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
    // =====================================================
    // SCREEN CAPTURE PROTECTION
    // =====================================================
    // macOS: Use Electron's built-in content protection
    if (process.platform === "darwin") {
        mainWindow.setContentProtection(true);
        console.log("[Electron] macOS content protection enabled");
    }
    // Windows: Attempt to use SetWindowDisplayAffinity via native method
    if (process.platform === "win32") {
        // This requires the app to run with certain flags on Windows
        // We'll try to enable it after the window is ready
        mainWindow.once("ready-to-show", () => {
            try {
                // @ts-ignore - This is a Windows-specific Electron method
                if (mainWindow.setContentProtection) {
                    // @ts-ignore
                    mainWindow.setContentProtection(true);
                    console.log("[Electron] Windows content protection enabled");
                }
            }
            catch (e) {
                console.log("[Electron] Windows content protection not available:", e);
            }
        });
    }
    // =====================================================
    // END SCREEN CAPTURE PROTECTION
    // =====================================================
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
    // =====================================================
    // RECORDING SOFTWARE DETECTION AND BLOCKING
    // =====================================================
    // Kill recording processes
    const killRecordingSoftware = (processName) => {
        const platform = process.platform;
        try {
            if (platform === "win32") {
                execSync(`taskkill /F /IM "${processName}" /T`, { stdio: "ignore" });
            }
            else if (platform === "darwin" || platform === "linux") {
                execSync(`pkill -9 "${processName}"`, { stdio: "ignore" });
            }
            console.log(`[Security] Killed recording process: ${processName}`);
            return true;
        }
        catch (e) {
            return false;
        }
    };
    const checkForRecordingSoftware = () => {
        const platform = process.platform;
        const softwareList = KNOWN_RECORDING_SOFTWARE[platform];
        if (!softwareList)
            return;
        const cmd = platform === "darwin"
            ? `ps -A -o comm=`
            : platform === "linux"
                ? `ps -A -o comm=`
                : `tasklist /FO CSV /NH`;
        exec(cmd, (error, stdout) => {
            if (error || !stdout)
                return;
            const lines = stdout.toLowerCase().split(/\r?\n/);
            const detectedProcesses = [];
            for (const processName of softwareList) {
                const searchName = processName.toLowerCase().replace(".exe", "");
                const isRunning = lines.some((line) => {
                    if (platform === "win32") {
                        return line.includes(searchName);
                    }
                    else {
                        return line.trim() === searchName || line.includes(searchName);
                    }
                });
                if (isRunning) {
                    console.warn(`[Security] Recording software detected: ${processName}`);
                    detectedProcesses.push(processName);
                }
            }
            if (detectedProcesses.length > 0) {
                mainWindow?.webContents.send("recording-detected", {
                    detected: true,
                    processes: detectedProcesses,
                    timestamp: Date.now(),
                });
            }
        });
    };
    // Check every 2 seconds
    const recordingCheckInterval = setInterval(checkForRecordingSoftware, 2000);
    // =====================================================
    // END RECORDING SOFTWARE DETECTION
    // =====================================================
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
// IPC handlers for security features
ipcMain.handle("get-hardware-id", () => {
    return getDeviceFingerprint();
});
ipcMain.handle("is-vm-detected", () => {
    return isVirtualMachine();
});
ipcMain.handle("check-recording-active", async () => {
    return new Promise((resolve) => {
        const platform = process.platform;
        const softwareList = KNOWN_RECORDING_SOFTWARE[platform];
        if (!softwareList) {
            resolve(false);
            return;
        }
        const cmd = platform === "darwin" || platform === "linux"
            ? `ps -A -o comm=`
            : `tasklist /FO CSV /NH`;
        exec(cmd, (error, stdout) => {
            if (error || !stdout) {
                resolve(false);
                return;
            }
            const lines = stdout.toLowerCase().split(/\r?\n/);
            const isRecording = softwareList.some((proc) => {
                const searchName = proc.toLowerCase().replace(".exe", "");
                return lines.some((line) => {
                    if (platform === "win32") {
                        return line.includes(searchName);
                    }
                    return line.trim() === searchName || line.includes(searchName);
                });
            });
            resolve(isRecording);
        });
    });
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
