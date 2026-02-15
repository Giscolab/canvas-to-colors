/**
 * Utilities for color space conversion and perceptual color distance
 * Implements Lab color space and ΔE2000 (CIEDE2000) for accurate color comparison
 * Enhanced with input validation, caching, and angle normalization
 */

import { LRUCache } from './lruCache';

// ============= ANGLE CONVERSION HELPERS =============

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function toRadians(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

function toDegrees(radians: number): number {
  return radians * RAD_TO_DEG;
}

// ============= RGB VALIDATION =============

/**
 * Clamp RGB values to valid range [0-255]
 */
function clampRgb(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

// ============= LAB CACHE =============

/**
 * Optimized Lab cache for RGB to Lab conversions
 * Reduced size (500) for better memory management with heavy processing
 */
const labCache = new LRUCache<[number, number, number]>(500, 10 * 60 * 1000);

// ============= COLOR SPACE CONVERSION =============

/**
 * Convert RGB to XYZ color space (D65 illuminant)
 * Input values are automatically clamped to [0-255]
 */
function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  // Clamp and validate inputs
  r = clampRgb(r);
  g = clampRgb(g);
  b = clampRgb(b);
  // Normalize to 0-1
  let rNorm = r / 255;
  let gNorm = g / 255;
  let bNorm = b / 255;

  // Apply gamma correction
  rNorm = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
  gNorm = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
  bNorm = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;

  rNorm *= 100;
  gNorm *= 100;
  bNorm *= 100;

  // Observer = 2°, Illuminant = D65
  const x = rNorm * 0.4124564 + gNorm * 0.3575761 + bNorm * 0.1804375;
  const y = rNorm * 0.2126729 + gNorm * 0.7151522 + bNorm * 0.0721750;
  const z = rNorm * 0.0193339 + gNorm * 0.1191920 + bNorm * 0.9503041;

  return [x, y, z];
}

/**
 * Convert XYZ to Lab color space (D65 illuminant)
 */
function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  // D65 reference white point
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;

  let xNorm = x / refX;
  let yNorm = y / refY;
  let zNorm = z / refZ;

  const f = (t: number) => t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t) + (16 / 116);

  xNorm = f(xNorm);
  yNorm = f(yNorm);
  zNorm = f(zNorm);

  const L = (116 * yNorm) - 16;
  const a = 500 * (xNorm - yNorm);
  const b = 200 * (yNorm - zNorm);

  return [L, a, b];
}

/**
 * Convert RGB to Lab color space with caching
 * @param r - Red component (0-255, will be clamped)
 * @param g - Green component (0-255, will be clamped)
 * @param b - Blue component (0-255, will be clamped)
 * @returns [L, a, b] where L is 0-100, a and b are typically -128 to 127
 * @example
 * const lab = rgbToLab(255, 0, 0); // Pure red
 * console.log(lab); // [53.24, 80.09, 67.20]
 */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // Clamp inputs first to ensure cache key consistency
  r = clampRgb(r);
  g = clampRgb(g);
  b = clampRgb(b);
  
  // Check cache
  const key = `${r},${g},${b}`;
  const cached = labCache.get(key);
  if (cached) return cached;
  
  // Calculate and cache
  const [x, y, z] = rgbToXyz(r, g, b);
  const lab = xyzToLab(x, y, z);
  labCache.set(key, lab);
  
  return lab;
}

/**
 * Calculate ΔE2000 (CIEDE2000) color difference
 * More accurate perceptual color distance than Euclidean distance
 * @returns Distance value (0 = identical, capped at 100 max)
 */
