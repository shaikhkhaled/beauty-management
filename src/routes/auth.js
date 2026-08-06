const express = require('express');
const router  = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateRegistration } = require('../middleware/validate');

router.post('/register', validateRegistration, register);
router.post('/login',    login);
router.get('/profile',   authenticateToken, getProfile);

module.exports = router;
