const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  loginDevice: (ip, user, pass) => ipcRenderer.invoke("login-device", ip, user, pass),
  fetchSystemInfo: (ip, token) => ipcRenderer.invoke("fetch-system-info", ip, token),
  fetchSvnVersion: (ip) => ipcRenderer.invoke("fetch-svn-version", ip),
  fetchIpAddress: (ip) => ipcRenderer.invoke("fetch-ip-address", ip),
  fetchAccountInfo: (ip) => ipcRenderer.invoke("fetch-account-info", ip),
  fetchDNS: (ip) => ipcRenderer.invoke("fetch-dns", ip),
  fetchGetway: (ip) => ipcRenderer.invoke("fetch-gateway", ip),
  fetchNetMask: (ip) => ipcRenderer.invoke("fetch-netmask", ip),
  fetchAccountStatus: (ip) => ipcRenderer.invoke("fetch-account-status", ip),
  fetchAllAcountInformation: (ip) => ipcRenderer.invoke("fetch-all-account-info", ip),
  speakerLogin: (ip, user, pass) => ipcRenderer.invoke("speaker-login", ip, user, pass),
  speakerApi: (ip, token, endpoint) => ipcRenderer.invoke("speaker-api", ip, token, endpoint),
  enrichDevice: (device, credentials) => ipcRenderer.invoke("enrich-device", device, credentials),

  scanDevices: (options = {}) => ipcRenderer.invoke("scan-devices", options),

  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
});
