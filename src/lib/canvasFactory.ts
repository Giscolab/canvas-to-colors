export type CanvasLike = HTMLCanvasElement | OffscreenCanvas;
export type Canvas2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface CanvasHandle {
  canvas: CanvasLike;
  ctx: Canvas2DContext;
}

export function createCanvasFactory() {
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
