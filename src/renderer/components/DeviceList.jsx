import React, { useEffect, useState } from "react";
import { useDeviceContext } from "../context/DeviceContext";
import { useDeviceFilter } from "../../hooks/useDeviceFilter";
import { useDeviceDetails } from "../../hooks/useDeviceDetails";
import { useDeviceScan } from "../../hooks/useDeviceScan";
import DeviceCard from "./DeviceCard";
import DeviceTable from "./DeviceTable";
import CredentialsModal from "./CredentialsModal";
import { Dropdown } from "react-bootstrap";

export default function DeviceList() {
  const { viewMode } = useDeviceContext();
  const filteredDevices = useDeviceFilter();
  const { fetchDetails } = useDeviceDetails();
  const { scanDevices } = useDeviceScan();
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  useEffect(() => {
    scanDevices({ useNmap: true }).catch(err => console.error("Initial scan failed:", err));
  }, [scanDevices]);

  const handleContextMenu = (device, event) => {
    setSelectedDevice(device);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
    setSelectedDevice(null);
  };

  const handleSetCredentials = () => {
    setShowCredentialsModal(true);
    handleCloseContextMenu();
  };

  const handleCredentialsSaved = () => {
    setShowCredentialsModal(false);
    // Optionally refresh device details if needed
  };

  return (
    <>
      {viewMode === "card" ? (
        <div className="card-container mt-3 row">
          {filteredDevices.map(d => (
            <DeviceCard
              key={d.ip}
              device={d}
              onClick={fetchDetails}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      ) : (
        <DeviceTable
          devices={filteredDevices}
          onRowClick={fetchDetails}
          onIpClick={fetchDetails}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <Dropdown.Menu
          show
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1050,
          }}
        >
          <Dropdown.Item onClick={handleSetCredentials}>
            Set Credentials
          </Dropdown.Item>
        </Dropdown.Menu>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1049,
          }}
          onClick={handleCloseContextMenu}
        />
      )}

      <CredentialsModal
        show={showCredentialsModal}
        onHide={() => setShowCredentialsModal(false)}
        device={selectedDevice}
        onSave={handleCredentialsSaved}
      />
    </>
  );
}
