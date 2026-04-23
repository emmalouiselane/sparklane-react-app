const express = require('express');
const BudgetPayment = require('../models/BudgetPayment');
const BudgetSettings = require('../models/BudgetSettings');
const { getAppUserId, requireAuth, requireTrustedOrigin } = require('../middleware/auth');

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

function isValidBudgetDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeAmountOverrides(payment) {
  if (!Array.isArray(payment.amountOverrides)) {
    return [];
  }

  return payment.amountOverrides
    .filter((override) => isValidBudgetDate(override?.date) && typeof override?.amount === 'number')
    .sort((a, b) => a.date.localeCompare(b.date));
}

router.use(requireAuth);
router.use(requireTrustedOrigin);

router.get('/', async (req, res) => {
  try {
    const userId = getAppUserId(req.user);
    const [settings, payments] = await Promise.all([
      BudgetSettings.findOne({ userId }),
      BudgetPayment.find({ userId }).sort({ createdAt: -1 })
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
    const userId = getAppUserId(req.user);
    const settings = await BudgetSettings.findOne({ userId });

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
    const userId = getAppUserId(req.user);

    if (!Number.isInteger(payDay) || payDay < 1 || payDay > 31) {
      return res.status(400).json({ error: 'Pay day must be an integer between 1 and 31' });
    }

    const settings = await BudgetSettings.findOneAndUpdate(
      { userId },
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
      userId: getAppUserId(req.user),
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

    const userId = getAppUserId(req.user);
    const payment = await BudgetPayment.findOne({ _id: req.params.id, userId });

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

    const userId = getAppUserId(req.user);
    const payment = await BudgetPayment.findOne({ _id: req.params.id, userId });

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

router.patch('/payments/:id', async (req, res) => {
  try {
    const { amount, scope = 'all', date } = req.body;
    const userId = getAppUserId(req.user);

    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const payment = await BudgetPayment.findOne({ _id: req.params.id, userId });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.kind === 'single') {
      payment.amount = amount;
      const updatedPayment = await payment.save();

      return res.json({
        message: 'Payment updated successfully',
        payment: updatedPayment
      });
    }

    if (!['single-instance', 'this-and-future', 'all'].includes(scope)) {
      return res.status(400).json({ error: 'Invalid update scope' });
    }

    if ((scope === 'single-instance' || scope === 'this-and-future') && !isValidBudgetDate(date)) {
      return res.status(400).json({ error: 'A valid recurring occurrence date is required' });
    }

    if (!payment.startDate) {
      return res.status(400).json({ error: 'Recurring payment is missing a start date' });
    }

    if (scope === 'all') {
      payment.amount = amount;
      payment.amountOverrides = [];
      const updatedPayment = await payment.save();

      return res.json({
        message: 'Recurring payment updated successfully',
        payment: updatedPayment
      });
    }

    if (scope === 'single-instance') {
      const existingOverrides = normalizeAmountOverrides(payment).filter((override) => override.date !== date);
      payment.amountOverrides = [...existingOverrides, { date, amount }];

      const updatedPayment = await payment.save();

      return res.json({
        message: 'Payment occurrence updated successfully',
        payment: updatedPayment
      });
    }

    const previousOccurrenceDate = getPreviousRecurringOccurrenceDate(payment.startDate, date);
    const originalEndDate = payment.endDate;

    if (!previousOccurrenceDate) {
      payment.startDate = date;
      payment.amount = amount;
      payment.amountOverrides = normalizeAmountOverrides(payment)
        .filter((override) => override.date >= date)
        .map((override) => ({
          date: override.date,
          amount: override.amount
        }));

      const updatedPayment = await payment.save();

      return res.json({
        message: 'Recurring payment updated successfully',
        payment: updatedPayment,
        createdPayment: null,
        deletedOriginal: false
      });
    }

    const existingOverrides = normalizeAmountOverrides(payment);
    const carriedOverrides = existingOverrides
      .filter((override) => override.date >= date)
      .map((override) => ({
        date: override.date,
        amount: override.date === date ? amount : override.amount
      }));

    if (!carriedOverrides.some((override) => override.date === date)) {
      carriedOverrides.unshift({ date, amount });
    }

    const futurePaidDates = (Array.isArray(payment.paidDates) ? payment.paidDates : []).filter((paidDate) => paidDate >= date);

    payment.endDate = previousOccurrenceDate;
    payment.paidDates = (Array.isArray(payment.paidDates) ? payment.paidDates : []).filter(
      (paidDate) => paidDate <= previousOccurrenceDate
    );
    payment.amountOverrides = existingOverrides
      .filter((override) => override.date <= previousOccurrenceDate)
      .map((override) => ({
        date: override.date,
        amount: override.amount
      }));

    const newPayment = new BudgetPayment({
      userId,
      title: payment.title,
      amount,
      type: payment.type,
      kind: payment.kind,
      startDate: date,
      endDate: originalEndDate && originalEndDate >= date ? originalEndDate : undefined,
      paidDates: futurePaidDates,
      amountOverrides: carriedOverrides
    });

    const [updatedPayment, createdPayment] = await Promise.all([
      payment.save(),
      newPayment.save()
    ]);

    res.json({
      message: 'Recurring payment updated successfully',
      payment: updatedPayment,
      createdPayment
    });
  } catch (error) {
    console.error('Error updating budget payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

router.delete('/payments/:id', async (req, res) => {
  try {
    const userId = getAppUserId(req.user);
    const payment = await BudgetPayment.findOne({ _id: req.params.id, userId });

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
