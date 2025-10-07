/**
 * Utilities for color space conversion and perceptual color distance
 * Implements Lab color space and ΔE2000 (CIEDE2000) for accurate color comparison
 */

/**
 * Convert RGB to XYZ color space (D65 illuminant)
 */
function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
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
 * Convert RGB to Lab color space
 * @returns [L, a, b] where L is 0-100, a and b are typically -128 to 127
 */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

/**
 * Calculate ΔE2000 (CIEDE2000) color difference
 * More accurate perceptual color distance than Euclidean distance
 * @returns Distance value (0 = identical, >2.3 = noticeable difference)
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

  // Calculate h'
  let hp1 = 0;
  if (b1 !== 0 || ap1 !== 0) {
    hp1 = Math.atan2(b1, ap1);
    if (hp1 < 0) hp1 += 2 * Math.PI;
    hp1 = (hp1 * 180) / Math.PI;
  }

  let hp2 = 0;
  if (b2 !== 0 || ap2 !== 0) {
    hp2 = Math.atan2(b2, ap2);
    if (hp2 < 0) hp2 += 2 * Math.PI;
    hp2 = (hp2 * 180) / Math.PI;
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

  const dH = 2 * Math.sqrt(Cp1Cp2) * Math.sin((dhp * Math.PI) / 360);

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
    0.17 * Math.cos(((hp - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hp * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hp + 6) * Math.PI) / 180) -
    0.20 * Math.cos(((4 * hp - 63) * Math.PI) / 180);

  const dTheta = 30 * Math.exp(-Math.pow((hp - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(Cp, 7) / (Math.pow(Cp, 7) + Math.pow(25, 7)));
  const SL = 1 + (0.015 * Math.pow(Lp - 50, 2)) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
  const SC = 1 + 0.045 * Cp;
  const SH = 1 + 0.015 * Cp * T;
  const RT = -Math.sin((2 * dTheta * Math.PI) / 180) * RC;

  const kL = 1.0;
  const kC = 1.0;
  const kH = 1.0;

  const deltaE = Math.sqrt(
    Math.pow(dL / (kL * SL), 2) +
      Math.pow(dC / (kC * SC), 2) +
      Math.pow(dH / (kH * SH), 2) +
      RT * (dC / (kC * SC)) * (dH / (kH * SH))
  );

  return deltaE;
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
