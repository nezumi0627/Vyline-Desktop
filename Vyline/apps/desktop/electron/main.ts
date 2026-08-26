import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;
const __dirname = dirname(fileURLToPath(import.meta.url));

const BACKEND_PORT = 3001;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
let backend: ChildProcess | undefined;
let mainWindow: BrowserWindow | undefined;

function logStartup(message: string) {
  try {
    appendFileSync(join(app.getPath("userData"), "startup.log"), `${new Date().toISOString()} ${message}\n`);
  } catch {
    // Startup diagnostics must never prevent the app from opening.
  }
}

function startBackend() {
  const packagedBackend = join(process.resourcesPath, "vyline-backend.exe");
  if (app.isPackaged && existsSync(packagedBackend)) {
    backend = spawn(packagedBackend, [], {
      env: { ...process.env, NODE_ENV: "production", PORT: String(BACKEND_PORT) },
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
    backend.on("error", (error) => logStartup(`backend error=${String(error)}`));
    backend.stderr?.on("data", (chunk) => logStartup(`backend stderr=${String(chunk).trim()}`));
    backend.on("exit", (code, signal) => logStartup(`backend exit code=${code} signal=${signal}`));
    return;
  }

  if (!app.isPackaged) {
    const sourceRoot = join(__dirname, "../../../backend/src/index.ts");
    backend = spawn("bun", [sourceRoot], {
      env: { ...process.env, PORT: String(BACKEND_PORT) },
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
    backend.on("error", (error) => logStartup(`backend error=${String(error)}`));
    backend.stderr?.on("data", (chunk) => logStartup(`backend stderr=${String(chunk).trim()}`));
    backend.on("exit", (code, signal) => logStartup(`backend exit code=${code} signal=${signal}`));
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
  mainWindow.webContents.on("did-finish-load", () => {
    logStartup("renderer did-finish-load");
    void mainWindow?.webContents
      .executeJavaScript(
        `JSON.stringify({ href: location.href, root: document.getElementById("root")?.innerHTML ?? null, scripts: [...document.scripts].map((script) => ({ src: script.src, ready: script.readyState })) })`,
      )
      .then((snapshot) => logStartup(`renderer snapshot=${snapshot}`))
      .catch((error) => logStartup(`renderer snapshot failure=${String(error)}`));
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    logStartup(`renderer did-fail-load code=${errorCode} description=${errorDescription} url=${validatedURL}`);
  });
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    logStartup(`renderer console level=${level} message=${message} source=${sourceId}:${line}`);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    logStartup(`renderer process gone reason=${details.reason} exitCode=${details.exitCode}`);
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  const indexPath = join(__dirname, "../dist/index.html");
  if (app.isPackaged) {
    await mainWindow.loadFile(indexPath);
  } else {
    await mainWindow.loadURL("http://127.0.0.1:5173");
  }
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
}).catch((error) => {
  logStartup(`main startup failure=${String(error)}`);
  app.quit();
});

app.on("window-all-closed", () => {
  logStartup("window-all-closed");
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  logStartup("before-quit");
  backend?.kill();
  backend = undefined;
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
