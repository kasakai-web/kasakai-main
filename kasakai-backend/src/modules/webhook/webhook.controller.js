const crypto            = require('crypto');
const WalletTransaction = require('../../models/WalletTransaction');
const { _creditWalletFromOrder, _sendTopUpNotifications } = require('../wallet/razorpay.controller');
const Player            = require('../../models/Player');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/webhooks/razorpay
//
// Razorpay sends this for every payment event.
// This is the AUTHORITATIVE path — more reliable than the frontend verify call
// because it fires even when the user closes the browser mid-payment.
//
// IMPORTANT: req.body here is a raw Buffer (registered with express.raw before
// express.json in app.js) — required for signature verification.
// ─────────────────────────────────────────────────────────────────────────────
exports.handleRazorpayWebhook = async (req, res) => {
  // 1. Verify webhook authenticity before doing anything
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).json({ success: false, message: 'Missing signature' });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[WEBHOOK] RAZORPAY_WEBHOOK_SECRET not set');
    return res.status(500).end();
  }

  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(req.body) // raw Buffer — must not be parsed by express.json
    .digest('hex');

  const providedSig = Buffer.from(String(signature));
  const expectedSigBuffer = Buffer.from(expectedSig);

  if (providedSig.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(expectedSigBuffer, providedSig)) {
    console.warn('[WEBHOOK] Invalid Razorpay signature — possible spoofing attempt');
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  // 2. Parse the raw body now that we've verified it
  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }

  // 3. Always respond 200 quickly — Razorpay retries on non-200
  res.status(200).json({ success: true });

  // 4. Handle events asynchronously
  try {
    if (event.event === 'payment.captured') {
      await handlePaymentCaptured(event.payload.payment.entity);
    }
    // payment.failed is informational — transaction already marked failed on verify
  } catch (err) {
    console.error('[WEBHOOK] Handler error:', err);
  }
};

async function handlePaymentCaptured(payment) {
  const orderId   = payment.order_id;
  const paymentId = payment.id;

  if (!orderId) return;

  // Find the pending transaction for this order
  const pendingTx = await WalletTransaction.findOne({
    razorpayOrderId: orderId,
    type:            'topup',
  });

  if (!pendingTx) {
    console.warn(`[WEBHOOK] No pending tx for order ${orderId}`);
    return;
  }

  // Idempotency: already credited (verify beat us to it)
  if (pendingTx.status === 'success') {
    return;
  }

  // Verify amount matches what was stored server-side — never use payment.amount
  if (payment.amount !== pendingTx.amountPaise) {
    console.error(`[WEBHOOK] Amount mismatch for order ${orderId}: expected ${pendingTx.amountPaise}, got ${payment.amount}`);
    await WalletTransaction.findByIdAndUpdate(pendingTx._id, { status: 'failed' });
    return;
  }

  const result = await _creditWalletFromOrder(
    pendingTx,
    pendingTx.user,
    { razorpayPaymentId: paymentId }
  );

  if (!result) return; // Race: verify already processed it

  const user = await Player.findById(pendingTx.user).select('email name role').lean();
  if (user) {
    await _sendTopUpNotifications(user, result.wallet, pendingTx.amountPaise);
  }
}
