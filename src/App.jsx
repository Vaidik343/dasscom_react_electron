import React, { useEffect } from "react";
import DeviceCard from "./renderer/components/DeviceCard";
import DeviceTable from "./renderer/components/DeviceTable";
import DeviceModal from "./renderer/components/DeviceModal";
import { useDeviceFilter } from "./hooks/useDeviceFilter";
import { DeviceProvider, useDeviceContext } from "./renderer/context/DeviceContext";
import { useDeviceDetails } from "./hooks/useDeviceDetails";
import { useDeviceScan } from "./hooks/useDeviceScan";

const AppContent = () => {
  const {
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    deviceType, setDeviceType,
    devices
  } = useDeviceContext();

  const { scanDevices, loading: scanning } = useDeviceScan();
  const filteredDevices = useDeviceFilter();
  const { fetchDetails } = useDeviceDetails();

  useEffect(() => {
    // initial scan on mount
    scanDevices().catch(err => console.error("Initial scan failed:", err));
  }, [scanDevices]);

  const uniqueTypes = Array.from(new Set(devices.map(d => (d.type || "unknown").toLowerCase()))).sort();

  return (
    <div className="app-container">
      <div className="controls">
        <button onClick={() => setViewMode("card")} className={viewMode === "card" ? "active" : ""}>Card View</button>
        <button onClick={() => setViewMode("table")} className={viewMode === "table" ? "active" : ""}>Table View</button>
        <button onClick={() => scanDevices()} disabled={scanning}>{scanning ? "Scanning..." : "Scan Network"}</button>
        <input type="text" placeholder="Search IP/MAC/Hostname..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <select value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
          <option value="">All Types</option>
          {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {viewMode === "card" ? (
        <div className="card-container">{filteredDevices.map(d => <DeviceCard key={d.ip} device={d} onClick={fetchDetails} />)}</div>
      ) : (
        <DeviceTable devices={filteredDevices} onRowClick={fetchDetails} onIpClick={fetchDetails} />
      )}

      <DeviceModal />
    </div>
  );
};

export default function App() {
  return (
    <DeviceProvider>
      <AppContent />
    </DeviceProvider>
  );
}
