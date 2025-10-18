import { deltaE2000, rgbToLab } from './colorUtils';
import type { Zone } from './imageProcessing';

export interface MergeOptions {
  mergeTolerance: number;
  minMergeArea: number;
  width: number;
  height: number;
  maxIterations?: number;
}

export interface ArtisticMergeStats {
  iterations: number;
  timeMs: number;
  beforeCount: number;
  afterCount: number;
  mergedCount: number;
  averageDeltaE: number;
  mergeTolerance: number;
  minMergeArea: number;
}

export interface ArtisticMergeResult {
  zones: Zone[];
  labels: Int32Array;
  stats: ArtisticMergeStats;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return [r, g, b];
}

function computeCentroid(pixels: Uint32Array, width: number) {
  let sumX = 0;
  let sumY = 0;
  const count = pixels.length;
  for (let i = 0; i < count; i++) {
    const idx = pixels[i];
    sumX += idx % width;
    sumY += Math.floor(idx / width);
  }

  if (count === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: Math.round(sumX / count),
    y: Math.round(sumY / count),
  };
}

function cloneZone(zone: Zone): Zone {
  return {
    ...zone,
    pixels: zone.pixels.slice(),
    centroid: { ...zone.centroid },
  };
}

function collectNeighborIds(
  zone: Zone,
  labels: Int32Array,
  width: number,
  height: number
): number[] {
  const neighbors = new Set<number>();
  for (let i = 0; i < zone.pixels.length; i++) {
    const pixel = zone.pixels[i];
    const x = pixel % width;
    const y = Math.floor(pixel / width);

    const candidates: number[] = [];
    if (x > 0) candidates.push(pixel - 1);
    if (x < width - 1) candidates.push(pixel + 1);
    if (y > 0) candidates.push(pixel - width);
    if (y < height - 1) candidates.push(pixel + width);

    for (const candidate of candidates) {
      const neighborId = labels[candidate];
      if (neighborId !== -1 && neighborId !== zone.id) {
        neighbors.add(neighborId);
      }
    }
  }
  return Array.from(neighbors);
}

export function artisticMerge(
  zones: Zone[],
  labels: Int32Array,
  palette: string[],
  options: MergeOptions
): ArtisticMergeResult {
  const { mergeTolerance, minMergeArea, width, height, maxIterations = 5 } = options;
  const beforeCount = zones.length;
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const workingLabels = new Int32Array(labels);
  const zoneMap = new Map<number, Zone>();
  for (const zone of zones) {
    zoneMap.set(zone.id, cloneZone(zone));
  }

  const paletteLab = palette.map((hex) => {
    const [r, g, b] = hexToRgb(hex);
    return rgbToLab(r, g, b);
  });

  const deltaCache = new Map<string, number>();
  const getDeltaCached = (indexA: number, indexB: number) => {
    const [minIndex, maxIndex] = indexA <= indexB ? [indexA, indexB] : [indexB, indexA];
    const key = `${minIndex}-${maxIndex}`;
    const cached = deltaCache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const labA = paletteLab[minIndex];
    const labB = paletteLab[maxIndex];
    if (!labA || !labB) {
      return Number.POSITIVE_INFINITY;
    }

    const distance = deltaE2000(labA, labB);
    deltaCache.set(key, distance);
    return distance;
  };

  let iterations = 0;
  let mergedCount = 0;
  let totalDeltaE = 0;

  const zoneIds = () => Array.from(zoneMap.keys());

  while (iterations < maxIterations) {
    iterations++;
    let mergedThisIteration = false;

    for (const zoneId of zoneIds()) {
      const zone = zoneMap.get(zoneId);
      if (!zone) continue;

      const neighborIds = collectNeighborIds(zone, workingLabels, width, height);
      if (neighborIds.length === 0) {
        continue;
      }

      let bestNeighborId: number | null = null;
      let bestDeltaE = Number.POSITIVE_INFINITY;

      for (const neighborId of neighborIds) {
        const neighborZone = zoneMap.get(neighborId);
        if (!neighborZone) continue;

        const distance = getDeltaCached(zone.colorIdx, neighborZone.colorIdx);
        if (!isFinite(distance)) continue;
        if (distance < bestDeltaE) {
          bestDeltaE = distance;
          bestNeighborId = neighborId;
        }
      }

      if (bestNeighborId === null) {
        continue;
      }

      const shouldMerge = zone.area < minMergeArea || bestDeltaE <= mergeTolerance;
      if (!shouldMerge) {
        continue;
      }

      const targetZone = zoneMap.get(bestNeighborId);
      if (!targetZone) {
        continue;
      }

      // Merge smaller zone into the neighbor by default
      const recipient = targetZone.area >= zone.area ? targetZone : zone;
      const donor = recipient === targetZone ? zone : targetZone;

      if (recipient.id === donor.id) {
        continue;
      }

      const mergedPixels = new Uint32Array(recipient.pixels.length + donor.pixels.length);
      mergedPixels.set(recipient.pixels);
      mergedPixels.set(donor.pixels, recipient.pixels.length);

      const mergedZone: Zone = {
        ...recipient,
        pixels: mergedPixels,
        area: mergedPixels.length,
        centroid: computeCentroid(mergedPixels, width),
      };

      // Update labels: assign donor pixels to recipient id
      const donorId = donor.id;
      const recipientId = recipient.id;
      for (let i = 0; i < donor.pixels.length; i++) {
        const pixel = donor.pixels[i];
        workingLabels[pixel] = recipientId;
      }

      zoneMap.set(recipientId, mergedZone);
      zoneMap.delete(donorId);

      mergedCount++;
      if (isFinite(bestDeltaE)) {
        totalDeltaE += bestDeltaE;
      }

      mergedThisIteration = true;
      break; // Restart iteration after each merge for stability
    }

    if (!mergedThisIteration) {
      break;
    }
  }

  const afterCount = zoneMap.size;
  const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
  const averageDeltaE = mergedCount > 0 ? totalDeltaE / mergedCount : 0;

  return {
    zones: Array.from(zoneMap.values()),
    labels: workingLabels,
    stats: {
      iterations,
      timeMs: elapsed,
      beforeCount,
      afterCount,
      mergedCount,
      averageDeltaE,
      mergeTolerance,
      minMergeArea,
    },
  };
}

export function computeAverageColor(pixels: Uint32Array, palette: string[], zone: Zone): [number, number, number] {
  const color = palette[zone.colorIdx] ?? '#000000';
  return hexToRgb(color);
}
