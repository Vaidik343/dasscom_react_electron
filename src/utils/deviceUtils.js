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
  const macPrefix = normalizeMac(mac)?.split(":").slice(0, 3).join(":") || "";
  const v = (vendor || "").toLowerCase();


  // 1. API Login (First Priority) - Primarily for Dasscom devices
  if (macPrefix.startsWith("8C:1F:64")) {
    console.log(`🔍 Attempting API login detection for ${device.ip}...`);


    // Try PBX login
    try {
      const pbxResult = await window.api.pbxLogin(device.ip, "admin", "admin");
      if (pbxResult && pbxResult.success) {
        console.log(`✅ Detected PBX for ${device.ip} via Login`);
        return "IPPBX";
      }
    } catch (err) {
      console.warn(`❌ PBX login failed for ${device.ip}:`, err.message);
    }


    // Try Speaker login
    try {
      const speakerResult = await window.api.speakerLogin(device.ip, "admin", "admin");
      if (speakerResult) {
        console.log(`✅ Detected Speaker for ${device.ip} via Login`);
        return "Speaker";
      }
    } catch (err) {
      console.warn(`❌ Speaker login failed for ${device.ip}:`, err.message);
    }


    // Try IP Phone login
    try {
      const ipPhoneResult = await window.api.loginDevice(device.ip, "admin", "admin");
      if (ipPhoneResult && ipPhoneResult.loginSuccess) {
        console.log(`✅ Detected IP Phone for ${device.ip} via Login`);
        return "IP Phone";
      }
    } catch (err) {
      console.warn(`❌ IP Phone login failed for ${device.ip}:`, err.message);
    }

    // Try WiFi login
    try {
      const wifiResult = await window.api.wifiLogin(device.ip, "admin", "admin");
      if (wifiResult && wifiResult.success) {
        console.log(`✅ Detected WiFi Device for ${device.ip} via Login`);
        return "WiFi";
      }
    } catch (err) {
      console.warn(`❌ WiFi login failed for ${device.ip}:`, err.message);
    }
  }


  // 2. Nmap Option (Second Priority)
  console.log(`🔍 Attempting Nmap scan detection for ${device.ip}...`);
  try {
    const nmapOutput = await window.api.nmapScan(device.ip);
    if (nmapOutput) {
      const output = nmapOutput.toLowerCase();


      if (output.includes("device type: general purpose") && output.includes("webcam")) {
        console.log(`✅ Detected Camera for ${device.ip} via Nmap`);
        return "Camera";
      }
      if (output.includes("hikvision")) {
        console.log(`✅ Detected Camera for ${device.ip} via Nmap`);
        return "Camera";
      }
      if (output.includes("ip phone") || output.includes("voip") || output.includes("sip")) {
        console.log(`✅ Detected IP Phone for ${device.ip} via Nmap`);
        return "IP Phone";
      }
      if (output.includes("speaker") || output.includes("audio")) {
        console.log(`✅ Detected Speaker for ${device.ip} via Nmap`);
        return "Speaker";
      }
      if (output.includes("router") || output.includes("gateway") || output.includes("telnet")) {
        console.log(`✅ Detected Router for ${device.ip} via Nmap`);
        return "Router";
      }
      if (output.includes("switch")) {
        console.log(`✅ Detected Switch for ${device.ip} via Nmap`);
        return "Switch";
      }
      if (output.includes("printer")) {
        console.log(`✅ Detected Printer for ${device.ip} via Nmap`);
        return "Printer";
      }
      if (output.includes("pbx") || output.includes("asterisk") || output.includes("freepbx")) {
        console.log(`✅ Detected PBX for ${device.ip} via Nmap`);
        return "PBX";
      }
      if (output.includes("rtsp")) {
        console.log(`✅ Detected Camera for ${device.ip} via Nmap (RTSP)`);
        return "Camera";
      }
      if (output.includes("http")) {
        console.log(`✅ Detected Web Device for ${device.ip} via Nmap`);
        return "Web Device";
      }
      if (output.includes("ssh") || output.includes("ms-wbt-server") || output.includes("terminal services")) {
        console.log(`✅ Detected Computer for ${device.ip} via Nmap`);
        return "Computer";
      }
    }
  } catch (nmapErr) {
    console.warn(`❌ NMAP scan failed for ${device.ip}:`, nmapErr.message);
  }


  // 3. Vendor Mapping (Third Priority)
  console.log(`🔍 Attempting Vendor Mapping detection for ${device.ip}...`);
  try {
    const mappingsPath = new URL('../config/device-mappings.json', import.meta.url).pathname;
    const deviceMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    const vendorMappings = deviceMappings.vendor;
    for (const [key, value] of Object.entries(vendorMappings)) {
      if (v.includes(key.toLowerCase())) {
        console.log(`✅ Detected ${value} for ${device.ip} via Vendor Mapping`);
        return value;
      }
    }
  } catch (fsErr) {
    console.warn('❌ Failed to load device mappings:', fsErr.message);
  }


  console.log(`⚠️ Detected Unknown for ${device.ip} (${device.mac || "Unknown"})`);
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



