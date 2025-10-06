import React, { useEffect, useState } from "react";
import { useDeviceScan } from "../../hooks/useDeviceScan";
export default function LogsPanel() {
  const [logs, setLogs] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [showLogs, setShowLogs] = useState(true);
const { scanDevices, loading: scanning } = useDeviceScan();
  useEffect(() => {
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

  return ( 
    <>
      <div className="text-end px-4">
        <button onClick={() => setShowLogs(!showLogs)}>
          {showLogs ? "Hide Logs" : "Show Logs"}
        </button>
                <button onClick={() => scanDevices({ useNmap: true })} disabled={scanning}>
        {scanning ? "Scanning..." : "Quick Scan"}
      </button>
      <button onClick={() => scanDevices({ useNmap: true, debugMode: true })} disabled={scanning}>
        {scanning ? "Scanning..." : "Debug Scan (All Devices)"}
      </button>
      <button onClick={() => scanDevices({ useNmap: false, fallbackToArp: true })} disabled={scanning}>
        {scanning ? "Scanning..." : "ARP Scan Only"}
      </button>
      </div>

      {showLogs && (
        <div
          style={{
            backgroundColor: "#f0f0f0",
            padding: "10px",
            margin: "10px",
            borderRadius: "5px",
            maxHeight: "200px",
            overflowY: "auto"
          }}
        >
          <strong>Logs:</strong>
          <pre style={{ fontSize: "12px", margin: "5px 0" }}>
            {logs.slice(-50).join('\n')}
          </pre>
          {loadError && (
            <p style={{ color: "red" }}>Load error: {loadError.errorDescription}</p>
          )}


    
        </div>
      )}
    </>
  );
}
