const db = require('../db/connection');

async function bookAppointment(req, res) {
  try {
    const { staff_id, service_id, appt_date, appt_time } = req.body;
    const user_id = req.user.id;

    // Verify staff exists
    const staff = await db.query('SELECT id FROM staff WHERE id = ?', [staff_id]);
    if (staff.length === 0)
      return res.status(404).json({ error: 'Staff member not found.' });

    // Verify service exists
    const service = await db.query('SELECT id FROM services WHERE id = ?', [service_id]);
    if (service.length === 0)
      return res.status(404).json({ error: 'Service not found.' });

    // Check double-booking: same staff, same date & time
    const conflict = await db.query(
      `SELECT id FROM appointments
       WHERE staff_id = ? AND appt_date = ? AND appt_time = ?
       AND status NOT IN ('cancelled')`,
      [staff_id, appt_date, appt_time]
    );
    if (conflict.length > 0)
      return res.status(409).json({ error: 'This time slot is already booked for the selected staff.' });

    const result = await db.query(
      `INSERT INTO appointments (user_id, staff_id, service_id, appt_date, appt_time)
       VALUES (?,?,?,?,?)`,
      [user_id, staff_id, service_id, appt_date, appt_time]
    );

    return res.status(201).json({
      message: 'Appointment booked successfully.',
      appointmentId: result.insertId
    });
  } catch (err) {
    console.error('bookAppointment error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

async function getMyAppointments(req, res) {
  try {
    const rows = await db.query(
      `SELECT a.id, a.appt_date, a.appt_time, a.status,
              s.full_name AS staff_name, sv.name AS service_name, sv.price
       FROM appointments a
       JOIN staff s    ON a.staff_id   = s.id
       JOIN services sv ON a.service_id = sv.id
       WHERE a.user_id = ?
       ORDER BY a.appt_date DESC, a.appt_time DESC`,
      [req.user.id]
    );
    return res.status(200).json({ appointments: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

async function getAppointmentById(req, res) {
  try {
    const rows = await db.query(
      `SELECT a.*, s.full_name AS staff_name, sv.name AS service_name, sv.price
       FROM appointments a
       JOIN staff s    ON a.staff_id   = s.id
       JOIN services sv ON a.service_id = sv.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Appointment not found.' });

    const appt = rows[0];
    // Only owner or admin can view
    if (appt.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Access denied.' });

    return res.status(200).json({ appointment: appt });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];

    if (!status || !validStatuses.includes(status))
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });

    const rows = await db.query('SELECT id FROM appointments WHERE id = ?', [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ error: 'Appointment not found.' });

    await db.query('UPDATE appointments SET status = ? WHERE id = ?', [status, req.params.id]);
    return res.status(200).json({ message: 'Appointment status updated.', status });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

async function cancelAppointment(req, res) {
  try {
    const rows = await db.query(
      'SELECT id, user_id, status FROM appointments WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Appointment not found.' });

    const appt = rows[0];
    if (appt.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Access denied.' });

    if (appt.status === 'cancelled')
      return res.status(409).json({ error: 'Appointment is already cancelled.' });

    await db.query('UPDATE appointments SET status = ? WHERE id = ?', ['cancelled', req.params.id]);
    return res.status(200).json({ message: 'Appointment cancelled successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = {
  bookAppointment, getMyAppointments,
  getAppointmentById, updateStatus, cancelAppointment
};
