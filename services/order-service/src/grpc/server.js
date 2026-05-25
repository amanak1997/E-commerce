/**
 * gRPC Server — Order Service
 * Exposes OrderService methods to other microservices (e.g. Payment Service).
 *
 * Port: 50053
 */
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path        = require('path');
const Order       = require('../models/Order');
const logger      = require('../utils/logger');

const PROTO_PATH = path.join(__dirname, '../../../../proto/order.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs:    String,
  enums:    String,
  defaults: true,
  oneofs:   true,
});
const { order: proto } = grpc.loadPackageDefinition(packageDef);

// ─── RPC Handlers ─────────────────────────────────────────────────────────────

async function ConfirmPayment(call, callback) {
  try {
    const { order_id, payment_intent_id } = call.request;
    const order = await Order.findById(order_id);

    if (!order) {
      return callback(null, { success: false, message: `Order ${order_id} not found` });
    }

    order.paymentIntentId = payment_intent_id;
    order.paymentStatus   = 'paid';
    order.paidAt          = new Date();
    order.addStatus('confirmed', 'Payment confirmed via gRPC');
    await order.save();

    logger.info(`gRPC ConfirmPayment: order ${order_id} confirmed`);

    callback(null, {
      success:      true,
      message:      'Payment confirmed',
      order_id:     order._id.toString(),
      order_number: order.orderNumber,
      status:       order.status,
      total:        order.total,
      user_id:      order.user.toString(),
    });
  } catch (err) {
    logger.error(`gRPC ConfirmPayment error: ${err.message}`);
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

async function FailPayment(call, callback) {
  try {
    const { order_id, failure_reason } = call.request;
    const order = await Order.findById(order_id);

    if (!order) {
      return callback(null, { success: false, message: 'Order not found' });
    }

    order.paymentStatus = 'failed';
    order.addStatus('failed', failure_reason || 'Payment failed');
    await order.save();

    logger.info(`gRPC FailPayment: order ${order_id} marked failed`);
    callback(null, {
      success:      true,
      message:      'Order marked as failed',
      order_id:     order._id.toString(),
      order_number: order.orderNumber,
      status:       order.status,
      total:        order.total,
    });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

async function GetOrder(call, callback) {
  try {
    const { order_id } = call.request;
    const order = await Order.findById(order_id);

    if (!order) {
      return callback(null, { success: false, message: 'Order not found' });
    }

    callback(null, {
      success:      true,
      message:      'OK',
      order_id:     order._id.toString(),
      order_number: order.orderNumber,
      status:       order.status,
      total:        order.total,
      user_id:      order.user.toString(),
    });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

// ─── Start gRPC Server ────────────────────────────────────────────────────────
function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(proto.OrderService.service, {
    ConfirmPayment,
    FailPayment,
    GetOrder,
  });

  const GRPC_PORT = process.env.GRPC_PORT || '50053';
  const address   = `0.0.0.0:${GRPC_PORT}`;

  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      logger.error(`gRPC server failed to start: ${err.message}`);
      return;
    }
    logger.info(`Order gRPC server listening on port ${port}`);
  });

  return server;
}

module.exports = { startGrpcServer };
