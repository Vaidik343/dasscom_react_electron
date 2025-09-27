const { lookupVendor, normalizeMac } = require("../utils/arpUtils");
const { enrichDevice } = require("../utils/deviceUtils");
const { exec } = require("child_process");
const os = require("os");
const dns = require("dns");
const util = require("util");
const ping = require("ping");
const net = require("net");
const { scanSubnet } = require("./subnetScanner");
const reverseLookup = util.promisify(dns.reverse);
const ip = require("ip")
const log = require('electron-log');

// Get local network interface IP and netmask
function getLocalNetworkInfo() {
  const interfaces = os.networkInterfaces();
  console.log('Available network interfaces:', Object.keys(interfaces));
  for (const name of Object.keys(interfaces)) {
    console.log(`Interface ${name}:`, interfaces[name]);
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`Using interface ${name}: ${iface.address}/${iface.netmask}`);
        return { ipAddr: iface.address, netmask: iface.netmask };
      }
    }
  }
  throw new Error('No suitable network interface found');
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


// 🚀 Main scan function
async function scanDevices({ useSubnetScan = false, ipAddr, netmask } = {}) {
  if (useSubnetScan && ipAddr && netmask) {
    return scanSubnet(ipAddr, netmask);
  }

  try {
    // First, get ARP table to find the best interface (with most devices)
    const command = os.platform() === "win32" ? "arp -a" : "arp -n";
    const arpOutput = await new Promise((resolve, reject) => {
      exec(command, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });

    const arpInterfaces = parseARP(arpOutput);
    console.log('ARP interfaces:', Object.keys(arpInterfaces).map(ip => `${ip}: ${arpInterfaces[ip].length} devices`));

    // Find the interface with the most dynamic entries
    let bestInterface = null;
    let maxDevices = 0;
    for (const ifaceIp in arpInterfaces) {
      if (arpInterfaces[ifaceIp].length > maxDevices) {
        maxDevices = arpInterfaces[ifaceIp].length;
        bestInterface = ifaceIp;
      }
    }

    if (!bestInterface) {
      console.log('No ARP entries found, falling back to subnet scan');
      return scanSubnet(); // or something
    }

    console.log(`Best interface: ${bestInterface} with ${maxDevices} devices`);

    // Now get the netmask for this interface
    const interfaces = os.networkInterfaces();
    let localNetmask = null;
    for (const name in interfaces) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal && iface.address === bestInterface) {
          localNetmask = iface.netmask;
          break;
        }
      }
      if (localNetmask) break;
    }

    if (!localNetmask) {
      console.log('Could not find netmask for best interface, using default');
      localNetmask = '255.255.255.0'; // assume /24
    }

    const localIp = bestInterface;
    console.log(`Using IP: ${localIp}, Netmask: ${localNetmask}`);
    const subnet = ip.subnet(localIp, localNetmask);
    console.log(`Subnet: ${subnet.networkAddress}/${subnet.subnetMaskLength}, Hosts: ${subnet.numHosts}`);

    // Generate all IPs in subnet (excluding network and broadcast)
    const ips = [];
    for (let i = 1; i < subnet.numHosts - 1; i++) {
      ips.push(ip.fromLong(ip.toLong(subnet.networkAddress) + i));
    }

    console.log(`Scanning ${ips.length} IPs in subnet ${subnet.networkAddress}/${subnet.subnetMaskLength}`);

    // Ping all IPs concurrently with limit to avoid overwhelming
    const concurrencyLimit = 20;
    const results = [];
    for (let i = 0; i < ips.length; i += concurrencyLimit) {
      const batch = ips.slice(i, i + concurrencyLimit);
      console.log(`Pinging batch ${Math.floor(i / concurrencyLimit) + 1}: ${batch[0]} to ${batch[batch.length - 1]}`);
      const batchResults = await Promise.all(
        batch.map(async (ip) => {
          try {
            const res = await ping.promise.probe(ip, { timeout: 2 });
            if (res.alive) {
              console.log(`Alive: ${ip}`);
              return ip;
            }
            return null;
          } catch (error) {
            console.log(`Ping error for ${ip}: ${error.message}`);
            return null;
          }
        })
      );
      results.push(...batchResults.filter(Boolean));
    }

    console.log(`Found ${results.length} alive IPs: ${results.join(', ')}`);

    // Wait a bit for ARP table to populate
    console.log('Waiting 3 seconds for ARP table to populate...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Now get ARP table again
    const updatedArpOutput = await new Promise((resolve, reject) => {
      exec(command, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });

    const updatedArpInterfaces = parseARP(updatedArpOutput);
    const arpDevices = updatedArpInterfaces[bestInterface] || [];
    console.log(`ARP scan found ${arpDevices.length} devices on ${bestInterface}`);
    console.log('ARP devices:', arpDevices.map(d => ({ip: d.ip, mac: d.mac})));

    // Filter for Dasscom devices (MAC prefix 8C:1F:64)
    const dasscomDevices = arpDevices.filter(device => device.mac && normalizeMac(device.mac).startsWith('8C:1F:64'));
    console.log(`Filtered to ${dasscomDevices.length} Dasscom devices (MAC prefix 8C:1F:64) out of ${arpDevices.length}`);

    const enrichedDevices = await Promise.all(dasscomDevices.map(enrichDevice));

    // If no Dasscom devices from ARP, but alive IPs found, show all as unknown (or filter if needed)
    if (enrichedDevices.length === 0 && results.length > 0) {
      console.log('No Dasscom devices from ARP, showing alive IPs as Unknown');
      const localIp = bestInterface; // Exclude local IP
      const subnetDevices = await Promise.all(
        results.filter(ip => ip !== localIp).map(async (ip) => {
          // For subnet fallback, could also filter by MAC if available, but since no MAC, show all except local
          return await enrichDevice({ ip, mac: null, alive: true });
        })
      );
      return subnetDevices.filter(d => d.mac && d.mac.toUpperCase().startsWith('8C:1F:64') || !d.mac); // Optional: filter even in fallback
    }

    return enrichedDevices;
  } catch (error) {
    console.error("Error in scanDevices:", error);
    throw error;
  }
}

module.exports = { scanDevices };

