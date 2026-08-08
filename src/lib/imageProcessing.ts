import { isoContours } from 'marchingsquares';
import polylabel from 'polylabel';
import { union } from 'martinez-polygon-clipping';
import simplify from 'simplify-js';
import { rgbToLab, deltaE2000, perceptualDistance, rgbToHex as rgbToHexColor } from './colorUtils';
import type { ArtisticMergeStats } from './regionMerge';
import { analyzeBruteSignal, type BruteSignalReport } from './bruteSignalAnalyzer';
import { LRUCache } from './lruCache';
import { createCanvasFactory, type Canvas2DContext } from './canvasFactory';
import { analysisPipeline } from './analysisPipeline';
import { renderPipeline } from './renderPipeline';

// Image processing utilities for paint-by-numbers conversion
// Enhanced with ΔE2000 perceptual color distance, adaptive simplification, and parametric caching

// ============= TYPES =============

export interface Zone {
  id: number;
  colorIdx: number;
  area: number;
  pixels: Uint32Array;
  centroid: { x: number; y: number };
}

export interface LegendEntry {
  id: number;
  hex: string;
  percent: number;
}

export interface ProgressEvent {
  stage: string;
  progress: number;
  detail?: string;
  timestamp: number;
}

export interface ColorHistogramEntry {
  color: string;
  count: number;
}

export interface ImageTypeInfo {
  type: string;
  realismScore: number;
  stylizationScore: number;
  confidence: number;
}

export interface ColorAnalysis {
  uniqueColorsCount: number;
  dominantColors: string[]; // Top 10 couleurs
  dominantWeights: number[]; // Proportion de chaque couleur dominante
  entropy: number;
  edgeDensity: number;
  complexityScore: number; // 0-100
  histogram: ColorHistogramEntry[];
  totalPixels: number;
  mode: 'vector' | 'photo';
  imageType?: ImageTypeInfo;
  sourceType?: 'vector' | 'raster';
  bruteSignal?: BruteSignalReport;
}

export interface Recommendations {
  recommendedNumColors: number;
  recommendedMinRegionSize: number;
  recommendedDeltaE: number;
  mode: 'vector' | 'photo';
  reasons: {
    numColors: string;
    minRegionSize: string;
    deltaE: string;
    mode: string;
  };
}

export interface ProcessedResult {
  contours: ImageData | null;
  numbered: ImageData | null;
  colorized: ImageData | null;
  palette: string[];
  rawPalette?: string[]; // Palette brute avant optimisation
  zones: Zone[];
  svg: string;
  legend: LegendEntry[];
  labels?: Int32Array;
  colorZoneMapping?: Map<number, number[]>; // colorIdx -> zoneIds[]
  artisticMergeStats?: ArtisticMergeStats;
  progressLog?: ProgressEvent[];
  metadata?: {
    totalProcessingTimeMs: number;
    width: number;
    height: number;
    cacheKey: string;
    wasCached: boolean;
    averageDeltaE?: number; // ΔE moyen après correction de palette
  };
}

interface Contour {
  zoneId: number;
  path: Array<{ x: number; y: number }>;
}

const canvasFactory = createCanvasFactory();

// ============= COLOR UTILITIES =============

export function rgbToHex(r: number, g: number, b: number): string {
  return rgbToHexColor(Math.round(r), Math.round(g), Math.round(b));
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

/**
 * Calculate perceptual color distance using ΔE2000
 * More accurate than simple Euclidean or Lab distance
 */
function colorDistance(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  return perceptualDistance(rgb1, rgb2);
}

// ============= PARAMETRIC CACHE =============

interface CacheKey {
  imageHash: string;
  numColors: number;
  minRegionSize: number;
  smoothness: number;
  mergeTolerance: number;
  enableArtisticMerge: boolean;
}

interface CacheEntry {
  result: ProcessedResult;
  timestamp: number;
}

/**
 * LRU cache with proper ordering
 */
const resultCache = new LRUCache<ProcessedResult>(5, 10 * 60 * 1000, false);

/**
 * Generate cache key from parameters
 */
function generateCacheKey(params: CacheKey): string {
  return `${params.imageHash}_${params.numColors}_${params.minRegionSize}_${params.smoothness}_${params.mergeTolerance}_${params.enableArtisticMerge ? 1 : 0}`;
}

/**
 * Hash image data for cache key using stable CRC32-like algorithm
 */
async function hashImageData(imageData: ImageData): Promise<string> {
  // Use first 1000 pixels for fast hash
  const sample = imageData.data.slice(0, 4000);
  
  // CRC32-like stable hash
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) - hash) + sample[i];
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Add dimensions to ensure uniqueness
  const dimensionHash = ((imageData.width << 16) | imageData.height) >>> 0;
  const finalHash = (hash ^ dimensionHash) >>> 0;
  
  return `${finalHash.toString(36)}_${imageData.width}_${imageData.height}`;
}

/**
 * Get cached result if available
 */
function getCachedResult(key: string): ProcessedResult | null {
  const cached = resultCache.get(key);
  if (cached) {
    console.log('✨ Cache hit! Returning cached result. Stats:', resultCache.getStats());
  }
  return cached;
}

/**
 * Store result in cache
 */
function setCachedResult(key: string, result: ProcessedResult): void {
  resultCache.set(key, result);
  console.log('💾 Result cached for future use. Stats:', resultCache.getStats());
}

// ============= COLOR ANALYSIS =============

function detectImageType(imageData: ImageData): ImageTypeInfo {
  const { data, width, height } = imageData;
  const totalPixels = width * height;

  if (!width || !height || totalPixels === 0) {
    return { type: "unknown", realismScore: 0, stylizationScore: 0, confidence: 0 };
  }

  let totalSaturation = 0;
  let gradientEnergy = 0;
  let edgeCount = 0;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const maxRGB = Math.max(r, g, b);
      const minRGB = Math.min(r, g, b);
      const saturation = (maxRGB - minRGB) / (maxRGB || 1);
      totalSaturation += saturation;

      // --- Gradient Sobel (énergie de texture)
      let gx = 0, gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const i2 = ((y + ky) * width + (x + kx)) * 4;
          const lum2 =
            0.299 * data[i2] + 0.587 * data[i2 + 1] + 0.114 * data[i2 + 2];

          const kxIndex = (ky + 1) * 3 + (kx + 1);
          const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1][kxIndex];
          const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1][kxIndex];

          gx += lum2 * gxKernel;
          gy += lum2 * gyKernel;
        }
      }

      const mag = Math.sqrt(gx * gx + gy * gy);
      gradientEnergy += mag;
      if (mag > 100) edgeCount++;
    }
  }

  const avgSaturation = totalSaturation / totalPixels;
  const texturePower = gradientEnergy / totalPixels;
  const edgeDensity = edgeCount / totalPixels;

  const realismScore = Math.min(
    1,
    (texturePower * 0.5 + avgSaturation * 0.3 + edgeDensity * 0.2) * 10
  );
  const stylizationScore = 1 - realismScore;

  let type: string = "unknown";
  if (realismScore > 0.8) type = "photo";
  else if (realismScore > 0.6) type = "ai-realistic";
  else if (realismScore > 0.45) type = "painting";
  else if (realismScore > 0.3) type = "illustration";
  else if (edgeDensity > 0.01 && avgSaturation < 0.2) type = "drawing";
  else if (realismScore < 0.2) type = "sketch";
  else type = "technical";

  return {
    type,
    realismScore: parseFloat(realismScore.toFixed(3)),
    stylizationScore: parseFloat(stylizationScore.toFixed(3)),
    confidence: 0.8,
  };
}

function computeEdgeDensity(imageData: ImageData): number {
  const { data, width, height } = imageData;
  if (!width || !height) return 0;

  let edgeCount = 0;
  let samples = 0;
  const stride = 2;
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  const threshold = 120;

  for (let y = 1; y < height - 1; y += stride) {
    for (let x = 1; x < width - 1; x += stride) {
      let gx = 0;
      let gy = 0;
      let k = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const lum =
            0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          gx += lum * sobelX[k];
          gy += lum * sobelY[k];
          k++;
        }
      }
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > threshold) edgeCount++;
      samples++;
    }
  }

  return samples ? edgeCount / samples : 0;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function estimateCoverageColors(
  colorCounts: Map<string, number>,
  totalPixels: number,
  coverageTarget = 0.95
): number {
  if (totalPixels === 0 || colorCounts.size === 0) return 0;
  const sortedCounts = Array.from(colorCounts.values()).sort((a, b) => b - a);
  let cumulative = 0;
  let count = 0;
  for (const value of sortedCounts) {
    cumulative += value;
    count += 1;
    if (cumulative / totalPixels >= coverageTarget) {
      break;
    }
  }
  return count;
}

/**
 * Analyze image colors before processing
 * Déclenche une analyse brute sans redimensionnement ni normalisation.
 */
