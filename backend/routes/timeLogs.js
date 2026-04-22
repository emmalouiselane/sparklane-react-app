const express = require('express');
const jwt = require('jsonwebtoken');
const TimeLog = require('../models/TimeLog');

const router = express.Router();

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      console.log('Time logs JWT verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  });
};

router.use(authenticateJWT);

router.get('/', async (req, res) => {
  try {
    const timeLogs = await TimeLog.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 });
    res.json({ timeLogs });
  } catch (error) {
    console.error('Error fetching time logs:', error);
    res.status(500).json({ error: 'Failed to fetch time logs' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, durationHours, date } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (typeof durationHours !== 'number' || Number.isNaN(durationHours) || durationHours <= 0) {
      return res.status(400).json({ error: 'Duration must be a positive number' });
    }

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date is required' });
    }

    const timeLog = new TimeLog({
      userId: req.user.id,
      title: title.trim(),
      durationHours,
      date
    });

    const savedTimeLog = await timeLog.save();

    res.status(201).json({
      message: 'Time log created successfully',
      timeLog: savedTimeLog
    });
  } catch (error) {
    console.error('Error creating time log:', error);
    res.status(500).json({ error: 'Failed to create time log' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const timeLog = await TimeLog.findOne({ _id: req.params.id, userId: req.user.id });

    if (!timeLog) {
      return res.status(404).json({ error: 'Time log not found' });
    }

    await TimeLog.findByIdAndDelete(req.params.id);

    res.json({ message: 'Time log deleted successfully' });
  } catch (error) {
    console.error('Error deleting time log:', error);
    res.status(500).json({ error: 'Failed to delete time log' });
  }
});

module.exports = router;
