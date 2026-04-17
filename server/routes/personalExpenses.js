const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/personalExpenseController');

router.use(protect);

router.get('/summary', ctrl.getSummary);   // must be before /:id
router.get('/',        ctrl.getAll);
router.post('/',       ctrl.create);
router.put('/:id',     ctrl.update);
router.delete('/:id',  ctrl.remove);

module.exports = router;