export async function analyzeImageColors(
  imageSource: File,
  options?: {
    onProgress?: (progress: number) => void;
    sourceType?: 'vector' | 'raster';
  }
): Promise<ColorAnalysis> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('createImageBitmap est indisponible pour une analyse brute.');
  }

  const { onProgress, sourceType = 'raster' } = options ?? {};

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(imageSource, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch (error) {
    console.warn("Impossible d'appliquer l'orientation EXIF, fallback brut.", error);
    bitmap = await createImageBitmap(imageSource);
  }

  // === 1️⃣ Analyse brute : aucune mise à l'échelle ni normalisation ===
  const { width, height } = bitmap;
  const { ctx } = canvasFactory.createCanvas(width, height);
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  bitmap.close();

  // === 2️⃣ Comptage précis (sans quantification ni échantillonnage) ===
  const totalPixels = imageData.width * imageData.height;
  const colorCounts = new Map<string, number>();
  const colorSet = new Set<string>();
  const totalDataLength = imageData.data.length;
  const progressInterval = Math.max(1, Math.floor(totalDataLength / 100));
  const formatColor = (r: number, g: number, b: number, a: number) => {
    if (a < 255) {
      const alpha = Math.round((a / 255) * 1000) / 1000;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return rgbToHex(r, g, b);
  };

  for (let i = 0; i < totalDataLength; i += 4) {
    const hex = formatColor(
      imageData.data[i],
      imageData.data[i + 1],
      imageData.data[i + 2],
      imageData.data[i + 3]
    );

    colorSet.add(hex);
    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);

    if (onProgress && i % progressInterval === 0) {
      onProgress((i / totalDataLength) * 80);
    }
  }

  // === 3️⃣ Calcul d'entropie (complexité visuelle) ===
  const entropy = Array.from(colorCounts.values())
    .map((count) => {
      const p = count / totalPixels;
      return p === 0 ? 0 : -p * Math.log2(p);
    })
    .reduce((sum, val) => sum + val, 0);

  const edgeDensity = computeEdgeDensity(imageData);
  const maxEntropy = Math.log2(Math.max(1, totalPixels));
  const normalizedEntropy = maxEntropy ? entropy / maxEntropy : 0;
  const normalizedEdgeDensity = clampNumber(edgeDensity * 1.8, 0, 1);
  const complexityScore = Math.round(
    clampNumber((normalizedEntropy * 0.55 + normalizedEdgeDensity * 0.45) * 100, 0, 100)
  );

  // === 4️⃣ Couleurs dominantes ===
  const topDominantEntries = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const totalCount = Array.from(colorCounts.values()).reduce((a, b) => a + b, 0);

  const dominantColors = topDominantEntries.map(([hex]) => hex);
  const dominantWeights = topDominantEntries.map(([_, count]) =>
    totalCount ? count / totalCount : 0
  );

  // === 5️⃣ Histogramme complet ===
  const histogram = [...colorCounts.entries()].map(([color, count]) => ({
    color,
    count,
  }));

  // === 6️⃣ Détection du type d'image ===
  const typeInfo = detectImageType(imageData);

  // === 7️⃣ Mode (interprétation) ===
  const uniqueCount = colorSet.size;
  let mode: 'vector' | 'photo' = sourceType === 'vector' ? 'vector' : 'photo';

  if (sourceType !== 'vector') {
    if (
      typeInfo.type === "illustration" ||
      typeInfo.type === "drawing" ||
      typeInfo.type === "technical"
    ) {
      mode = 'vector';
    } else if (
      uniqueCount < 300 &&
      complexityScore < 25 &&
      topDominantEntries.length <= 10
    ) {
      mode = 'vector';
    }
  }

  if (onProgress) onProgress(90);

  // === 8️⃣ Analyse brute du signal (FFT, gradient Sobel, corrélation) ===
  let bruteSignal: BruteSignalReport | undefined;
  try {
    bruteSignal = await analyzeBruteSignal(imageData);
  } catch (err) {
    console.warn("Analyse brute du signal échouée (non bloquant):", err);
  }

  if (onProgress) onProgress(100);

  return {
    uniqueColorsCount: uniqueCount,
    dominantColors,
    dominantWeights,
    entropy,
    edgeDensity,
    complexityScore,
    histogram,
    totalPixels,
    mode,
    imageType: typeInfo,
    sourceType,
    bruteSignal,
  };
}

export function getRecommendationsFromAnalysis(
  analysis: ColorAnalysis
): Recommendations {
  const uniqueCount = analysis.uniqueColorsCount;
  const complexityScore = analysis.complexityScore ?? 0;
  const typeInfo = analysis.imageType;
  const edgeDensity = analysis.edgeDensity ?? 0;
  const totalPixels = analysis.totalPixels || 0;

  const coverageColors = estimateCoverageColors(
    new Map(analysis.histogram.map((entry) => [entry.color, entry.count])),
    totalPixels,
    0.95
  );
  const effectiveColors = Math.pow(2, analysis.entropy || 0);
  const weightedColors =
    coverageColors * 0.7 + clampNumber(effectiveColors, 1, 128) * 0.3;

  let recommendedNumColors = Math.round(
    weightedColors * (0.9 + clampNumber(edgeDensity, 0, 1) * 0.3)
  );
  recommendedNumColors = Math.round(
    clampNumber(recommendedNumColors, 8, analysis.mode === "vector" ? 24 : 64)
  );

  const baseMinRegion =
    totalPixels * (0.00002 + clampNumber(edgeDensity, 0, 1) * 0.00012);
  let recommendedMinRegionSize = Math.round(clampNumber(baseMinRegion, 5, 500));

  if (typeInfo?.type === "technical" || typeInfo?.type === "drawing") {
    recommendedMinRegionSize = Math.round(clampNumber(recommendedMinRegionSize * 0.7, 5, 200));
  }
  if (analysis.mode === "vector") {
    recommendedMinRegionSize = Math.max(10, recommendedMinRegionSize);
  }

  const mode: 'vector' | 'photo' = analysis.mode;

  if (mode === 'vector') {
    recommendedNumColors = Math.min(recommendedNumColors, 14);
    recommendedMinRegionSize = Math.max(10, recommendedMinRegionSize);
  }

  const perceptualDeltaE = (baseDeltaE: number, imageType: string) => {
    if (imageType === "photo") return baseDeltaE * 1.2;
    if (imageType === "illustration" || imageType === "drawing") return baseDeltaE * 0.8;
    return baseDeltaE;
  };

  let recommendedDeltaE = perceptualDeltaE(5, typeInfo?.type ?? "unknown");
  recommendedDeltaE *= 1 - Math.min(0.4, complexityScore / 250);
  recommendedDeltaE *= 1 + Math.min(0.3, edgeDensity);

  if (mode === 'vector') {
    recommendedDeltaE = Math.min(4, recommendedDeltaE);
  }

  // === Ajustements basés sur l'analyse brute du signal ===
  const bs = analysis.bruteSignal;
  const signalReasons: string[] = [];

  if (bs) {
    // Ratio haute fréquence élevé → image bruitée → augmenter minRegionSize
    const avgHighFreq = _avgSpectralMetric(bs.spectral, 'highFreqEnergyRatio');
    if (avgHighFreq > 0.85) {
      recommendedMinRegionSize = Math.round(recommendedMinRegionSize * 1.3);
      signalReasons.push(`HF élevé (${(avgHighFreq * 100).toFixed(0)}%) → minRegion ↑`);
    }

    // Kurtosis élevé → distribution à queue lourde → augmenter numColors
    const avgKurtosis = _avgStatMetric(bs.statistics, 'kurtosis');
    if (avgKurtosis > 3) {
      recommendedNumColors = Math.min(64, Math.round(recommendedNumColors * 1.15));
      signalReasons.push(`Kurtosis élevé (${avgKurtosis.toFixed(1)}) → numColors ↑`);
    }

    // Forte corrélation inter-canaux → image peu chromatique → réduire numColors
    const corrValues = Object.values(bs.correlation);
    const avgCorr = corrValues.length > 0
      ? corrValues.reduce((a, b) => a + b, 0) / corrValues.length
      : 0;
    if (avgCorr > 0.95) {
      recommendedNumColors = Math.max(8, Math.round(recommendedNumColors * 0.8));
      signalReasons.push(`Corrélation canaux élevée (${avgCorr.toFixed(3)}) → numColors ↓`);
    }
  }

  const reasons = {
    numColors: `Couvre ~95% des pixels avec ${coverageColors} couleurs dominantes, ajusté par l'entropie (${complexityScore}/100).${signalReasons.length > 0 ? ' ' + signalReasons.join(' ') : ''}`,
    minRegionSize: `Basé sur la densité d'arêtes ${(edgeDensity * 100).toFixed(1)}% et la résolution.${bs && _avgSpectralMetric(bs.spectral, 'highFreqEnergyRatio') > 0.85 ? ' Ajusté pour le bruit HF.' : ''}`,
    deltaE: `Ajusté pour la complexité ${complexityScore}/100 et la densité de contours.`,
    mode: `Recommandé car le profil détecté est "${mode}"${analysis.sourceType === "vector" ? " (source SVG/Vectorielle)" : ""}.`,
  };

  return {
    recommendedNumColors,
    recommendedMinRegionSize,
    recommendedDeltaE: Number(recommendedDeltaE.toFixed(2)),
    mode,
    reasons,
  };
}

