/**
 * Web Worker applying paint + artistic effects off the main thread.
 * Keeps the studio responsive while heavy per-pixel filters run.
 */

import { applyPaintEffect, PaintEffect } from '@/lib/postProcessing';
import { applyArtisticEffect, ArtisticEffect } from '@/lib/artisticEffects';

interface EffectsRequest {
  type: 'apply';
  requestId: number;
  width: number;
  height: number;
  buffer: ArrayBuffer;
  paint: PaintEffect;
  artistic: ArtisticEffect;
}

self.onmessage = (e: MessageEvent<EffectsRequest>) => {
  const { type, requestId, width, height, buffer, paint, artistic } = e.data;
  if (type !== 'apply') return;

  try {
    const started = performance.now();
    let imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);

    if (paint && paint.type !== 'none' && paint.intensity > 0) {
      imageData = applyPaintEffect(imageData, paint);
    }
    if (artistic && artistic.type !== 'none' && artistic.intensity > 0) {
      imageData = applyArtisticEffect(imageData, artistic);
    }

    const out = imageData.data.buffer as ArrayBuffer;
    (self as unknown as { postMessage: (msg: unknown, transfer: Transferable[]) => void }).postMessage(
      {
        type: 'result',
        requestId,
        width: imageData.width,
        height: imageData.height,
        buffer: out,
        durationMs: performance.now() - started,
      },
      [out],
    );
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId,
      error: error instanceof Error ? error.message : 'Effet artistique: erreur inconnue',
    });
  }
};
