/**
 * BullMQ Worker — processes notification jobs (email, etc.)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// ─── Mailer Transport ──────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: +process.env.SMTP_PORT || 2525,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.FROM_EMAIL || 'noreply@mystore.com';

// ─── Simple email templates ────────────────────────────────────────────────────
const templates = {
  'order-confirmation': (data) => ({
    subject: `Order Confirmed — ${data.orderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563eb">Your order is confirmed! 🎉</h2>
        <p>Hi there,</p>
        <p>We've received your order <strong>${data.orderNumber}</strong> and it's being processed.</p>
        <h3>Order Summary</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:8px;text-align:left">Item</th>
              <th style="padding:8px;text-align:right">Qty</th>
              <th style="padding:8px;text-align:right">Price</th>
            </tr>
          </thead>
          <tbody>
            ${(data.items || []).map((item) => `
              <tr>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.name}</td>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${item.quantity}</td>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">$${item.price}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding:8px;text-align:right;font-weight:bold">Total:</td>
              <td style="padding:8px;text-align:right;font-weight:bold">$${data.total}</td>
            </tr>
          </tfoot>
        </table>
        <p>You can track your order at: <a href="${process.env.FRONTEND_URL}/orders/${data.orderId}">View Order</a></p>
        <p>Thank you for shopping with us!</p>
      </div>
    `,
  }),

  'order-shipped': (data) => ({
    subject: `Your order ${data.orderNumber} has been shipped!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563eb">Your order is on its way! 🚚</h2>
        <p>Order <strong>${data.orderNumber}</strong> has been shipped.</p>
        ${data.trackingNumber ? `<p>Tracking Number: <strong>${data.trackingNumber}</strong></p>` : ''}
        ${data.carrier ? `<p>Carrier: ${data.carrier}</p>` : ''}
      </div>
    `,
  }),

  'order-delivered': (data) => ({
    subject: `Your order ${data.orderNumber} has been delivered!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#16a34a">Your order has arrived! 📦</h2>
        <p>Order <strong>${data.orderNumber}</strong> has been delivered.</p>
        <p>We hope you love your purchase! Please consider leaving a review.</p>
      </div>
    `,
  }),

  'password-reset': (data) => ({
    subject: 'Reset Your Password',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Reset Your Password</h2>
        <p>Click the link below to reset your password (valid for 1 hour):</p>
        <a href="${data.resetUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:4px;text-decoration:none">Reset Password</a>
        <p style="margin-top:16px;color:#6b7280;font-size:14px">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  }),

  'welcome': (data) => ({
    subject: `Welcome to MyStore, ${data.firstName}!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563eb">Welcome to MyStore! 🛍️</h2>
        <p>Hi ${data.firstName},</p>
        <p>Your account has been created successfully. Start shopping now!</p>
        <a href="${process.env.FRONTEND_URL}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:4px;text-decoration:none">Start Shopping</a>
      </div>
    `,
  }),
};

// ─── Send email ───────────────────────────────────────────────────────────────
async function sendEmail(to, type, data) {
  const template = templates[type];
  if (!template) throw new Error(`Unknown email template: ${type}`);

  const { subject, html } = template(data);

  const info = await transporter.sendMail({
    from: `"MyStore" <${FROM}>`,
    to,
    subject,
    html,
  });

  logger.info(`Email sent: ${info.messageId} (${type} → ${to})`);
  return info;
}

// ─── Redis connection for BullMQ ──────────────────────────────────────────────
const _redisUrl  = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
const REDIS_CONN = {
  host:     _redisUrl.hostname,
  port:     parseInt(_redisUrl.port, 10) || 6379,
  password: _redisUrl.password || undefined,
};

const worker = new Worker('notifications', async (job) => {
  logger.info(`Processing notification job: ${job.name} (${job.id})`);

  if (job.name === 'order-confirmation'  ||
      job.name === 'order-shipped'       ||
      job.name === 'order-delivered'     ||
      job.name === 'password-reset'      ||
      job.name === 'welcome') {
    if (!job.data.email) {
      logger.warn(`Job ${job.id} missing email address`);
      return;
    }
    await sendEmail(job.data.email, job.name, job.data);
  } else {
    logger.warn(`Unknown notification type: ${job.name}`);
  }
}, {
  connection: REDIS_CONN,
  concurrency: 10,
});

worker.on('completed', (job) => logger.info(`Notification job ${job.id} done`));
worker.on('failed', (job, err) => logger.error(`Notification job ${job?.id} failed: ${err.message}`));

module.exports = worker;
