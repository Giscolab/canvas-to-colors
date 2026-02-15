/**
 * Web Worker dédié au calcul FFT 2D pour l'analyse spectrale.
 * Offload le calcul intensif (Cooley-Tukey radix-2) hors du thread principal.
 */

interface SpectralEnergy {
  totalEnergy: number;
  lowFreqEnergyRatio: number;
  highFreqEnergyRatio: number;
}

interface WorkerInput {
  type: 'computeSpectral';
  /** Raw channel data as Float64Array, one per channel */
  channels: ArrayBuffer[];
  width: number;
  height: number;
}

interface WorkerOutput {
  type: 'result' | 'error';
  spectral?: Record<string, SpectralEnergy>;
  error?: string;
}

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
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
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
      let curR = 1;
      let curI = 0;
      for (let j = 0; j < half; j++) {
        const u = i + j;
        const v = u + half;
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

function computeSpectralEnergy(channel: Float64Array, width: number, height: number): SpectralEnergy {
  const paddedW = nextPow2(width);
  const paddedH = nextPow2(height);

  const real = new Float64Array(paddedW * paddedH);
  const imag = new Float64Array(paddedW * paddedH);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      real[y * paddedW + x] = channel[y * width + x];
    }
  }

  // FFT par lignes
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

  // FFT par colonnes
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

  // Énergie avec fftshift
  const cx = paddedW >> 1;
  const cy = paddedH >> 1;
  const radius = Math.min(paddedH, paddedW) >> 3;
  const r2 = radius * radius;

  let totalEnergy = 0;
  let lowEnergy = 0;

  for (let y = 0; y < paddedH; y++) {
    for (let x = 0; x < paddedW; x++) {
      const idx = y * paddedW + x;
      const energy = real[idx] * real[idx] + imag[idx] * imag[idx];
      totalEnergy += energy;

      const sx = ((x + cx) % paddedW) - cx;
      const sy = ((y + cy) % paddedH) - cy;
      if (sx * sx + sy * sy <= r2) {
        lowEnergy += energy;
      }
    }
  }

  const highEnergy = totalEnergy - lowEnergy;

  return {
    totalEnergy: round4(totalEnergy),
    lowFreqEnergyRatio: totalEnergy > 0 ? round4(lowEnergy / totalEnergy) : 0,
    highFreqEnergyRatio: totalEnergy > 0 ? round4(highEnergy / totalEnergy) : 0,
  };
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

    for (let c = 0; c < channels.length; c++) {
      const channelData = new Float64Array(channels[c]);
      spectral[`channel_${c}`] = computeSpectralEnergy(channelData, width, height);
    }

    const resp: WorkerOutput = { type: 'result', spectral };
    self.postMessage(resp);
  } catch (err) {
    const resp: WorkerOutput = {
      type: 'error',
      error: err instanceof Error ? err.message : 'FFT computation failed',
    };
    self.postMessage(resp);
  }
};
