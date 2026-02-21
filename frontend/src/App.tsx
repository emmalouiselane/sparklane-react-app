import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './components/Login';
import Header from './components/Header';
import UpcomingAgenda from './components/UpcomingAgenda';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './CustomBootstrap.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

function AppContent() {
  const { user, isAuthenticated, loading, error, handleLoginSuccess, checkAuthStatus } = useAuthContext();
 
  // Check for auth success in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');
    
    if (authSuccess === 'success') {
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
      // Check authentication status
      checkAuthStatus();
    }
  }, [checkAuthStatus]);

  if (loading) {
    return (
      <div className="app">Loading...</div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      
      <Header
        user={user}
        error={error}
      />

      <main className="app-main" id="main-content" role="main">
        <UpcomingAgenda />
      </main>
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
