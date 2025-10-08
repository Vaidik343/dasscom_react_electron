import React, { useEffect } from "react";
import { useDeviceContext } from "../context/DeviceContext";
import { useDeviceFilter } from "../../hooks/useDeviceFilter";
import { useDeviceDetails } from "../../hooks/useDeviceDetails";
import { useDeviceScan } from "../../hooks/useDeviceScan";
import DeviceCard from "./DeviceCard";
import DeviceTable from "./DeviceTable";

export default function DeviceList() {
  const { viewMode } = useDeviceContext();
  const filteredDevices = useDeviceFilter();
  const { fetchDetails } = useDeviceDetails();
  const { scanDevices } = useDeviceScan();

  useEffect(() => {
    scanDevices({ useNmap: true }).catch(err => console.error("Initial scan failed:", err));
  }, [scanDevices]);

  return (
    <>
      {viewMode === "card" ? (
        <div className="card-container d-flex flex-wrap col">
          {filteredDevices.map(d => (
            <DeviceCard key={d.ip} device={d} onClick={fetchDetails} />
          ))}
        </div>
      ) : (
        <DeviceTable
          devices={filteredDevices}
          onRowClick={fetchDetails}
          onIpClick={fetchDetails}
        />
      )}
    </>
  );
}
