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
}

interface Contour {
  zoneId: number;
  path: Array<{ x: number; y: number }>;
}

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

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (labels[idx] === -1) {
        const colorIdx = colorMap[idx];
        const pixels: number[] = [];
        let sumX = 0;
        let sumY = 0;

        // Flood fill
        const stack: Array<[number, number]> = [[x, y]];
        
        while (stack.length > 0) {
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

  return { labels, zones };
}

// ============= ZONE MERGING =============

/**
 * Merge small zones with their nearest neighbor by color distance
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

    // Find nearest neighbor by color
    let bestNeighbor = -1;
    let minDist = Infinity;
    const smallColor = hexToRgb(palette[smallZone.colorIdx]);

    for (const neighborId of neighbors) {
      const neighborZone = zones.find(z => z.id === neighborId);
      if (!neighborZone) continue;
      
      const neighborColor = hexToRgb(palette[neighborZone.colorIdx]);
      const dist = colorDistance(smallColor, neighborColor);
      
      if (dist < minDist) {
        minDist = dist;
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

  // Rebuild zones after merging
  const zoneMap = new Map<number, Zone>();
  
  for (let i = 0; i < mergedLabels.length; i++) {
    const label = mergedLabels[i];
    if (label === -1) continue;
    
    const x = i % width;
    const y = Math.floor(i / width);
    const colorIdx = zones.find(z => z.id === label)?.colorIdx ?? 0;
    
    if (!zoneMap.has(label)) {
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

  // Recalculate centroids
  const mergedZones = Array.from(zoneMap.values()).map(zone => {
    let sumX = 0, sumY = 0;
    for (const pixelIdx of zone.pixels) {
      sumX += pixelIdx % width;
      sumY += Math.floor(pixelIdx / width);
    }
    return {
      ...zone,
      centroid: {
        x: Math.round(sumX / zone.area),
        y: Math.round(sumY / zone.area)
      }
    };
  });

  return { mergedLabels, mergedZones };
}

// ============= MORPHOLOGICAL SMOOTHING =============

/**
 * Apply morphological operations for edge smoothing
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
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const centerLabel = current[idx];
        
        // Count neighbor labels (8-neighbors)
        const counts = new Map<number, number>();
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nidx = (y + dy) * width + (x + dx);
            const label = current[nidx];
            counts.set(label, (counts.get(label) || 0) + 1);
          }
        }
        
        // Use majority vote
        let maxCount = 0;
        let majorityLabel = centerLabel;
        for (const [label, count] of counts) {
          if (count > maxCount) {
            maxCount = count;
            majorityLabel = label;
          }
        }
        
        next[idx] = majorityLabel;
      }
    }
    
    current = next;
  }
  
  return current;
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
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
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
      
      // Trace the contour
      const path: Array<{ x: number; y: number }> = [];
      let cx = x, cy = y;
      let dir = 0;
      
      do {
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
        
        if (!found || path.length > width * height) break;
        
      } while (cx !== x || cy !== y);
      
      if (path.length > 3) {
        contours.push({ zoneId: label, path });
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
 * Create numbered version with numbers at zone centroids
 */
function createNumberedVersion(
  imageData: ImageData,
  zones: Zone[],
  palette: string[]
): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  ctx.putImageData(imageData, 0, 0);
  
  // Draw numbers at centroids
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (const zone of zones) {
    if (zone.area < 100) continue; // Skip tiny zones
    
    const number = zone.id + 1;
    const { x, y } = zone.centroid;
    
    // Choose contrasting color
    const [r, g, b] = hexToRgb(palette[zone.colorIdx]);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const textColor = brightness > 128 ? '#000' : '#fff';
    const outlineColor = brightness > 128 ? '#fff' : '#000';
    
    // Draw outline
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 3;
    ctx.strokeText(number.toString(), x, y);
    
    // Draw number
    ctx.fillStyle = textColor;
    ctx.fillText(number.toString(), x, y);
  }
  
  return ctx.getImageData(0, 0, width, height);
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
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const label = labels[idx];
      
      // Check 4 neighbors
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
      
      const offset = idx * 4;
      if (isEdge) {
        result.data[offset] = 0;
        result.data[offset + 1] = 0;
        result.data[offset + 2] = 0;
      } else {
        result.data[offset] = 255;
        result.data[offset + 1] = 255;
        result.data[offset + 2] = 255;
      }
      result.data[offset + 3] = 255;
    }
  }
  
  return result;
}

// ============= MAIN PROCESSING PIPELINE =============

/**
 * Process image: quantize, segment, merge, smooth, trace contours, generate SVG and numbered version
 */
export async function processImage(
  imageFile: File,
  numColors: number,
  minRegionSize: number,
  smoothness: number
): Promise<ProcessedResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Scale down if too large (max 1200px)
      const maxDim = 1200;
      let width = img.width;
      let height = img.height;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
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
      
      // STEP 6: Trace contours
      console.log('Step 6: Tracing contours...');
      const contours = traceContours(smoothedLabels, width, height);
      
      // STEP 7: Generate edge image
      console.log('Step 7: Generating edge image...');
      const contoursData = detectEdges(smoothedLabels, width, height);
      
      // STEP 8: Generate SVG
      console.log('Step 8: Generating SVG...');
      const svg = generateSVG(contours, mergedZones, palette, width, height);
      
      // STEP 9: Create numbered version
      console.log('Step 9: Creating numbered version...');
      const numberedData = createNumberedVersion(quantizedData, mergedZones, palette);
      
      // STEP 10: Generate legend
      console.log('Step 10: Generating legend...');
      const legend = generateLegend(mergedZones, palette, width * height);
      
      console.log(`Processing complete: ${mergedZones.length} zones, ${contours.length} contours`);
      
      resolve({
        contours: contoursData,
        numbered: numberedData,
        colorized: quantizedData,
        palette,
        zones: mergedZones,
        svg,
        legend
      });
    };

    reader.readAsDataURL(imageFile);
  });
}
