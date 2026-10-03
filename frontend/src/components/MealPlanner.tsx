import { useState } from 'react';
import { X } from 'react-bootstrap-icons';
import { useMealPlan } from '../hooks/useMealPlan';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function MealPlanner() {
    const { plan, setPlan, loading, loadError, saving, saveError, unsaved, retrySave, reloadPlan } = useMealPlan();
    const [newItem, setNewItem] = useState('');
    const days = Array.from({ length: 7 }, (_, index) => {
        const key = `day-${index + 1}`;
        const weekday = plan.dayWeekdays?.[key] ?? ((plan.startDay ?? 0) + index) % 7;
        return { key, weekday, label: weekdays[weekday] };
    });

    const setMeal = (key: string, meal: string) => setPlan(current => ({ ...current, meals: { ...current.meals, [key]: meal } }));
    const remaining = plan.shopping.filter(item => !item.checked).length;
    const nextEmptyDay = days.find(day => !plan.meals[day.key]?.trim());
    const plannedCount = days.filter(day => plan.meals[day.key]?.trim()).length;
    const addToWeek = (meal: string) => {
        if (nextEmptyDay) setMeal(nextEmptyDay.key, meal);
    };

    if (loading) return <section className="meal-card" role="status">Loading your meal plan…</section>;
    if (loadError) return <section className="meal-card"><p role="alert">Your plan couldn’t load. Try again to get your saved meals.</p><button type="button" onClick={reloadPlan}>Try again</button></section>;

    return (
        <section id="meal-planner" className="simple-meal-planner" aria-labelledby="meal-planner-title">
            <header>
                <h2 id="meal-planner-title">Meal planner</h2>
                <p>Plan seven days, starting whenever you like, then shop for what you need. Repeats, leftovers and easy meals all count.</p>
                {(saveError || saving || unsaved) && <p className="meal-save-status" role="status">{saveError === 'conflict' ? 'Your plan changed on another device. Copy any changes you want to keep, then reload the saved plan.' : saveError ? 'Couldn’t save. Your changes are still here. Retry before leaving this page.' : 'Saving your changes…'}</p>}
                {saveError && <button type="button" onClick={saveError === 'conflict' ? reloadPlan : retrySave}>{saveError === 'conflict' ? 'Reload saved plan (replaces these edits)' : 'Retry saving'}</button>}
            </header>

            <section className="meal-card" aria-labelledby="dinner-title">
                <div className="meal-section-heading">
                    <h3 id="dinner-title">Your seven-day dinner plan</h3>
                    <span aria-live="polite">{plannedCount} of 7 planned</span>
                </div>
                {nextEmptyDay && <div className="meal-quick-picks">
                    <p>Need an idea? Add one to {nextEmptyDay.label}:</p>
                    <div className="meal-actions">{['Beans on toast', 'Pasta', 'Soup and bread'].map(meal => <button type="button" key={meal} onClick={() => addToWeek(meal)}>{meal}</button>)}</div>
                </div>}
                <p className="meal-hint">Choose one dinner for each day. Use repeats to make the week easier.</p>
                <div className="meal-days">
                    {days.map((day, index) => (
                        <div key={day.key} className="meal-day">
                            <div className="meal-dinner-entry">
                                <label htmlFor={`dinner-${day.key}`}>Day {index + 1}</label>
                                <select aria-label={`Day ${index + 1} weekday`} value={day.weekday} onChange={event => {
                                    const weekday = Number(event.target.value);
                                    setPlan(current => ({ ...current, dayWeekdays: { ...current.dayWeekdays, [day.key]: weekday } }));
                                }}>
                                    {weekdays.map((weekday, weekdayIndex) => <option key={weekday} value={weekdayIndex}>{weekday}</option>)}
                                </select>
                                <input id={`dinner-${day.key}`} value={plan.meals[day.key] || ''} placeholder="e.g. pasta, leftovers or beans on toast" maxLength={200} onChange={event => setMeal(day.key, event.target.value)} />
                                <div className="meal-line-actions">
                                    {index > 0 && <button type="button" disabled={!plan.meals[days[index - 1].key]} aria-label={`Repeat previous dinner for Day ${index + 1} (${day.label})`} onClick={() => setMeal(day.key, plan.meals[days[index - 1].key])}>Repeat previous</button>}
                                    <span className="meal-clear-control">
                                        <button type="button" disabled={!plan.meals[day.key]} aria-label={`Clear dinner for Day ${index + 1} (${day.label})`} aria-describedby={`clear-tooltip-${day.key}`} onClick={() => setMeal(day.key, '')}><X size={20} aria-hidden="true" /><span className="meal-clear-label">Clear</span></button>
                                        <span className="meal-clear-tooltip" id={`clear-tooltip-${day.key}`} role="tooltip">Clear dinner</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="meal-card meal-backup" aria-labelledby="backup-title">
                <h3 id="backup-title">An easy backup</h3>
                <p className="meal-hint">For days when cooking feels like too much.</p>
                <label htmlFor="backup-meal">Your go-to meal</label>
                <input id="backup-meal" value={plan.backup} placeholder="e.g. frozen meal, toast or a favourite takeaway" maxLength={200} onChange={event => setPlan(current => ({ ...current, backup: event.target.value }))} />
                {plan.backup && <button type="button" disabled={!nextEmptyDay} onClick={() => addToWeek(plan.backup)}>Add to next empty day</button>}
            </section>

            <section className="meal-card meal-repeat-options" aria-labelledby="breakfast-lunch-title">
                <h3 id="breakfast-lunch-title">Breakfast &amp; lunch <span className="meal-hint">(optional)</span></h3>
                <p className="meal-hint">Choose something you’re happy to repeat. No daily planning needed.</p>
                <label htmlFor="repeat-breakfast">Usual breakfast</label>
                <input id="repeat-breakfast" value={plan.breakfast} placeholder="e.g. yoghurt and cereal" maxLength={200} onChange={event => setPlan(current => ({ ...current, breakfast: event.target.value }))} />
                <label htmlFor="repeat-lunch">Usual lunch</label>
                <input id="repeat-lunch" value={plan.lunch} placeholder="e.g. sandwiches or dinner leftovers" maxLength={200} onChange={event => setPlan(current => ({ ...current, lunch: event.target.value }))} />
            </section>

            <details className="meal-card meal-shopping-accordion">
                <summary><span id="shopping-title">Shopping list</span><span className="meal-shopping-count" aria-live="polite">{remaining} to get</span></summary>
                <div className="meal-shopping-content">
                <p className="meal-hint">Check what you already have, then add just what you need.</p>
                <form className="meal-shopping-form" onSubmit={event => {
                    event.preventDefault();
                    const name = newItem.trim();
                    if (!name) return;
                    setPlan(current => ({ ...current, shopping: [...current.shopping, { id: `${Date.now()}-${Math.random()}`, name, checked: false }] }));
                    setNewItem('');
                }}>
                    <label htmlFor="shopping-item">Add an item</label>
                    <div className="meal-day-entry"><input id="shopping-item" value={newItem} maxLength={200} placeholder="e.g. bread" onChange={event => setNewItem(event.target.value)} /><button type="submit" disabled={!newItem.trim()}>Add</button></div>
                </form>
                {plan.shopping.length === 0 ? <p className="meal-hint">Your list is empty. Add an item whenever you’re ready.</p> : <ul className="meal-shopping-list">
                    {plan.shopping.map(item => <li key={item.id}>
                        <label className={item.checked ? 'meal-item-done' : ''}><input type="checkbox" checked={item.checked} onChange={() => setPlan(current => ({ ...current, shopping: current.shopping.map(entry => entry.id === item.id ? { ...entry, checked: !entry.checked } : entry) }))} /><span>{item.name}</span></label>
                        <button type="button" aria-label={`Remove ${item.name}`} onClick={() => setPlan(current => ({ ...current, shopping: current.shopping.filter(entry => entry.id !== item.id) }))}>Remove</button>
                    </li>)}
                </ul>}
                </div>
            </details>
        </section>
    );
}

export default MealPlanner;
