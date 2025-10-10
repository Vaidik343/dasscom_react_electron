const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // IP Phone APIs (2 functions like speaker APIs)
  loginDevice: (ip, user, pass, options = {}) => ipcRenderer.invoke("login-device", ip, user, pass, options),
  ipPhoneApi: (ip, endpoint, method, body) => ipcRenderer.invoke("ip-phone-api", ip, endpoint, method, body),
  
  // Speaker APIs (2 functions)
  speakerLogin: (ip, user, pass) => ipcRenderer.invoke("speaker-login", ip, user, pass),
  speakerApi: (ip, token, endpoint) => ipcRenderer.invoke("speaker-api", ip, token, endpoint),
  
  // Utility functions
  enrichDevice: (device, credentials) => ipcRenderer.invoke("enrich-device", device, credentials),
  scanDevices: (options = {}) => ipcRenderer.invoke("scan-devices", options),

  // Legacy IP phone functions (for backward compatibility)
  fetchSystemInfo: (ip, token) => ipcRenderer.invoke("fetch-system-info", ip, token),
  fetchSvnVersion: (ip) => ipcRenderer.invoke("fetch-svn-version", ip),
  fetchIpAddress: (ip) => ipcRenderer.invoke("fetch-ip-address", ip),
  fetchAccountInfo: (ip) => ipcRenderer.invoke("fetch-account-info", ip),
  fetchDNS: (ip) => ipcRenderer.invoke("fetch-dns", ip),
  fetchGetway: (ip) => ipcRenderer.invoke("fetch-gateway", ip),
  fetchNetMask: (ip) => ipcRenderer.invoke("fetch-netmask", ip),
  fetchAccountStatus: (ip) => ipcRenderer.invoke("fetch-account-status", ip),
  fetchAllAcountInformation: (ip) => ipcRenderer.invoke("fetch-all-account-info", ip),
  fetchTemperature: (ip) => ipcRenderer.invoke("fetch-temperature", ip),
  nmapScan: (ip) => ipcRenderer.invoke("nmap-scan", ip),
  exportToExcel: (devices) => ipcRenderer.invoke("export-to-excel", devices),

  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
});
