# TODO: Change Vite Dev Server Port to 4001

- [x] Update vite.config.js to set server.port: 4001
- [x] Update src/main/main.js to loadURL("http://localhost:4001")
- [x] Update package.json "electron-dev" script to wait-on http://localhost:4001
- [x] Update CSP in index.html to allow http://localhost:4001
- [x] Update CSP in renderer/index.html to allow http://localhost:4001
