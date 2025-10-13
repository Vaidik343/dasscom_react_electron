import { useState } from "react";
import { useDeviceContext } from "../renderer/context/DeviceContext";

export const useDeviceDetails = () => {
  const { setSelectedDevice } = useDeviceContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetails = async (device) => {
    setLoading(true);
    setError(null);

    try {
      let info = null;
      const type = (device.type || "").toLowerCase();

      if (type.includes("speaker"))  {
        try {
          const token = await window.api.speakerLogin(device.ip, "admin", "admin");
          const systemInfo = await window.api.speakerApi(device.ip, token, "/api/get-system-info");
          const volumePriority = await window.api.speakerApi(device.ip, token, "/api/get-volume-priority");
          const provisioning = await window.api.speakerApi(device.ip, token, "/api/get-privisioning");
          const sipSlave1Info = await window.api.speakerApi(device.ip, token, "/api/get-sip-slave1-info");


          const sipSlave2Info = await window.api.speakerApi(device.ip, token, "/api/get-sip-slave2-info");
          const functionInfo = await window.api.speakerApi(device.ip, token, "/api/get-sip-function-info");
          const masterInfo = await window.api.speakerApi(device.ip, token, "/api/get-sip-master-info");
          const advanceInfo = await window.api.speakerApi(device.ip, token, "/api/get-sip-advance-info");
          const sip = await window.api.speakerApi(device.ip, token, "/api/get-sipapi");
          const language = await window.api.speakerApi(device.ip, token, "/api/get-language");
          const audio = await window.api.speakerApi(device.ip, token, "/api/get-audio-codec");

          info = { systemInfo, volumePriority, provisioning, sipSlave1Info,sipSlave2Info , functionInfo, masterInfo, advanceInfo, sip,language , audio};
        } catch (err) {
          console.warn("Speaker API fetch failed:", err.message);
        }
        // Also try old APIs if they work
        try {
          const accountInfo = await window.api.fetchAccountInfo(device.ip);
          info = { ...info, accountInfo };
        } catch (err) {
          console.warn("Account info fetch failed for speaker:", err.message);
        }
        try {
          const dnsInfo = await window.api.fetchDNS(device.ip);
          info = { ...info, dnsInfo };
        } catch (err) {
          console.warn("DNS fetch failed for speaker:", err.message);
        }
        try {
          const gatewayInfo = await window.api.fetchGetway(device.ip);
          info = { ...info, gatewayInfo };
        } catch (err) {
          console.warn("Gateway fetch failed for speaker:", err.message);
        }
        try {
          const netmaskInfo = await window.api.fetchNetMask(device.ip);
          info = { ...info, netmaskInfo };
        } catch (err) {
          console.warn("Netmask fetch failed for speaker:", err.message);
        }
      } else if (type.includes("pbx")) {
        // PBX devices
        try {
          const token = await window.api.pbxLogin(device.ip, "admin", "admin");
          console.log("PBX login successful for", device.ip);

          // Fetch common PBX system info
          try { info.systemTime = await window.api.fetchPbxSystemTime(device.ip, token); } catch (e) { console.warn("PBX systemTime failed:", e.message); }
          try { info.version = await window.api.fetchPbxVersion(device.ip, token); } catch (e) { console.warn("PBX version failed:", e.message); }
          try { info.cpu = await window.api.fetchPbxCpu(device.ip, token); } catch (e) { console.warn("PBX cpu failed:", e.message); }
          try { info.memory = await window.api.fetchPbxMem(device.ip, token); } catch (e) { console.warn("PBX memory failed:", e.message); }
          try { info.disk = await window.api.fetchPbxDisk(device.ip, token); } catch (e) { console.warn("PBX disk failed:", e.message); }
          try { info.calls = await window.api.fetchPbxCalls(device.ip, token); } catch (e) { console.warn("PBX calls failed:", e.message); }
          try { info.extensionStatus = await window.api.fetchPbxExtensionStatus(device.ip, token); } catch (e) { console.warn("PBX extensionStatus failed:", e.message); }
          try { info.trunkInfo = await window.api.fetchPbxTrunkInfo(device.ip, token); } catch (e) { console.warn("PBX trunkInfo failed:", e.message); }

          // Device-specific endpoints based on model (if available)
          try {
            const extensions = await window.api.fetchPbxSearchExtensions(device.ip, token);
            info.extensions = extensions;
          } catch (e) { console.warn("PBX extensions failed:", e.message); }

          try {
            const extensionInfo = await window.api.fetchPbxExtensionInfo(device.ip, token);
            info.extensionInfo = extensionInfo;
          } catch (e) { console.warn("PBX extensionInfo failed:", e.message); }

        } catch (err) {
          console.warn("PBX API fetch failed:", err.message);
        }
      } else {
        // IP phones / other
        try {
          await window.api.loginDevice(device.ip, "admin", "admin");
        } catch (loginErr) {
          // ignore login error and continue to try fetching info
          console.warn("loginDevice failed while fetching details:", loginErr);
        }
        // Fetch all IP phone info
        info = {};
        try { info.systemInfo = await window.api.fetchSystemInfo(device.ip); } catch (e) { console.warn("systemInfo failed:", e.message); }
        try { info.svnVersion = await window.api.fetchSvnVersion(device.ip); } catch (e) { console.warn("svnVersion failed:", e.message); }
        try { info.ipAddress = await window.api.fetchIpAddress(device.ip); } catch (e) { console.warn("ipAddress failed:", e.message); }
        try { info.dns = await window.api.fetchDNS(device.ip); } catch (e) { console.warn("dns failed:", e.message); }
        try { info.gateway = await window.api.fetchGetway(device.ip); } catch (e) { console.warn("gateway failed:", e.message); }
        try { info.netmask = await window.api.fetchNetMask(device.ip); } catch (e) { console.warn("netmask failed:", e.message); }
        try { info.accountStatus = await window.api.fetchAccountStatus(device.ip); } catch (e) { console.warn("accountStatus failed:", e.message); }
        try { info.callStatus = await window.api.fetchCallStatus(device.ip); } catch (e) { console.warn("callStatus failed:", e.message); }
        try { info.temperature = await window.api.fetchTemperature(device.ip); } catch (e) { console.warn("temperature failed:", e.message); }
        try { info.accountInfo = await window.api.fetchAccountInfo(device.ip); } catch (e) { console.warn("accountInfo failed:", e.message); }
        try { info.allAccountInformation = await window.api.fetchAllAcountInformation(device.ip); } catch (e) { console.warn("allAccountInformation failed:", e.message); }
      }

      setSelectedDevice({ ...device, info });
      return { success: true, info };
    } catch (err) {
      console.error("fetchDetails error:", err);
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };
 
  return { fetchDetails, loading, error };
};
