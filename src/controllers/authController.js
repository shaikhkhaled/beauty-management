const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../db/connection');
require('dotenv').config();

const JWT_SECRET  = process.env.JWT_SECRET  || 'beauty_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

async function register(req, res) {
  try {
    const { full_name, email, phone, password, role } = req.body;

    // Check duplicate email
    const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'customer';

    const result = await db.query(
      'INSERT INTO users (full_name, email, phone, password, role) VALUES (?,?,?,?,?)',
      [full_name.trim(), email.toLowerCase(), phone, hashed, userRole]
    );

    return res.status(201).json({
      message: 'User registered successfully.',
      userId: result.insertId
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const users = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (users.length === 0)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

async function getProfile(req, res) {
  try {
    const users = await db.query(
      'SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0)
      return res.status(404).json({ error: 'User not found.' });

    return res.status(200).json({ user: users[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { register, login, getProfile };
