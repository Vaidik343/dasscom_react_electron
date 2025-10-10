# TODO: Add Device Type Logging

- [x] Modify `detectDeviceTypeDynamic` in `src/utils/deviceUtils.js` to add console.log for each detected device type
  - [x] Add logging for NMAP-based detections (Camera, IP Phone, Speaker, etc.)
  - [x] Add logging for vendor mapping fallback
  - [x] Add logging for API login detections (Speaker and IP Phone)
  - [x] Add logging for Unknown type
- [x] Test logging in development environment by running a device scan
- [x] Test logging in packaged app environment
- [x] Verify logs show correct format: "Detected [Device Type] for [IP] ([MAC])"
- [x] Fix NMAP command to work without Npcap by changing -sS to -sT, removing -O and upnp-info script
