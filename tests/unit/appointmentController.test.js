const { expect } = require('chai');
const sinon      = require('sinon');
const db         = require('../../src/db/connection');
const {
  bookAppointment, cancelAppointment, updateStatus
} = require('../../src/controllers/appointmentController');

function mockRes() {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json   = sinon.stub().returns(res);
  return res;
}

function futureDate() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
}

describe('appointmentController.bookAppointment()', () => {
  let dbStub;

  beforeEach(() => { dbStub = sinon.stub(db, 'query'); });
  afterEach(() => { sinon.restore(); });

  it('returns 201 with appointmentId on successful booking', async () => {
    dbStub.onCall(0).resolves([{ id: 1 }]);  // staff exists
    dbStub.onCall(1).resolves([{ id: 1 }]);  // service exists
    dbStub.onCall(2).resolves([]);            // no double-booking
    dbStub.onCall(3).resolves({ insertId: 7 }); // INSERT

    const req = {
      user: { id: 1 },
      body: { staff_id: 1, service_id: 1, appt_date: futureDate(), appt_time: '10:00' }
    };
    const res = mockRes();

    await bookAppointment(req, res);

    expect(res.status.calledWith(201)).to.be.true;
    expect(res.json.args[0][0].appointmentId).to.equal(7);
  });

  it('returns 404 when staff_id does not exist', async () => {
    dbStub.onCall(0).resolves([]); // staff not found

    const req = { user: { id: 1 }, body: { staff_id: 999, service_id: 1, appt_date: futureDate(), appt_time: '10:00' } };
    const res = mockRes();

    await bookAppointment(req, res);

    expect(res.status.calledWith(404)).to.be.true;
    expect(res.json.args[0][0].error).to.include('Staff');
  });

  it('returns 409 on double-booking the same slot', async () => {
    dbStub.onCall(0).resolves([{ id: 1 }]); // staff exists
    dbStub.onCall(1).resolves([{ id: 1 }]); // service exists
    dbStub.onCall(2).resolves([{ id: 5 }]); // conflict found!

    const req = { user: { id: 1 }, body: { staff_id: 1, service_id: 1, appt_date: futureDate(), appt_time: '10:00' } };
    const res = mockRes();

    await bookAppointment(req, res);

    expect(res.status.calledWith(409)).to.be.true;
    expect(res.json.args[0][0].error).to.include('already booked');
  });

  it('returns 404 when service_id does not exist', async () => {
    dbStub.onCall(0).resolves([{ id: 1 }]); // staff OK
    dbStub.onCall(1).resolves([]);           // service not found

    const req = { user: { id: 1 }, body: { staff_id: 1, service_id: 999, appt_date: futureDate(), appt_time: '10:00' } };
    const res = mockRes();

    await bookAppointment(req, res);

    expect(res.status.calledWith(404)).to.be.true;
    expect(res.json.args[0][0].error).to.include('Service');
  });
});

describe('appointmentController.cancelAppointment()', () => {
  let dbStub;

  beforeEach(() => { dbStub = sinon.stub(db, 'query'); });
  afterEach(() => { sinon.restore(); });

  it('returns 200 when owner cancels their appointment', async () => {
    dbStub.onCall(0).resolves([{ id: 1, user_id: 1, status: 'pending' }]);
    dbStub.onCall(1).resolves({});

    const req = { user: { id: 1, role: 'customer' }, params: { id: '1' } };
    const res = mockRes();

    await cancelAppointment(req, res);

    expect(res.status.calledWith(200)).to.be.true;
    expect(res.json.args[0][0].message).to.include('cancelled');
  });

  it('returns 403 when a different user tries to cancel', async () => {
    dbStub.onCall(0).resolves([{ id: 1, user_id: 2, status: 'pending' }]); // belongs to user 2

    const req = { user: { id: 1, role: 'customer' }, params: { id: '1' } }; // user 1 trying
    const res = mockRes();

    await cancelAppointment(req, res);

    expect(res.status.calledWith(403)).to.be.true;
  });

  it('returns 409 when appointment is already cancelled', async () => {
    dbStub.onCall(0).resolves([{ id: 1, user_id: 1, status: 'cancelled' }]);

    const req = { user: { id: 1, role: 'customer' }, params: { id: '1' } };
    const res = mockRes();

    await cancelAppointment(req, res);

    expect(res.status.calledWith(409)).to.be.true;
  });

  it('returns 404 when appointment does not exist', async () => {
    dbStub.onCall(0).resolves([]);

    const req = { user: { id: 1, role: 'customer' }, params: { id: '999' } };
    const res = mockRes();

    await cancelAppointment(req, res);

    expect(res.status.calledWith(404)).to.be.true;
  });
});
