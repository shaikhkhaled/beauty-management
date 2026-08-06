function validateRegistration(req, res, next) {
  const { full_name, email, phone, password } = req.body;
  const errors = [];

  if (!full_name || full_name.trim().length < 2)
    errors.push('full_name must be at least 2 characters');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email))
    errors.push('Valid email is required');

  const phoneRegex = /^[0-9]{10}$/;
  if (!phone || !phoneRegex.test(phone))
    errors.push('Phone must be exactly 10 digits');

  if (!password || password.length < 6)
    errors.push('Password must be at least 6 characters');

  if (errors.length > 0)
    return res.status(400).json({ error: 'Validation failed', details: errors });

  next();
}

function validateAppointment(req, res, next) {
  const { staff_id, service_id, appt_date, appt_time } = req.body;
  const errors = [];

  if (!staff_id) errors.push('staff_id is required');
  if (!service_id) errors.push('service_id is required');

  if (!appt_date) {
    errors.push('appt_date is required');
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(appt_date);
    if (isNaN(bookingDate.getTime()))
      errors.push('appt_date must be a valid date (YYYY-MM-DD)');
    else if (bookingDate < today)
      errors.push('appt_date cannot be in the past');
  }

  if (!appt_time) errors.push('appt_time is required (HH:MM)');

  if (errors.length > 0)
    return res.status(400).json({ error: 'Validation failed', details: errors });

  next();
}

function validatePayment(req, res, next) {
  const { amount, method } = req.body;
  const errors = [];
  const validMethods = ['cash', 'card', 'upi'];

  if (amount === undefined || amount === null)
    errors.push('amount is required');
  else if (isNaN(amount) || Number(amount) <= 0)
    errors.push('amount must be a positive number');

  if (method && !validMethods.includes(method))
    errors.push(`method must be one of: ${validMethods.join(', ')}`);

  if (errors.length > 0)
    return res.status(400).json({ error: 'Validation failed', details: errors });

  next();
}

module.exports = { validateRegistration, validateAppointment, validatePayment };
