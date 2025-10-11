/**
 * Interface to use the image processing Web Worker with robust error handling
 */

import { ProcessedResult } from './imageProcessing';

const WORKER_TIMEOUT = 35000; // 35 seconds (slightly longer than internal timeout)
const VALID_MESSAGE_TYPES = ['success', 'progress', 'error', 'done'];

export class ImageProcessingWorker {
  private worker: Worker | null = null;
  private isActive: boolean = false;

  /**
   * Process image using Web Worker with progress updates
   * Features: timeout protection, message validation, proper cleanup
   */
  async processImage(
    imageFile: File,
    numColors: number,
    minRegionSize: number,
    smoothness: number,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<ProcessedResult> {
    // Check Worker support
    if (typeof Worker === 'undefined') {
      throw new Error('Web Worker non supporté dans cet environnement');
    }

    return new Promise((resolve, reject) => {
      this.isActive = true;
      let timeoutId: number | null = null;
      let resultReceived = false;

      const cleanup = () => {
        this.isActive = false;
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      try {
        // Reuse existing worker or create new one
        if (!this.worker) {
          this.worker = new Worker(
            new URL('../workers/imageProcessor.worker.ts', import.meta.url),
            { type: 'module' }
          );
        }

        // Set up timeout protection
        timeoutId = setTimeout(() => {
          if (!resultReceived && this.isActive) {
            cleanup();
            reject(new Error('Timeout: Le traitement a dépassé 35 secondes'));
            this.terminate();
          }
        }, WORKER_TIMEOUT) as unknown as number;

        // Set up message handler with validation
        this.worker.onmessage = (e: MessageEvent) => {
          if (!this.isActive) return; // Ignore messages if worker terminated

          const { type, payload, error } = e.data;

          // Validate message type
          if (!VALID_MESSAGE_TYPES.includes(type)) {
            console.warn(`Message inconnu du worker: ${type}`);
            return;
          }

          if (type === 'success') {
            resultReceived = true;
            // Don't resolve yet, wait for 'done' signal
          } else if (type === 'done') {
            if (resultReceived) {
              // Only resolve after both success and done received
              cleanup();
              const lastPayload = e.data.type === 'success' ? payload : this.lastResult;
              resolve(lastPayload as ProcessedResult);
            } else {
              // Done without success = error
              cleanup();
              reject(new Error('Traitement interrompu sans résultat'));
            }
          } else if (type === 'progress' && onProgress && this.isActive) {
            onProgress(payload.stage, payload.progress);
          } else if (type === 'error') {
            resultReceived = true;
            cleanup();
            reject(new Error(error || 'Processing failed'));
            this.terminate();
          }

          // Store last successful result
          if (type === 'success') {
            this.lastResult = payload;
          }
        };

        // Set up error handler
        this.worker.onerror = (error) => {
          if (!this.isActive) return;
          cleanup();
          reject(new Error(`Worker error: ${error.message}`));
          this.terminate();
        };

        // Send processing request
        this.worker.postMessage({
          type: 'process',
          payload: { imageFile, numColors, minRegionSize, smoothness }
        });
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error('Failed to start worker'));
        this.terminate();
      }
    });
  }

  private lastResult: ProcessedResult | null = null;

  /**
   * Terminate worker and cleanup resources
   */
  terminate(): void {
    this.isActive = false;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.lastResult = null;
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
  smoothness: number,
  onProgress?: (stage: string, progress: number) => void
): Promise<ProcessedResult> {
  const worker = getImageProcessingWorker();
  return worker.processImage(imageFile, numColors, minRegionSize, smoothness, onProgress);
}
