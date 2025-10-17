/**
 * Artistic Effects Module
 * Oil Painting & Pencil Sketch simulation for Paint by Numbers
 * Phase 3.4 - Non-destructive real-time effects
 */

export type ArtisticEffectType = 'none' | 'oil' | 'pencil';

export interface ArtisticEffect {
  type: ArtisticEffectType;
  intensity: number; // 0–100
}

/**
 * Main dispatcher for artistic effects
 */
export function applyArtisticEffect(
  imageData: ImageData,
  effect: ArtisticEffect
): ImageData {
  if (effect.type === 'none' || effect.intensity === 0) {
    return imageData;
  }

  switch (effect.type) {
    case 'oil':
      return applyOilEffect(imageData, effect.intensity);
    case 'pencil':
      return applyPencilEffect(imageData, effect.intensity);
    default:
      return imageData;
  }
}

/**
 * Oil Painting Effect
 * Simulates "oil on canvas" with thick brush strokes and locally merged hues
 */
function applyOilEffect(
  imageData: ImageData,
  intensity: number
): ImageData {
  const output = new ImageData(imageData.width, imageData.height);
  const data = imageData.data;
  const outData = output.data;

  // Adaptive radius based on intensity
  const radius = Math.max(1, Math.round((intensity / 100) * 5));
  const textureStrength = (intensity / 100) * 0.15;

  // Apply local quantization + smudge filter
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const idx = (y * imageData.width + x) * 4;

      // Local color quantization (mini k-means in circular neighborhood)
      const localColors = new Map<string, { r: number; g: number; b: number; count: number }>();

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > radius) continue;

          const sx = Math.max(0, Math.min(imageData.width - 1, x + dx));
          const sy = Math.max(0, Math.min(imageData.height - 1, y + dy));
          const sIdx = (sy * imageData.width + sx) * 4;

          const r = data[sIdx];
          const g = data[sIdx + 1];
          const b = data[sIdx + 2];

          // Quantize to 32 levels per channel for grouping
          const qr = Math.round(r / 8) * 8;
          const qg = Math.round(g / 8) * 8;
          const qb = Math.round(b / 8) * 8;
          const key = `${qr},${qg},${qb}`;

          if (!localColors.has(key)) {
            localColors.set(key, { r: qr, g: qg, b: qb, count: 0 });
          }
          localColors.get(key)!.count++;
        }
      }

      // Find dominant local color
      let maxCount = 0;
      let dominantColor = { r: data[idx], g: data[idx + 1], b: data[idx + 2] };

      for (const color of localColors.values()) {
        if (color.count > maxCount) {
          maxCount = color.count;
          dominantColor = color;
        }
      }

      // Add canvas texture (random luminosity variation)
      const texture = (Math.random() - 0.5) * textureStrength * 255;

      outData[idx] = Math.max(0, Math.min(255, dominantColor.r + texture));
      outData[idx + 1] = Math.max(0, Math.min(255, dominantColor.g + texture));
      outData[idx + 2] = Math.max(0, Math.min(255, dominantColor.b + texture));
      outData[idx + 3] = data[idx + 3];
    }
  }

  return output;
}

/**
 * Pencil Sketch Effect
 * Grayscale + Sobel edges + directional hatching
 */
function applyPencilEffect(
  imageData: ImageData,
  intensity: number
): ImageData {
  const output = new ImageData(imageData.width, imageData.height);
  const data = imageData.data;
  const outData = output.data;

  // 1. Convert to grayscale using luminance
  const grayscale = new Uint8Array(imageData.width * imageData.height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Standard luminance formula
    grayscale[idx] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // 2. Sobel edge detection
  const edges = detectEdgesSobel(grayscale, imageData.width, imageData.height);

  // 3. Apply hatching pattern based on intensity
  const hatchingSpacing = Math.max(2, Math.round(8 - (intensity / 100) * 6));
  const hatchingAngle = 45; // degrees

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const idx = (y * imageData.width + x) * 4;
      const pixelIdx = y * imageData.width + x;

      const grayValue = grayscale[pixelIdx];
      const edgeValue = edges[pixelIdx];

      // Generate hatching based on darkness
      const shouldHatch = ((x + y) % hatchingSpacing === 0) && (grayValue < 180);
      const hatchValue = shouldHatch ? Math.max(0, grayValue - 50) : grayValue;

      // Blend with edges (multiply blend)
      const edgeFactor = edgeValue / 255;
      const finalValue = Math.round(hatchValue * (1 - edgeFactor * (intensity / 100)));

      outData[idx] = finalValue;
      outData[idx + 1] = finalValue;
      outData[idx + 2] = finalValue;
      outData[idx + 3] = 255;
    }
  }

  return output;
}

/**
 * Sobel edge detection helper
 */
function detectEdgesSobel(
  grayscale: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const edges = new Uint8Array(width * height);

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      // Convolve with Sobel kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const ki = (ky + 1) * 3 + (kx + 1);

          gx += grayscale[idx] * sobelX[ki];
          gy += grayscale[idx] * sobelY[ki];
        }
      }

      // Gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const pixelIdx = y * width + x;
      edges[pixelIdx] = Math.min(255, magnitude);
    }
  }

  return edges;
}

/**
 * Generate hatching pattern for pencil effect
 */
function generateHatchingPattern(
  angle: number,
  spacing: number,
  width: number,
  height: number
): boolean[][] {
  const pattern: boolean[][] = [];
  const rad = (angle * Math.PI) / 180;

  for (let y = 0; y < height; y++) {
    pattern[y] = [];
    for (let x = 0; x < width; x++) {
      const rotatedPos = x * Math.cos(rad) + y * Math.sin(rad);
      pattern[y][x] = Math.floor(rotatedPos) % spacing === 0;
    }
  }

  return pattern;
}

/**
 * Blend multiply mode for pencil sketch
 */
function blendMultiply(
  base: number,
  overlay: number,
  opacity: number
): number {
  const multiplied = (base * overlay) / 255;
  return Math.round(base * (1 - opacity) + multiplied * opacity);
}
