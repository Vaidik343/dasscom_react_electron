const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const execAsync = util.promisify(exec);

async function getNmapPath() {
  // Try bundled NMAP first (for packaged app)
  const possiblePaths = [
    // Production path (unpacked from ASAR) - matches build config
    path.join(path.dirname(process.execPath), 'binaries', 'win32', 'nmap.exe'),
    path.join(path.dirname(process.execPath), 'binaries', process.platform, process.platform === 'win32' ? 'nmap.exe' : 'nmap'),
    // Alternative production paths
    path.join(path.dirname(process.execPath), 'resources', 'app.asar.unpacked', 'binaries', 'win32', 'nmap.exe'),
    path.join(path.dirname(process.execPath), 'resources', 'app.asar.unpacked', 'binaries', process.platform, process.platform === 'win32' ? 'nmap.exe' : 'nmap'),
    // Additional paths for different build configurations
    path.join(path.dirname(process.execPath), 'resources', 'app', 'binaries', 'win32', 'nmap.exe'),
    path.join(path.dirname(process.execPath), 'resources', 'app', 'binaries', process.platform, process.platform === 'win32' ? 'nmap.exe' : 'nmap'),
    // Try relative to the main process file
    path.join(path.dirname(process.execPath), 'resources', 'binaries', 'win32', 'nmap.exe'),
    path.join(path.dirname(process.execPath), 'resources', 'binaries', process.platform, process.platform === 'win32' ? 'nmap.exe' : 'nmap'),
    path.join(path.dirname(process.execPath), 'binaries', 'win32', 'nmap.exe'),
    path.join(path.dirname(process.execPath), 'binaries', process.platform, process.platform === 'win32' ? 'nmap.exe' : 'nmap'),
    // Project-specific bundled binaries (development)
    path.join(__dirname, '..', '..', 'binaries', 'win32', 'nmap.exe'),
    path.join(__dirname, '..', '..', 'binaries', process.platform, process.platform === 'win32' ? 'nmap.exe' : 'nmap')
  ];

  for (const nmapPath of possiblePaths) {
    console.log("🔍 Checking NMAP at:", nmapPath);
    if (fs.existsSync(nmapPath)) {
      console.log("✅ Found bundled NMAP at:", nmapPath);
      return nmapPath;
    }
  }

  // Check system-installed NMAP
  const systemNmap = process.platform === 'win32' ? 'nmap.exe' : 'nmap';
  console.log("🔍 Checking system NMAP");
  try {
    await execAsync(`"${systemNmap}" --version`, { timeout: 5000 });
    console.log("✅ System NMAP available");
    return systemNmap;
  } catch (error) {
    console.warn("⚠️ System NMAP not available:", error.message);
  }

  console.warn("⚠️ NMAP not found in any expected location");
  return null;
}

async function runNmapScan(ip) {
  const nmapPath = await getNmapPath();
  if (!nmapPath) {
    console.error("NMAP not available");
    return null;
  }

  const command = `"${nmapPath}" -sT -sV --script=http-title,http-headers,dns-service-discovery,snmp-info -p 80,8080,443,1900,5353,161,554 ${ip}`;

  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 }); // 30 sec timeout
    console.log(`NMAP scan for ${ip} completed`);
    return stdout;
  } catch (error) {
    console.error(`NMAP scan failed for ${ip}:`, error.message);
    return null;
  }
}

module.exports = { runNmapScan };
