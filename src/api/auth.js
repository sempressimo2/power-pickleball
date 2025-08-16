// src/api/auth.js
import axios from 'axios';

const API_URL = 'https://secret-arcade-api-bfhncvhvgbdwdsgy.centralus-01.azurewebsites.net';

export async function login(email, password) {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email,
    password
  });
  return response.data;
}

export async function register(email, password, displayName) {
  const response = await axios.post(`${API_URL}/auth/register`, {
    email,
    password,
    displayName
  });
  return response.data;
}
