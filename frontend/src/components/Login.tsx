import React from 'react';
import { Button } from 'react-bootstrap';
import { API_BASE_URL } from '../config/api';

import './Login.css';

const Login: React.FC = () => {
  const handleGoogleLogin = () => {
    // Redirect to Google OAuth on the backend
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <div className="login-container">
      <main role="main">
        <section className="login-card">
          <h1>Sparklane Personal Assistant</h1>
          <h2>Your personal productivity workspace</h2>

          <div className="login-purpose">
            <p>Sparklane helps you organize your day in one place.</p>
            <p>Connect Google Calendar to view and create events, track your time, manage to-dos, and keep your personal budget organized.</p>
          </div>
          

          <div className="google-login-button">
            <Button 
              variant="primary" 
              size="lg"
              onClick={handleGoogleLogin}
            >
              Sign in with Google
            </Button>
          </div>

          <i>Free to use for individuals aged 18 and over.</i>
          <p>If you would like to use Sparklane Personal Assistant, <a href="mailto:emma@sparklane.dev">please let me know!</a></p>
        </section>
      </main>
    </div>
  );
};

export default Login;
