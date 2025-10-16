import React from "react";
import "../style/DeviceModal.css";
import noApiData from "../../assets/icons/clipboard2-pulse-fill.svg";

import { useDeviceContext } from "../context/DeviceContext";

export default function DeviceModal() {
  const { selectedDevice, setSelectedDevice } = useDeviceContext();

  if (!selectedDevice) return null;

  const handleClose = () => setSelectedDevice(null);
  const device = selectedDevice;

  /**
   * Format data as readable text (matching renderer.js formatDataAsText)
   */
  const formatDataAsText = (obj) => {
    if (!obj || typeof obj !== "object") {
      return String(obj || "N/A");
    }

    // If obj is an array, format each item recursively
    if (Array.isArray(obj)) {
      return obj.map(item => formatDataAsText(item)).join("<br>");
    }

    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return "No data available";
    }

    // If the object has a key called "data" (case insensitive), format the value directly
    const dataEntry = entries.find(([key]) => key.toLowerCase() === "data");
    if (dataEntry && typeof dataEntry[1] === "object" && dataEntry[1] !== null) {
      return formatDataAsText(dataEntry[1]);
    }

    return entries
      .map(([key, value]) => {
        const displayKey = key
          .replace(/_/g, " ") // Replace underscores with spaces
          .replace(/([A-Z])/g, " $1") // Add space before uppercase letters
          .replace(/\b\w/g, (l) => l.toUpperCase()) // Capitalize first letter of each word
          .trim(); // Remove any leading/trailing spaces
        // If value is an object, recursively format it
        const displayValue =
          typeof value === "object" && value !== null
            ? formatDataAsText(value)
            : String(value || "N/A");
        return `<strong>${displayKey}:</strong> ${displayValue}`;
      })
      .join("<br>");
  };

  /**
   * Format API response into a card HTML (matching renderer.js formatApiResponse)
   */
  const formatApiResponse = (result, title, icon) => {
    if (result.status === "rejected" || result.value?.error) {
      return (
        <div className="col-md-6 mb-3" key={title}>
          <div className="card h-100 border-danger">
            <div className="card-header bg-danger text-white">
              <h6 className="mb-0">{icon} {title}</h6>
            </div>
            <div className="card-body">
              <div className="alert alert-danger mb-0">
                <strong>❌ Failed:</strong> {result.value?.error || result.reason?.message || "Unknown error"}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const data = result.value;
    const formattedData = formatDataAsText(data);

    return (
      <div className="col-md-6 mb-3" key={title}>
        <div className="card h-100 api-data-card">
          <div className="card-header api-data-header">
            <h6 className="mb-0">{icon} {title}</h6>
          </div>
          <div className="card-body">
            <div
              className="api-data-content"
              style={{ fontSize: "14px", lineHeight: "1.5", maxHeight: "200px", overflowY: "auto" }}
              dangerouslySetInnerHTML={{ __html: formattedData }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderAdvancedData = (data) => {
    if (!data || Object.keys(data).length === 0) {
      return <p className="text-center">
         <img
                      src={noApiData}
                      alt="redirect icon"
                      style={{
                        width: 17,
                        height: 15,
                        marginLeft: 5,
                        verticalAlign: "middle",
                      }}
                    />
        
        No API data available</p>;
    }

    // Dynamically render whatever API data is available
    return Object.entries(data).map(([key, value]) => {
      // Generate icon and display name based on the key
      const iconMap = {
        systemInfo: "💻",
        svnVersion: "🏷️",
        ipAddress: "🌐",
        accountInfo: "👤",
        dns: "🔗",
        gateway: "🚪",
        netmask: "🔒",
        accountStatus: "📊",
        callStatus: "📞",
        allAccountInformation: "📋",
        temperature: "🌡️",
        // Speaker-specific APIs
        systemInfo: "💻",
        volumePriority: "🔊",
        provisioning: "⚙️",
        sipSlave1Info: "📞",
        sipSlave2Info: "📞",
        sipFunctionInfo: "🔧",
        sipMasterInfo: "👑",
        sipAdvanceInfo: "⚡",
        sipApi: "📡",
        language: "🗣️",
        audioCodec: "🔈",
        // PBX-specific APIs
        systemTime: "🕒",
        version: "🏷️",
        cpu: "⚙️",
        memory: "🧠",
        disk: "💾",
        calls: "📞",
        extensionStatus: "👥",
        trunkInfo: "🌐",
        extensions: "📋",
        extensionInfo: "👤"
      };

      // Generate display name from key
      const displayName = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .replace(/_/g, " ");

      const icon = iconMap[key] || "📊";

      // Create a mock result object for successful data
      const mockResult = { status: "fulfilled", value: value };
      return formatApiResponse(mockResult, displayName, icon);
    });
  };

  const handleRestart = () => {
    if (window.confirm(`⚠️ WARNING: Restart Device\n\nAre you sure you want to restart the device at ${device.ip}?\n\nThis will temporarily disconnect the device from the network.`)) {
      // Implement restart logic here
      console.log("Restarting device:", device.ip);
    }
  };

  const handleReset = () => {
    if (window.confirm(`🚨 DANGER: Reset Device\n\nAre you sure you want to RESET the device at ${device.ip}?\n\n⚠️ WARNING: This will restore the device to factory settings and may cause data loss!`)) {
      const secondConfirm = window.confirm(`🔴 FINAL CONFIRMATION\n\nYou are about to RESET device ${device.ip} to factory settings.\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?`);
      if (secondConfirm) {
        // Implement reset logic here
        console.log("Resetting device:", device.ip);
      }
    }
  };

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content" id="deviceModal">
          <div className="modal-header">
            <h5 className="modal-title ">Device Details - {device.ip}</h5>
            <button
              type="button"
              className="btn-close "
              onClick={handleClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body overflow-auto" id="deviceModalBody">
            <div className="row">
              <div className="col-md-12 mb-3">
                <h4 className="text-center text-dark">{device.ip}</h4>
                <hr />
              </div>

              {/* Basic Information */}
              <div className="col-md-12 mb-4">
                <div className="card">
                  <div className="card-header text-white">
                    <h5 className="mb-0 text-dark" >📋 Basic Information</h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <p><strong>Status:</strong> <span className={`badge ${device.online ? "bg-success" : "bg-danger"}`}>{device.online ? "Online" : "Offline"}</span></p>
                        <p><strong>Hostname:</strong> {device.hostname || "Unknown"}</p>
                        <p><strong>Vendor:</strong> {device.vendor || "Unknown"}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Type:</strong> {device.type || "Unknown"}</p>
                        <p><strong>MAC Address:</strong> {device.mac || "Unknown"}</p>
                        <p><strong>Response Time:</strong> {device.responseTime || "Unknown"} ms</p>
                        <p><strong>Open Ports:</strong> {device.openPorts?.join(", ") || "None"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* API Data Section */}
              <div className="col-md-12">
                <h5 className="text-center mb-3">Advanced Data</h5>
                <div className="row">
                  {renderAdvancedData(device.info)}
                </div>
              </div>

              {/* Action Buttons - Only for IP Phone devices */}
              {/* {device.type === "IP Phone" && (
                <div className="col-md-12 mt-4">
                  <h5 className="text-center mb-3">Device Actions</h5>
                  <div className="row justify-content-center">
                    <div className="col-md-4 mb-3">
                      <button
                        className="btn btn-warning btn-lg w-100"
                        onClick={handleRestart}
                      >
                        <i className="fas fa-redo"></i> Restart Device
                      </button>
                    </div>
                    <div className="col-md-4 mb-3">
                      <button
                        className="btn btn-danger btn-lg w-100"
                        onClick={handleReset}
                      >
                        <i className="fas fa-power-off"></i> Reset Device
                      </button>
                    </div>
                  </div>
                </div>
              )} */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
