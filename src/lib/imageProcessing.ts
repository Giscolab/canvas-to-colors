import { isoContours } from 'marchingsquares';
import polylabel from 'polylabel';
import { union } from 'martinez-polygon-clipping';
import simplify from 'simplify-js';
import { rgbToLab, deltaE2000, perceptualDistance, rgbToHex as rgbToHexColor } from './colorUtils';

// Image processing utilities for paint-by-numbers conversion
// Enhanced with ΔE2000 perceptual color distance, adaptive simplification, and parametric caching

// ============= TYPES =============

export interface Zone {
  id: number;
  colorIdx: number;
  area: number;
  pixels: number[];
  centroid: { x: number; y: number };
}

export interface LegendEntry {
  id: number;
  hex: string;
  percent: number;
}

export interface ProcessedResult {
  contours: ImageData | null;
  numbered: ImageData | null;
  colorized: ImageData | null;
  palette: string[];
  zones: Zone[];
  svg: string;
  legend: LegendEntry[];
  labels?: Int32Array;
  colorZoneMapping?: Map<number, number[]>; // colorIdx -> zoneIds[]
}

interface Contour {
  zoneId: number;
  path: Array<{ x: number; y: number }>;
}

type CanvasLike = HTMLCanvasElement | OffscreenCanvas;
type Canvas2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

interface CanvasHandle {
  canvas: CanvasLike;
  ctx: Canvas2DContext;
}

function createCanvasFactory() {
  if (typeof document === 'undefined') {
    if (typeof OffscreenCanvas === 'undefined') {
      throw new Error('OffscreenCanvas is not supported in this environment.');
    }
    return {
      createCanvas(width: number, height: number): CanvasHandle {
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Unable to acquire 2D context from OffscreenCanvas');
        }
        return { canvas, ctx };
      }
    };
  }

  return {
    createCanvas(width: number, height: number): CanvasHandle {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Unable to acquire 2D context from canvas element');
      }
      return { canvas, ctx };
    }
  };
}

const canvasFactory = createCanvasFactory();

// ============= COLOR UTILITIES =============

function rgbToHex(r: number, g: number, b: number): string {
  return rgbToHexColor(Math.round(r), Math.round(g), Math.round(b));
}

function hexToRgb(hex: string): [number, number, number] {
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
}

interface CacheEntry {
  result: ProcessedResult;
  timestamp: number;
}

const processingCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 10;
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generate cache key from parameters
 */
function generateCacheKey(params: CacheKey): string {
  return `${params.imageHash}_${params.numColors}_${params.minRegionSize}_${params.smoothness}`;
}

/**
 * Hash image data for cache key
 */
async function hashImageData(imageData: ImageData): Promise<string> {
  // Use first 1000 pixels for fast hash
  const sample = imageData.data.slice(0, 4000);
  const str = Array.from(sample).join(',');
  
  // Simple but fast hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `${hash}_${imageData.width}_${imageData.height}`;
}

/**
 * Get cached result if available
 */
function getCachedResult(key: string): ProcessedResult | null {
  const entry = processingCache.get(key);
  if (!entry) return null;
  
  // Check expiry
  if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
    processingCache.delete(key);
    return null;
  }
  
  console.log('✨ Cache hit! Returning cached result.');
  return entry.result;
}

/**
 * Store result in cache
 */
function setCachedResult(key: string, result: ProcessedResult): void {
  // Implement LRU eviction
  if (processingCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = Array.from(processingCache.keys())[0];
    processingCache.delete(oldestKey);
  }
  
  processingCache.set(key, {
    result,
    timestamp: Date.now()
  });
  console.log('💾 Result cached for future use.');
}

// ============= K-MEANS QUANTIZATION =============

/**
 * Simple k-means color quantization
 */
