import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { clearAuthToken, getAuthConfig, getAuthToken, setAuthToken } from '../helpers/auth';


export interface UseAuthReturn {
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  handleLoginSuccess: (userData: any, receivedToken?: string) => void;
  handleLogout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  setError: (error: string | null) => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthStatus = async () => {
    try {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/auth/user`, getAuthConfig(storedToken));
      
      if (response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      // Handle token expiration
      if (err.response?.status === 401) {
        clearAuthToken();
        setError('Your session has expired. Please log in again.');
        setUser(null);
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (userData: any, receivedToken?: string) => {
    setUser(userData);
    setIsAuthenticated(true);
    setError(null);
    if (receivedToken) {
      setAuthToken(receivedToken);
    }
  };

  const handleLogout = async () => {
    try {
      const storedToken = getAuthToken();
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, getAuthConfig(storedToken));
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      clearAuthToken();
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    handleLoginSuccess,
    handleLogout,
    checkAuthStatus,
    setError,
  };
}
