/**
 * Worker Thread Pool — reusable pool for image processing tasks.
 * Limits concurrent workers to avoid OOM.
 */
const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');

const WORKER_SCRIPT = path.join(__dirname, '../workers/imageProcessor.js');
const MAX_WORKERS = Math.max(2, Math.floor(os.cpus().length / 2));

class WorkerPool {
  constructor(maxWorkers = MAX_WORKERS) {
    this.maxWorkers = maxWorkers;
    this.activeWorkers = 0;
    this.queue = [];
  }

  run(workerData) {
    return new Promise((resolve, reject) => {
      const task = { workerData, resolve, reject };
      if (this.activeWorkers < this.maxWorkers) {
        this._runWorker(task);
      } else {
        this.queue.push(task);
      }
    });
  }

  _runWorker({ workerData, resolve, reject }) {
    this.activeWorkers++;
    const worker = new Worker(WORKER_SCRIPT, { workerData });

    worker.on('message', (result) => {
      this.activeWorkers--;
      if (result.success) {
        resolve(result.result);
      } else {
        reject(new Error(result.error));
      }
      this._next();
    });

    worker.on('error', (err) => {
      this.activeWorkers--;
      reject(err);
      this._next();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        this.activeWorkers--;
        reject(new Error(`Worker exited with code ${code}`));
        this._next();
      }
    });
  }

  _next() {
    if (this.queue.length > 0 && this.activeWorkers < this.maxWorkers) {
      this._runWorker(this.queue.shift());
    }
  }
}

// Singleton pool
const pool = new WorkerPool();
module.exports = { pool };
