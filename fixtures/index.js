/**
 * Test Fixtures Factory
 * Provides reusable test data for unit, API, and E2E tests.
 * Call cleanup() in afterEach to keep tests isolated.
 */

const db = require('../src/db/connection');
const bcrypt = require('bcryptjs');

// ── Static fixture data ──────────────────────────────────
const validUser = {
  name:     'Test Khaled',
  email:    'test_khaled@beauty.com',
  phone:    '9876543210',
  password: 'Test@1234'
};

const adminUser = {
  name:     'Test Admin',
  email:    'test_admin@beauty.com',
  phone:    '9876543211',
  password: 'Admin@1234'
};

// ── DB-backed fixture creators ───────────────────────────
async function createUser(overrides = {}) {
  const data = { ...validUser, ...overrides };
  const hashed = await bcrypt.hash(data.password, 10);
  const [result] = await db.query(
    'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
    [data.name, data.email, data.phone, hashed, data.role || 'customer']
  );
  return { id: result.insertId, ...data };
}

async function createAdmin(overrides = {}) {
  return createUser({ ...adminUser, role: 'admin', ...overrides });
}

async function createAppointment(userId, overrides = {}) {
  // Get a real service id
  const [services] = await db.query('SELECT id FROM services LIMIT 1');
  const serviceId = overrides.service_id || services[0]?.id || 1;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = overrides.date || tomorrow.toISOString().split('T')[0];

  const [result] = await db.query(
    `INSERT INTO appointments (user_id, service_id, staff_id, date, time_slot, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, serviceId, overrides.staff_id || null, date,
     overrides.time_slot || '10:00:00', overrides.status || 'pending']
  );
  return { id: result.insertId, user_id: userId, service_id: serviceId, date, status: 'pending' };
}

// ── Cleanup — call in afterEach ──────────────────────────
async function cleanup() {
  await db.query("DELETE FROM payments     WHERE appointment_id IN (SELECT id FROM appointments WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_%'))");
  await db.query("DELETE FROM appointments WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_%')");
  await db.query("DELETE FROM users        WHERE email LIKE 'test_%'");
}

module.exports = { validUser, adminUser, createUser, createAdmin, createAppointment, cleanup };
