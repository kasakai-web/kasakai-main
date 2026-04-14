const Wallet = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
const Player = require('../../models/Player');

/**
 * Get the wallet for a player, or create one if it doesn't exist yet.
 */
async function getOrCreateWallet(playerId) {
  let wallet = await Wallet.findOne({ user: playerId });
  if (!wallet) {
    wallet = await Wallet.create({ user: playerId });
    // Back-link the wallet onto the player document
    await Player.findByIdAndUpdate(playerId, { wallet: wallet._id });
  }
  return wallet;
}

/**
 * Add funds to a player's wallet (manual top-up; Razorpay replaces this later).
 */
async function topUp(playerId, amountPaise, description = 'Wallet top-up', meta = {}) {
  if (!amountPaise || amountPaise <= 0) throw new Error('Amount must be positive');

  const wallet = await getOrCreateWallet(playerId);
  wallet.balancePaise     += amountPaise;
  wallet.totalTopUpPaise  += amountPaise;
  await wallet.save();

  const tx = await WalletTransaction.create({
    wallet:            wallet._id,
    user:              playerId,
    type:              'topup',
    amountPaise,
    balanceAfterPaise: wallet.balancePaise,
    description,
    status:            'success',
    razorpayOrderId:   meta.razorpayOrderId   || null,
    razorpayPaymentId: meta.razorpayPaymentId || null,
    razorpaySignature: meta.razorpaySignature || null,
  });

  return { wallet, transaction: tx };
}

/**
 * Debit funds from a player's wallet (e.g. on game sign-up).
 * Throws an error with code 'INSUFFICIENT_BALANCE' if funds are too low.
 */
async function debit(playerId, amountPaise, description, gameId = null) {
  if (amountPaise <= 0) throw new Error('Debit amount must be positive');

  const wallet = await getOrCreateWallet(playerId);
  const available = wallet.balancePaise - wallet.lockedPaise;

  if (available < amountPaise) {
    const err = new Error('Insufficient wallet balance');
    err.code      = 'INSUFFICIENT_BALANCE';
    err.available = available;
    err.required  = amountPaise;
    throw err;
  }

  wallet.balancePaise    -= amountPaise;
  wallet.totalSpentPaise += amountPaise;
  await wallet.save();

  const tx = await WalletTransaction.create({
    wallet:            wallet._id,
    user:              playerId,
    type:              'debit',
    amountPaise,
    balanceAfterPaise: wallet.balancePaise,
    game:              gameId,
    description,
    status:            'success',
  });

  return { wallet, transaction: tx };
}

/**
 * Refund funds back to a player's wallet (e.g. on backout or game cancellation).
 */
async function refund(playerId, amountPaise, description, gameId = null, pairedTxId = null) {
  if (!amountPaise || amountPaise <= 0) return null;

  const wallet = await getOrCreateWallet(playerId);
  wallet.balancePaise        += amountPaise;
  wallet.totalRefundedPaise  += amountPaise;
  await wallet.save();

  const tx = await WalletTransaction.create({
    wallet:              wallet._id,
    user:                playerId,
    type:                'refund',
    amountPaise,
    balanceAfterPaise:   wallet.balancePaise,
    game:                gameId,
    description,
    status:              'success',
    pairedTransactionId: pairedTxId,
  });

  return { wallet, transaction: tx };
}

module.exports = { getOrCreateWallet, topUp, debit, refund };
