// src/main/main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const {
  login,
  fetchSystemInfo,
  fetchSvnVersion,
  fetchIpAddress,
  fetchAccountInfo,
  fetchDNS,
  fetchGetway,
  fetchNetMask,
  fetchAccountStatus,
  fetchAllAcountInformation,
  speakerLogin,
  speakerApi
} = require("../api/dasscomClient");
const { scanDevices } = require("./arpScanner");
const { enrichDevice } = require("../utils/deviceUtils");

const isDev = process.env.NODE_ENV === "development";

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
  webPreferences: {
      contextIsolation: true,
      preload: path.join(app.getAppPath(), "src", "preload", "preload.js"),
      webSecurity: false, // ✅ allow loading local files inside ASAR
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    // Production: use path inside app.asar
    const indexPath = path.join(app.getAppPath(), "dist", "index.html");
    win.loadFile(indexPath);
  }

  // Log/forward load errors
  win.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
    try {
      win.webContents.send("load-error", { errorCode, errorDescription, validatedURL });
    } catch (e) { /* noop */ }
  });

  // Forward console logs to renderer for debugging
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args) => {
    originalLog(...args);
    try {
      win.webContents.send(
        "console-log",
        args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")
      );
    } catch (e) {}
  };
  console.error = (...args) => {
    originalError(...args);
    try {
      win.webContents.send(
        "console-log",
        "ERROR: " + args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")
      );
    } catch (e) {}
  };
}

// --- IPC handlers ---
ipcMain.handle("login-device", async (event, ip, username, password) => login(ip, username, password));
ipcMain.handle("fetch-system-info", async (event, ip, token) => fetchSystemInfo(ip, token));
ipcMain.handle("speaker-login", async (event, ip, username = "admin", password = "admin") => speakerLogin(ip, username, password));
ipcMain.handle("speaker-api", async (event, ip, token, endpoint) => speakerApi(ip, token, endpoint));
ipcMain.handle("fetch-svn-version", async (event, ip) => fetchSvnVersion(ip));
ipcMain.handle("fetch-ip-address", async (event, ip) => fetchIpAddress(ip));
ipcMain.handle("fetch-account-info", async (event, ip) => fetchAccountInfo(ip));
ipcMain.handle("fetch-dns", async (event, ip) => fetchDNS(ip));
ipcMain.handle("fetch-gateway", async (event, ip) => fetchGetway(ip));
ipcMain.handle("fetch-netmask", async (event, ip) => fetchNetMask(ip));
ipcMain.handle("fetch-account-status", async (event, ip) => fetchAccountStatus(ip));
ipcMain.handle("fetch-all-account-info", async (event, ip) => fetchAllAcountInformation(ip));
ipcMain.handle("enrich-device", async (event, device, credentials) => enrichDevice(device, credentials));

ipcMain.handle("scan-devices", async (event, options = {}) => {
  console.log("🚀 IPC: scan-devices called with options:", options);
  try {
    const devices = await scanDevices(options);
    console.log(`🚀 IPC: scan completed, found ${devices.length} devices`);
    return devices;
  } catch (error) {
    console.error("🚀 IPC: scan error:", error);
    throw error;
  }
});

app.whenReady().then(createWindow);

// macOS behavior
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
