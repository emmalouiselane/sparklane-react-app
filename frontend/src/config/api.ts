export const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://sparklane-react-app-backend.up.railway.app'
    : 'http://localhost:5000');
