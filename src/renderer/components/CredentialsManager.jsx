import React, { useState, useEffect } from "react";
import { Modal, Button, Table, Badge, Alert } from "react-bootstrap";
import CredentialsModal from "./CredentialsModal";

export default function CredentialsManager({ show, onHide }) {
  const [credentials, setCredentials] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  useEffect(() => {
    if (show) {
      loadCredentials();
    }
  }, [show]);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const creds = await window.api.getAllDeviceCredentials();
      setCredentials(creds);
    } catch (error) {
      console.error("Failed to load credentials:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCredentials = (ip) => {
    setSelectedDevice({ ip });
    setShowCredentialsModal(true);
  };

  const handleRemoveCredentials = async (ip) => {
    if (!confirm(`Remove credentials for ${ip}?`)) return;

    try {
      await window.api.removeDeviceCredentials(ip);
      await loadCredentials(); // Refresh list
    } catch (error) {
      alert(`Failed to remove credentials: ${error.message}`);
    }
  };

  const handleCredentialsSaved = () => {
    loadCredentials(); // Refresh list
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Device Credentials Manager</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <strong>Security Note:</strong> Passwords are encrypted and stored locally on your device.
            They are never transmitted or stored on external servers.
          </Alert>

          {loading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : Object.keys(credentials).length === 0 ? (
            <Alert variant="secondary">
              No custom credentials stored. Devices will use default admin/admin login.
            </Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Username</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(credentials).map(([ip, creds]) => (
                  <tr key={ip}>
                    <td>
                      <code>{ip}</code>
                    </td>
                    <td>{creds.username}</td>
                    <td>{formatDate(creds.lastUpdated)}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleEditCredentials(ip)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveCredentials(ip)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <CredentialsModal
        show={showCredentialsModal}
        onHide={() => setShowCredentialsModal(false)}
        device={selectedDevice}
        onSave={handleCredentialsSaved}
      />
    </>
  );
}
