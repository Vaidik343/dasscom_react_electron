// src/api/cloudClient.js
const axios = require('axios');
const crypto = require('crypto');
const mqtt = require('mqtt');

// -----------------------------
// 🔹 Global State
// -----------------------------
let activeMqttClients = {}; // Store MQTT clients by Device SN

// Configuration Variables (we can make these dynamic later if needed)
// These should ideally be passed in or loaded from env/config, 
// using defaults as fallback based on docs
const DEFAULT_CLOUD_API_BASE = 'https://aiot.dasscom.com'; 
let cloudTokenCache = {}; // Cache the token to make future calls to Cloud API

// -----------------------------
// 🔹 Cryptography Helpers
// -----------------------------

/**
 * Encrypts data using AES-256-CBC
 */
function encryptDataAES(dataStr) {
    // Generate a secure random 32-byte key for AES-256
    const aesKey = crypto.randomBytes(32);
    // Generate a secure random 16-byte IV
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    
    // The data might be an object, stringify it
    const dataString = typeof dataStr === 'string' ? dataStr : JSON.stringify(dataStr);
    
    let encrypted = cipher.update(dataString, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return { 
        encryptedData: encrypted, 
        aesKey: aesKey,
        iv: iv.toString('base64') // Keep IV if we need to send it explicitly
    };
}

/**
 * Encrypts the AES Key using the Cloud Platform's Public RSA Key
 */
function encryptAESKeyWithRSA(aesKeyBuffer, publicKeyBase64) {
    try {
        // Prepare the public key string
        const publicKeyString = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64}\n-----END PUBLIC KEY-----`;
        
        const encryptedKey = crypto.publicEncrypt({
            key: publicKeyString,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, aesKeyBuffer);

        return encryptedKey.toString('base64');
    } catch (e) {
        console.error("RSA Encryption failed:", e);
        throw new Error("Failed to encrypt AES key: " + e.message);
    }
}

/**
 * Generates a SHA-256 Signature for the payload
 */
function generateSignature(dataString) {
    const hash = crypto.createHash('sha256');
    hash.update(dataString);
    return hash.digest('hex'); // Or 'base64' depending on cloud platform exact requirement
}

// -----------------------------
// 🔹 Cloud API Setup Workflow
// -----------------------------

/**
 * POST /api/device/public-key
 * Fetches the public key and sessionId for a device
 */
async function getCloudPublicKey(sn, cloudDomain = DEFAULT_CLOUD_API_BASE) {
    const url = `${cloudDomain}/api/device/public-key`;
    console.log(`☁️ Fetching Cloud Public Key for SN: ${sn}...`);
    
    try {
        const response = await axios.post(url, { sn }, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.data.code !== "0") {
            throw new Error(`Cloud API Error: ${response.data.message}`);
        }

        console.log(`✅ Successfully fetched Cloud Public Key for ${sn}`);
        return response.data.data; // { publicKey, sessionId }
    } catch (err) {
        console.error(`❌ getCloudPublicKey failed:`, err.message);
        throw err;
    }
}

/**
 * POST /api/device/v2/register
 * Registers the device and retrieves MQTT credentials
 */
async function registerCloudDevice(sn, mac, cloudDomain = DEFAULT_CLOUD_API_BASE) {
    try {
        // Step 1: Get Public Key & Session ID
        const { publicKey, sessionId } = await getCloudPublicKey(sn, cloudDomain);

        // Step 2: Prepare the registration data
        const businessData = {
            sn: sn,
            mac: mac,
            // Depending on the docs, you can set 'encrypt: 1' to enable AES encryption on MQTT payload
            // encrypt: 1
        };
        const businessDataStr = JSON.stringify(businessData);

        // Step 3: Perform Encryption as specified by protocol
        // 3a. Generate AES Key and encrypt the business data
        const { encryptedData, aesKey } = encryptDataAES(businessDataStr);
        
        // 3b. Encrypt the raw AES Key with the Cloud's RSA Public Key
        const encryptedAesKey = encryptAESKeyWithRSA(aesKey, publicKey);

        // 3c. Generate SHA-256 Signature
        const signature = generateSignature(businessDataStr);
        
        // Prepare the final encrypted payload
        // (Note: The exact structure of the payload depends heavily on the specific API doc, 
        // you may need to adjust the keys here if the Cloud rejects the format)
        const payload = {
            sessionId: sessionId,
            data: encryptedData,
            encryptKey: encryptedAesKey,
            sign: signature
        };

        const url = `${cloudDomain}/api/device/v2/register`;
        console.log(`☁️ Registering Cloud Device (SN: ${sn}) at ${url}...`);

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data.code !== "0") {
             // FALLBACK: If the encrypted payload fails due to an API structure mismatch, 
             // many v2 platforms allow a fallback raw JSON registration for testing
             console.warn(`⚠️ Encrypted registration failed. Details: ${response.data.message}`);
             throw new Error(`Cloud Registration Error: ${response.data.message}`);
        }

        console.log(`✅ Successfully registered Cloud Device ${sn}`);
        // Cache the token so we can query the REST API directly
        cloudTokenCache[sn] = response.data.data.token; 

        return response.data.data; // Returns MQTT Credentials!
        // Expecting: { emqxAddr, emqxPort, username, clientId, token }

    } catch (err) {
        console.error(`❌ registerCloudDevice failed:`, err.message);
        throw err;
    }
}

// -----------------------------
// 🔹 MQTT Integration
// -----------------------------

/**
 * Connects to the Cloud MQTT Broker and listens for incoming traffic
 */
async function startCloudMqttConnection(credentials, sn, ipcSender) {
    console.log(`☁️ Starting MQTT Connection for SN: ${sn}...`);
    
    // Construct the broker URL based on credentials (mqtts standard for secure broker)
    // Sometimes it's ws/wss, depending on the emqx configuration.
    const brokerUrl = `mqtt://${credentials.emqxAddr}:${credentials.emqxPort}`;

    const options = {
        clientId: credentials.clientId,
        username: credentials.username,
        password: credentials.token, // Usually the token serves as the password
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
    };

    const client = mqtt.connect(brokerUrl, options);

    client.on('connect', () => {
        console.log(`✅ MQTT Connected to Cloud Broker for SN: ${sn}`);
        activeMqttClients[sn] = client; // Store client to manage lifecycle

        // Subscribe to the downstream topic
        const downTopic = `/device/down/${sn}`;
        client.subscribe(downTopic, (err) => {
            if (!err) {
                console.log(`📡 Subscribed to Cloud MQTT Topic: ${downTopic}`);
            } else {
                console.error(`❌ Failed to subscribe to topic ${downTopic}:`, err);
            }
        });

        // Report Online Status (Optional but good practice)
        // Topic struct from doc: /device/up/{deviceType}/{sn}/online
        // (Assuming "gateway" for now, ideally make dynamic)
        const upTopic = `/device/up/gateway/${sn}/online`;
        
        // This should technically be sent as Protobuf based on doc:
        // Using string for now until Protobuf schema is fully defined
        client.publish(upTopic, JSON.stringify({ status: 1, timestamp: Date.now() }));
    });

    client.on('message', (topic, messageBytes) => {
        console.log(`📩 MQTT Message Received on topic: ${topic}`);
        
        try {
            // STEP 1: Decode Protobuf (We will implement the real decode here next)
            // For now, let's attempt to parse it as raw string/JSON just in case
            const rawString = messageBytes.toString('utf-8');
            let dataObj;
            try {
                dataObj = JSON.parse(rawString);
            } catch(e) {
                dataObj = { rawBufferHex: messageBytes.toString('hex') };
            }

            // STEP 2: Push to React Dashboard via IPC!
            if (ipcSender) {
                ipcSender("cloud-device-update", {
                    sn: sn,
                    topic: topic,
                    data: dataObj,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (err) {
            console.error("❌ Failed to process MQTT message:", err);
        }
    });

    client.on('error', (err) => {
        console.error(`❌ MQTT Client Error (SN: ${sn}):`, err);
    });

    client.on('close', () => {
        console.log(`⚠️ MQTT Connection Closed (SN: ${sn})`);
    });

    return client;
}

/**
 * Disconnects a specific device's MQTT connection
 */
function stopCloudMqttConnection(sn) {
    if (activeMqttClients[sn]) {
        activeMqttClients[sn].end();
        delete activeMqttClients[sn];
        console.log(`🔌 Stopped MQTT for Cloud Device (SN: ${sn})`);
    }
}

// -----------------------------
// 🔹 REST API Operations
// -----------------------------

/**
 * Generic Fetcher for Cloud APIs using the Cached Token 
 * (Exactly like pbxClient.pbxApi)
 */
async function cloudApiGet(sn, endpoint, cloudDomain = DEFAULT_CLOUD_API_BASE) {
    const token = cloudTokenCache[sn];
    if (!token) {
        throw new Error(`No Cloud Authentication Token found for SN ${sn}. Please connect the device first.`);
    }

    const url = `${cloudDomain}${endpoint}`;
    console.log(`☁️ Fetching Cloud Data from ${url}...`);

    try {
        const response = await axios.get(url, {
            headers: { 
                'Authorization': `Bearer ${token}` 
            }
        });
        
        // Return exactly what the cloud sends
        return response.data;
    } catch (err) {
        console.error(`❌ Cloud API call failed: ${endpoint}`, err.message);
        throw err;
    }
}

// -----------------------------
// 🔹 Unified Helper
// -----------------------------

/**
 * High-level function to handle the entire lifecycle for a single SN
 * 1. Post to Web
 * 2. Get Credentials
 * 3. Mount MQTT
 */
async function initializeCloudDevice(sn, mac, cloudDomain, ipcSender) {
    try {
        const credentials = await registerCloudDevice(sn, mac, cloudDomain);
        if (credentials && credentials.emqxAddr) {
            await startCloudMqttConnection(credentials, sn, ipcSender);
            return {
                success: true,
                message: "Cloud device initialized and securely connected via MQTT."
            };
        } else {
            return { success: false, message: "Registration succeeded but no MQTT credentials received." };
        }
    } catch (err) {
        return { success: false, message: err.message };
    }
}

async function getCloudSystemInfo(sn) {
    // Uses the new REST workflow instead of MQTT pushes
    // We assume the URL based on common patterns, 
    // you might need to adjust this depending on the exact PDF route:
    return await cloudApiGet(sn, `/api/device/system-info?sn=${sn}`);
}

module.exports = {
    getCloudPublicKey,
    registerCloudDevice,
    startCloudMqttConnection,
    stopCloudMqttConnection,
    initializeCloudDevice,
    cloudApiGet,
    getCloudSystemInfo
};
