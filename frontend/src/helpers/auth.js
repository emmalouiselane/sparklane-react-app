export const AUTH_TOKEN_KEY = 'authToken';

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getAuthHeaders(token = getAuthToken()) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export function getAuthConfig(token = getAuthToken(), config = {}) {
  return {
    ...config,
    headers: {
      ...getAuthHeaders(token),
      ...(config.headers || {})
    }
  };
}
