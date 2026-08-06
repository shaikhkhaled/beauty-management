const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/appointmentController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateAppointment } = require('../middleware/validate');

router.post('/',              authenticateToken, validateAppointment, ctrl.bookAppointment);
router.get('/my',             authenticateToken, ctrl.getMyAppointments);
router.get('/:id',            authenticateToken, ctrl.getAppointmentById);
router.patch('/:id/status',   authenticateToken, requireAdmin, ctrl.updateStatus);
router.delete('/:id/cancel',  authenticateToken, ctrl.cancelAppointment);

module.exports = router;
