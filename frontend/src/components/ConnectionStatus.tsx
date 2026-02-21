import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { useAuthContext } from '../contexts/AuthContext';

import { Plug, PlugFill } from 'react-bootstrap-icons';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function ConnectionStatus() {
  const { isAuthenticated, setError } = useAuthContext();
  const [dataConnection, setDataConnection] = useState<any | null>(null);

  const fetchDataConnection = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/`);
      setDataConnection(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data from the server');
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDataConnection();
    }
  }, [isAuthenticated]);

  return (
    <>
        {dataConnection ? 
        <PlugFill className="connection-status connected" /> : 
        <Plug className="connection-status disconnected" />}
    </>
  );
}

export default ConnectionStatus;
