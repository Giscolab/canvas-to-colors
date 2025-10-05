// Image processing utilities for paint-by-numbers conversion

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
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
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
 * Convert RGB to Lab color space for perceptual distance
 */
function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // Normalize RGB values
  r = r / 255;
  g = g / 255;
  b = b / 255;

  // Convert to XYZ
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

  return [
    (116 * y) - 16,
    500 * (x - y),
    200 * (y - z)
  ];
}

/**
 * Calculate perceptual color distance in Lab space
 */
function colorDistance(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const lab1 = rgbToLab(rgb1[0], rgb1[1], rgb1[2]);
  const lab2 = rgbToLab(rgb2[0], rgb2[1], rgb2[2]);
  
  return Math.sqrt(
    Math.pow(lab1[0] - lab2[0], 2) +
    Math.pow(lab1[1] - lab2[1], 2) +
    Math.pow(lab1[2] - lab2[2], 2)
  );
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

  // Simple k-means clustering
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

function initializeCentroids(pixels: number[][], k: number): number[][] {
  const centroids: number[][] = [];
  const step = Math.floor(pixels.length / k);
  
  for (let i = 0; i < k; i++) {
    const idx = Math.min(i * step, pixels.length - 1);
    centroids.push([...pixels[idx]]);
  }
  
  return centroids;
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
 * Label connected components using flood-fill (8-neighbors)
 */
function labelConnectedComponents(
  colorMap: number[],
  width: number,
  height: number
): { labels: Int32Array; zones: Zone[] } {
  const labels = new Int32Array(width * height).fill(-1);
  const zones: Zone[] = [];
  let currentLabel = 0;
  const MAX_STACK_SIZE = 500000; // Limit stack size to prevent memory issues

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (labels[idx] === -1) {
        const colorIdx = colorMap[idx];
        const pixels: number[] = [];
        let sumX = 0;
        let sumY = 0;

        // Flood fill with strict limits
        const stack: Array<[number, number]> = [[x, y]];
        let iterations = 0;
        const MAX_ITERATIONS = 1000000; // 1M iterations max per zone
        
        while (stack.length > 0 && iterations < MAX_ITERATIONS) {
          iterations++;
          
          // Prevent stack overflow
          if (stack.length > MAX_STACK_SIZE) {
            console.warn(`Stack size limit reached for zone at (${x}, ${y})`);
            break;
          }
          
          const [cx, cy] = stack.pop()!;
          const cidx = cy * width + cx;
          
          if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
          if (labels[cidx] !== -1) continue;
          if (colorMap[cidx] !== colorIdx) continue;
          
          labels[cidx] = currentLabel;
          pixels.push(cidx);
          sumX += cx;
          sumY += cy;
          
          // 8-neighbors
          stack.push([cx - 1, cy]);
          stack.push([cx + 1, cy]);
          stack.push([cx, cy - 1]);
          stack.push([cx, cy + 1]);
          stack.push([cx - 1, cy - 1]);
          stack.push([cx + 1, cy - 1]);
          stack.push([cx - 1, cy + 1]);
          stack.push([cx + 1, cy + 1]);
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
 * Ramer-Douglas-Peucker algorithm for path simplification
 */
function simplifyPath(
  path: Array<{ x: number; y: number }>,
  epsilon: number = 2.0
): Array<{ x: number; y: number }> {
  if (path.length <= 2) return path;

  // Find point with maximum distance from line between first and last
  let maxDist = 0;
  let maxIndex = 0;
  const first = path[0];
  const last = path[path.length - 1];

  for (let i = 1; i < path.length - 1; i++) {
    const dist = perpendicularDistance(path[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDist > epsilon) {
    const left = simplifyPath(path.slice(0, maxIndex + 1), epsilon);
    const right = simplifyPath(path.slice(maxIndex), epsilon);
    return left.slice(0, -1).concat(right);
  }

  // Otherwise, return line between first and last
  return [first, last];
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const norm = Math.sqrt(dx * dx + dy * dy);
  
  if (norm === 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + 
      Math.pow(point.y - lineStart.y, 2)
    );
  }

  return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / norm;
}

// ============= LABEL POSITIONING =============

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
 * Trace contours using Moore-Neighbor algorithm
 */
function traceContours(
  labels: Int32Array,
  width: number,
  height: number
): Contour[] {
  const contours: Contour[] = [];
  const visited = new Set<number>();
  
  // Moore-Neighbor directions (8-connectivity)
  const dirs = [
    [0, -1], [1, -1], [1, 0], [1, 1],
    [0, 1], [-1, 1], [-1, 0], [-1, -1]
  ];
  
  const MAX_PATH_LENGTH = 10000; // Strict limit on path length
  const MAX_ITERATIONS = 50000; // Absolute max iterations per contour
  const MAX_CONTOURS = 500; // Maximum number of contours to prevent memory issues
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Stop if we've reached the maximum number of contours
      if (contours.length >= MAX_CONTOURS) {
        console.warn(`Max contours (${MAX_CONTOURS}) reached. Stopping contour tracing.`);
        return contours;
      }
      
      const idx = y * width + x;
      const label = labels[idx];
      
      if (visited.has(idx)) continue;
      
      // Check if this is a boundary pixel
      let isBoundary = false;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          isBoundary = true;
          break;
        }
        const nidx = ny * width + nx;
        if (labels[nidx] !== label) {
          isBoundary = true;
          break;
        }
      }
      
      if (!isBoundary) continue;
      
      // Trace the contour with strict iteration limits
      const path: Array<{ x: number; y: number }> = [];
      let cx = x, cy = y;
      let dir = 0;
      let iterations = 0;
      const startX = x;
      const startY = y;
      let limitReached = false;
      
      do {
        iterations++;
        
        // Multiple exit conditions to prevent infinite loops
        if (iterations >= MAX_ITERATIONS) {
          console.warn(`Max iterations (${MAX_ITERATIONS}) reached for contour at (${x}, ${y}). Skipping.`);
          limitReached = true;
          break;
        }
        
        if (path.length >= MAX_PATH_LENGTH) {
          console.warn(`Max path length (${MAX_PATH_LENGTH}) reached for contour at (${x}, ${y}). Skipping.`);
          limitReached = true;
          break;
        }
        
        path.push({ x: cx, y: cy });
        visited.add(cy * width + cx);
        
        // Look for next boundary pixel
        let found = false;
        for (let i = 0; i < 8; i++) {
          const checkDir = (dir + i) % 8;
          const [dx, dy] = dirs[checkDir];
          const nx = cx + dx;
          const ny = cy + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nidx = ny * width + nx;
            if (labels[nidx] === label) {
              cx = nx;
              cy = ny;
              dir = (checkDir + 6) % 8; // Turn left
              found = true;
              break;
            }
          }
        }
        
        if (!found) {
          // No next pixel found, stop tracing
          break;
        }
        
        // Check if we've returned to start (only after at least 4 pixels)
        if (path.length > 3 && cx === startX && cy === startY) {
          break;
        }
        
      } while (true);
      
      // Only add valid contours that didn't hit limits
      if (!limitReached && path.length > 3) {
        // Simplify path using Ramer-Douglas-Peucker
        const simplifiedPath = simplifyPath(path, 1.5);
        contours.push({ zoneId: label, path: simplifiedPath });
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
      const contours = traceContours(smoothedLabels, width, height);

      // STEP 7: Generate edge image
      console.log('Step 7: Generating edge image...');
      const contoursData = detectEdges(smoothedLabels, width, height);

      // STEP 8: Generate SVG
      console.log('Step 8: Generating SVG...');
      const svg = generateSVG(contours, smoothedZones, palette, width, height);

      // STEP 9: Create numbered version with optimal positioning
      console.log('Step 9: Creating numbered version...');
      const numberedData = createNumberedVersion(quantizedData, smoothedZones, palette, smoothedLabels);

      // STEP 10: Create preview version (fusion: image + contours + numbers)
      console.log('Step 10: Creating preview fusion...');
      const previewData = createPreviewFusion(quantizedData, contoursData, numberedData, width, height);

      // STEP 11: Generate legend
      console.log('Step 11: Generating legend...');
      const legend = generateLegend(smoothedZones, palette, width * height);

      const totalTime = Date.now() - startTime;
      console.log(`Processing complete: ${smoothedZones.length} zones, ${contours.length} contours in ${totalTime}ms`);

      clearTimeout(timeoutId);

      resolve({
        contours: contoursData,
        numbered: numberedData,
        colorized: previewData,
        palette,
        zones: smoothedZones,
        svg,
        legend,
        labels: smoothedLabels
      });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error instanceof Error ? error : new Error('Erreur inconnue lors du traitement de l\'image'));
    }
  });
}
