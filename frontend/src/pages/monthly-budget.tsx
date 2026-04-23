import React, { useEffect, useMemo, useState } from 'react';
import { CheckLg, ChevronLeft, ChevronRight, Eye, EyeSlash, PencilSquare, QuestionLg, Trash } from 'react-bootstrap-icons';
import { apiClient } from '../helpers/auth';
import {
  addDays,
  formatCurrency,
  formatDayLabel,
  formatShortDateDisplay,
  getWeekStart,
  monthLabel,
  parseInputDate,
  toInputDate
} from '../helpers/helper';
import './monthly-budget.css';

type PaymentType = 'income' | 'expense';
type PaymentKind = 'single' | 'recurring';
type EditScope = 'single-instance' | 'this-and-future' | 'all';

interface AmountOverride {
  date: string;
  amount: number;
}

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
  endDate?: string;
  paidDates: string[];
  amountOverrides: AmountOverride[];
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

function clampPayDate(year: number, month: number, payDay: number) {
  const maxDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(payDay, maxDay), 12, 0, 0, 0);
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
  const overrideAmount =
    payment.kind === 'recurring'
      ? payment.amountOverrides.find((override) => override.date === date)?.amount
      : undefined;

  return {
    id: `${payment.id}-${date}${suffix}`,
    sourceId: payment.id,
    title: payment.title,
    amount: overrideAmount ?? payment.amount,
    type: payment.type,
    date,
    kind: payment.kind,
    isPaid: payment.paidDates.includes(date),
  };
}

