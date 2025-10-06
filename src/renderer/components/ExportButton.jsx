import React from "react";
import { useDeviceContext } from "../context/DeviceContext";

export default function ExportButton() {
  const { devices } = useDeviceContext();

  const handleExport = async () => {
    if (!devices || devices.length === 0) {
      alert("⚠️ No devices found to export!");
      return;
    }

    try {
      const result = await window.api.exportToExcel(devices);
      if (result.success) {
        alert(`✅ Exported successfully to:\n${result.path}`);
      } else if (result.error !== "User cancelled") {
        alert(`❌ Export failed: ${result.error}`);
      }
    } catch (err) {
      console.error("Export error:", err);
      alert(`❌ Error exporting file: ${err.message}`);
    }
  };

  return (
    <button onClick={handleExport} className="btn btn-success">
      📤 Export to Excel
    </button>
  );
}
