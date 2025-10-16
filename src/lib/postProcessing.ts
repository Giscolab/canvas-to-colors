/**
 * Post-Processing Effects Module
 * Simulates artistic painting effects (watercolor, brush strokes)
 * Non-destructive, real-time application
 */

export interface PaintEffect {
  type: 'none' | 'watercolor' | 'brush';
  intensity: number; // 0-100
}

/**
 * Apply artistic paint effect to ImageData
 */
export function applyPaintEffect(
  imageData: ImageData,
  effect: PaintEffect
): ImageData {
  if (effect.type === 'none' || effect.intensity === 0) {
    return imageData;
  }
  
  switch (effect.type) {
    case 'watercolor':
      return applyWatercolorEffect(imageData, effect.intensity);
    case 'brush':
      return applyBrushEffect(imageData, effect.intensity);
    default:
      return imageData;
  }
}

/**
 * Watercolor Effect: Gaussian blur + edge preservation
 */
function applyWatercolorEffect(
  imageData: ImageData,
  intensity: number
): ImageData {
  // Calculate adaptive blur radius (0-5 pixels)
  const blurRadius = Math.round((intensity / 100) * 5);
  
  if (blurRadius === 0) return imageData;
  
  // 1. Apply Gaussian blur
  const blurred = gaussianBlur(imageData, blurRadius);
  
  // 2. Detect edges (Sobel)
  const edges = detectEdges(imageData);
  
  // 3. Blend blur + edges to preserve contours
  return blendWithEdges(blurred, edges, intensity);
}

/**
 * Brush Effect: Adds directional stroke texture
 */
function applyBrushEffect(
  imageData: ImageData,
  intensity: number
): ImageData {
  const output = new ImageData(imageData.width, imageData.height);
  const data = imageData.data;
  const outData = output.data;
  
  // Copy original
  outData.set(data);
  
  // Stroke parameters based on intensity
  const strokeLength = Math.max(2, Math.round((intensity / 100) * 8));
  const strokeOpacity = (intensity / 100) * 0.6;
  
  // Apply stroke texture with directional sampling
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const idx = (y * imageData.width + x) * 4;
      
      // Sample pixels along stroke direction (diagonal)
      let r = 0, g = 0, b = 0, count = 0;
      
      for (let i = -strokeLength; i <= strokeLength; i++) {
        const sx = x + i;
        const sy = y + Math.floor(i * 0.5); // Diagonal direction
        
        if (sx >= 0 && sx < imageData.width && sy >= 0 && sy < imageData.height) {
          const sIdx = (sy * imageData.width + sx) * 4;
          r += data[sIdx];
          g += data[sIdx + 1];
          b += data[sIdx + 2];
          count++;
        }
      }
      
      if (count > 0) {
        // Blend with original based on opacity
        const avgR = r / count;
        const avgG = g / count;
        const avgB = b / count;
        
        outData[idx] = data[idx] * (1 - strokeOpacity) + avgR * strokeOpacity;
        outData[idx + 1] = data[idx + 1] * (1 - strokeOpacity) + avgG * strokeOpacity;
        outData[idx + 2] = data[idx + 2] * (1 - strokeOpacity) + avgB * strokeOpacity;
      }
    }
  }
  
  return output;
}

/**
 * Gaussian Blur using separable kernel (horizontal + vertical pass)
 * Optimized for performance on large images
 */
function gaussianBlur(imageData: ImageData, radius: number): ImageData {
  if (radius < 1) return imageData;
  
  // Generate 1D Gaussian kernel
  const kernel = generateGaussianKernel(radius);
  const kernelSize = kernel.length;
  const halfSize = Math.floor(kernelSize / 2);
  
  // Horizontal pass
  const temp = new ImageData(imageData.width, imageData.height);
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      
      for (let k = 0; k < kernelSize; k++) {
        const sx = Math.max(0, Math.min(imageData.width - 1, x + k - halfSize));
        const idx = (y * imageData.width + sx) * 4;
        const weight = kernel[k];
        
        r += imageData.data[idx] * weight;
        g += imageData.data[idx + 1] * weight;
        b += imageData.data[idx + 2] * weight;
        a += imageData.data[idx + 3] * weight;
      }
      
      const idx = (y * imageData.width + x) * 4;
      temp.data[idx] = r;
      temp.data[idx + 1] = g;
      temp.data[idx + 2] = b;
      temp.data[idx + 3] = a;
    }
  }
  
  // Vertical pass
  const output = new ImageData(imageData.width, imageData.height);
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      
      for (let k = 0; k < kernelSize; k++) {
        const sy = Math.max(0, Math.min(imageData.height - 1, y + k - halfSize));
        const idx = (sy * imageData.width + x) * 4;
        const weight = kernel[k];
        
        r += temp.data[idx] * weight;
        g += temp.data[idx + 1] * weight;
        b += temp.data[idx + 2] * weight;
        a += temp.data[idx + 3] * weight;
      }
      
      const idx = (y * imageData.width + x) * 4;
      output.data[idx] = r;
      output.data[idx + 1] = g;
      output.data[idx + 2] = b;
      output.data[idx + 3] = a;
    }
  }
  
  return output;
}

/**
 * Generate 1D Gaussian kernel
 */
function generateGaussianKernel(radius: number): number[] {
  const sigma = radius / 3;
  const size = radius * 2 + 1;
  const kernel: number[] = new Array(size);
  let sum = 0;
  
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  
  // Normalize
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }
  
  return kernel;
}

/**
 * Edge detection using Sobel operator
 */
function detectEdges(imageData: ImageData): ImageData {
  const output = new ImageData(imageData.width, imageData.height);
  const data = imageData.data;
  const outData = output.data;
  
  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < imageData.height - 1; y++) {
    for (let x = 1; x < imageData.width - 1; x++) {
      let gx = 0, gy = 0;
      
      // Convolve with Sobel kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * imageData.width + (x + kx)) * 4;
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          const ki = (ky + 1) * 3 + (kx + 1);
          
          gx += gray * sobelX[ki];
          gy += gray * sobelY[ki];
        }
      }
      
      // Gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const idx = (y * imageData.width + x) * 4;
      
      outData[idx] = magnitude;
      outData[idx + 1] = magnitude;
      outData[idx + 2] = magnitude;
      outData[idx + 3] = 255;
    }
  }
  
  return output;
}

/**
 * Blend blurred image with edge map to preserve contours
 */
function blendWithEdges(
  blurred: ImageData,
  edges: ImageData,
  intensity: number
): ImageData {
  const output = new ImageData(blurred.width, blurred.height);
  const blurData = blurred.data;
  const edgeData = edges.data;
  const outData = output.data;
  
  const edgeThreshold = 50; // Threshold for edge detection
  const blendFactor = intensity / 100;
  
  for (let i = 0; i < blurData.length; i += 4) {
    const edgeMagnitude = edgeData[i];
    
    // More edge = less blur
    const edgeWeight = Math.min(1, edgeMagnitude / edgeThreshold);
    const blurWeight = (1 - edgeWeight) * blendFactor;
    
    outData[i] = blurData[i] * blurWeight + blurData[i] * (1 - blurWeight);
    outData[i + 1] = blurData[i + 1] * blurWeight + blurData[i + 1] * (1 - blurWeight);
    outData[i + 2] = blurData[i + 2] * blurWeight + blurData[i + 2] * (1 - blurWeight);
    outData[i + 3] = blurData[i + 3];
  }
  
  return output;
}
