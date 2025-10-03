const { lookupVendor, normalizeMac } = require("../utils/arpUtils");
const { enrichDevice } = require("../utils/deviceUtils");
const { exec, spawn } = require("child_process");
const os = require("os");
const dns = require("dns");
const util = require("util");
const ping = require("ping");
const net = require("net");
const { scanSubnet } = require("./subnetScanner");
const reverseLookup = util.promisify(dns.reverse);
const ip = require("ip");
const path = require("path");
const fs = require("fs");
const log = require('electron-log');

// Get all local network subnets
function getLocalNetworkSubnets() {
  const interfaces = os.networkInterfaces();
  const subnets = [];
  console.log('Available network interfaces:', Object.keys(interfaces));
  for (const name of Object.keys(interfaces)) {
    console.log(`Interface ${name}:`, interfaces[name]);
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const subnet = ip.subnet(iface.address, iface.netmask);
        const subnetCidr = `${subnet.networkAddress}/${subnet.subnetMaskLength}`;
        subnets.push({
          interface: name,
          ipAddr: iface.address,
          netmask: iface.netmask,
          subnetCidr
        });
        console.log(`Found subnet: ${subnetCidr} on ${name}`);
      }
    }
  }
  if (subnets.length === 0) {
    throw new Error('No suitable network interfaces found');
  }
  return subnets;
}
// 🧠 Parse ARP output based on platform
function parseARP(output) {
  const lines = output.split("\n").filter(line => line.trim());
  const interfaces = {};
  let currentInterface = null;

  for (const line of lines) {
    if (line.startsWith("Interface:")) {
      const match = line.match(/Interface:\s+(\d+\.\d+\.\d+\.\d+)/);
      if (match) {
        currentInterface = match[1];
        interfaces[currentInterface] = [];
      }
    } else if (currentInterface) {
      let ip, mac, type;

      if (os.platform() === "win32") {
        const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([a-fA-F0-9:-]+)\s+(\w+)/);
        if (match) {
          ip = match[1];
          mac = match[2];
          type = match[3];
        }
      } else {
        const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+\w+\s+([a-fA-F0-9:-]+)/);
        if (match) {
          ip = match[1];
          mac = match[2];
          type = 'dynamic'; // assume
        }
      }

      if (ip && mac && (type === 'dynamic' || type === 'static')) {
        interfaces[currentInterface].push({ ip, mac, vendor: lookupVendor(mac) });
      }
    }
  }

  return interfaces;
}

// ⚡ Quick port scanner (few common ports)
async function scanPorts(ip, ports = [80, 443, 22, 23, 554, 3389, 9100]) {
  const open = [];

  await Promise.all(
    ports.map(port => {
      return new Promise(resolve => {
        const socket = new net.Socket();
        socket.setTimeout(400);

        socket.once("connect", () => {
          open.push(port);
          socket.destroy();
          resolve();
        });

        socket.once("timeout", () => {
          socket.destroy();
          resolve();
        });

        socket.once("error", () => resolve());

        socket.connect(port, ip);
      });
    })
  );

  return open;
}

// 🔍 Nmap scanning function
const { app } = require('electron');

function getNmapPath() {
  const platform = os.platform();
  const arch = os.arch();
  let binaryName = 'nmap';

  if (platform === 'win32') {
    binaryName = 'nmap.exe';
  }

  // First try bundled binary
  const binariesDir = path.join(__dirname, '..', '..', '..', 'binaries');
  const bundledPath = path.join(binariesDir, platform, binaryName);
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }

  // Fallback to system PATH
  return binaryName;
}

// Parse Nmap output for host discovery (returns IPs)
function parseNmapOutput(output) {
  const ips = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const hostMatch = line.match(/^Nmap scan report for (\d+\.\d+\.\d+\.\d+)/);
    if (hostMatch) {
      ips.push(hostMatch[1]);
    }
  }

  return ips;
}

