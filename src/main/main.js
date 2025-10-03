const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { login, fetchSystemInfo, fetchSvnVersion, fetchIpAddress, fetchAccountInfo, fetchDNS, fetchGetway, fetchNetMask, fetchAccountStatus, fetchAllAcountInformation, speakerLogin, speakerApi } = require("../api/dasscomClient");
const { scanDevices } = require("./arpScanner");  // adjust path if needed
const { enrichDevice } = require("../utils/deviceUtils");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/preload.js"),
    },
  });

  // Load the built index.html in production, or dev server in development
  if (process.env.NODE_ENV === 'development') {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../../index.html"));
  }
}

// IPC handlers
ipcMain.handle("login-device", async (event, ip, username, password) => {
  return await login(ip, username, password);
});

ipcMain.handle("fetch-system-info", async (event, ip, token) => {
  return await fetchSystemInfo(ip, token);
});

ipcMain.handle("speaker-login", async (event, ip, username = "admin", password = "admin") => {
  return await speakerLogin(ip, username, password);
});

ipcMain.handle("speaker-api", async (event, ip, token, endpoint) => {
  return await speakerApi(ip, token, endpoint);
});

ipcMain.handle("fetch-svn-version", async (event, ip) => {
  return await fetchSvnVersion(ip);
});

ipcMain.handle("fetch-ip-address", async (event, ip) => {
  return await fetchIpAddress(ip);
});

ipcMain.handle("fetch-account-info", async (event, ip) => {
  return await fetchAccountInfo(ip);
});

ipcMain.handle("fetch-dns", async (event, ip) => {
  return await fetchDNS(ip);
});

ipcMain.handle("fetch-gateway", async (event, ip) => {
  return await fetchGetway(ip);
});

ipcMain.handle("fetch-netmask", async (event, ip) => {
  return await fetchNetMask(ip);
});

ipcMain.handle("fetch-account-status", async (event, ip) => {
  return await fetchAccountStatus(ip);
});

ipcMain.handle("fetch-all-account-info", async (event, ip) => {
  return await fetchAllAcountInformation(ip);
});

ipcMain.handle("enrich-device", async (event, device, credentials) => {
  return await enrichDevice(device, credentials);
});

ipcMain.handle("scan-devices", async (event, options = {}) => {
  console.log('🚀 IPC: scan-devices handler called with options:', options);
  try {
    const devices = await scanDevices(options);
    console.log(`🚀 IPC: scan completed, found ${devices.length} devices`);
    return devices;
  } catch (error) {
    console.error('🚀 IPC: scan error:', error);
    throw error;
  }
});

app.whenReady().then(createWindow);
