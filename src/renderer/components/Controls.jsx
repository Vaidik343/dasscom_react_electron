import React, { useState } from "react";
import { useDeviceContext } from "../context/DeviceContext";
import { useDeviceScan } from "../../hooks/useDeviceScan";
import ExportButton from "./ExportButton";
import CredentialsManager from "./CredentialsManager";
export default function Controls() {
  const {
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    deviceType, setDeviceType,
    devices
  } = useDeviceContext();

  const { scanDevices, loading: scanning } = useDeviceScan();
  const [showCredentialsManager, setShowCredentialsManager] = useState(false);

  
  const uniqueTypes = Array.from(new Set(devices.map(d => (d.type || "unknown").toLowerCase()))).sort();
 const handleExport = async () => {
    if (!devices || devices.length === 0) {
      alert("No devices to export.");
      return;
    }

    // Default export path (Documents folder)
    const defaultPath = "C:\\Users\\Public\\Network Scan.xlsx";

    try {
      const result = await window.api.exportToExcel(devices, defaultPath);
      if (result.success) {
        alert(`✅ Exported successfully to:\n${result.path}`);
      } else {
        alert(`❌ Export failed: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
      alert(`❌ Error exporting file: ${err.message}`);
    }
  };

  return (
    <>
      <div className="controls d-flex p-2 mx-4 gap-4">
        <input
          type="text"

          placeholder="Search IP/MAC/Hostname..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select  className=""  value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
          <option value="">All Types</option>
          {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <button onClick={() => setViewMode("card")} className={viewMode === "card " ? "active " : ""} >Card View</button>
        <button onClick={() => setViewMode("table")} className={viewMode === "table" ? "active" : ""}>Table View</button>

        <button onClick={() => scanDevices({ useNmap: true })} disabled={scanning}>
          {scanning ? "Scanning..." : "Quick Scan"}
        </button>

        <button onClick={() => setShowCredentialsManager(true)}>
          Manage Credentials
        </button>

        <ExportButton />
      </div>

      <CredentialsManager
        show={showCredentialsManager}
        onHide={() => setShowCredentialsManager(false)}
      />
    </>
  );
}
