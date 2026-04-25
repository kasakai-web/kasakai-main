const crypto            = require('crypto');
const razorpay          = require('../../config/razorpay');
const walletService     = require('./wallet.service');
const Wallet            = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
const { sendWalletTopUpEmail } = require('../../utils/email');
const { notify }        = require('../../services/notificationService');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/players/me/wallet/orders
// Creates a Razorpay order. Amount comes from body but is re-validated here.
// NEVER trust frontend: amount stored in pending tx, re-used on verification.
// ─────────────────────────────────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const { amountPaise } = req.body;

    // Server-side validation — frontend cannot manipulate the amount that gets charged
    if (!amountPaise || typeof amountPaise !== 'number' || !Number.isInteger(amountPaise)) {
      return res.status(400).json({ success: false, message: 'amountPaise must be a positive integer' });
    }
    if (amountPaise < 1000) {
      return res.status(400).json({ success: false, message: 'Minimum recharge is ₹10' });
    }
    if (amountPaise > 10_000_000) {
      return res.status(400).json({ success: false, message: 'Maximum recharge is ₹1,00,000' });
    }

    const wallet = await walletService.getOrCreateWallet(req.user._id);

    // receipt acts as idempotency key for Razorpay
    // Max 40 chars: "wlt_" + last 8 of userId + "_" + last 8 of timestamp = 21 chars
    const receipt = `wlt_${String(req.user._id).slice(-8)}_${Date.now().toString().slice(-8)}`;

    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId:  String(req.user._id),
        purpose: 'wallet_topup',
      },
    });

    // Create a PENDING transaction — anchors the amount server-side.
    // On payment success, this same record is atomically updated to 'success'.
    // A new transaction is never created on verify/webhook to prevent double-credit.
    await WalletTransaction.create({
      wallet:            wallet._id,
      user:              req.user._id,
      type:              'topup',
      amountPaise,
      balanceAfterPaise: wallet.balancePaise, // will be updated after credit
      description:       'Wallet recharge via Razorpay',
      status:            'pending',
      razorpayOrderId:   order.id,
    });

    return res.status(201).json({
      success: true,
      data: {
        orderId:  order.id,
        amount:   order.amount,   // authoritative — matches what Razorpay will charge
        currency: order.currency,
        keyId:    process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    console.error('[RAZORPAY] createOrder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/players/me/wallet/verify
// Frontend calls this after Razorpay checkout succeeds.
// Acts as a fast-path; webhook is the authoritative source.
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    // Validate the order belongs to the authenticated user
    const pendingTx = await WalletTransaction.findOne({
      razorpayOrderId,
      user: req.user._id,
      type: 'topup',
    });
    if (!pendingTx) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Idempotency: webhook may have already credited the wallet
    if (pendingTx.status === 'success') {
      const wallet = await walletService.getOrCreateWallet(req.user._id);
      return res.status(200).json({
        success: true,
        message: 'Payment already processed',
        data: { wallet },
      });
    }

    // Verify HMAC-SHA256 signature — NEVER trust the frontend
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const providedSig = Buffer.from(String(razorpaySignature));
    const expectedSigBuffer = Buffer.from(expectedSig);

    if (providedSig.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(expectedSigBuffer, providedSig)) {
      await WalletTransaction.findByIdAndUpdate(pendingTx._id, { status: 'failed' });
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Credit wallet — delegates to shared helper (idempotency-safe)
    const result = await _creditWalletFromOrder(
      pendingTx,
      req.user._id,
      { razorpayPaymentId, razorpaySignature }
    );

    if (!result) {
      // Race condition: webhook already processed it
      const wallet = await walletService.getOrCreateWallet(req.user._id);
      return res.status(200).json({ success: true, message: 'Payment already processed', data: { wallet } });
    }

    await _sendTopUpNotifications(req.user, result.wallet, pendingTx.amountPaise);

    return res.status(200).json({
      success: true,
      message: `₹${(pendingTx.amountPaise / 100).toFixed(0)} added to your wallet`,
      data: { wallet: result.wallet },
    });
  } catch (err) {
    console.error('[RAZORPAY] verifyPayment error:', err);
    return res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared: atomically flip pending → success and credit wallet balance.
// Returns { wallet, transaction } or null if already processed (race condition).
// ─────────────────────────────────────────────────────────────────────────────
async function _creditWalletFromOrder(pendingTx, userId, razorpayMeta) {
  // Atomic claim: only one process (verify or webhook) will win this update
  const claimed = await WalletTransaction.findOneAndUpdate(
    { _id: pendingTx._id, status: 'pending' },
    { $set: { status: 'success', ...razorpayMeta } },
    { new: true }
  );
  if (!claimed) return null; // already handled

  // Credit wallet balance using $inc (atomic, no read-modify-write race)
  const wallet = await Wallet.findOneAndUpdate(
    { user: userId },
    {
      $inc: {
        balancePaise:    pendingTx.amountPaise,
        totalTopUpPaise: pendingTx.amountPaise,
      },
    },
    { new: true }
  );

  // Update the final balance on the transaction record
  await WalletTransaction.findByIdAndUpdate(claimed._id, {
    balanceAfterPaise: wallet.balancePaise,
  });

  return { wallet, transaction: claimed };
}

async function _sendTopUpNotifications(user, wallet, amountPaise) {
  if (user?.email) {
    sendWalletTopUpEmail({
      to:              user.email,
      playerName:      user.name || 'Player',
      amountPaise,
      newBalancePaise: wallet.balancePaise,
    }).catch((err) => console.error('[EMAIL] Wallet top-up email failed:', err?.message));
  }

  notify(user._id, user.role || 'player', {
    type:      'wallet_topup',
    title:     '💰 Wallet Recharged',
    body:      `₹${(amountPaise / 100).toFixed(0)} added to your wallet. New balance: ₹${(wallet.balancePaise / 100).toFixed(0)}.`,
    actionUrl: `/dashboard/player/${user._id}/wallet`,
  }).catch(() => {});
}

module.exports._creditWalletFromOrder = _creditWalletFromOrder;
module.exports._sendTopUpNotifications = _sendTopUpNotifications;
