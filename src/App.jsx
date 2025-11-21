import React from "react";
import { DeviceProvider, useDeviceContext } from "./renderer/context/DeviceContext";
import Controls from "./renderer/components/Controls";
import LogsPanel from "./renderer/components/LogsPanel";
import DeviceList from "./renderer/components/DeviceList";
import DeviceModal from "./renderer/components/DeviceModal";
import Loader from "./renderer/components/Loader";

function AppContent() {
  const { isLoading } = useDeviceContext();

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="app-container">
      <Controls />
      <LogsPanel />
      <DeviceList />
      <DeviceModal />
    </div>
  );
}

export default function App() {
  return (
    <DeviceProvider>
      <AppContent />
    </DeviceProvider>
  );
}
