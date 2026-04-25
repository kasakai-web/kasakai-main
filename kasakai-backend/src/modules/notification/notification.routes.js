const express = require('express');
const router  = express.Router();
const { protect } = require('../auth/auth.middleware');
const ctrl = require('./notification.controller');

// All notification routes require authentication (any role)
router.use(protect);

router.get('/',               ctrl.getMyNotifications);
router.get('/unread-count',   ctrl.getUnreadCount);
router.patch('/read-all',     ctrl.markAllRead);
router.patch('/:id/read',     ctrl.markRead);

module.exports = router;
