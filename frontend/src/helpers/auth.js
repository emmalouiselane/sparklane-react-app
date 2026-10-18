import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const SAFE_METHODS = new Set(['get', 'head', 'options']);
let csrfTokenRequest = null;

function getCsrfToken() {
  // Fetch from the current cookie session before each write. Concurrent writes
  // share the fetch; tokens from an old session or another tab are never cached.
  if (!csrfTokenRequest) {
    csrfTokenRequest = apiClient.get('/auth/csrf')
      .then(({ data }) => {
        if (typeof data?.csrfToken !== 'string' || !data.csrfToken) {
          throw new Error('Unable to get a CSRF token. Please refresh and try again.');
        }
        return data.csrfToken;
      })
      .finally(() => { csrfTokenRequest = null; });
  }
  return csrfTokenRequest;
}

apiClient.interceptors.request.use(async (config) => {
  if (!SAFE_METHODS.has((config.method || 'get').toLowerCase())) {
    config.headers['X-CSRF-Token'] = await getCsrfToken();
  }
  return config;
});
