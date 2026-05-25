const winston = require('winston');
module.exports = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.printf(({ timestamp, level, message }) =>
          `${timestamp} [NOTIFY][${level.toUpperCase()}] ${message}`
        )
  ),
  transports: [new winston.transports.Console()],
});
