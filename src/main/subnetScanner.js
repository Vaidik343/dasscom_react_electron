const { enrichDevice } = require("../utils/deviceUtils");
const ping = require("ping");
const ip = require("ip")
async function scanSubnet(ipAddr, netmask) {
  const subnet = ip.subnet(ipAddr, netmask);
  const ips = [];

  for (let i = 1; i < subnet.numHosts; i++) {
    ips.push(ip.fromLong(ip.toLong(subnet.networkAddress) + i));
  }

  const results = await Promise.all(
    ips.map(async ip => {
      const res = await ping.promise.probe(ip);
      if (res.alive) {
        return enrichDevice({ ip, mac: null, alive: true, responseTime: res.time });
      }
    })
  );

  return results.filter(Boolean);
}

module.exports = { scanSubnet };
