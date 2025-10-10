import React, { useEffect, useState } from "react";
import { useDeviceScan } from "../../hooks/useDeviceScan";

export default function LogsPanel() {
  const [logs, setLogs] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [showLogs, setShowLogs] = useState(true);
  const { scanDevices, loading: scanning } = useDeviceScan();

  useEffect(() => {
    // Override console methods to capture renderer logs
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (level, ...args) => {
      const timestamp = new Date().toLocaleTimeString();
      const message = `[${timestamp}] ${level}: ${args.join(' ')}`;
      setLogs(prev => {
        const newLogs = [...prev, message];
        return newLogs.slice(-100); // Keep last 100 logs
      });
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('LOG', ...args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('WARN', ...args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('ERROR', ...args);
    };

    // IPC listeners with timestamps
    if (window.api && window.api.receive) {
      window.api.receive("console-log", (message) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] MAIN: ${message}`].slice(-100));
      });
      window.api.receive("load-error", (error) => {
        setLoadError(error);
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] LOAD ERROR: ${error.errorDescription} (${error.errorCode}) for ${error.validatedURL}`].slice(-100));
      });
    }

    // Cleanup on unmount
    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  return (
    <>
      <div className="text-end px-4">
        <button onClick={() => setShowLogs(!showLogs)}>
          {showLogs ? "Hide Logs" : "Show Logs"}
        </button>
        <button onClick={() => setLogs([])}>Clear Logs</button>
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
            backgroundColor: "black",
            color: "white",
            padding: "10px",
            margin: "10px",
            borderRadius: "5px",
            maxHeight: "400px",
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "12px"
          }}
        >
          <strong>Logs:</strong>
          <pre style={{ margin: "5px 0", whiteSpace: "pre-wrap" }}>
            {logs.join('\n')}
          </pre>
          {loadError && (
            <p style={{ color: "red" }}>Load error: {loadError.errorDescription}</p>
          )}
        </div>
      )}
    </>
  );
}
