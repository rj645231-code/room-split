const express = require('express');
const router  = express.Router();
const { getPersonalAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/personal', getPersonalAnalytics);

module.exports = router;
