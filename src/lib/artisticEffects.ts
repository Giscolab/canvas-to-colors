/**
 * Artistic Effects Module
 * Oil, pencil, ink and pastel simulation for Paint by Numbers.
 * Worker-safe (no DOM access), non-destructive: always returns a new ImageData.
 */

import { gaussianBlur, sobelMagnitude, toGrayscale } from './postProcessing';

export type ArtisticEffectType = 'none' | 'oil' | 'pencil' | 'ink' | 'pastel';

export interface ArtisticEffect {
  type: ArtisticEffectType;
  intensity: number; // 0–100
}

export const ARTISTIC_EFFECT_OPTIONS: Array<{ value: ArtisticEffectType; label: string }> = [
  { value: 'none', label: 'Aucun' },
  { value: 'oil', label: 'Huile' },
  { value: 'pencil', label: 'Crayon' },
  { value: 'ink', label: 'Encre de Chine' },
  { value: 'pastel', label: 'Pastel' },
];

/**
 * Main dispatcher for artistic effects.
 */
export function applyArtisticEffect(imageData: ImageData, effect: ArtisticEffect): ImageData {
  if (effect.type === 'none' || effect.intensity <= 0) {
    return imageData;
  }

  switch (effect.type) {
    case 'oil':
      return applyOilEffect(imageData, effect.intensity);
    case 'pencil':
      return applyPencilEffect(imageData, effect.intensity);
    case 'ink':
      return applyInkEffect(imageData, effect.intensity);
    case 'pastel':
      return applyPastelEffect(imageData, effect.intensity);
    default:
      return imageData;
  }
}

/* ------------------------------------------------------------------ */
/* Oil                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Oil painting: classic intensity-histogram filter (Holzmann) — for each pixel
 * the most frequent luminance bucket in the neighbourhood wins and its average
 * colour is written out. A light canvas texture is blended on top.
 *
 * Complexity: O(w * h * r^2) with r <= 4, kept fast with typed arrays.
 */
function applyOilEffect(imageData: ImageData, intensity: number): ImageData {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);
  const dst = output.data;

  const t = intensity / 100;
  const radius = Math.max(1, Math.round(1 + t * 3));
  const levels = 24;
  const textureStrength = t * 0.12;

  const bucketCount = new Int32Array(levels);
  const bucketR = new Int32Array(levels);
  const bucketG = new Int32Array(levels);
  const bucketB = new Int32Array(levels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      bucketCount.fill(0);
      bucketR.fill(0);
      bucketG.fill(0);
      bucketB.fill(0);

      const yMin = Math.max(0, y - radius);
      const yMax = Math.min(height - 1, y + radius);
      const xMin = Math.max(0, x - radius);
      const xMax = Math.min(width - 1, x + radius);

      for (let sy = yMin; sy <= yMax; sy++) {
        const dy = sy - y;
        for (let sx = xMin; sx <= xMax; sx++) {
          const dx = sx - x;
          if (dx * dx + dy * dy > radius * radius) continue;

          const sIdx = (sy * width + sx) * 4;
          const r = data[sIdx], g = data[sIdx + 1], b = data[sIdx + 2];
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const level = Math.min(levels - 1, Math.floor(lum * levels));

          bucketCount[level]++;
          bucketR[level] += r;
          bucketG[level] += g;
          bucketB[level] += b;
        }
      }

      let best = 0;
      for (let l = 1; l < levels; l++) {
        if (bucketCount[l] > bucketCount[best]) best = l;
      }

      const n = Math.max(1, bucketCount[best]);
      const idx = (y * width + x) * 4;
      // Canvas weave texture (deterministic, avoids flicker between renders)
      const texture = (Math.sin(x * 0.9) + Math.cos(y * 0.7)) * textureStrength * 60;

      dst[idx] = clamp255(bucketR[best] / n + texture);
      dst[idx + 1] = clamp255(bucketG[best] / n + texture);
      dst[idx + 2] = clamp255(bucketB[best] / n + texture);
      dst[idx + 3] = data[idx + 3];
    }
  }

  return output;
}

/* ------------------------------------------------------------------ */
/* Pencil                                                              */
/* ------------------------------------------------------------------ */