export function quantizeColors(imageData: ImageData, numColors: number): string[] {
  const pixels: number[][] = [];
  
  // Sample pixels (every 4th pixel for performance)
  for (let i = 0; i < imageData.data.length; i += 16) {
    pixels.push([
      imageData.data[i],
      imageData.data[i + 1],
      imageData.data[i + 2]
    ]);
  }

  // Simple k-means clustering with K-means++ initialization for stability
  let centroids = initializeCentroids(pixels, numColors);
  
  for (let iter = 0; iter < 10; iter++) {
    const clusters: number[][][] = Array(numColors).fill(null).map(() => []);
    
    // Assign pixels to nearest centroid
    pixels.forEach(pixel => {
      const nearest = findNearestCentroid(pixel, centroids);
      clusters[nearest].push(pixel);
    });
    
    // Update centroids
    centroids = clusters.map((cluster, idx) => {
      if (cluster.length === 0) return centroids[idx];
      return [
        Math.round(cluster.reduce((sum, p) => sum + p[0], 0) / cluster.length),
        Math.round(cluster.reduce((sum, p) => sum + p[1], 0) / cluster.length),
        Math.round(cluster.reduce((sum, p) => sum + p[2], 0) / cluster.length)
      ];
    });
  }

  return centroids.map(c => rgbToHex(c[0], c[1], c[2]));
}

/**
 * Optimized K-Means++ initialization
 * Squared distances for better spread
 */
function initializeCentroids(pixels: number[][], k: number): number[][] {
  if (pixels.length === 0 || k <= 0) {
    return [];
  }

  const centroids: number[][] = [];

  // Pick first centroid uniformly at random
  const first = pixels[Math.floor(Math.random() * pixels.length)];
  centroids.push([...first]);

  while (centroids.length < k) {
    const distances = new Float32Array(pixels.length);
    let totalDistance = 0;
    
    // Calculate squared distance to nearest centroid
    for (let i = 0; i < pixels.length; i++) {
      const pixel = pixels[i];
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist =
          Math.pow(pixel[0] - centroid[0], 2) +
          Math.pow(pixel[1] - centroid[1], 2) +
          Math.pow(pixel[2] - centroid[2], 2);
        if (dist < minDist) {
          minDist = dist;
        }
      }
      distances[i] = minDist;
      totalDistance += minDist;
    }

    // If all distances are zero (identical pixels), pick remaining centroids randomly
    if (!isFinite(totalDistance) || totalDistance === 0) {
      while (centroids.length < k) {
        const randomPixel = pixels[Math.floor(Math.random() * pixels.length)];
        centroids.push([...randomPixel]);
      }
      break;
    }

    // Weighted random selection
    let threshold = Math.random() * totalDistance;
    let candidateIndex = 0;
    for (let i = 0; i < distances.length; i++) {
      threshold -= distances[i];
      if (threshold <= 0) {
        candidateIndex = i;
        break;
      }
    }

    const candidate = pixels[candidateIndex];
    const alreadyIncluded = centroids.some(centroid =>
      centroid[0] === candidate[0] &&
      centroid[1] === candidate[1] &&
      centroid[2] === candidate[2]
    );

    if (!alreadyIncluded) {
      centroids.push([...candidate]);
    } else {
      // If duplicate, pick a random pixel to ensure progress
      const randomPixel = pixels[Math.floor(Math.random() * pixels.length)];
      centroids.push([...randomPixel]);
    }
  }

  return centroids.slice(0, k);
}

function findNearestCentroid(pixel: number[], centroids: number[][]): number {
  let minDist = Infinity;
  let nearest = 0;
  
  centroids.forEach((centroid, i) => {
    const dist = Math.sqrt(
      Math.pow(pixel[0] - centroid[0], 2) +
      Math.pow(pixel[1] - centroid[1], 2) +
      Math.pow(pixel[2] - centroid[2], 2)
    );
    
    if (dist < minDist) {
      minDist = dist;
      nearest = i;
    }
  });
  
  return nearest;
}

// ============= CONNECTED COMPONENTS LABELING =============

/**
 * Optimized label connected components using flood-fill (8-neighbors)
 * Uses pre-allocated typed arrays for better performance
 */
