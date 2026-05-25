/**
 * gRPC Client — calls Order Service from Payment Service.
 * Replaces axios.post('/confirm-payment').
 */
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path        = require('path');
const logger      = require('../../utils/logger');

const PROTO_PATH = path.join(__dirname, '../../../../../proto/order.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs:    String,
  enums:    String,
  defaults: true,
  oneofs:   true,
});
const { order: proto } = grpc.loadPackageDefinition(packageDef);

let _client = null;

function getClient() {
  if (_client) return _client;

  const host = process.env.ORDER_GRPC_HOST || 'localhost';
  const port = process.env.ORDER_GRPC_PORT  || '50053';
  const addr = `${host}:${port}`;

  _client = new proto.OrderService(
    addr,
    grpc.credentials.createInsecure(),
    {
      'grpc.keepalive_time_ms':              10000,
      'grpc.keepalive_timeout_ms':           5000,
      'grpc.keepalive_permit_without_calls': 1,
    }
  );

  logger.info(`Order gRPC client connected to ${addr}`);
  return _client;
}

function call(method, request) {
  return new Promise((resolve, reject) => {
    getClient()[method](request, (err, response) => {
      if (err) {
        logger.error(`gRPC ${method} error: ${err.message}`);
        return reject(err);
      }
      resolve(response);
    });
  });
}

const orderClient = {
  confirmPayment: (order_id, payment_intent_id) =>
    call('ConfirmPayment', { order_id, payment_intent_id }),

  failPayment: (order_id, failure_reason) =>
    call('FailPayment', { order_id, failure_reason }),

  getOrder: (order_id) =>
    call('GetOrder', { order_id }),
};

module.exports = orderClient;
