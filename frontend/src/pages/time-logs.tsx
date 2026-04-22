import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Trash } from 'react-bootstrap-icons';
import { API_BASE_URL } from '../config/api';
import './time-logs.css';

interface TimeLog {
  id: string;
  title: string;
  durationHours: number;
  date: string;
}

function TimeLogsPage() {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [date, setDate] = useState(toInputDate(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTimeLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('authToken');

        if (!token) {
          setError('Please log in to manage your time logs.');
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/api/time-logs`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });

        const parsedLogs = Array.isArray(response.data.timeLogs) ? response.data.timeLogs : [];
        setTimeLogs(
          parsedLogs.map((log: any) => ({
            id: log._id || log.id,
            title: log.title,
            durationHours: log.durationHours,
            date: log.date
          }))
        );
      } catch (requestError: any) {
        console.error('Failed to fetch time logs', requestError);
        setError(requestError.response?.data?.error || 'Failed to load time logs.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeLogs();
  }, []);

  const groupedLogs = useMemo(() => {
    const grouped = timeLogs.reduce<Record<string, TimeLog[]>>((acc, log) => {
      if (!acc[log.date]) {
        acc[log.date] = [];
      }
      acc[log.date].push(log);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([groupDate, logs]) => ({
        date: groupDate,
        logs,
        totalHours: logs.reduce((sum, log) => sum + log.durationHours, 0)
      }));
  }, [timeLogs]);

  const selectedDayGroup = useMemo(() => {
    const matchingGroup = groupedLogs.find((group) => group.date === date);

    return matchingGroup || {
      date,
      logs: [],
      totalHours: 0
    };
  }, [date, groupedLogs]);

  const handleAddTimeLog = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsedDuration = Number(durationHours);

    if (!title.trim() || Number.isNaN(parsedDuration) || parsedDuration <= 0) {
      setError('Please enter a valid activity and duration.');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Please log in to manage your time logs.');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      const response = await axios.post(
        `${API_BASE_URL}/api/time-logs`,
        {
          title: title.trim(),
          durationHours: parsedDuration,
          date
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      const savedLog = response.data.timeLog;
      setTimeLogs((current) => [
        {
          id: savedLog._id,
          title: savedLog.title,
          durationHours: savedLog.durationHours,
          date: savedLog.date
        },
        ...current
      ]);
      setTitle('');
      setDurationHours('');
    } catch (requestError: any) {
      console.error('Failed to save time log', requestError);
      setError(requestError.response?.data?.error || 'Failed to save time log.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTimeLog = async (logId: string) => {
    try {
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Please log in to manage your time logs.');
        return;
      }

      setError(null);

      await axios.delete(`${API_BASE_URL}/api/time-logs/${logId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setTimeLogs((current) => current.filter((log) => log.id !== logId));
    } catch (requestError: any) {
      console.error('Failed to delete time log', requestError);
      setError(requestError.response?.data?.error || 'Failed to delete time log.');
    }
  };

  const handleShiftDate = (days: number) => {
    setDate(toInputDate(addDays(parseInputDate(date), days)));
  };

  return (
    <section className="time-logs-page" aria-label="Time Logs module">
      <section className="time-log-entry-card">
        <div className="time-log-card-header">
          <h2>Time Logs</h2>
          <p>Track what you did each day and keep a simple running total.</p>
        </div>

        <form className="time-log-form" onSubmit={handleAddTimeLog}>
          <input
            type="text"
            placeholder="Activity"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <input
            type="number"
            inputMode="decimal"
            min="0.1"
            step="0.1"
            placeholder="Hours"
            value={durationHours}
            onChange={(event) => setDurationHours(event.target.value)}
            required
          />
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Add Log'}
          </button>
        </form>

        {error && <p className="time-log-error">{error}</p>}
      </section>

      <section className="time-log-list-card">
        {isLoading ? (
          <p className="time-log-empty">Loading time logs...</p>
        ) : (
          <section className="time-log-day-card" key={selectedDayGroup.date}>
            <div className="time-log-day-header">
              <button
                type="button"
                className="time-log-date-btn"
                onClick={() => handleShiftDate(-1)}
                aria-label="Previous date"
              >
                <ChevronLeft size={16} />
              </button>
              <h5>{formatDateDisplay(selectedDayGroup.date)}</h5>
              <button
                type="button"
                className="time-log-date-btn"
                onClick={() => handleShiftDate(1)}
                aria-label="Next date"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {selectedDayGroup.logs.length === 0 ? (
              <p className="time-log-empty">No time logs for this date yet.</p>
            ) : (
              <>
                <ul className="time-log-list">
                  {selectedDayGroup.logs.map((log) => (
                    <li key={log.id}>
                      <div className="time-log-item-copy">
                        <span>{formatHours(log.durationHours)}</span>
                        <strong>{log.title}</strong>
                      </div>
                      <button
                        type="button"
                        className="time-log-delete-btn"
                        onClick={() => handleDeleteTimeLog(log.id)}
                        aria-label={`Delete ${log.title} time log`}
                      >
                        <Trash size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="time-log-day-total">
                  <span>Total</span>
                  <strong>{formatHours(selectedDayGroup.totalHours)}</strong>
                </div>
              </>
            )}
          </section>
        )}
      </section>
    </section>
  );
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(date: Date, days: number) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

function formatDateDisplay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, day, 12, 0, 0, 0));
}

function formatHours(hours: number) {
  return `${hours}h`;
}

export default TimeLogsPage;
