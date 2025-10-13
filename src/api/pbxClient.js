const axios = require('axios');

// -----------------------------
// 🔹 Token Cache: Per-IP storage
// -----------------------------
let pbxTokenCache = {}; // per IP cache

// -----------------------------
// 🔹 Login: POST /pbx/auth/login
// -----------------------------
async function pbxLogin(ip, username, password) {
  try {
    const url = `http://${ip}/pbx/auth/login`;
    const response = await axios.post(url, { username, password });
    const token = response?.data?.token || response?.data?.access_token;

    if (token) pbxTokenCache[ip] = token; // store per device
    return { success: true, token };
  } catch (err) {
    console.error("PBX login failed:", err.message);
    return { success: false, error: err.message };
  }
}

// -----------------------------
// 🔹 Generic API fetcher
// -----------------------------
async function pbxApi(ip, endpoint, token = null) {
  const activeToken = token || pbxTokenCache[ip];
  if (!activeToken) {
    throw new Error("PBX token missing — login first");
  }

  const url = `http://${ip}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    return response.data;
  } catch (err) {
    console.error(`PBX API call failed: ${endpoint}`, err.message);
    throw err;
  }
}


// comman
const pbxEndpoints = {
  common: [
    "/pbx/systeminfo/system-current-time",
    "/pbx/systeminfo/version",
    "/pbx/systeminfo/cpu",
    "/pbx/systeminfo/mem",
    "/pbx/systeminfo/disk",
    "/pbx/systeminfo/calls",
    "/pbx/systeminfo/extension-status",
    "/pbx/systeminfo/trunk-info",
    
  ],
  specific: {
    // extension: [
    
    //   "/pbx/extension-digital/extension-info",
    //   "/pbx/extension-digital/is-extension-available/<exten>", //check this url again for "<exten>"
    // ],
    gateway: [
      
    ],
    // callForwardin: [

    //     "/pbx/call-forward/list"
    // ]
  },
};

module.exports = {
  pbxLogin,
  pbxApi,
  pbxEndpoints,
};
