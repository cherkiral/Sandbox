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

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('authToken');

      // Preserve existing statuses before fetching new account data
      const currentTweetStatus = { ...tweetStatus };
      const currentSandboxStatus = { ...sandboxStatus };

      const response = await getTwitterAccounts(token);
      const initialAccounts = response.data;

      const initialEpChanges = {};
      const initialLoadingState = {};

      initialAccounts.forEach(account => {
        initialEpChanges[account.id] = 0;
        initialLoadingState[account.id] = {
          ep: false,
          tweet: false,
          sandbox: false,
          verification: false,
          alphapass: false,
        };

        // Restore tweetStatus and sandboxStatus for each account if available
        currentTweetStatus[account.id] = currentTweetStatus[account.id] || '';
        currentSandboxStatus[account.id] = currentSandboxStatus[account.id] || '';
      });

      setAccounts(initialAccounts);
      setEpChanges(initialEpChanges);
      setTweetStatus(currentTweetStatus);
      setSandboxStatus(currentSandboxStatus);
      setLoadingState(initialLoadingState);
    } catch (error) {
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
      console.error('Error updating Twitter account:', error);
    }
  };

  const handleDelete = async (accountId) => {
    try {
      const token = localStorage.getItem('authToken');
      await deleteTwitterAccount(token, accountId);
      fetchAccounts();
    } catch (error) {
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

  const batchAction = async (action, batchSize = 5) => {
    const token = localStorage.getItem('authToken');
    const batchedAccounts = [];

    for (let i = 0; i < selectedAccounts.length; i += batchSize) {
      const batch = selectedAccounts.slice(i, i + batchSize);
      const batchPromises = batch.map(async (accountId) => {
        const account = accounts.find((acc) => acc.id === accountId);
        setLoadingState((prevLoading) => ({
          ...prevLoading,
          [accountId]: { ...prevLoading[accountId], [action]: true },
        }));

        try {
          if (action === 'check_ep') {
            const response = await axios.get(`${BASE_URL}/accounts/${accountId}/ep`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const newEpCount = response.data.ep;
            const epDifference = newEpCount - account.ep_count;

            setAccounts((prevAccounts) =>
              prevAccounts.map((acc) =>
                acc.id === accountId ? { ...acc, ep_count: newEpCount } : acc
              )
            );
            setEpChanges((prevChanges) => ({
              ...prevChanges,
              [accountId]: epDifference === 0 ? 'No change' : epDifference,
            }));
          } else if (action === 'tweet') {
            const response = await axios.post(
              `${BASE_URL}/accounts/tweet`,
              { twitter_token: account.twitter_token, text: "Check out my whip 🏎️ 🔥 Not impressed? Play Crash! in @TheSandboxGame and show me what you got 👀  https://register-landings.sandbox.game/alphaseason4-sign-up/ #TheSandbox #AlphaSeason4 #AS4SocialChallenge " },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setTweetStatus((prevStatuses) => ({
              ...prevStatuses,
              [accountId]: response.data?.tweet_response?.errors
                ? response.data.tweet_response.errors[0].message
                : 'Tweet posted successfully!',
            }));
          } else if (action === 'sandbox_confirm') {
            const response = await axios.post(
              `${BASE_URL}/accounts/sandbox/confirm/${accountId}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setSandboxStatus((prevStatuses) => ({
              ...prevStatuses,
              [accountId]: response.data.errors
                ? response.data.errors[0].message
                : `Challenge queued, ID: ${response.data.challenge_id}`,
            }));
          } else if (action === 'check_verification') {
            const response = await axios.get(`${BASE_URL}/accounts/${accountId}/verification`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setAccounts((prevAccounts) =>
              prevAccounts.map((acc) =>
                acc.id === accountId ? { ...acc, is_verified: response.data.verification_status } : acc
              )
            );
          } else if (action === 'check_alphapass') {
            const response = await axios.get(`${BASE_URL}/accounts/${accountId}/alphapass`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setAccounts((prevAccounts) =>
              prevAccounts.map((acc) =>
                acc.id === accountId ? { ...acc, owns_alphapass: response.data.owns_alphapass } : acc
              )
            );
          }
        } catch (error) {
          console.error(`Error performing ${action} for account ${accountId}:`, error);
        } finally {
          setLoadingState((prevLoading) => ({
            ...prevLoading,
            [accountId]: { ...prevLoading[accountId], [action]: false },
          }));
        }
      });
      batchedAccounts.push(Promise.all(batchPromises));
    }

    await Promise.all(batchedAccounts);
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
      console.error('Error uploading bulk accounts:', error);
    }
  };

  return (
    <Container fluid>
      <h2 className="mt-4">Twitter Accounts</h2>
      <Row className="mb-3">
        <Col>
          <Form.Group controlId="formFile" className="mb-3">
            <Form.Control
              type="file"
              onChange={(e) => setBulkFile(e.target.files[0])}
            />
          </Form.Group>
          <Button onClick={handleBulkUpload} disabled={!bulkFile}>
            Добавить аккаунты
          </Button>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button onClick={() => batchAction('tweet')} disabled={selectedAccounts.length === 0}>
              Отправить твит
            </Button>
            <Button onClick={() => batchAction('sandbox_confirm')} disabled={selectedAccounts.length === 0}>
              Отправить подтверждение на Sandbox
            </Button>
          </div>
        </Col>

        <Col>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button onClick={() => batchAction('check_ep')} disabled={selectedAccounts.length === 0}>
              Проверить ЕР
            </Button>
            <Button onClick={() => batchAction('check_verification')} disabled={selectedAccounts.length === 0}>
              Проверить статус верификации
            </Button>
            <Button onClick={() => batchAction('check_alphapass')} disabled={selectedAccounts.length === 0}>
              Проверить наличие альфапаса
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
              <th>Номер Аккаунта</th>
              <th>Токен твиттера</th>
              <th>Логин Sandbox</th>
              <th>Пароль Sandbox</th>
              <th>КоличествоEP</th>
              <th>Статус отправки твита</th>
              <th>Статус подтверждения Sandbox</th>
              <th>Статус верификации</th>
              <th>Наличие Альфапасса</th>
              <th>Прокси</th>
              <th>Действие</th>
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
                      {loadingState[account.id]?.check_verification ? (
                        <ClipLoader size={20} color={"#000"} />
                      ) : (
                        account.is_verified === "True" || account.is_verified === "Verified" ? '✔️' : account.is_verified
                      )}
                    </td>
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
                        account.is_verified === "True" || account.is_verified === "Verified" ? '✔️' : account.is_verified
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
