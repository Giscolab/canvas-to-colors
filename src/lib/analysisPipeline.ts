import { analyzeBruteSignal, type BruteSignalReport } from './bruteSignalAnalyzer';
import { createCanvasFactory } from './canvasFactory';
import { generateGrayscaleMap } from './imageProcessing';

export interface RawImageAnalysis {
  readonly referenceImageData: ImageData;
  readonly bruteSignal: BruteSignalReport;
  readonly referenceGrayscaleMap: Uint8Array;
}

interface LoadedImageSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup?: () => void;
}

const canvasFactory = createCanvasFactory();

async function loadImageSource(imageFile: File): Promise<LoadedImageSource> {
  if (typeof document === 'undefined') {
    if (typeof createImageBitmap !== 'function') {
      throw new Error('Image decoding is not supported in this environment.');
    }
    const bitmap = await createImageBitmap(imageFile);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close()
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    const cleanup = () => {
      reader.onload = null;
      reader.onerror = null;
      img.onload = null;
      (img as any).onerror = null;
    };

    reader.onload = e => {
      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      cleanup();
      reject(new Error('Impossible de lire le fichier image.'));
    };

    img.onload = () => {
      cleanup();
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height
      });
    };

    (img as any).onerror = () => {
      cleanup();
      reject(new Error("Impossible de charger l'image fournie."));
    };

    reader.readAsDataURL(imageFile);
  });
}

function resizeImageData(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const { canvas: sourceCanvas, ctx: sourceCtx } = canvasFactory.createCanvas(
    imageData.width,
    imageData.height
  );
  sourceCtx.putImageData(imageData, 0, 0);

  const { ctx: targetCtx } = canvasFactory.createCanvas(targetWidth, targetHeight);
  targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  return targetCtx.getImageData(0, 0, targetWidth, targetHeight);
}

function validateImageData(imageData: ImageData): void {
  if (!imageData || typeof imageData.width !== 'number' || typeof imageData.height !== 'number') {
    throw new Error('ImageData invalide : dimensions manquantes.');
  }
  if (imageData.data.length !== imageData.width * imageData.height * 4) {
    throw new Error('ImageData invalide : taille de buffer incohérente.');
  }
}

export async function analysisPipeline(
  imageFile: File | ImageData,
  maxDim: number = 1200
): Promise<RawImageAnalysis> {
  let referenceImageData: ImageData;

  if (imageFile instanceof ImageData) {
    validateImageData(imageFile);
    let width = imageFile.width;
    let height = imageFile.height;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      referenceImageData = resizeImageData(imageFile, width, height);
    } else {
      referenceImageData = imageFile;
    }
  } else {
    const loadedImage = await loadImageSource(imageFile);
    let width = loadedImage.width;
    let height = loadedImage.height;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const { ctx } = canvasFactory.createCanvas(width, height);
    ctx.drawImage(loadedImage.source, 0, 0, width, height);
    referenceImageData = ctx.getImageData(0, 0, width, height);
    loadedImage.cleanup?.();
  }

  validateImageData(referenceImageData);

  const bruteSignal = await analyzeBruteSignal(referenceImageData);
  const referenceGrayscaleMap = generateGrayscaleMap(referenceImageData);

  if (referenceGrayscaleMap.length !== referenceImageData.width * referenceImageData.height) {
    throw new Error('Carte de gris invalide : taille incohérente.');
  }

  return {
    referenceImageData,
    bruteSignal,
    referenceGrayscaleMap
  };
}
