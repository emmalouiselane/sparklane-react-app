import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';


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
  const [token, setToken] = useState<string | null>(null);

  const checkAuthStatus = async () => {
    try {
      const storedToken = localStorage.getItem('authToken');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/auth/user`, { 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedToken}`
        }
      });
      
      if (response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        setToken(storedToken);
      }
    } catch (err: any) {
      // Handle token expiration
      if (err.response?.status === 401) {
        localStorage.removeItem('authToken');
        setError('Your session has expired. Please log in again.');
        setUser(null);
        setIsAuthenticated(false);
        setToken(null);
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
      setToken(receivedToken);
      localStorage.setItem('authToken', receivedToken);
    }
  };

  const handleLogout = async () => {
    try {
      const storedToken = localStorage.getItem('authToken');
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedToken}`
        }
      });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setToken(null);
      localStorage.removeItem('authToken');
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
