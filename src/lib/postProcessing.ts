/**
 * Post-Processing Effects Module
 * Simulates artistic painting effects (watercolor, brush, pointillism, impasto)
 * Non-destructive, applied on a copy of the colorized render.
 *
 * All functions are worker-safe (no DOM access) and operate on ImageData.
 */

export type PaintEffectType = 'none' | 'watercolor' | 'brush' | 'pointillism' | 'impasto';

export interface PaintEffect {
  type: PaintEffectType;
  intensity: number; // 0-100
}

export const PAINT_EFFECT_OPTIONS: Array<{ value: PaintEffectType; label: string }> = [
  { value: 'none', label: 'Aucun' },
  { value: 'watercolor', label: 'Aquarelle' },
  { value: 'brush', label: 'Pinceau' },
  { value: 'pointillism', label: 'Pointillisme' },
  { value: 'impasto', label: 'Impasto (matière)' },
];

/**
 * Apply artistic paint effect to ImageData.
 * Returns a NEW ImageData (input is never mutated).
 */
export function applyPaintEffect(imageData: ImageData, effect: PaintEffect): ImageData {
  if (effect.type === 'none' || effect.intensity <= 0) {
    return imageData;
  }

  switch (effect.type) {
    case 'watercolor':
      return applyWatercolorEffect(imageData, effect.intensity);
    case 'brush':
      return applyBrushEffect(imageData, effect.intensity);
    case 'pointillism':
      return applyPointillismEffect(imageData, effect.intensity);
    case 'impasto':
      return applyImpastoEffect(imageData, effect.intensity);
    default:
      return imageData;
  }
}

/* ------------------------------------------------------------------ */
/* Watercolor                                                          */
/* ------------------------------------------------------------------ */

/**
 * Watercolor: Gaussian bleed blended back over the source, with contours
 * preserved thanks to a Sobel edge mask (edges keep the crisp original).
 */
function applyWatercolorEffect(imageData: ImageData, intensity: number): ImageData {
  const t = intensity / 100;
  const blurRadius = Math.max(1, Math.round(t * 5));
  const blurred = gaussianBlur(imageData, blurRadius);
  const edges = sobelMagnitude(imageData);

  const out = new ImageData(imageData.width, imageData.height);
  const src = imageData.data;
  const blur = blurred.data;
  const dst = out.data;

  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    // Strong edge -> keep original, flat area -> full bleed
    const edgeWeight = Math.min(1, edges[p] / 90);
    const w = t * (1 - edgeWeight);

    // Slight pigment granulation typical of watercolour paper
    const grain = (((p * 2654435761) % 97) / 97 - 0.5) * 10 * t;

    dst[i] = clamp255(src[i] * (1 - w) + blur[i] * w + grain);
    dst[i + 1] = clamp255(src[i + 1] * (1 - w) + blur[i + 1] * w + grain);
    dst[i + 2] = clamp255(src[i + 2] * (1 - w) + blur[i + 2] * w + grain);
    dst[i + 3] = src[i + 3];
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Brush                                                               */
/* ------------------------------------------------------------------ */

/**
 * Brush: directional smear following the local gradient orientation,
 * which produces strokes that hug shapes instead of a fixed diagonal.
 */
function applyBrushEffect(imageData: ImageData, intensity: number): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const dst = out.data;
  dst.set(data);

  const t = intensity / 100;
  const strokeLength = Math.max(2, Math.round(t * 8));
  const strokeOpacity = t * 0.75;
  const gray = toGrayscale(imageData);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Local gradient -> stroke direction is perpendicular to it
      const gx = gray[y * width + Math.min(width - 1, x + 1)] - gray[y * width + Math.max(0, x - 1)];
      const gy = gray[Math.min(height - 1, y + 1) * width + x] - gray[Math.max(0, y - 1) * width + x];
      const angle = Math.atan2(-gx, gy);
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);

      let r = 0, g = 0, b = 0, count = 0;
      for (let i = -strokeLength; i <= strokeLength; i++) {
        const sx = Math.round(x + dirX * i);
        const sy = Math.round(y + dirY * i);
        if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
        const sIdx = (sy * width + sx) * 4;
        r += data[sIdx];
        g += data[sIdx + 1];
        b += data[sIdx + 2];
        count++;
      }

      if (count > 0) {
        const bristle = (((x * 7 + y * 13) % 5) - 2) * 3 * t;
        dst[idx] = clamp255(data[idx] * (1 - strokeOpacity) + (r / count) * strokeOpacity + bristle);
        dst[idx + 1] = clamp255(data[idx + 1] * (1 - strokeOpacity) + (g / count) * strokeOpacity + bristle);
        dst[idx + 2] = clamp255(data[idx + 2] * (1 - strokeOpacity) + (b / count) * strokeOpacity + bristle);
      }
    }
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Pointillism                                                         */
/* ------------------------------------------------------------------ */

/**
 * Pointillism: paints coloured dots on a light canvas, dot size and density
 * driven by the intensity. Dot colours are sampled from the source render.
 */
