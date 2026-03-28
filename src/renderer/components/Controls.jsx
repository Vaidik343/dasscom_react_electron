import React, { useState, useEffect } from "react";
import { useDeviceContext } from "../context/DeviceContext";
import { useDeviceScan } from "../../hooks/useDeviceScan";
import ExportButton from "./ExportButton";
import CredentialsManager from "./CredentialsManager";
import CloudDeviceModal from "./CloudDeviceModal";

export default function Controls() {
  const {
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    deviceType, setDeviceType,
    devices
  } = useDeviceContext();

  const { scanDevices, loading: scanning } = useDeviceScan();
  const [showCredentialsManager, setShowCredentialsManager] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);

  // ── Scan Mode State: 'enterprise' (Nmap) | 'lite' (Native Node.js) ──
  const [scanMode, setScanMode] = useState("enterprise");

  // ── Listen for Scan Mode changes from the Native Menu ──
  useEffect(() => {
    if (window.api && window.api.onUpdateScanMode) {
      window.api.onUpdateScanMode((newMode) => {
        console.log(`📡 Scan Mode updated from Native Menu: ${newMode}`);
        setScanMode(newMode);
      });
    }
  }, []);

  const uniqueTypes = Array.from(new Set(devices.map(d => (d.type || "unknown").toLowerCase()))).sort();

  const handleScan = () => {
    scanDevices({ useNmap: scanMode === "enterprise" }, scanMode);
  };

  const handleExport = async () => {
    if (!devices || devices.length === 0) {
      alert("No devices to export.");
      return;
    }
    try {
      const result = await window.api.exportToExcel(devices);
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

  // ── Theme colour based on mode ──
  const isEnterprise = scanMode === "enterprise";
  const modeColor = isEnterprise ? "#0d6efd" : "#198754";

  return (
    <>
      {/* ── Main Controls Bar ── */}
      <div className="controls d-flex p-2 mx-4 gap-4" style={{ alignItems: "center" }}>

        {/* Search */}
        <div className="position-relative" style={{ width: "35%" }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search IP/MAC/Hostname..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary position-absolute top-50 end-0 translate-middle-y me-1"
              onClick={() => setSearchQuery("")}
              style={{ zIndex: 2 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Device Type Filter */}
        <div className="selectDevice" style={{ width: "10%" }}>
          <select className="form-select" value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
            <option value="">All Types</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* View Mode Buttons */}
        <button
          onClick={() => setViewMode("card")}
          className={`btn btn-outline-success ${viewMode === "card" ? "active" : ""}`}
        >
          Card
        </button>
        <button
          onClick={() => setViewMode("table")}
          className={`btn btn-outline-success ${viewMode === "table" ? "active" : ""}`}
        >
          Table
        </button>

        {/* ── Main Scan Button (changes colour by active mode) ── */}
        <button
          id="btn-scan-network"
          onClick={handleScan}
          disabled={scanning}
          style={{
            backgroundColor: scanning ? "#9ca3af" : modeColor,
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "0.5em 1.4em",
            fontWeight: 600,
            cursor: scanning ? "not-allowed" : "pointer",
            transition: "background-color 0.3s",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {scanning
            ? "⏳ Scanning..."
            : `Scan Network`}
        </button>

        {/* Credentials */}
        <button
          onClick={() => setShowCredentialsManager(true)}
          className="btn btn-primary"
        >
          Manage Credentials
        </button>

        {/* Cloud Connect */}
        {/* <button
          onClick={() => setShowCloudModal(true)}
          className="btn btn-info text-white"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          ☁️ Connect Cloud
        </button> */}

        <ExportButton />
      </div>

      <CredentialsManager
        show={showCredentialsManager}
        onHide={() => setShowCredentialsManager(false)}
      />

      <CloudDeviceModal
        show={showCloudModal}
        onHide={() => setShowCloudModal(false)}
      />
    </>
  );
}

