/**
 * Interface to use the image processing Web Worker
 */

import { ProcessedResult } from './imageProcessing';

export class ImageProcessingWorker {
  private worker: Worker | null = null;

  /**
   * Process image using Web Worker
   */
  async processImage(
    imageFile: File,
    numColors: number,
    minRegionSize: number,
    smoothness: number
  ): Promise<ProcessedResult> {
    return new Promise((resolve, reject) => {
      // Create worker
      this.worker = new Worker(
        new URL('../workers/imageProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up message handler
      this.worker.onmessage = (e: MessageEvent) => {
        const { type, payload, error } = e.data;

        if (type === 'success') {
          resolve(payload as ProcessedResult);
          this.terminate();
        } else if (type === 'error') {
          reject(new Error(error || 'Processing failed'));
          this.terminate();
        }
      };

      // Set up error handler
      this.worker.onerror = (error) => {
        reject(new Error(`Worker error: ${error.message}`));
        this.terminate();
      };

      // Send processing request
      this.worker.postMessage({
        type: 'process',
        payload: { imageFile, numColors, minRegionSize, smoothness }
      });
    });
  }

  /**
   * Terminate worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Singleton instance
 */
let workerInstance: ImageProcessingWorker | null = null;

/**
 * Get or create worker instance
 */
export function getImageProcessingWorker(): ImageProcessingWorker {
  if (!workerInstance) {
    workerInstance = new ImageProcessingWorker();
  }
  return workerInstance;
}

/**
 * Process image with worker (convenience function)
 */
export async function processImageWithWorker(
  imageFile: File,
  numColors: number,
  minRegionSize: number,
  smoothness: number
): Promise<ProcessedResult> {
  const worker = getImageProcessingWorker();
  return worker.processImage(imageFile, numColors, minRegionSize, smoothness);
}
