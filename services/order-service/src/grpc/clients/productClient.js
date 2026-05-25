/**
 * gRPC Client — calls Product Service from Order Service.
 * Singleton client with connection keep-alive.
 */
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path        = require('path');
const { promisify } = require('util');
const logger      = require('../../utils/logger');

const PROTO_PATH = path.join(__dirname, '../../../../../proto/product.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs:    String,
  enums:    String,
  defaults: true,
  oneofs:   true,
});
const { product: proto } = grpc.loadPackageDefinition(packageDef);

// ─── Singleton client ─────────────────────────────────────────────────────────
let _client = null;

function getClient() {
  if (_client) return _client;

  const host = process.env.PRODUCT_GRPC_HOST || 'localhost';
  const port = process.env.PRODUCT_GRPC_PORT || '50052';
  const addr = `${host}:${port}`;

  _client = new proto.ProductService(
    addr,
    grpc.credentials.createInsecure(),
    {
      'grpc.keepalive_time_ms':              10000,
      'grpc.keepalive_timeout_ms':           5000,
      'grpc.keepalive_permit_without_calls': 1,
    }
  );

  logger.info(`Product gRPC client connected to ${addr}`);
  return _client;
}

// ─── Promisified helpers ──────────────────────────────────────────────────────
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

// ─── Public API ───────────────────────────────────────────────────────────────
const productClient = {
  getProduct:   (product_id)           => call('GetProduct',   { product_id }),
  deductStock:  (product_id, quantity) => call('DeductStock',  { product_id, quantity }),
  restoreStock: (product_id, quantity) => call('RestoreStock', { product_id, quantity }),
  checkStock:   (product_id, quantity) => call('CheckStock',   { product_id, quantity }),
};

module.exports = productClient;
