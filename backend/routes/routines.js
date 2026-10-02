const express = require('express');
const mongoose = require('mongoose');
const Routine = require('../models/Routine');
const { getAppUserId, requireAuth, requireTrustedOrigin } = require('../middleware/auth');
const { validateRoutine, isValidDate } = require('../lib/routineValidation');
const router = express.Router();
router.use(requireAuth, requireTrustedOrigin);
router.param('id', (req, res, next, id) => mongoose.isValidObjectId(id) ? next() : res.status(400).json({ error: 'Invalid routine ID.' }));

router.get('/', async (req, res) => {
  try {
    res.json({ routines: await Routine.find({ userId: getAppUserId(req.user) }).sort({ time: 1, createdAt: 1 }) });
  } catch (error) { res.status(500).json({ error: 'Unable to load routines.' }); }
});

router.post('/', async (req, res) => {
  const error = validateRoutine(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const { title, days, time, steps } = req.body;
    const routine = await Routine.create({ userId: getAppUserId(req.user), title: title.trim(), days: [...new Set(days)], time, steps: steps.map(title => ({ title: title.trim() })) });
    res.status(201).json({ routine });
  } catch (error) { res.status(500).json({ error: 'Unable to save routine.' }); }
});

router.put('/:id', async (req, res) => {
  const error = validateRoutine(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const { title, days, time, steps } = req.body;
    // Editing a checklist starts its progress fresh, including new step IDs.
    const routine = await Routine.findOneAndUpdate({ _id: req.params.id, userId: getAppUserId(req.user) }, {
      title: title.trim(), days: [...new Set(days)], time, steps: steps.map(title => ({ title: title.trim(), completedOn: '' }))
    }, { new: true, runValidators: true });
    if (!routine) return res.status(404).json({ error: 'Routine not found.' });
    res.json({ routine });
  } catch (error) { res.status(500).json({ error: 'Unable to update routine.' }); }
});

router.patch('/:id/steps/:stepId', async (req, res) => {
  const { date, completed } = req.body;
  if (!mongoose.isValidObjectId(req.params.stepId) || !isValidDate(date) || typeof completed !== 'boolean') return res.status(400).json({ error: 'Invalid checklist update.' });
  try {
    const routine = await Routine.findOneAndUpdate({
      _id: req.params.id, userId: getAppUserId(req.user), 'steps._id': req.params.stepId,
      days: new Date(date).getUTCDay()
    }, { $set: { 'steps.$.completedOn': completed ? date : '' } }, { new: true, runValidators: true });
    if (!routine) return res.status(404).json({ error: 'Scheduled routine or step not found.' });
    res.json({ routine });
  } catch (error) { res.status(500).json({ error: 'Unable to update checklist.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const routine = await Routine.findOneAndDelete({ _id: req.params.id, userId: getAppUserId(req.user) });
    if (!routine) return res.status(404).json({ error: 'Routine not found.' });
    res.json({ message: 'Routine deleted.' });
  } catch (error) { res.status(500).json({ error: 'Unable to delete routine.' }); }
});
module.exports = router;