function _avgSpectralMetric(
  spectral: Record<string, { totalEnergy: number; lowFreqEnergyRatio: number; highFreqEnergyRatio: number }>,
  key: 'lowFreqEnergyRatio' | 'highFreqEnergyRatio'
): number {
  const vals = Object.values(spectral);
  return vals.length > 0 ? vals.reduce((s, v) => s + v[key], 0) / vals.length : 0;
}

function _avgStatMetric(
  stats: Record<string, { kurtosis: number; skewness: number }>,
  key: 'kurtosis' | 'skewness'
): number {
  const vals = Object.values(stats);
  return vals.length > 0 ? vals.reduce((s, v) => s + (v as any)[key], 0) / vals.length : 0;
}


/**
 * Merge near-identical colors to avoid splitting visually identical regions
 * Uses ΔE2000 threshold to detect imperceptible differences
 */
export function mergeNearIdenticalColors(
  palette: string[],
  threshold: number = 5 // ΔE2000 < 5 = imperceptible
): string[] {
  const merged: string[] = [];
  const skip = new Set<number>();
  
  for (let i = 0; i < palette.length; i++) {
    if (skip.has(i)) continue;
    
    const rgb1 = hexToRgb(palette[i]);
    const lab1 = rgbToLab(rgb1[0], rgb1[1], rgb1[2]);
    
    // Find all identical colors
    for (let j = i + 1; j < palette.length; j++) {
      if (skip.has(j)) continue;
      
      const rgb2 = hexToRgb(palette[j]);
      const lab2 = rgbToLab(rgb2[0], rgb2[1], rgb2[2]);
      
      const distance = deltaE2000(lab1, lab2);
      if (distance < threshold) {
        skip.add(j); // Mark as duplicate
      }
    }
    
    merged.push(palette[i]);
  }
  
  return merged;
}

/**
 * Consolidate near-identical colors in a colorMap post-mapping
 * Merges colors with ΔE2000 < threshold and updates the colorMap indices
 * This fixes issues where K-means produces visually identical colors (e.g., multiple whites)
 */
export function consolidateColorMap(
  palette: string[],
  colorMap: number[],
  paletteLabCache: [number, number, number][],
  threshold: number
): { consolidatedPalette: string[]; consolidatedColorMap: number[] } {
  const n = palette.length;
  const parent = new Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;

  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (find(i) === find(j)) continue;
      const lab1 = paletteLabCache[i];
      const lab2 = paletteLabCache[j];
      if (!lab1 || !lab2) continue;
      const dist = deltaE2000(lab1, lab2);
      if (dist < threshold) {
        parent[find(j)] = find(i);
      }
    }
  }

  // Build remap
  const rootToNewIdx = new Map<number, number>();
  const consolidatedPalette: string[] = [];
  const remap = new Array(n);

  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!rootToNewIdx.has(root)) {
      rootToNewIdx.set(root, consolidatedPalette.length);
      consolidatedPalette.push(palette[root]);
    }
    remap[i] = rootToNewIdx.get(root)!;
  }

  const consolidatedColorMap = colorMap.map(idx => remap[idx] ?? idx);

  return { consolidatedPalette, consolidatedColorMap };
}

/**
 * Quantize image colors using K-means++ clustering
 */
export function quantizeColors(imageData: ImageData, numColors: number): string[] {
  const { data, width, height } = imageData;
  const totalPixels = width * height;

  // Sampling for large images (max 50000 samples)
  const maxSamples = Math.min(totalPixels, 50000);
  const step = Math.max(1, Math.floor(totalPixels / maxSamples));

  const samples: Array<[number, number, number]> = [];
  for (let i = 0; i < totalPixels; i += step) {
    const base = i * 4;
    samples.push([data[base], data[base + 1], data[base + 2]]);
  }

  // K-means++ initialization
  const centers: Array<[number, number, number]> = [];
  const rng = () => Math.random(); // Seed would be nice but not critical

  // First center: random sample
  centers.push(samples[Math.floor(rng() * samples.length)]);

  // Remaining centers: proportional to D²
  for (let c = 1; c < numColors; c++) {
    const distances = samples.map(s => {
      let minDist = Infinity;
      for (const center of centers) {
        const dr = s[0] - center[0];
        const dg = s[1] - center[1];
        const db = s[2] - center[2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    });

    const totalDist = distances.reduce((a, b) => a + b, 0);
    if (totalDist === 0) break;

    let r = rng() * totalDist;
    let chosen = 0;
    for (let i = 0; i < distances.length; i++) {
      r -= distances[i];
      if (r <= 0) {
        chosen = i;
        break;
      }
    }
    centers.push(samples[chosen]);
  }

  // K-means iterations
  const maxIterations = 20;
  for (let iter = 0; iter < maxIterations; iter++) {
    const sums: Array<[number, number, number]> = centers.map(() => [0, 0, 0]);
    const counts = new Array(centers.length).fill(0);

    for (const sample of samples) {
      let minDist = Infinity;
      let minIdx = 0;
      for (let c = 0; c < centers.length; c++) {
        const dr = sample[0] - centers[c][0];
        const dg = sample[1] - centers[c][1];
        const db = sample[2] - centers[c][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) {
          minDist = dist;
          minIdx = c;
        }
      }
      sums[minIdx][0] += sample[0];
      sums[minIdx][1] += sample[1];
      sums[minIdx][2] += sample[2];
      counts[minIdx]++;
    }

    let converged = true;
    for (let c = 0; c < centers.length; c++) {
      if (counts[c] === 0) continue;
      const newR = sums[c][0] / counts[c];
      const newG = sums[c][1] / counts[c];
      const newB = sums[c][2] / counts[c];
      if (
        Math.abs(newR - centers[c][0]) > 1 ||
        Math.abs(newG - centers[c][1]) > 1 ||
        Math.abs(newB - centers[c][2]) > 1
      ) {
        converged = false;
      }
      centers[c] = [newR, newG, newB];
    }

    if (converged) break;
  }

  // Convert to hex
  return centers
    .filter((_, i) => {
      // Remove empty clusters
      return true; // Keep all since we already handled empty clusters
    })
    .map(([r, g, b]) => rgbToHex(Math.round(r), Math.round(g), Math.round(b)));
}

/**
 * Label connected components using flood fill
 * Returns zone labels and zone metadata
 */
export function labelConnectedComponents(
  colorMap: number[],
  width: number,
  height: number
): { labels: Int32Array; zones: Zone[] } {
  const totalPixels = width * height;
  const labels = new Int32Array(totalPixels).fill(-1);
  let nextLabel = 0;
  const zones: Zone[] = [];

  for (let i = 0; i < totalPixels; i++) {
    if (labels[i] !== -1) continue;

    const colorIdx = colorMap[i];
    const pixels: number[] = [];
    const queue: number[] = [i];
    labels[i] = nextLabel;

    while (queue.length > 0) {
      const px = queue.pop()!;
      pixels.push(px);
      const x = px % width;
      const y = Math.floor(px / width);

      // 4-connected neighbors
      const neighbors = [];
      if (x > 0) neighbors.push(px - 1);
      if (x < width - 1) neighbors.push(px + 1);
      if (y > 0) neighbors.push(px - width);
      if (y < height - 1) neighbors.push(px + width);

      for (const n of neighbors) {
        if (labels[n] === -1 && colorMap[n] === colorIdx) {
          labels[n] = nextLabel;
          queue.push(n);
        }
      }
    }

    // Calculate centroid
    let sumX = 0, sumY = 0;
    for (const px of pixels) {
      sumX += px % width;
      sumY += Math.floor(px / width);
    }

    zones.push({
      id: nextLabel,
      colorIdx,
      area: pixels.length,
      pixels: new Uint32Array(pixels),
      centroid: {
        x: Math.round(sumX / pixels.length),
        y: Math.round(sumY / pixels.length),
      },
    });

    nextLabel++;
  }

  return { labels, zones };
}

/**
 * Rebuild zone metadata from a modified label map
 * Uses reference zones to preserve color assignments
 */
export function buildZonesFromLabels(
  labels: Int32Array,
  palette: string[],
  width: number,
  height: number,
  referenceZones: Zone[]
): Zone[] {
  const zonePixels = new Map<number, number[]>();
  const zoneColorIdx = new Map<number, number>();

  // Build reference map
  const refMap = new Map<number, Zone>();
  for (const z of referenceZones) {
    refMap.set(z.id, z);
  }

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (label === -1) continue;
    if (!zonePixels.has(label)) {
      zonePixels.set(label, []);
      // Use reference zone's color if available
      const ref = refMap.get(label);
      zoneColorIdx.set(label, ref?.colorIdx ?? 0);
    }
    zonePixels.get(label)!.push(i);
  }

  const zones: Zone[] = [];
  for (const [id, pixels] of zonePixels) {
    let sumX = 0, sumY = 0;
    for (const px of pixels) {
      sumX += px % width;
      sumY += Math.floor(px / width);
    }
    const pixelsArray = new Uint32Array(pixels);
    const centroid = {
      x: Math.round(sumX / pixels.length),
      y: Math.round(sumY / pixels.length),
    };

    zones.push({
      id,
      colorIdx: zoneColorIdx.get(id) ?? 0,
      area: pixels.length,
      pixels: pixelsArray,
      centroid,
    });
  }

  return zones;
}

export function mergeSimilarAdjacentZones(
  zones: Zone[],
  labels: Int32Array,
  palette: string[],
  width: number,
  height: number,
  tolerance: number
): { labels: Int32Array; zones: Zone[] } {
  if (zones.length === 0 || tolerance <= 0) {
    return { labels, zones };
  }

  const zoneMap = new Map<number, Zone>();
  for (const zone of zones) {
    zoneMap.set(zone.id, zone);
  }

  const paletteLab = palette.map(hex => {
    const [r, g, b] = hexToRgb(hex);
    return rgbToLab(r, g, b);
  });

  const parent = new Map<number, number>();
  for (const zone of zones) {
    parent.set(zone.id, zone.id);
  }

  const find = (id: number): number => {
    let root = parent.get(id) ?? id;
    while (parent.get(root) !== root) {
      const next = parent.get(root);
      if (next === undefined) break;
      root = next;
    }

    // Path compression
    let current = id;
    while (current !== root) {
      const next = parent.get(current);
      if (next === undefined) break;
      parent.set(current, root);
      current = next;
    }

    return root;
  };

  const union = (a: number, b: number): boolean => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) return false;
    parent.set(rootB, rootA);
    return true;
  };

  const processedPairs = new Set<string>();
  let hasMerged = false;

  const recordPair = (a: number, b: number) => {
    const [minId, maxId] = a < b ? [a, b] : [b, a];
    return `${minId}-${maxId}`;
  };

  const toleranceLimit = Math.max(tolerance, 0.5);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const label = labels[idx];
      if (label === -1) continue;

      const zoneA = zoneMap.get(label);
      if (!zoneA) continue;

      const neighbors: number[] = [];
      if (x + 1 < width) neighbors.push(labels[idx + 1]);
      if (y + 1 < height) neighbors.push(labels[idx + width]);

      for (const neighborLabel of neighbors) {
        if (neighborLabel === -1 || neighborLabel === label) continue;

        const pairKey = recordPair(label, neighborLabel);
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const zoneB = zoneMap.get(neighborLabel);
        if (!zoneB) continue;

        const labA = paletteLab[zoneA.colorIdx];
        const labB = paletteLab[zoneB.colorIdx];
        if (!labA || !labB) continue;

        const distance = deltaE2000(labA, labB);
        if (distance <= toleranceLimit) {
          if (union(zoneA.id, zoneB.id)) {
            hasMerged = true;
          }
        }
      }
    }
  }

  if (!hasMerged) {
    return { labels, zones };
  }

  const remappedLabels = new Int32Array(labels.length);
  remappedLabels.fill(-1);

  const rootToNewId = new Map<number, number>();
  const rootToRepresentative = new Map<number, Zone>();
  let nextId = 0;

  for (const zone of zones) {
    const root = find(zone.id);
    if (!rootToNewId.has(root)) {
      rootToNewId.set(root, nextId++);
      rootToRepresentative.set(root, zone);
    } else {
      const current = rootToRepresentative.get(root)!;
      if (zone.area > current.area) {
        rootToRepresentative.set(root, zone);
      }
    }
  }

  const zoneIdToNewId = new Map<number, number>();
  for (const zone of zones) {
    const root = find(zone.id);
    const newId = rootToNewId.get(root);
    if (newId !== undefined) {
      zoneIdToNewId.set(zone.id, newId);
    }
  }

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (label === -1) {
      remappedLabels[i] = -1;
      continue;
    }
    const newId = zoneIdToNewId.get(label);
    remappedLabels[i] = newId ?? -1;
  }

  const referenceZones: Zone[] = [];
  for (const [root, zone] of rootToRepresentative.entries()) {
    const newId = rootToNewId.get(root);
    if (newId === undefined) continue;
    referenceZones.push({
      ...zone,
      id: newId,
    });
  }

  const rebuiltZones = buildZonesFromLabels(
    remappedLabels,
    palette,
    width,
    height,
    referenceZones
  );

  return {
    labels: remappedLabels,
    zones: rebuiltZones,
  };
}

