import React from "react";
import "../style/DeviceModal.css";
import { useDeviceContext } from "../context/DeviceContext";


export default function DeviceModal() {
  const { selectedDevice, setSelectedDevice } = useDeviceContext();

  if (!selectedDevice) return null;

  const handleClose = () => setSelectedDevice(null);

  const formData = (data) => {
    if (!data) return <p>No data</p>;
    return <pre>{JSON.stringify(data, null, 2)}</pre>;
  };

  return (
    <div className="dasscom-modal-overlay">
      <div className="dasscom-modal">
        <button className="dasscom-close-btn" onClick={handleClose}>Close</button>
        <h3>Device: {selectedDevice.ip}</h3>
        {formData(selectedDevice)}
      </div>
    </div>
  );
}
