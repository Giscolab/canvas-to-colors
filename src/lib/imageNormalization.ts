/**
 * Image normalization utilities for EXIF orientation and resizing
 */

/**
 * Get EXIF orientation from image file
 */
async function getOrientation(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const view = new DataView(e.target?.result as ArrayBuffer);
      if (view.getUint16(0, false) !== 0xFFD8) {
        resolve(1); // Not a JPEG
        return;
      }
      
      const length = view.byteLength;
      let offset = 2;
      
      while (offset < length) {
        if (view.getUint16(offset + 2, false) <= 8) {
          resolve(1);
          return;
        }
        const marker = view.getUint16(offset, false);
        offset += 2;
        
        if (marker === 0xFFE1) {
          // EXIF marker
          if (view.getUint32(offset += 2, false) !== 0x45786966) {
            resolve(1);
            return;
          }
          
          const little = view.getUint16(offset += 6, false) === 0x4949;
          offset += view.getUint32(offset + 4, little);
          const tags = view.getUint16(offset, little);
          offset += 2;
          
          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + (i * 12), little) === 0x0112) {
              const orientation = view.getUint16(offset + (i * 12) + 8, little);
              resolve(orientation);
              return;
            }
          }
        } else if ((marker & 0xFF00) !== 0xFF00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }
      resolve(1);
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Apply EXIF orientation correction to canvas
 */
function applyOrientation(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number
): void {
  switch (orientation) {
    case 2:
      // Horizontal flip
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      // 180° rotate
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      // Vertical flip
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      // Vertical flip + 90° rotate
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      // 90° rotate
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      // Horizontal flip + 90° rotate
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      // 270° rotate
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
    default:
      // No transformation
      break;
  }
}

/**
 * Normalize image: fix EXIF orientation and resize to max dimension
 */
export async function normalizeImage(
  file: File,
  maxDimension: number = 2048
): Promise<{ dataUrl: string; width: number; height: number }> {
  const orientation = await getOrientation(file);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('Failed to read image file'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      img.onload = () => {
        let { width, height } = img;
        
        // Determine if orientation swaps dimensions
        const swapDimensions = orientation >= 5 && orientation <= 8;
        const originalWidth = swapDimensions ? height : width;
        const originalHeight = swapDimensions ? width : height;
        
        // Calculate new dimensions
        let newWidth = originalWidth;
        let newHeight = originalHeight;
        
        if (originalWidth > maxDimension || originalHeight > maxDimension) {
          if (originalWidth > originalHeight) {
            newWidth = maxDimension;
            newHeight = Math.round((originalHeight * maxDimension) / originalWidth);
          } else {
            newHeight = maxDimension;
            newWidth = Math.round((originalWidth * maxDimension) / originalHeight);
          }
        }
        
        // Create canvas with potentially swapped dimensions
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Apply orientation correction
        ctx.save();
        if (swapDimensions) {
          applyOrientation(ctx, orientation, newHeight, newWidth);
        } else {
          applyOrientation(ctx, orientation, newWidth, newHeight);
        }
        
        // Draw image with proper scaling
        const drawWidth = swapDimensions ? newHeight : newWidth;
        const drawHeight = swapDimensions ? newWidth : newHeight;
        ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
        ctx.restore();
        
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', 0.95),
          width: newWidth,
          height: newHeight
        });
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Resize image for display purposes (lighter version)
 */
export async function resizeForDisplay(
  file: File,
  maxDimension: number = 1200
): Promise<string> {
  const result = await normalizeImage(file, maxDimension);
  return result.dataUrl;
}