async function scanWithNmap(subnet) {
  const nmapPath = getNmapPath();
  console.log(`Using Nmap at: ${nmapPath}`);

  // Only check existence for bundled binaries, not for system PATH commands
  if (path.isAbsolute(nmapPath) && !fs.existsSync(nmapPath)) {
    throw new Error(`Nmap binary not found at ${nmapPath}. Please download and place nmap.exe in binaries/win32/`);
  }

  const args = ['-sn', '-PR', '-oG', '-', subnet];

  return new Promise((resolve, reject) => {
    const nmap = spawn(nmapPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    nmap.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    nmap.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    nmap.on('close', (code) => {
      if (code === 0) {
        console.log('Nmap stdout:', stdout);
        console.log('Nmap stderr:', stderr);
        const devices = parseNmapOutput(stdout);
        console.log(`Nmap found ${devices.length} devices:`, devices);
        resolve(devices);
      } else {
        console.error(`Nmap error: ${stderr}`);
        reject(new Error(`Nmap failed with code ${code}: ${stderr}`));
      }
    });

    nmap.on('error', (err) => {
      reject(err);
    });
  });
}


// 🚀 Main scan function
async function scanDevices({ useSubnetScan = false, ipAddr, netmask, useNmap = true, fallbackToArp = true } = {}) {
  if (useSubnetScan && ipAddr && netmask) {
    return scanSubnet(ipAddr, netmask);
  }

  try {
    // Get all local network subnets
    const subnets = getLocalNetworkSubnets();
    console.log(`Scanning ${subnets.length} subnets: ${subnets.map(s => s.subnetCidr).join(', ')}`);

    let allAliveIps = [];
    let devices = [];

    if (useNmap) {
      try {
        console.log('Attempting Nmap scan on all subnets...');

        // Scan all subnets with Nmap
        for (const subnetInfo of subnets) {
          console.log(`Scanning subnet: ${subnetInfo.subnetCidr}`);
          try {
            const aliveIps = await scanWithNmap(subnetInfo.subnetCidr);
            console.log(`Subnet ${subnetInfo.subnetCidr} found ${aliveIps.length} alive IPs: ${aliveIps.join(', ')}`);
            allAliveIps = allAliveIps.concat(aliveIps);
          } catch (subnetError) {
            console.warn(`Failed to scan subnet ${subnetInfo.subnetCidr}:`, subnetError.message);
          }
        }

        console.log(`Total Nmap scan completed, found ${allAliveIps.length} alive IPs across all subnets: ${allAliveIps.join(', ')}`);

        if (allAliveIps.length === 0) {
          console.log('No alive IPs found by Nmap, falling back to ARP scan');
          useNmap = false;
        } else if (allAliveIps.length > 0) {
          // Ping the discovered IPs to populate ARP table
          console.log('Pinging discovered IPs to populate ARP table...');
          const concurrencyLimit = 20;
          for (let i = 0; i < allAliveIps.length; i += concurrencyLimit) {
            const batch = allAliveIps.slice(i, i + concurrencyLimit);
            console.log(`Pinging batch ${Math.floor(i / concurrencyLimit) + 1}: ${batch.join(', ')}`);
            await Promise.all(
              batch.map(async (ipAddr) => {
                try {
                  await ping.promise.probe(ipAddr, { timeout: 2 });
                } catch (error) {
                  console.log(`Ping error for ${ipAddr}: ${error.message}`);
                }
              })
            );
          }

          // Wait for ARP table to populate
          console.log('Waiting 3 seconds for ARP table to populate...');
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Read ARP table
          const command = os.platform() === "win32" ? "arp -a" : "arp -n";
          const arpOutput = await new Promise((resolve, reject) => {
            exec(command, (err, stdout) => {
              if (err) reject(err);
              else resolve(stdout);
            });
          });

          const arpInterfaces = parseARP(arpOutput);
          console.log('ARP interfaces after Nmap:', Object.keys(arpInterfaces).map(ip => `${ip}: ${arpInterfaces[ip].length} devices`));

          // Collect devices from all interfaces
          for (const ifaceIp in arpInterfaces) {
            devices = devices.concat(arpInterfaces[ifaceIp]);
          }
          console.log(`Collected ${devices.length} devices from all ARP interfaces`);
        } else {
          console.log('No alive IPs found by Nmap');
          devices = [];
        }
      } catch (nmapError) {
        console.warn('Nmap scan failed, falling back to ARP scan:', nmapError.message);
        useNmap = false;
      }
    }

    if (!useNmap) {
      console.log('Using ARP-based scan...');

      // First, do a ping sweep to populate ARP table
      console.log('Performing ping sweep to populate ARP table...');
      const pingPromises = [];
      for (const subnetInfo of subnets) {
        const subnet = ip.cidrSubnet(subnetInfo.subnetCidr);
        const networkAddress = subnet.networkAddress;
        const broadcastAddress = subnet.broadcastAddress;

        // Ping all IPs in the subnet (excluding network and broadcast)
        for (let i = 1; i < subnet.numHosts; i++) {
          const ipAddr = ip.fromLong(ip.toLong(networkAddress) + i);
          if (ipAddr !== subnetInfo.ipAddr) { // Don't ping ourselves
            pingPromises.push(
              ping.promise.probe(ipAddr, { timeout: 1 }).catch(() => ({ alive: false }))
            );
          }
        }
      }

      // Execute ping sweep in batches to avoid overwhelming the network
      const batchSize = 100; // Increased concurrency
      for (let i = 0; i < pingPromises.length; i += batchSize) {
        const batch = pingPromises.slice(i, i + batchSize);
        await Promise.all(batch);
        console.log(`Pinged batch ${Math.floor(i / batchSize) + 1} (${batch.length} IPs)`);
      }

      console.log('Ping sweep completed, waiting for ARP table to populate...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for ARP to populate

      // Now read ARP table
      const command = os.platform() === "win32" ? "arp -a" : "arp -n";
      const arpOutput = await new Promise((resolve, reject) => {
        exec(command, (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout);
        });
      });

      const arpInterfaces = parseARP(arpOutput);
      console.log('ARP interfaces after ping sweep:', Object.keys(arpInterfaces).map(ip => `${ip}: ${arpInterfaces[ip].length} devices`));

      // Collect devices from all interfaces
      for (const ifaceIp in arpInterfaces) {
        devices = devices.concat(arpInterfaces[ifaceIp]);
      }
      console.log(`Collected ${devices.length} devices from all ARP interfaces`);
    }

    // Debug: Log all devices found before filtering
    console.log('All devices found before filtering:');
    devices.forEach((device, index) => {
      console.log(`${index + 1}. IP: ${device.ip}, MAC: ${device.mac}, Vendor: ${device.vendor}`);
    });

    // Filter for Dasscom devices (MAC prefix 8C:1F:64)
    const dasscomDevices = devices.filter(device => device.mac && normalizeMac(device.mac).startsWith('8C:1F:64'));
    console.log(`Filtered to ${dasscomDevices.length} Dasscom devices (MAC prefix 8C:1F:64) out of ${devices.length}`);

    const enrichedDevices = await Promise.all(dasscomDevices.map(enrichDevice));

    return enrichedDevices;
  } catch (error) {
    console.error("Error in scanDevices:", error);
    throw error;
  }
}

module.exports = { scanDevices };

