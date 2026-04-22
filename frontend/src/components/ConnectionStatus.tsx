import React, { useCallback, useEffect, useState } from 'react';

import { useAuthContext } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import { apiClient } from '../helpers/auth';

import { ArrowClockwise, ExclamationTriangleFill, Plug, PlugFill } from 'react-bootstrap-icons';

type ConnectionState = 'connected' | 'calendar-warning' | 'disconnected';

function ConnectionStatus() {
  const { isAuthenticated, setError } = useAuthContext();
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  const handleReauthenticate = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const fetchDataConnection = useCallback(async () => {
    try {
      await apiClient.get('/api/');

      try {
        await apiClient.get('/api/calendar/events');
        setConnectionState('connected');
        setError(null);
      } catch (calendarError: any) {
        setConnectionState('calendar-warning');
        setError(null);
        console.error('Google Calendar connection issue:', calendarError);
      }
    } catch (err) {
      setConnectionState('disconnected');
      setError('Failed to fetch data from the server');
      console.error('Error fetching data:', err);
    }
  }, [setError]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDataConnection();
      return;
    }

    setConnectionState('disconnected');
  }, [fetchDataConnection, isAuthenticated]);

  return (
    <div className="connection-status-group">
      {connectionState === 'connected' && (
        <span className="connection-status-indicator connection-status-pill connected" title="Server and Google Calendar connected">
          <PlugFill className="connection-status" />
          <span>Connected</span>
        </span>
      )}

      {connectionState === 'calendar-warning' && (
        <>
          <span
            className="connection-status-indicator connection-status-pill calendar-warning"
            title="Server connected, but Google Calendar needs reauthentication"
          >
            <ExclamationTriangleFill className="connection-status" />
            <span>Calendar Needs Attention</span>
          </span>
          <button type="button" className="reauth-btn" onClick={handleReauthenticate}>
            <ArrowClockwise size={14} />
            <span>Reauthenticate</span>
          </button>
        </>
      )}

      {connectionState === 'disconnected' && (
        <span className="connection-status-indicator connection-status-pill disconnected" title="Unable to connect to the server">
          <Plug className="connection-status" />
          <span>Disconnected</span>
        </span>
      )}
    </div>
  );
}

export default ConnectionStatus;
