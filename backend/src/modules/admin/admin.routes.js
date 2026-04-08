const express = require('express');
const { adminLogin, adminMe } = require('./admin.controller');
const { protect, authorize } = require('../auth/auth.middleware');

const router = express.Router();

// Public
router.post('/login', adminLogin);

// Protected — only admins
router.get('/me', protect, authorize('admin'), adminMe);

module.exports = router;
