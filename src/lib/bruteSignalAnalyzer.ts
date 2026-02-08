/**
 * BruteImageSignalAnalyzer — Port TypeScript du script Python
 *
 * Analyse stricte d'un signal 2D multicanal (ImageData du navigateur).
 * Aucune interprétation perceptuelle, aucune conversion colorimétrique.
 *
 * Sections :
 *  1. Propriétés physiques
 *  2. Statistiques descriptives brutes par canal (R/G/B)
 *  3. Théorie de l'information (Shannon)
 *  4. Énergie spectrale (FFT 2D Cooley-Tukey)
 *  5. Gradient spatial (Sobel 3×3)
 *  6. Corrélation inter-canaux (Pearson)
 */

// ===================== TYPES =====================

export interface PhysicalProperties {
  dimensions: { width: number; height: number };
  totalSamples: number;
  channels: number;
  dtype: string;
  bytesPerSample: number;
  minValueGlobal: number;
  maxValueGlobal: number;
}

export interface ChannelStatistics {
  mean: number;
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  skewness: number;
  kurtosis: number;
  uniqueSymbols: number;
}

export interface SpectralEnergy {
  totalEnergy: number;
  lowFreqEnergyRatio: number;
  highFreqEnergyRatio: number;
}

export interface GradientStats {
  meanMagnitude: number;
  maxMagnitude: number;
  stdMagnitude: number;
  meanAngleRad: number;
  stdAngleRad: number;
}

export interface BruteSignalReport {
  physical: PhysicalProperties;
  statistics: Record<string, ChannelStatistics>; // channel_0, channel_1, channel_2
  entropy: Record<string, number>;               // channel_0 → H(bits)
  spectral: Record<string, SpectralEnergy>;
  gradient: Record<string, GradientStats>;
  correlation: Record<string, number>;            // ch_0_vs_1 → r
}

// ===================== MAIN =====================

export function analyzeBruteSignal(imageData: ImageData): BruteSignalReport {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  const CHANNELS = 3; // R, G, B (on ignore A)

  // --- Extraire les canaux dans des Float64Array pour la précision ---
  const channels: Float64Array[] = [];
  for (let c = 0; c < CHANNELS; c++) {
    channels.push(new Float64Array(totalPixels));
  }

  let minGlobal = 255;
  let maxGlobal = 0;

  for (let i = 0; i < totalPixels; i++) {
    const base = i * 4;
    for (let c = 0; c < CHANNELS; c++) {
      const v = data[base + c];
      channels[c][i] = v;
      if (v < minGlobal) minGlobal = v;
      if (v > maxGlobal) maxGlobal = v;
    }
  }

  // 1. Physical
  const physical: PhysicalProperties = {
    dimensions: { width, height },
    totalSamples: totalPixels,
    channels: CHANNELS,
    dtype: "uint8",
    bytesPerSample: 1,
    minValueGlobal: minGlobal,
    maxValueGlobal: maxGlobal,
  };

  // 2. Statistics
  const statistics: Record<string, ChannelStatistics> = {};
  for (let c = 0; c < CHANNELS; c++) {
    statistics[`channel_${c}`] = computeChannelStats(channels[c]);
  }

  // 3. Entropy
  const entropy: Record<string, number> = {};
  for (let c = 0; c < CHANNELS; c++) {
    entropy[`channel_${c}`] = computeShannonEntropy(channels[c], totalPixels);
  }

  // 4. Spectral
  const spectral: Record<string, SpectralEnergy> = {};
  for (let c = 0; c < CHANNELS; c++) {
    spectral[`channel_${c}`] = computeSpectralEnergy(channels[c], width, height);
  }

  // 5. Gradient
  const gradient: Record<string, GradientStats> = {};
  for (let c = 0; c < CHANNELS; c++) {
    gradient[`channel_${c}`] = computeGradientStats(channels[c], width, height);
  }

  // 6. Correlation
  const correlation: Record<string, number> = {};
  for (let i = 0; i < CHANNELS; i++) {
    for (let j = i + 1; j < CHANNELS; j++) {
      correlation[`ch_${i}_vs_${j}`] = pearsonCorrelation(channels[i], channels[j]);
    }
  }

  return { physical, statistics, entropy, spectral, gradient, correlation };
}

// ===================== 2. STATISTIQUES =====================

function computeChannelStats(channel: Float64Array): ChannelStatistics {
  const n = channel.length;
  if (n === 0) {
    return { mean: 0, variance: 0, stdDev: 0, min: 0, max: 0, skewness: 0, kurtosis: 0, uniqueSymbols: 0 };
  }

  let sum = 0;
  let minV = Infinity;
  let maxV = -Infinity;
  const uniqueSet = new Set<number>();

  for (let i = 0; i < n; i++) {
    const v = channel[i];
    sum += v;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
    uniqueSet.add(v);
  }

  const mean = sum / n;

  // Variance, skewness, kurtosis (single pass)
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;

  for (let i = 0; i < n; i++) {
    const d = channel[i] - mean;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
    m4 += d2 * d2;
  }

  const variance = m2 / n;
  const stdDev = Math.sqrt(variance);

  // Skewness = E[(X-μ)³] / σ³
  const skewness = stdDev > 0 ? (m3 / n) / (stdDev * stdDev * stdDev) : 0;

  // Excess kurtosis = E[(X-μ)⁴] / σ⁴ - 3
  const kurtosis = stdDev > 0 ? (m4 / n) / (variance * variance) - 3 : 0;

  return {
    mean: round4(mean),
    variance: round4(variance),
    stdDev: round4(stdDev),
    min: minV,
    max: maxV,
    skewness: round4(skewness),
    kurtosis: round4(kurtosis),
    uniqueSymbols: uniqueSet.size,
  };
}

