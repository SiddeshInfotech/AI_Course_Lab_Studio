import { app, BrowserWindow, Menu, ipcMain } from "electron";
import path from "path";
import isDev from "electron-is-dev";
import crypto from "crypto";
import fs from "fs";
import os from "os";

// Enable fullscreen in Electron
app.commandLine.appendSwitch("disable-gpu-sandbox");

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
      sandbox: false,
      // Disable dev tools in production
      devTools: isDev,
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

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on("before-input-event", (event, input) => {
    // Block F12 (DevTools)
    if (input.key.toLowerCase() === "f12") {
      event.preventDefault();
    }
  });

  const syncRendererFullscreenState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const isFs = mainWindow.isFullScreen();
    mainWindow.webContents.send(
      "window-fullscreen-changed",
      isFs,
    );
  };

  mainWindow.on("enter-full-screen", syncRendererFullscreenState);
  mainWindow.on("leave-full-screen", syncRendererFullscreenState);

  // Removed: DOM fullscreen interceptors - now allowing video player only fullscreen

  mainWindow.on("closed", () => {
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
