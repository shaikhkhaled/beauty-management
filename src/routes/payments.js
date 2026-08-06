const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/paymentController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validatePayment } = require('../middleware/validate');

router.post('/',                            authenticateToken, validatePayment, ctrl.createPayment);
router.get('/appointment/:appointmentId',   authenticateToken, ctrl.getPaymentByAppointment);
router.get('/',                             authenticateToken, requireAdmin, ctrl.getAllPayments);

module.exports = router;
