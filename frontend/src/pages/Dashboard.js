import React, { useEffect, useState } from 'react';
import { getTwitterAccounts, updateTwitterAccount, deleteTwitterAccount } from '../api/twitter';
import { Table, Container, Button, Form, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { ClipLoader } from 'react-spinners';

const Dashboard = () => {
  const BASE_URL = 'http://89.104.117.116:8080';
  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [tweetStatus, setTweetStatus] = useState({});
  const [sandboxStatus, setSandboxStatus] = useState({});
  const [epChanges, setEpChanges] = useState({});
  const [loadingState, setLoadingState] = useState({});
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editedAccount, setEditedAccount] = useState({
    account_number: '',
    twitter_token: '',
    sandbox_login: '',
    sandbox_password: '',
    proxy: '',
  });
  const [bulkFile, setBulkFile] = useState(null);
  const [generalError, setGeneralError] = useState(null); // To display general error messages

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await getTwitterAccounts(token);
      const initialAccounts = response.data;

      const initialEpChanges = {};
      const initialTweetStatus = {};
      const initialSandboxStatus = {};
      const initialLoadingState = {};

      initialAccounts.forEach(account => {
        initialEpChanges[account.id] = 0;
        initialTweetStatus[account.id] = '';
        initialSandboxStatus[account.id] = '';
        initialLoadingState[account.id] = {
          ep: false,
          tweet: false,
          sandbox: false,
          verification: false,
          alphapass: false,
        };
      });

      setAccounts(initialAccounts);
      setEpChanges(initialEpChanges);
      setTweetStatus(initialTweetStatus);
      setSandboxStatus(initialSandboxStatus);
      setLoadingState(initialLoadingState);
    } catch (error) {
      setGeneralError('Error fetching Twitter accounts');
      console.error('Error fetching Twitter accounts:', error);
    }
  };

  const handleEditClick = (account) => {
    setEditingAccountId(account.id);
    setEditedAccount({
      account_number: account.account_number,
      twitter_token: account.twitter_token,
      sandbox_login: account.sandbox_login,
      sandbox_password: account.sandbox_password,
      proxy: account.proxy,
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedAccount({
      ...editedAccount,
      [name]: value,
    });
  };

  const handleSave = async (accountId) => {
    try {
      const token = localStorage.getItem('authToken');
      await updateTwitterAccount(
        token,
        accountId,
        editedAccount.account_number,
        editedAccount.twitter_token,
        editedAccount.sandbox_login,
        editedAccount.sandbox_password,
        editedAccount.proxy
      );
      setEditingAccountId(null);
      fetchAccounts();
    } catch (error) {
      setGeneralError('Error updating Twitter account');
      console.error('Error updating Twitter account:', error);
    }
  };

  const handleDelete = async (accountId) => {
    try {
      const token = localStorage.getItem('authToken');
      await deleteTwitterAccount(token, accountId);
      fetchAccounts();
    } catch (error) {
      setGeneralError('Error deleting Twitter account');
      console.error('Error deleting Twitter account:', error);
    }
  };

  const handleCheckboxChange = (accountId) => {
    setSelectedAccounts((prevSelected) =>
      prevSelected.includes(accountId)
        ? prevSelected.filter((id) => id !== accountId)
        : [...prevSelected, accountId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map((account) => account.id));
    }
  };

  const handleAction = async (action) => {
    try {
      const token = localStorage.getItem('authToken');
      const updatedAccounts = [...accounts];

      for (const accountId of selectedAccounts) {
        const account = accounts.find((acc) => acc.id === accountId);

        setLoadingState((prevLoading) => ({
          ...prevLoading,
          [accountId]: { ...prevLoading[accountId], [action]: true },
        }));

        if (action === 'check_ep') {
          try {
            setEpChanges((prevChanges) => ({
              ...prevChanges,
              [accountId]: 'loading',
            }));

            const response = await axios.get(`${BASE_URL}/accounts/${accountId}/ep`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const newEpCount = response.data.ep;
            const epDifference = newEpCount - account.ep_count;

            const updatedAccountIndex = updatedAccounts.findIndex((acc) => acc.id === accountId);
            if (updatedAccountIndex !== -1) {
              updatedAccounts[updatedAccountIndex].ep_count = newEpCount;
            }

            setEpChanges((prevChanges) => ({
              ...prevChanges,
              [accountId]: epDifference === 0 ? 'No change' : epDifference,
            }));
          } catch (error) {
            setEpChanges((prevChanges) => ({
              ...prevChanges,
              [accountId]: 'Error fetching EP',
            }));
            console.error(`Error checking EP for account ${accountId}:`, error);
          } finally {
            setLoadingState((prevLoading) => ({
              ...prevLoading,
              [accountId]: { ...prevLoading[accountId], check_ep: false },
            }));
          }
        }

        if (action === 'tweet') {
          try {
            const response = await axios.post(
              `${BASE_URL}/accounts/tweet`,
              { twitter_token: account.twitter_token, text: "https://sandbox.game #TheSandbox #AlphaSeason4 #AS4SocialChallenge" },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.tweet_response && response.data.tweet_response.errors) {
              const errorMessage = response.data.tweet_response.errors[0].message;
              setTweetStatus((prevStatuses) => ({
                ...prevStatuses,
                [accountId]: errorMessage,
              }));
            } else {
              setTweetStatus((prevStatuses) => ({
                ...prevStatuses,
                [accountId]: 'Tweet posted successfully!',
              }));
            }
          } catch (error) {
            setTweetStatus((prevStatuses) => ({
              ...prevStatuses,
              [accountId]: error.response?.data?.detail || 'Failed to post tweet',
            }));
            console.error(`Error posting tweet for account ${accountId}:`, error);
          }
        }

        if (action === 'sandbox_confirm') {
          try {
            const response = await axios.post(
              `${BASE_URL}/accounts/sandbox/confirm/${accountId}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.errors) {
              const errorMessage = response.data.errors[0].message;
              setSandboxStatus((prevStatuses) => ({
                ...prevStatuses,
                [accountId]: errorMessage,
              }));
            } else {
              const challengeId = response.data.challenge_id;
              setSandboxStatus((prevStatuses) => ({
                ...prevStatuses,
                [accountId]: `Challenge queued, ID: ${challengeId}`,
              }));
            }
          } catch (error) {
            setSandboxStatus((prevStatuses) => ({
              ...prevStatuses,
              [accountId]: 'Failed to queue Sandbox confirmation',
            }));
            console.error(`Error sending Sandbox confirmation for account ${accountId}:`, error);
          } finally {
            setLoadingState((prevLoading) => ({
              ...prevLoading,
              [accountId]: { ...prevLoading[accountId], sandbox_confirm: false },
            }));
          }
        }
      }

      setAccounts(updatedAccounts);
    } catch (error) {
      setGeneralError(`Error performing action "${action}"`);
      console.error(`Error performing action "${action}":`, error);
    }
  };

  const handleBulkUpload = async () => {
    const formData = new FormData();
    formData.append('file', bulkFile);
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`${BASE_URL}/accounts/bulk-add`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      fetchAccounts();
      setBulkFile(null);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error uploading bulk accounts';
      setGeneralError(errorMessage);
      console.error(errorMessage);
    }
  };

  return (
    <Container fluid>
      <h2 className="mt-4">Twitter Accounts</h2>

      {generalError && (
        <div style={{ color: 'red', margin: '20px 0' }}>
          {generalError}
        </div>
      )}

      <Row className="mb-3">
        <Col>
          <Form.Group controlId="formFile" className="mb-3">
            <Form.Control
              type="file"
              onChange={(e) => setBulkFile(e.target.files[0])}
            />
          </Form.Group>
          <Button onClick={handleBulkUpload} disabled={!bulkFile}>
            Bulk Add Accounts
          </Button>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button onClick={() => handleAction('tweet')} disabled={selectedAccounts.length === 0}>
              Post Tweet
            </Button>
            <Button onClick={() => handleAction('sandbox_confirm')} disabled={selectedAccounts.length === 0}>
              Sandbox Confirm Request
            </Button>
          </div>
        </Col>

        <Col>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button onClick={() => handleAction('check_ep')} disabled={selectedAccounts.length === 0}>
              Check EP
            </Button>
          </div>
        </Col>
      </Row>

      <div style={{ maxHeight: '1000px', overflowY: 'auto', overflowX: 'auto' }}>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>
                <Button onClick={handleSelectAll}>
                  {selectedAccounts.length === accounts.length ? 'Deselect All' : 'Select All'}
                </Button>
              </th>
              <th>Account Number</th>
              <th>Twitter Token</th>
              <th>Sandbox Login</th>
              <th>Sandbox Password</th>
              <th>EP Count</th>
              <th>Twitter Status</th>
              <th>Sandbox Confirmation Status</th>
              <th>Proxy</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id}>
                <td>
                  <Form.Check
                    type="checkbox"
                    checked={selectedAccounts.includes(account.id)}
                    onChange={() => handleCheckboxChange(account.id)}
                  />
                </td>
                {editingAccountId === account.id ? (
                  <>
                    <td>
                      <Form.Control
                        type="number"
                        name="account_number"
                        value={editedAccount.account_number}
                        onChange={handleInputChange}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="text"
                        name="twitter_token"
                        value={editedAccount.twitter_token}
                        onChange={handleInputChange}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="text"
                        name="sandbox_login"
                        value={editedAccount.sandbox_login}
                        onChange={handleInputChange}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="password"
                        name="sandbox_password"
                        value={editedAccount.sandbox_password}
                        onChange={handleInputChange}
                      />
                    </td>
                    <td>{account.ep_count}</td>
                    <td>{tweetStatus[account.id]}</td>
                    <td>{sandboxStatus[account.id]}</td>
                    <td>
                      <Form.Control
                        type="text"
                        name="proxy"
                        value={editedAccount.proxy}
                        onChange={handleInputChange}
                      />
                    </td>
                    <td>
                      <Button variant="success" onClick={() => handleSave(account.id)}>
                        Save
                      </Button>{' '}
                      <Button variant="secondary" onClick={() => setEditingAccountId(null)}>
                        Cancel
                      </Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{account.account_number}</td>
                    <td>{account.twitter_token}</td>
                    <td>{account.sandbox_login}</td>
                    <td>{account.sandbox_password}</td>
                    <td>
                      {loadingState[account.id]?.ep ? (
                        <ClipLoader size={20} color={"#000"} />
                      ) : (
                        <>
                          {account.ep_count}
                          {epChanges[account.id] !== 0 && (
                            <div style={{ color: 'green', fontSize: '12px' }}>
                              +{epChanges[account.id]}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td>{tweetStatus[account.id]}</td>
                    <td>
                      {loadingState[account.id]?.sandbox_confirm ? (
                        <ClipLoader size={20} color={"#000"} />
                      ) : (
                        sandboxStatus[account.id]
                      )}
                    </td>
                    <td>{account.proxy}</td>
                    <td>
                      <Button variant="warning" onClick={() => handleEditClick(account)}>
                        Edit
                      </Button>{' '}
                      <Button variant="danger" onClick={() => handleDelete(account.id)}>
                        Delete
                      </Button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Container>
  );
};

export default Dashboard;
