const request    = require('supertest');
const { expect } = require('chai');
const sinon      = require('sinon');
const bcrypt     = require('bcryptjs');
const app        = require('../../src/app');
const db         = require('../../src/db/connection');

// API-level tests — stubs DB so no live MySQL needed
// Tests the full HTTP stack: routing → middleware → controller

describe('POST /api/auth/register', () => {
  let dbStub;
  beforeEach(() => { dbStub = sinon.stub(db, 'query'); });
  afterEach(()  => { sinon.restore(); });

  it('returns 201 with userId on valid registration', async () => {
    dbStub.onFirstCall().resolves([]);
    dbStub.onSecondCall().resolves({ insertId: 1 });
    const res = await request(app).post('/api/auth/register')
      .send({ full_name: 'Priya Sharma', email: 'priya@test.com', phone: '9876543210', password: 'secret123' });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('userId');
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ full_name: 'Priya', phone: '9876543210', password: 'secret123' });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property('details');
  });

  it('returns 400 when phone is not 10 digits', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ full_name: 'Priya', email: 'p@test.com', phone: '123', password: 'secret123' });
    expect(res.status).to.equal(400);
    expect(res.body.details).to.include('Phone must be exactly 10 digits');
  });

  it('returns 409 when email is already registered', async () => {
    dbStub.onFirstCall().resolves([{ id: 1 }]);
    const res = await request(app).post('/api/auth/register')
      .send({ full_name: 'Priya', email: 'taken@test.com', phone: '9876543210', password: 'secret123' });
    expect(res.status).to.equal(409);
    expect(res.body.error).to.include('already registered');
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ full_name: 'Priya', email: 'p@test.com', phone: '9876543210', password: '123' });
    expect(res.status).to.equal(400);
  });

  it('returns 400 when body is completely empty', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).to.equal(400);
    expect(res.body.details.length).to.be.greaterThan(1);
  });
});

describe('POST /api/auth/login', () => {
  let dbStub;
  beforeEach(() => { dbStub = sinon.stub(db, 'query'); });
  afterEach(()  => { sinon.restore(); });

  it('returns 200 with JWT token on valid credentials', async () => {
    const hashed = await bcrypt.hash('password123', 10);
    dbStub.resolves([{
      id: 1, email: 'priya@test.com', password: hashed, full_name: 'Priya', role: 'customer'
    }]);
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'priya@test.com', password: 'password123' });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('token');
    expect(res.body.user.email).to.equal('priya@test.com');
  });

  it('returns 401 when user is not found', async () => {
    dbStub.resolves([]);
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });
    expect(res.status).to.equal(401);
  });

  it('returns 401 when password is wrong', async () => {
    const hashed = await bcrypt.hash('correctpassword', 10);
    dbStub.resolves([{ id: 1, email: 'p@test.com', password: hashed, role: 'customer' }]);
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'p@test.com', password: 'wrongpassword' });
    expect(res.status).to.equal(401);
  });

  it('returns 400 when email and password are both missing', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).to.equal(400);
  });
});

describe('GET /api/auth/profile', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).to.equal(401);
  });

  it('returns 401 when token is malformed', async () => {
    const res = await request(app).get('/api/auth/profile')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).to.equal(401);
  });
});