/**
 * Merge small zones with their nearest neighbor by color distance and compactness
 * Optimized with zone maps for faster lookups
 */
export function mergeSmallZones(
  zones: Zone[],
  labels: Int32Array,
  palette: string[],
  width: number,
  height: number,
  minRegionSize: number
): { mergedLabels: Int32Array; mergedZones: Zone[] } {
  const mergedLabels = new Int32Array(labels);
  const minAreaThreshold = Math.max(minRegionSize, 20);

  const zoneMap = new Map<number, Zone>();
  for (const z of zones) zoneMap.set(z.id, z);

  // Cache ΔE entre couleurs
  const colorCache = new Map<string, number>();
  const getColorDistance = (idxA: number, idxB: number) => {
    const key = `${idxA}-${idxB}`;
    if (colorCache.has(key)) return colorCache.get(key)!;
    const [r1, g1, b1] = hexToRgb(palette[idxA]);
    const [r2, g2, b2] = hexToRgb(palette[idxB]);
    const d = Math.sqrt(
      (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
    );
    colorCache.set(key, d);
    return d;
  };

  // 🔹 Construire une carte de voisinage persistante
  const neighborsByZone = new Map<number, Set<number>>();
  for (const zone of zones) {
    const set = new Set<number>();
    for (const p of zone.pixels) {
      const x = p % width;
      const y = Math.floor(p / width);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const neighborId = mergedLabels[ny * width + nx];
        if (neighborId !== zone.id && neighborId !== -1) set.add(neighborId);
      }
    }
    neighborsByZone.set(zone.id, set);
  }

  // 🔹 Pré-calcul de la compacité de chaque zone
  const compactnessCache = new Map<number, number>();
  const calcCompactness = (zone: Zone): number => {
    if (compactnessCache.has(zone.id)) return compactnessCache.get(zone.id)!;
    const pixelSet = new Set(zone.pixels);
    let perim = 0;
    for (const idx of zone.pixels) {
      const x = idx % width, y = Math.floor(idx / width);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || !pixelSet.has(ny * width + nx)) {
          perim++;
        }
      }
    }
    const compact = zone.area > 0 ? (perim * perim) / zone.area : Infinity;
    compactnessCache.set(zone.id, compact);
    return compact;
  };

  // 🔹 Fusion par batch
  const smallZones = zones.filter(z => z.area < minAreaThreshold);
  const merges: Array<{ donor: number; recipient: number }> = [];

  for (const z of smallZones) {
    const neighbors = neighborsByZone.get(z.id);
    if (!neighbors || neighbors.size === 0) continue;

    let bestId = -1, bestScore = Infinity;
    const zColor = z.colorIdx;
    const zCompact = calcCompactness(z);

    for (const nId of neighbors) {
      const nZone = zoneMap.get(nId);
      if (!nZone) continue;
      const colorDist = getColorDistance(zColor, nZone.colorIdx);
      const nCompact = calcCompactness(nZone);
      const score = colorDist * 0.8 + nCompact * 0.2;
      if (score < bestScore) {
        bestScore = score;
        bestId = nId;
      }
    }

    if (bestId !== -1) merges.push({ donor: z.id, recipient: bestId });
  }

  // 🔹 Appliquer les fusions
  for (const { donor, recipient } of merges) {
    const donorZone = zoneMap.get(donor);
    const recZone = zoneMap.get(recipient);
    if (!donorZone || !recZone) continue;

    for (const p of donorZone.pixels) mergedLabels[p] = recipient;

    // Fusionner les pixels
    const newPixels = new Uint32Array(recZone.pixels.length + donorZone.pixels.length);
    newPixels.set(recZone.pixels);
    newPixels.set(donorZone.pixels, recZone.pixels.length);
    recZone.pixels = newPixels;
    recZone.area = newPixels.length;

    // Mise à jour des voisins
    const mergedNeighbors = new Set([
      ...(neighborsByZone.get(recipient) ?? []),
      ...(neighborsByZone.get(donor) ?? []),
    ]);
    mergedNeighbors.delete(donor);
    mergedNeighbors.delete(recipient);
    neighborsByZone.set(recipient, mergedNeighbors);
    neighborsByZone.delete(donor);
  }

  const mergedZones = buildZonesFromLabels(mergedLabels, palette, width, height, zones);
  return { mergedLabels, mergedZones };
}

