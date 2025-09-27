import { useMemo } from "react";
import { useDeviceContext } from "../renderer/context/DeviceContext";

export const useDeviceFilter = () => {
  const { devices, searchQuery, deviceType } = useDeviceContext();

  const filtered = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return (devices || []).filter(d => {
      const matchesSearch = !q ||
        (d.ip && d.ip.toLowerCase().includes(q)) ||
        (d.mac && d.mac.toLowerCase().includes(q)) ||
        (d.hostname && d.hostname.toLowerCase().includes(q));
      const matchesType = !deviceType || (d.type || "unknown").toLowerCase() === deviceType.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [devices, searchQuery, deviceType]);

  return filtered;
};