// ===================== 3. ENTROPIE =====================

function computeShannonEntropy(channel: Float64Array, totalPixels: number): number {
  // Histogramme 256 bins (uint8)
  const hist = new Uint32Array(256);
  for (let i = 0; i < channel.length; i++) {
    hist[channel[i]]++;
  }

  let H = 0;
  for (let i = 0; i < 256; i++) {
    if (hist[i] > 0) {
      const p = hist[i] / totalPixels;
      H -= p * Math.log2(p);
    }
  }

  return round4(H);
}

// ===================== 4. FFT 2D =====================

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * Cooley-Tukey radix-2 FFT in-place
 * real/imag sont des Float64Array de longueur N (puissance de 2)
 */
function fft1d(real: Float64Array, imag: Float64Array): void {
  const N = real.length;
  // Bit reversal
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

  // Butterfly
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

function computeSpectralEnergy(channel: Float64Array, width: number, height: number): SpectralEnergy {
  const paddedW = nextPow2(width);
  const paddedH = nextPow2(height);

  // Allouer la grille 2D (row-major)
  const real = new Float64Array(paddedW * paddedH);
  const imag = new Float64Array(paddedW * paddedH);

  // Copier les données (zero-padding automatique)
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

  // Énergie = |F|² avec fftshift
  const cx = paddedW >> 1;
  const cy = paddedH >> 1;
  const radius = Math.min(paddedH, paddedW) >> 3; // 1/8
  const r2 = radius * radius;

  let totalEnergy = 0;
  let lowEnergy = 0;

  for (let y = 0; y < paddedH; y++) {
    for (let x = 0; x < paddedW; x++) {
      const idx = y * paddedW + x;
      const energy = real[idx] * real[idx] + imag[idx] * imag[idx];
      totalEnergy += energy;

      // fftshift : le centre DC est à (cx, cy)
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

// ===================== 5. GRADIENT SOBEL =====================

function computeGradientStats(channel: Float64Array, width: number, height: number): GradientStats {
  if (width < 3 || height < 3) {
    return { meanMagnitude: 0, maxMagnitude: 0, stdMagnitude: 0, meanAngleRad: 0, stdAngleRad: 0 };
  }

  const innerW = width - 2;
  const innerH = height - 2;
  const count = innerW * innerH;

  const magnitudes = new Float64Array(count);
  const angles = new Float64Array(count);

  let idx = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Sobel 3×3
      const tl = channel[(y - 1) * width + (x - 1)];
      const tc = channel[(y - 1) * width + x];
      const tr = channel[(y - 1) * width + (x + 1)];
      const ml = channel[y * width + (x - 1)];
      const mr = channel[y * width + (x + 1)];
      const bl = channel[(y + 1) * width + (x - 1)];
      const bc = channel[(y + 1) * width + x];
      const br = channel[(y + 1) * width + (x + 1)];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;

      magnitudes[idx] = Math.sqrt(gx * gx + gy * gy);
      angles[idx] = Math.atan2(gy, gx);
      idx++;
    }
  }

  // Stats sur magnitudes
  let sumMag = 0;
  let maxMag = 0;
  for (let i = 0; i < count; i++) {
    sumMag += magnitudes[i];
    if (magnitudes[i] > maxMag) maxMag = magnitudes[i];
  }
  const meanMag = sumMag / count;

  let varMag = 0;
  for (let i = 0; i < count; i++) {
    const d = magnitudes[i] - meanMag;
    varMag += d * d;
  }
  const stdMag = Math.sqrt(varMag / count);

  // Stats sur angles
  let sumAng = 0;
  for (let i = 0; i < count; i++) sumAng += angles[i];
  const meanAng = sumAng / count;

  let varAng = 0;
  for (let i = 0; i < count; i++) {
    const d = angles[i] - meanAng;
    varAng += d * d;
  }
  const stdAng = Math.sqrt(varAng / count);

  return {
    meanMagnitude: round4(meanMag),
    maxMagnitude: round4(maxMag),
    stdMagnitude: round4(stdMag),
    meanAngleRad: round4(meanAng),
    stdAngleRad: round4(stdAng),
  };
}

// ===================== 6. CORRÉLATION =====================

function pearsonCorrelation(a: Float64Array, b: Float64Array): number {
  const n = a.length;
  if (n === 0) return 0;

  let sumA = 0, sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;

  let cov = 0, varA = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  const denom = Math.sqrt(varA * varB);
  return denom > 0 ? round4(cov / denom) : 0;
}

// ===================== HELPERS =====================

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
