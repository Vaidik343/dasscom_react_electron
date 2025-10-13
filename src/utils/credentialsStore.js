const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { safeStorage } = require('electron');

// Get user data path for storing credentials
const userDataPath = app.getPath('userData');
const credentialsFile = path.join(userDataPath, 'device-credentials.json');

// Initialize store
let store = {};

// Load existing credentials
function loadStore() {
  try {
    if (fs.existsSync(credentialsFile)) {
      const data = fs.readFileSync(credentialsFile, 'utf8');
      store = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading credentials store:', error);
    store = {};
  }
}

// Save store to file
function saveStore() {
  try {
    fs.writeFileSync(credentialsFile, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Error saving credentials store:', error);
  }
}

// Initialize
loadStore();

/**
 * Encrypt and store credentials for a device
 * @param {string} ip - Device IP address
 * @param {string} username - Username
 * @param {string} password - Password
 */
function setCredentials(ip, username, password) {
  try {
    const credentials = {
      username,
      password: safeStorage.encryptString(password).toString('hex'), // Encrypt password
      lastUpdated: new Date().toISOString()
    };

    if (!store.credentials) store.credentials = {};
    store.credentials[ip] = credentials;
    saveStore();
    console.log(`Credentials stored for ${ip}`);
    return { success: true };
  } catch (error) {
    console.error('Error storing credentials:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve and decrypt credentials for a device
 * @param {string} ip - Device IP address
 * @returns {Object|null} - {username, password} or null if not found
 */
function getCredentials(ip) {
  try {
    if (!store.credentials || !store.credentials[ip]) return null;

    const stored = store.credentials[ip];

    // Decrypt password
    const passwordBuffer = Buffer.from(stored.password, 'hex');
    const decryptedPassword = safeStorage.decryptString(passwordBuffer);

    return {
      username: stored.username,
      password: decryptedPassword,
      lastUpdated: stored.lastUpdated
    };
  } catch (error) {
    console.error('Error retrieving credentials:', error);
    return null;
  }
}

/**
 * Get all stored credentials
 * @returns {Object} - All credentials keyed by IP
 */
function getAllCredentials() {
  try {
    const all = store.credentials || {};
    const decrypted = {};

    for (const [ip, creds] of Object.entries(all)) {
      try {
        const passwordBuffer = Buffer.from(creds.password, 'hex');
        const decryptedPassword = safeStorage.decryptString(passwordBuffer);

        decrypted[ip] = {
          username: creds.username,
          password: decryptedPassword,
          lastUpdated: creds.lastUpdated
        };
      } catch (decryptError) {
        console.warn(`Failed to decrypt credentials for ${ip}:`, decryptError.message);
        // Keep encrypted version as fallback
        decrypted[ip] = creds;
      }
    }

    return decrypted;
  } catch (error) {
    console.error('Error retrieving all credentials:', error);
    return {};
  }
}

/**
 * Remove credentials for a device
 * @param {string} ip - Device IP address
 */
function removeCredentials(ip) {
  try {
    if (store.credentials && store.credentials[ip]) {
      delete store.credentials[ip];
      saveStore();
      console.log(`Credentials removed for ${ip}`);
      return { success: true };
    }
    return { success: false, error: 'Credentials not found' };
  } catch (error) {
    console.error('Error removing credentials:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if credentials exist for a device
 * @param {string} ip - Device IP address
 * @returns {boolean}
 */
function hasCredentials(ip) {
  return !!(store.credentials && store.credentials[ip]);
}

module.exports = {
  setCredentials,
  getCredentials,
  getAllCredentials,
  removeCredentials,
  hasCredentials
};
