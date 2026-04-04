const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/',       ctrl.getExpenses);
router.get('/stats',  ctrl.getStats);
router.get('/:id',    ctrl.getExpense);
router.post('/',      ctrl.createExpense);
router.put('/:id',    ctrl.updateExpense);
router.delete('/:id', ctrl.deleteExpense);

module.exports = router;
