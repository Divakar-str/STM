export class TaskRunner {
  constructor() {
    this.state = 'Idle';
    this.abortController = null;
    this.taskId = 0;
  }

  start() {
    this.taskId += 1;
    this.abortController = new AbortController();
    this.state = 'Processing';
    return {
      taskId: this.taskId,
      signal: this.abortController.signal
    };
  }

  cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.state = 'Cancelled';
    }
  }

  checkActive(taskId) {
    if (taskId !== this.taskId || this.abortController?.signal.aborted) {
      const err = new Error('Operation cancelled by user.');
      err.code = 'CANCELLED';
      throw err;
    }
  }
}

export async function processImageFilterOffThread(imageData, { brightness = 0, contrast = 0, colorMode = 'color' }) {
  const workerCode = `
    self.onmessage = function(e) {
      const { buffer, width, height, brightness, contrast, colorMode } = e.data;
      const data = new Uint8ClampedArray(buffer);
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i] + brightness;
        let g = data[i + 1] + brightness;
        let b = data[i + 2] + brightness;

        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;

        if (colorMode === 'grayscale' || colorMode === 'bw') {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (colorMode === 'bw') {
            const v = lum > 135 ? 255 : 0;
            r = g = b = v;
          } else {
            r = g = b = lum;
          }
        }
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
      self.postMessage({ buffer: data.buffer }, [data.buffer]);
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);

  try {
    return await new Promise((resolve, reject) => {
      const copy = new Uint8ClampedArray(imageData.data).buffer;
      worker.onmessage = e => {
        const processed = new ImageData(new Uint8ClampedArray(e.data.buffer), imageData.width, imageData.height);
        resolve(processed);
      };
      worker.onerror = err => reject(err);
      worker.postMessage({
        buffer: copy,
        width: imageData.width,
        height: imageData.height,
        brightness,
        contrast,
        colorMode
      }, [copy]);
    });
  } finally {
    worker.terminate();
    URL.revokeObjectURL(url);
  }
}