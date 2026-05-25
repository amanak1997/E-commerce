/**
 * API Gateway — Node.js Cluster entry point
 * Spawns one worker per CPU core for maximum throughput.
 */
const cluster = require('cluster');
const os = require('os');

const WORKERS = process.env.NODE_ENV === 'production'
  ? os.cpus().length
  : 1;

if (cluster.isPrimary) {
  console.log(`[Cluster] Primary ${process.pid} started — forking ${WORKERS} workers`);

  for (let i = 0; i < WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`[Cluster] Worker ${worker.process.pid} died (${signal || code}). Restarting…`);
    cluster.fork();
  });

  cluster.on('online', (worker) => {
    console.log(`[Cluster] Worker ${worker.process.pid} is online`);
  });
} else {
  require('./server');
}
