import React, { createContext, useContext, useState } from "react";

const DeviceContext = createContext(null);

export const DeviceProvider = ({ children }) => {
  const [devices, setDevices] = useState([]);
  console.log("🚀 ~ DeviceProvider ~ devices:", devices)
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [viewMode, setViewMode] = useState(localStorage.getItem("viewMode") || "card");
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const value = {
    devices,
    setDevices,
    selectedDevice,
    setSelectedDevice,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    deviceType,
    setDeviceType,
    isLoading,
    setIsLoading
  };

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
};

export const useDeviceContext = () => {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error("useDeviceContext must be used inside DeviceProvider");
  return ctx;
};
