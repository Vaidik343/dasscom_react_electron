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

      if (type.includes("speaker")) {
        try {
          const token = await window.api.speakerLogin(device.ip, "admin", "admin");
          const systemInfo = await window.api.speakerApi(device.ip, token, "/api/get-system-info");
          const volumePriority = await window.api.speakerApi(device.ip, token, "/api/get-volume-priority");
          const provisioning = await window.api.speakerApi(device.ip, token, "/api/get-privisioning");
          const sipSlave1Info = await window.api.speakerApi(device.ip, token, "/api/get-sip-slave1-info");
          info = { systemInfo, volumePriority, provisioning, sipSlave1Info };
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
      } else {
        // IP phones / other
        try {
          await window.api.loginDevice(device.ip, "admin", "admin");
        } catch (loginErr) {
          // ignore login error and continue to try fetching info
          console.warn("loginDevice failed while fetching details:", loginErr);
        }
        info = await window.api.fetchSystemInfo(device.ip);
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
