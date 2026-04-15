const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/settlementController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/',                  ctrl.getSettlements);
router.get('/suggest/:groupId',  ctrl.getSuggestedSettlements);
router.post('/',                 ctrl.createSettlement);
router.put('/:id/confirm',       ctrl.confirmSettlement);
router.put('/:id/cancel',        ctrl.cancelSettlement);
router.post('/pay-link',         ctrl.generatePaymentLink);
router.get('/verify-link/:id',   ctrl.verifyPaymentLink);

module.exports = router;
