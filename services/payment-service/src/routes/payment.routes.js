const router = require('express').Router();
const express = require('express');
const ctrl = require('../controllers/payment.controller');

// Webhook — MUST use raw body, no JSON parsing
router.post('/payments/webhook',
  express.raw({ type: 'application/json' }),
  ctrl.handleWebhook
);

// All other routes use JSON
router.use(express.json());

router.post('/payments/create-intent',    ctrl.createPaymentIntent);
router.post('/payments/checkout-session', ctrl.createCheckoutSession);
router.post('/payments/refund',           ctrl.refundPayment);
router.get('/payments/order/:orderId',    ctrl.getPayment);

module.exports = router;
