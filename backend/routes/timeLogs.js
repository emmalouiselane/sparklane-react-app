const express = require('express');
const TimeLog = require('../models/TimeLog');
const { getAppUserId, requireAuth, requireTrustedOrigin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.use(requireTrustedOrigin);

router.get('/', async (req, res) => {
  try {
    const userId = getAppUserId(req.user);
    const timeLogs = await TimeLog.find({ userId }).sort({ date: -1, createdAt: -1 });
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
      userId: getAppUserId(req.user),
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
    const userId = getAppUserId(req.user);
    const timeLog = await TimeLog.findOne({ _id: req.params.id, userId });

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
