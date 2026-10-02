function validateRoutine(body) {
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 120) return 'Enter a title of up to 120 characters.';
  if (!Array.isArray(body.days) || !body.days.length || body.days.length > 7 || body.days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) return 'Choose at least one valid day.';
  if (typeof body.time !== 'string' || (body.time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time))) return 'Enter a valid time.';
  if (!Array.isArray(body.steps) || !body.steps.length || body.steps.length > 30 || body.steps.some(step => typeof step !== 'string' || !step.trim() || step.trim().length > 200)) return 'Add between 1 and 30 steps, each up to 200 characters.';
  return null;
}

function isValidDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}

module.exports = { validateRoutine, isValidDate };
