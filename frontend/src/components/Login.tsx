import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import './Login.css';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      
      // Send user info to backend to create session
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/auth/google/success`, {
        token: credentialResponse.credential,
        user: decoded
      }, { withCredentials: true });

      onLoginSuccess(response.data.user);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleGoogleError = () => {
    console.error('Google Login Failed');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome to Sparklane Personal Assistant</h2>
        <p>Please sign in to continue</p>
        
        <div className="google-login-button">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
