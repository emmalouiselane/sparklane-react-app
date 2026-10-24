const express = require('express');
const mongoose = require('mongoose');
const Habit = require('../models/habit');
const { getAppUserId, requireAuth, requireTrustedOrigin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireTrustedOrigin);
router.param('id', (req, res, next, id) => mongoose.isValidObjectId(id) ? next() : res.status(400).json({ error: 'Invalid habit ID.' }));

function validName(name) {
  return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 120;
}

function parseDateKey(dateKey) {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) 
    return null;
  
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === dateKey ? date : null;
}

function weekDateKeys(date) {
  const monday = new Date(date);
  const weekdayOffset = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - weekdayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setUTCDate(day.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

router.get('/', async (req, res) => {
  try {
    const habits = await Habit.find({ userId: getAppUserId(req.user) }).sort({ createdAt: 1 });
    res.json({ habits: habits.map(habit => ({
      _id: habit._id,
      name: habit.name,
      days: habit.days.length === 7 ? habit.days : Array.from({ length: 7 }, (_, index) => habit.days[index] === true),
      checkInDates: Array.isArray(habit.checkInDates) ? habit.checkInDates : null
    })) });
  } catch (error) {
    console.error('Error fetching habits:', error);
    res.status(500).json({ error: 'Unable to load habits.' });
  }
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!validName(name)) 
    return res.status(400).json({ error: 'Enter a habit name of up to 120 characters.' });
  
  try {
    const habit = await Habit.create({ userId: getAppUserId(req.user), name: name.trim(), days: Array(7).fill(false), checkInDates: [] });
    res.status(201).json({ habit: { _id: habit._id, name: habit.name, days: habit.days, checkInDates: habit.checkInDates } });
  } catch (error) {
    console.error('Error creating habit:', error);
    res.status(500).json({ error: 'Unable to create habit.' });
  }
});

router.patch('/:id/days/:dayIndex', async (req, res) => {
  const dayIndex = Number(req.params.dayIndex);
  const date = parseDateKey(req.body.dateKey);
  const expectedDayIndex = date ? (date.getUTCDay() + 6) % 7 : -1;
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6 || !date || dayIndex !== expectedDayIndex || typeof req.body.completed !== 'boolean') {
    return res.status(400).json({ error: 'Invalid habit check-in.' });
  }
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: getAppUserId(req.user) });
    if (!habit) 
      return res.status(404).json({ error: 'Habit not found.' });
    
    const checkIns = new Set(Array.isArray(habit.checkInDates) ? habit.checkInDates : []);
    if (req.body.completed) 
      checkIns.add(req.body.dateKey);
    else 
      checkIns.delete(req.body.dateKey);
    
    habit.checkInDates = Array.from(checkIns).sort();
    habit.days = weekDateKeys(date).map(dateKey => checkIns.has(dateKey));
    await habit.save();
    res.json({ habit: { _id: habit._id, name: habit.name, days: habit.days, checkInDates: habit.checkInDates } });
  } catch (error) {
    console.error('Error updating habit check-in:', error);
    res.status(500).json({ error: 'Unable to update habit check-in.' });
  }
});

router.put('/:id', async (req, res) => {
  if (!validName(req.body.name)) 
    return res.status(400).json({ error: 'Enter a habit name of up to 120 characters.' });
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: getAppUserId(req.user) },
      { name: req.body.name.trim() },
      { new: true, runValidators: true }
    );
    if (!habit) 
      return res.status(404).json({ error: 'Habit not found.' });
    res.json({ habit: { _id: habit._id, name: habit.name, days: habit.days } });
  } catch (error) {
    console.error('Error renaming habit:', error);
    res.status(500).json({ error: 'Unable to rename habit.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: getAppUserId(req.user) });
    if (!habit) 
      return res.status(404).json({ error: 'Habit not found.' });
    res.json({ message: 'Habit deleted.' });
  } catch (error) {
    console.error('Error deleting habit:', error);
    res.status(500).json({ error: 'Unable to delete habit.' });
  }
});

module.exports = router;
