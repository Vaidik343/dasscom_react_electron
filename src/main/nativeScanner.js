// src/main/nativeScanner.js
// 100% Native Node.js LAN scanner — NO Nmap, NO Npcap, NO Admin rights required.
// Uses a "TCP Knock → ARP Harvest" strategy to discover Dasscom devices.

const net = require('net');
const { exec } = require('child_process');
const util = require('util');
const os = require('os');
const ip = require('ip');
const { lookupVendor, normalizeMac } = require('../utils/arpUtils');
const { enrichDevice } = require('../utils/deviceUtils');

const execAsync = util.promisify(exec);

// ─────────────────────────────────────────────
// 1. SUBNET DETECTION
// Finds all active LAN subnets (same as original arpScanner.js)
// ─────────────────────────────────────────────
function getLocalSubnets() {
  const interfaces = os.networkInterfaces();
  const subnets = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const subnet = ip.subnet(iface.address, iface.netmask);
        subnets.push({
          interface: name,
          ipAddr: iface.address,
          netmask: iface.netmask,
          networkAddress: subnet.networkAddress,
          numHosts: subnet.numHosts,
          subnetMaskLength: subnet.subnetMaskLength,
        });
        console.log(`[NativeScanner] Found subnet: ${subnet.networkAddress}/${subnet.subnetMaskLength} on ${name}`);
      }
    }
  }

  if (subnets.length === 0) throw new Error('[NativeScanner] No active network interfaces found.');
  return subnets;
}


// ─────────────────────────────────────────────
// 2. TCP KNOCKER (The Core Innovation)
// Sends a TCP SYN to a target IP on port 80.
// Even on rejection/timeout, Windows resolves the
// ARP address BEFORE sending the packet — that is
// all we need. No Npcap, no driver, no Admin Rights.
// ─────────────────────────────────────────────
function tcpKnock(targetIp, port = 80, timeoutMs = 200) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    const cleanup = () => { socket.destroy(); resolve(); };

    socket.on('connect', cleanup);
    socket.on('timeout', cleanup);
    socket.on('error', cleanup);  // Refused/closed is fine — ARP was already resolved

    socket.connect(port, targetIp);
  });
}


// ─────────────────────────────────────────────
// 3. BATCH PROBER
// Probes all hosts in a subnet in parallel batches.
// Batching avoids overwhelming the OS socket limit.
// ─────────────────────────────────────────────
async function probeSubnet(networkAddress, numHosts) {
  const baseIpLong = ip.toLong(networkAddress);
  const BATCH_SIZE = 50; // Probe 50 IPs at a time

  // Common ports: HTTP, HTTPS, SIP for VoIP, Telnet for old routers
  const PROBE_PORTS = [80, 443, 5060, 23];

  console.log(`[NativeScanner] Probing ${numHosts} hosts on network ${networkAddress}...`);

  for (let offset = 1; offset <= numHosts; offset += BATCH_SIZE) {
    const batch = [];
    for (let i = offset; i < offset + BATCH_SIZE && i <= numHosts; i++) {
      const targetIp = ip.fromLong(baseIpLong + i);
      // Knock on each port (first one to succeed forces ARP)
      for (const port of PROBE_PORTS) {
        batch.push(tcpKnock(targetIp, port));
      }
    }
    await Promise.all(batch);
  }
  console.log(`[NativeScanner] Probing complete for ${networkAddress}.`);
}


// ─────────────────────────────────────────────
// 4. ARP TABLE READER
// Reads the Windows ARP cache that was populated
// by the prober above. Returns all dynamic entries.
// ─────────────────────────────────────────────
async function readArpTable() {
  const command = os.platform() === 'win32' ? 'arp -a' : 'arp -n';
  const { stdout } = await execAsync(command);

  const devices = [];
  const lines = stdout.split('\n');

  for (const line of lines) {
    // Matches: 192.168.1.50   8c-1f-64-aa-bb-cc   dynamic
    const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([a-fA-F0-9:-]{11,17})\s+dynamic/i);
    if (match) {
      const deviceIp = match[1];
      const rawMac = match[2];
      const mac = normalizeMac(rawMac); // Normalize to uppercase AA:BB:CC format
      const vendor = lookupVendor(mac);

      devices.push({ ip: deviceIp, mac, vendor });
    }
  }

  console.log(`[NativeScanner] ARP table has ${devices.length} dynamic entries.`);
  return devices;
}


// ─────────────────────────────────────────────
// 5. ONLINE STATUS CHECK
// Quick ping to confirm the device is currently live.
// ─────────────────────────────────────────────
function checkOnlineStatus(ipAddr) {
  return new Promise((resolve) => {
    const pingCmd = os.platform() === 'win32'
      ? `ping -n 1 -w 1000 ${ipAddr}`
      : `ping -c 1 -W 1 ${ipAddr}`;

    exec(pingCmd, (error, stdout) => {
      if (error) { resolve(false); return; }
      const output = stdout.toLowerCase();
      resolve(
        os.platform() === 'win32'
          ? output.includes('reply from') || output.includes('bytes=')
          : output.includes('1 received')
      );
    });
  });
}


// ─────────────────────────────────────────────
// 6. MAIN EXPORT FUNCTION
// Full pipeline: Probe → Harvest → Filter → Enrich
// ─────────────────────────────────────────────
async function runNativeScan({ debugMode = false } = {}) {
  const startTime = Date.now();
  console.log('[NativeScanner] ─── Starting Native LAN Scan ───');

  try {
    // Step 1: Find all subnets
    const subnets = getLocalSubnets();

    // Step 2: Probe all subnets in parallel (force ARP resolution)
    await Promise.all(
      subnets.map(s => probeSubnet(s.networkAddress, Math.min(s.numHosts, 254)))
    );

    // Step 3: Harvest from the ARP table
    const allDevices = await readArpTable();

    // Step 4: Debug mode returns all devices (useful for UI demo)
    if (debugMode) {
      console.log('[NativeScanner] DEBUG MODE: Returning all devices without MAC filter.');
      const enriched = await Promise.all(
        allDevices.map(async (d) => {
          const online = await checkOnlineStatus(d.ip);
          return enrichDevice({ ...d, online });
        })
      );
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[NativeScanner] ─── Scan complete in ${elapsed}s — ${enriched.length} total devices ───`);
      return enriched;
    }

    // Step 5: Filter for Dasscom MAC prefix only
    const dasscomDevices = allDevices.filter(d => d.mac && d.mac.startsWith('8C:1F:64'));
    console.log(`[NativeScanner] Found ${dasscomDevices.length} Dasscom devices out of ${allDevices.length} total.`);

    // Step 6: Check online status and enrich each Dasscom device
    const enriched = await Promise.all(
      dasscomDevices.map(async (d) => {
        const online = await checkOnlineStatus(d.ip);
        return enrichDevice({ ...d, online });
      })
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[NativeScanner] ─── Scan complete in ${elapsed}s — ${enriched.length} Dasscom devices found ───`);
    return enriched;

  } catch (error) {
    console.error('[NativeScanner] Scan failed:', error.message);
    throw error;
  }
}

module.exports = { runNativeScan };
