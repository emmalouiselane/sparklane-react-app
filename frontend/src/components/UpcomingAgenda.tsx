import React, { useState, useEffect, useCallback } from 'react';
import { Card, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { Calendar3, Clock, GeoAlt } from 'react-bootstrap-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

import './UpcomingAgenda.css';

interface Event {
  id: string;
  title: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  status: string;
}

interface UpcomingAgendaProps {
}

const UpcomingAgenda: React.FC<UpcomingAgendaProps> = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = '/api/calendar/events';
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, { 
        withCredentials: true 
      });
      
      setEvents(response.data.events.slice(0, 5));
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Something went wrong, try logging out and back in again.');
      } else {
        setError('Failed to fetch calendar events');
      }
      console.error('Calendar fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const formatDateTime = (dateTime: { dateTime?: string; date?: string }) => {
    if (dateTime.dateTime) {
      const date = new Date(dateTime.dateTime);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (dateTime.date) {
      const date = new Date(dateTime.date);
      return date.toLocaleDateString() + ' (All day)';
    }
    return "No date available";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge bg="success">Confirmed</Badge>;
      case 'tentative':
        return <Badge bg="warning">Tentative</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card className="agenda-card">
      <Card.Header>
        <Calendar3 />
        <Card.Title>
          Upcoming Events
        </Card.Title>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="warning">
            <Calendar3 />
            {error ?? 'Sorry! Something went wrong, try again later.'}
          </Alert>
        )}

        {loading && (
          <div className='loading-container'>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading calendar...</span>
            </Spinner>
            <p>Loading upcoming events...</p>
          </div>
        )}

        {!error && !loading && events.length === 0 && (
          <div className="no-events">
            <Calendar3 size={48} />
            <h2>No upcoming events</h2>
            <p>Time to relax!</p>
            <p>Your calendar is clear for the next 7 days.</p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <ListGroup variant="flush">
            {events.map((event) => {
              return (
                <ListGroup.Item key={event.id} className="agenda-event-wrapper">
                  <div className="agenda-event">
                    <div className="agenda-event-info-col-1">
                      <h6 className="agenda-title">{event.title}</h6>
                      <p className="description">{event.description ?? 'No description'}</p>
                      <div className="agenda-location">
                        <GeoAlt size={14} />
                        {event.location || 'No location' }
                      </div>
                    </div>
                    <div className="agenda-event-info-col-2">
                      <div className="agenda-time">
                        <Clock size={12} />
                        <p>{formatDateTime(event.start)}</p>                        
                      </div>
                      {getStatusBadge(event.status)}
                    </div>
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
};

export default UpcomingAgenda;
