// src/api/wifiClient.js
// WiFi/Wireless Access Point API Client
// Authentication: Cookie-based (stork={token})
// All requests use POST to /cgi-bin/* with funname + action query params

// -----------------------------
// 🔹 Cookie/Session Cache: Per-IP storage
// -----------------------------
let wifiCookieCache = {}; // { [ip]: cookieString }


// -----------------------------
// 🔹 Unified WiFi API Request
// POST http://{ip}/{endpoint}?funname={fn}&action={act}
// Cookie: stork={token}
// -----------------------------
async function wifiApi(ip, cookie, endpoint, funname, action, body = null) {
  const activeCookie = cookie || wifiCookieCache[ip];
  if (!activeCookie) {
    console.error(`[WiFi] API Call Failed: Missing cookie/token for ${ip}`);
    throw new Error("WiFi session cookie missing — login first");
  }

  const url = `http://${ip}${endpoint}?funname=${funname}&action=${action}`;
  console.log(`[WiFi] Calling API: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Cookie": `stork=${activeCookie}`
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      mode: "cors"
    });

    clearTimeout(timeoutId);
    console.log(`[WiFi] API Response [${endpoint}?funname=${funname}&action=${action}]: Status ${res.status}`);

    if (!res.ok) {
      const text = await res.text();
      console.error(`[WiFi] API failed response body: ${text}`);
      throw new Error(`WiFi API request failed (funname=${funname}, action=${action}): ${res.status} ${res.statusText} | ${text}`);
    }

    const data = await res.json();
    console.log(`[WiFi] Response data:`, data);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("WiFi API request timed out");
    }
    console.error(`[WiFi] Fetch error [${endpoint}]:`, error.message);
    throw error;
  }
}


// -----------------------------
// 🔹 Login: POST /cgi-bin/login?funname=1&action=1
// Returns { token } and stores cookie in cache
// -----------------------------
async function wifiLogin(ip, username = "admin", password = "admin") {
  const url = `http://${ip}/cgi-bin/login?funname=1&action=1&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  console.log(`[WiFi] Attempting login to: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      signal: controller.signal,
      mode: "cors"
    });

    clearTimeout(timeoutId);
    console.log(`[WiFi] Login Response Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      const text = await res.text();
      console.error(`[WiFi] Login failed response body: ${text}`);
      throw new Error(`WiFi login failed: ${res.status} ${res.statusText} | ${text}`);
    }

    const data = await res.json();
    console.log(`[WiFi] Login response data:`, data);

    // Extract token from response
    const token = data?.token || data?.data?.token || data?.stork;
    if (!token) {
      throw new Error("WiFi login succeeded but no token returned");
    }

    // Cache cookie for this IP
    wifiCookieCache[ip] = token;
    console.log(`[WiFi] Login successful, cookie cached for ${ip}: ${String(token).substring(0, 20)}...`);

    return { success: true, token, cookie: token };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("WiFi login request timed out");
    }
    console.error(`[WiFi] Login error for ${ip}:`, error.message);
    return { success: false, error: error.message };
  }
}


// ============================================================
module.exports = {
  // Core
  wifiLogin,
  wifiApi
};
