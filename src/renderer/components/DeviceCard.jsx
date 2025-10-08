import React from "react";
import webViewArrow from '../../assets/icons/arrow-up-right-from-square-solid-full.svg';


import '../style/DeviceCard.css'
export default function DeviceCard({ device, onClick }) {
  return (
    <div className=" col-4 ">
      <div className="e-card playing " onClick={() => onClick(device)}>
         {/* <div class="image"></div> */}
        <div className="wave"></div>
        <div className="wave"></div>
        <div className="wave"></div>
        <div className="infotop">
          <p
            className="ip-cell text-primary mb-2 cardText"
            style={{ cursor: "pointer" }}
            title="Fetch device details"
            onClick={(e) => {
              e.stopPropagation();
              onClick(device);
            }}
          >
            <strong>IP:</strong> {device.ip}
          </p>
          <p>
            <strong>MAC:</strong> {device.mac || "Unknown"}
          </p>
          <p>
            <strong>Type:</strong> {device.type || "Unknown"}
          </p>
          <p
            className="redirect-text"
            style={{ cursor: "pointer", fontSize: 14, color: "#fff" }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(`http://${device.ip}`, "_blank");
            }}
          >
            <strong>Web view:</strong>
            <img
              src={webViewArrow}
              alt="redirect icon"
              style={{ width: 12, height: 12, marginLeft: 5, verticalAlign: "middle" }}
            />
          </p>
        </div>
      </div>
    </div>
  );
}
