# TODO: Add Online/Offline Status to Devices

## Pending Tasks
- [x] Add checkOnlineStatus function in src/main/arpScanner.js to ping each device and set online status.
- [x] Update enrichDevice in src/utils/deviceUtils.js to include online field.
- [x] Modify src/renderer/components/DeviceCard.jsx to show online/offline indicator (e.g., colored border or icon).
- [x] Modify src/renderer/components/DeviceTable.jsx to show online status in a new column or via styling.
- [x] Test on Windows (ping command syntax) and ensure cross-platform compatibility.
- [x] Handle ping timeouts and errors gracefully.
- [x] Update UI to filter or highlight offline devices if needed.
