import React, { createContext, useContext, useState, useEffect } from "react";

const DeviceContext = createContext(null);

export const DeviceProvider = ({ children }) => {
  const [devices, setDevices] = useState([]);
  console.log("🚀 ~ DeviceProvider ~ devices:", devices)
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [viewMode, setViewMode] = useState(localStorage.getItem("viewMode") || "card");
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceType, setDeviceType] = useState("");

  const [loading, setLoading] = useState(false);

    // Simulate loading (2–3 sec)
 
  // -----------------------------
  // 🔹 Cloud Device Listener
  // -----------------------------
  useEffect(() => {
    // We only want to set this up if the api is available (Electron env)
    if (window.api && window.api.onCloudDeviceUpdate) {
      console.log("☁️ Setting up Cloud MQTT Device Listener in Context...");
      
      window.api.onCloudDeviceUpdate((cloudData) => {
        console.log("☁️ Received Live Cloud Data:", cloudData);
        
        setDevices((prevDevices) => {
          // Attempt to match the device either by SN or MAC (if your cloudData happens to include it)
          const existingDeviceIndex = prevDevices.findIndex(
            (d) => d.sn === cloudData.sn || (cloudData.mac && d.mac === cloudData.mac)
          );

          if (existingDeviceIndex !== -1) {
            // Update Existing Device
            const updatedDevices = [...prevDevices];
            updatedDevices[existingDeviceIndex] = {
              ...updatedDevices[existingDeviceIndex],
              online: true, 
              source: "cloud", // 👈 This label lets us distinguish it from LAN devices!
              lastCloudUpdate: cloudData.timestamp,
              cloudData: cloudData.data, // Attach the raw payload for UI display
            };
            return updatedDevices;
          } else {
            // Add completely new Cloud Device 
            // Since it isn't on the LAN, it won't have an IP by default unless the payload includes its remote WAN IP.
            const newDevice = {
               sn: cloudData.sn,
               vendor: "Dasscom", // Assuming Dasscom Cloud
               type: "Cloud Device", // We can parse cloudData.topic to determine exact type later
               mac: cloudData.mac || "Unknown",
               ip: "Remote",
               online: true,
               source: "cloud",
               lastCloudUpdate: cloudData.timestamp,
               cloudData: cloudData.data,
            };
            return [...prevDevices, newDevice];
          }
        });
      });
    }
  }, []); 
  const value = {
    devices,
 loading, setLoading,
    setDevices,
    selectedDevice,
    setSelectedDevice,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    deviceType,
    setDeviceType
  };

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
};

export const useDeviceContext = () => {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error("useDeviceContext must be used inside DeviceProvider");
  return ctx;
};
