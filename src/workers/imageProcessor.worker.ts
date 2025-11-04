/**
 * Web Worker for image processing
 * Offloads heavy computation from main thread
 */

import { processImage } from '@/lib/imageProcessing';
import { IMAGE_PROCESSING } from '@/config/constants';

interface WorkerMessage {
  type: 'process';
  payload: {
    imageFile: File;
    numColors: number;
    minRegionSize: number;
    smoothness: number;
    mergeTolerance: number;
    enableSmartPalette?: boolean;
    enableArtisticMerge?: boolean;
  };
}

interface WorkerResponse {
  type: 'success' | 'error' | 'progress' | 'done';
  payload?: any;
  error?: string;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  // Validate message type
  if (type !== 'process') {
    const response: WorkerResponse = {
      type: 'error',
      error: `Unknown message type: ${type}`
    };
    self.postMessage(response);
    return;
  }

  try {
    const {
      imageFile,
      numColors,
      minRegionSize,
      smoothness,
      mergeTolerance,
      enableSmartPalette,
      enableArtisticMerge,
    } = payload;

    // Validate payload
    if (
      !imageFile ||
      !numColors ||
      minRegionSize === undefined ||
      smoothness === undefined ||
      mergeTolerance === undefined
    ) {
      throw new Error('Invalid payload: missing required parameters');
    }
    
    // Additional size validation
    if (imageFile.size > IMAGE_PROCESSING.MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `Image trop volumineuse : ${(imageFile.size / (1024 * 1024)).toFixed(1)} MB. ` +
        `Maximum : ${IMAGE_PROCESSING.MAX_FILE_SIZE_MB} MB`
      );
    }
    
    // Send progress updates
    const progressCallback = (stage: string, percent: number) => {
      const progressResponse: WorkerResponse = {
        type: 'progress',
        payload: { stage, progress: percent }
      };
      self.postMessage(progressResponse);
    };
    
// 🧩 Décodage robuste du fichier image en ImageData
let decodedImageData: ImageData | null = null;
try {
  const arrayBuffer = await imageFile.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: imageFile.type });
  const imageBitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de créer le contexte 2D pour le décodage.");

  ctx.drawImage(imageBitmap, 0, 0);
  decodedImageData = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
  imageBitmap.close();

  console.log("[Worker] ✅ Image décodée correctement :", decodedImageData.width, "x", decodedImageData.height);
} catch (err) {
  console.error("[Worker] ❌ Échec du décodage ImageData, fallback FileReader :", err);
  try {
    const reader = new FileReaderSync(); // dispo en Worker
    const blobUrl = URL.createObjectURL(imageFile);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = blobUrl;
    });
    const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Impossible de créer le contexte 2D (fallback).");
    ctx.drawImage(img, 0, 0);
    decodedImageData = ctx.getImageData(0, 0, img.width, img.height);
    URL.revokeObjectURL(blobUrl);
    console.log("[Worker] ✅ Fallback réussi :", decodedImageData.width, "x", decodedImageData.height);
  } catch (fallbackErr) {
    console.error("[Worker] ❌ Fallback échoué :", fallbackErr);
    throw new Error("Impossible de convertir le fichier image en ImageData (même en fallback).");
  }
}
	
    // Process image with progress callback
    const result = await processImage(
      decodedImageData,
      numColors,
      minRegionSize,
      smoothness,
      mergeTolerance,
      enableArtisticMerge ?? true,
      progressCallback,
      enableSmartPalette ?? false
    );
    
    // Send success response
    const response: WorkerResponse = {
      type: 'success',
      payload: result
    };
    self.postMessage(response);
    
    // Send done signal (ensures proper sequencing)
    const doneResponse: WorkerResponse = {
      type: 'done'
    };
    self.postMessage(doneResponse);
  } catch (error) {
    // Send error response
    const response: WorkerResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error during processing'
    };
    self.postMessage(response);
    
    // Send done signal even on error
    const doneResponse: WorkerResponse = {
      type: 'done'
    };
    self.postMessage(doneResponse);
  }
};
