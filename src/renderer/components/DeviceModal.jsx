import React from "react";
import "../style/DeviceModal.css";
import { useDeviceContext } from "../context/DeviceContext";


export default function DeviceModal() {
  const { selectedDevice, setSelectedDevice } = useDeviceContext();

  if (!selectedDevice) return null;

  const handleClose = () => setSelectedDevice(null);

  const formData = (data) => {
    if (!data || Object.keys(data).length === 0) return <p>No data</p>;
    return Object.entries(data).map(([key, value]) => (
      <div key={key} style={{ marginBottom: '20px' }}>
        <h4 style={{ color: '#ffffff', marginBottom: '10px' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h4>
        <pre style={{ backgroundColor: '#2a2a40', padding: '10px', borderRadius: '8px', color: '#ffffff', overflowX: 'auto' }}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    ));
  };

  return (
    <div className="dasscom-modal-overlay">
      <div className="dasscom-modal">
        <button className="dasscom-close-btn" onClick={handleClose}>Close</button>
        <h3>Device: {selectedDevice.ip}</h3>
        {formData(selectedDevice.info)}
      </div>
    </div>
  );
}
