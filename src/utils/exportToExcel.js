const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

module.exports = async function exportToExcel(devices, filePath) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Network Scan");

  sheet.columns = [
    { header: "IP Address", key: "ip", width: 20 },
    { header: "MAC Address", key: "mac", width: 20 },
    { header: "Hostname", key: "hostname", width: 25 },
    { header: "Status", key: "status", width: 15 },
    { header: "Vendor", key: "vendor", width: 20 },
    { header: "Type", key: "type", width: 15 },
    { header: "Open Ports", key: "openPorts", width: 20 },
    { header: "Response Time", key: "responseTime", width: 20 }
  ];

  devices.forEach((device) => {
    sheet.addRow({
      ip: device.ip || "—",
      mac: device.mac || "—",
      hostname: device.hostname || "—",
      status: device.status || "—",
      vendor: device.vendor || "—",
      type: device.type || "—",
      openPorts: device.openPorts || "—",
      responseTime: device.responseTime || "—"
    });
  });

  // Check if file is locked
  function isFileLocked(filePath) {
    try {
      fs.openSync(filePath, "r+");
      return false;
    } catch (err) {
      return err.code === "EBUSY" || err.code === "EPERM";
    }
  }

  // If locked, fallback to timestamped filename
  if (isFileLocked(filePath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    filePath = path.join(dir, `${base} - ${timestamp}${ext}`);
  }

  await workbook.xlsx.writeFile(filePath);
  return filePath;
};
