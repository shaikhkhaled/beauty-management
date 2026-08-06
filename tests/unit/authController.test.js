const { expect } = require('chai');
const sinon      = require('sinon');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');

// We stub the DB module so unit tests NEVER touch a real database
const db = require('../../src/db/connection');
const { register, login, getProfile } = require('../../src/controllers/authController');

function mockRes() {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json   = sinon.stub().returns(res);
  return res;
}

// ─────────────────────────────────────────────────────────
describe('authController.register()', () => {
  let dbQueryStub;

  beforeEach(() => {
    dbQueryStub = sinon.stub(db, 'query');
  });

  afterEach(() => {
    sinon.restore(); // always restore stubs — no leakage between tests
  });

  it('returns 201 with userId when registration succeeds', async () => {
    dbQueryStub.onFirstCall().resolves([]);           // no existing user
    dbQueryStub.onSecondCall().resolves({ insertId: 42 }); // INSERT

    const req = { body: { full_name: 'Priya Sharma', email: 'priya@test.com', phone: '9876543210', password: 'secret123' } };
    const res = mockRes();

    await register(req, res);

    expect(res.status.calledWith(201)).to.be.true;
    const body = res.json.args[0][0];
    expect(body.userId).to.equal(42);
    expect(body.message).to.include('registered');
  });

  it('returns 409 when email already exists', async () => {
    dbQueryStub.onFirstCall().resolves([{ id: 1 }]); // email found

    const req = { body: { full_name: 'Priya', email: 'priya@test.com', phone: '9876543210', password: 'secret' } };
    const res = mockRes();

    await register(req, res);

    expect(res.status.calledWith(409)).to.be.true;
    const body = res.json.args[0][0];
    expect(body.error).to.include('already registered');
  });

  it('returns 500 when db throws an error', async () => {
    dbQueryStub.rejects(new Error('DB connection lost'));

    const req = { body: { full_name: 'Priya', email: 'priya@test.com', phone: '9876543210', password: 'secret' } };
    const res = mockRes();

    await register(req, res);

    expect(res.status.calledWith(500)).to.be.true;
  });
});

// ─────────────────────────────────────────────────────────
describe('authController.login()', () => {
  let dbQueryStub;

  beforeEach(() => {
    dbQueryStub = sinon.stub(db, 'query');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns 200 with token on valid credentials', async () => {
    const hashed = await bcrypt.hash('password123', 10);
    dbQueryStub.resolves([{
      id: 1, email: 'priya@test.com', password: hashed,
      full_name: 'Priya', role: 'customer'
    }]);

    const req = { body: { email: 'priya@test.com', password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status.calledWith(200)).to.be.true;
    const body = res.json.args[0][0];
    expect(body).to.have.property('token');
    expect(body.user.email).to.equal('priya@test.com');
  });

  it('returns 401 when user is not found', async () => {
    dbQueryStub.resolves([]); // no user

    const req = { body: { email: 'unknown@test.com', password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status.calledWith(401)).to.be.true;
  });

  it('returns 401 when password is wrong', async () => {
    const hashed = await bcrypt.hash('correctpassword', 10);
    dbQueryStub.resolves([{ id: 1, email: 'p@test.com', password: hashed, role: 'customer' }]);

    const req = { body: { email: 'p@test.com', password: 'wrongpassword' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status.calledWith(401)).to.be.true;
  });

  it('returns 400 when email or password is missing', async () => {
    const req = { body: { email: 'p@test.com' } }; // no password
    const res = mockRes();

    await login(req, res);

    expect(res.status.calledWith(400)).to.be.true;
  });
});

// ─────────────────────────────────────────────────────────
describe('authController.getProfile()', () => {
  let dbQueryStub;

  beforeEach(() => {
    dbQueryStub = sinon.stub(db, 'query');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns 200 with user data when user exists', async () => {
    dbQueryStub.resolves([{ id: 1, full_name: 'Priya', email: 'p@test.com', role: 'customer' }]);

    const req = { user: { id: 1 } };
    const res = mockRes();

    await getProfile(req, res);

    expect(res.status.calledWith(200)).to.be.true;
    const body = res.json.args[0][0];
    expect(body.user.email).to.equal('p@test.com');
  });

  it('returns 404 when user does not exist', async () => {
    dbQueryStub.resolves([]);

    const req = { user: { id: 999 } };
    const res = mockRes();

    await getProfile(req, res);

    expect(res.status.calledWith(404)).to.be.true;
  });
});
