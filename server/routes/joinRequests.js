const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/joinRequestController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Current user's pending invites from admins
router.get('/invites/mine',           ctrl.getPendingInvites);

// Respond to an invite (current user accepts/declines)
router.put('/invites/:requestId',     ctrl.respondToInvite);

// Admin responds to a join request
router.put('/requests/:requestId',    ctrl.respondToRequest);

// Search users (for admin invite flow)
router.get('/users/search',           ctrl.searchUsers);

module.exports = router;
