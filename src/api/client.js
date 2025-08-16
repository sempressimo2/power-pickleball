// api/client.js
// Simple API client helper with WebsiteId support
const BASE_URL = 'https://secret-arcade-api-bfhncvhvgbdwdsgy.centralus-01.azurewebsites.net';

// Default / fallback website id for this deployed client
const DEFAULT_WEBSITE_ID = 2; // This site's identifier
const WEBSITE_ID_STORAGE_KEY = 'websiteId';

export function getBaseUrl() {
  return BASE_URL.replace(/\/$/, '');
}

// Get the WebsiteId (priority: explicit override in localStorage -> env var -> default constant)
export function getWebsiteId() {
  try {
    const stored = localStorage.getItem(WEBSITE_ID_STORAGE_KEY);
    if (stored) return Number(stored);
  } catch (_) { /* ignore storage issues (SSR / privacy) */ }
  const envVal = import.meta?.env?.VITE_WEBSITE_ID;
  if (envVal !== undefined) return Number(envVal);
  return DEFAULT_WEBSITE_ID;
}

// Allow runtime override (e.g., admin switching context)
export function setWebsiteId(id) {
  try { localStorage.setItem(WEBSITE_ID_STORAGE_KEY, String(id)); } catch (_) { /* ignore */ }
}

export async function apiRequest(path, { method = 'GET', body, token, includeWebsiteId = true } = {}) {
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : '/' + path}`;
  const headers = { 'Accept': 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Attach WebsiteId header if requested
  if (includeWebsiteId) {
    headers['X-Website-Id'] = String(getWebsiteId());
  }

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
