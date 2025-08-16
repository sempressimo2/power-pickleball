import { apiRequest } from './client';

export async function loginApi(email, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
}

export async function registerApi(email, password, displayName) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: { email, password, displayName }
  });
}

export async function meApi(token) {
  return apiRequest('/auth/me', { token });
}

export async function logoutApi(token) {
  return apiRequest('/auth/logout', { method: 'POST', token });
}
