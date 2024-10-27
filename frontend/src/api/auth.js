import axios from 'axios';

// Base URL of your FastAPI backend
const BASE_URL = 'http://89.104.117.116:8080/api';
// Register a new user
export const registerUser = (username, email, password) => {
  return axios.post(`${BASE_URL}/register`, {
    username,
    email,
    password,
  });
};

// Login user and get JWT token
export const loginUser = (username, password) => {
  return axios.post(`${BASE_URL}/login`, {
    username,
    password,
  });
};

// Example: Get protected resource (optional)
export const getProtectedResource = (token) => {
  return axios.get(`${BASE_URL}/protected`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
