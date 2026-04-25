const Razorpay = require('razorpay');

if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_REPLACE_ME') {
  console.warn('[RAZORPAY] WARNING: RAZORPAY_KEY_ID not configured. Payment endpoints will return errors until keys are set.');
}

module.exports = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || 'not_configured',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'not_configured',
});
