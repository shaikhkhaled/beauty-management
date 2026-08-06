const { expect } = require('chai');
const sinon      = require('sinon');
const jwt        = require('jsonwebtoken');
const { authenticateToken, requireAdmin } = require('../../src/middleware/auth');

process.env.JWT_SECRET = 'beauty_secret';
const SECRET = 'beauty_secret';

describe('authenticateToken middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req  = { headers: {} };
    res  = { status: sinon.stub().returnsThis(), json: sinon.stub() };
    next = sinon.spy();
  });

  it('returns 401 when Authorization header is missing', () => {
    authenticateToken(req, res, next);
    expect(res.status.calledWith(401)).to.be.true;
    expect(next.called).to.be.false;
  });

  it('returns 401 when token format is wrong (no Bearer prefix)', () => {
    req.headers['authorization'] = 'Token abc123';
    authenticateToken(req, res, next);
    expect(res.status.calledWith(401)).to.be.true;
  });

  it('returns 401 when token is invalid or expired', () => {
    req.headers['authorization'] = 'Bearer totally.invalid.token';
    authenticateToken(req, res, next);
    expect(res.status.calledWith(401)).to.be.true;
    expect(next.called).to.be.false;
  });

  it('calls next() and attaches user when token is valid', () => {
    const token = jwt.sign({ id: 1, email: 'p@test.com', role: 'customer' }, SECRET);
    req.headers['authorization'] = `Bearer ${token}`;
    authenticateToken(req, res, next);
    expect(next.calledOnce).to.be.true;
    expect(req.user).to.have.property('id', 1);
    expect(req.user.email).to.equal('p@test.com');
  });
});

describe('requireAdmin middleware', () => {
  let req, res, next;

  beforeEach(() => {
    res  = { status: sinon.stub().returnsThis(), json: sinon.stub() };
    next = sinon.spy();
  });

  it('returns 403 when user role is customer', () => {
    req = { user: { id: 1, role: 'customer' } };
    requireAdmin(req, res, next);
    expect(res.status.calledWith(403)).to.be.true;
    expect(next.called).to.be.false;
  });

  it('calls next() when user role is admin', () => {
    req = { user: { id: 1, role: 'admin' } };
    requireAdmin(req, res, next);
    expect(next.calledOnce).to.be.true;
  });
});
