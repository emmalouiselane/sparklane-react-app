import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { getStoredAuthToken } from './authToken';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const authToken = getStoredAuthToken();

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});
