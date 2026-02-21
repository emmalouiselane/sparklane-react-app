import React from 'react';
import { Button } from 'react-bootstrap';
import { API_BASE_URL } from '../config/api';

import './Login.css';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const handleGoogleLogin = () => {
    // Redirect to Google OAuth on the backend
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <div className="login-container">
      <main role="main">
        <section className="login-card">
          <h1>Welcome!</h1>
          <h2>Spark Lane Dev ~ Personal Assistant</h2>
          
          <div className="google-login-button">
            <Button 
              variant="primary" 
              size="lg"
              onClick={handleGoogleLogin}
              className="w-100"
            >
              Sign in with Google
            </Button>
          </div>

          <i>The tools I build are available to all.</i>
          <p>If you would like access to this Personal Assistant or have any feedback, <a href="mailto:emma@sparklane.dev">please let me know</a></p>
        </section>
      </main>
    </div>
  );
};

export default Login;
