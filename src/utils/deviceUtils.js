// src/utils/deviceUtils.js
// Utility functions for device enrichment and API fetching

/**
 * Normalize MAC address to standard format (uppercase, colon-separated)
 */
export function normalizeMac(mac) {
  if (!mac || typeof mac !== "string") return null;
  return mac.replace(/-/g, ":").toUpperCase();
}

/**
 * Detect device type dynamically (simple heuristic)
 */
export async function detectDeviceTypeDynamic(device, openPorts = []) {
  const mac = device.mac;
  const vendor = device.vendor;
  const macPrefix = mac?.split(":").slice(0, 3).join(":") || "";
  const v = (vendor || "").toLowerCase();

  if (v.includes("cisco")) return "Switch";
  if (v.includes("hp") || v.includes("hewlett")) return "Printer";
  if (v.includes("intel")) return "Computer";

  if (openPorts.includes(5060)) return "IP Phone"; // SIP
  if (openPorts.includes(80) || openPorts.includes(443)) return "Camera"; // Web device
  if (openPorts.includes(554)) return "Camera"; // RTSP
  if (openPorts.includes(23)) return "Router"; // Telnet

  // For Dasscom devices (MAC prefix 8C:1F:64), try login APIs to determine type
  if (macPrefix.startsWith("8C:1F:64")) {
    try {
      await window.api.speakerLogin(device.ip, "admin", "admin");
      return "Speaker";
    } catch (err) {
      console.warn(`Speaker login failed for ${device.ip}:`, err.message);
    }
    try {
      await window.api.loginDevice(device.ip, "admin", "admin");
      return "IP Phone";
    } catch (err) {
      console.warn(`IP Phone login failed for ${device.ip}:`, err.message);
    }
    return "Unknown"; // Both logins failed
  }

  return "Unknown";
}

/**
 * Enrich device with extra metadata
 */
export async function enrichDevice(device) {
  const mac = normalizeMac(device.mac);
  const vendor = device.vendor || "Unknown";
  const type = device.type || (await detectDeviceTypeDynamic(mac, vendor)) || "Unknown";

  return {
    ...device,
    mac,
    vendor,
    type,
  };
}

/**
 * Fetch details for a device from backend APIs (via preload -> ipcRenderer)
 */
export async function fetchDeviceDetails(device) {
  if (!device || !device.ip) return { error: "Invalid device" };

  try {
    let details = {};

    // Example: try speaker API
    if (device.type === "Speaker") {
      try {
        const login = await window.api.speakerLogin(device.ip, "admin", "admin"); // credentials?
        const info = await window.api.speakerApi(device.ip, login.token, "/system/info");
        details = { ...details, speaker: info };
      } catch (err) {
        console.warn(`Speaker API failed for ${device.ip}:`, err);
      }
    }

    // Example: try IP Phone
    if (device.type === "IP Phone") {
      try {
        const login = await window.api.loginDevice(device.ip, "admin", "admin");
        const info = await window.api.fetchSystemInfo(device.ip, login.token);
        details = { ...details, phone: info };
      } catch (err) {
        console.warn(`Phone API failed for ${device.ip}:`, err);
      }
    }

    return { ...device, details };
  } catch (error) {
    console.error("❌ Error fetching device details:", error);
    return { ...device, error: error.message };
  }
}