// ============= MORPHOLOGICAL SMOOTHING =============

/**
 * Apply morphological operations for edge smoothing with adaptive range
 * Uses adaptive neighborhood size based on image dimensions for better performance
 */
export function smoothZones(
  labels: Int32Array,
  width: number,
  height: number,
  iterations: number
): Int32Array {
  let current = new Int32Array(labels);
  
  // Adaptive range based on image size (smaller images = smaller range)
  const imageSize = width * height;
  const range = imageSize < 250000 ? 2 : (imageSize < 500000 ? 3 : 4);
  
  for (let iter = 0; iter < iterations; iter++) {
    const next = new Int32Array(current);
    
    for (let y = range; y < height - range; y++) {
      for (let x = range; x < width - range; x++) {
        const idx = y * width + x;
        
        // Count neighbor labels in adaptive vicinity
        const counts = new Map<number, number>();
        let maxCount = 0;
        
        for (let yy = y - range; yy <= y + range; yy++) {
          for (let xx = x - range; xx <= x + range; xx++) {
            const nidx = yy * width + xx;
            const label = current[nidx];
            const count = (counts.get(label) || 0) + 1;
            counts.set(label, count);
            
            if (count > maxCount) {
              maxCount = count;
            }
          }
        }
        
        // Find first label with max count (majority vote)
        let majorityLabel = current[idx];
        for (const [label, count] of counts) {
          if (count === maxCount) {
            majorityLabel = label;
            break;
          }
        }
        
        next[idx] = majorityLabel;
      }
    }
    
    current = next;
  }
  
  return current;
}

// ============= CONTOUR SIMPLIFICATION =============

/**
 * Calculate polygon area using shoelace formula
 */
function calculatePolygonArea(path: Array<{ x: number; y: number }>): number {
  if (path.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < path.length; i++) {
    const j = (i + 1) % path.length;
    area += path[i].x * path[j].y;
    area -= path[j].x * path[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Adaptive path simplification based on polygon area
 * Small polygons get lower tolerance (more detail preserved)
 * Large polygons get higher tolerance (more simplification)
 */
function simplifyPath(
  path: Array<{ x: number; y: number }>,
  baseTolerance?: number
): Array<{ x: number; y: number }> {
  if (path.length <= 2) return path;
  
  // Calculate area to determine adaptive tolerance
  const area = calculatePolygonArea(path);
  
  // Adaptive tolerance: smaller zones get more precision
  // Formula: min(2.0, max(0.2, sqrt(area) * 0.015))
  const adaptiveTolerance = baseTolerance !== undefined 
    ? baseTolerance 
    : Math.min(2.0, Math.max(0.2, Math.sqrt(area) * 0.015));
  
  // Use simplify-js with high quality mode for better results
  const simplified = simplify(path, adaptiveTolerance, true);
  
  // Ensure we have at least 3 points for a valid polygon
  return simplified.length >= 3 ? simplified : path;
}

// ============= POLYGON MERGING =============

/**
 * Merge adjacent polygons of the same color using martinez-polygon-clipping
 * This reduces the number of polygons and simplifies the output
 */
export function mergeAdjacentPolygons(
  contours: Contour[],
  zones: Zone[]
): Contour[] {
  // Hard limits to avoid blowing the stack when polygons are too complex
  const MAX_GROUP_CONTOURS = 80;
  const MAX_TOTAL_POINTS = 8000;
  const MAX_CONTOUR_POINTS = 4000;

  // Group contours by color
  const colorGroups = new Map<number, Contour[]>();

  for (const contour of contours) {
    const zone = zones.find(z => z.id === contour.zoneId);
    if (!zone) continue;
    
    const colorIdx = zone.colorIdx;
    if (!colorGroups.has(colorIdx)) {
      colorGroups.set(colorIdx, []);
    }
    colorGroups.get(colorIdx)!.push(contour);
  }
  
  const mergedContours: Contour[] = [];
  
  // Merge polygons within each color group
  for (const [colorIdx, groupContours] of colorGroups) {
    if (groupContours.length === 0) continue;
    
    // Skip merging if only one contour or too many contours (performance)
    if (groupContours.length === 1) {
      mergedContours.push(...groupContours);
      continue;
    }

    const totalPoints = groupContours.reduce((sum, contour) => sum + contour.path.length, 0);
    const maxPoints = groupContours.reduce((max, contour) => Math.max(max, contour.path.length), 0);

    if (
      groupContours.length > MAX_GROUP_CONTOURS ||
      totalPoints > MAX_TOTAL_POINTS ||
      maxPoints > MAX_CONTOUR_POINTS
    ) {
      // Polygons are too complex, keep original contours to avoid recursion explosions
      mergedContours.push(...groupContours);
      continue;
    }

    try {
      // Convert contours to martinez polygon format (MultiPolygon)
      let mergedPolygon: Array<Array<Array<[number, number]>>> | null = null;
      let mergeFailed = false;

      for (const contour of groupContours) {
        const ring: Array<[number, number]> = contour.path.map(p => [p.x, p.y]);

        // Close the ring if not already closed
        if (ring.length > 0) {
          const [fx, fy] = ring[0];
          const [lx, ly] = ring[ring.length - 1];
          if (fx !== lx || fy !== ly) {
            ring.push([fx, fy]);
          }
        }
        
        if (ring.length < 4) continue; // Need at least 3 points + closing point
        
        const polygon: Array<Array<[number, number]>> = [ring];

        if (mergedPolygon === null) {
          mergedPolygon = [polygon];
        } else {
          try {
            const result = union(mergedPolygon, [polygon]);
            if (result && result.length > 0) {
              mergedPolygon = result;
            } else {
              mergeFailed = true;
              break;
            }
          } catch (_error) {
            mergeFailed = true;
            console.warn(`Polygon merge skipped for color ${colorIdx} (geometry too complex)`);
            break;
          }
        }
      }

      if (mergeFailed) {
        mergedContours.push(...groupContours);
        continue;
      }

      // Convert merged polygon back to contours (keep outer rings only)
      if (mergedPolygon && mergedPolygon.length > 0) {
        for (const polygon of mergedPolygon) {
          if (polygon.length === 0) continue;

          const outerRing = polygon[0];
          if (outerRing.length < 4) continue;

          const path = outerRing.slice(0, -1).map(([x, y]) => ({ x, y })); // Remove closing point
          const simplifiedPath = simplifyPath(path); // Adaptive simplification

          if (simplifiedPath.length >= 3) {
            const zoneId = groupContours[0].zoneId;
            mergedContours.push({ zoneId, path: simplifiedPath });
          }
        }
      } else {
        // Fallback: keep original contours if merge failed
        mergedContours.push(...groupContours);
      }
    } catch (_error) {
      console.warn(`Polygon merge skipped for color ${colorIdx} (unexpected failure)`);
      // Fallback: keep original contours
      mergedContours.push(...groupContours);
    }
  }

  return mergedContours;
}

// ============= LABEL POSITIONING =============

function ringArea(ring: Array<[number, number]>): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += (x1 * y2) - (x2 * y1);
  }
  return area / 2;
}

function ensureRingOrientation(ring: Array<[number, number]>, counterClockwise: boolean): Array<[number, number]> {
  if (ring.length === 0) return ring;
  const area = ringArea(ring);
  const isCounterClockwise = area > 0;
  if ((counterClockwise && isCounterClockwise) || (!counterClockwise && !isCounterClockwise)) {
    return ring;
  }
  return [...ring].reverse();
}

function toClosedRing(path: Array<{ x: number; y: number }>): Array<[number, number]> {
  const ring: Array<[number, number]> = path.map(point => [point.x, point.y]);
  if (ring.length === 0) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  if (fx !== lx || fy !== ly) {
    ring.push([fx, fy]);
  }
  return ring;
}

export function refineZoneLabelPositions(
  zones: Zone[],
  contours: Contour[],
  width: number,
  height: number
): Zone[] {
  const contourMap = new Map<number, Contour[]>();

  for (const contour of contours) {
    if (!contourMap.has(contour.zoneId)) {
      contourMap.set(contour.zoneId, []);
    }
    contourMap.get(contour.zoneId)!.push(contour);
  }

  return zones.map(zone => {
    const zoneContours = contourMap.get(zone.id);
    if (!zoneContours || zoneContours.length === 0) {
      return zone;
    }

    const rings = zoneContours
      .map(contour => toClosedRing(contour.path))
      .filter(ring => ring.length >= 4);

    if (rings.length === 0) {
      return zone;
    }

    const sortedRings = rings
      .map(ring => ({ ring, area: Math.abs(ringArea(ring)) }))
      .sort((a, b) => b.area - a.area);

    if (sortedRings.length === 0 || sortedRings[0].area === 0) {
      return zone;
    }

    const outerRing = ensureRingOrientation(sortedRings[0].ring, true);
    const holeRings = sortedRings.slice(1).map(entry => ensureRingOrientation(entry.ring, false));

    try {
      const [px, py] = polylabel([outerRing, ...holeRings], 1.0);
      const clampedX = Math.min(width - 1, Math.max(0, px));
      const clampedY = Math.min(height - 1, Math.max(0, py));
      return {
        ...zone,
        centroid: {
          x: Math.round(clampedX),
          y: Math.round(clampedY)
        }
      };
    } catch (error) {
      console.warn(`polylabel failed for zone ${zone.id}:`, error);
      return zone;
    }
  });
}

/**
 * Find pole of inaccessibility (visual center) for better label placement
 * Better than centroid for irregular shapes
 */
function findPoleOfInaccessibility(
  pixels: Uint32Array,
  width: number,
  height: number
): { x: number; y: number } {
  if (pixels.length === 0) return { x: 0, y: 0 };

  // Build mask for this zone
  const mask = new Set(pixels);
  
  // Get bounding box
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (const pixelIdx of pixels) {
    const x = pixelIdx % width;
    const y = Math.floor(pixelIdx / width);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  // Grid search for point with maximum distance to edge
  let bestX = minX, bestY = minY;
  let maxMinDist = 0;

  const step = Math.max(1, Math.floor((maxX - minX) / 20));
  
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const idx = y * width + x;
      if (!mask.has(idx)) continue;

      // Find minimum distance to edge
      let minDist = Infinity;
      const searchRadius = Math.min(20, Math.max(maxX - minX, maxY - minY));
      
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          
          const nidx = ny * width + nx;
          if (!mask.has(nidx)) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            minDist = Math.min(minDist, dist);
          }
        }
      }

      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        bestX = x;
        bestY = y;
      }
    }
  }

  return { x: bestX, y: bestY };
}

