const express = require('express');
const {
  adminLogin,
  adminMe,
  listUsers,
  listOrganisers,
  approveOrganiser,
  rejectOrganiser,
  suspendOrganiser,
  reactivateOrganiser,
  listGames,
  listPayments,
  listNotifications,
  getPlatformStats,
  getGameDetail,
  listWallets,
  listFeedback,
  listPlayerRatings,
  getOrganiserEarnings,
} = require('./admin.controller');
const { protect, authorize } = require('../auth/auth.middleware');

const router = express.Router();

// Public
router.post('/login', adminLogin);

// Protected — admin only
router.get('/me',                 protect, authorize('admin'), adminMe);
router.get('/stats',              protect, authorize('admin'), getPlatformStats);
router.get('/users',              protect, authorize('admin'), listUsers);
router.get('/organisers',         protect, authorize('admin'), listOrganisers);
router.patch('/organisers/:id/approve',    protect, authorize('admin'), approveOrganiser);
router.patch('/organisers/:id/reject',     protect, authorize('admin'), rejectOrganiser);
router.patch('/organisers/:id/suspend',    protect, authorize('admin'), suspendOrganiser);
router.patch('/organisers/:id/reactivate', protect, authorize('admin'), reactivateOrganiser);
router.get('/organiser-earnings', protect, authorize('admin'), getOrganiserEarnings);
router.get('/games',              protect, authorize('admin'), listGames);
router.get('/games/:id',          protect, authorize('admin'), getGameDetail);
router.get('/payments',           protect, authorize('admin'), listPayments);
router.get('/wallets',            protect, authorize('admin'), listWallets);
router.get('/feedback',           protect, authorize('admin'), listFeedback);
router.get('/player-ratings',     protect, authorize('admin'), listPlayerRatings);
router.get('/notifications',      protect, authorize('admin'), listNotifications);

module.exports = router;
