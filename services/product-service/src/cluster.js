const cluster = require('cluster');
const os = require('os');
const WORKERS = process.env.NODE_ENV === 'production' ? os.cpus().length : 1;

if (cluster.isPrimary) {
  console.log(`[Product Cluster] Primary ${process.pid} — forking ${WORKERS} workers`);
  for (let i = 0; i < WORKERS; i++) cluster.fork();
  cluster.on('exit', (w) => { console.warn(`Worker ${w.process.pid} died. Restarting…`); cluster.fork(); });
} else {
  require('./server');
}
