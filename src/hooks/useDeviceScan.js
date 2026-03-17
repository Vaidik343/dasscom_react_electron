import { useCallback, useState } from "react";
import { useDeviceContext } from "../renderer/context/DeviceContext";
import { enrichDevice, detectDeviceTypeDynamic } from "../utils/deviceUtils";

export const useDeviceScan = () => {
  const { setDevices, setLoading } = useDeviceContext();
  const [error, setError] = useState(null);

  /**
   * scanDevices — works for both scan modes.
   * @param {object} options   - options passed to the IPC handler
   * @param {string} scanMode  - 'enterprise' (Nmap) | 'lite' (Native Node.js)
   */
  const scanDevices = useCallback(async (options = {}, scanMode = "enterprise") => {
    setLoading(true);
    setError(null);

    try {
      // ── Route to the correct backend based on scan mode ──
      let rawDevices;
      if (scanMode === "lite") {
        if (!window.api || !window.api.nativeScanDevices) {
          throw new Error("Native scan API not available");
        }
        console.log("🌿 Starting Lite Scan (Native Node.js — No Nmap/Npcap)");
        rawDevices = await window.api.nativeScanDevices(options);
      } else {
        if (!window.api || !window.api.scanDevices) {
          throw new Error("Enterprise scan API not available");
        }
        console.log("🚀 Starting Enterprise Scan (Nmap)");
        rawDevices = await window.api.scanDevices(options);
      }

      if (!Array.isArray(rawDevices)) {
        console.warn("scanDevices returned non-array:", rawDevices);
      }

      // ── Same enrichment pipeline for both modes ──
      const enriched = await Promise.all(
        (rawDevices || []).map(async (d) => {
          try {
            const e = await enrichDevice(d);
            const type = await detectDeviceTypeDynamic(e, e.openPorts || []);
            return { ...e, type };
          } catch (err) {
            console.warn(`❌ enrichDevice failed for ${d.ip}:`, err && err.message ? err.message : err);
            return { ip: d.ip, mac: d.mac || null, vendor: "Unknown", type: "Unknown", alive: true };
          }
        })
      );

      setDevices(enriched);
      return enriched;

    } catch (err) {
      console.error("scanDevices hook error:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setDevices]);

  return { scanDevices, error };
};
