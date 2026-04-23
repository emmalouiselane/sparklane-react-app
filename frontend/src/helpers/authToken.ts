const AUTH_TOKEN_STORAGE_KEY = 'sparklane_auth_token';

export function getStoredAuthToken(): string | null {
  return window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function storeAuthToken(token: string) {
  window.sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAuthToken() {
  window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function extractAuthTokenFromHash(hash: string): string | null {
  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(normalizedHash);
  return params.get('token');
}

export function extractAuthTokenFromSearch(search: string): string | null {
  const normalizedSearch = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(normalizedSearch);
  return params.get('token');
}
