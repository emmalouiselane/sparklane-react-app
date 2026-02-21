import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';


export interface UseAuthReturn {
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  handleLoginSuccess: (userData: any) => void;
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
      const response = await axios.get(`${API_BASE_URL}/auth/user`, { withCredentials: true });
      if (response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      // Handle session expiration
      if (err.response?.status === 401 && err.response?.data?.error === 'Session expired') {
        setError('Your session has expired. Please log in again.');
        setUser(null);
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
    setError(null);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    } catch (err) {
      console.error('Logout failed:', err);
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
