const request    = require('supertest');
const { expect } = require('chai');
const sinon      = require('sinon');
const jwt        = require('jsonwebtoken');
const app        = require('../../src/app');
const db         = require('../../src/db/connection');

const SECRET = process.env.JWT_SECRET || 'beauty_secret';

function makeToken(payload = { id: 1, email: 'user@test.com', role: 'customer' }) {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

function makeAdminToken() {
  return makeToken({ id: 99, email: 'admin@test.com', role: 'admin' });
}

function futureDate() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────
describe('POST /api/appointments', () => {
  let dbStub;
  beforeEach(() => { dbStub = sinon.stub(db, 'query'); });
  afterEach(()  => { sinon.restore(); });

  it('returns 201 when booking is successful', async () => {
    dbStub.onCall(0).resolves([{ id: 1 }]);       // staff exists
    dbStub.onCall(1).resolves([{ id: 1 }]);       // service exists
    dbStub.onCall(2).resolves([]);                // no conflict
    dbStub.onCall(3).resolves({ insertId: 10 });  // inserted

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ staff_id: 1, service_id: 1, appt_date: futureDate(), appt_time: '10:00' });

    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('appointmentId');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/appointments')
      .send({ staff_id: 1, service_id: 1, appt_date: futureDate(), appt_time: '10:00' });
    expect(res.status).to.equal(401);
  });

  it('returns 400 when appt_date is in the past', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ staff_id: 1, service_id: 1, appt_date: '2020-01-01', appt_time: '10:00' });
    expect(res.status).to.equal(400);
    expect(res.body.details).to.include('appt_date cannot be in the past');
  });

  it('returns 400 when staff_id is missing', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ service_id: 1, appt_date: futureDate(), appt_time: '10:00' });
    expect(res.status).to.equal(400);
  });

  it('returns 409 on double-booking the same time slot', async () => {
    dbStub.onCall(0).resolves([{ id: 1 }]);  // staff
    dbStub.onCall(1).resolves([{ id: 1 }]);  // service
    dbStub.onCall(2).resolves([{ id: 5 }]);  // conflict!

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ staff_id: 1, service_id: 1, appt_date: futureDate(), appt_time: '10:00' });

    expect(res.status).to.equal(409);
    expect(res.body.error).to.include('already booked');
  });

  it('returns 404 when staff_id does not exist', async () => {
    dbStub.onCall(0).resolves([]); // staff not found

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ staff_id: 999, service_id: 1, appt_date: futureDate(), appt_time: '10:00' });

    expect(res.status).to.equal(404);
  });
});

// ─────────────────────────────────────────────────────────
describe('DELETE /api/appointments/:id/cancel', () => {
  let dbStub;
  beforeEach(() => { dbStub = sinon.stub(db, 'query'); });
  afterEach(()  => { sinon.restore(); });

  it('returns 200 when owner cancels their appointment', async () => {
    dbStub.onCall(0).resolves([{ id: 1, user_id: 1, status: 'pending' }]);
    dbStub.onCall(1).resolves({});

    const res = await request(app)
      .delete('/api/appointments/1/cancel')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).to.equal(200);
    expect(res.body.message).to.include('cancelled');
  });

  it('returns 403 when another user tries to cancel', async () => {
    dbStub.onCall(0).resolves([{ id: 1, user_id: 2, status: 'pending' }]); // belongs to user 2

    const res = await request(app)
      .delete('/api/appointments/1/cancel')
      .set('Authorization', `Bearer ${makeToken({ id: 1, role: 'customer' })}`);

    expect(res.status).to.equal(403);
  });

  it('returns 409 when appointment is already cancelled', async () => {
    dbStub.onCall(0).resolves([{ id: 1, user_id: 1, status: 'cancelled' }]);

    const res = await request(app)
      .delete('/api/appointments/1/cancel')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).to.equal(409);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).delete('/api/appointments/1/cancel');
    expect(res.status).to.equal(401);
  });
});

// ─────────────────────────────────────────────────────────
describe('POST /api/payments', () => {
  let dbStub;
  beforeEach(() => { dbStub = sinon.stub(db, 'query'); });
  afterEach(()  => { sinon.restore(); });

  it('returns 201 on successful payment', async () => {
    dbStub.onCall(0).resolves([{ id: 1, user_id: 1, status: 'confirmed' }]); // appointment
    dbStub.onCall(1).resolves([]);            // no existing payment
    dbStub.onCall(2).resolves({ insertId: 5 }); // payment inserted
    dbStub.onCall(3).resolves({});            // appointment updated

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ appointment_id: 1, amount: 500, method: 'card' });

    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('paymentId');
    expect(res.body.amount).to.equal(500);
  });

  it('returns 400 when amount is missing', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ appointment_id: 1, method: 'cash' });
    expect(res.status).to.equal(400);
  });

  it('returns 400 when amount is negative', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ appointment_id: 1, amount: -100, method: 'cash' });
    expect(res.status).to.equal(400);
  });

  it('returns 400 when payment method is invalid', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ appointment_id: 1, amount: 500, method: 'bitcoin' });
    expect(res.status).to.equal(400);
  });

  it('returns 409 when payment already exists for appointment', async () => {
    dbStub.onCall(0).resolves([{ id: 1, user_id: 1, status: 'confirmed' }]);
    dbStub.onCall(1).resolves([{ id: 3 }]); // payment already exists

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ appointment_id: 1, amount: 500, method: 'card' });

    expect(res.status).to.equal(409);
    expect(res.body.error).to.include('Payment already exists');
  });

  it('returns 409 when appointment is cancelled', async () => {
    dbStub.onCall(0).resolves([{ id: 1, user_id: 1, status: 'cancelled' }]);

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ appointment_id: 1, amount: 500, method: 'card' });

    expect(res.status).to.equal(409);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/payments')
      .send({ appointment_id: 1, amount: 500 });
    expect(res.status).to.equal(401);
  });
});

// ─────────────────────────────────────────────────────────
describe('GET /api/services', () => {
  let dbStub;
  beforeEach(() => { dbStub = sinon.stub(db, 'query'); });
  afterEach(()  => { sinon.restore(); });

  it('returns 200 with list of services (no auth needed)', async () => {
    dbStub.resolves([
      { id: 1, name: 'Haircut', category: 'Hair', price: 500, duration_min: 45 }
    ]);

    const res = await request(app).get('/api/services');
    expect(res.status).to.equal(200);
    expect(res.body.services).to.be.an('array');
    expect(res.body.services[0].name).to.equal('Haircut');
  });

  it('returns 200 with staff list', async () => {
    dbStub.resolves([
      { id: 1, full_name: 'Priya Sharma', specialty: 'Hair' }
    ]);

    const res = await request(app).get('/api/services/staff');
    expect(res.status).to.equal(200);
    expect(res.body.staff).to.be.an('array');
  });
});
