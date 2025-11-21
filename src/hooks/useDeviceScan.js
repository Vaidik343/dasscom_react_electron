import { useCallback, useState } from "react";
import { useDeviceContext } from "../renderer/context/DeviceContext";
import { enrichDevice, detectDeviceTypeDynamic } from "../utils/deviceUtils";

export const useDeviceScan = () => {
  const { setDevices } = useDeviceContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const scanDevices = useCallback(async (options = {}) => {
    setLoading(true);
    setIsLoading(true);
    setError(null);
    try {
      if (!window.api || !window.api.scanDevices) {
        throw new Error("API not available");
      }
      const rawDevices = await window.api.scanDevices(options); // main ipc
      if (!Array.isArray(rawDevices)) {
        console.warn("scanDevices returned non-array:", rawDevices);
      }

      const enriched = await Promise.all(
        (rawDevices || []).map(async (d) => {
          try {
            const e = await enrichDevice(d);
            const type = await detectDeviceTypeDynamic(e, e.openPorts || []);
            return { ...e, type };
          } catch (err) {
            console.warn(`❌ enrichDevice failed for ${d.ip}:`, err && err.message ? err.message : err);
            // return minimal fallback
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
      setIsLoading(false);
    }
  }, [setDevices, setIsLoading]);

  return { scanDevices, loading, error };
};
