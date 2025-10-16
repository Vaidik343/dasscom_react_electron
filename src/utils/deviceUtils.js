// src/utils/deviceUtils.js
// Utility functions for device enrichment and API fetching

import fs from 'fs';
import path from 'path';

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

  // Use NMAP for device type detection
  try {
    const nmapOutput = await window.api.nmapScan(device.ip);
    if (nmapOutput) {
      const output = nmapOutput.toLowerCase();

      // Check for device type in Nmap OS and Service detection output
      if (output.includes("device type: general purpose") && output.includes("webcam")) {
        console.log(`Detected Camera for ${device.ip} (${device.mac || "Unknown"})`);
        return "Camera";
      }
      if (output.includes("hikvision")) {
        console.log(`Detected Camera for ${device.ip} (${device.mac || "Unknown"})`);
        return "Camera";
      }
      if (output.includes("ip phone") || output.includes("voip")) {
        console.log(`Detected IP Phone for ${device.ip} (${device.mac || "Unknown"})`);
        return "IP Phone";
      }
      if (output.includes("speaker") || output.includes("audio")) {
        console.log(`Detected Speaker for ${device.ip} (${device.mac || "Unknown"})`);
        return "Speaker";
      }
      if (output.includes("router") || output.includes("gateway")) {
        console.log(`Detected Router for ${device.ip} (${device.mac || "Unknown"})`);
        return "Router";
      }
      if (output.includes("switch")) {
        console.log(`Detected Switch for ${device.ip} (${device.mac || "Unknown"})`);
        return "Switch";
      }
      if (output.includes("printer")) {
        console.log(`Detected Printer for ${device.ip} (${device.mac || "Unknown"})`);
        return "Printer";
      }
      if (output.includes("pbx") || output.includes("asterisk") || output.includes("freepbx")) {
        console.log(`Detected PBX for ${device.ip} (${device.mac || "Unknown"})`);
        return "PBX";
      }

      // Check for detected services (dynamic from NMAP)
      if (output.includes("sip")) {
        console.log(`Detected IP Phone for ${device.ip} (${device.mac || "Unknown"})`);
        return "IP Phone";
      }
      if (output.includes("rtsp")) {
        console.log(`Detected Camera for ${device.ip} (${device.mac || "Unknown"})`);
        return "Camera";
      }
      if (output.includes("http")) {
        console.log(`Detected Web Device for ${device.ip} (${device.mac || "Unknown"})`);
        return "Web Device";
      }
      if (output.includes("telnet")) {
        console.log(`Detected Router for ${device.ip} (${device.mac || "Unknown"})`);
        return "Router";
      }
      if (output.includes("ssh")) {
        console.log(`Detected Computer for ${device.ip} (${device.mac || "Unknown"})`);
        return "Computer";
      }
      if (output.includes("ms-wbt-server") || output.includes("terminal services")) {
        console.log(`Detected Computer for ${device.ip} (${device.mac || "Unknown"})`);
        return "Computer";
      }
    }
  } catch (nmapErr) {
    console.warn(`NMAP scan failed for ${device.ip}:`, nmapErr.message);

    // Fallback: Use vendor mappings for device type detection
    try {
      const mappingsPath = new URL('../config/device-mappings.json', import.meta.url).pathname;
      const deviceMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
      const vendorMappings = deviceMappings.vendor;
      for (const [key, value] of Object.entries(vendorMappings)) {
        if (v.includes(key.toLowerCase())) {
          console.log(`Detected ${value} for ${device.ip} (${device.mac || "Unknown"})`);
          return value;
        }
      }
    } catch (fsErr) {
      console.warn('Failed to load device mappings:', fsErr.message);
    }

    // Fallback: For Dasscom devices (MAC prefix 8C:1F:64), try login APIs to determine type
    if (macPrefix.startsWith("8C:1F:64")) {
      try {
        await window.api.pbxLogin(device.ip, "admin", "admin");
        console.log(`Detected PBX for ${device.ip} (${device.mac || "Unknown"})`);
        return "PBX";
      } catch (err) {
        console.warn(`PBX login failed for ${device.ip}:`, err.message);
      }
      try {
        await window.api.speakerLogin(device.ip, "admin", "admin");
        console.log(`Detected Speaker for ${device.ip} (${device.mac || "Unknown"})`);
        return "Speaker";
      } catch (err) {
        console.warn(`Speaker login failed for ${device.ip}:`, err.message);
      }
      try {
        await window.api.loginDevice(device.ip, "admin", "admin");
        console.log(`Detected IP Phone for ${device.ip} (${device.mac || "Unknown"})`);
        return "IP Phone";
      } catch (err) {
        console.warn(`IP Phone login failed for ${device.ip}:`, err.message);
      }
      console.log(`Detected Unknown for ${device.ip} (${device.mac || "Unknown"})`);
      return "Unknown"; // All logins failed
    }
  }
  console.log(`Detected Unknown for ${device.ip} (${device.mac || "Unknown"})`);
  return "Unknown";
}

/**
 * Enrich device with extra metadata
 */
export async function enrichDevice(device) {
  const mac = normalizeMac(device.mac);
  const vendor = device.vendor || "Unknown";
  const type = device.type || "Unknown";
  const online = device.online !== undefined ? device.online : true; // Default to true if not provided

  return {
    ...device,
    mac,
    vendor,
    type,
    online,
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
    if (device.type === "Speaker" || device.type === "Extension") {
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
