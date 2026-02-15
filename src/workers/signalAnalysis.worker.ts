/**
 * Web Worker dédié au calcul FFT 2D pour l'analyse spectrale.
 * Retourne les ratios d'énergie ET une heatmap log-magnitude downsampled.
 */

interface SpectralEnergy {
  totalEnergy: number;
  lowFreqEnergyRatio: number;
  highFreqEnergyRatio: number;
}

interface WorkerInput {
  type: 'computeSpectral';
  channels: ArrayBuffer[];
  width: number;
  height: number;
}

interface WorkerOutput {
  type: 'result' | 'error';
  spectral?: Record<string, SpectralEnergy>;
  /** Combined luminance heatmap (log magnitude, fftshift, normalized 0-255) */
  heatmap?: { width: number; height: number; data: ArrayBuffer };
  error?: string;
}

const HEATMAP_MAX_DIM = 192;

// ===================== FFT =====================

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function fft1d(real: Float64Array, imag: Float64Array): void {
  const N = real.length;
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const half = len >> 1;
    const angle = -2 * Math.PI / len;
    const wR = Math.cos(angle);
    const wI = Math.sin(angle);
    for (let i = 0; i < N; i += len) {
      let curR = 1, curI = 0;
      for (let j = 0; j < half; j++) {
        const u = i + j, v = u + half;
        const tR = curR * real[v] - curI * imag[v];
        const tI = curR * imag[v] + curI * real[v];
        real[v] = real[u] - tR;
        imag[v] = imag[u] - tI;
        real[u] += tR;
        imag[u] += tI;
        const newCurR = curR * wR - curI * wI;
        curI = curR * wI + curI * wR;
        curR = newCurR;
      }
    }
  }
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/**
 * Compute FFT 2D and return energy ratios + raw magnitude grid (fftshifted).
 */
function computeFFT2D(
  channel: Float64Array, width: number, height: number
): { spectral: SpectralEnergy; magnitudeGrid: Float64Array; paddedW: number; paddedH: number } {
  const paddedW = nextPow2(width);
  const paddedH = nextPow2(height);
  const real = new Float64Array(paddedW * paddedH);
  const imag = new Float64Array(paddedW * paddedH);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      real[y * paddedW + x] = channel[y * width + x];
    }
  }

  // FFT rows
  const rowR = new Float64Array(paddedW);
  const rowI = new Float64Array(paddedW);
  for (let y = 0; y < paddedH; y++) {
    const offset = y * paddedW;
    rowR.set(real.subarray(offset, offset + paddedW));
    rowI.fill(0);
    fft1d(rowR, rowI);
    real.set(rowR, offset);
    imag.set(rowI, offset);
  }

  // FFT columns
  const colR = new Float64Array(paddedH);
  const colI = new Float64Array(paddedH);
  for (let x = 0; x < paddedW; x++) {
    for (let y = 0; y < paddedH; y++) {
      colR[y] = real[y * paddedW + x];
      colI[y] = imag[y * paddedW + x];
    }
    fft1d(colR, colI);
    for (let y = 0; y < paddedH; y++) {
      real[y * paddedW + x] = colR[y];
      imag[y * paddedW + x] = colI[y];
    }
  }

  // Compute energy with fftshift + build shifted magnitude grid
  const cx = paddedW >> 1;
  const cy = paddedH >> 1;
  const radius = Math.min(paddedH, paddedW) >> 3;
  const r2 = radius * radius;

  let totalEnergy = 0, lowEnergy = 0;
  const magnitudeGrid = new Float64Array(paddedW * paddedH);

  for (let y = 0; y < paddedH; y++) {
    for (let x = 0; x < paddedW; x++) {
      const idx = y * paddedW + x;
      const energy = real[idx] * real[idx] + imag[idx] * imag[idx];
      totalEnergy += energy;

      // fftshift coordinates
      const sx = ((x + cx) % paddedW) - cx;
      const sy = ((y + cy) % paddedH) - cy;
      if (sx * sx + sy * sy <= r2) lowEnergy += energy;

      // Store shifted magnitude
      const shiftedX = (x + cx) % paddedW;
      const shiftedY = (y + cy) % paddedH;
      magnitudeGrid[shiftedY * paddedW + shiftedX] = Math.sqrt(energy);
    }
  }

  return {
    spectral: {
      totalEnergy: round4(totalEnergy),
      lowFreqEnergyRatio: totalEnergy > 0 ? round4(lowEnergy / totalEnergy) : 0,
      highFreqEnergyRatio: totalEnergy > 0 ? round4((totalEnergy - lowEnergy) / totalEnergy) : 0,
    },
    magnitudeGrid,
    paddedW,
    paddedH,
  };
}

/**
 * Generate a downsampled heatmap from combined magnitude grids (log scale, normalized).
 */
function generateHeatmap(
  grids: Float64Array[],
  paddedW: number,
  paddedH: number
): { width: number; height: number; data: Uint8Array } {
  // Determine downsample factor
  const scale = Math.max(1, Math.ceil(Math.max(paddedW, paddedH) / HEATMAP_MAX_DIM));
  const outW = Math.ceil(paddedW / scale);
  const outH = Math.ceil(paddedH / scale);

  // Average magnitude across channels, then log scale
  const logMap = new Float64Array(outW * outH);
  let maxLog = -Infinity;

  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      const sy = Math.min(oy * scale, paddedH - 1);
      const sx = Math.min(ox * scale, paddedW - 1);
      let sum = 0;
      for (const grid of grids) {
        sum += grid[sy * paddedW + sx];
      }
      const avg = sum / grids.length;
      const logVal = Math.log1p(avg); // log(1 + mag) to handle zeros
      logMap[oy * outW + ox] = logVal;
      if (logVal > maxLog) maxLog = logVal;
    }
  }

  // Normalize to 0-255
  const result = new Uint8Array(outW * outH);
  const invMax = maxLog > 0 ? 255 / maxLog : 0;
  for (let i = 0; i < logMap.length; i++) {
    result[i] = Math.round(logMap[i] * invMax);
  }

  return { width: outW, height: outH, data: result };
}

// ===================== MESSAGE HANDLER =====================

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { type, channels, width, height } = e.data;

  if (type !== 'computeSpectral') {
    const resp: WorkerOutput = { type: 'error', error: `Unknown type: ${type}` };
    self.postMessage(resp);
    return;
  }

  try {
    const spectral: Record<string, SpectralEnergy> = {};
    const magnitudeGrids: Float64Array[] = [];
    let pw = 0, ph = 0;

    for (let c = 0; c < channels.length; c++) {
      const channelData = new Float64Array(channels[c]);
      const result = computeFFT2D(channelData, width, height);
      spectral[`channel_${c}`] = result.spectral;
      magnitudeGrids.push(result.magnitudeGrid);
      pw = result.paddedW;
      ph = result.paddedH;
    }

    // Generate combined luminance heatmap
    const heatmap = generateHeatmap(magnitudeGrids, pw, ph);
    const heatmapBuffer = heatmap.data.buffer.slice(0) as ArrayBuffer;

    const resp: WorkerOutput = {
      type: 'result',
      spectral,
      heatmap: { width: heatmap.width, height: heatmap.height, data: heatmapBuffer },
    };
    (self as unknown as { postMessage(msg: unknown, transfer: Transferable[]): void }).postMessage(resp, [heatmapBuffer]);
  } catch (err) {
    const resp: WorkerOutput = {
      type: 'error',
      error: err instanceof Error ? err.message : 'FFT computation failed',
    };
    self.postMessage(resp);
  }
};
