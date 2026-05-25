// MongoDB initialization script — runs once on first container start
db = db.getSiblingDB('ecommerce_auth');
db.createCollection('users');

db = db.getSiblingDB('ecommerce_products');
db.createCollection('products');
db.createCollection('categories');
db.products.createIndex({ name: 'text', description: 'text' });
db.products.createIndex({ category: 1, price: 1 });
db.products.createIndex({ slug: 1 }, { unique: true });

db = db.getSiblingDB('ecommerce_orders');
db.createCollection('orders');
db.orders.createIndex({ user: 1, createdAt: -1 });
db.orders.createIndex({ status: 1 });

db = db.getSiblingDB('ecommerce_payments');
db.createCollection('payments');
db.payments.createIndex({ stripePaymentIntentId: 1 }, { unique: true });

print('MongoDB initialized successfully');
