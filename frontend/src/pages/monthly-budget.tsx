import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { API_BASE_URL } from '../config/api';
import './monthly-budget.css';

type PaymentType = 'income' | 'expense';
type PaymentKind = 'single' | 'recurring';

interface SinglePayment {
  id: string;
  title: string;
  amount: number;
  type: PaymentType;
  kind: 'single';
  date: string; // YYYY-MM-DD
  paidDates: string[];
}

interface RecurringPayment {
  id: string;
  title: string;
  amount: number;
  type: PaymentType;
  kind: 'recurring';
  startDate: string; // YYYY-MM-DD
  paidDates: string[];
}

type PaymentItem = SinglePayment | RecurringPayment;

interface PaymentOccurrence {
  id: string;
  sourceId: string;
  title: string;
  amount: number;
  type: PaymentType;
  date: string; // YYYY-MM-DD
  kind: PaymentKind;
  isPaid: boolean;
}

interface CalendarMonth {
  year: number;
  month: number; // 0-11
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

function clampPayDate(year: number, month: number, payDay: number) {
  const maxDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(payDay, maxDay), 12, 0, 0, 0);
}

function addDays(date: Date, days: number) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

function getWeekStart(date: Date) {
  const clone = new Date(date);
  const dayOffset = (clone.getDay() + 6) % 7;
  clone.setDate(clone.getDate() - dayOffset);
  clone.setHours(12, 0, 0, 0);
  return clone;
}

function addMonthsKeepingDay(date: Date, monthsToAdd: number, dayOfMonth: number) {
  const year = date.getFullYear();
  const month = date.getMonth() + monthsToAdd;
  const maxDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(dayOfMonth, maxDay), 12, 0, 0, 0);
}

function getPayPeriod(referenceDate: Date, payDay: number) {
  const periodCandidate = clampPayDate(referenceDate.getFullYear(), referenceDate.getMonth(), payDay);
  const periodStart =
    referenceDate >= periodCandidate
      ? periodCandidate
      : clampPayDate(referenceDate.getFullYear(), referenceDate.getMonth() - 1, payDay);
  const nextPeriodStart = clampPayDate(periodStart.getFullYear(), periodStart.getMonth() + 1, payDay);
  const periodEnd = addDays(nextPeriodStart, -1);

  return { start: periodStart, end: periodEnd };
}

function getMonthsInRange(start: Date, end: Date): CalendarMonth[] {
  const months: CalendarMonth[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor <= end) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
}

function formatDateDisplay(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const mondayFirstStart = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const cells: Date[] = [];

  for (let i = 0; i < mondayFirstStart; i += 1) {
    cells.push(new Date(year, month, i - mondayFirstStart + 1, 12, 0, 0, 0));
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(year, month, day, 12, 0, 0, 0));
  }

  while (cells.length % 7 !== 0) {
    const nextIndex = cells.length - (mondayFirstStart + totalDays) + 1;
    cells.push(new Date(year, month + 1, nextIndex, 12, 0, 0, 0));
  }

  return cells;
}

function getVisibleMonthGrid(
  year: number,
  month: number,
  periodStart: Date,
  periodEnd: Date,
  paymentsByDay: Record<string, PaymentOccurrence[]>
) {
  const cells = buildMonthGrid(year, month);
  const visibleWeeks: Date[] = [];

  for (let index = 0; index < cells.length; index += 7) {
    const week = cells.slice(index, index + 7);
    const shouldShowWeek = week.some((cellDate) => {
      const key = toInputDate(cellDate);
      const inPayPeriod = cellDate >= periodStart && cellDate <= periodEnd;
      const hasPayments = (paymentsByDay[key] ?? []).length > 0;
      return inPayPeriod || hasPayments;
    });

    if (shouldShowWeek) {
      visibleWeeks.push(...week);
    }
  }

  return visibleWeeks;
}

function toPaymentOccurrence(payment: PaymentItem, date: string, suffix = ''): PaymentOccurrence {
  return {
    id: `${payment.id}-${date}${suffix}`,
    sourceId: payment.id,
    title: payment.title,
    amount: payment.amount,
    type: payment.type,
    date,
    kind: payment.kind,
    isPaid: payment.paidDates.includes(date),
  };
}