function getRecurringOccurrencesInPeriod(payment: RecurringPayment, periodStart: Date, periodEnd: Date) {
  const occurrences: PaymentOccurrence[] = [];
  const recurrenceStart = parseInputDate(payment.startDate);
  const cappedEnd = payment.endDate
    ? new Date(Math.min(periodEnd.getTime(), parseInputDate(payment.endDate).getTime()))
    : periodEnd;

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

function normalizePayment(payment: any): PaymentItem | null {
  if (payment && payment.kind === 'recurring') {
    return {
      id: payment.id || payment._id,
      title: payment.title,
      amount: payment.amount,
      type: payment.type,
        kind: 'recurring',
        startDate: payment.startDate,
        endDate: payment.endDate,
        paidDates: Array.isArray(payment.paidDates) ? payment.paidDates : [],
        amountOverrides: Array.isArray(payment.amountOverrides) ? payment.amountOverrides : []
      };
    }

  if (payment && (payment.kind === 'single' || 'date' in payment)) {
    return {
      id: payment.id || payment._id,
      title: payment.title,
      amount: payment.amount,
      type: payment.type,
      kind: 'single',
      date: payment.date,
      paidDates: Array.isArray(payment.paidDates) ? payment.paidDates : []
    };
  }

  return null;
}

function MonthlyBudgetPage() {
  const [payDay, setPayDay] = useState<number>(28);
  const [anchorDate, setAnchorDate] = useState<string>(toInputDate(new Date()));
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [kind, setKind] = useState<PaymentKind>('single');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [singleDate, setSingleDate] = useState(toInputDate(new Date()));
  const [recurringStartDate, setRecurringStartDate] = useState(toInputDate(new Date()));
  const [type, setType] = useState<PaymentType>('expense');
  const [updatingOccurrenceId, setUpdatingOccurrenceId] = useState<string | null>(null);
  const [expandedMobileDay, setExpandedMobileDay] = useState<string | null>(null);
  const [recurringDeleteTarget, setRecurringDeleteTarget] = useState<PaymentOccurrence | null>(null);
  const [isRecurringDeleteSubmitting, setIsRecurringDeleteSubmitting] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<PaymentOccurrence | null>(null);
  const [isSingleDeleteSubmitting, setIsSingleDeleteSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<PaymentOccurrence | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editScope, setEditScope] = useState<EditScope>('all');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  useEffect(() => {
    if (!paymentNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPaymentNotice(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [paymentNotice]);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setError(null);
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [error]);

  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get('/api/budget');

        setPayDay(response.data.payDay ?? 28);
        const parsedPayments = response.data.payments as PaymentItem[];

        try {
          if (Array.isArray(parsedPayments)) {
            const migrated = parsedPayments
              .map((payment) => normalizePayment(payment))
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

    return occurrences.sort((a, b) => {
      const dateDifference = parseInputDate(a.date).getTime() - parseInputDate(b.date).getTime();

      if (dateDifference !== 0) {
        return dateDifference;
      }

      if (a.type !== b.type) {
        return a.type === 'income' ? -1 : 1;
      }

      return b.amount - a.amount;
    });
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

  const visiblePaymentsInPeriod = useMemo(
    () => (showAllPayments ? paymentsInPeriod : paymentsInPeriod.filter((payment) => !payment.isPaid)),
    [paymentsInPeriod, showAllPayments]
  );
  const hasPaidPaymentsInPeriod = useMemo(
    () => paymentsInPeriod.some((payment) => payment.isPaid),
    [paymentsInPeriod]
  );

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
        const selectedPaymentDate = kind === 'single' ? singleDate : recurringStartDate;
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

        const response = await apiClient.post('/api/budget/payments', payload);

        const savedPayment = response.data.payment;
        const nextPayment = normalizePayment(savedPayment);

        if (!nextPayment) {
          throw new Error('Failed to parse saved payment.');
        }

        setPayments((current) => [nextPayment, ...current]);
        setPaymentNotice(
          kind === 'single'
            ? `${title.trim()} added for ${formatShortDateDisplay(parseInputDate(selectedPaymentDate))}.`
            : `${title.trim()} starts on ${formatShortDateDisplay(parseInputDate(selectedPaymentDate))}.`
        );
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

  const handleOpenAddPaymentModal = () => {
    setPaymentNotice(null);
    setIsAddPaymentModalOpen(true);
  };

  const handleOpenRecurringDeleteModal = (payment: PaymentOccurrence) => {
    setRecurringDeleteTarget(payment);
    setPaymentNotice(null);
    setError(null);
  };

  const handleOpenEditModal = (payment: PaymentOccurrence) => {
    setEditTarget(payment);
    setEditAmount(payment.amount.toFixed(2));
    setEditScope(payment.kind === 'recurring' ? 'single-instance' : 'all');
    setPaymentNotice(null);
    setError(null);
  };

  const handleCloseEditModal = () => {
    if (!isEditSubmitting) {
      setEditTarget(null);
      setEditAmount('');
      setEditScope('all');
    }
  };

  const handleOpenSingleDeleteModal = (payment: PaymentOccurrence) => {
    setSingleDeleteTarget(payment);
    setPaymentNotice(null);
    setError(null);
  };

  const handleCloseSingleDeleteModal = () => {
    if (!isSingleDeleteSubmitting) {
      setSingleDeleteTarget(null);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteTarget) {
      return;
    }

    try {
      setIsSingleDeleteSubmitting(true);
      setPaymentNotice(null);
      setError(null);

      await apiClient.delete(`/api/budget/payments/${singleDeleteTarget.sourceId}`);

      setPayments((current) => current.filter((payment) => payment.id !== singleDeleteTarget.sourceId));
      setPaymentNotice('Payment removed.');
      setSingleDeleteTarget(null);
    } catch (requestError: any) {
      console.error('Failed to delete payment', requestError);
      setError(requestError.response?.data?.error || 'Failed to delete payment.');
    } finally {
      setIsSingleDeleteSubmitting(false);
    }
  };

  const handleCloseRecurringDeleteModal = () => {
    if (!isRecurringDeleteSubmitting) {
      setRecurringDeleteTarget(null);
    }
  };

  const handleRecurringDeleteChoice = async (mode: 'all' | 'this-and-future') => {
    if (!recurringDeleteTarget) {
      return;
    }

    try {
      setIsRecurringDeleteSubmitting(true);
      setPaymentNotice(null);
      setError(null);

      if (mode === 'all') {
        await apiClient.delete(`/api/budget/payments/${recurringDeleteTarget.sourceId}`);

        setPayments((current) => current.filter((payment) => payment.id !== recurringDeleteTarget.sourceId));
        setPaymentNotice('Recurring payment removed completely.');
      } else {
        const response = await apiClient.patch(
          `/api/budget/payments/${recurringDeleteTarget.sourceId}/recurring-end`,
          { fromDate: recurringDeleteTarget.date }
        );

        if (response.data.deleted) {
          setPayments((current) => current.filter((payment) => payment.id !== recurringDeleteTarget.sourceId));
          setPaymentNotice('Recurring payment removed completely.');
        } else {
          const updatedPayment = response.data.payment;
          setPayments((current) =>
            current.map((payment) =>
              payment.id === recurringDeleteTarget.sourceId && payment.kind === 'recurring'
                ? {
                    ...payment,
                    endDate: updatedPayment.endDate,
                    paidDates: Array.isArray(updatedPayment.paidDates) ? updatedPayment.paidDates : []
                  }
                : payment
            )
          );
          setPaymentNotice(
            `${recurringDeleteTarget.title} will now stop after ${formatShortDateDisplay(parseInputDate(updatedPayment.endDate))}.`
          );
        }
      }

      setRecurringDeleteTarget(null);
    } catch (requestError: any) {
      console.error('Failed to update recurring payment', requestError);
      setError(requestError.response?.data?.error || 'Failed to update recurring payment.');
    } finally {
      setIsRecurringDeleteSubmitting(false);
    }
  };

  const handleToggleOccurrencePaid = async (payment: PaymentOccurrence) => {
    try {
      setUpdatingOccurrenceId(payment.id);
      setPaymentNotice(null);
      setError(null);

      const response = await apiClient.patch(`/api/budget/payments/${payment.sourceId}/paid`, {
        date: payment.date,
        paid: !payment.isPaid
      });

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
          ? `${payment.title} marked as paid for ${formatShortDateDisplay(parseInputDate(payment.date))}.`
          : `${payment.title} marked as unpaid for ${formatShortDateDisplay(parseInputDate(payment.date))}.`
      );
    } catch (requestError: any) {
      console.error('Failed to update paid status', requestError);
      setError(requestError.response?.data?.error || 'Failed to update paid status.');
    } finally {
      setUpdatingOccurrenceId(null);
    }
  };

  const handleSubmitEditAmount = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editTarget) {
      return;
    }

    const parsedAmount = Number(editAmount);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    try {
      setIsEditSubmitting(true);
      setPaymentNotice(null);
      setError(null);

      const response = await apiClient.patch(`/api/budget/payments/${editTarget.sourceId}`, {
        amount: parsedAmount,
        scope: editTarget.kind === 'recurring' ? editScope : 'all',
        date: editTarget.date
      });
      const updatedPayment = normalizePayment(response.data.payment);
      const createdPayment = normalizePayment(response.data.createdPayment);

      if (!updatedPayment) {
        throw new Error('Failed to parse updated payment.');
      }

      setPayments((current) => {
        const nextPayments = current.map((payment) =>
          payment.id === editTarget.sourceId ? updatedPayment : payment
        );

        if (createdPayment) {
          return [createdPayment, ...nextPayments];
        }

        return nextPayments;
      });
      setPaymentNotice(`${editTarget.title} amount updated.`);
      setEditTarget(null);
      setEditAmount('');
      setEditScope('all');
    } catch (requestError: any) {
      console.error('Failed to update payment amount', requestError);
      setError(requestError.response?.data?.error || 'Failed to update payment amount.');
    } finally {
      setIsEditSubmitting(false);
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
      {(paymentNotice || error) && (
        <div
          className={`budget-toast${error ? ' error' : ' success'}`}
          role="status"
          aria-live="polite"
        >
          {error || paymentNotice}
        </div>
      )}

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
          {formatShortDateDisplay(period.start)} to {formatShortDateDisplay(period.end)}
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
          <div className="payments-list-card-header">
            <h3>Payments In Period</h3>
            <button
              type="button"
              className="payments-visibility-btn"
              onClick={() => {
                if (hasPaidPaymentsInPeriod) {
                  setShowAllPayments((current) => !current);
                }
              }}
              aria-pressed={showAllPayments}
              aria-label={showAllPayments ? 'Show unpaid payments only' : 'Show all payments'}
              title={showAllPayments ? 'Show unpaid only' : 'View all payments'}
              disabled={!hasPaidPaymentsInPeriod}
            >
              {showAllPayments ? <EyeSlash size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          </div>

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
          ) : visiblePaymentsInPeriod.length === 0 ? (
            <p className="empty-state">
              {showAllPayments ? 'No payments in this pay period yet.' : 'No unpaid payments in this pay period.'}
            </p>
          ) : (
            <ul>
              {visiblePaymentsInPeriod.map((payment) => (
                <li key={payment.id}>
                  <div className={payment.isPaid ? 'payment-details paid' : 'payment-details'}>
                    <strong>{payment.title}</strong>
                    {payment.kind === 'recurring' && (
                      <span className="payment-recurring-badge">Recurring monthly</span>
                    )}
                    <span>{formatShortDateDisplay(parseInputDate(payment.date))}</span>
                  </div>
                  <div>
                    <span className={`payment-type ${payment.type}`}>{payment.type}</span>
                    {payment.isPaid && <span className="payment-paid-badge">Paid</span>}
                    <strong>{formatCurrency(payment.amount)}</strong>
                    <div className="payment-action-row">
                      <button
                        type="button"
                        className="secondary-action-btn payment-edit-btn"
                        onClick={() => handleOpenEditModal(payment)}
                        aria-label={`Edit ${payment.title}`}
                      >
                        <PencilSquare size={14} />
                      </button>
                      <button
                        type="button"
                        className={payment.isPaid ? 'secondary-action-btn payment-status-btn unpaid' : 'payment-status-btn paid'}
                        onClick={() => handleToggleOccurrencePaid(payment)}
                        disabled={updatingOccurrenceId === payment.id}
                        aria-label={
                          updatingOccurrenceId === payment.id
                            ? `Saving ${payment.title}`
                            : payment.isPaid
                              ? `Mark ${payment.title} as unpaid`
                              : `Mark ${payment.title} as paid`
                        }
                      >
                        {updatingOccurrenceId === payment.id
                          ? 'Saving...'
                          : payment.isPaid
                            ? <QuestionLg size={14} />
                            : <CheckLg size={14} />}
                      </button>
                      <button
                        type="button"
                        className="payment-delete-btn"
                        onClick={() =>
                          payment.kind === 'recurring'
                            ? handleOpenRecurringDeleteModal(payment)
                            : handleOpenSingleDeleteModal(payment)
                        }
                        aria-label={payment.kind === 'recurring' ? 'Delete recurring payment' : 'Delete payment'}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
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
                <h5>{monthLabel(year, month)}</h5>
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
                        aria-label={`View pay period containing ${formatShortDateDisplay(cellDate)}`}
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
                            <strong className="calendar-tooltip-title">{formatShortDateDisplay(cellDate)}</strong>
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

      {editTarget && (
        <div
          className="payment-modal-backdrop"
          role="presentation"
          onClick={handleCloseEditModal}
        >
          <div
            className="payment-modal recurring-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-payment-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="payment-modal-header">
              <h3 id="edit-payment-heading">Edit Payment Amount</h3>
            </div>
            <div className="recurring-delete-copy">
              <p>
                Update <strong>{editTarget.title}</strong> for{' '}
                <strong>{formatShortDateDisplay(parseInputDate(editTarget.date))}</strong>.
              </p>
              {editTarget.kind === 'recurring' && (
                <p>Choose whether to update only this occurrence, this and future occurrences, or the whole series.</p>
              )}
            </div>
            <form className="payment-form edit-payment-form" onSubmit={handleSubmitEditAmount}>
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="Amount"
                value={editAmount}
                onChange={(event) => setEditAmount(event.target.value)}
                required
              />
              {editTarget.kind === 'recurring' && (
                <select value={editScope} onChange={(event) => setEditScope(event.target.value as EditScope)}>
                  <option value="single-instance">Single Instance</option>
                  <option value="this-and-future">This and Future</option>
                  <option value="all">All Instances</option>
                </select>
              )}
              <div className="payment-modal-actions">
                <button
                  type="button"
                  className="secondary-action-btn"
                  onClick={handleCloseEditModal}
                  disabled={isEditSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" disabled={isEditSubmitting}>
                  {isEditSubmitting ? 'Saving...' : 'Save Amount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {recurringDeleteTarget && (
        <div
          className="payment-modal-backdrop"
          role="presentation"
          onClick={handleCloseRecurringDeleteModal}
        >
          <div
            className="payment-modal recurring-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recurring-delete-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="payment-modal-header">
              <h3 id="recurring-delete-heading">Remove Recurring Payment</h3>
            </div>
            <div className="recurring-delete-copy">
              <p>
                Choose how to remove <strong>{recurringDeleteTarget.title}</strong> from{' '}
                <strong>{formatShortDateDisplay(parseInputDate(recurringDeleteTarget.date))}</strong>.
              </p>
            </div>
            <div className="payment-modal-actions recurring-delete-actions">
              <button
                type="button"
                className="secondary-action-btn"
                onClick={handleCloseRecurringDeleteModal}
                disabled={isRecurringDeleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={() => handleRecurringDeleteChoice('this-and-future')}
                disabled={isRecurringDeleteSubmitting}
              >
                {isRecurringDeleteSubmitting ? 'Saving...' : 'Remove This and Future'}
              </button>
              <button
                type="button"
                className="danger-action-btn"
                onClick={() => handleRecurringDeleteChoice('all')}
                disabled={isRecurringDeleteSubmitting}
              >
                {isRecurringDeleteSubmitting ? 'Saving...' : 'Remove All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {singleDeleteTarget && (
        <div
          className="payment-modal-backdrop"
          role="presentation"
          onClick={handleCloseSingleDeleteModal}
        >
          <div
            className="payment-modal recurring-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="single-delete-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="payment-modal-header">
              <h3 id="single-delete-heading">Remove Payment</h3>
            </div>
            <div className="recurring-delete-copy">
              <p>
                Remove <strong>{singleDeleteTarget.title}</strong> on{' '}
                <strong>{formatShortDateDisplay(parseInputDate(singleDeleteTarget.date))}</strong>?
              </p>
            </div>
            <div className="payment-modal-actions recurring-delete-actions">
              <button
                type="button"
                className="secondary-action-btn"
                onClick={handleCloseSingleDeleteModal}
                disabled={isSingleDeleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-action-btn"
                onClick={handleConfirmSingleDelete}
                disabled={isSingleDeleteSubmitting}
              >
                {isSingleDeleteSubmitting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default MonthlyBudgetPage;
