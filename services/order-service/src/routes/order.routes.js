const router = require('express').Router();
const ctrl = require('../controllers/order.controller');

// Customer routes
router.post('/orders',               ctrl.createOrder);
router.get('/orders',                ctrl.getMyOrders);
router.get('/orders/:id',            ctrl.getOrder);
router.patch('/orders/:id/cancel',   ctrl.cancelOrder);

// Internal route (called by payment service)
router.post('/orders/confirm-payment', ctrl.confirmPayment);

// Admin routes
router.get('/admin/orders',          ctrl.adminListOrders);
router.patch('/admin/orders/:id/status', ctrl.adminUpdateStatus);
router.get('/admin/orders/stats',    ctrl.getStats);

module.exports = router;
