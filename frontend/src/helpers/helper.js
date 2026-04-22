function toDate(value) {
  if (value instanceof Date) {
    return value;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function toInputDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseInputDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function addDays(date, days) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

export function getWeekStart(date) {
  const clone = new Date(date);
  const dayOffset = (clone.getDay() + 6) % 7;
  clone.setDate(clone.getDate() - dayOffset);
  clone.setHours(12, 0, 0, 0);
  return clone;
}

export function formatDateDisplay(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(toDate(date));
}

export function formatWeekdayLabel(date) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long'
  }).format(toDate(date));
}

export function formatHours(hours) {
  return `${hours}h`;
}

export function monthLabel(year, month) {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month, 1));
}

export function formatShortDateDisplay(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(toDate(date));
}

export function formatDayLabel(date) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short'
  }).format(toDate(date));
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(value);
}

export function formatAgendaDateTime(dateValue) {
  if (dateValue.dateTime) {
    const date = new Date(dateValue.dateTime);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (dateValue.date) {
    return `${new Date(dateValue.date).toLocaleDateString()} (All day)`;
  }

  return 'No date available';
}

export function getOrdinalSuffix(day) {
  const remainderTen = day % 10;
  const remainderHundred = day % 100;

  if (remainderTen === 1 && remainderHundred !== 11) {
    return 'st';
  }

  if (remainderTen === 2 && remainderHundred !== 12) {
    return 'nd';
  }

  if (remainderTen === 3 && remainderHundred !== 13) {
    return 'rd';
  }

  return 'th';
}
