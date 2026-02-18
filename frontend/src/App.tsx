import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './components/Login';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/auth/user`, { withCredentials: true });
      if (response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        fetchData();
      } else {
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
    fetchData();
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/auth/logout`, {}, { withCredentials: true });
      setUser(null);
      setIsAuthenticated(false);
      setData(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_BASE_URL}/`);

      setData(response.data);

      setError(null);
    } catch (err) {
      setError('Failed to fetch data from the server');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="App">Loading...</div>
    </GoogleOAuthProvider>
  );
}

  if (!isAuthenticated) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <Login onLoginSuccess={handleLoginSuccess} />
      </GoogleOAuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="App">
        <header className="App-header">
          <div className="header-content">
            <h1>Sparklane Full-Stack App</h1>
            <div className="user-info">
              {user && (
                <div className="user-profile">
                  <img 
                    src={user.picture} 
                    alt={user.name} 
                    className="user-avatar"
                  />
                  <span className="user-name">{user.name}</span>
                  <button onClick={handleLogout} className="logout-btn">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
          {error && <div className="error">{error}</div>}
        </header>

        <main className="App-main">
          {data && <div className="data">{JSON.stringify(data)}</div>}
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
