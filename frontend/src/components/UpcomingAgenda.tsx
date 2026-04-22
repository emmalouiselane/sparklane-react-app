import React, { useState, useEffect, useCallback } from 'react';
import { Card, ListGroup, Badge, Spinner, Alert, Modal, Form, Button } from 'react-bootstrap';
import { Calendar3, Clock, GeoAlt, Plus, X } from 'react-bootstrap-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { getAuthConfig, getAuthToken } from '../helpers/auth';
import { formatAgendaDateTime } from '../helpers/helper';

import './UpcomingAgenda.css';
import dayjs from 'dayjs';

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
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = '/api/calendar/events';
      const token = getAuthToken();
      
      if (!token) {
        setError('Please log in to view calendar events');
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, getAuthConfig(token));
      
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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please log in to create events');
        return;
      }

      await axios.post(`${API_BASE_URL}/api/calendar/events`, formData, getAuthConfig(token));

      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        location: ''
      });
      setShowModal(false);
      
      // Refresh events list
      fetchEvents();
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError('Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'startTime') {
      const startTime = dayjs(value);
      const endTime = startTime.add(30, 'minute').format('YYYY-MM-DDTHH:mm:ss');

      setFormData(prev => ({
        ...prev,
        startTime: value,
        endTime: endTime
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      location: ''
    });
    setShowModal(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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
        <div className="agenda-header">
          <div className="agenda-header-left">
            <Calendar3 />
            <Card.Title>
              Upcoming Events
            </Card.Title>
          </div>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => setShowModal(true)}
            className="quick-add-btn"
          >
            <Plus size={16} />
            Quick Add
          </Button>
        </div>
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
                        <p>{formatAgendaDateTime(event.start)}</p>
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

      {/* Quick Add Event Modal */}
      <Modal show={showModal} onHide={resetForm} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <Plus size={20} className="me-2" />
            Quick Add Event
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateEvent}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Event Title *</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter event title"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter event description (optional)"
                rows={3}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Start Time *</Form.Label>
              <Form.Control
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>End Time *</Form.Label>
              <Form.Control
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              <Form.Control
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter event location (optional)"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={resetForm}>
              <X size={16} className="me-1" />
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} className="me-1" />
                  Create Event
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
};

export default UpcomingAgenda;
