const express = require('express');
const { adminLogin, adminMe, listUsers, listOrganisers } = require('./admin.controller');
const { protect, authorize } = require('../auth/auth.middleware');

const router = express.Router();

// Public
router.post('/login', adminLogin);

// Protected — only admins
router.get('/me', protect, authorize('admin'), adminMe);
router.get('/users', protect, authorize('admin'), listUsers);
router.get('/organisers', protect, authorize('admin'), listOrganisers);

module.exports = router;
