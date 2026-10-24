import React, { useEffect, useRef, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { Heart, HeartPulse, Trash3 } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';

import { apiClient } from '../helpers/auth';
import { getLocalDayBounds, toInputDate } from '../helpers/helper';
import { useRefreshOnPageActivation } from '../helpers/page-refresh';
import { CheckIn, CheckInEntry } from '../interfaces/CheckIn';

import '../assets/styles/planner-sections.css';

const CHECK_INS = [
  { value: 'Very low', face: '😔' }, { value: 'Low', face: '😕' }, { value: 'Okay', face: '😐' }, { value: 'Good', face: '🙂' }, { value: 'Great', face: '☺️' },
] as const;
export type Mood = typeof CHECK_INS[number]['value'];

const EMPTY_CHECK_IN: CheckIn = { mood: null, note: '' };

function WellnessPage({ userId }: { userId?: string }) {
  const [checkIn, setCheckIn] = useState<CheckIn>(EMPTY_CHECK_IN);
  const [entries, setEntries] = useState<CheckInEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const hasLoadedHistory = useRef(false);
  const todayKey = toInputDate(new Date());

  useRefreshOnPageActivation('wellness', () => setRefreshTick(current => current + 1));

  useEffect(() => {
    let active = true;
    if (!hasLoadedHistory.current) 
      setHistoryLoading(true);

    const dayBounds = getLocalDayBounds(new Date());
    Promise.all([
      apiClient.get('/api/wellness/check-ins'),
      apiClient.get('/api/wellness/check-ins/today', { params: { dateKey: todayKey, ...dayBounds } })
    ])
      .then(([historyResponse, todayResponse]) => {
        if (!active) return;
        setEntries(historyResponse.data.entries || []);

        const entry = todayResponse.data.entry;
        setCheckIn(entry ? { mood: entry.mood, note: entry.note || '' } : EMPTY_CHECK_IN);
      })
      .catch(() => { 
        if (active) 
          setHistoryError('Saved check-ins could not be loaded.'); 
      })
      .finally(() => { 
        if (active) { 
          hasLoadedHistory.current = true; 
          setHistoryLoading(false); 
        } 
      });
    return () => { active = false; };
  }, [userId, todayKey, refreshTick]);

  const saveCheckIn = async () => {
    if (!checkIn.mood || saving) 
      return;

    setSaving(true);
    try {
      const response = await apiClient.post('/api/wellness/check-ins', {
        ...checkIn,
        dateKey: todayKey,
        ...getLocalDayBounds(new Date())
      });
      const savedEntry: CheckInEntry = response.data.entry;
      setEntries(current => [savedEntry, ...current.filter(entry => entry._id !== savedEntry._id && entry.dateKey !== savedEntry.dateKey)]
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
      setSaveMessage('Your check-in has been saved.');
    } catch {
      setSaveMessage('This check-in could not be saved. Please try again.');
      toast.error('Unable to save your check-in. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCheckIn = async (entry: CheckInEntry) => {
    if (deletingId) 
      return;

    setDeletingId(entry._id);
    try {
      await apiClient.delete(`/api/wellness/check-ins/${entry._id}`);
      setEntries(current => current.filter(item => item._id !== entry._id));
      if (entry.dateKey === todayKey || (!entry.dateKey && toInputDate(new Date(entry.savedAt)) === todayKey)) {
        setCheckIn(EMPTY_CHECK_IN);
        setSaveMessage('Today’s check-in was removed.');
      }
      toast.success('Check-in removed.');
    } catch {
      toast.error('This check-in could not be removed. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatSavedAt = (savedAt: string) => new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(savedAt));

  return <section className="page-container planner-section-page wellness-page" aria-labelledby="wellness-heading">
    <div className="page-heading">
      <div>
        <span className="page-eyebrow">A soft place to notice</span>
        <h1 id="wellness-heading">Wellness</h1>
        <p>Not a scorecard. Your feelings don’t need fixing to be worth noticing.</p>
      </div>
      <HeartPulse size={34} aria-hidden="true" />
    </div>
    <div className="wellness-layout">
      <Card className="wellness-checkin-card">
        <Card.Body>
          <div className="wellness-checkin-heading">
            <div>
              <span className="page-eyebrow">A quick check-in</span>
              <h2>How are you arriving in this moment?</h2>
            </div>
            <div className="wellness-icon">
              <Heart aria-hidden="true" />
            </div>
          </div>
          <div className="wellness-mood-options" role="group" aria-label="Choose your mood">
            {CHECK_INS.map(option => <button type="button" key={option.value} className={checkIn.mood === option.value ? 'is-selected' : ''} aria-pressed={checkIn.mood === option.value} onClick={() => { setCheckIn(current => ({ ...current, mood: option.value })); setSaveMessage(''); }}><span aria-hidden="true">{option.face}</span><span>{option.value}</span></button>)}
          </div>
          <label htmlFor="wellness-note">A note to yourself <span>(optional)</span></label>
          <textarea id="wellness-note" value={checkIn.note} maxLength={500} placeholder="Add a private note for yourself…" onChange={event => { setCheckIn(current => ({ ...current, note: event.target.value })); setSaveMessage(''); }} />
          <div className="wellness-save-row">
            <Button variant="outline-primary" onClick={saveCheckIn} disabled={!checkIn.mood || saving}>{saving ? 'Saving…' : 'Save check-in'}</Button>
            {saveMessage && <span role="status">{saveMessage}</span>}
          </div>
        </Card.Body>
      </Card>
      <div className="wellness-side-column">
        <Card className="wellness-reminder-card">
          <Card.Body>
            <span className="page-eyebrow">A gentle reminder</span>
            <h2>Small steps count, too.</h2>
            <p>Pause for a breath, take a sip of water, or give yourself permission to begin again. You can return to this check-in whenever it feels useful.</p>
          </Card.Body>
        </Card>
        <Card className="wellness-history-card">
          <Card.Body>
            <span className="page-eyebrow">Looking back</span>
            <h2>Your check-in history</h2>
            {historyLoading ? <p className="wellness-history-empty">Loading saved check-ins…</p> : historyError ? <p className="wellness-history-empty" role="alert">{historyError}</p> : entries.length === 0 ? <p className="wellness-history-empty">Your saved check-ins will appear here.</p> : <ol className="wellness-history-list">
              {entries.map(entry => <li key={entry._id}>
                <div className="wellness-history-heading">
                  <strong>{entry.mood}</strong>
                  <time dateTime={entry.savedAt}>{formatSavedAt(entry.savedAt)}</time>
                  <Button variant="link" className="wellness-delete-entry" onClick={() => deleteCheckIn(entry)} disabled={deletingId === entry._id} aria-label={`${deletingId === entry._id ? 'Removing' : 'Remove'} check-in from ${formatSavedAt(entry.savedAt)}`} title="Remove check-in">
                    <Trash3 aria-hidden="true" />
                  </Button>
                </div>
                {entry.note && <p>{entry.note}</p>}
              </li>)}
            </ol>}
          </Card.Body>
        </Card>
      </div>
    </div>
  </section>;
}

export default WellnessPage;
