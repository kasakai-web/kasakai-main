const express = require('express');
const { handleRazorpayWebhook } = require('./webhook.controller');

const router = express.Router();

// Raw body is applied in app.js for this route — DO NOT add express.json() here
router.post('/razorpay', handleRazorpayWebhook);

module.exports = router;