/**
 * Pencil sketch: dodge-blend graphite base (grayscale / inverted blur),
 * directional hatching in the shadows and Sobel contour reinforcement.
 */
function applyPencilEffect(imageData: ImageData, intensity: number): ImageData {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);
  const dst = output.data;
  const t = intensity / 100;

  const gray = toGrayscale(imageData);
  const inverted = new ImageData(width, height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const v = 255 - gray[p];
    inverted.data[i] = v;
    inverted.data[i + 1] = v;
    inverted.data[i + 2] = v;
    inverted.data[i + 3] = 255;
  }
  const blurredInv = gaussianBlur(inverted, Math.max(1, Math.round(2 + t * 4))).data;
  const edges = sobelMagnitude(imageData);

  const hatchSpacing = Math.max(2, Math.round(9 - t * 6));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const idx = p * 4;

      // Colour dodge: base / (1 - blurredInverted)
      const b = blurredInv[idx];
      const dodge = b >= 255 ? 255 : Math.min(255, (gray[p] * 255) / (255 - b));

      // Hatching in the darker areas
      const hatch = ((x + y) % hatchSpacing === 0 && dodge < 210) ? 60 * t : 0;

      // Contours
      const contour = Math.min(200, edges[p]) * t;

      const sketch = clamp255(dodge - hatch - contour);
      const value = clamp255(gray[p] * (1 - t) + sketch * t);

      dst[idx] = value;
      dst[idx + 1] = value;
      dst[idx + 2] = value;
      dst[idx + 3] = 255;
    }
  }

  return output;
}

/* ------------------------------------------------------------------ */
/* Ink                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Indian ink: hard black contours over a strongly posterized flat render —
 * ideal to preview how the printed template's outlines will read.
 */
function applyInkEffect(imageData: ImageData, intensity: number): ImageData {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);
  const dst = output.data;
  const t = intensity / 100;

  const edges = sobelMagnitude(imageData);
  const edgeThreshold = 70 - t * 45; // stronger intensity -> more lines
  const levels = Math.max(2, Math.round(8 - t * 5));
  const stepSize = 255 / (levels - 1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const idx = p * 4;

      const posterize = (v: number) => Math.round(Math.round(v / stepSize) * stepSize);
      const isEdge = edges[p] > edgeThreshold;

      if (isEdge) {
        const ink = clamp255(255 * (1 - t));
        dst[idx] = ink;
        dst[idx + 1] = ink;
        dst[idx + 2] = ink;
      } else {
        // Slight wash: flatten and lighten fills so the lines dominate
        dst[idx] = clamp255(posterize(data[idx]) * (1 - 0.15 * t) + 255 * 0.15 * t);
        dst[idx + 1] = clamp255(posterize(data[idx + 1]) * (1 - 0.15 * t) + 255 * 0.15 * t);
        dst[idx + 2] = clamp255(posterize(data[idx + 2]) * (1 - 0.15 * t) + 255 * 0.15 * t);
      }
      dst[idx + 3] = data[idx + 3];
    }
  }

  return output;
}

/* ------------------------------------------------------------------ */
/* Pastel                                                              */
/* ------------------------------------------------------------------ */

/**
 * Soft pastel: desaturated, lightened palette with paper grain and a gentle
 * bloom, mimicking chalk pastel on textured paper.
 */
function applyPastelEffect(imageData: ImageData, intensity: number): ImageData {
  const { width, height, data } = imageData;
  const t = intensity / 100;
  const soft = gaussianBlur(imageData, Math.max(1, Math.round(1 + t * 2))).data;
  const output = new ImageData(width, height);
  const dst = output.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Paper grain (deterministic hash noise)
      const h = ((x * 374761393 + y * 668265263) ^ 0x5bf03635) >>> 0;
      const grain = ((h % 255) / 255 - 0.5) * 26 * t;

      for (let c = 0; c < 3; c++) {
        const base = data[idx + c] * (1 - t) + soft[idx + c] * t;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        // Desaturate towards luminance, then lift towards white
        const desat = base * (1 - 0.35 * t) + lum * 0.35 * t;
        const lifted = desat * (1 - 0.22 * t) + 255 * 0.22 * t;
        dst[idx + c] = clamp255(lifted + grain);
      }
      dst[idx + 3] = data[idx + 3];
    }
  }

  return output;
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