function labelConnectedComponents(
  colorMap: number[],
  width: number,
  height: number
): { labels: Int32Array; zones: Zone[] } {
  const labels = new Int32Array(width * height).fill(-1);
  const zones: Zone[] = [];
  let currentLabel = 0;
  
  // Pre-allocate stack buffers to avoid constant reallocation
  const MAX_STACK_SIZE = Math.min(width * height, 500000);
  const stackX = new Int32Array(MAX_STACK_SIZE);
  const stackY = new Int32Array(MAX_STACK_SIZE);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (labels[idx] === -1) {
        const colorIdx = colorMap[idx];
        const pixels: number[] = [];
        let sumX = 0;
        let sumY = 0;
        
        // Optimized iterative flood fill
        let stackPtr = 0;
        stackX[stackPtr] = x;
        stackY[stackPtr] = y;
        stackPtr++;
        
        let iterations = 0;
        const MAX_ITERATIONS = 1000000;
        
        while (stackPtr > 0 && iterations < MAX_ITERATIONS) {
          iterations++;
          
          stackPtr--;
          const cx = stackX[stackPtr];
          const cy = stackY[stackPtr];
          const cidx = cy * width + cx;
          
          if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
          if (labels[cidx] !== -1) continue;
          if (colorMap[cidx] !== colorIdx) continue;
          
          labels[cidx] = currentLabel;
          pixels.push(cidx);
          sumX += cx;
          sumY += cy;
          
          // Add 8-neighbors (check bounds before adding)
          if (stackPtr + 8 < MAX_STACK_SIZE) {
            if (cx > 0) {
              stackX[stackPtr] = cx - 1;
              stackY[stackPtr] = cy;
              stackPtr++;
            }
            if (cx < width - 1) {
              stackX[stackPtr] = cx + 1;
              stackY[stackPtr] = cy;
              stackPtr++;
            }
            if (cy > 0) {
              stackX[stackPtr] = cx;
              stackY[stackPtr] = cy - 1;
              stackPtr++;
            }
            if (cy < height - 1) {
              stackX[stackPtr] = cx;
              stackY[stackPtr] = cy + 1;
              stackPtr++;
            }
            if (cx > 0 && cy > 0) {
              stackX[stackPtr] = cx - 1;
              stackY[stackPtr] = cy - 1;
              stackPtr++;
            }
            if (cx < width - 1 && cy > 0) {
              stackX[stackPtr] = cx + 1;
              stackY[stackPtr] = cy - 1;
              stackPtr++;
            }
            if (cx > 0 && cy < height - 1) {
              stackX[stackPtr] = cx - 1;
              stackY[stackPtr] = cy + 1;
              stackPtr++;
            }
            if (cx < width - 1 && cy < height - 1) {
              stackX[stackPtr] = cx + 1;
              stackY[stackPtr] = cy + 1;
              stackPtr++;
            }
          } else {
            console.warn(`Stack size limit reached for zone at (${x}, ${y})`);
            break;
          }
        }

        if (iterations >= MAX_ITERATIONS) {
          console.warn(`Max iterations reached for zone at (${x}, ${y})`);
        }

        if (pixels.length > 0) {
          zones.push({
            id: currentLabel,
            colorIdx,
            area: pixels.length,
            pixels,
            centroid: {
              x: Math.round(sumX / pixels.length),
              y: Math.round(sumY / pixels.length)
            }
          });
          currentLabel++;
        }
      }
    }
  }

  return { labels, zones };
}

// ============= ZONE MERGING =============

/**
 * Rebuild zones from a label map.
 * Optionally uses reference zones to keep consistent color assignments.
 */
