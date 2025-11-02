/**
 * Interface to use the image processing Web Worker with robust error handling
 */

import { ProcessedResult } from './imageProcessing';
import { IMAGE_PROCESSING } from '@/config/constants';

const WORKER_BASE_TIMEOUT = IMAGE_PROCESSING.WORKER_TIMEOUT_MS;
const WORKER_MAX_TIMEOUT = IMAGE_PROCESSING.WORKER_MAX_TIMEOUT_MS;
const WORKER_TIMEOUT_PER_MEGAPIXEL = IMAGE_PROCESSING.WORKER_TIMEOUT_PER_MEGAPIXEL_MS;
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
    mergeTolerance: number,
    enableArtisticMerge: boolean,
    onProgress?: (stage: string, progress: number) => void,
    enableSmartPalette: boolean = false
  ): Promise<ProcessedResult> {
    // Validate image file first
    validateImageFile(imageFile);

    const timeoutMs = await this.estimateProcessingTimeout(imageFile);
    const timeoutDescription =
      timeoutMs >= WORKER_MAX_TIMEOUT
        ? `${this.formatDuration(timeoutMs)} (limite maximale atteinte)`
        : this.formatDuration(timeoutMs);

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
            reject(
              new Error(`Timeout: Le traitement a dépassé ${timeoutDescription}`)
            );
            this.terminate();
          }
        }, timeoutMs);
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
          payload: {
            imageFile,
            numColors,
            minRegionSize,
            smoothness,
            mergeTolerance,
            enableSmartPalette,
            enableArtisticMerge,
          }
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

  private async estimateProcessingTimeout(imageFile: File): Promise<number> {
    try {
      const megapixels = await this.estimateImageMegapixels(imageFile);

      if (megapixels !== null) {
        const extraMegapixels = Math.max(0, megapixels - 1);
        const estimatedTimeout =
          WORKER_BASE_TIMEOUT + extraMegapixels * WORKER_TIMEOUT_PER_MEGAPIXEL;
        return Math.min(WORKER_MAX_TIMEOUT, Math.round(estimatedTimeout));
      }
    } catch (error) {
      console.warn("Impossible d'estimer la taille de l'image pour le timeout", error);
    }

    return WORKER_BASE_TIMEOUT;
  }

  private async estimateImageMegapixels(imageFile: File): Promise<number | null> {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(imageFile);
        const megapixels = (bitmap.width * bitmap.height) / 1_000_000;
        bitmap.close();
        return megapixels;
      } catch (error) {
        console.warn("createImageBitmap a échoué pour estimer la taille de l'image", error);
      }
    }

    if (
      typeof document !== 'undefined' &&
      typeof URL !== 'undefined' &&
      typeof Image !== 'undefined'
    ) {
      return new Promise<number | null>((resolve) => {
        const objectUrl = URL.createObjectURL(imageFile);
        const img = new Image();
        img.onload = () => {
          const megapixels = (img.width * img.height) / 1_000_000;
          URL.revokeObjectURL(objectUrl);
          resolve(megapixels);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        };
        img.src = objectUrl;
      });
    }

    return null;
  }

  private formatDuration(ms: number): string {
    if (ms >= 60000) {
      const minutes = ms / 60000;
      if (Number.isInteger(minutes)) {
        return `${minutes.toString()} minute${minutes > 1 ? 's' : ''}`;
      }
      const formatted = minutes.toFixed(1).replace('.', ',');
      return `${formatted} minutes`;
    }

    return `${Math.round(ms / 1000)} secondes`;
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
  mergeTolerance: number,
  onProgress?: (stage: string, progress: number) => void,
  enableSmartPalette: boolean = false,
  enableArtisticMerge: boolean = true
): Promise<ProcessedResult> {
  const worker = getImageProcessingWorker();
  const result = await worker.processImage(
    imageFile,
    numColors,
    minRegionSize,
    smoothness,
    mergeTolerance,
    enableArtisticMerge,
    onProgress,
    enableSmartPalette
  );

  // ✅ PATCH 1 : ajouter width/height si manquants
  if ((!result.metadata?.width || !result.metadata?.height) && typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(imageFile);
      result.metadata = {
        ...(result.metadata || {}),
        width: bmp.width,
        height: bmp.height,
      };
      bmp.close();
    } catch (e) {
      console.warn("[Worker] Impossible de récupérer les dimensions de l’image :", e);
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          result.metadata = {
            ...(result.metadata || {}),
            width: img.width,
            height: img.height,
          };
          resolve();
        };
        img.src = URL.createObjectURL(imageFile);
      });
    }
  }

  // ✅ PATCH 2 : si colorized est vide, on le régénère
  if (!result.colorized && typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(imageFile);
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = bmp.width;
      tmpCanvas.height = bmp.height;
      const ctx = tmpCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(bmp, 0, 0);
        const img = ctx.getImageData(0, 0, bmp.width, bmp.height);
        result.colorized = img;
      }
      bmp.close();
      console.log("[Patch] colorized régénéré avec succès 👍");
    } catch (err) {
      console.warn("[Patch] Impossible de régénérer colorized :", err);
    }
  }

  if (!result.metadata?.width || !result.metadata?.height) {
    throw new Error("Résultat invalide : dimensions non définies");
  }

  return result;
}
