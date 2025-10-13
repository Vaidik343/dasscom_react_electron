const { shell } = require("electron"); // add this at the top


// Unified API function for IP phone endpoints (similar to speakerApi)
async function ipPhoneApi(ip, endpoint, method = "GET", body = null) {
  const url = `http://${ip}${endpoint}`;
  console.log(`Making IP phone API call to ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Use Basic Auth for IP phone APIs
    const authString = btoa('admin:admin');
    const headers = {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      mode: 'cors'
    });

    clearTimeout(timeoutId);
    console.log(`IP phone API response status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      const text = await res.text();
      console.error(`IP phone API failed response body: ${text}`);
      throw new Error(`IP phone API request failed (${endpoint}): ${res.status} ${res.statusText} | ${text}`);
    }

    const responseData = await res.json();
    console.log("IP phone API response data:", responseData);
    return responseData;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('IP phone API request timed out');
    }
    console.error("IP phone API fetch error:", error.message);
    throw error;
  }
}


//login
async function login(ip, username = "admin", password = "admin", options = {}) {
  console.log("🚀 ~ login ~ login:", ip, username);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sec timeout

  try {
    const loginUrl = `http://${ip}/action/login?username=${username}&password=${password}`;
    console.log("🔗 Login URL:", loginUrl);

    let res = await fetch(loginUrl, {
      method: "POST", // Use POST method as per API documentation
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      mode: 'cors'
    });

    clearTimeout(timeoutId);
    console.log("🚀 ~ login ~ res (API):", res.status, res.statusText);

    if (res.ok) {
      // ✅ API login worked - parse response
      let loginData = {};
      try {
        const responseText = await res.text();
        if (responseText) {
          loginData = JSON.parse(responseText);
        }
        console.log("📄 Login response data:", loginData);
      } catch (parseError) {
        console.log("📄 Login response is not JSON or empty:", parseError.message);
      }

      return { ...loginData, ip, loginSuccess: true };
    } else {
      // ❌ API login failed → open normal web UI
      console.warn(`⚠️ Login endpoint failed (${res.status}), opening in browser...`);
      // if (!options.noBrowser) {
      //   shell.openExternal(`http://${ip}`);
      // }
      // return { openedBrowser: true };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("❌ Login request error:", error.message);

    // If request itself failed (timeout / network) → still open browser
    // shell.openExternal(`http://${ip}`);
    // return { openedBrowser: true };
  }
}




//speaker
// Login first and get token
const deviceTokens = {}; // store per-IP token

async function speakerLogin(ip, username, password) {
  const url = `http://${ip}/api/login`;
  console.log(`Attempting speaker login to ${url} with username: ${username}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  console.log(`Login response status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const text = await res.text();
    console.error(`Login failed response body: ${text}`);
    throw new Error(`Login failed: ${res.status} ${res.statusText} | ${text}`);
  }

  const data = await res.json();
  console.log("Login response data:", data);
  const token = data.data?.token;
  if (!token) throw new Error("Login succeeded but no token returned");

  deviceTokens[ip] = token; // store token for this IP
  console.log(`Login successful, token stored for ${ip}: ${token.substring(0, 20)}...`);
  return token;
}

async function speakerApi(ip, token, endpoint, method = "GET", body = null) {
  const url = `http://${ip}${endpoint}`;
  console.log(`Making speaker API call to ${url}${token ? ` with token: ${token.substring(0, 20)}...` : ' without token'}`);

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  if (token) {
    headers["Authorization"] = token;
    console.log(`Authorization header set to: ${token.substring(0, 20)}...`);
  }

  console.log("Full headers:", headers);

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  console.log(`API response status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const text = await res.text();
    console.error(`API failed response body: ${text}`);
    throw new Error(`API request failed (${endpoint}): ${res.status} ${res.statusText} | ${text}`);
  }

  const responseData = await res.json();
  console.log("API response data:", responseData);
  return responseData;
}

// PBX APIs moved to src/api/pbxClient.js for better organization
 
 
module.exports = {
  // IP Phone APIs (2 functions like speaker APIs)
  ipPhoneApi,        // Unified function for all IP phone API calls
  login,             // IP phone login function

  // Speaker APIs (2 functions)
  speakerApi,        // Unified function for all speaker API calls
  speakerLogin       // Speaker login function
};
