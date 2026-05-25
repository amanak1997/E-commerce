/**
 * Worker Thread — runs in a separate thread to avoid blocking the event loop
 * Handles image resizing with Sharp.
 */
const { workerData, parentPort } = require('worker_threads');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SIZES = {
  thumbnail: { width: 150, height: 150 },
  medium:    { width: 600, height: 600 },
  large:     { width: 1200, height: 1200 },
};

async function processImage({ inputPath, outputDir, filename }) {
  const results = {};
  const ext = '.webp'; // convert everything to webp for better compression

  for (const [sizeName, dims] of Object.entries(SIZES)) {
    const outPath = path.join(outputDir, `${filename}_${sizeName}${ext}`);

    await sharp(inputPath)
      .resize(dims.width, dims.height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(outPath);

    results[sizeName] = `${filename}_${sizeName}${ext}`;
  }

  // Remove original temp file
  fs.unlink(inputPath, () => {});

  return results;
}

// Execute and report back to main thread
processImage(workerData)
  .then((result) => {
    parentPort.postMessage({ success: true, result });
  })
  .catch((err) => {
    parentPort.postMessage({ success: false, error: err.message });
  });
