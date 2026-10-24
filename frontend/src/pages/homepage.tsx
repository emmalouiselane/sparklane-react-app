import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { ArrowRight, House, CupHot, Sun, MoonStars, ChevronLeft, ChevronRight, Stars } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';

import TodoList from '../components/todo-list';
import RecurringRoutines from '../components/recurring-routines';
import { apiClient } from '../helpers/auth';
import { useMealPlan } from '../hooks/use-meal-plan';
import { getLocalDayBounds, toInputDate } from '../helpers/helper';
import { useRefreshOnPageActivation } from '../helpers/page-refresh';

import '../assets/styles/homepage.css';

type ModuleTarget = 'my-week' | 'wellness' | 'recurring-routines' | 'meal-planner' | 'account-settings';
type Mood = 'Very low' | 'Low' | 'Okay' | 'Good' | 'Great';
interface HomepageProps {
  userId?: string;
  weeklyIntention?: string;
  enabledModuleCount?: number;
  onOpenModuleSettings?: () => void;
  routinesEnabled?: boolean;
  mealsEnabled?: boolean;
  onSelectModule?: (module: ModuleTarget) => void;
}

const MOODS: { label: Mood; face: string }[] = [
  { label: 'Very low', face: '😔' }, { label: 'Low', face: '😕' }, { label: 'Okay', face: '😐' }, { label: 'Good', face: '🙂' }, { label: 'Great', face: '☺️' },
];

