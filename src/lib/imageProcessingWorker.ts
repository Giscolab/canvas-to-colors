/**
 * Interface to use the image processing Web Worker with robust error handling
 */

import { ProcessedResult } from './imageProcessing';
import { IMAGE_PROCESSING } from '@/config/constants';

const WORKER_TIMEOUT = IMAGE_PROCESSING.WORKER_TIMEOUT_MS;
const WORKER_IDLE_TIMEOUT = IMAGE_PROCESSING.WORKER_IDLE_TIMEOUT_MS;
const VALID_MESSAGE_TYPES = ['success', 'progress', 'error', 'done'];

/**
 * Validate image file before processing
 */
function validateImageFile(imageFile: File): void {
  // Check file size
  if (imageFile.size > IMAGE_PROCESSING.MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Image trop volumineuse : ${(imageFile.size / (1024 * 1024)).toFixed(1)} MB. ` +
      `Maximum autorisé : ${IMAGE_PROCESSING.MAX_FILE_SIZE_MB} MB`
    );
  }

  // Check file type
  if (!imageFile.type.startsWith('image/')) {
    throw new Error('Le fichier doit être une image');
  }
}

export class ImageProcessingWorker {
  private worker: Worker | null = null;
  private isActive: boolean = false;
  private idleTimeoutId: number | null = null;
  private lastResult: ProcessedResult | null = null;

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
    // Validate image file first
    validateImageFile(imageFile);

    // Check Worker support
    if (typeof Worker === 'undefined') {
      throw new Error('Web Worker non supporté dans cet environnement');
    }

    // Clear idle timeout when processing starts
    if (this.idleTimeoutId !== null) {
      clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }

    return new Promise((resolve, reject) => {
      this.isActive = true;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let resultReceived = false;

      const restartTimeout = () => {
        if (!this.isActive) {
          return;
        }

        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
          if (!resultReceived && this.isActive) {
            cleanup();
            reject(new Error('Timeout: Le traitement a dépassé 35 secondes'));
            this.terminate();
          }
        }, WORKER_TIMEOUT);
      };

      const cleanup = () => {
        this.isActive = false;
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        // Start idle timeout after processing completes
        this.startIdleTimeout();
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
        restartTimeout();

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
            restartTimeout();
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
          } else if (type === 'progress') {
            restartTimeout();
            if (onProgress && this.isActive) {
              onProgress(payload.stage, payload.progress);
            }
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

  /**
   * Start idle timeout to terminate worker after inactivity
   */
  private startIdleTimeout(): void {
    if (this.idleTimeoutId !== null) {
      clearTimeout(this.idleTimeoutId);
    }
    
    this.idleTimeoutId = setTimeout(() => {
      console.log('Worker idle timeout - terminating...');
      this.terminate();
    }, WORKER_IDLE_TIMEOUT) as unknown as number;
  }

  /**
   * Terminate worker and cleanup resources
   */
  terminate(): void {
    this.isActive = false;
    
    if (this.idleTimeoutId !== null) {
      clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }
    
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
