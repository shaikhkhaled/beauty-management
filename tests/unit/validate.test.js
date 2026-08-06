const { expect } = require('chai');
const sinon = require('sinon');

// ─── Unit tests for validation middleware ───────────────
// We test the middleware functions directly without spinning up a server.
// Each test creates fake req/res objects and calls the middleware.

const {
  validateRegistration,
  validateAppointment,
  validatePayment
} = require('../../src/middleware/validate');

function mockRes() {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json   = sinon.stub().returns(res);
  return res;
}

// ─────────────────────────────────────────────────────────
describe('validateRegistration middleware', () => {

  it('calls next() when all fields are valid', () => {
    const req  = { body: { full_name: 'Priya Sharma', email: 'priya@test.com', phone: '9876543210', password: 'secret123' } };
    const res  = mockRes();
    const next = sinon.spy();

    validateRegistration(req, res, next);

    expect(next.calledOnce).to.be.true;
    expect(res.status.called).to.be.false;
  });

  it('returns 400 when email is missing', () => {
    const req = { body: { full_name: 'Priya', phone: '9876543210', password: 'secret123' } };
    const res = mockRes();
    const next = sinon.spy();

    validateRegistration(req, res, next);

    expect(res.status.calledWith(400)).to.be.true;
    expect(next.called).to.be.false;
  });

  it('returns 400 when email format is invalid', () => {
    const req = { body: { full_name: 'Priya', email: 'not-an-email', phone: '9876543210', password: 'secret' } };
    const res = mockRes();
    const next = sinon.spy();

    validateRegistration(req, res, next);

    expect(res.status.calledWith(400)).to.be.true;
    const body = res.json.args[0][0];
    expect(body.details).to.include('Valid email is required');
  });

  it('returns 400 when phone is not 10 digits', () => {
    const req = { body: { full_name: 'Priya', email: 'p@test.com', phone: '123', password: 'secret123' } };
    const res = mockRes();
    const next = sinon.spy();

    validateRegistration(req, res, next);

    expect(res.status.calledWith(400)).to.be.true;
    const body = res.json.args[0][0];
    expect(body.details).to.include('Phone must be exactly 10 digits');
  });

  it('returns 400 when password is shorter than 6 characters', () => {
    const req = { body: { full_name: 'Priya', email: 'p@test.com', phone: '9876543210', password: '123' } };
    const res = mockRes();
    const next = sinon.spy();

    validateRegistration(req, res, next);

    expect(res.status.calledWith(400)).to.be.true;
  });

  it('returns 400 when full_name is too short', () => {
    const req = { body: { full_name: 'A', email: 'p@test.com', phone: '9876543210', password: 'secret123' } };
    const res = mockRes();
    const next = sinon.spy();

    validateRegistration(req, res, next);

    expect(res.status.calledWith(400)).to.be.true;
  });

  it('returns 400 when all fields are missing', () => {
    const req  = { body: {} };
    const res  = mockRes();
    const next = sinon.spy();

    validateRegistration(req, res, next);

    expect(res.status.calledWith(400)).to.be.true;
    const body = res.json.args[0][0];
    expect(body.details.length).to.be.greaterThan(1);
  });
});

// ─────────────────────────────────────────────────────────
describe('validateAppointment middleware', () => {

  function futureDate() {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  }

  it('calls next() when all fields are valid', () => {
    const req  = { body: { staff_id: 1, service_id: 1, appt_date: futureDate(), appt_time: '10:00' } };
    const res  = mockRes();
    const next = sinon.spy();

    validateAppointment(req, res, next);

    expect(next.calledOnce).to.be.true;
  });

  it('returns 400 when appt_date is in the past', () => {
    const req  = { body: { staff_id: 1, service_id: 1, appt_date: '2020-01-01', appt_time: '10:00' } };
    const res  = mockRes();
    const next = sinon.spy();

    validateAppointment(req, res, next);

    expect(res.status.calledWith(400)).to.be.true;
    const body = res.json.args[0][0];
    expect(body.details).to.include('appt_date cannot be in the past');
  });

  it('returns 400 when staff_id is missing', () => {
    const req  = { body: { service_id: 1, appt_date: futureDate(), appt_time: '10:00' } };
    const res  = mockRes();
    const next = sinon.spy();

    validateAppointment(req, res, next);

    expect(res.status.calledWith(400)).to.be.true;
  });

  it('returns 400 when appt_date format is invalid', () => {
    const req  = { body: { staff_id: 1, service_id: 1, appt_date: 'not-a-date', appt_time: '10:00' } };
    const res  = mockRes();
    const next = sinon.spy();

    validateAppointment(req, res, next);

    expect(res.status.calledWith(400)).to.be.true;
  });
});

// ─────────────────────────────────────────────────────────
describe('validatePayment middleware', () => {

  it('calls next() when amount and method are valid', () => {
    const req  = { body: { amount: 500, method: 'card' } };
    const res  = mockRes();
    const next = sinon.spy();

    validatePayment(req, res, next);

    expect(next.calledOnce).to.be.true;
  });

  it('returns 400 when amount is zero', () => {
    const req  = { body: { amount: 0, method: 'cash' } };
    const res  = mockRes();
    const next = sinon.spy();

    validatePayment(req, res, next);

    expect(res.status.calledWith(400)).to.be.true;
  });

  it('returns 400 when amount is negative', () => {
    const req  = { body: { amount: -100, method: 'cash' } };
    const res  = mockRes();
    const next = sinon.spy();

    validatePayment(req, res, next);

    expect(res.status.calledWith(400)).to.be.true;
  });

  it('returns 400 when method is invalid', () => {
    const req  = { body: { amount: 500, method: 'bitcoin' } };
    const res  = mockRes();
    const next = sinon.spy();

    validatePayment(req, res, next);

    expect(res.status.calledWith(400)).to.be.true;
    const body = res.json.args[0][0];
    expect(body.details[0]).to.include('cash, card, upi');
  });

  it('returns 400 when amount is missing', () => {
    const req  = { body: { method: 'cash' } };
    const res  = mockRes();
    const next = sinon.spy();

    validatePayment(req, res, next);

    expect(res.status.calledWith(400)).to.be.true;
  });
});
