import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Card, Spinner } from 'react-bootstrap';
import { CalendarWeek, GeoAlt, Lock } from 'react-bootstrap-icons';

import { apiClient } from '../helpers/auth';
import { toInputDate } from '../helpers/helper';
import { useRefreshOnPageActivation } from '../helpers/page-refresh';
import { useAuthContext } from '../contexts/auth-context';
import TodoList from '../components/todo-list';

import '../assets/styles/planner-sections.css';

type ModuleTarget = 'time-logs' | 'recurring-routines' | 'meal-planner' | 'account-settings';
type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  status: string;
};

function localDateKey(value: CalendarEvent['start']) {
  if (value.date) return value.date.slice(0, 10);
  if (value.dateTime) return toInputDate(new Date(value.dateTime));
  return '';
}

function eventTime(event: CalendarEvent) {
  if (event.start.date) return 'All day';
  if (!event.start.dateTime) return 'Time not set';
  return new Date(event.start.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function MyWeekPage({ onSelectModule, timeLogsEnabled = false, habitsEnabled = false, mealsEnabled = false }: {
  onSelectModule?: (module: ModuleTarget) => void;
  timeLogsEnabled?: boolean;
  habitsEnabled?: boolean;
  mealsEnabled?: boolean;
}) {
  const { user, checkAuthStatus } = useAuthContext();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const weekStart = useMemo(() => {
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    return start;
  // The week is intentionally anchored when the page mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  }), [weekStart]);
  const [selectedDate, setSelectedDate] = useState(toInputDate(today));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [intention, setIntention] = useState(() => user?.weeklyIntention || '');
  const [isSavingIntention, setIsSavingIntention] = useState(false);
  const [intentionSaveError, setIntentionSaveError] = useState(false);
  const intentionSaveBlocked = isSavingIntention || intentionSaveError;
  const savedIntentionRef = useRef(user?.weeklyIntention || '');
  const intentionValueRef = useRef(intention);
  const hasLocalIntentionEdit = useRef(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const hasLoadedCalendar = useRef(false);
  useRefreshOnPageActivation('my-week', () => setRefreshTick(current => current + 1));

  useEffect(() => {
    const remoteIntention = user?.weeklyIntention || '';
    if (!hasLocalIntentionEdit.current) {
      savedIntentionRef.current = remoteIntention;
      intentionValueRef.current = remoteIntention;
      setIntention(remoteIntention);
    }
  }, [user?.weeklyIntention]);

  useEffect(() => {
    if (intentionSaveBlocked || intention === savedIntentionRef.current) return undefined;
    const valueToSave = intention;
    const timer = window.setTimeout(async () => {
      setIsSavingIntention(true);
      setIntentionSaveError(false);
      try {
        const response = await apiClient.patch('/auth/preferences', { weeklyIntention: valueToSave });
        const savedValue = response.data.user?.weeklyIntention ?? valueToSave;
        savedIntentionRef.current = savedValue;
        if (intentionValueRef.current === valueToSave) hasLocalIntentionEdit.current = false;
        await checkAuthStatus();
      } catch {
        setIntentionSaveError(true);
      } finally {
        setIsSavingIntention(false);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [intention, intentionSaveBlocked, checkAuthStatus]);

  useEffect(() => {
    let active = true;
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    if (!hasLoadedCalendar.current) setLoading(true);
    setLoadError('');
    apiClient.get('/api/calendar/events', { params: { timeMin: weekStart.toISOString(), timeMax: end.toISOString() } })
      .then(response => { if (active) setEvents(response.data.events || []); })
      .catch(error => {
        if (!active) return;
        setLoadError(error.response?.status === 401
          ? 'Reconnect Google Calendar in Account Settings to see your calendar priorities.'
          : 'Calendar priorities could not be loaded. Please try again later.');
      })
      .finally(() => { if (active) { hasLoadedCalendar.current = true; setLoading(false); } });
    return () => { active = false; };
  }, [weekStart, refreshTick]);

  const selectedDay = days.find(day => toInputDate(day) === selectedDate) || today;
  const dayEvents = events
    .filter(event => event.status !== 'cancelled' && localDateKey(event.start) === selectedDate)
    .sort((a, b) => (a.start.dateTime || a.start.date || '').localeCompare(b.start.dateTime || b.start.date || ''));

  const updateIntention = (value: string) => {
    intentionValueRef.current = value;
    hasLocalIntentionEdit.current = true;
    setIntention(value);
    setIntentionSaveError(false);
  };

  return <section className="page-container planner-section-page my-week-page" aria-labelledby="my-week-heading">
    <div className="page-heading"><div><span className="page-eyebrow">A flexible little overview</span><h1 id="my-week-heading">Your week, at a glance</h1><p>A flexible little overview. Plans can change, and that’s okay.</p></div><CalendarWeek size={34} aria-hidden="true" /></div>
    <div className="planner-week-strip" role="group" aria-label="Days of this week">
      {days.map(day => {
        const key = toInputDate(day);
        const isToday = key === toInputDate(today);
        const isSelected = key === selectedDate;
        return <button type="button" className={`planner-week-day${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}`} key={key} onClick={() => setSelectedDate(key)} aria-pressed={isSelected} aria-current={isToday ? 'date' : undefined}>
          <span>{day.toLocaleDateString('en-GB', { weekday: 'short' })}</span><strong>{day.getDate()}</strong>
        </button>;
      })}
    </div>

    <div className="my-week-focus-grid">
      <div className="my-week-agenda-column">
      <Card className="my-week-priorities">
        <Card.Header><div><span className="page-eyebrow">{selectedDate === toInputDate(today) ? 'Your day, at your pace' : 'A day at your pace'}</span><Card.Title as="h2">Priorities for {selectedDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Card.Title><p>Calendar commitments to keep in mind.</p></div></Card.Header>
        <Card.Body>
          {loading && <div className="my-week-loading"><Spinner animation="border" size="sm" role="status"><span className="visually-hidden">Loading calendar priorities</span></Spinner><span>Loading calendar priorities…</span></div>}
          {!loading && loadError && <Alert variant="light" className="my-week-calendar-error">{loadError}</Alert>}
          {!loading && !loadError && dayEvents.length === 0 && <div className="my-week-empty"><strong>No calendar priorities on this day</strong><span>Space to focus, rest, or change your plans.</span></div>}
          {!loading && !loadError && dayEvents.length > 0 && <ul className="my-week-event-list">
            {dayEvents.map(event => <li className="my-week-event" key={event.id}>
              <span className="my-week-event-mark" aria-hidden="true"><CalendarWeek /></span>
              <div className="my-week-event-copy"><strong>{event.title || 'Calendar event'}</strong><span>{eventTime(event)}{event.location ? <> <span aria-hidden="true">·</span> <GeoAlt aria-hidden="true" /> {event.location}</> : null}</span></div>
              <span className="my-week-priority-badge"><Lock aria-hidden="true" /> Priority</span>
            </li>)}
          </ul>}
          <p className="my-week-readonly-note"><Lock aria-hidden="true" /> Calendar priorities are read-only.</p>
        </Card.Body>
      </Card>

      <Card className="my-week-intention">
        <Card.Body><span className="page-eyebrow">A little direction</span><Card.Title as="h2">Weekly intention</Card.Title><p>What would make this week feel good?</p>
          <label htmlFor="weekly-intention">Your intention</label>
          <textarea id="weekly-intention" value={intention} maxLength={160} onChange={event => updateIntention(event.target.value)} placeholder="This week, I want to make room for…" />
          <small aria-live="polite">{isSavingIntention ? 'Saving…' : intentionSaveError ? 'Could not save. Please try editing again.' : 'A gentle intention, not another rule.'}</small>
        </Card.Body>
      </Card>
      </div>
      <TodoList pageModuleId="my-week" eyebrow="One thing at a time" heading="Your to-do list" subtitle="Edit a task directly or add something new" inlineEditing showAddButton={false} selectedDate={selectedDate} />
    </div>
  </section>;
}

export default MyWeekPage;
