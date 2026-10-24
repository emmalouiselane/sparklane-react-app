import { FormEvent, useState } from 'react';
import { Check, CupHot, ForkKnife, MoonStars, Sun, X } from 'react-bootstrap-icons';
import { useMealPlan } from '../hooks/use-meal-plan';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function MealPlanner() {
  const { plan, setPlan, loading, loadError, reloadPlan } = useMealPlan('meal-planner');
  const [newTask, setNewTask] = useState('');

  const days = Array.from({ length: 7 }, (_, index) => {
    const key = `day-${index + 1}`;
    const weekday = plan.dayWeekdays?.[key] ?? ((plan.startDay ?? 0) + index) % 7;
    return { key, label: weekdays[weekday] };
  });

  const resetTasks = plan.homeReset || [];
  const updateMeal = (key: string, value: string) => setPlan(current => ({ ...current, meals: { ...current.meals, [key]: value } }));
  const setHomeReset = (tasks: typeof resetTasks) => setPlan(current => ({ ...current, homeReset: tasks }));
  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = newTask.trim();
    if (!text) 
      return;

    setHomeReset([...resetTasks, { id: `${Date.now()}-${Math.random()}`, text, done: false }]);
    setNewTask('');
  };

  if (loading) 
    return <div className="meal-home-content" role="status">Loading your meals and home reset…</div>;

  if (loadError) 
    return <div className="meal-home-content"><p role="alert">Your meals and home reset couldn’t load.</p><button type="button" onClick={reloadPlan}>Try again</button></div>;

  return (
    <div className="meal-home-content">
      <header className="page-heading meal-home-page-header">
        <div>
          <span className="page-eyebrow">A little space for you</span>
          <h1 id="meal-home-heading">Meals &amp; home</h1>
          <p>Make the everyday feel a little easier.</p>
        </div>
        <ForkKnife size={34} aria-hidden="true" />
      </header>
      <section className="meal-home-card" aria-labelledby="on-menu-title">
        <header className="meal-home-card-header">
          <div>
            <h2 id="on-menu-title">On the menu</h2>
            <p>Edit your meal plan for the week</p>
          </div>
        </header>
        <div className="meal-home-meal-list">
          {days.map(({ key, label }, index) => (
            <div className="meal-home-row" key={key}>
              <span className="meal-home-icon">
                <MoonStars aria-hidden="true" />
              </span>
              <label htmlFor={`meal-home-${key}`}>{label} dinner</label>
              <input id={`meal-home-${key}`} value={plan.meals[key] || ''} maxLength={200} placeholder="Add a meal idea" onChange={event => updateMeal(key, event.target.value)} />
              <button className="meal-home-icon-button" type="button" disabled={!plan.meals[key]} aria-label={`Clear ${label} dinner`} onClick={() => updateMeal(key, '')}><X aria-hidden="true" /></button>
            </div>
          ))}
        </div>
        <p className="meal-home-footnote">Repeats, leftovers and easy meals all count.</p>
      </section>

      <div className="meal-home-side-column">
        <section className="meal-home-card" aria-labelledby="home-reset-title">
          <header className="meal-home-card-header">
            <div>
              <h2 id="home-reset-title">A small home reset</h2>
              <p>Choose what helps today</p>
            </div>
          </header>
          <div className="home-reset-list">
            {resetTasks.length ? resetTasks.map(task => <div className={`home-reset-row${task.done ? ' is-done' : ''}`} key={task.id}>
              <button className="home-reset-check" type="button" aria-pressed={task.done} aria-label={`${task.done ? 'Mark incomplete' : 'Complete'}: ${task.text}`} onClick={() => setHomeReset(resetTasks.map(item => item.id === task.id ? { ...item, done: !item.done } : item))}>{task.done && <Check aria-hidden="true" />}</button>
              <input aria-label="Home task" maxLength={100} value={task.text} onChange={event => setHomeReset(resetTasks.map(item => item.id === task.id ? { ...item, text: event.target.value } : item))} />
              <button className="meal-home-icon-button" type="button" aria-label={`Remove ${task.text}`} onClick={() => setHomeReset(resetTasks.filter(item => item.id !== task.id))}>
                <X aria-hidden="true" />
              </button>
            </div>) : 
              <p className="meal-home-empty">No home tasks yet.</p>
            }
          </div>
          <form className="home-reset-add" onSubmit={addTask}>
            <label className="visually-hidden" htmlFor="home-reset-new-task">New home task</label>
            <input id="home-reset-new-task" value={newTask} maxLength={100} placeholder="Add a home task…" onChange={event => setNewTask(event.target.value)} />
            <button type="submit" disabled={!newTask.trim()}>＋ Add</button>
          </form>
        </section>

        <section className="meal-home-card" aria-labelledby="breakfast-lunch-title">
          <header className="meal-home-card-header">
            <div><h2 id="breakfast-lunch-title">Breakfast &amp; lunch (optional)</h2><p>Add ideas here if they’re useful</p></div>
          </header>
          <div className="meal-home-meal-list">
            <div className="meal-home-row optional-meal-row">
              <span className="meal-home-icon">
                <CupHot aria-hidden="true" />
              </span>
              <label htmlFor="meal-home-breakfast">Usual breakfast</label>
              <input id="meal-home-breakfast" value={plan.breakfast || ''} maxLength={200} placeholder="Add a breakfast idea" onChange={event => setPlan(current => ({ ...current, breakfast: event.target.value }))} />
            </div>
            <div className="meal-home-row optional-meal-row">
              <span className="meal-home-icon">
                <Sun aria-hidden="true" />
              </span>
              <label htmlFor="meal-home-lunch">Usual lunch</label>
              <input id="meal-home-lunch" value={plan.lunch || ''} maxLength={200} placeholder="Add a lunch idea" onChange={event => setPlan(current => ({ ...current, lunch: event.target.value }))} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default MealPlanner;
