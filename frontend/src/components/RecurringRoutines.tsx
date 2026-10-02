import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { ArrowRepeat, Plus } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import { apiClient } from '../helpers/auth';
import './RecurringRoutines.css';

interface Routine {
  _id: string;
  title: string;
  days: number[];
  time: string;
  steps: { _id: string; title: string; completedOn: string }[];
}
interface Props { todayOnly?: boolean; }
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function RecurringRoutines({ todayOnly = false }: Props) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [date, setDate] = useState(localDate);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [time, setTime] = useState('');
  const [steps, setSteps] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const weekday = new Date(`${date}T12:00:00`).getDay();

  const fetchRoutines = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setRoutines((await apiClient.get('/api/routines')).data.routines); }
    catch { setError('Unable to load routines. Please try again.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchRoutines(); }, [fetchRoutines]);
  useEffect(() => {
    const timer = window.setInterval(() => setDate(localDate()), 15000);
    const refreshDate = () => setDate(localDate());
    window.addEventListener('focus', refreshDate);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refreshDate); };
  }, []);

  const openForm = (routine?: Routine) => {
    setEditing(routine || null);
    setTitle(routine?.title || '');
    setDays(routine?.days || ALL_DAYS);
    setTime(routine?.time || '');
    setSteps(routine?.steps.map(step => step.title).join('\n') || '');
    setFormError('');
    setShow(true);
  };
  const replaceRoutine = (routine: Routine) => setRoutines(previous => previous.map(item => item._id === routine._id ? routine : item));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const checklist = steps.split('\n').map(step => step.trim()).filter(Boolean);
    if (!title.trim() || !days.length || !checklist.length || checklist.length > 30 || checklist.some(step => step.length > 200)) {
      setFormError('Add a title, at least one day, and 1–30 steps of up to 200 characters each.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const body = { title: title.trim(), days, time, steps: checklist };
      const response = editing ? await apiClient.put(`/api/routines/${editing._id}`, body) : await apiClient.post('/api/routines', body);
      if (editing) replaceRoutine(response.data.routine);
      else setRoutines(previous => [...previous, response.data.routine]);
      setShow(false);
      toast.success(editing ? 'Routine updated.' : 'Routine created.');
    } catch { setFormError('Unable to save routine. Please try again.'); }
    finally { setSaving(false); }
  };
  const toggle = async (routine: Routine, step: Routine['steps'][number]) => {
    setBusy(true);
    try {
      const response = await apiClient.patch(`/api/routines/${routine._id}/steps/${step._id}`, { date, completed: step.completedOn !== date });
      replaceRoutine(response.data.routine);
    } catch { toast.error('Unable to update step. Please try again.'); }
    finally { setBusy(false); }
  };
  const remove = async (routine: Routine) => {
    setBusy(true);
    try {
      await apiClient.delete(`/api/routines/${routine._id}`);
      setRoutines(previous => previous.filter(item => item._id !== routine._id));
      toast.success('Routine deleted.');
    } catch { toast.error('Unable to delete routine. Please try again.'); }
    finally { setBusy(false); }
  };
  const visible = routines.filter(routine => !todayOnly || routine.days.includes(weekday))
    .sort((a, b) => (a.time || '24:00').localeCompare(b.time || '24:00'));

  return <Card className="routines-card">
    <Card.Header className="routines-header">
      <Card.Title as="h2"><ArrowRepeat aria-hidden="true" /> {todayOnly ? 'Today’s Routines' : 'Recurring Routines'}</Card.Title>
      <Button size="sm" onClick={() => openForm()} disabled={busy}><Plus aria-hidden="true" /> Add routine</Button>
    </Card.Header>
    <Card.Body>
      <p className="routines-intro">Small steps, a fresh checklist each scheduled day. Pick up wherever you are.</p>
      {loading && <div role="status"><Spinner size="sm" animation="border" /> Loading routines…</div>}
      {error && <Alert variant="warning">{error} <Button size="sm" onClick={fetchRoutines}>Retry</Button></Alert>}
      {!loading && !error && visible.length === 0 && <p>{routines.length ? 'No routines scheduled for today. Your other routines are in the Recurring Routines module.' : 'Add your first routine, such as a morning checklist or a weekly tidy.'}</p>}
      {!loading && !error && visible.map(routine => {
        const scheduled = routine.days.includes(weekday);
        const completed = routine.steps.filter(step => step.completedOn === date).length;
        return <section key={routine._id} className="routine-item" aria-labelledby={`routine-${routine._id}`}>
          <div className="routine-heading">
            <div><h3 id={`routine-${routine._id}`}>{routine.title}</h3>
              <p>{routine.days.length === 7 ? 'Every day' : DAYS.filter((_, index) => routine.days.includes(index)).join(', ')}{routine.time && ` · ${routine.time}`}</p>
            </div>
            <div className="routine-actions">
              <Button variant="outline-secondary" size="sm" disabled={busy} aria-label={`Edit ${routine.title}`} onClick={() => openForm(routine)}>Edit</Button>
              <Button variant="outline-danger" size="sm" disabled={busy} aria-label={`Delete ${routine.title}`} onClick={() => remove(routine)}>Delete</Button>
            </div>
          </div>
          <p className="routine-progress" aria-live="polite">{scheduled ? `${completed} of ${routine.steps.length} done today${completed === routine.steps.length ? ' — all done!' : ''}` : 'Not scheduled today'}</p>
          {routine.steps.map(step => <Form.Check key={step._id} id={`step-${step._id}`} type="checkbox"
            label={step.title} checked={scheduled && step.completedOn === date} disabled={busy || !scheduled}
            onChange={() => toggle(routine, step)} className={scheduled && step.completedOn === date ? 'routine-step is-done' : 'routine-step'} />)}
        </section>;
      })}
    </Card.Body>
    <Modal show={show} onHide={() => { if (!saving) setShow(false); }} centered>
      <Modal.Header closeButton={!saving}><Modal.Title>{editing ? 'Edit routine' : 'Add routine'}</Modal.Title></Modal.Header>
      <Form onSubmit={save}><Modal.Body>
        {formError && <Alert variant="warning">{formError}</Alert>}
        <fieldset disabled={saving}>
          <Form.Group className="mb-3" controlId="routine-title"><Form.Label>Routine name</Form.Label><Form.Control value={title} onChange={event => setTitle(event.target.value)} required maxLength={120} placeholder="Morning essentials" autoFocus /></Form.Group>
          <fieldset className="mb-3"><legend className="routine-days-label">Repeat on</legend><div className="routine-days">
            {[1, 2, 3, 4, 5, 6, 0].map(day => <Form.Check key={day} id={`routine-day-${day}`} label={DAYS[day]} checked={days.includes(day)} onChange={event => setDays(previous => event.target.checked ? [...previous, day] : previous.filter(item => item !== day))} />)}
          </div></fieldset>
          <Form.Group className="mb-3" controlId="routine-time"><Form.Label>Time (optional)</Form.Label><Form.Control type="time" value={time} onChange={event => setTime(event.target.value)} /><Form.Text>A time cue in your local time; this does not send notifications.</Form.Text></Form.Group>
          <Form.Group controlId="routine-steps"><Form.Label>Checklist — one step per line</Form.Label><Form.Control as="textarea" rows={5} value={steps} onChange={event => setSteps(event.target.value)} required placeholder={'Have breakfast\nPack lunch\nCheck keys and bag'} /><Form.Text>Up to 30 steps. {editing && 'Saving edits resets today’s checklist.'}</Form.Text></Form.Group>
        </fieldset>
      </Modal.Body><Modal.Footer><Button variant="secondary" disabled={saving} onClick={() => setShow(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save routine'}</Button></Modal.Footer></Form>
    </Modal>
  </Card>;
}