// ============= CONTOUR TRACING =============

/**
 * Trace contours using Marching Squares polygonization
 */
export function traceContours(
  width: number,
  height: number,
  zones: Zone[]
): Contour[] {
  const contours: Contour[] = [];

  for (const zone of zones) {
    if (zone.pixels.length === 0) continue;

    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    for (const pixelIdx of zone.pixels) {
      const x = pixelIdx % width;
      const y = Math.floor(pixelIdx / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const localWidth = (maxX - minX + 1) + 2; // margin of 1 on each side
    const localHeight = (maxY - minY + 1) + 2;
    const grid: number[][] = Array.from({ length: localHeight }, () => new Array(localWidth).fill(0));

    for (const pixelIdx of zone.pixels) {
      const x = pixelIdx % width;
      const y = Math.floor(pixelIdx / width);
      const gx = (x - minX) + 1;
      const gy = (y - minY) + 1;
      if (gy >= 0 && gy < localHeight && gx >= 0 && gx < localWidth) {
        grid[gy][gx] = 1;
      }
    }

    let rawContours: number[][][] = [];
    try {
      const result = isoContours(grid, 0.5, { noFrame: true, linearRing: true });
      if (Array.isArray(result) && Array.isArray(result[0]) && Array.isArray(result[0][0])) {
        rawContours = result as number[][][];
      }
    } catch (error) {
      console.warn(`Marching Squares failed for zone ${zone.id}:`, error);
      continue;
    }

    for (const contour of rawContours) {
      if (!contour || contour.length < 3) continue;

      const path = contour.map(point => {
        const x = Math.min(width, Math.max(0, point[0] + minX - 1));
        const y = Math.min(height, Math.max(0, point[1] + minY - 1));
        return { x, y };
      });

      // Filter out micro-contours (parasitic noise)
      const area = calculatePolygonArea(path);
      if (area < 10) continue;

      const simplifiedPath = simplifyPath(path); // Adaptive simplification based on area
      if (simplifiedPath.length >= 3) {
        contours.push({ zoneId: zone.id, path: simplifiedPath });
      }
    }
  }

  return contours;
}

// ============= SVG GENERATION =============

/**
 * Generate fallback SVG for images that are too complex
 */
function generateFallbackSVG(
  width: number,
  height: number,
  contourCount: number
): string {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
  svg += `  <g id="zones">\n`;
  svg += `    <rect width="${width}" height="${height}" fill="#f0f0f0" />\n`;
  svg += `    <text x="${width/2}" y="${height/2}" text-anchor="middle" font-size="20">Image trop complexe (${contourCount} zones)</text>\n`;
  svg += `  </g>\n`;
  svg += `</svg>`;
  return svg;
}

/**
 * Generate SVG from contours
 */
export function generateSVG(
  contours: Contour[],
  zones: Zone[],
  palette: string[],
  width: number,
  height: number
): string {
  // Dynamic SVG limit based on average contour complexity
  const avgContourComplexity = contours.length > 0 
    ? contours.reduce((sum, c) => sum + c.path.length, 0) / contours.length 
    : 10;
  const MAX_CONTOURS_FOR_SVG = Math.floor(Math.min(2000, 50000 / Math.max(1, avgContourComplexity)));
  
  if (contours.length > MAX_CONTOURS_FOR_SVG) {
    console.warn(`Too many contours (${contours.length}, avg complexity: ${avgContourComplexity.toFixed(1)}). Generating simplified SVG.`);
    return generateFallbackSVG(width, height, contours.length);
  }
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
  svg += `  <g id="zones">\n`;
  
  for (const contour of contours) {
    const zone = zones.find(z => z.id === contour.zoneId);
    if (!zone || contour.path.length < 3) continue;
    
    const color = palette[zone.colorIdx];
    const pathData = contour.path.map((p, i) => 
      `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`
    ).join(' ') + ' Z';
    
    svg += `    <path d="${pathData}" fill="${color}" stroke="#000" stroke-width="0.5" data-id="${zone.id}" data-hex="${color}" />\n`;
  }
  
  svg += `  </g>\n`;
  svg += `</svg>`;
  
  return svg;
}

// ============= NUMBERED VERSION =============

/**
 * Calculate "goodness score" for label position (from pbnify algorithm)
 * Finds the most centered position within a zone by checking continuity in 4 directions
 */
function findBestLabelPosition(
  zone: Zone,
  labels: Int32Array,
  width: number,
  height: number
): { x: number; y: number } {
  // Skip expensive calculation for very large zones
  const MAX_ZONE_SIZE_FOR_OPTIMIZATION = 100000;
  if (zone.pixels.length > MAX_ZONE_SIZE_FOR_OPTIMIZATION) {
    // Fallback to centroid for huge zones
    return zone.centroid;
  }
  
  let bestIdx = 0;
  let bestScore = 0;
  const MAX_STEPS = 1000; // Limit steps in each direction
  
  // Sample pixels if zone is large (check every 10th pixel)
  const sampleRate = zone.pixels.length > 10000 ? 10 : 1;
  
  for (let i = 0; i < zone.pixels.length; i += sampleRate) {
    const pixelIdx = zone.pixels[i];
    const x = pixelIdx % width;
    const y = Math.floor(pixelIdx / width);
    
    // Count continuous pixels in 4 directions
    const directions = [
      [-1, 0], [1, 0],  // left, right
      [0, -1], [0, 1]   // up, down
    ];
    
    const counts = directions.map(([dx, dy]) => {
      let count = 0;
      let cx = x + dx;
      let cy = y + dy;
      let steps = 0;
      
      // Strict limit on steps per direction
      while (cx >= 0 && cx < width && cy >= 0 && cy < height && steps < MAX_STEPS) {
        const cidx = cy * width + cx;
        if (labels[cidx] !== zone.id) break;
        count++;
        cx += dx;
        cy += dy;
        steps++;
      }
      
      return count;
    });
    
    // Goodness = product of continuity in all 4 directions
    const score = counts[0] * counts[1] * counts[2] * counts[3];
    
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  
  const bestPixelIdx = zone.pixels[bestIdx];
  return {
    x: bestPixelIdx % width,
    y: Math.floor(bestPixelIdx / width)
  };
}

/**
 * Create numbered version with optimal label positioning (enhanced with pbnify algorithm)
 *
 * La base visuelle est l'image de référence (même source de vérité que l'aperçu
 * colorisé) afin que tous les onglets partagent exactement le même cadrage et le
 * même rendu. Un voile blanc léger est appliqué pour garder les numéros lisibles.
 */
export function createNumberedVersion(
  imageData: ImageData,
  zones: Zone[],
  palette: string[],
  labels: Int32Array,
  contoursData: ImageData
): ImageData {
  const width = imageData.width;
  const height = imageData.height;

  const { ctx } = canvasFactory.createCanvas(width, height);

  // Base = image de référence (source de vérité commune à tous les onglets)
  ctx.putImageData(imageData, 0, 0);

  // Voile blanc pour la lisibilité des numéros
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fillRect(0, 0, width, height);

  if (contoursData.width !== width || contoursData.height !== height) {
    throw new Error('Contours invalides pour la version numérotée.');
  }
  const edgesData = contoursData;
  ctx.fillStyle = '#000000';
  for (let i = 0; i < edgesData.data.length; i += 4) {
    if (edgesData.data[i] === 0) { // Black pixel = edge
      const pixelIdx = i / 4;
      const x = pixelIdx % width;
      const y = Math.floor(pixelIdx / width);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  drawZoneNumbers(ctx, zones, labels, width, height);

  return ctx.getImageData(0, 0, width, height);
}

/**
 * Dessine les numéros de zones (pastille blanche + chiffre noir) sur un contexte donné.
 */
function drawZoneNumbers(
  ctx: Canvas2DContext,
  zones: Zone[],
  labels: Int32Array,
  width: number,
  height: number
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const zone of zones) {
    if (zone.area < 100) continue; // Skip tiny zones

    // Use palette index as number (matching ColorPalette component)
    const number = zone.colorIdx + 1;

    // Calculate font size based on zone area
    const fontSize = Math.max(10, Math.min(48, Math.sqrt(zone.area) / 3));
    ctx.font = `bold ${fontSize}px Arial`;

    // Use optimal position
    const position = findBestLabelPosition(zone, labels, width, height);

    // Semi-transparent white background for better visibility on all colors
    const padding = fontSize * 0.4;
    const textMetrics = ctx.measureText(number.toString());
    const bgWidth = textMetrics.width + padding * 2;
    const bgHeight = fontSize + padding;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(
      position.x - bgWidth / 2,
      position.y - bgHeight / 2,
      bgWidth,
      bgHeight
    );

    // Black number
    ctx.fillStyle = '#000000';
    ctx.fillText(number.toString(), position.x, position.y);
  }
}

/**
 * Calque transparent contenant uniquement les numéros (utilisé pour la fusion d'aperçu).
 */
export function createNumbersOverlay(
  zones: Zone[],
  labels: Int32Array,
  width: number,
  height: number
): ImageData {
  const { ctx } = canvasFactory.createCanvas(width, height);
  ctx.clearRect(0, 0, width, height);
  drawZoneNumbers(ctx, zones, labels, width, height);
  return ctx.getImageData(0, 0, width, height);
}

// ============= PREVIEW FUSION =============

/**
 * Create preview fusion: image + contours + numbers layered together
 */
export function createPreviewFusion(
  quantizedData: ImageData,
  contoursData: ImageData,
  numbersOverlay: ImageData,
  width: number,
  height: number
): ImageData {
  const previewData = new ImageData(width, height);
  
  // Start with quantized image as base
  for (let i = 0; i < quantizedData.data.length; i++) {
    previewData.data[i] = quantizedData.data[i];
  }
  
  // Overlay contours (black lines)
  for (let i = 0; i < contoursData.data.length; i += 4) {
    const contourR = contoursData.data[i];
    // If contour pixel is black (edge), draw it
    if (contourR === 0) {
      previewData.data[i] = 0;     // R
      previewData.data[i + 1] = 0; // G
      previewData.data[i + 2] = 0; // B
      previewData.data[i + 3] = 255; // A
    }
  }
  
  // Composite du calque de numéros (alpha blending)
  for (let i = 0; i < numbersOverlay.data.length; i += 4) {
    const alpha = numbersOverlay.data[i + 3] / 255;
    if (alpha <= 0) continue;
    for (let c = 0; c < 3; c++) {
      previewData.data[i + c] =
        numbersOverlay.data[i + c] * alpha + previewData.data[i + c] * (1 - alpha);
    }
    previewData.data[i + 3] = 255;
  }
  
  return previewData;

}

// ============= LEGEND GENERATION =============

/**
 * Generate legend with zone info
 */
export function generateLegend(zones: Zone[], palette: string[], totalPixels: number): LegendEntry[] {
  const colorCounts = new Map<number, number>();
  
  for (const zone of zones) {
    const current = colorCounts.get(zone.colorIdx) || 0;
    colorCounts.set(zone.colorIdx, current + zone.area);
  }
  
  return Array.from(colorCounts.entries())
    .map(([colorIdx, area]) => ({
      id: colorIdx + 1,
      hex: palette[colorIdx],
      percent: Math.round((area / totalPixels) * 100)
    }))
    .sort((a, b) => b.percent - a.percent);
}

// === Conversion en niveaux de gris pour les gradients ===
export function generateGrayscaleMap(imageData: ImageData): Uint8Array {
  if (
    !imageData ||
    typeof imageData.width !== "number" ||
    typeof imageData.height !== "number" ||
    !imageData.data
  ) {
    throw new Error("ImageData invalide pour la génération de niveaux de gris.");
  }

  const { width, height, data } = imageData;
  if (data.length !== width * height * 4) {
    throw new Error("ImageData incohérente pour la génération de niveaux de gris.");
  }
  const grayscaleMap = new Uint8Array(width * height);

  // Conversion rapide RGB → niveaux de gris perceptuels (Rec. 709)
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Pondération standard : luminosité perceptuelle
    grayscaleMap[j] = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0;
  }

  return grayscaleMap;
}


// ============= EDGE DETECTION =============

export function detectEdges(
  labels: Int32Array,
  grayscaleMap: Uint8Array,
  width: number,
  height: number
): ImageData {
  if (!labels || !grayscaleMap) {
    throw new Error("detectEdges: labels ou grayscaleMap manquant.");
  }

  const expectedSize = width * height;
  if (width <= 0 || height <= 0) {
    throw new Error("detectEdges: dimensions invalides.");
  }
  if (labels.length !== expectedSize || grayscaleMap.length !== expectedSize) {
    throw new Error(
      `detectEdges: taille incohérente (labels=${labels.length}, grayscale=${grayscaleMap.length}, attendu=${expectedSize}).`
    );
  }

  const result = new ImageData(width, height);

  // === 1️⃣ Fond blanc par défaut ===
  // Micro-optimisation : fill() est bien plus rapide qu'une boucle for en JS.
  result.data.fill(255);

  // --- Déclaration des kernels et constantes ---
  const sobelXKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelYKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  const prewittXKernel = [-1, 0, 1, -1, 0, 1, -1, 0, 1];
  const prewittYKernel = [-1, -1, -1, 0, 0, 0, 1, 1, 1];
  const gaussianKernel = [1/16, 2/16, 1/16, 2/16, 4/16, 2/16, 1/16, 2/16, 1/16];

  // Constantes pour le seuillage dynamique Canny
  const HIGH_THRESHOLD_FACTOR = 1.0; // mean + std * factor
  const LOW_THRESHOLD_RATIO = 0.5;   // mean * ratio

  // Buffers intermédiaires pour le pipeline
  const gradientMap = new Float32Array(width * height);
  const angleMap = new Float32Array(width * height);
  // edgeMap: 0 = non-bord, 1 = bord ΔE, 2 = bord Canny confirmé
  const edgeMap = new Uint8Array(width * height);

  // === 🟩 ZONE A – Préparation & Calculs Unifiés ===
  // Boucle unique pour la détection ΔE et le calcul de gradient (Sobel + Prewitt).
  // On itère de 1 à height-1/width-1 car les kernels 3x3 nécessitent un voisinage complet.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const label = labels[idx];
      if (label === -1) continue;

      // --- Détection ΔE (transitions entre zones) ---
      const n1 = labels[idx - 1], n2 = labels[idx + 1];
      const n3 = labels[idx - width], n4 = labels[idx + width];
      if ((n1 !== label && n1 !== -1) || (n2 !== label && n2 !== -1) ||
          (n3 !== label && n3 !== -1) || (n4 !== label && n4 !== -1)) {
        edgeMap[idx] = 1; // Marquer comme bord ΔE
      }

      // --- Gradient local (Sobel + Prewitt combiné) ---
      let gxS = 0, gyS = 0, gxP = 0, gyP = 0;
      let k = 0; // Optimisation : un seul compteur pour le kernel

      for (let ky = -1; ky <= 1; ky++) {
        const iy = (y + ky) * width;
        for (let kx = -1; kx <= 1; kx++, k++) {
          const val = grayscaleMap[iy + (x + kx)];
          gxS += val * sobelXKernel[k];
          gyS += val * sobelYKernel[k];
          gxP += val * prewittXKernel[k];
          gyP += val * prewittYKernel[k];
        }
      }

      // --- Combinaison robuste des gradients ---
      const gx = (gxS + gxP) * 0.5;
      const gy = (gyS + gyP) * 0.5;
      gradientMap[idx] = Math.hypot(gx, gy); // Équivalent à sqrt(gx*gx + gy*gy)
      angleMap[idx] = Math.atan2(gy, gx);
    }
  }

  // Optionnel: Traitement des bords de l'image pour un rendu "plein cadre"
  // for (let y = 0; y < height; y++) {
  //   for (let x = 0; x < width; x++) {
  //     if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
  //       const idx = y * width + x;
  //       if (labels[idx] !== -1) edgeMap[idx] = edgeMap[idx] || 1;
  //     }
  //   }
  // }

  // === 🟦 ZONE B – Pipeline Canny (Lissage & Nettoyage) ===

  // 1. Flou gaussien léger pour réduire le bruit
  const blurred = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    const wy = y * width;
    for (let x = 1; x < width - 1; x++) {
      let sum = 0, k = 0;
      for (let ky = -1; ky <= 1; ky++) {
        const iy = (y + ky) * width;
        for (let kx = -1; kx <= 1; kx++, k++) {
          sum += gradientMap[iy + (x + kx)] * gaussianKernel[k];
        }
      }
      blurred[wy + x] = sum;
    }
  }

  // 2. Suppression non-maximale (affiner les contours)
  const suppressed = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    const wy = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = wy + x;
      const angle = ((angleMap[idx] * 180) / Math.PI + 180) % 180;
      const mag = blurred[idx];

      let q = 0, r = 0;
      if ((angle < 22.5) || (angle >= 157.5)) {
        q = blurred[idx + 1]; r = blurred[idx - 1];
      } else if (angle < 67.5) {
        q = blurred[idx - width + 1]; r = blurred[idx + width - 1];
      } else if (angle < 112.5) {
        q = blurred[idx + width]; r = blurred[idx - width];
      } else {
        q = blurred[idx - width - 1]; r = blurred[idx + width + 1];
      }

      suppressed[idx] = (mag >= q && mag >= r) ? mag : 0;
    }
  }

  // 3. Seuillage dynamique + Hystérésis (éliminer les faux bords)
  let sum = 0, sumSq = 0, n = 0;
  for (const val of suppressed) if (val > 0) { sum += val; sumSq += val * val; n++; }
  const mean = sum / n;
  const std = Math.sqrt(sumSq / n - mean * mean);
  const highThreshold = mean + std * HIGH_THRESHOLD_FACTOR;
  const lowThreshold = mean * LOW_THRESHOLD_RATIO;

  const cannyMask = new Uint8Array(width * height);
  for (let i = 0; i < suppressed.length; i++) {
    if (suppressed[i] > highThreshold) cannyMask[i] = 2; // Pixel fort
    else if (suppressed[i] > lowThreshold) cannyMask[i] = 1; // Pixel faible
  }

  // Propagation des pixels faibles connectés à des pixels forts
  for (let y = 1; y < height - 1; y++) {
    const wy = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = wy + x;
      if (cannyMask[idx] !== 1) continue;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          // ✅ Optimisation : éviter de vérifier le pixel central
          if (dx === 0 && dy === 0) continue;
          if (cannyMask[wy + dy * width + x + dx] === 2) {
            cannyMask[idx] = 2;
            edgeMap[idx] = 2; // Marquer comme bord Canny confirmé
            break;
          }
        }
        if (cannyMask[idx] === 2) break;
      }
    }
  }

  // === 🟨 ZONE C – Fusion & Rendu Final ===
  // Une seule passe de rendu, en se basant sur la carte de bords unifiée.
  for (let i = 0; i < width * height; i++) {
    // La condition `edgeMap[i] > 0` couvre désormais les bords ΔE (1) et Canny (2).
    if (edgeMap[i] > 0 && labels[i] !== -1) {
      const o = i * 4;
      result.data[o] = result.data[o + 1] = result.data[o + 2] = 0;
      result.data[o + 3] = 255;
    }
  }

  return result;
}
// ============= MAIN PROCESSING PIPELINE =============

