const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/recurringItemController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/',       ctrl.getRecurringItems);
router.post('/',      ctrl.createRecurringItem);
router.delete('/:id', ctrl.deleteRecurringItem);

module.exports = router;
