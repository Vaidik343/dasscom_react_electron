import React from "react";
import { DeviceProvider } from "./renderer/context/DeviceContext";
import Controls from "./renderer/components/Controls";
import LogsPanel from "./renderer/components/LogsPanel";
import DeviceList from "./renderer/components/DeviceList";
import DeviceModal from "./renderer/components/DeviceModal";
import GlobalLoaderOverlay from './renderer/components/GlobalLoaderOverlay';
export default function App() {
  return (
    <DeviceProvider>
      <div className="app-container">
        <Controls />
        {/* <LogsPanel /> */}
        <DeviceList />
        <DeviceModal />
        <GlobalLoaderOverlay />
      </div>
    </DeviceProvider>
  );
}
