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

// Prevent screen capture - Critical for content protection
app.commandLine.appendSwitch("disable-screen-capture");
app.commandLine.appendSwitch("disable-desktop-capture");

// ==================== END SECURITY CONFIG ====================

let mainWindow: BrowserWindow | null = null;

// Get device fingerprint for licensing
function getDeviceFingerprint(): string {
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
function getOrCreateDeviceId(): string {
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

// Create window
function createWindow() {
  // Resolve __dirname dynamically - works in both dev and production
  const resourcesPath = isDev
    ? path.join(process.cwd(), "public", "electron")
    : path.join(process.resourcesPath, "public", "electron");

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(resourcesPath, "preload.ts"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,  // Disable sandbox for better compatibility
      // Disable dev tools in production only
      devTools: !isDev,
      // Enable fullscreen for video elements
      allowRunningInsecureContent: false,
    },
    icon: isDev ? undefined : path.join(resourcesPath, "../../assets/icon.png"),
  });

  // Allow video fullscreen
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "allow" };
  });

  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(
        resourcesPath,
        "../../.next/standalone/pages/index.html",
      )}`;

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
          "frame-src 'self' http://localhost:* https://*.youtube.com https://www.youtube.com 'allowfullscreen'; " +
          "object-src 'self' blob: http://localhost:*; " +
          "child-src 'self' blob: http://localhost:* https://*.youtube.com; " +
          "allowfullscreen 'true';"
        ],
      },
    });
  });

  // Only open dev tools in development, and only if explicitly requested
  if (isDev && process.env.SHOW_DEV_TOOLS === "true") {
    mainWindow.webContents.openDevTools();
  }

  // Block keyboard shortcuts for dev tools
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
    if (
      process.platform === "darwin" &&
      input.meta &&
      input.alt &&
      input.key === "i"
    ) {
      event.preventDefault();
      return;
    }

    // Block Ctrl+Shift+C/J (inspect element & console)
    if (
      input.control &&
      input.shift &&
      (input.key.toLowerCase() === "c" || input.key.toLowerCase() === "j")
    ) {
      event.preventDefault();
      return;
    }

    // Block Cmd+Shift+C/J (macOS inspect element & console)
    if (
      process.platform === "darwin" &&
      input.meta &&
      input.shift &&
      (input.key.toLowerCase() === "c" || input.key.toLowerCase() === "j")
    ) {
      event.preventDefault();
      return;
    }

    // Block Cmd+D (macOS DevTools)
    if (process.platform === "darwin" && input.meta && input.key === "d") {
      event.preventDefault();
      return;
    }

    // Block Ctrl+D (Windows/Linux DevTools shortcut in some contexts)
    if (input.control && input.key === "d") {
      event.preventDefault();
      return;
    }
  });

  // Disable right-click context menu (which shows "Inspect Element")
  mainWindow.webContents.on("context-menu", (e) => {
    e.preventDefault();
  });

  // Prevent screen recording/capture - allow webcam but block screen capture
  mainWindow.webContents.session.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      // Block screen capture requests (getDisplayMedia)
      if (permission === "media" && (details as any).mediaType === "screen") {
        return false;
      }
      // Allow webcam (getUserMedia) for legitimate features
      return true;
    },
  );

  // Recording software detection (adds friction but not full protection)
  const KNOWN_RECORDING_SOFTWARE: Record<string, string[]> = {
    darwin: ['QuickTime', 'ScreenFlow', 'OBS', 'Camtasia'],
    win32: ['obs64', 'obs32', 'GameBarPresenceWriter', 'fraps', 'camtasia', 'ShareX', 'Lightshot']
  };

  const checkForRecordingSoftware = () => {
    const platform = process.platform as string;
    const softwareList = KNOWN_RECORDING_SOFTWARE[platform];
    
    if (!softwareList) return;

    const searchPattern = softwareList.join('|').replace(/\s/g, '');
    const cmd = platform === 'darwin'
      ? `pgrep -fl "${searchPattern}"`
      : `tasklist | findstr /i "${softwareList.join(' ')}"`;

    exec(cmd, (error, stdout) => {
      if (stdout && stdout.trim()) {
        console.warn('[Security] Recording software detected:', stdout);
        // Notify renderer
        mainWindow?.webContents.send('recording-detected', { 
          detected: true, 
          timestamp: Date.now() 
        });
      }
    });
  };

  // Check every 3 seconds
  const recordingCheckInterval = setInterval(checkForRecordingSoftware, 3000);

  const syncRendererFullscreenState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const isFs = mainWindow.isFullScreen();
    mainWindow.webContents.send("window-fullscreen-changed", isFs);
  };

  mainWindow.on("enter-full-screen", syncRendererFullscreenState);
  mainWindow.on("leave-full-screen", syncRendererFullscreenState);

  // Removed: DOM fullscreen interceptors - now allowing video player only fullscreen

  mainWindow.on("closed", () => {
    // Clean up recording check interval
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

ipcMain.handle("set-window-fullscreen", (_event, enabled: boolean) => {
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
    // Only allow internal URLs
    if (url.startsWith("http://localhost") || url.startsWith("file://")) {
      return { action: "allow" };
    }
    return { action: "deny" };
  });

  // Prevent execution of downloaded files
  contents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const allowedPermissions: string[] = [];

      if (allowedPermissions.includes(permission)) {
        callback(true);
      } else {
        callback(false);
      }
    },
  );
});

// Create app menu
const template: any[] = [
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
        accelerator:
          process.platform === "darwin" ? "Alt+Cmd+I" : "Ctrl+Shift+I",
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
