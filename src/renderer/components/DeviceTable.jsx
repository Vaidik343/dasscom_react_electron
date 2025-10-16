import React from "react";
import "../style/DeviceTable.css";

export default function DeviceTable({ devices, onRowClick, onIpClick }) {
  return (
    <div className="table-responsive" id="table-container">
      <table className="table table-bordered table-hover align-middle">
        <thead>
          <tr>
            <th>IP Address</th>
            <th>MAC Address</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.ip} onClick={() => onRowClick(device)}>
              <td
                className="ip-cell"
                onClick={(e) => {
                  e.stopPropagation();
                  onIpClick(device);
                }}
              >
                {device.ip}
              </td>
              <td>{device.mac || "Unknown"}</td>
              <td>{device.type || "Unknown"}</td>
              <td>
                <span
                  style={{
                    color: device.online ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}
                >
                  {device.online ? 'Online' : 'Offline'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