function TodayMealsCard({ selectedDate, onOpen }: { selectedDate: Date; onOpen: () => void }) {
  const { plan, loading, loadError, reloadPlan } = useMealPlan('home');
  const weekday = (selectedDate.getDay() + 6) % 7;
  const todayMeal = Object.entries(plan.meals).find(([key, meal]) => {
    if (!meal.trim() || !/^day-[1-7]$/.test(key)) return false;
    const dayIndex = Number(key.slice(4)) - 1;
    return (plan.dayWeekdays?.[key] ?? ((plan.startDay ?? 0) + dayIndex) % 7) === weekday;
  })?.[1];

  const menu = [
    { label: 'Breakfast', value: plan.breakfast, Icon: CupHot },
    { label: 'Lunch', value: plan.lunch, Icon: Sun },
    { label: 'Dinner', value: todayMeal || plan.backup, Icon: MoonStars }
  ];

  return <Card className="today-feature-card meals-home-card today-menu-card">
    <Card.Header><div><Card.Title as="h2">On the menu</Card.Title><div className="today-menu-subtitle">A little plan for today</div></div><Button variant="link" className="today-header-link" onClick={onOpen}>Edit meals <ArrowRight aria-hidden="true" /></Button></Card.Header>
    <Card.Body>
      {loading ? <p className="today-menu-state">Loading today’s plan…</p> : loadError ? <div className="today-menu-state"><p>Your meal plan couldn’t load.</p><button type="button" className="today-text-link" onClick={reloadPlan}>Try again</button></div> : <div className="today-menu-rows">
        {menu.map(({ label, value, Icon }) => <div className="today-menu-row" key={label}>
          <span className="today-menu-icon"><Icon aria-hidden="true" /></span><div><span className="today-menu-name">{label}</span><span className="today-menu-plan">{value?.trim() || 'No meal planned'}</span></div>
        </div>)}
      </div>}
    </Card.Body>
  </Card>;
}

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function Homepage({ userId, weeklyIntention, enabledModuleCount, onOpenModuleSettings, routinesEnabled = false, mealsEnabled = false, onSelectModule }: HomepageProps) {
  const [now, setNow] = useState(() => new Date());
  const [dateOffset, setDateOffset] = useState(0);
  const todayKey = toInputDate(now);
  const selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dateOffset, 12, 0, 0, 0);
  const selectedDateKey = toInputDate(selectedDate);
  const isSelectedToday = selectedDateKey === todayKey;
  const isPastDate = selectedDateKey < todayKey;
  const [mood, setMood] = useState<Mood | null>(null);
  const [moodSaving, setMoodSaving] = useState(false);
  const loadTodayCheckIn = useCallback(() => {
    const dayBounds = getLocalDayBounds(new Date(`${todayKey}T12:00:00`));
    apiClient.get('/api/wellness/check-ins/today', { params: { dateKey: todayKey, ...dayBounds } })
      .then(response => setMood(response.data.entry?.mood || null))
      .catch(() => toast.error('Today’s wellness check-in could not be loaded.'));
  }, [todayKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const dayBounds = getLocalDayBounds(new Date(`${todayKey}T12:00:00`));
    apiClient.get('/api/wellness/check-ins/today', { params: { dateKey: todayKey, ...dayBounds } })
      .then(response => { if (active) setMood(response.data.entry?.mood || null); })
      .catch(() => { if (active) toast.error('Today’s wellness check-in could not be loaded.'); });
    return () => { active = false; };
  }, [todayKey, userId]);
  useRefreshOnPageActivation('home', loadTodayCheckIn);

  const chooseMood = async (nextMood: Mood) => {
    if (moodSaving) return;
    const previousMood = mood;
    setMood(nextMood);
    setMoodSaving(true);
    try {
      await apiClient.post('/api/wellness/check-ins', {
        mood: nextMood,
        dateKey: todayKey,
        ...getLocalDayBounds(now)
      });
    } catch {
      setMood(previousMood);
      toast.error('Your wellness check-in could not be saved. Please try again.');
    } finally {
      setMoodSaving(false);
    }
  };

  return <section className="page-container today-page" aria-label="Today page">
    <header className="page-heading today-heading">
      <div><span className="page-eyebrow">A little space for you</span>
        <h1 id="today-page-heading">{greetingForHour(now.getHours())} <Stars aria-hidden="true" className="today-heading-spark" /></h1>
        <p>You don’t have to do it all. Just start where you are.</p>
      </div>
      <div className="today-date-controls" role="group" aria-label="Choose planner day">
        <button type="button" aria-label="Previous day" onClick={() => setDateOffset(offset => offset - 1)}><ChevronLeft aria-hidden="true" /></button>
        <span>{selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <button type="button" aria-label="Next day" onClick={() => setDateOffset(offset => offset + 1)}><ChevronRight aria-hidden="true" /></button>
      </div>
    </header>

    {enabledModuleCount === 0 && <section className="module-guidance" aria-labelledby="module-guidance-title">
      <div><h2 id="module-guidance-title">Choose the modules you want to use</h2><p>All optional modules are currently off. Open Account Settings to see what is available.</p></div>
      <button type="button" onClick={onOpenModuleSettings}>Manage modules</button>
    </section>}

    <section className="page-hero today-hero" aria-label={isSelectedToday ? 'Today' : selectedDate.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}>
      <div><div className="page-eyebrow">Your day, at your pace</div><h2>{isSelectedToday ? 'Make room for what matters.' : isPastDate ? 'Take a moment to notice what mattered.' : 'A fresh day to begin again.'}</h2>
        <p>{selectedDate.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })} <span aria-hidden="true">·</span> One thing at a time is plenty.</p>
      </div>
      <div className="today-date"><span>{selectedDate.toLocaleDateString('en-GB', { month: 'short' })}</span><strong>{selectedDate.getDate()}</strong><span>{selectedDate.toLocaleDateString('en-GB', { weekday: 'short' })}</span></div>
      <img src="/images/pressed-sprig.svg" alt="" aria-hidden="true" className="header-botanical" />
    </section>

    <div className="today-grid">
      <section className="weekly-intention" aria-label="Weekly intention">
        <div>
          <p>{weeklyIntention?.trim() || 'Take things one step at a time.'}</p>
        </div>
      </section>
      <div className="today-column"><TodoList pageModuleId="home" includeCalendarEvents showAddButton={false} selectedDate={selectedDateKey} onManageTasks={() => onSelectModule?.('my-week')} />
        {mealsEnabled ? <TodayMealsCard selectedDate={selectedDate} onOpen={() => onSelectModule?.('meal-planner')} /> : <Card className="today-feature-card meals-home-card"><Card.Body>
          <div className="today-card-icon"><House aria-hidden="true" /></div>
          <div className="today-meals-content"><Card.Title as="h2">Meals &amp; Home</Card.Title><p>Make everyday planning feel a little easier.</p></div>
          <Button variant="outline-primary" onClick={() => onOpenModuleSettings?.()}>Enable in settings <ArrowRight aria-hidden="true" /></Button>
        </Card.Body></Card>}
      </div>
      <div className="today-column">
        <Card className="today-feature-card wellness-card today-menu-card">
          <Card.Header><div><Card.Title as="h2">How are you feeling today?</Card.Title><div className="today-menu-subtitle">No right answer. Just notice.</div></div><Button variant="link" className="today-header-link" onClick={() => onSelectModule?.('wellness')}>Open wellness <ArrowRight aria-hidden="true" /></Button></Card.Header>
          <Card.Body>
            <div className="today-mood-options" role="group" aria-label="Choose how you feel today">
              {MOODS.map(option => <button type="button" key={option.label} aria-label={option.label} aria-pressed={mood === option.label} disabled={moodSaving} onClick={() => chooseMood(option.label)}>{option.face}<span>{option.label}</span></button>)}
            </div>
          </Card.Body>
        </Card>
        {routinesEnabled ? <RecurringRoutines todayOnly onViewHabits={() => onSelectModule?.('recurring-routines')} /> : <Card className="today-feature-card"><Card.Body>
          <Card.Title as="h2">Habits</Card.Title><p>Build gentle routines with small, repeatable checklists.</p>
          <Button variant="outline-primary" onClick={() => onOpenModuleSettings?.()}>Enable habits</Button>
        </Card.Body></Card>}
      </div>
    </div>
  </section>;
}

export default Homepage;
