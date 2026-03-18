import React, { useState } from "react";
import { Modal, Button, Form, Spinner, Alert } from "react-bootstrap";
import { useDeviceContext } from "../context/DeviceContext";

export default function CloudDeviceModal({ show, onHide }) {
  const [sn, setSn] = useState("");
  const [mac, setMac] = useState("");
  const [cloudDomain, setCloudDomain] = useState("https://aiot.dasscom.com");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Getting access to the context to potentially show it's connected (optional, as context auto-updates)
  const { setDevices } = useDeviceContext();

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!sn) {
      setError("Serial Number (SN) is required.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (window.api && window.api.initializeCloudDevice) {
        const result = await window.api.initializeCloudDevice(sn, mac, cloudDomain);
        if (result.success) {
          setSuccess(true);
          // Optional: clear form
          setSn("");
          setMac("");
          setTimeout(() => {
            onHide();
            setSuccess(false);
          }, 2000);
        } else {
          setError(result.message || "Failed to initialize cloud device.");
        }
      } else {
        setError("Cloud API not available in this environment.");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Connect Cloud Device</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-4">
          Connect to a remote Dasscom device via the Cloud Platform using its Serial Number.
        </p>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">Device connected successfully! Waiting for MQTT data...</Alert>}

        <Form onSubmit={handleConnect}>
          <Form.Group className="mb-3">
            <Form.Label>Device Serial Number (SN) *</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. DASSCOM123456"
              value={sn}
              onChange={(e) => setSn(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>MAC Address (Optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. 00:1A:2B:3C:4D:5E"
              value={mac}
              onChange={(e) => setMac(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Cloud Platform URL</Form.Label>
            <Form.Control
              type="text"
              value={cloudDomain}
              onChange={(e) => setCloudDomain(e.target.value)}
            />
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  Connecting...
                </>
              ) : (
                "Connect via MQTT"
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
