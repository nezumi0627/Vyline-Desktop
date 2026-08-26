import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;
const __dirname = dirname(fileURLToPath(import.meta.url));

const BACKEND_PORT = 3001;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
let backend: ChildProcess | undefined;
let mainWindow: BrowserWindow | undefined;

function startBackend() {
  const packagedBackend = join(process.resourcesPath, "vyline-backend.exe");
  if (app.isPackaged && existsSync(packagedBackend)) {
    backend = spawn(packagedBackend, [], {
      env: { ...process.env, PORT: String(BACKEND_PORT) },
      windowsHide: true,
      stdio: "ignore",
    });
    return;
  }

  if (!app.isPackaged) {
    const sourceRoot = join(__dirname, "../../../backend/src/index.ts");
    backend = spawn("bun", [sourceRoot], {
      env: { ...process.env, PORT: String(BACKEND_PORT) },
      windowsHide: true,
      stdio: "ignore",
    });
  }
}

async function waitForBackend(timeoutMs = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${BACKEND_URL}/healthz`);
      if (response.ok) return;
    } catch {
      // Backend is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 620,
    show: false,
    backgroundColor: "#111318",
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  const indexPath = join(__dirname, "../dist/index.html");
  await mainWindow.loadURL(
    app.isPackaged ? pathToFileURL(indexPath).toString() : "http://127.0.0.1:5173",
  );
}

function configureUpdater() {
  if (!app.isPackaged || !process.env.VYLINE_UPDATE_URL) return;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.setFeedURL({ provider: "generic", url: process.env.VYLINE_UPDATE_URL });
}

ipcMain.handle("updater:check", async () => {
  if (!app.isPackaged || !process.env.VYLINE_UPDATE_URL) {
    return { available: false, supported: false };
  }
  const result = await autoUpdater.checkForUpdates();
  return {
    available: Boolean(result?.updateInfo.version && result.updateInfo.version !== app.getVersion()),
    version: result?.updateInfo.version,
    supported: true,
  };
});

ipcMain.handle("updater:download", async () => {
  if (!app.isPackaged || !process.env.VYLINE_UPDATE_URL) return false;
  await autoUpdater.downloadUpdate();
  return true;
});

ipcMain.handle("updater:install", () => {
  if (!app.isPackaged || !process.env.VYLINE_UPDATE_URL) return false;
  autoUpdater.quitAndInstall(false, true);
  return true;
});

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  startBackend();
  await waitForBackend();
  await createWindow();
  configureUpdater();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  backend?.kill();
  backend = undefined;
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
