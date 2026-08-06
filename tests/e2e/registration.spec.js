// @ts-check
const { test, expect } = require('@playwright/test');

// ─── E2E Tests: User Registration Flow ─────────────────
// These tests open a real browser and exercise the full
// user journey from the UI through the API.
//
// Run: npx playwright test
// These require the server to be running on localhost:3000

const BASE = 'http://localhost:3000';

test.describe('User Registration', () => {

  test('registers successfully with valid data', async ({ page }) => {
    const uniqueEmail = `test_${Date.now()}@parlor.com`;

    const res = await page.request.post(`${BASE}/api/auth/register`, {
      data: {
        full_name: 'Priya Sharma',
        email:     uniqueEmail,
        phone:     '9876543210',
        password:  'secret123'
      }
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('userId');
    expect(typeof body.userId).toBe('number');
  });

  test('returns 409 when registering with a duplicate email', async ({ page }) => {
    const email = `duplicate_${Date.now()}@parlor.com`;

    // First registration
    await page.request.post(`${BASE}/api/auth/register`, {
      data: { full_name: 'User One', email, phone: '9876543210', password: 'secret123' }
    });

    // Duplicate
    const res = await page.request.post(`${BASE}/api/auth/register`, {
      data: { full_name: 'User Two', email, phone: '9876543210', password: 'secret123' }
    });

    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('already registered');
  });

  test('returns 400 when email format is invalid', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/auth/register`, {
      data: { full_name: 'Priya', email: 'not-an-email', phone: '9876543210', password: 'secret123' }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('details');
  });

  test('returns 400 when phone number is not 10 digits', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/auth/register`, {
      data: { full_name: 'Priya', email: 'p@test.com', phone: '123', password: 'secret123' }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.details).toContain('Phone must be exactly 10 digits');
  });

  test('returns 400 when all fields are empty', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/auth/register`, { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.details.length).toBeGreaterThan(1);
  });
});

// ─── E2E Tests: Login Flow ──────────────────────────────
test.describe('User Login', () => {

  test('logs in successfully and receives a JWT token', async ({ page }) => {
    const email = `login_${Date.now()}@parlor.com`;

    // Register first
    await page.request.post(`${BASE}/api/auth/register`, {
      data: { full_name: 'Login User', email, phone: '9876543210', password: 'mypassword' }
    });

    // Login
    const res = await page.request.post(`${BASE}/api/auth/login`, {
      data: { email, password: 'mypassword' }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('token');
    expect(body.user.email).toBe(email);
  });

  test('returns 401 when credentials are wrong', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/auth/login`, {
      data: { email: 'nonexistent@parlor.com', password: 'wrongpass' }
    });
    expect(res.status()).toBe(401);
  });

  test('returns 401 when password is incorrect', async ({ page }) => {
    const email = `wrongpass_${Date.now()}@parlor.com`;
    await page.request.post(`${BASE}/api/auth/register`, {
      data: { full_name: 'Test User', email, phone: '9876543210', password: 'correctpass' }
    });

    const res = await page.request.post(`${BASE}/api/auth/login`, {
      data: { email, password: 'wrongpass' }
    });
    expect(res.status()).toBe(401);
  });
});

// ─── E2E Tests: Appointment Booking Flow ────────────────
test.describe('Appointment Booking', () => {
  let token;

  test.beforeEach(async ({ page }) => {
    const email = `appt_${Date.now()}@parlor.com`;
    await page.request.post(`${BASE}/api/auth/register`, {
      data: { full_name: 'Appt User', email, phone: '9876543210', password: 'secret123' }
    });
    const loginRes = await page.request.post(`${BASE}/api/auth/login`, {
      data: { email, password: 'secret123' }
    });
    const body = await loginRes.json();
    token = body.token;
  });

  function futureDate() {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  }

  test('books appointment successfully with valid data', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/appointments`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { staff_id: 1, service_id: 1, appt_date: futureDate(), appt_time: '11:00' }
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('appointmentId');
  });

  test('returns 400 when booking with a past date', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/appointments`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { staff_id: 1, service_id: 1, appt_date: '2020-01-01', appt_time: '10:00' }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.details).toContain('appt_date cannot be in the past');
  });

  test('returns 401 when booking without authentication', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/appointments`, {
      data: { staff_id: 1, service_id: 1, appt_date: futureDate(), appt_time: '10:00' }
    });
    expect(res.status()).toBe(401);
  });

  test('full booking-to-payment journey', async ({ page }) => {
    const date = futureDate();
    const time = '14:00';

    // 1. Book appointment
    const bookRes = await page.request.post(`${BASE}/api/appointments`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { staff_id: 2, service_id: 2, appt_date: date, appt_time: time }
    });
    expect(bookRes.status()).toBe(201);
    const { appointmentId } = await bookRes.json();

    // 2. Make payment
    const payRes = await page.request.post(`${BASE}/api/payments`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { appointment_id: appointmentId, amount: 800, method: 'upi' }
    });
    expect(payRes.status()).toBe(201);
    const payBody = await payRes.json();
    expect(payBody).toHaveProperty('paymentId');
    expect(payBody.amount).toBe(800);

    // 3. Verify appointment is now completed
    const apptRes = await page.request.get(`${BASE}/api/appointments/${appointmentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(apptRes.status()).toBe(200);
    const apptBody = await apptRes.json();
    expect(apptBody.appointment.status).toBe('completed');
  });
});
