import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './components/Login';
import Header from './components/Header';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';

import './App.css';
import ConnectionStatus from './components/ConnectionStatus';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

function AppContent() {
  const { user, isAuthenticated, loading, error, handleLoginSuccess } = useAuthContext();
 
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
