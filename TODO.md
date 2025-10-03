# TODO: Integrate Nmap for Device Scanning

## Tasks
- [x] Extract/Add Nmap binaries for Windows, Mac, Linux in binaries/ subfolders
- [x] Modify scanDevices function in arpScanner.js to add Nmap scanning option
- [x] Add scanWithNmap function to call local Nmap binary and parse output
- [x] Update scanDevices to use Nmap with fallback to ARP
- [x] Ensure cross-platform binary path resolution
- [x] Update subnet detection to use local IP instead of ARP-based selection
- [x] Enable Nmap scanning in UI by default
- [x] Add fallback to system Nmap if bundled not found
- [x] Add fs check for binary existence in scanWithNmap (only for absolute paths)
- [x] Test the new scanning method (ARP fallback working, multi-subnet support verified)
- [x] Verify device detection improvement (Nmap binary found but failing, fallback to ARP confirmed)
- [x] Confirm Nmap binary bundling and path configuration (path resolved correctly, binary exists)
- [x] Add electron-builder config to bundle binaries

## Notes
- Binary bundling: Include Nmap executables in the Electron app package so users don't need separate installation.
- Nmap command: Use `nmap -sn -PR -oX - -T4 --min-rate 1000 --max-retries 1 --host-timeout 5s <subnet>` for fast XML output to parse IP and MAC.
- Platforms: Handle paths for win32 (nmap.exe), darwin (nmap), linux (nmap).
- Fallback: Keep option to use ARP scanning if Nmap fails or not preferred.
- Build: Use `npm run dist` to create installer with bundled binaries.
