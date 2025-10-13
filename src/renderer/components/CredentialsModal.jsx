import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";

export default function CredentialsModal({ show, onHide, device, onSave }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [confirmPassword, setConfirmPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("info");

  useEffect(() => {
    if (device?.ip) {
      // Load existing credentials if available
      window.api.getDeviceCredentials(device.ip).then(creds => {
        if (creds) {
          setUsername(creds.username);
          setPassword(creds.password);
          setConfirmPassword(creds.password);
        } else {
          // Reset to defaults
          setUsername("admin");
          setPassword("admin");
          setConfirmPassword("admin");
        }
      }).catch(err => {
        console.warn("Failed to load credentials:", err);
      });
    }
  }, [device?.ip]);

  const handleTestLogin = async () => {
    if (!device?.ip) return;

    setTesting(true);
    setMessage(null);

    try {
      // Try different login methods based on device type
      const type = (device.type || "").toLowerCase();

      let result;
      if (type.includes("pbx")) {
        result = await window.api.pbxLogin(device.ip, username, password);
      } else if (type.includes("speaker")) {
        result = await window.api.speakerLogin(device.ip, username, password);
      } else {
        // IP Phone or unknown
        result = await window.api.loginDevice(device.ip, username, password);
      }

      if (result.success || result.loginSuccess) {
        setMessage("✅ Login successful!");
        setMessageType("success");
      } else {
        setMessage("❌ Login failed. Please check credentials.");
        setMessageType("danger");
      }
    } catch (error) {
      setMessage(`❌ Login error: ${error.message}`);
      setMessageType("danger");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!device?.ip) return;

    if (password !== confirmPassword) {
      setMessage("❌ Passwords do not match!");
      setMessageType("danger");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await window.api.setDeviceCredentials(device.ip, username, password);
      if (result.success) {
        setMessage("✅ Credentials saved successfully!");
        setMessageType("success");
        onSave && onSave();
      } else {
        setMessage(`❌ Failed to save: ${result.error}`);
        setMessageType("danger");
      }
    } catch (error) {
      setMessage(`❌ Error saving credentials: ${error.message}`);
      setMessageType("danger");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMessage(null);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Set Credentials for {device?.ip}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {message && (
          <Alert variant={messageType} dismissible onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Confirm Password</Form.Label>
            <Form.Control
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer style={{backgroundColor:"#ff456"}}>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
        <Button
          variant="info"
          onClick={handleTestLogin}
          disabled={testing || !device?.ip}
        >
          {testing ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Testing...
            </>
          ) : (
            "Test Login"
          )}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={loading || !device?.ip}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            "Save Credentials"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
