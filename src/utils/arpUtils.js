const fs = require("fs");
const path = require("path");

const OUI_DB = {};

// Load OUI database from file
function loadOUIDatabase() {
  let ouiFile;
  
  // Try multiple possible locations for the OUI file
  const possiblePaths = [
    // Development path
    path.join(__dirname, "../assets/data/oui.txt"),
    // Fallback path
    path.join(process.cwd(), "assets/data/oui.txt")
  ];

  // Add Electron-specific paths only if running in Electron
  if (process.versions && process.versions.electron) {
    possiblePaths.push(
      // Production path (unpacked from ASAR)
      path.join(process.resourcesPath, "assets/data/oui.txt"),
      // Alternative production path
      path.join(process.resourcesPath, "app.asar.unpacked", "assets", "data", "oui.txt"),
      // Additional paths for different build configurations
      path.join(process.resourcesPath, "app", "assets", "data", "oui.txt"),
      // Try relative to the main process file
      path.join(path.dirname(process.execPath), "resources", "assets", "data", "oui.txt"),
      path.join(path.dirname(process.execPath), "assets", "data", "oui.txt")
    );
  }

  for (const filePath of possiblePaths) {
    console.log("🔍 Checking OUI file at:", filePath);
    if (fs.existsSync(filePath)) {
      ouiFile = filePath;
      console.log("✅ Found OUI file at:", ouiFile);
      break;
    }
  }

  if (!ouiFile) {
    console.warn("⚠️ OUI file not found in any of the expected locations");
    return;
  }

  try {
    const lines = fs.readFileSync(ouiFile, "utf8").split("\n");
    let loadedCount = 0;
    let skippedCount = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }
      
      // Handle multiple OUI formats
      let hex, vendor;
      
      // Format 1: XX-XX-XX (hex) Vendor Name
      if (trimmedLine.includes("(hex)")) {
        [hex, vendor] = trimmedLine.split("(hex)").map(s => s.trim());
      }
      // Format 2: XX-XX-XX Vendor Name
      else if (trimmedLine.match(/^[0-9A-Fa-f]{2}-[0-9A-Fa-f]{2}-[0-9A-Fa-f]{2}\s/)) {
        const match = trimmedLine.match(/^([0-9A-Fa-f]{2}-[0-9A-Fa-f]{2}-[0-9A-Fa-f]{2})\s+(.+)$/);
        if (match) {
          hex = match[1];
          vendor = match[2].trim();
        }
      }
      // Format 3: XX:XX:XX Vendor Name
      else if (trimmedLine.match(/^[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}\s/)) {
        const match = trimmedLine.match(/^([0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2})\s+(.+)$/);
        if (match) {
          hex = match[1];
          vendor = match[2].trim();
        }
      }
      
      if (hex && vendor) {
        // Normalize the MAC prefix format to uppercase with colons
        const prefix = hex.replace(/-/g, ":").toUpperCase();
        
        // Clean up vendor name (remove trailing comments, extra spaces)
        vendor = vendor.replace(/#.*$/, '').trim();
        
        // Only add if we have a valid vendor name
        if (vendor && vendor !== "(base 16)") {
          OUI_DB[prefix] = vendor;
          loadedCount++;
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }
    
    console.log(`✅ Loaded ${loadedCount} vendor entries from OUI database`);
    if (skippedCount > 0) {
      console.log(`⚠️ Skipped ${skippedCount} invalid or malformed entries`);
    }
  } catch (error) {
    console.error("❌ Error loading OUI database:", error);
  }
}

// Load the OUI database on module initialization
loadOUIDatabase();

// Debug function to check OUI database status
function debugOUIDatabase() {
  console.log("🔍 OUI Database Status:");
  console.log(`- Total entries loaded: ${Object.keys(OUI_DB).length}`);
  console.log(`- Sample entries:`, Object.entries(OUI_DB).slice(0, 3));
}

function normalizeMac(mac) {
  if (!mac || typeof mac !== "string") return null;
  return mac.replace(/-/g, ":").toUpperCase();
}

function lookupVendor(mac) {
  const normalized = normalizeMac(mac);
  if (!normalized) return "Unknown";

  const prefix = normalized.split(":").slice(0, 3).join(":");
  
  // Direct lookup first
  if (OUI_DB[prefix]) {
    return OUI_DB[prefix];
  }
  
  // Try case-insensitive lookup
  const upperPrefix = prefix.toUpperCase();
  if (OUI_DB[upperPrefix]) {
    return OUI_DB[upperPrefix];
  }
  
  // Try partial matches (first 2 octets) as fallback
  const partialPrefix = prefix.split(":").slice(0, 2).join(":");
  for (const [dbPrefix, vendor] of Object.entries(OUI_DB)) {
    if (dbPrefix.startsWith(partialPrefix)) {
      return vendor;
    }
  }
  
  return "Unknown";
}

module.exports = { lookupVendor, normalizeMac, debugOUIDatabase };
