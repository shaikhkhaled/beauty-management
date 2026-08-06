const db = require('../db/connection');

async function createPayment(req, res) {
  try {
    const { appointment_id, amount, method } = req.body;
    const validMethods = ['cash', 'card', 'upi'];
    const payMethod = method || 'cash';

    if (!appointment_id)
      return res.status(400).json({ error: 'appointment_id is required.' });

    // Verify appointment exists and belongs to user (or user is admin)
    const appts = await db.query(
      'SELECT id, user_id, status FROM appointments WHERE id = ?',
      [appointment_id]
    );
    if (appts.length === 0)
      return res.status(404).json({ error: 'Appointment not found.' });

    const appt = appts[0];
    if (appt.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Access denied.' });

    if (appt.status === 'cancelled')
      return res.status(409).json({ error: 'Cannot pay for a cancelled appointment.' });

    // Prevent duplicate payment
    const existing = await db.query(
      'SELECT id FROM payments WHERE appointment_id = ?',
      [appointment_id]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: 'Payment already exists for this appointment.' });

    const result = await db.query(
      'INSERT INTO payments (appointment_id, amount, method, status) VALUES (?,?,?,?)',
      [appointment_id, amount, payMethod, 'completed']
    );

    // Update appointment to completed
    await db.query(
      'UPDATE appointments SET status = ? WHERE id = ?',
      ['completed', appointment_id]
    );

    return res.status(201).json({
      message: 'Payment successful.',
      paymentId: result.insertId,
      amount, method: payMethod
    });
  } catch (err) {
    console.error('createPayment error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

async function getPaymentByAppointment(req, res) {
  try {
    const rows = await db.query(
      `SELECT p.*, a.user_id FROM payments p
       JOIN appointments a ON p.appointment_id = a.id
       WHERE p.appointment_id = ?`,
      [req.params.appointmentId]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Payment not found.' });

    const payment = rows[0];
    if (payment.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Access denied.' });

    return res.status(200).json({ payment });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

async function getAllPayments(req, res) {
  try {
    const rows = await db.query(
      `SELECT p.id, p.amount, p.method, p.status, p.created_at,
              u.full_name AS customer_name, sv.name AS service_name
       FROM payments p
       JOIN appointments a ON p.appointment_id = a.id
       JOIN users u        ON a.user_id = u.id
       JOIN services sv    ON a.service_id = sv.id
       ORDER BY p.created_at DESC`
    );
    return res.status(200).json({ payments: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { createPayment, getPaymentByAppointment, getAllPayments };
