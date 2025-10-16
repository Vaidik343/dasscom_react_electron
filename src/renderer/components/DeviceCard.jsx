import React from "react";
import webViewArrow from "../../assets/icons/arrow-up-right-from-square-solid-full.svg";
import "bootstrap/dist/css/bootstrap.min.css";
import '../style/DeviceCard.css'
export default function DeviceCard({ device, onClick, onContextMenu }) {
  const onlineStatus = device.online ? "online" : "offline";
  const borderColor = device.online ? "#28a745" : "#dc3545"; // Green for online, red for offline

  return (

    <div className="DeviceCard col-3 mb-4">
      <div
        className="card shadow-sm border-0"
        style={{
          borderRadius: "12px",
          cursor: "pointer",
          border: `2px solid ${borderColor}`,
          position: "relative"
        }}
        onClick={() => onClick(device)}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu && onContextMenu(device, e);
        }}
      >
        <div
          className="online-indicator"
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: device.online ? "#28a745" : "#dc3545",
            border: "2px solid white"
          }}
          title={onlineStatus}
        ></div>
        <div className="card-body cardDesign">
          <h6
            className="card-title  mb-1"
            title="Fetch device details"
            onClick={(e) => {
              e.stopPropagation();
              onClick(device);
            }}
            style={{ cursor: "pointer" , color:"#0c5460" }}
          >
            <strong>IP:</strong> {device.ip}
          </h6>

          <p className="card-text mb-1">
            <strong style={{  color:"#0c5460" }}>MAC: </strong> {device.mac || "Unknown"}
                
          </p>
          <p className="card-text mb-1">
            <strong   style={{  color:"#0c5460" }}>Type:</strong> {device.type || "Unknown"}
              
          </p>
              <hr />
          <p
            className="mt-3 mb-0"
            style={{
              color: "#31ae5f",
              fontWeight: 500,
              fontSize: "14px",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(`http://${device.ip}`, "_blank");
            }}
          >
            <strong>Web view:</strong>
            <img
              src={webViewArrow}
              alt="redirect icon"
              style={{
                width: 12,
                height: 12,
                marginLeft: 5,
                verticalAlign: "middle",
              }}
            />
          </p>
        </div>
      </div>
    </div>
  );
}
