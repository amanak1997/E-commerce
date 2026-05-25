/**
 * gRPC Server — Product Service
 * Exposes ProductService methods to other microservices.
 * Runs on a separate port from the HTTP REST API.
 *
 * Port: 50052
 */
const grpc       = require('@grpc/grpc-js');
const protoLoader= require('@grpc/proto-loader');
const path       = require('path');
const mongoose   = require('mongoose');
const Product    = require('../models/Product');
const { cacheInvalidate } = require('../config/redis');
const logger     = require('../utils/logger');

const PROTO_PATH = path.join(__dirname, '../../../../proto/product.proto');

// Load proto
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase:     true,
  longs:        String,
  enums:        String,
  defaults:     true,
  oneofs:       true,
});
const { product: proto } = grpc.loadPackageDefinition(packageDef);

// ─── RPC Handlers ─────────────────────────────────────────────────────────────

async function GetProduct(call, callback) {
  try {
    const { product_id } = call.request;
    const product = await Product.findById(product_id).populate('category', 'name');

    if (!product) {
      return callback(null, {
        success: false,
        message: `Product ${product_id} not found`,
      });
    }

    callback(null, {
      success:  true,
      message:  'OK',
      id:       product._id.toString(),
      name:     product.name,
      slug:     product.slug,
      price:    product.price,
      stock:    product.stock,
      image:    product.images?.[0]?.url || '',
      category: product.category?.name  || '',
    });
  } catch (err) {
    logger.error(`gRPC GetProduct error: ${err.message}`);
    callback({
      code:    grpc.status.INTERNAL,
      message: err.message,
    });
  }
}

async function DeductStock(call, callback) {
  try {
    const { product_id, quantity } = call.request;

    // Atomic decrement — only if stock is sufficient
    const product = await Product.findOneAndUpdate(
      { _id: product_id, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true }
    );

    if (!product) {
      return callback(null, {
        success: false,
        message: `Insufficient stock for product ${product_id}`,
        current_stock: 0,
      });
    }

    await cacheInvalidate([`products:single:${product_id}`, `products:single:${product.slug}`]);

    logger.info(`gRPC DeductStock: product ${product_id} stock -${quantity} → ${product.stock}`);
    callback(null, {
      success:       true,
      message:       'Stock deducted',
      current_stock: product.stock,
    });
  } catch (err) {
    logger.error(`gRPC DeductStock error: ${err.message}`);
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

async function RestoreStock(call, callback) {
  try {
    const { product_id, quantity } = call.request;

    const product = await Product.findByIdAndUpdate(
      product_id,
      { $inc: { stock: quantity } },
      { new: true }
    );

    if (!product) {
      return callback(null, { success: false, message: 'Product not found', current_stock: 0 });
    }

    await cacheInvalidate([`products:single:${product_id}`]);

    logger.info(`gRPC RestoreStock: product ${product_id} stock +${quantity} → ${product.stock}`);
    callback(null, {
      success:       true,
      message:       'Stock restored',
      current_stock: product.stock,
    });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

async function CheckStock(call, callback) {
  try {
    const { product_id, quantity } = call.request;
    const product = await Product.findById(product_id).select('stock');

    if (!product) {
      return callback(null, { success: false, message: 'Product not found', current_stock: 0 });
    }

    callback(null, {
      success:       product.stock >= quantity,
      message:       product.stock >= quantity ? 'In stock' : 'Insufficient stock',
      current_stock: product.stock,
    });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

// ─── Start gRPC Server ────────────────────────────────────────────────────────
function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(proto.ProductService.service, {
    GetProduct,
    DeductStock,
    RestoreStock,
    CheckStock,
  });

  const GRPC_PORT = process.env.GRPC_PORT || '50052';
  const address   = `0.0.0.0:${GRPC_PORT}`;

  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      logger.error(`gRPC server failed to start: ${err.message}`);
      return;
    }
    logger.info(`Product gRPC server listening on port ${port}`);
  });

  return server;
}

module.exports = { startGrpcServer };
