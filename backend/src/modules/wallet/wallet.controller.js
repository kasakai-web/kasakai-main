const walletService     = require('./wallet.service');
const WalletTransaction = require('../../models/WalletTransaction');
const { sendWalletTopUpEmail } = require('../../utils/email');
const { notify } = require('../../services/notificationService');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/players/me/wallet
// Returns wallet balance + last 50 transactions
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyWallet = async (req, res) => {
  try {
    const wallet = await walletService.getOrCreateWallet(req.user._id);

    const transactions = await WalletTransaction.find({ user: req.user._id })
      .populate('game', 'title scheduledAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      data: { wallet, transactions },
    });
  } catch (error) {
    console.error('[WALLET] getMyWallet error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/players/me/wallet/topup
// Manual top-up (no Razorpay yet). Body: { amountPaise: number }
// ─────────────────────────────────────────────────────────────────────────────
exports.topUpWallet = async (req, res) => {
  try {
    const { amountPaise } = req.body;

    if (!amountPaise || typeof amountPaise !== 'number' || amountPaise <= 0) {
      return res.status(400).json({ success: false, message: 'amountPaise must be a positive number' });
    }

    // Max single top-up: ₹1,00,000
    if (amountPaise > 100_000 * 100) {
      return res.status(400).json({ success: false, message: 'Amount exceeds the maximum limit of ₹1,00,000 per top-up' });
    }

    const { wallet, transaction } = await walletService.topUp(
      req.user._id,
      amountPaise,
      'Wallet top-up'
    );

    if (req.user?.email) {
      sendWalletTopUpEmail({
        to:             req.user.email,
        playerName:     req.user.name || 'Player',
        amountPaise,
        newBalancePaise: wallet.balancePaise,
      }).catch((err) => {
        console.error('[EMAIL] Wallet top-up email failed:', err?.message || err);
      });
    }

    notify(req.user._id, req.user.role || 'player', {
      type:      'wallet_topup',
      title:     '💰 Wallet Recharged',
      body:      `₹${(amountPaise / 100).toFixed(0)} added to your wallet. New balance: ₹${(wallet.balancePaise / 100).toFixed(0)}.`,
      actionUrl: `/dashboard/player/${req.user._id}/wallet`,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `₹${(amountPaise / 100).toFixed(2)} added to your wallet`,
      data: { wallet, transaction },
    });
  } catch (error) {
    console.error('[WALLET] topUpWallet error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
