# PBX Endpoints Integration

## Steps to Complete

- [x] Add PBX API functions in src/api/dasscomClient.js (pbxLogin, pbxApi)
- [x] Add IPC handlers in src/main/main.js for PBX login and API calls
- [x] Expose PBX methods in src/preload/preload.js
- [x] Update src/hooks/useDeviceDetails.js to detect PBX devices and fetch data
- [x] Test PBX login and common endpoints (integrated into modal display)
- [x] Test device-specific endpoints based on model (integrated into modal display)
