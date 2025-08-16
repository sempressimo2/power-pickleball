// Simple API client helper
const BASE_URL = 'https://secret-arcade-api-bfhncvhvgbdwdsgy.centralus-01.azurewebsites.net';

export function getBaseUrl() {
  return BASE_URL.replace(/\/$/, '');
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : '/' + path}`;
  const headers = { 'Accept': 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error('Network error: ' + err.message);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!response.ok) {
    const message = (data && data.message) || response.statusText || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}