export function deltaE2000(
  lab1: [number, number, number],
  lab2: [number, number, number]
): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  // Calculate Chroma
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab = (C1 + C2) / 2;

  // Calculate G
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cab, 7) / (Math.pow(Cab, 7) + Math.pow(25, 7))));

  // Calculate a'
  const ap1 = (1 + G) * a1;
  const ap2 = (1 + G) * a2;

  // Calculate C'
  const Cp1 = Math.sqrt(ap1 * ap1 + b1 * b1);
  const Cp2 = Math.sqrt(ap2 * ap2 + b2 * b2);

  // Calculate h' (in degrees)
  let hp1 = 0;
  if (b1 !== 0 || ap1 !== 0) {
    hp1 = toDegrees(Math.atan2(b1, ap1));
    if (hp1 < 0) hp1 += 360;
  }

  let hp2 = 0;
  if (b2 !== 0 || ap2 !== 0) {
    hp2 = toDegrees(Math.atan2(b2, ap2));
    if (hp2 < 0) hp2 += 360;
  }

  // Calculate ΔL', ΔC', ΔH'
  const dL = L2 - L1;
  const dC = Cp2 - Cp1;

  let dhp = 0;
  const Cp1Cp2 = Cp1 * Cp2;
  if (Cp1Cp2 !== 0) {
    dhp = hp2 - hp1;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }

  const dH = 2 * Math.sqrt(Cp1Cp2) * Math.sin(toRadians(dhp) / 2);

  // Calculate CIEDE2000
  const Lp = (L1 + L2) / 2;
  const Cp = (Cp1 + Cp2) / 2;

  let hp = 0;
  if (Cp1Cp2 !== 0) {
    hp = (hp1 + hp2) / 2;
    if (Math.abs(hp1 - hp2) > 180) {
      if (hp < 180) hp += 180;
      else hp -= 180;
    }
  }

  const T =
    1 -
    0.17 * Math.cos(toRadians(hp - 30)) +
    0.24 * Math.cos(toRadians(2 * hp)) +
    0.32 * Math.cos(toRadians(3 * hp + 6)) -
    0.20 * Math.cos(toRadians(4 * hp - 63));

  const dTheta = 30 * Math.exp(-Math.pow((hp - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(Cp, 7) / (Math.pow(Cp, 7) + Math.pow(25, 7)));
  const SL = 1 + (0.015 * Math.pow(Lp - 50, 2)) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
  const SC = 1 + 0.045 * Cp;
  const SH = 1 + 0.015 * Cp * T;
  const RT = -Math.sin(toRadians(2 * dTheta)) * RC;

  const kL = 1.0;
  const kC = 1.0;
  const kH = 1.0;

  const deltaE = Math.sqrt(
    Math.pow(dL / (kL * SL), 2) +
      Math.pow(dC / (kC * SC), 2) +
      Math.pow(dH / (kH * SH), 2) +
      RT * (dC / (kC * SC)) * (dH / (kH * SH))
  );

  // Cap at 100 to prevent extreme values
  return Math.min(100, deltaE);
}

/**
 * Convert RGB color to hex string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate perceptual distance between two RGB colors using ΔE2000
 */
export function perceptualDistance(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const lab1 = rgbToLab(rgb1[0], rgb1[1], rgb1[2]);
  const lab2 = rgbToLab(rgb2[0], rgb2[1], rgb2[2]);
  return deltaE2000(lab1, lab2);
}

// ============= SMART COLOR ADAPTATION =============

/**
 * Convert RGB to HSL (Hue, Saturation, Lightness)
 * @returns [H (0-360), S (0-100), L (0-100)]
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r = clampRgb(r) / 255;
  g = clampRgb(g) / 255;
  b = clampRgb(b) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / delta + 2) / 6;
        break;
      case b:
        h = ((r - g) / delta + 4) / 6;
        break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

/**
 * Convert HSL to RGB
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns [R, G, B] (0-255)
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Balance a color palette by adjusting lightness, saturation and contrast
 * @param palette Array of hex colors
 * @param options Balance options
 * @returns Balanced palette with same length
 */
export function balancePalette(
  palette: string[],
  options: {
    targetLightness?: number; // 0-100, default: 50
    targetSaturation?: number; // 0-100, default: 60
    contrastBoost?: number; // 0-100, default: 20
    preserveHue?: boolean; // default: true
  } = {}
): string[] {
  const {
    targetLightness = 50,
    targetSaturation = 60,
    contrastBoost = 20,
    preserveHue = true,
  } = options;

  if (palette.length === 0) return [];

  // Convert all colors to HSL
  const hslColors = palette.map(hex => {
    const match = hex.match(/^#?([0-9a-f]{6})$/i);
    if (!match) return [0, 0, 0] as [number, number, number];
    
    const r = parseInt(match[1].slice(0, 2), 16);
    const g = parseInt(match[1].slice(2, 4), 16);
    const b = parseInt(match[1].slice(4, 6), 16);
    return rgbToHsl(r, g, b);
  });

  // Calculate current averages
  const avgLightness = hslColors.reduce((sum, [_, __, l]) => sum + l, 0) / hslColors.length;
  const avgSaturation = hslColors.reduce((sum, [_, s]) => sum + s, 0) / hslColors.length;

  // Calculate adjustment factors
  const lightnessShift = targetLightness - avgLightness;
  const saturationMultiplier = avgSaturation > 0 ? targetSaturation / avgSaturation : 1;

  // Balance each color
  const balanced = hslColors.map(([h, s, l]) => {
    let newH = h;
    let newS = s;
    let newL = l;

    // Adjust saturation
    newS = Math.min(100, Math.max(0, s * saturationMultiplier));

    // Adjust lightness
    newL = Math.min(100, Math.max(0, l + lightnessShift));

    // Boost contrast: push lights lighter, darks darker
    if (contrastBoost > 0) {
      const contrastFactor = contrastBoost / 100;
      if (newL > 50) {
        newL = newL + (100 - newL) * contrastFactor * 0.3;
      } else {
        newL = newL - newL * contrastFactor * 0.3;
      }
      newL = Math.min(100, Math.max(0, newL));
    }

    // Preserve original hue if requested
    if (!preserveHue) {
      // Slightly shift hues for artistic effect (optional)
      newH = (h + 5) % 360;
    }

    return [newH, newS, newL] as [number, number, number];
  });

  // Convert back to hex
  return balanced.map(([h, s, l]) => {
    const [r, g, b] = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
  });
}

/**
 * Calculate average ΔE between two palettes
 * Useful for measuring the impact of palette adaptation
 */
export function averagePaletteDeltaE(
  palette1: string[],
  palette2: string[]
): number {
  if (palette1.length !== palette2.length || palette1.length === 0) {
    return 0;
  }

  let totalDelta = 0;
  for (let i = 0; i < palette1.length; i++) {
    const hex1 = palette1[i];
    const hex2 = palette2[i];
    
    const match1 = hex1.match(/^#?([0-9a-f]{6})$/i);
    const match2 = hex2.match(/^#?([0-9a-f]{6})$/i);
    
    if (!match1 || !match2) continue;
    
    const r1 = parseInt(match1[1].slice(0, 2), 16);
    const g1 = parseInt(match1[1].slice(2, 4), 16);
    const b1 = parseInt(match1[1].slice(4, 6), 16);
    
    const r2 = parseInt(match2[1].slice(0, 2), 16);
    const g2 = parseInt(match2[1].slice(2, 4), 16);
    const b2 = parseInt(match2[1].slice(4, 6), 16);
    
    const lab1 = rgbToLab(r1, g1, b1);
    const lab2 = rgbToLab(r2, g2, b2);
    
    totalDelta += deltaE2000(lab1, lab2);
  }

  return totalDelta / palette1.length;
}
