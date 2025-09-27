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
          // Try without token first
          info = await window.api.speakerApi(device.ip, null, "/api/get-system-info");
        } catch (noTokenErr) {
          console.warn("API call without token failed, trying with login:", noTokenErr.message);
          const token = await window.api.speakerLogin(device.ip, "admin", "admin");
          info = await window.api.speakerApi(device.ip, token, "/api/get-system-info");
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
