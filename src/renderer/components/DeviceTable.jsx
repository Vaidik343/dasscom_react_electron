import React from "react";

export default function DeviceTable({ devices, onRowClick, onIpClick }) {
  return (
    <div className="table-responsive" id="table-container">
      <table className="table table-bordered table-hover align-middle">
        <thead>
          <tr>
            <th>IP Address</th>
            <th>MAC Address</th>
            <th>Type</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
