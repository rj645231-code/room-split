const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/groupController');
const jrCtrl  = require('../controllers/joinRequestController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Group CRUD
router.get('/',        ctrl.getGroups);
router.post('/',       ctrl.createGroup);
router.get('/search',  ctrl.searchGroups);
router.get('/:id',     ctrl.getGroup);
router.put('/:id',     ctrl.updateGroup);
router.delete('/:id',  ctrl.deleteGroup);

// Smart suggestions
router.get('/:id/suggestions', ctrl.getSmartSuggestions);

// Admin: member management
router.delete('/:id/members/:userId',         ctrl.removeMember);
router.put('/:id/members/:userId/promote',    ctrl.promoteMember);
router.put('/:id/members/:userId/demote',     ctrl.demoteMember);
router.post('/:id/invite/:userId',            ctrl.inviteUser);

// Join requests for a group (admin views)
router.post('/:groupId/join',                 jrCtrl.sendJoinRequest);
router.get('/:groupId/requests',              jrCtrl.getJoinRequests);

module.exports = router;
