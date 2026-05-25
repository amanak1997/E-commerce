const Stripe      = require('stripe');
const Payment     = require('../models/Payment');
const orderClient = require('../grpc/clients/orderClient');   // gRPC ✅
const logger      = require('../utils/logger');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// ─── Create Payment Intent ────────────────────────────────────────────────────
exports.createPaymentIntent = async (req, res) => {
  try {
    const userId  = req.headers['x-user-id'];
    const { orderId, currency = 'usd' } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId required' });
    }

    // Fetch order details via gRPC ✅
    const order = await orderClient.getOrder(orderId);
    if (!order?.success) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status === 'confirmed' || order.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Order already paid' });
    }

    const amountInCents = Math.round(order.total * 100);

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   amountInCents,
      currency,
      metadata: {
        orderId:     order.order_id,
        orderNumber: order.order_number,
        userId,
      },
      automatic_payment_methods: { enabled: true },
    });

    // Save to DB
    await Payment.findOneAndUpdate(
      { orderId },
      {
        orderId,
        userId,
        stripePaymentIntentId: paymentIntent.id,
        amount: amountInCents,
        currency,
        status: 'pending',
      },
      { upsert: true, new: true }
    );

    logger.info(`PaymentIntent created: ${paymentIntent.id} for order ${orderId}`);

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: order.total,
        currency,
      },
    });
  } catch (err) {
    logger.error(`createPaymentIntent: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Create Checkout Session (Stripe hosted page) ─────────────────────────────
exports.createCheckoutSession = async (req, res) => {
  try {
    const userId  = req.headers['x-user-id'];
    const { orderId } = req.body;

    // Fetch order via gRPC ✅
    const order = await orderClient.getOrder(orderId);
    if (!order?.success) return res.status(404).json({ success: false, message: 'Order not found' });

    const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3006';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: order.items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            images: item.image ? [item.image] : [],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId,
      },
      success_url: `${FRONTEND}/orders/${order._id}?payment=success`,
      cancel_url:  `${FRONTEND}/checkout?payment=cancelled`,
    });

    logger.info(`Checkout session created: ${session.id}`);

    res.json({ success: true, data: { sessionUrl: session.url, sessionId: session.id } });
  } catch (err) {
    logger.error(`createCheckoutSession: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Stripe Webhook Handler ────────────────────────────────────────────────────
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,   // raw buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  logger.info(`Stripe webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: pi.id },
          {
            status: 'succeeded',
            last4: pi.payment_method?.card?.last4,
            brand: pi.payment_method?.card?.brand,
          }
        );
        // Confirm order via gRPC ✅
        await orderClient.confirmPayment(pi.metadata.orderId, pi.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: pi.id },
          {
            status: 'failed',
            failureMessage: pi.last_payment_error?.message,
          }
        );
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.payment_status === 'paid') {
          // Confirm order via gRPC ✅
          await orderClient.confirmPayment(
            session.metadata.orderId,
            session.payment_intent
          );
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: charge.payment_intent },
          {
            status: 'refunded',
            refundId: charge.refunds.data[0]?.id,
            refundAmount: charge.amount_refunded,
            refundedAt: new Date(),
          }
        );
        break;
      }

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    logger.error(`Webhook processing error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// ─── Refund ───────────────────────────────────────────────────────────────────
exports.refundPayment = async (req, res) => {
  try {
    if (req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { orderId, amount, reason = 'requested_by_customer' } = req.body;
    const payment = await Payment.findOne({ orderId, status: 'succeeded' });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'No paid payment found for this order' });
    }

    const refundParams = {
      payment_intent: payment.stripePaymentIntentId,
      reason,
    };
    if (amount) refundParams.amount = Math.round(amount * 100);

    const refund = await stripe.refunds.create(refundParams);

    payment.status = 'refunded';
    payment.refundId = refund.id;
    payment.refundAmount = refund.amount;
    payment.refundedAt = new Date();
    await payment.save();

    logger.info(`Refund created: ${refund.id} for order ${orderId}`);
    res.json({ success: true, data: { refundId: refund.id, amount: refund.amount / 100 } });
  } catch (err) {
    logger.error(`refundPayment: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Payment by Order ─────────────────────────────────────────────────────
exports.getPayment = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const role   = req.headers['x-user-role'];
    const { orderId } = req.params;

    const query = { orderId };
    if (role !== 'admin') query.userId = userId;

    const payment = await Payment.findOne(query);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    res.json({ success: true, data: { payment } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
