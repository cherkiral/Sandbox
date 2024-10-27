import React, { useEffect, useState } from 'react';
import { getTwitterAccounts, updateTwitterAccount, deleteTwitterAccount } from '../api/twitter';
import { Table, Container, Button, Form, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { ClipLoader } from 'react-spinners'; // Spinner for loading

const Dashboard = () => {
  const BASE_URL = 'http://89.104.117.116:8080';
  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]); // For selected accounts
  const [tweetStatus, setTweetStatus] = useState({}); // To store tweet status per account
  const [sandboxStatus, setSandboxStatus] = useState({}); // To store Sandbox confirmation status
  const [epChanges, setEpChanges] = useState({}); // Store EP changes for each account
  const [loadingState, setLoadingState] = useState({}); // Track loading state for each account action
  const [editingAccountId, setEditingAccountId] = useState(null); // To track the account being edited
  const [editedAccount, setEditedAccount] = useState({
    account_number: '',
    twitter_token: '',
    sandbox_login: '',
    sandbox_password: '',
    proxy: '',
  });
  const [bulkFile, setBulkFile] = useState(null); // For bulk upload

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('authToken'); // Assuming you're storing the token in localStorage
      const response = await getTwitterAccounts(token);
      const initialAccounts = response.data;

      // Initialize epChanges, tweetStatus, sandboxStatus, and loadingState with 0 or empty for each account
      const initialEpChanges = {};
      const initialTweetStatus = {};
      const initialSandboxStatus = {};
      const initialLoadingState = {};

      initialAccounts.forEach(account => {
        initialEpChanges[account.id] = 0; // No changes initially
        initialTweetStatus[account.id] = ''; // Empty status initially
        initialSandboxStatus[account.id] = ''; // Empty status initially
        initialLoadingState[account.id] = {
          ep: false,
          tweet: false,
          sandbox: false,
          verification: false,
          alphapass: false,
        }; // Track loading for each action
      });

      setAccounts(initialAccounts); // Update state with fetched accounts
      setEpChanges(initialEpChanges); // Initialize EP changes
      setTweetStatus(initialTweetStatus); // Initialize tweet statuses
      setSandboxStatus(initialSandboxStatus); // Initialize sandbox statuses
      setLoadingState(initialLoadingState); // Initialize loading state
    } catch (error) {
      console.error('Error fetching Twitter accounts:', error);
    }
  };

  const handleEditClick = (account) => {
    setEditingAccountId(account.id); // Set the current account to edit
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
      setEditingAccountId(null); // Exit editing mode
      fetchAccounts(); // Refresh the account list after saving changes
    } catch (error) {
      console.error('Error updating Twitter account:', error);
    }
  };

  const handleDelete = async (accountId) => {
    try {
      const token = localStorage.getItem('authToken');
      await deleteTwitterAccount(token, accountId);
      fetchAccounts(); // Refresh the account list after deleting
    } catch (error) {
      console.error('Error deleting Twitter account:', error);
    }
  };

  // Handle checkbox selection
  const handleCheckboxChange = (accountId) => {
    setSelectedAccounts((prevSelected) =>
      prevSelected.includes(accountId)
        ? prevSelected.filter((id) => id !== accountId)
        : [...prevSelected, accountId]
    );
  };

  // Handle Select All
  const handleSelectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]); // Deselect all
    } else {
      setSelectedAccounts(accounts.map((account) => account.id)); // Select all
    }
  };

  // Handle Action Buttons (Check EP, Post Tweet, Sandbox Confirmation, Verification, AlphaPass)
