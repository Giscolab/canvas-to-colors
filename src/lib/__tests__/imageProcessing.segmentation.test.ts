import { describe, expect, it } from 'vitest';

class MockOffscreenCanvas {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext() {
    return {
      drawImage: () => undefined,
      getImageData: () => ({ data: new Uint8ClampedArray(this.width * this.height * 4) }),
      putImageData: () => undefined,
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      clearRect: () => undefined,
      fillRect: () => undefined,
      beginPath: () => undefined,
      moveTo: () => undefined,
      lineTo: () => undefined,
      stroke: () => undefined,
      fillText: () => undefined,
      measureText: () => ({ width: 0 }),
      save: () => undefined,
      restore: () => undefined,
      scale: () => undefined,
      translate: () => undefined,
      setTransform: () => undefined,
      font: '',
      textAlign: 'center',
      textBaseline: 'middle',
    } as unknown as OffscreenCanvasRenderingContext2D;
  }
}

globalThis.OffscreenCanvas = MockOffscreenCanvas as unknown as typeof OffscreenCanvas;

describe('labelConnectedComponents - large uniform color segmentation', () => {
  const testCases = [
    { width: 1200, height: 1200 },
    { width: 1500, height: 1500 },
  ];

  it.each(testCases)('returns one contiguous zone covering all pixels for $width×$height', async ({ width, height }) => {
    const { labelConnectedComponents } = await import('../imageProcessing');

    const totalPixels = width * height;
    const colorMap = new Array<number>(totalPixels).fill(3);

    const { labels, zones } = labelConnectedComponents(colorMap, width, height);

    expect(zones.length).toBe(1);
    expect(zones[0].area).toBe(totalPixels);
    expect(labels.length).toBe(totalPixels);

    let allLabelsAreZero = true;
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] !== 0) {
        allLabelsAreZero = false;
        break;
      }
    }

    expect(allLabelsAreZero).toBe(true);
  }, 60_000);
});
