import React, { useEffect, useState } from "react";
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
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(true); // Always show logs for debugging
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    // initial scan on mount
    scanDevices({ useNmap: true }).catch(err => console.error("Initial scan failed:", err));
  }, [scanDevices]);

  useEffect(() => {
    // Listen for console logs and load errors from main process
    if (window.api && window.api.receive) {
      window.api.receive("console-log", (message) => {
        setLogs(prev => [...prev, message]);
      });
      window.api.receive("load-error", (error) => {
        setLoadError(error);
        setLogs(prev => [...prev, `Load Error: ${error.errorDescription} (${error.errorCode}) for ${error.validatedURL}`]);
      });
    }
  }, []);

  const uniqueTypes = Array.from(new Set(devices.map(d => (d.type || "unknown").toLowerCase()))).sort();

  return (
    <div className="app-container ">
      <div className="controls d-flex p-2 mx-4 gap-4 ">
         <input type="text" placeholder="Search IP/MAC/Hostname..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <select value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
          <option value="">All Types</option>
          {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => setViewMode("card")} className={viewMode === "card" ? "active" : ""}>Card View</button>
        <button onClick={() => setViewMode("table")} className={viewMode === "table" ? "active" : ""}>Table View</button>
        <button onClick={() => scanDevices({ useNmap: true })} disabled={scanning}>{scanning ? "Scanning..." : "Quick Scan"}</button>
        <button onClick={() => scanDevices({ useNmap: true, debugMode: true })} disabled={scanning}>{scanning ? "Scanning..." : "Debug Scan (All Devices)"}</button>
        <button onClick={() => scanDevices({ useNmap: false, fallbackToArp: true })} disabled={scanning}>{scanning ? "Scanning..." : "ARP Scan Only"}</button>
        <button onClick={() => setShowLogs(!showLogs)}>{showLogs ? "Hide Logs" : "Show Logs"}</button>
      </div>

      {showLogs && (
        <div style={{ backgroundColor: "#f0f0f0", padding: "10px", margin: "10px", borderRadius: "5px", maxHeight: "200px", overflowY: "auto" }}>
          <strong>Logs:</strong>
          <pre style={{ fontSize: "12px", margin: "5px 0" }}>
            {logs.slice(-50).join('\n')}
          </pre>
        </div>
      )}

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