function applyPointillismEffect(imageData: ImageData, intensity: number): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const dst = out.data;

  // Canvas base: a soft tint of the blurred source so no hole remains visible
  const base = gaussianBlur(imageData, 3).data;
  for (let i = 0; i < dst.length; i += 4) {
    dst[i] = clamp255(base[i] * 0.35 + 255 * 0.65);
    dst[i + 1] = clamp255(base[i + 1] * 0.35 + 255 * 0.65);
    dst[i + 2] = clamp255(base[i + 2] * 0.35 + 255 * 0.65);
    dst[i + 3] = 255;
  }

  const t = intensity / 100;
  const dotRadius = Math.max(1, Math.round(1 + t * 3));
  const step = Math.max(2, Math.round(dotRadius * 1.6));
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const jx = Math.round(x + (rand() - 0.5) * step);
      const jy = Math.round(y + (rand() - 0.5) * step);
      const cx = Math.max(0, Math.min(width - 1, jx));
      const cy = Math.max(0, Math.min(height - 1, jy));
      const sIdx = (cy * width + cx) * 4;
      const r = data[sIdx], g = data[sIdx + 1], b = data[sIdx + 2];
      const radius = dotRadius * (0.7 + rand() * 0.6);

      for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
        for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > radius) continue;
          const px = cx + dx;
          const py = cy + dy;
          if (px < 0 || px >= width || py < 0 || py >= height) continue;
          const alpha = (1 - d / (radius + 0.001)) * (0.55 + 0.45 * t);
          const oIdx = (py * width + px) * 4;
          dst[oIdx] = clamp255(dst[oIdx] * (1 - alpha) + r * alpha);
          dst[oIdx + 1] = clamp255(dst[oIdx + 1] * (1 - alpha) + g * alpha);
          dst[oIdx + 2] = clamp255(dst[oIdx + 2] * (1 - alpha) + b * alpha);
        }
      }
    }
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Impasto                                                             */
/* ------------------------------------------------------------------ */

/**
 * Impasto: fake relief lighting. A height map derived from luminance and a
 * procedural stroke texture is lit from the top-left, giving thick-paint feel.
 */
function applyImpastoEffect(imageData: ImageData, intensity: number): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const dst = out.data;
  const t = intensity / 100;

  const gray = toGrayscale(imageData);
  const heights = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      // Stroke texture: oriented ridges + luminance relief
      const ridge = Math.sin((x * 0.6 + y * 0.35) + Math.sin(y * 0.12) * 2) * 12;
      heights[p] = gray[p] * 0.35 + ridge;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const idx = p * 4;
      const hx = heights[y * width + Math.min(width - 1, x + 1)] - heights[y * width + Math.max(0, x - 1)];
      const hy = heights[Math.min(height - 1, y + 1) * width + x] - heights[Math.max(0, y - 1) * width + x];

      // Lambert-like shading from a top-left light
      const shade = (-hx - hy) * 0.9 * t;

      dst[idx] = clamp255(data[idx] + shade);
      dst[idx + 1] = clamp255(data[idx + 1] + shade);
      dst[idx + 2] = clamp255(data[idx + 2] + shade);
      dst[idx + 3] = data[idx + 3];
    }
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

export function toGrayscale(imageData: ImageData): Float32Array {
  const { data } = imageData;
  const gray = new Float32Array(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
}

/**
 * Sobel gradient magnitude of the image, one value per pixel.
 */
export function sobelMagnitude(imageData: ImageData): Float32Array {
  const { width, height } = imageData;
  const gray = toGrayscale(imageData);
  const mag = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx =
        -gray[i - width - 1] + gray[i - width + 1] +
        -2 * gray[i - 1] + 2 * gray[i + 1] +
        -gray[i + width - 1] + gray[i + width + 1];
      const gy =
        -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] +
        gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
      mag[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return mag;
}

/**
 * Separable Gaussian blur (horizontal + vertical pass).
 */
export function gaussianBlur(imageData: ImageData, radius: number): ImageData {
  if (radius < 1) return imageData;

  const { width, height } = imageData;
  const kernel = generateGaussianKernel(radius);
  const kernelSize = kernel.length;
  const half = Math.floor(kernelSize / 2);

  const temp = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < kernelSize; k++) {
        const sx = Math.max(0, Math.min(width - 1, x + k - half));
        const idx = (y * width + sx) * 4;
        const w = kernel[k];
        r += imageData.data[idx] * w;
        g += imageData.data[idx + 1] * w;
        b += imageData.data[idx + 2] * w;
        a += imageData.data[idx + 3] * w;
      }
      const idx = (y * width + x) * 4;
      temp[idx] = r; temp[idx + 1] = g; temp[idx + 2] = b; temp[idx + 3] = a;
    }
  }

  const output = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < kernelSize; k++) {
        const sy = Math.max(0, Math.min(height - 1, y + k - half));
        const idx = (sy * width + x) * 4;
        const w = kernel[k];
        r += temp[idx] * w;
        g += temp[idx + 1] * w;
        b += temp[idx + 2] * w;
        a += temp[idx + 3] * w;
      }
      const idx = (y * width + x) * 4;
      output.data[idx] = r;
      output.data[idx + 1] = g;
      output.data[idx + 2] = b;
      output.data[idx + 3] = a;
    }
  }

  return output;
}

function generateGaussianKernel(radius: number): number[] {
  const sigma = Math.max(0.5, radius / 3);
  const size = radius * 2 + 1;
  const kernel = new Array<number>(size);
  let sum = 0;

  for (let i = 0; i < size; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;

  return kernel;
}
