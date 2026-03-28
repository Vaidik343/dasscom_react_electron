const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // IP Phone APIs (2 functions like speaker APIs)
  loginDevice: (ip, user, pass, options = {}) => ipcRenderer.invoke("login-device", ip, user, pass, options),
  ipPhoneApi: (ip, endpoint, method, body) => ipcRenderer.invoke("ip-phone-api", ip, endpoint, method, body),
  
  // Speaker APIs (2 functions)
  speakerLogin: (ip, user, pass) => ipcRenderer.invoke("speaker-login", ip, user, pass),
  speakerApi: (ip, token, endpoint) => ipcRenderer.invoke("speaker-api", ip, token, endpoint),

  // PBX APIs (2 functions)
  pbxLogin: (ip, user, pass) => ipcRenderer.invoke("pbx-login", ip, user, pass),
  pbxApi: (ip, token, endpoint) => ipcRenderer.invoke("pbx-api", ip, token, endpoint),

  // WiFi/Wireless Access Point APIs
  wifiLogin: (ip, user, pass) => ipcRenderer.invoke("wifi-login", ip, user, pass),
  wifiApi: (ip, cookie, endpoint, funname, action, body) => ipcRenderer.invoke("wifi-api", ip, cookie, endpoint, funname, action, body),

  // WiFi Wireless endpoints
  fetchWifiWirelessInfo:        (ip, cookie) => ipcRenderer.invoke("fetch-wifi-wireless-info", ip, cookie),
  fetchWifiTimeoutInfo:         (ip, cookie) => ipcRenderer.invoke("fetch-wifi-timeout-info", ip, cookie),
  fetchWifiUserList:            (ip, cookie) => ipcRenderer.invoke("fetch-wifi-user-list", ip, cookie),
  fetchWifiWirelessParams:      (ip, cookie) => ipcRenderer.invoke("fetch-wifi-wireless-params", ip, cookie),

  // WiFi System Log endpoints
  fetchWifiSystemLogInfo:       (ip, cookie) => ipcRenderer.invoke("fetch-wifi-system-log-info", ip, cookie),
  fetchWifiSystemLogFiles:      (ip, cookie) => ipcRenderer.invoke("fetch-wifi-system-log-files", ip, cookie),

  // WiFi Config & Settings endpoints
  fetchWifiConfigManagement:    (ip, cookie) => ipcRenderer.invoke("fetch-wifi-config-management", ip, cookie),
  fetchWifiLanguageSettings:    (ip, cookie) => ipcRenderer.invoke("fetch-wifi-language-settings", ip, cookie),
  fetchWifiScheduledRestart:    (ip, cookie) => ipcRenderer.invoke("fetch-wifi-scheduled-restart", ip, cookie),

  // WiFi Device Info endpoints
  fetchWifiDeviceSystemInfo:    (ip, cookie) => ipcRenderer.invoke("fetch-wifi-device-system-info", ip, cookie),
  fetchWifiDeviceBasicInfo:     (ip, cookie) => ipcRenderer.invoke("fetch-wifi-device-basic-info", ip, cookie),

  // Credentials management
  setDeviceCredentials: (ip, username, password) => ipcRenderer.invoke("set-device-credentials", ip, username, password),
  getDeviceCredentials: (ip) => ipcRenderer.invoke("get-device-credentials", ip),
  getAllDeviceCredentials: () => ipcRenderer.invoke("get-all-device-credentials"),
  removeDeviceCredentials: (ip) => ipcRenderer.invoke("remove-device-credentials", ip),
  hasDeviceCredentials: (ip) => ipcRenderer.invoke("has-device-credentials", ip),
  
  // Utility functions
  enrichDevice: (device, credentials) => ipcRenderer.invoke("enrich-device", device, credentials),
  scanDevices: (options = {}) => ipcRenderer.invoke("scan-devices", options),
  
  // Cloud Platform Functions
  initializeCloudDevice: (sn, mac, cloudDomain) => ipcRenderer.invoke("initialize-cloud-device", sn, mac, cloudDomain),
  stopCloudDevice: (sn) => ipcRenderer.invoke("stop-cloud-device", sn),
  fetchCloudSystemInfo: (sn) => ipcRenderer.invoke("fetch-cloud-system-info", sn),
  cloudApiGet: (sn, endpoint) => ipcRenderer.invoke("cloud-api-get", sn, endpoint),
  onCloudDeviceUpdate: (callback) => {
    ipcRenderer.on("cloud-device-update", (event, data) => callback(data));
  },
  nativeScanDevices: (options = {}) => ipcRenderer.invoke("native-scan-devices", options),

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

  // PBX functions
  fetchPbxSystemTime: (ip, token) => ipcRenderer.invoke("fetch-pbx-system-time", ip, token),
  fetchPbxVersion: (ip, token) => ipcRenderer.invoke("fetch-pbx-version", ip, token),
  fetchPbxCpu: (ip, token) => ipcRenderer.invoke("fetch-pbx-cpu", ip, token),
  fetchPbxMem: (ip, token) => ipcRenderer.invoke("fetch-pbx-mem", ip, token),
  fetchPbxDisk: (ip, token) => ipcRenderer.invoke("fetch-pbx-disk", ip, token),
  fetchPbxCalls: (ip, token) => ipcRenderer.invoke("fetch-pbx-calls", ip, token),
  fetchPbxExtensionStatus: (ip, token) => ipcRenderer.invoke("fetch-pbx-extension-status", ip, token),
  fetchPbxTrunkInfo: (ip, token) => ipcRenderer.invoke("fetch-pbx-trunk-info", ip, token),
  fetchPbxSearchExtensions: (ip, token) => ipcRenderer.invoke("fetch-pbx-search-extensions", ip, token),
  fetchPbxExtensionInfo: (ip, token) => ipcRenderer.invoke("fetch-pbx-extension-info", ip, token),
  fetchPbxExtensionAvailable: (ip, token, exten) => ipcRenderer.invoke("fetch-pbx-extension-available", ip, token, exten),

  nmapScan: (ip) => ipcRenderer.invoke("nmap-scan", ip),
  exportToExcel: (devices) => ipcRenderer.invoke("export-to-excel", devices),

  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  onUpdateScanMode: (callback) => {
    ipcRenderer.on('update-scan-mode', (event, mode) => callback(mode));
  },
});
  