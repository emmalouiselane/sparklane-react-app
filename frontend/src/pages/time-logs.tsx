import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Trash } from 'react-bootstrap-icons';
import { API_BASE_URL } from '../config/api';
import { getAuthConfig, getAuthToken } from '../helpers/auth';
import {
  addDays,
  formatDateDisplay,
  formatHours,
  formatWeekdayLabel,
  getWeekStart,
  parseInputDate,
  toInputDate
} from '../helpers/helper';
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
  const [isWeekSummaryOpen, setIsWeekSummaryOpen] = useState(false);

  useEffect(() => {
    const fetchTimeLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = getAuthToken();

        if (!token) {
          setError('Please log in to manage your time logs.');
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/api/time-logs`, getAuthConfig(token));

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

  const weekSummary = useMemo(() => {
    const weekStart = getWeekStart(parseInputDate(date));
    const weekDates = Array.from({ length: 7 }, (_, index) => toInputDate(addDays(weekStart, index)));
    const logsInWeek = timeLogs.filter((log) => weekDates.includes(log.date));

    return {
      startDate: toInputDate(weekStart),
      endDate: toInputDate(addDays(weekStart, 6)),
      totalHours: logsInWeek.reduce((sum, log) => sum + log.durationHours, 0),
      dayGroups: weekDates.map((weekDate) => {
        const logsForDay = logsInWeek.filter((log) => log.date === weekDate);

        return {
          date: weekDate,
          logs: logsForDay,
          totalHours: logsForDay.reduce((sum, log) => sum + log.durationHours, 0)
        };
      })
    };
  }, [date, timeLogs]);

  const handleAddTimeLog = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsedDuration = Number(durationHours);

    if (!title.trim() || Number.isNaN(parsedDuration) || parsedDuration <= 0) {
      setError('Please enter a valid activity and duration.');
      return;
    }

    try {
      const token = getAuthToken();

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
        getAuthConfig(token)
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
      const token = getAuthToken();

      if (!token) {
        setError('Please log in to manage your time logs.');
        return;
      }

      setError(null);

      await axios.delete(`${API_BASE_URL}/api/time-logs/${logId}`, getAuthConfig(token));

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
          <>
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

            <button
              type="button"
              className="time-log-week-summary-btn"
              onClick={() => setIsWeekSummaryOpen(true)}
            >
              View Week Summary
            </button>
          </>
        )}
      </section>

      {isWeekSummaryOpen && (
        <div
          className="time-log-modal-backdrop"
          role="presentation"
          onClick={() => setIsWeekSummaryOpen(false)}
        >
          <div
            className="time-log-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="week-summary-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="time-log-day-header">
              <button
                type="button"
                className="time-log-date-btn"
                onClick={() => setIsWeekSummaryOpen(false)}
                aria-label="Close week summary"
              >
                <ChevronLeft size={16} />
              </button>
              <h5 id="week-summary-heading">
                {formatDateDisplay(weekSummary.startDate)} to {formatDateDisplay(weekSummary.endDate)}
              </h5>
              <div className="time-log-modal-spacer" aria-hidden="true" />
            </div>

            {weekSummary.dayGroups.every((dayGroup) => dayGroup.logs.length === 0) ? (
              <p className="time-log-empty">No time logged in this week yet.</p>
            ) : (
              <>
                <ul className="time-log-list">
                  {weekSummary.dayGroups.map((dayGroup) => (
                    <li key={dayGroup.date}>
                      <div className="time-log-week-item-copy">
                        <div className="time-log-item-copy">
                          <span>{formatHours(dayGroup.totalHours)}</span>
                          <strong>{formatWeekdayLabel(dayGroup.date)}</strong>
                        </div>
                        <div className="time-log-week-day-groups">
                          {dayGroup.logs.length === 0 ? (
                            <span className="time-log-week-day-pill empty">No logs</span>
                          ) : (
                            dayGroup.logs.map((log) => (
                              <span key={log.id} className="time-log-week-day-pill">
                                {log.title} ~ {formatHours(log.durationHours)}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="time-log-day-total">
                  <span>Week Total</span>
                  <strong>{formatHours(weekSummary.totalHours)}</strong>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default TimeLogsPage;
