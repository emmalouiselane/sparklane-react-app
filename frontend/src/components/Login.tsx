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

          <div className="login-data-use">
            <h3>How we use your Google data</h3>
            <p>Google profile information is used to sign you in and identify your account. </p>
            <p>With your permission, Google Calendar data is used only to display your upcoming events and create events you request. </p>
            <p>We do not sell your Google data or use it for advertising. </p>
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