/**
 * Process image: quantize, segment, merge, smooth, trace contours, generate SVG and numbered version
 * @param enableSmartPalette - Enable intelligent palette balancing (default: false)
 */
export async function processImage(
  imageFile: File | ImageData,
  numColors: number,
  minRegionSize: number,
  smoothness: number,
  mergeTolerance: number,
  enableArtisticMerge: boolean = true,
  onProgress?: (stage: string, progress: number) => void,
  enableSmartPalette: boolean = false
): Promise<ProcessedResult> {
  const GLOBAL_TIMEOUT = 30000; // 30 seconds max
  const startTime = Date.now();
  const progressLog: ProgressEvent[] = [];

  const report = (stage: string, progress: number, detail?: string) => {
    const timestamp = Date.now() - startTime;
    const message = detail ? `${stage} — ${detail}` : stage;
    const event: ProgressEvent = { stage, progress, detail, timestamp };
    progressLog.push(event);
    console.log(`[processImage] ${message} (${progress}%) @ ${timestamp}ms`);
    onProgress?.(message, progress);
  };
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new Error(
          "Le traitement a dépassé le délai maximum de 30 secondes. Essayez avec une image plus petite ou moins de couleurs."
        )
      );
    }, GLOBAL_TIMEOUT);

    const run = async () => {
      try {
        const effectiveMinRegionSize = Math.max(minRegionSize, 20);
        const effectiveMergeTolerance = Math.max(mergeTolerance, 1);

        report(
          "Initialisation du traitement",
          2,
          `Paramètres : ${numColors} couleurs, zone minimale ${effectiveMinRegionSize}px, lissage ${smoothness}, fusion ΔE ≤ ${effectiveMergeTolerance}`
        );

        report("Chargement de l'image", 5, "Préparation de la source");
        const rawAnalysis = await analysisPipeline(imageFile, 1200);
        const { referenceImageData } = rawAnalysis;
        const width = referenceImageData.width;
        const height = referenceImageData.height;

        report("Vérification du cache", 10, "Recherche d'un résultat existant");
        const imageHash = await hashImageData(referenceImageData);
        const cacheKey = generateCacheKey({
          imageHash,
          numColors,
          minRegionSize: effectiveMinRegionSize,
          smoothness,
          mergeTolerance: effectiveMergeTolerance,
          enableArtisticMerge,
        });

        const cached = getCachedResult(cacheKey);
        if (cached) {
          clearTimeout(timeoutId);
          console.log("✨ Returning cached result");
          const timestamp = Date.now() - startTime;
          report(
            "Résultat en cache",
            100,
            `Réutilisation de ${cached.zones.length} zones et ${cached.palette.length} couleurs`
          );
          return resolve({
            ...cached,
            progressLog: [...progressLog],
            metadata: {
              ...(cached.metadata ?? {}),
              totalProcessingTimeMs: timestamp,
              width,
              height,
              cacheKey,
              wasCached: true,
            },
          });
        }

        const { processed, averageDeltaE } = renderPipeline(rawAnalysis, {
          numColors,
          minRegionSize,
          smoothness,
          mergeTolerance,
          enableArtisticMerge,
          enableSmartPalette,
          report
        });

        clearTimeout(timeoutId);
        const totalTime = Date.now() - startTime;
        console.log(
          `✅ Processing complete: ${processed.zones.length} zones, ${processed.contours ? 1 : 0} contours in ${totalTime}ms`
        );

        report("Validation des données", 97, "Contrôle des zones et contours");

        if (!processed.zones.length || !processed.palette.length || !processed.contours) {
          throw new Error("Résultat de traitement invalide : zones, palette ou contours vides");
        }

        report("Mise en cache", 99, "Résultat prêt pour réutilisation");
        report("Terminé", 100, `${processed.zones.length} zones en ${totalTime}ms`);

        console.groupCollapsed("🧩 Safe serialization diagnostics");
        console.log("Zones:", processed.zones.length);
        console.log("Palette:", processed.palette.length);
        console.log("Contours:", processed.contours ? 1 : 0);

        let totalPixels = 0, largestZone = 0;
        for (const z of processed.zones) {
          totalPixels += z.pixels.length;
          largestZone = Math.max(largestZone, z.pixels.length);
        }
        console.log("Taille totale pixels:", totalPixels);
        console.log("Plus grande zone:", largestZone);

        const safeZones = processed.zones.map((z) => ({
          ...z,
          pixels: z.area < 20000 ? z.pixels.slice(0, 20000) : new Uint32Array(0),
        }));
        console.log("Mapping couleurs:", processed.colorZoneMapping?.size ?? 0);

        const estimatedSizeMb = (
          JSON.stringify({ zones: safeZones.slice(0, 10).map(z => ({ ...z, pixels: [] })) }).length /
          1024 /
          1024
        ).toFixed(2);
        console.log("Taille JSON estimée:", `${estimatedSizeMb} MB`);
        console.groupEnd();

        const result: ProcessedResult = {
          ...processed,
          zones: safeZones,
          progressLog: [...progressLog],
          metadata: {
            totalProcessingTimeMs: totalTime,
            width,
            height,
            cacheKey,
            wasCached: false,
            averageDeltaE
          },
        };

        try {
          structuredClone(result);
          console.log("✅ Structured clone test réussi — pas de références circulaires.");
        } catch (cloneErr) {
          console.error("❌ Structured clone échoué :", cloneErr);
        }

        setCachedResult(cacheKey, result);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        const message =
          error instanceof Error
            ? error.message
            : "Erreur inconnue lors du traitement de l'image";
        report("Erreur", 100, message);
        reject(error instanceof Error ? error : new Error(message));
      }
    };

    run();
  });
}
