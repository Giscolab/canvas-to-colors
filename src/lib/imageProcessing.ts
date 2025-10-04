// Image processing utilities for paint-by-numbers conversion

export interface ProcessedResult {
  contours: ImageData | null;
  numbered: ImageData | null;
  colorized: ImageData | null;
  palette: string[];
  zones: Array<{
    id: number;
    color: string;
    area: number;
  }>;
}

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
    centroids = clusters.map(cluster => {
      if (cluster.length === 0) return centroids[0];
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

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
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
 * Process image: quantize, segment, and generate numbered regions
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
      
      // Scale down if too large
      const maxDim = 800;
      let width = img.width;
      let height = img.height;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height * maxDim) / width;
          width = maxDim;
        } else {
          width = (width * maxDim) / height;
          height = maxDim;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      const imageData = ctx.getImageData(0, 0, width, height);
      
      // 1. Extract palette
      const palette = quantizeColors(imageData, numColors);
      
      // 2. Map pixels to palette (create quantized image)
      const quantizedData = new ImageData(width, height);
      const colorMap: number[] = [];
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        
        // Find nearest palette color
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
      
      // 3. Detect edges for contours
      const contoursData = detectEdges(quantizedData);
      
      // 4. Create numbered version
      const numberedData = createNumberedVersion(quantizedData, colorMap, palette);
      
      // 5. Calculate zones
      const zones = calculateZones(colorMap, palette, width, height);
      
      resolve({
        contours: contoursData,
        numbered: numberedData,
        colorized: quantizedData,
        palette,
        zones
      });
    };

    reader.readAsDataURL(imageFile);
  });
}

function detectEdges(imageData: ImageData): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const result = new ImageData(width, height);
  
  // Simple edge detection: compare adjacent pixels
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const centerR = imageData.data[idx];
      
      // Check 4 neighbors
      const topIdx = ((y - 1) * width + x) * 4;
      const bottomIdx = ((y + 1) * width + x) * 4;
      const leftIdx = (y * width + (x - 1)) * 4;
      const rightIdx = (y * width + (x + 1)) * 4;
      
      const isEdge = 
        imageData.data[topIdx] !== centerR ||
        imageData.data[bottomIdx] !== centerR ||
        imageData.data[leftIdx] !== centerR ||
        imageData.data[rightIdx] !== centerR;
      
      if (isEdge) {
        result.data[idx] = 0;
        result.data[idx + 1] = 0;
        result.data[idx + 2] = 0;
      } else {
        result.data[idx] = 255;
        result.data[idx + 1] = 255;
        result.data[idx + 2] = 255;
      }
      result.data[idx + 3] = 255;
    }
  }
  
  return result;
}

function createNumberedVersion(
  imageData: ImageData, 
  colorMap: number[], 
  palette: string[]
): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const result = new ImageData(width, height);
  
  // Copy the quantized image as base
  for (let i = 0; i < imageData.data.length; i++) {
    result.data[i] = imageData.data[i];
  }
  
  // Add numbers in regions (simple version: one number per color region)
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(result, 0, 0);
  
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  
  // Add a number for each color (simplified version)
  palette.forEach((color, idx) => {
    const x = 50 + (idx % 5) * 60;
    const y = 30 + Math.floor(idx / 5) * 40;
    ctx.strokeText(`${idx + 1}`, x, y);
    ctx.fillText(`${idx + 1}`, x, y);
  });
  
  return ctx.getImageData(0, 0, width, height);
}

function calculateZones(
  colorMap: number[], 
  palette: string[], 
  width: number, 
  height: number
): Array<{ id: number; color: string; area: number }> {
  const zoneCounts: { [key: number]: number } = {};
  
  colorMap.forEach(colorIdx => {
    zoneCounts[colorIdx] = (zoneCounts[colorIdx] || 0) + 1;
  });
  
  const totalPixels = width * height;
  
  return Object.entries(zoneCounts).map(([colorIdx, count]) => ({
    id: parseInt(colorIdx) + 1,
    color: palette[parseInt(colorIdx)],
    area: Math.round((count / totalPixels) * 100)
  }));
}