function buildZonesFromLabels(
  labels: Int32Array,
  palette: string[],
  width: number,
  height: number,
  referenceZones: Zone[] = []
): Zone[] {
  const zoneMap = new Map<number, Zone>();
  const labelToColor = new Map<number, number>();

  for (const zone of referenceZones) {
    labelToColor.set(zone.id, zone.colorIdx);
  }

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (label === -1) continue;

    if (!zoneMap.has(label)) {
      const colorIdx = labelToColor.get(label) ?? (palette.length > 0 ? label % palette.length : 0);
      zoneMap.set(label, {
        id: label,
        colorIdx,
        area: 0,
        pixels: [],
        centroid: { x: 0, y: 0 }
      });
    }

    const zone = zoneMap.get(label)!;
    zone.pixels.push(i);
    zone.area++;
  }

  return Array.from(zoneMap.values()).map(zone => {
    const usePole = zone.area > 50;
    let centroid: { x: number; y: number };

    if (usePole) {
      centroid = findPoleOfInaccessibility(zone.pixels, width, height);
    } else {
      let sumX = 0;
      let sumY = 0;
      for (const pixelIdx of zone.pixels) {
        sumX += pixelIdx % width;
        sumY += Math.floor(pixelIdx / width);
      }
      centroid = {
        x: Math.round(sumX / zone.area),
        y: Math.round(sumY / zone.area)
      };
    }

    return {
      ...zone,
      centroid
    };
  });
}

/**
 * Merge small zones with their nearest neighbor by color distance and compactness
 */
function mergeSmallZones(
  zones: Zone[],
  labels: Int32Array,
  palette: string[],
  width: number,
  height: number,
  minRegionSize: number
): { mergedLabels: Int32Array; mergedZones: Zone[] } {
  const mergedLabels = new Int32Array(labels);
  const zonesToMerge = zones.filter(z => z.area < minRegionSize);
  const keepZones = zones.filter(z => z.area >= minRegionSize);

  // Helper: calculate zone compactness (perimeter^2 / area)
  const calculateCompactness = (zone: Zone): number => {
    const pixelSet = new Set(zone.pixels);
    let perimeter = 0;
    
    for (const pixelIdx of zone.pixels) {
      const x = pixelIdx % width;
      const y = Math.floor(pixelIdx / width);
      
      // Check 4-neighbors
      const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dx, dy] of deltas) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nidx = ny * width + nx;
          if (!pixelSet.has(nidx)) {
            perimeter++;
          }
        } else {
          perimeter++;
        }
      }
    }
    
    return zone.area > 0 ? (perimeter * perimeter) / zone.area : Infinity;
  };

  // Build adjacency for small zones
  for (const smallZone of zonesToMerge) {
    const neighbors = new Set<number>();
    
    for (const pixelIdx of smallZone.pixels) {
      const x = pixelIdx % width;
      const y = Math.floor(pixelIdx / width);
      
      // Check 4-neighbors
      const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dx, dy] of deltas) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nidx = ny * width + nx;
          const nlabel = mergedLabels[nidx];
          if (nlabel !== smallZone.id && nlabel !== -1) {
            neighbors.add(nlabel);
          }
        }
      }
    }

    // Find nearest neighbor by color and compactness
    let bestNeighbor = -1;
    let minScore = Infinity;
    const smallColor = hexToRgb(palette[smallZone.colorIdx]);

    for (const neighborId of neighbors) {
      const neighborZone = zones.find(z => z.id === neighborId);
      if (!neighborZone) continue;
      
      const neighborColor = hexToRgb(palette[neighborZone.colorIdx]);
      const colorDist = colorDistance(smallColor, neighborColor);
      const compactness = calculateCompactness(neighborZone);
      
      // Combined score: prioritize color similarity, penalize non-compact zones
      const score = colorDist + compactness * 0.1;
      
      if (score < minScore) {
        minScore = score;
        bestNeighbor = neighborId;
      }
    }

    // Merge into best neighbor
    if (bestNeighbor !== -1) {
      for (const pixelIdx of smallZone.pixels) {
        mergedLabels[pixelIdx] = bestNeighbor;
      }
    }
  }

  const mergedZones = buildZonesFromLabels(mergedLabels, palette, width, height, zones);

  return { mergedLabels, mergedZones };
}

// ============= MORPHOLOGICAL SMOOTHING =============

