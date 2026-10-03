import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../helpers/auth';

export interface UseAuthReturn {
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  handleLogout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  setError: (error: string | null) => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/user');
      
      if (response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        setUser(null);
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', {});
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed. Please try again to end your session.');
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    handleLogout,
    checkAuthStatus,
    setError,
  };
}
