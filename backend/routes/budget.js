const express = require('express');
const BudgetPayment = require('../models/BudgetPayment');
const BudgetSettings = require('../models/BudgetSettings');
const { requireAuth, requireTrustedOrigin } = require('../middleware/auth');

const router = express.Router();

function parseBudgetDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function toBudgetDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addMonthsKeepingDay(date, monthsToAdd, dayOfMonth) {
  const year = date.getFullYear();
  const month = date.getMonth() + monthsToAdd;
  const maxDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(dayOfMonth, maxDay), 12, 0, 0, 0);
}

function getPreviousRecurringOccurrenceDate(startDate, fromDate) {
  const recurrenceStart = parseBudgetDate(startDate);
  const targetDate = parseBudgetDate(fromDate);
  const monthlyAnchorDay = recurrenceStart.getDate();
  let cursor = new Date(recurrenceStart);
  let previousOccurrence = null;
  let guard = 0;

  while (cursor < targetDate && guard < 1200) {
    previousOccurrence = new Date(cursor);
    cursor = addMonthsKeepingDay(cursor, 1, monthlyAnchorDay);
    guard += 1;
  }

  return previousOccurrence ? toBudgetDate(previousOccurrence) : null;
}

router.use(requireAuth);
router.use(requireTrustedOrigin);

router.get('/', async (req, res) => {
  try {
    const [settings, payments] = await Promise.all([
      BudgetSettings.findOne({ userId: req.user.id }),
      BudgetPayment.find({ userId: req.user.id }).sort({ createdAt: -1 })
    ]);

    res.json({
      payDay: settings?.payDay ?? 28,
      payments
    });
  } catch (error) {
    console.error('Error fetching budget data:', error);
    res.status(500).json({ error: 'Failed to fetch budget data' });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const settings = await BudgetSettings.findOne({ userId: req.user.id });

    res.json({
      payDay: settings?.payDay ?? 28
    });
  } catch (error) {
    console.error('Error fetching budget settings:', error);
    res.status(500).json({ error: 'Failed to fetch budget settings' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { payDay } = req.body;

    if (!Number.isInteger(payDay) || payDay < 1 || payDay > 31) {
      return res.status(400).json({ error: 'Pay day must be an integer between 1 and 31' });
    }

    const settings = await BudgetSettings.findOneAndUpdate(
      { userId: req.user.id },
      { payDay },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: 'Budget settings updated successfully',
      payDay: settings.payDay
    });
  } catch (error) {
    console.error('Error updating budget settings:', error);
    res.status(500).json({ error: 'Failed to update budget settings' });
  }
});

router.post('/payments', async (req, res) => {
  try {
    const { title, amount, type, kind, date, startDate } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid payment type' });
    }

    if (!['single', 'recurring'].includes(kind)) {
      return res.status(400).json({ error: 'Invalid payment kind' });
    }

    if (kind === 'single' && !date) {
      return res.status(400).json({ error: 'Date is required for single payments' });
    }

    if (kind === 'recurring' && !startDate) {
      return res.status(400).json({ error: 'Start date is required for recurring payments' });
    }

    const payment = new BudgetPayment({
      userId: req.user.id,
      title: title.trim(),
      amount,
      type,
      kind,
      date: kind === 'single' ? date : undefined,
      startDate: kind === 'recurring' ? startDate : undefined,
      endDate: undefined,
      paidDates: []
    });

    const savedPayment = await payment.save();

    res.status(201).json({
      message: 'Payment created successfully',
      payment: savedPayment
    });
  } catch (error) {
    console.error('Error creating budget payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

router.patch('/payments/:id/recurring-end', async (req, res) => {
  try {
    const { fromDate } = req.body;

    if (typeof fromDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      return res.status(400).json({ error: 'A valid recurring occurrence date is required' });
    }

    const payment = await BudgetPayment.findOne({ _id: req.params.id, userId: req.user.id });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.kind !== 'recurring' || !payment.startDate) {
      return res.status(400).json({ error: 'Only recurring payments can be trimmed' });
    }

    const previousOccurrenceDate = getPreviousRecurringOccurrenceDate(payment.startDate, fromDate);

    if (!previousOccurrenceDate) {
      await BudgetPayment.findByIdAndDelete(req.params.id);
      return res.json({
        message: 'Recurring payment removed completely',
        deleted: true
      });
    }

    payment.endDate = previousOccurrenceDate;
    payment.paidDates = (Array.isArray(payment.paidDates) ? payment.paidDates : []).filter(
      (paidDate) => paidDate <= previousOccurrenceDate
    );

    const updatedPayment = await payment.save();

    res.json({
      message: 'Recurring payment updated successfully',
      deleted: false,
      payment: updatedPayment
    });
  } catch (error) {
    console.error('Error trimming recurring payment:', error);
    res.status(500).json({ error: 'Failed to update recurring payment' });
  }
});

router.patch('/payments/:id/paid', async (req, res) => {
  try {
    const { date, paid } = req.body;

    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'A valid occurrence date is required' });
    }

    if (typeof paid !== 'boolean') {
      return res.status(400).json({ error: 'Paid status must be true or false' });
    }

    const payment = await BudgetPayment.findOne({ _id: req.params.id, userId: req.user.id });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.kind === 'single' && payment.date !== date) {
      return res.status(400).json({ error: 'Occurrence date does not match this payment' });
    }

    const currentPaidDates = Array.isArray(payment.paidDates) ? payment.paidDates : [];
    payment.paidDates = paid
      ? Array.from(new Set([...currentPaidDates, date]))
      : currentPaidDates.filter((paidDate) => paidDate !== date);

    const updatedPayment = await payment.save();

    res.json({
      message: paid ? 'Payment marked as paid' : 'Payment marked as unpaid',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('Error updating paid status:', error);
    res.status(500).json({ error: 'Failed to update paid status' });
  }
});

router.delete('/payments/:id', async (req, res) => {
  try {
    const payment = await BudgetPayment.findOne({ _id: req.params.id, userId: req.user.id });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await BudgetPayment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

module.exports = router;
