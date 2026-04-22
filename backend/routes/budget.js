const express = require('express');
const jwt = require('jsonwebtoken');
const BudgetPayment = require('../models/BudgetPayment');
const BudgetSettings = require('../models/BudgetSettings');

const router = express.Router();

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      console.log('Budget JWT verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  });
};

router.use(authenticateJWT);

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
