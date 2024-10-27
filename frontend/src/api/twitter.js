import axios from 'axios';

// Base URL of your FastAPI backend
const BASE_URL = 'http://89.104.117.116:8080/accounts';
// Get all Twitter accounts for the current user
export const getTwitterAccounts = (token) => {
  return axios.get(`${BASE_URL}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

// Add a new Twitter account
export const addTwitterAccount = (token, twitter_token, sandbox_login, sandbox_password) => {
  return axios.post(
    `${BASE_URL}/`,
    { twitter_token, sandbox_login, sandbox_password },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

// Update an existing Twitter account
export const updateTwitterAccount = (token, accountId, account_number, twitter_token, sandbox_login, sandbox_password, proxy) => {
  return axios.put(
    `${BASE_URL}/${accountId}`,
    { account_number, twitter_token, sandbox_login, sandbox_password, proxy },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

// Delete a Twitter account
export const deleteTwitterAccount = (token, accountId) => {
  return axios.delete(`${BASE_URL}/${accountId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const sendTweet = (token, tweetText) => {
  return axios.post(
    `${BASE_URL}/tweet`,
    { text: tweetText },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

// Send Sandbox confirmation request
export const sendSandboxConfirm = (token) => {
  return axios.post(
    `${BASE_URL}/sandbox/confirm`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};
