import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { useAuthContext } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';

import { Plug, PlugFill } from 'react-bootstrap-icons';

function ConnectionStatus() {
  const { isAuthenticated, setError } = useAuthContext();
  const [dataConnection, setDataConnection] = useState<any | null>(null);

  const fetchDataConnection = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/`, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });
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