const handleAction = async (action) => {
  try {
    const token = localStorage.getItem('authToken');
    const updatedAccounts = [...accounts]; // Create a copy of accounts

    for (const accountId of selectedAccounts) {
      const account = accounts.find((acc) => acc.id === accountId);

      // Set loading state for the specific action
      setLoadingState((prevLoading) => ({
        ...prevLoading,
        [accountId]: { ...prevLoading[accountId], [action]: true }, // Set loading to true for the action
      }));

      if (action === 'check_ep') {
        try {
          setEpChanges((prevChanges) => ({
            ...prevChanges,
            [accountId]: 'loading', // Set loading state to show in the table
          }));

          const response = await axios.get(`${BASE_URL}/accounts/${accountId}/ep`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const newEpCount = response.data.ep;

          // Calculate the change in EP
          const epDifference = newEpCount - account.ep_count;

          // Update the account's EP count in the local state
          const updatedAccountIndex = updatedAccounts.findIndex((acc) => acc.id === accountId);
          if (updatedAccountIndex !== -1) {
            updatedAccounts[updatedAccountIndex].ep_count = newEpCount;
          }

          // Update EP changes only if there is a difference
          setEpChanges((prevChanges) => ({
            ...prevChanges,
            [accountId]: epDifference === 0 ? 'No change' : epDifference,
          }));
        } catch (error) {
          console.error(`Error checking EP for account ${accountId}:`, error);
          setEpChanges((prevChanges) => ({
            ...prevChanges,
            [accountId]: 'Error fetching EP',
          }));
        } finally {
          // Reset loading state
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

          // Check if the tweet response contains errors
          if (response.data.tweet_response && response.data.tweet_response.errors) {
            const errorMessage = response.data.tweet_response.errors[0].message;
            setTweetStatus((prevStatuses) => ({
              ...prevStatuses,
              [accountId]: errorMessage, // Display the error message
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
            [accountId]: 'Failed to post tweet',
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

          // Check if the sandbox confirm response contains errors
          if (response.data.errors) {
            const errorMessage = response.data.errors[0].message;
            setSandboxStatus((prevStatuses) => ({
              ...prevStatuses,
              [accountId]: errorMessage, // Display the error message
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
          // Reset loading state
          setLoadingState((prevLoading) => ({
            ...prevLoading,
            [accountId]: { ...prevLoading[accountId], sandbox_confirm: false },
          }));
        }
      }

      // Verification Status
      if (action === 'check_verification') {
        try {
          const response = await axios.get(`${BASE_URL}/accounts/${accountId}/verification`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const newVerificationStatus = response.data.verification_status;

          // Update account's verification status immediately
          setAccounts((prevAccounts) =>
            prevAccounts.map((acc) =>
              acc.id === accountId ? { ...acc, is_verified: newVerificationStatus } : acc
            )
          );
        } catch (error) {
          console.error(`Error checking verification status for account ${accountId}:`, error);
        } finally {
          // Reset loading state
          setLoadingState((prevLoading) => ({
            ...prevLoading,
            [accountId]: { ...prevLoading[accountId], check_verification: false },
          }));
        }
      }

      // AlphaPass Ownership
      if (action === 'check_alphapass') {
        try {
          const response = await axios.get(`${BASE_URL}/accounts/${accountId}/alphapass`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const ownsAlphaPass = response.data.owns_alphapass;

          // Update account's AlphaPass ownership immediately
          setAccounts((prevAccounts) =>
            prevAccounts.map((acc) =>
              acc.id === accountId ? { ...acc, owns_alphapass: ownsAlphaPass } : acc
            )
          );
        } catch (error) {
          console.error(`Error checking AlphaPass ownership for account ${accountId}:`, error);
        } finally {
          // Reset loading state
          setLoadingState((prevLoading) => ({
            ...prevLoading,
            [accountId]: { ...prevLoading[accountId], check_alphapass: false },
          }));
        }
      }
    }

    setAccounts(updatedAccounts); // Update accounts in the table after all actions
  } catch (error) {
    console.error(`Error performing action "${action}":`, error);
  }
};



  // Handle Bulk File Upload
  const handleBulkUpload = async () => {
    const formData = new FormData();
    formData.append('file', bulkFile);
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`${BASE_URL}/accounts/bulk-add`, formData, { // Corrected syntax
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      fetchAccounts(); // Refresh accounts after bulk upload
      setBulkFile(null); // Clear the file input
    } catch (error) {
      console.error('Error uploading bulk accounts:', error);
    }
  };

  return (
    <Container fluid>
      <h2 className="mt-4">Twitter Accounts</h2>

      {/* Bulk Add Accounts */}
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

      {/* Action Buttons */}
      <Row className="mb-3">
        <Col>
          {/* Left group for Twitter actions */}
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
          {/* Right group for fetching data */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button onClick={() => handleAction('check_ep')} disabled={selectedAccounts.length === 0}>
              Check EP
            </Button>
            <Button onClick={() => handleAction('check_verification')} disabled={selectedAccounts.length === 0}>
              Check Verification Status
            </Button>
            <Button onClick={() => handleAction('check_alphapass')} disabled={selectedAccounts.length === 0}>
              Check AlphaPass Ownership
            </Button>
          </div>
        </Col>
      </Row>

      {/* Scrollable table container */}
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
              <th>Verification Status</th>
              <th>AlphaPass Ownership</th>
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
                    <td>{account.is_verified === 'Verified' ? '✔️' : account.is_verified}</td>
                    <td>{account.owns_alphapass ? '✔️' : '❌'}</td>
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
                    <td>
                      {loadingState[account.id]?.check_verification ? (
                        <ClipLoader size={20} color={"#000"} />
                      ) : (
                        account.is_verified === 'Verified' ? '✔️' : account.is_verified
                      )}
                    </td>
                    <td>
                      {loadingState[account.id]?.check_alphapass ? (
                        <ClipLoader size={20} color={"#000"} />
                      ) : (
                        account.owns_alphapass ? '✔️' : '❌'
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

