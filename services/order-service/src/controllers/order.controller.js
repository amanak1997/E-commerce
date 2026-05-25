const Order         = require('../models/Order');
const { enqueueOrderProcessing, enqueueOrderConfirmation } = require('../queues/orderQueue');
const productClient = require('../grpc/clients/productClient');   // gRPC ✅
const logger        = require('../utils/logger');

// ─── Create Order ─────────────────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];

    const { items, shippingAddress, billingAddress, paymentMethod = 'stripe', notes, coupon } = req.body;

    if (!items?.length) {
      return res.status(400).json({ success: false, message: 'Order must have at least one item' });
    }

    // Validate products & prices via gRPC → Product Service
    const productMap = {};
    await Promise.all(
      items.map(async (item) => {
        try {
          const result = await productClient.getProduct(item.product.toString());
          if (result.success) productMap[item.product] = result;
        } catch {
          logger.warn(`gRPC: could not fetch product ${item.product} — using client data`);
        }
      })
    );

    // Build order items with server-validated prices
    const orderItems = items.map((item) => {
      const p = productMap[item.product];
      return {
        product:  item.product,
        name:     p?.name  || item.name,
        slug:     p?.slug  || item.slug,
        image:    p?.image || item.image,
        price:    p?.price || item.price,
        quantity: item.quantity,
        variant:  item.variant,
      };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingCost = subtotal >= 50 ? 0 : 9.99;
    const taxRate = 0.08;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + shippingCost + tax) * 100) / 100;

    const order = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      subtotal,
      shippingCost,
      tax,
      total,
      paymentMethod,
      notes,
      coupon,
    });

    // Kick off async processing
    const job = await enqueueOrderProcessing(order._id.toString(), { userEmail });
    order.processingJobId = job.id;
    await order.save({ validateBeforeSave: false });

    logger.info(`Order created: ${order.orderNumber} (${order._id})`);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: { order },
    });
  } catch (err) {
    logger.error(`createOrder: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get My Orders ────────────────────────────────────────────────────────────
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: userId };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit),
      Order.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { orders, total, page: +page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Single Order ─────────────────────────────────────────────────────────
exports.getOrder = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const role   = req.headers['x-user-role'];
    const { id } = req.params;

    const query = { $or: [{ _id: id }, { orderNumber: id }] };
    if (role !== 'admin') query.user = userId; // customers can only see their own

    const order = await Order.findOne(query);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    res.json({ success: true, data: { order } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Cancel Order ─────────────────────────────────────────────────────────────
exports.cancelOrder = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const order = await Order.findOne({ _id: req.params.id, user: userId });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const cancellable = ['pending', 'confirmed'];
    if (!cancellable.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in ${order.status} status`,
      });
    }

    order.addStatus('cancelled', req.body.reason || 'Cancelled by customer');
    await order.save();

    // TODO: trigger refund in payment service if already paid
    if (order.paymentStatus === 'paid') {
      // This would be handled via RabbitMQ event
      logger.info(`Order ${order._id} cancelled — refund needed`);
    }

    res.json({ success: true, message: 'Order cancelled', data: { order } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Admin: List All Orders ───────────────────────────────────────────────────
exports.adminListOrders = async (req, res) => {
  try {
    if (req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { page = 1, limit = 20, status, search, from, to } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.$or = [
      { orderNumber: new RegExp(search, 'i') },
    ];
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to)   query.createdAt.$lte = new Date(to);
    }

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit),
      Order.countDocuments(query),
    ]);

    res.json({ success: true, data: { orders, total, page: +page, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Admin: Update Order Status ───────────────────────────────────────────────
exports.adminUpdateStatus = async (req, res) => {
  try {
    if (req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { status, message, trackingNumber, carrier } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.addStatus(status, message);
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (carrier) order.carrier = carrier;
    if (status === 'shipped')   order.shippedAt  = new Date();
    if (status === 'delivered') order.deliveredAt = new Date();

    await order.save();

    // Emit real-time event via Socket.IO (through gateway)
    // In production this would be via RabbitMQ → gateway → socket
    logger.info(`Order ${order._id} status updated to ${status}`);

    res.json({ success: true, data: { order } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Confirm Payment (called by payment service) ──────────────────────────────
exports.confirmPayment = async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;

    // This endpoint is called internally — we trust the gateway header
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await enqueueOrderConfirmation(orderId);

    // Direct update as well for immediate consistency
    order.paymentIntentId = paymentIntentId;
    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    order.addStatus('confirmed', 'Payment received');
    await order.save();

    res.json({ success: true, message: 'Order payment confirmed', data: { order } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Admin Dashboard Stats ────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    if (req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalOrders,
      todayOrders,
      monthOrders,
      pendingOrders,
      revenueResult,
      statusBreakdown,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ createdAt: { $gte: thisMonth } }),
      Order.countDocuments({ status: { $in: ['pending', 'confirmed', 'processing'] } }),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalOrders,
        todayOrders,
        monthOrders,
        pendingOrders,
        totalRevenue,
        statusBreakdown: statusBreakdown.reduce((acc, s) => {
          acc[s._id] = s.count;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
