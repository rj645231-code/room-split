const express = require('express');
const router = express.Router();
const { scanReceipt } = require('../controllers/visionController');

router.post('/receipt', scanReceipt);

module.exports = router;
