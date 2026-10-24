const express = require('express');
const WellnessCheckIn = require('../models/wellness-check-in');
const { getAppUserId, requireAuth, requireTrustedOrigin } = require('../middleware/auth');

const router = express.Router();
const VALID_MOODS = ['Very low', 'Low', 'Okay', 'Good', 'Great'];

function isValidDateKey(dateKey) {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) 
    return false;

  const parsedDate = new Date(`${dateKey}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === dateKey;
}

function getDayBounds(start, end) {
  if (typeof start !== 'string' || typeof end !== 'string') 
    return null;

  const dayStart = new Date(start);
  const dayEnd = new Date(end);
  const duration = dayEnd.getTime() - dayStart.getTime();
  if (!Number.isFinite(dayStart.getTime()) || !Number.isFinite(dayEnd.getTime()) || duration <= 0 || duration > 26 * 60 * 60 * 1000) 
    return null;

  return { $gte: dayStart, $lt: dayEnd };
}

async function findOrMigrateDayEntry(userId, dateKey, bounds) {
  const current = await WellnessCheckIn.findOne({ userId, dateKey }).select('mood note savedAt dateKey');
  if (current || !bounds) 
    return current;

  const legacy = await WellnessCheckIn.findOne({ userId, dateKey: { $exists: false }, savedAt: bounds })
    .sort({ savedAt: -1 });

  if (!legacy) 
    return null;

  legacy.dateKey = dateKey;
  try {
    await legacy.save();
  } catch (error) {
    if (error.code !== 11000) throw error;
    return WellnessCheckIn.findOne({ userId, dateKey }).select('mood note savedAt dateKey');
  }
  return legacy;
}

router.use(requireAuth, requireTrustedOrigin);

router.get('/check-ins/today', async (req, res) => {
  const { dateKey, dayStart, dayEnd } = req.query;
  if (!isValidDateKey(dateKey)) 
    return res.status(400).json({ error: 'A valid date is required.' });

  try {
    const entry = await findOrMigrateDayEntry(getAppUserId(req.user), dateKey, getDayBounds(dayStart, dayEnd));
    res.json({ entry });
  } catch (error) {
    console.error('Error fetching today’s wellness check-in:', error);
    res.status(500).json({ error: 'Unable to load today’s wellness check-in.' });
  }
});

router.get('/check-ins', async (req, res) => {
  try {
    const entries = await WellnessCheckIn.find({ userId: getAppUserId(req.user) })
      .sort({ savedAt: -1 })
      .select('mood note savedAt dateKey');
    res.json({ entries });
  } catch (error) {
    console.error('Error fetching wellness check-ins:', error);
    res.status(500).json({ error: 'Unable to load wellness check-ins.' });
  }
});

router.post('/check-ins', async (req, res) => {
  const { mood, note, dateKey, dayStart, dayEnd } = req.body;
  if (!VALID_MOODS.includes(mood) || (note !== undefined && (typeof note !== 'string' || note.length > 500)) || !isValidDateKey(dateKey)) {
    return res.status(400).json({ error: 'Choose a feeling and enter a note of up to 500 characters.' });
  }

  try {
    const userId = getAppUserId(req.user);
    const update = { mood };
    if (note !== undefined) update.note = note.trim();
    const dayBounds = getDayBounds(dayStart, dayEnd);
    const legacy = dayBounds ? await WellnessCheckIn.findOne({
      userId,
      dateKey: { $exists: false },
      savedAt: dayBounds
    }).sort({ savedAt: -1 }) : null;
    if (legacy && !(await WellnessCheckIn.exists({ userId, dateKey }))) {
      legacy.dateKey = dateKey;
      Object.assign(legacy, update);
      await legacy.save();
      return res.json({ entry: legacy });
    }
    const entry = await WellnessCheckIn.findOneAndUpdate(
      { userId, dateKey },
      { $set: update, $setOnInsert: { userId, dateKey } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).select('mood note savedAt dateKey');
    res.json({ entry });
  } catch (error) {
    if (error.code === 11000) {
      try {
        const update = { mood };
        if (note !== undefined) 
          update.note = note.trim();

        const entry = await WellnessCheckIn.findOneAndUpdate(
          { userId: getAppUserId(req.user), dateKey },
          { $set: update },
          { new: true, runValidators: true }
        ).select('mood note savedAt dateKey');

        if (entry) 
          return res.json({ entry });
      } catch (retryError) {
        console.error('Error updating concurrent wellness check-in:', retryError);
      }
    }
    console.error('Error saving wellness check-in:', error);
    res.status(500).json({ error: 'Unable to save wellness check-in.' });
  }
});

router.delete('/check-ins/:id', async (req, res) => {
  try {
    const entry = await WellnessCheckIn.findOneAndDelete({
      _id: req.params.id,
      userId: getAppUserId(req.user)
    }).select('_id');

    if (!entry) 
      return res.status(404).json({ error: 'Check-in not found.' });
    
    res.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting wellness check-in:', error);
    res.status(500).json({ error: 'Unable to delete wellness check-in.' });
  }
});

module.exports = router;
