// src/main/main.js
const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const { dialog } = require("electron");
const exportToExcel = require("../utils/exportToExcel");
const gotLock = app.requestSingleInstanceLock();


const path = require("path");
const {
  login,
  ipPhoneApi,
  speakerLogin,
  speakerApi
} = require("../api/dasscomClient");
const {
  pbxLogin,
  pbxApi
} = require("../api/pbxClient");
const {
  setCredentials,
  getCredentials,
  getAllCredentials,
  removeCredentials,
  hasCredentials
} = require("../utils/credentialsStore");
const { scanDevices } = require("./arpScanner");
const { runNmapScan } = require("./nmapScanner");
const { runNativeScan } = require("./nativeScanner");
const { enrichDevice } = require("../utils/deviceUtils");
const { initializeCloudDevice, stopCloudMqttConnection, cloudApiGet, getCloudSystemInfo } = require("../api/cloudClient");

const isDev = process.env.NODE_ENV === "development";

function createWindow() {
  // Set icon path for both dev and production
  const iconPath = isDev
    ? path.join(app.getAppPath(), "public/wifi.ico")
    : path.join(process.resourcesPath, "wifi.ico");

  const win = new BrowserWindow({
    width: 1500,
    height: 650,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(app.getAppPath(), "src", "preload", "preload.js"),
      webSecurity: false, // ✅ allow loading local files inside ASAR
      nodeIntegration: false
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    // win.webContents.openDevTools(); // Commented out to prevent console from opening automatically
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
    } catch (e) { }
  };
  console.error = (...args) => {
    originalError(...args);
    try {
      win.webContents.send(
        "console-log",
        "ERROR: " + args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")
      );
    } catch (e) { }
  };

  createMenu(win);
}

