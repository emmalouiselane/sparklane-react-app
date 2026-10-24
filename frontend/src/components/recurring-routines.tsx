import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { ArrowRepeat, ArrowRight, Plus, Trash3, Stars } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';

import { apiClient } from '../helpers/auth';
import { getWeekStart, toInputDate } from '../helpers/helper';
import { useRefreshOnPageActivation } from '../helpers/page-refresh';
import { Habit } from '../interfaces/Habit';

import '../assets/styles/recurring-routines.css';

interface Props { todayOnly?: boolean; onViewHabits?: () => void; }

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function weekKeysFor(date: Date) {
  const monday = getWeekStart(date);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(day.getDate() + index);
    return toInputDate(day);
  });
}

function currentStreak(checkInDates: string[] | null | undefined, today: Date) {
  if (!checkInDates?.length) 
    return 0;
  
  const checkIns = new Set(checkInDates);
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const dateKey = (date: Date) => toInputDate(date);
  
  if (!checkIns.has(dateKey(cursor))) 
    cursor.setDate(cursor.getDate() - 1);
  
  let streak = 0;
  while (checkIns.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function RecurringRoutines({ todayOnly = false, onViewHabits }: Props) {
  const [now, setNow] = useState(() => new Date());
  const todayIndex = (now.getDay() + 6) % 7;
  const [habits, setHabits] = useState<Habit[]>([]);
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const hasLoaded = useRef(false);
  const weekKeys = weekKeysFor(now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchHabits = useCallback(async () => {
    if (!hasLoaded.current) 
      setLoading(true);
    
    setError('');
    try {
      const response = await apiClient.get('/api/habits');
      const items: Habit[] = (response.data.habits || []).map((habit: Habit) => ({
        ...habit,
        days: Array.isArray(habit.checkInDates)
          ? weekKeysFor(new Date()).map(dateKey => habit.checkInDates!.includes(dateKey))
          : Array.from({ length: 7 }, (_, index) => habit.days?.[index] === true)
      }));
      setHabits(items);
      setNameDrafts(Object.fromEntries(items.map(habit => [habit._id, habit.name])));
    } catch {
      setError('Unable to load habits. Please try again.');
    } finally {
      hasLoaded.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);
  useRefreshOnPageActivation(todayOnly ? 'home' : 'recurring-routines', fetchHabits);

  const toggleDay = async (habit: Habit, dayIndex: number) => {
    const key = `${habit._id}:${dayIndex}`;
    if (busy[key]) 
      return;
    
    const completed = !habit.days[dayIndex];
    setBusy(current => ({ ...current, [key]: true }));
    try {
      const response = await apiClient.patch(`/api/habits/${habit._id}/days/${dayIndex}`, { completed, dateKey: weekKeys[dayIndex] });
      setHabits(current => current.map(item => item._id === habit._id ? {
        ...item,
        days: Array.isArray(response.data.habit.checkInDates)
          ? weekKeys.map(dateKey => response.data.habit.checkInDates.includes(dateKey))
          : response.data.habit.days,
        checkInDates: response.data.habit.checkInDates
      } : item));
    } catch {
      toast.error('Unable to update this check-in. Please try again.');
    } finally {
      setBusy(current => ({ ...current, [key]: false }));
    }
  };

  const renameHabit = async (habit: Habit) => {
    const name = (nameDrafts[habit._id] ?? habit.name).trim();
    if (!name) {
      setNameDrafts(current => ({ ...current, [habit._id]: habit.name }));
      toast.error('Please keep a name for this habit.');
      return;
    }
    if (name === habit.name) 
      return;

    try {
      const response = await apiClient.put(`/api/habits/${habit._id}`, { name });
      setHabits(current => current.map(item => item._id === habit._id ? { ...item, name: response.data.habit.name } : item));
      setNameDrafts(current => ({ ...current, [habit._id]: response.data.habit.name }));
    } catch {
      setNameDrafts(current => ({ ...current, [habit._id]: habit.name }));
      toast.error('Unable to rename this habit. Please try again.');
    }
  };

  const addHabit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name || adding) 
      return;

    setAdding(true);
    try {
      const response = await apiClient.post('/api/habits', { name });
      const habit: Habit = { ...response.data.habit, days: Array(7).fill(false) };
      setHabits(current => [...current, habit]);
      setNameDrafts(current => ({ ...current, [habit._id]: habit.name }));
      setNewName('');
    } catch {
      toast.error('Unable to add this habit. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const deleteHabit = async (habit: Habit) => {
    if (busy[habit._id]) 
      return;
    
    setBusy(current => ({ ...current, [habit._id]: true }));
    try {
      await apiClient.delete(`/api/habits/${habit._id}`);
      setHabits(current => current.filter(item => item._id !== habit._id));
    } catch {
      toast.error('Unable to delete this habit. Please try again.');
    } finally {
      setBusy(current => ({ ...current, [habit._id]: false }));
    }
  };

  const totalCheckIns = habits.reduce((total, habit) => total + habit.days.filter(Boolean).length, 0);

  return (
    <section className={todayOnly ? 'habits-today' : 'page-container habits-page'}>
      {!todayOnly && (
        <header className="page-heading">
          <div>
            <span className="page-eyebrow">A little space for you</span>
            <h1 id="habits-heading">Your gentle rhythms</h1>
            <p>Habits are little promises you can keep returning to.</p>
          </div>
          <ArrowRepeat size={34} aria-hidden="true" />
        </header>
      )}
      <div className={todayOnly ? undefined : 'habits-page-grid'}>
        <Card className="routines-card">
          <Card.Header className="routines-header">
            <div>
              <Card.Title as="h2">Little by little</Card.Title>
              <div className="habits-card-subtitle">Your habits this week</div>
            </div>
            {todayOnly && (
              <Button variant="link" className="habits-view-link today-header-link" onClick={onViewHabits}>
                View habits <ArrowRight aria-hidden="true" />
              </Button>
            )}
          </Card.Header>
          <Card.Body>
            {loading && (
              <div className="habits-loading" role="status">
                <Spinner size="sm" animation="border" /> Loading habits…
              </div>
            )}
            
            {error && (
              <Alert variant="warning">
                {error} <Button size="sm" onClick={fetchHabits}>Retry</Button>
              </Alert>
            )}
            
            {!loading && !error && habits.length === 0 && (
              <p className="habits-empty">
                {todayOnly ? 'Add a habit that feels right for you.' : 'Start with one small thing you’d like to do more often.'}
              </p>
            )}
            
            {!loading && !error && habits.map(habit => <section className="routine-item simple-habit-item" key={habit._id}>
              <div className="simple-habit-heading">
                {todayOnly ? 
                  <h3>{habit.name}</h3> : 
                  <Form.Control aria-label="Habit name" className="simple-habit-name" value={nameDrafts[habit._id] ?? habit.name} maxLength={120} onChange={event => setNameDrafts(current => ({ ...current, [habit._id]: event.target.value }))} onBlur={() => renameHabit(habit)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />}
                
                {!todayOnly && (
                  <Button variant="link" className="simple-habit-delete" aria-label={`Delete ${habit.name}`} onClick={() => deleteHabit(habit)} disabled={busy[habit._id]}>
                    <Trash3 aria-hidden="true" />
                  </Button>
                )}
              </div>
              <div className="habit-row-summary">
                <div className="habit-days" role="group" aria-label={`Weekly check-ins for ${habit.name}`}>
                  {DAYS.map((day, dayIndex) => <button type="button" key={dayIndex} className={`day-dot${habit.days[dayIndex] ? ' on' : ''}${todayIndex === dayIndex ? ' is-today' : ''}`} aria-label={`${habit.name}, ${FULL_DAYS[dayIndex]}: ${habit.days[dayIndex] ? 'done' : 'not done'}`} aria-pressed={habit.days[dayIndex]} disabled={busy[`${habit._id}:${dayIndex}`]} onClick={() => toggleDay(habit, dayIndex)}>{habit.days[dayIndex] ? '✓' : day}</button>)}
                </div>
                <span className="habit-streak">{habit.days.filter(Boolean).length} of 7 this week{!todayOnly && <span className="habit-current-streak"> · {currentStreak(habit.checkInDates, now)} day streak</span>}</span>
              </div>
            </section>)}
            {!todayOnly && (
              <Form className="simple-habit-add" onSubmit={addHabit}>
                <Form.Control aria-label="New habit name" value={newName} maxLength={120} placeholder="Add a habit…" onChange={event => setNewName(event.target.value)} />
                <Button type="submit" variant="outline-primary" disabled={!newName.trim() || adding}>
                  <Plus aria-hidden="true" /> Add
                </Button>
              </Form>
            )}
            {!loading && !error && (
              <div className="habits-card-footer">
                <span>Small steps count, too.</span>
                <span>{totalCheckIns} check-ins this week</span>
              </div>
            )}
          </Card.Body>
        </Card>
        {!todayOnly && (
          <aside className="habits-note-card">
            <div className="habits-note-spark" aria-hidden="true"><Stars /></div>
            <h2>A note to yourself</h2>
            <p>Consistency can be quiet. You’re building a rhythm that fits your life, one ordinary day at a time.</p>
            <div className="habits-note-foot">A gentle intention.</div>
          </aside>
        )}
      </div>
    </section>
  );
}
