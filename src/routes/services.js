const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/serviceController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/',       ctrl.getAllServices);
router.get('/staff',  ctrl.getAllStaff);
router.get('/:id',    ctrl.getServiceById);
router.post('/',      authenticateToken, requireAdmin, ctrl.createService);

module.exports = router;