function createMenu(win) {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Scan',
      submenu: [
        {
          label: 'Default Mode',
          type: 'radio',
          checked: true,
          click: () => {
            win.webContents.send('update-scan-mode', 'lite');
          }
        },
        {
          label: 'Nmap Mode',
          type: 'radio',
          checked: false,
          click: () => {
            win.webContents.send('update-scan-mode', 'enterprise');
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About Dasscom',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://dasscom.com');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// --- IPC handlers ---
// IP Phone APIs (2 functions like speaker APIs)
ipcMain.handle("login-device", async (event, ip, username = "admin", password = "admin", options = {}) => {
  // Try stored credentials first
  const storedCreds = getCredentials(ip);
  if (storedCreds) {
    try {
      return await login(ip, storedCreds.username, storedCreds.password, options);
    } catch (error) {
      console.warn(`Stored credentials failed for ${ip}, trying provided credentials`);
    }
  }
  // Fallback to provided or default credentials
  return await login(ip, username, password, options);
});
ipcMain.handle("ip-phone-api", async (event, ip, endpoint, method = "GET", body = null) => ipPhoneApi(ip, endpoint, method, body));

// Speaker APIs (2 functions)
ipcMain.handle("speaker-login", async (event, ip, username = "admin", password = "admin") => {
  // Try stored credentials first
  const storedCreds = getCredentials(ip);
  if (storedCreds) {
    try {
      return await speakerLogin(ip, storedCreds.username, storedCreds.password);
    } catch (error) {
      console.warn(`Stored credentials failed for ${ip}, trying provided credentials`);
    }
  }
  // Fallback to provided or default credentials
  return await speakerLogin(ip, username, password);
});
ipcMain.handle("speaker-api", async (event, ip, token, endpoint) => speakerApi(ip, token, endpoint));

// PBX APIs (2 functions)
ipcMain.handle("pbx-login", async (event, ip, username = "admin", password = "admin") => {
  // Try stored credentials first
  const storedCreds = getCredentials(ip);
  if (storedCreds) {
    try {
      return await pbxLogin(ip, storedCreds.username, storedCreds.password);
    } catch (error) {
      console.warn(`Stored credentials failed for ${ip}, trying provided credentials`);
    }
  }
  // Fallback to provided or default credentials
  return await pbxLogin(ip, username, password);
});
ipcMain.handle("pbx-api", async (event, ip, token, endpoint) => pbxApi(ip, token, endpoint));

// IP Phone API handlers using unified ipPhoneApi function
ipcMain.handle("fetch-system-info", async (event, ip, token) => ipPhoneApi(ip, '/cgi-bin/infos.cgi?oper=query&param=version'));
ipcMain.handle("fetch-svn-version", async (event, ip) => ipPhoneApi(ip, '/cgi-bin/infos.cgi?oper=query&param=svn_version'));
ipcMain.handle("fetch-ip-address", async (event, ip) => ipPhoneApi(ip, '/cgi-bin/infos.cgi?oper=query&param=ipaddr'));
ipcMain.handle("fetch-account-info", async (event, ip) => ipPhoneApi(ip, '/cgi-bin/infos.cgi?oper=query&param=account_infos'));
ipcMain.handle("fetch-dns", async (event, ip) => ipPhoneApi(ip, '/cgi-bin/infos.cgi?oper=query&param=dns_inuse'));
ipcMain.handle("fetch-gateway", async (event, ip) => ipPhoneApi(ip, '/cgi-bin/infos.cgi?oper=query&param=gateway_inuse'));
ipcMain.handle("fetch-netmask", async (event, ip) => ipPhoneApi(ip, '/cgi-bin/infos.cgi?oper=query&param=netmask'));
ipcMain.handle("fetch-account-status", async (event, ip) => ipPhoneApi(ip, '/cgi-bin/infos.cgi?oper=query&param=account_status'));
ipcMain.handle("fetch-all-account-info", async (event, ip) => ipPhoneApi(ip, '/cgi-bin/infos.cgi?oper=query&param=account_allinfos'));
ipcMain.handle("fetch-temperature", async (event, ip) => ipPhoneApi(ip, '/cgi-bin/infos.cgi?oper=query&param=temperature'));

// PBX API handlers using unified pbxApi function
ipcMain.handle("fetch-pbx-system-time", async (event, ip, token) => pbxApi(ip, token, '/pbx/systeminfo/system-current-time'));
ipcMain.handle("fetch-pbx-version", async (event, ip, token) => pbxApi(ip, token, '/pbx/systeminfo/version'));
ipcMain.handle("fetch-pbx-cpu", async (event, ip, token) => pbxApi(ip, token, '/pbx/systeminfo/cpu'));
ipcMain.handle("fetch-pbx-mem", async (event, ip, token) => pbxApi(ip, token, '/pbx/systeminfo/mem'));
ipcMain.handle("fetch-pbx-disk", async (event, ip, token) => pbxApi(ip, token, '/pbx/systeminfo/disk'));
ipcMain.handle("fetch-pbx-calls", async (event, ip, token) => pbxApi(ip, token, '/pbx/systeminfo/calls'));
ipcMain.handle("fetch-pbx-extension-status", async (event, ip, token) => pbxApi(ip, token, '/pbx/systeminfo/extension-status'));
ipcMain.handle("fetch-pbx-trunk-info", async (event, ip, token) => pbxApi(ip, token, '/pbx/systeminfo/trunk-info'));

// Device-specific PBX endpoints
ipcMain.handle("fetch-pbx-search-extensions", async (event, ip, token) => pbxApi(ip, token, '/pbx/extension-digital/search-extension-page'));
ipcMain.handle("fetch-pbx-extension-info", async (event, ip, token) => pbxApi(ip, token, '/pbx/extension-digital/extension-info'));
ipcMain.handle("fetch-pbx-extension-available", async (event, ip, token, exten) => pbxApi(ip, token, `/pbx/extension-digital/is-extension-available/${exten}`));

// Credentials management
ipcMain.handle("set-device-credentials", async (event, ip, username, password) => setCredentials(ip, username, password));
ipcMain.handle("get-device-credentials", async (event, ip) => getCredentials(ip));
ipcMain.handle("get-all-device-credentials", async (event) => getAllCredentials());
ipcMain.handle("remove-device-credentials", async (event, ip) => removeCredentials(ip));
ipcMain.handle("has-device-credentials", async (event, ip) => hasCredentials(ip));

ipcMain.handle("enrich-device", async (event, device, credentials) => enrichDevice(device, credentials));

// --- Cloud Platform Setup (MQTT) ---
ipcMain.handle("initialize-cloud-device", async (event, sn, mac, cloudDomain) => {
  console.log(`🚀 IPC: initialize-cloud-device called for SN: ${sn}`);
  try {
    // We pass event.sender.send down to the cloudClient
    // This allows the cloud client to instantly 'push' MQTT data to the React UI
    const ipcSender = (channel, data) => event.sender.send(channel, data);
    const result = await initializeCloudDevice(sn, mac, cloudDomain, ipcSender);
    return result;
  } catch (err) {
    console.error(`🚀 IPC: initialize-cloud-device error:`, err);
    return { success: false, message: err.message };
  }
});

ipcMain.handle("stop-cloud-device", async (event, sn) => {
  stopCloudMqttConnection(sn);
  return { success: true };
});

ipcMain.handle("fetch-cloud-system-info", async (event, sn) => {
  return await getCloudSystemInfo(sn);
});

ipcMain.handle("cloud-api-get", async (event, sn, endpoint) => {
  return await cloudApiGet(sn, endpoint);
});
// -----------------------------------

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

ipcMain.handle("export-to-excel", async (event, devices) => {
  try {
    // open save dialog
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Save Network Scan Report",
      defaultPath: "network_scan.xlsx",
      filters: [
        { name: "Excel Files", extensions: ["xlsx"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (canceled || !filePath) {
      return { success: false, error: "User cancelled" };
    }

    // call the export function
    const savedPath = await exportToExcel(devices, filePath);
    return { success: true, path: savedPath };

  } catch (err) {
    console.error("Export failed:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("nmap-scan", async (event, ip) => {
  console.log(`🚀 IPC: nmap-scan called for ${ip}`);
  try {
    const result = await runNmapScan(ip);
    return result;
  } catch (error) {
    console.error(`🚀 IPC: nmap-scan error for ${ip}:`, error);
    return null;
  }
});

// ── NATIVE SCANNER (No Nmap / No Npcap / No License) ──
ipcMain.handle("native-scan-devices", async (event, options = {}) => {
  console.log("🌿 IPC: native-scan-devices called with options:", options);
  try {
    const devices = await runNativeScan(options);
    console.log(`🌿 IPC: native scan completed, found ${devices.length} devices`);
    return devices;
  } catch (error) {
    console.error("🌿 IPC: native scan error:", error);
    throw error;
  }
});

if (!gotLock) {
  app.quit();
} else {
  app.setName("Dasscom");
  app.setAppUserModelId("com.dasscom.desktop"); // match package.json → build.appId
  app.whenReady().then(createWindow);
}


// macOS behavior
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
