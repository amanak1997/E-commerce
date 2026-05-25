require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger');

// Start worker
require('./workers/emailWorker');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'notification-service', pid: process.pid })
);

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => logger.info(`Notification service running on port ${PORT}`));