/**
 * Apply morphological operations for edge smoothing
 * Uses a larger neighborhood (range=4) for more aggressive smoothing inspired by pbnify
 */
function smoothZones(
  labels: Int32Array,
  width: number,
  height: number,
  iterations: number
): Int32Array {
  let current = new Int32Array(labels);
  
  for (let iter = 0; iter < iterations; iter++) {
    const next = new Int32Array(current);
    
    const range = 4; // Larger range for more aggressive smoothing (from pbnify)
    
    for (let y = range; y < height - range; y++) {
      for (let x = range; x < width - range; x++) {
        const idx = y * width + x;
        
        // Count neighbor labels in larger vicinity
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
function mergeAdjacentPolygons(
  contours: Contour[],
  zones: Zone[]
): Contour[] {
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
    if (groupContours.length === 1 || groupContours.length > 100) {
      mergedContours.push(...groupContours);
      continue;
    }
    
    try {
      // Convert contours to martinez polygon format
      let mergedPolygon: Array<Array<[number, number]>> | null = null;
      
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
          mergedPolygon = polygon;
        } else {
          // Union with previous merged polygon
          const result = union(mergedPolygon, polygon);
          if (result && result.length > 0) {
            mergedPolygon = result[0]; // Take first polygon from multipolygon result
          }
        }
      }
      
      // Convert merged polygon back to contours
      if (mergedPolygon && mergedPolygon.length > 0) {
        for (const ring of mergedPolygon) {
          if (ring.length < 4) continue;
          
          const path = ring.slice(0, -1).map(([x, y]) => ({ x, y })); // Remove closing point
          const simplifiedPath = simplifyPath(path); // Adaptive simplification
          
          if (simplifiedPath.length >= 3) {
            // Use the first zone ID from the group
            const zoneId = groupContours[0].zoneId;
            mergedContours.push({ zoneId, path: simplifiedPath });
          }
        }
      } else {
        // Fallback: keep original contours if merge failed
        mergedContours.push(...groupContours);
      }
    } catch (error) {
      console.warn(`Polygon merge failed for color ${colorIdx}:`, error);
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

function refineZoneLabelPositions(
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
  pixels: number[],
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
function traceContours(
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
 * Generate SVG from contours
 */
function generateSVG(
  contours: Contour[],
  zones: Zone[],
  palette: string[],
  width: number,
  height: number
): string {
  // Safety check: if too many contours, return a simplified SVG
  const MAX_CONTOURS_FOR_SVG = 1000;
  if (contours.length > MAX_CONTOURS_FOR_SVG) {
    console.warn(`Too many contours (${contours.length}). Generating simplified SVG.`);
    // Return a basic SVG with colored rectangles for each zone instead
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
    svg += `  <g id="zones">\n`;
    svg += `    <rect width="${width}" height="${height}" fill="#f0f0f0" />\n`;
    svg += `    <text x="${width/2}" y="${height/2}" text-anchor="middle" font-size="20">Too many zones detected</text>\n`;
    svg += `  </g>\n`;
    svg += `</svg>`;
    return svg;
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
 */
function createNumberedVersion(
  imageData: ImageData,
  zones: Zone[],
  palette: string[],
  labels: Int32Array
): ImageData {
  const width = imageData.width;
  const height = imageData.height;

  const { ctx } = canvasFactory.createCanvas(width, height);
  
  // Start with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // Draw thin black contours
  const edgesData = detectEdges(labels, width, height);
  for (let i = 0; i < edgesData.data.length; i += 4) {
    if (edgesData.data[i] === 0) { // Black pixel = edge
      const pixelIdx = i / 4;
      const x = pixelIdx % width;
      const y = Math.floor(pixelIdx / width);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  
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
    
    // White background for number
    const padding = fontSize * 0.4;
    const textMetrics = ctx.measureText(number.toString());
    const bgWidth = textMetrics.width + padding * 2;
    const bgHeight = fontSize + padding;
    
    ctx.fillStyle = '#ffffff';
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
  
  return ctx.getImageData(0, 0, width, height);
}

// ============= PREVIEW FUSION =============

/**
 * Create preview fusion: image + contours + numbers layered together
 */
function createPreviewFusion(
  quantizedData: ImageData,
  contoursData: ImageData,
  numberedData: ImageData,
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
  
  // Overlay numbers from numbered version
  for (let i = 0; i < numberedData.data.length; i += 4) {
    const r = numberedData.data[i];
    const g = numberedData.data[i + 1];
    const b = numberedData.data[i + 2];
    
    // If it's a number (black text on white background in numbered version)
    // Numbers appear as dark pixels, detect them
    if (r < 100 && g < 100 && b < 100) {
      previewData.data[i] = 0;     // R - black
      previewData.data[i + 1] = 0; // G - black
      previewData.data[i + 2] = 0; // B - black
      previewData.data[i + 3] = 255; // A
    }
  }
  
  return previewData;
}

// ============= LEGEND GENERATION =============

/**
 * Generate legend with zone info
 */
function generateLegend(zones: Zone[], palette: string[], totalPixels: number): LegendEntry[] {
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

// ============= EDGE DETECTION =============

function detectEdges(labels: Int32Array, width: number, height: number): ImageData {
  const result = new ImageData(width, height);
  
  // Fill with white background
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = 255;
    result.data[i + 1] = 255;
    result.data[i + 2] = 255;
    result.data[i + 3] = 255;
  }
  
  // Draw thin black contours
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const label = labels[idx];
      
      // Check 4 neighbors for edge detection
      let isEdge = false;
      const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      
      for (const [dx, dy] of deltas) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          isEdge = true;
          break;
        }
        const nidx = ny * width + nx;
        if (labels[nidx] !== label) {
          isEdge = true;
          break;
        }
      }
      
      // Draw black pixel for edges
      if (isEdge) {
        const offset = idx * 4;
        result.data[offset] = 0;     // R
        result.data[offset + 1] = 0; // G
        result.data[offset + 2] = 0; // B
        result.data[offset + 3] = 255; // A
      }
    }
  }
  
  return result;
}

// ============= MAIN PROCESSING PIPELINE =============

interface LoadedImageSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup?: () => void;
}

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
      reject(new Error('Impossible de charger l\'image fournie.'));
    };

    reader.readAsDataURL(imageFile);
  });
}

/**
 * Process image: quantize, segment, merge, smooth, trace contours, generate SVG and numbered version
 */
export async function processImage(
  imageFile: File,
  numColors: number,
  minRegionSize: number,
  smoothness: number
): Promise<ProcessedResult> {
  const GLOBAL_TIMEOUT = 30000; // 30 seconds max
  const startTime = Date.now();

  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Le traitement a dépassé le délai maximum de 30 secondes. Essayez avec une image plus petite ou moins de couleurs.'));
    }, GLOBAL_TIMEOUT);

    try {
      const loadedImage = await loadImageSource(imageFile);

      // Scale down if too large (max 1200px)
      const maxDim = 1200;
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
      loadedImage.cleanup?.();

      const imageData = ctx.getImageData(0, 0, width, height);

      // Check cache before processing
      const imageHash = await hashImageData(imageData);
      const cacheKey = generateCacheKey({ imageHash, numColors, minRegionSize, smoothness });
      
      const cached = getCachedResult(cacheKey);
      if (cached) {
        clearTimeout(timeoutId);
        console.log('✨ Returning cached result');
        return resolve(cached);
      }

      // STEP 1: Quantize colors
      console.log('Step 1: Quantizing colors...');
      const palette = quantizeColors(imageData, numColors);

      // STEP 2: Map pixels to palette
      console.log('Step 2: Mapping pixels to palette...');
      const colorMap: number[] = [];
      const quantizedData = new ImageData(width, height);

      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];

        let minDist = Infinity;
        let colorIndex = 0;

        palette.forEach((hex, idx) => {
          const [pr, pg, pb] = hexToRgb(hex);
          const dist = Math.sqrt(
            Math.pow(r - pr, 2) +
            Math.pow(g - pg, 2) +
            Math.pow(b - pb, 2)
          );

          if (dist < minDist) {
            minDist = dist;
            colorIndex = idx;
          }
        });

        colorMap.push(colorIndex);
        const [qr, qg, qb] = hexToRgb(palette[colorIndex]);
        quantizedData.data[i] = qr;
        quantizedData.data[i + 1] = qg;
        quantizedData.data[i + 2] = qb;
        quantizedData.data[i + 3] = 255;
      }

      // STEP 3: Label connected components
      console.log('Step 3: Labeling connected components...');
      const { labels: initialLabels, zones: initialZones } = labelConnectedComponents(
        colorMap,
        width,
        height
      );

      // STEP 4: Merge small zones
      console.log('Step 4: Merging small zones...');
      const { mergedLabels, mergedZones } = mergeSmallZones(
        initialZones,
        initialLabels,
        palette,
        width,
        height,
        minRegionSize
      );

      // STEP 5: Smooth zones
      console.log('Step 5: Smoothing zones...');
      const smoothedLabels = smoothZones(
        mergedLabels,
        width,
        height,
        Math.round(smoothness)
      );

      const smoothedZones = buildZonesFromLabels(
        smoothedLabels,
        palette,
        width,
        height,
        mergedZones
      );

  // STEP 6: Trace contours
  console.log('Step 6: Tracing contours...');
  const contours = traceContours(width, height, smoothedZones);
  
  // STEP 6.5: Merge adjacent polygons of same color (new optimization)
  console.log('Step 6.5: Merging adjacent polygons...');
  const mergedContours = mergeAdjacentPolygons(contours, smoothedZones);
  console.log(`Polygon merging: ${contours.length} -> ${mergedContours.length} contours`);

  // STEP 7: Refine label placement using polylabel
  console.log('Step 7: Refining label placement...');
  const refinedZones = refineZoneLabelPositions(smoothedZones, mergedContours, width, height);

      // STEP 8: Generate edge image
      console.log('Step 8: Generating edge image...');
      const contoursData = detectEdges(smoothedLabels, width, height);

  // STEP 9: Generate SVG
  console.log('Step 9: Generating SVG...');
  const svg = generateSVG(mergedContours, refinedZones, palette, width, height);

      // STEP 10: Create numbered version with optimal positioning
      console.log('Step 10: Creating numbered version...');
      const numberedData = createNumberedVersion(quantizedData, refinedZones, palette, smoothedLabels);

      // STEP 11: Create preview version (fusion: image + contours + numbers)
      console.log('Step 11: Creating preview fusion...');
      const previewData = createPreviewFusion(quantizedData, contoursData, numberedData, width, height);

      // STEP 12: Generate legend
      console.log('Step 12: Generating legend...');
      const legend = generateLegend(refinedZones, palette, width * height);

      // STEP 13: Build color->zone mapping
      const colorZoneMapping = new Map<number, number[]>();
      refinedZones.forEach(zone => {
        if (!colorZoneMapping.has(zone.colorIdx)) {
          colorZoneMapping.set(zone.colorIdx, []);
        }
        colorZoneMapping.get(zone.colorIdx)!.push(zone.id);
      });

      const totalTime = Date.now() - startTime;
      console.log(`Processing complete: ${refinedZones.length} zones, ${mergedContours.length} contours in ${totalTime}ms`);

      clearTimeout(timeoutId);

      const result: ProcessedResult = {
        contours: contoursData,
        numbered: numberedData,
        colorized: previewData,
        palette,
        zones: refinedZones,
        svg,
        legend,
        labels: smoothedLabels,
        colorZoneMapping
      };

      // Cache the result
      setCachedResult(cacheKey, result);

      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error instanceof Error ? error : new Error('Erreur inconnue lors du traitement de l\'image'));
    }
  });
}