function getRecurringOccurrencesInPeriod(payment: RecurringPayment, periodStart: Date, periodEnd: Date) {
  const occurrences: PaymentOccurrence[] = [];
  const recurrenceStart = parseInputDate(payment.startDate);
  const cappedEnd = periodEnd;

  if (recurrenceStart > cappedEnd) {
    return occurrences;
  }

  let cursor = new Date(recurrenceStart);
  const monthlyAnchorDay = recurrenceStart.getDate();
  let guard = 0;

  while (cursor < periodStart && guard < 600) {
    cursor = addMonthsKeepingDay(cursor, 1, monthlyAnchorDay);
    guard += 1;
  }

  while (cursor <= cappedEnd && guard < 1200) {
    occurrences.push(toPaymentOccurrence(payment, toInputDate(cursor)));
    cursor = addMonthsKeepingDay(cursor, 1, monthlyAnchorDay);
    guard += 1;
  }

  return occurrences;
}

function MonthlyBudgetPage() {
  const [payDay, setPayDay] = useState<number>(28);
  const [anchorDate, setAnchorDate] = useState<string>(toInputDate(new Date()));
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [kind, setKind] = useState<PaymentKind>('single');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [singleDate, setSingleDate] = useState(toInputDate(new Date()));
  const [recurringStartDate, setRecurringStartDate] = useState(toInputDate(new Date()));
  const [type, setType] = useState<PaymentType>('expense');
  const [updatingOccurrenceId, setUpdatingOccurrenceId] = useState<string | null>(null);
  const [expandedMobileDay, setExpandedMobileDay] = useState<string | null>(null);

  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('authToken');

        if (!token) {
          setError('Please log in to manage your budget.');
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/api/budget`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });

        setPayDay(response.data.payDay ?? 28);
        const parsedPayments = response.data.payments as PaymentItem[];

        try {
          if (Array.isArray(parsedPayments)) {
            const migrated = parsedPayments
              .map((payment) => {
                if (payment && payment.kind === 'recurring') {
                  return {
                    id: payment.id || (payment as any)._id,
                    title: payment.title,
                    amount: payment.amount,
                    type: payment.type,
                    kind: 'recurring' as const,
                    startDate: payment.startDate,
                    paidDates: Array.isArray((payment as any).paidDates) ? (payment as any).paidDates : []
                  };
                }
                if (payment && (payment.kind === 'single' || 'date' in payment)) {
                  return {
                    id: payment.id || (payment as any)._id,
                    title: payment.title,
                    amount: payment.amount,
                    type: payment.type,
                    kind: 'single' as const,
                    date: (payment as SinglePayment).date,
                    paidDates: Array.isArray((payment as any).paidDates) ? (payment as any).paidDates : []
                  };
                }
                return null;
              })
              .filter((payment): payment is PaymentItem => payment !== null);
            setPayments(migrated);
          }
        } catch (parseError) {
          console.error('Failed to parse budget payments', parseError);
          setError('Failed to load budget payments.');
        }
      } catch (requestError: any) {
        console.error('Failed to fetch budget data', requestError);
        setError(requestError.response?.data?.error || 'Failed to load budget data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBudgetData();
  }, []);

  const period = useMemo(() => getPayPeriod(parseInputDate(anchorDate), payDay), [anchorDate, payDay]);

  const paymentsInPeriod = useMemo(() => {
    const occurrences: PaymentOccurrence[] = [];

    payments.forEach((payment) => {
      if (payment.kind === 'single') {
        const paymentDate = parseInputDate(payment.date);
        if (paymentDate >= period.start && paymentDate <= period.end) {
          occurrences.push(toPaymentOccurrence(payment, payment.date));
        }
        return;
      }

      occurrences.push(...getRecurringOccurrencesInPeriod(payment, period.start, period.end));
    });

    return occurrences.sort((a, b) => parseInputDate(a.date).getTime() - parseInputDate(b.date).getTime());
  }, [payments, period]);

  const totals = useMemo(() => {
    const income = paymentsInPeriod
      .filter((payment) => payment.type === 'income')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const expenses = paymentsInPeriod
      .filter((payment) => payment.type === 'expense')
      .reduce((sum, payment) => sum + payment.amount, 0);

    const outstandingExpenses =  paymentsInPeriod
      .filter((payment) => payment.type === 'expense' && !payment.isPaid)
      .reduce((sum, payment) => sum + payment.amount, 0);

    return { income, expenses, balance: income - expenses, outstandingExpenses };
  }, [paymentsInPeriod]);

  const paymentsByDay = useMemo(() => {
    return paymentsInPeriod.reduce<Record<string, PaymentOccurrence[]>>((acc, payment) => {
      const key = payment.date;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(payment);
      return acc;
    }, {});
  }, [paymentsInPeriod]);

  const months = useMemo(() => getMonthsInRange(period.start, period.end), [period]);
  const mobileWeekDays = useMemo(() => {
    const selectedDate = parseInputDate(anchorDate);
    const clampedDate =
      selectedDate < period.start ? period.start : selectedDate > period.end ? period.end : selectedDate;
    const weekStart = getWeekStart(clampedDate);

    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [anchorDate, period]);

  const resetPaymentForm = () => {
    setTitle('');
    setAmount('');
    setSingleDate(toInputDate(new Date()));
    setRecurringStartDate(toInputDate(new Date()));
    setKind('single');
    setType('expense');
  };

  const handleAddPayment = (event: React.FormEvent) => {
    const submitPayment = async () => {
      event.preventDefault();
      const parsedAmount = Number(amount);

      if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Please enter a valid payment title and amount.');
        return;
      }

      try {
        const token = localStorage.getItem('authToken');

        if (!token) {
          setError('Please log in to manage your budget.');
          return;
        }

        const payload =
          kind === 'single'
            ? {
                title: title.trim(),
                amount: parsedAmount,
                date: singleDate,
                type,
                kind: 'single'
              }
            : {
                title: title.trim(),
                amount: parsedAmount,
                type,
                kind: 'recurring',
                startDate: recurringStartDate
              };

        const response = await axios.post(`${API_BASE_URL}/api/budget/payments`, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });

        const savedPayment = response.data.payment;
        const nextPayment: PaymentItem =
          savedPayment.kind === 'single'
            ? {
                id: savedPayment._id,
                title: savedPayment.title,
                amount: savedPayment.amount,
                date: savedPayment.date,
                type: savedPayment.type,
                kind: 'single',
                paidDates: Array.isArray(savedPayment.paidDates) ? savedPayment.paidDates : []
              }
            : {
                id: savedPayment._id,
                title: savedPayment.title,
                amount: savedPayment.amount,
                type: savedPayment.type,
                kind: 'recurring',
                startDate: savedPayment.startDate,
                paidDates: Array.isArray(savedPayment.paidDates) ? savedPayment.paidDates : []
              };

        setPayments((current) => [nextPayment, ...current]);
        setAnchorDate(kind === 'single' ? singleDate : recurringStartDate);
        setPaymentNotice(`${title.trim()} added to this pay period.`);
        setError(null);
        resetPaymentForm();
        setIsAddPaymentModalOpen(false);
      } catch (requestError: any) {
        console.error('Failed to save payment', requestError);
        setError(requestError.response?.data?.error || 'Failed to save payment.');
      }
    };

    submitPayment();
  };

  const handleDeletePayment = (paymentId: string) => {
    const deletePayment = async () => {
      try {
        const token = localStorage.getItem('authToken');

        if (!token) {
          setError('Please log in to manage your budget.');
          return;
        }

        await axios.delete(`${API_BASE_URL}/api/budget/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setPayments((current) => current.filter((payment) => payment.id !== paymentId));
        setPaymentNotice('Payment removed.');
        setError(null);
      } catch (requestError: any) {
        console.error('Failed to delete payment', requestError);
        setError(requestError.response?.data?.error || 'Failed to delete payment.');
      }
    };

    deletePayment();
  };

  const handleOpenAddPaymentModal = () => {
    setPaymentNotice(null);
    setSingleDate(anchorDate);
    setRecurringStartDate(anchorDate);
    setIsAddPaymentModalOpen(true);
  };

  const handleToggleOccurrencePaid = async (payment: PaymentOccurrence) => {
    try {
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Please log in to manage your budget.');
        return;
      }

      setUpdatingOccurrenceId(payment.id);
      setPaymentNotice(null);
      setError(null);

      const response = await axios.patch(
        `${API_BASE_URL}/api/budget/payments/${payment.sourceId}/paid`,
        {
          date: payment.date,
          paid: !payment.isPaid
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      const updatedPayment = response.data.payment;

      setPayments((current) =>
        current.map((existingPayment) =>
          existingPayment.id === payment.sourceId
            ? {
                ...existingPayment,
                paidDates: Array.isArray(updatedPayment.paidDates) ? updatedPayment.paidDates : []
              }
            : existingPayment
        )
      );

      setPaymentNotice(
        !payment.isPaid
          ? `${payment.title} marked as paid for ${formatDateDisplay(parseInputDate(payment.date))}.`
          : `${payment.title} marked as unpaid for ${formatDateDisplay(parseInputDate(payment.date))}.`
      );
    } catch (requestError: any) {
      console.error('Failed to update paid status', requestError);
      setError(requestError.response?.data?.error || 'Failed to update paid status.');
    } finally {
      setUpdatingOccurrenceId(null);
    }
  };

  const handleCloseAddPaymentModal = () => {
    resetPaymentForm();
    setIsAddPaymentModalOpen(false);
  };

  const goToPreviousPayPeriod = () => {
    setAnchorDate(toInputDate(addDays(period.start, -1)));
  };

  const goToNextPayPeriod = () => {
    setAnchorDate(toInputDate(addDays(period.end, 1)));
  };

  return (
    <section className="monthly-budget-page" aria-label="Monthly Budget module">
      <div className="pay-period-navigation">
        <button
          type="button"
          className="pay-period-chevron"
          onClick={goToPreviousPayPeriod}
          aria-label="Go to previous pay period"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="pay-period-pill">
          {formatDateDisplay(period.start)} to {formatDateDisplay(period.end)}
        </div>
        <button
          type="button"
          className="pay-period-chevron"
          onClick={goToNextPayPeriod}
          aria-label="Go to next pay period"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      
      {error && <p className="payment-error">{error}</p>}
      {paymentNotice && <p className="payment-notice">{paymentNotice}</p>}

      <div className="budget-summary">
        <div>
          <h5>Balance</h5>
          <p>{formatCurrency(totals.balance)}</p>
        </div>
        <div>
          <h5>Outstanding Expenses</h5>
          <p>{formatCurrency(totals.outstandingExpenses)}</p>
        </div>
      </div>

      <div className="budget-views">
        <section className="mobile-week-card">
          <div className="payments-calendar-header">
            <h3>Weekly View</h3>
            <button type="button" className="open-payment-modal-btn" onClick={handleOpenAddPaymentModal}>
              Add Payment
            </button>
          </div>
          <div className="mobile-week-grid">
            {mobileWeekDays.map((day) => {
              const key = toInputDate(day);
              const dayPayments = paymentsByDay[key] ?? [];
              const inPayPeriod = day >= period.start && day <= period.end;
              const isExpanded = expandedMobileDay === key;
              const visiblePayments = isExpanded ? dayPayments : dayPayments.slice(0, 3);
              const canExpand = dayPayments.length > 3;

              return (
                <button
                  type="button"
                  key={key}
                  className={`mobile-week-day${inPayPeriod ? ' in-period' : ''}${isExpanded ? ' is-expanded' : ''}${canExpand ? ' is-clickable' : ''}`}
                  onClick={() => {
                    if (canExpand) {
                      setExpandedMobileDay((current) => (current === key ? null : key));
                    }
                  }}
                  aria-expanded={canExpand ? isExpanded : undefined}
                >
                  <span className="mobile-week-day-label">{formatDayLabel(day)}</span>
                  <span className="mobile-week-date">{day.getDate()}</span>
                  {dayPayments.length === 0 ? (
                    <span className="mobile-week-empty">No payments</span>
                  ) : (
                    visiblePayments.map((payment) => (
                      <span
                        key={payment.id}
                        className={`calendar-payment ${payment.type}${payment.isPaid ? ' paid' : ''}`}
                      >
                        {payment.title} ({formatCurrency(payment.amount)})
                      </span>
                    ))
                  )}
                  {canExpand && (
                    <span className="calendar-more">
                      {isExpanded ? 'Show less' : `+${dayPayments.length - 3} more`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="payments-list-card">
          <h3>Payments In Period</h3>

          <div className="payments-list-card-summary">
            <div>
              <h6>Income</h6>
              <p>{formatCurrency(totals.income)}</p>
            </div>
            <div>
              <h6>Expenses</h6>
              <p>{formatCurrency(totals.expenses)}</p>
            </div>
          </div>

          {isLoading ? (
            <p className="empty-state">Loading budget data...</p>
          ) : paymentsInPeriod.length === 0 ? (
            <p className="empty-state">No payments in this pay period yet.</p>
          ) : (
            <ul>
              {paymentsInPeriod.map((payment) => (
                <li key={payment.id}>
                  <div className={payment.isPaid ? 'payment-details paid' : 'payment-details'}>
                    <strong>{payment.title}</strong>
                    <span>{formatDateDisplay(parseInputDate(payment.date))}</span>
                  </div>
                  <div>
                    <span className={`payment-type ${payment.type}`}>{payment.type}</span>
                    {payment.kind === 'recurring' && (
                      <span className="payment-recurring-badge">Recurring monthly</span>
                    )}
                    {payment.isPaid && <span className="payment-paid-badge">Paid</span>}
                    <strong>{formatCurrency(payment.amount)}</strong>
                    <button
                      type="button"
                      className={payment.isPaid ? 'secondary-action-btn payment-status-btn' : 'payment-status-btn'}
                      onClick={() => handleToggleOccurrencePaid(payment)}
                      disabled={updatingOccurrenceId === payment.id}
                    >
                      {updatingOccurrenceId === payment.id
                        ? 'Saving...'
                        : payment.isPaid
                          ? 'Mark Unpaid'
                          : 'Mark Paid'}
                    </button>
                    <button type="button" onClick={() => handleDeletePayment(payment.sourceId)}>
                      {payment.kind === 'recurring' ? 'Remove Rule' : 'Remove'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="payments-calendar-card">
          <div className="payments-calendar-header">
            <h3>Payments Calendar</h3>
            <button type="button" className="open-payment-modal-btn" onClick={handleOpenAddPaymentModal}>
              Add Payment
            </button>
          </div>
          <div className="calendar-months">
            {months.map(({ year, month }) => (
              <div className="calendar-month" key={`${year}-${month}`}>
                <h4>{monthLabel(year, month)}</h4>
                <div className="calendar-grid">
                  {DAY_NAMES.map((name) => (
                    <div className="calendar-day-name" key={name}>
                      {name}
                    </div>
                  ))}
                  {getVisibleMonthGrid(year, month, period.start, period.end, paymentsByDay).map((cellDate) => {
                    const key = toInputDate(cellDate);
                    const inCurrentMonth = cellDate.getMonth() === month;
                    const inPayPeriod = cellDate >= period.start && cellDate <= period.end;
                    const dayPayments = paymentsByDay[key] ?? [];
                    const isAnchorDate = key === anchorDate;

                    return (
                      <button
                        type="button"
                        key={`${year}-${month}-${key}`}
                        className={`calendar-day${inCurrentMonth ? '' : ' muted'}${inPayPeriod ? ' in-period' : ''}${isAnchorDate ? ' is-selected' : ''}`}
                        onClick={() => setAnchorDate(key)}
                        aria-pressed={isAnchorDate}
                        aria-label={`View pay period containing ${formatDateDisplay(cellDate)}`}
                      >
                        <span className="calendar-date-number">{cellDate.getDate()}</span>
                        {dayPayments.slice(0, 2).map((payment) => (
                          <span key={payment.id} className={`calendar-payment ${payment.type}${payment.isPaid ? ' paid' : ''}`}>
                            {payment.title} ({formatCurrency(payment.amount)})
                          </span>
                        ))}
                        {dayPayments.length > 2 && <span className="calendar-more">+{dayPayments.length - 2} more</span>}
                        {dayPayments.length > 0 && (
                          <div className="calendar-tooltip" role="tooltip">
                            <strong className="calendar-tooltip-title">{formatDateDisplay(cellDate)}</strong>
                            {dayPayments.map((payment) => (
                              <div key={`${payment.id}-tooltip`} className="calendar-tooltip-item">
                                <span className={`calendar-tooltip-type ${payment.type}`}>{payment.type}</span>
                                <span className={payment.isPaid ? 'calendar-tooltip-name paid' : 'calendar-tooltip-name'}>
                                  {payment.title}
                                </span>
                                <strong>{formatCurrency(payment.amount)}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {isAddPaymentModalOpen && (
        <div
          className="payment-modal-backdrop"
          role="presentation"
          onClick={handleCloseAddPaymentModal}
        >
          <div
            className="payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-payment-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="payment-modal-header">
              <h3 id="add-payment-heading">Add Payment</h3>
            </div>

            <form className="payment-form" onSubmit={handleAddPayment}>
              <input
                type="text"
                placeholder="Name"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="Amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
              
              <select value={type} onChange={(event) => setType(event.target.value as PaymentType)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              <select value={kind} onChange={(event) => setKind(event.target.value as PaymentKind)}>
                <option value="single">Single</option>
                <option value="recurring">Recurring</option>
              </select>
              
              {kind === 'single' && (
                <input
                  type="date"
                  value={singleDate}
                  onChange={(event) => setSingleDate(event.target.value)}
                  required
                />
              )}
              {kind === 'recurring' && (
                <input
                  type="date"
                  value={recurringStartDate}
                  onChange={(event) => setRecurringStartDate(event.target.value)}
                  required
                />
              )}
              <div className="payment-modal-actions">
                <button type="button" className="secondary-action-btn" onClick={handleCloseAddPaymentModal}>
                  Cancel
                </button>
                <button type="submit">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default MonthlyBudgetPage;
