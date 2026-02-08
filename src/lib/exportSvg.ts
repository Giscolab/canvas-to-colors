/**
 * Smart SVG Export Module
 * Generates clean, optimized SVG files with color grouping
 * Phase 3.4 - Intelligent vector export
 */

import { ProcessedResult, Zone } from './imageProcessing';
import simplify from 'simplify-js';

export interface SvgExportOptions {
  simplifyTolerance?: number; // 0-5, default 1
  includeMetadata?: boolean; // default true
  groupByColor?: boolean; // default true
  optimizeAttributes?: boolean; // default true
  viewBoxPadding?: number; // default 0
}

const DEFAULT_OPTIONS: SvgExportOptions = {
  simplifyTolerance: 1,
  includeMetadata: true,
  groupByColor: true,
  optimizeAttributes: true,
  viewBoxPadding: 0,
};

/**
 * Export ProcessedResult to optimized SVG
 */
export function exportToSvg(
  processedResult: ProcessedResult,
  options: SvgExportOptions = {}
): Blob {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (!processedResult.zones || !processedResult.palette) {
    throw new Error('Invalid processed result: missing zones or palette');
  }

  const { width, height } = processedResult.metadata || { width: 1000, height: 1000 };
  const svg = generateSvgContent(processedResult, width, height, opts);
  
  return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
}

/**
 * Generate SVG content string
 */
function generateSvgContent(
  result: ProcessedResult,
  width: number,
  height: number,
  options: SvgExportOptions
): string {
  const { zones, palette } = result;
  const padding = options.viewBoxPadding || 0;
  
  // Group zones by color if enabled
  const colorGroups = options.groupByColor
    ? groupZonesByColor(zones, palette)
    : new Map<string, Zone[]>();

  // Build SVG structure
  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" `;
  svg += `viewBox="${-padding} ${-padding} ${width + 2 * padding} ${height + 2 * padding}" `;
  svg += `width="${width}" height="${height}">\n`;

  // Metadata
  if (options.includeMetadata) {
    svg += generateMetadata(result);
  }

  // Definitions (optional: can add patterns, gradients)
  svg += `  <defs>\n`;
  svg += `    <style>\n`;
  svg += `      .zone { stroke: #000; stroke-width: 0.5; stroke-opacity: 0.3; }\n`;
  svg += `    </style>\n`;
  svg += `  </defs>\n\n`;

  // Render zones grouped by color
  if (options.groupByColor && colorGroups.size > 0) {
    for (const [color, zoneGroup] of colorGroups.entries()) {
      svg += `  <g id="color-${color.replace('#', '')}" fill="${color}">\n`;
      for (const zone of zoneGroup) {
        svg += generateZonePath(zone, options);
      }
      svg += `  </g>\n`;
    }
  } else {
    // Render zones individually
    for (const zone of zones) {
      const color = palette[zone.colorIdx];
      svg += generateZonePath(zone, options, color);
    }
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Group zones by color for optimized output
 */
function groupZonesByColor(
  zones: Zone[],
  palette: string[]
): Map<string, Zone[]> {
  const groups = new Map<string, Zone[]>();

  for (const zone of zones) {
    const color = palette[zone.colorIdx];
    if (!groups.has(color)) {
      groups.set(color, []);
    }
    groups.get(color)!.push(zone);
  }

  return groups;
}

/**
 * Generate SVG path for a zone
 */
function generateZonePath(
  zone: Zone,
  options: SvgExportOptions,
  fill?: string
): string {
  // Convert pixel array to polygon points
  const points = pixelsToPolygon(zone.pixels, zone.area);
  
  // Simplify if tolerance > 0
  let simplifiedPoints = points;
  if (options.simplifyTolerance && options.simplifyTolerance > 0) {
    simplifiedPoints = simplify(
      points.map(p => ({ x: p.x, y: p.y })),
      options.simplifyTolerance,
      true
    );
  }

  // Build path data
  const pathData = pointsToPathData(simplifiedPoints);
  
  // Build attributes
  const attrs: string[] = [`d="${pathData}"`];
  if (fill) {
    attrs.push(`fill="${fill}"`);
  }
  attrs.push(`class="zone"`);
  attrs.push(`data-zone-id="${zone.id}"`);

  // Optimize: remove redundant attributes if enabled
  if (options.optimizeAttributes) {
    // Already minimal
  }

  return `    <path ${attrs.join(' ')} />\n`;
}

/**
 * Convert pixel array to polygon boundary points
 */
function pixelsToPolygon(
  pixels: Uint32Array,
  area: number
): Array<{ x: number; y: number }> {
  // For simplicity, extract unique boundary points
  // In production, use marching squares or contour tracing
  const points: Array<{ x: number; y: number }> = [];
  
  // Quick approximation: sample pixels at regular intervals
  const stride = Math.max(1, Math.floor(Math.sqrt(area / 100)));
  
  for (let i = 0; i < pixels.length; i += stride) {
    const pixel = pixels[i];
    const x = pixel & 0xFFFF;
    const y = (pixel >> 16) & 0xFFFF;
    points.push({ x, y });
  }

  return points;
}

/**
 * Convert points array to SVG path data
 */
function pointsToPathData(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';

  let path = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x.toFixed(2)},${points[i].y.toFixed(2)}`;
  }
  
  path += ' Z'; // Close path
  return path;
}

/**
 * Generate SVG metadata section
 */
function generateMetadata(result: ProcessedResult): string {
  const meta = result.metadata;
  const artisticStats = result.artisticMergeStats;
  
  let xml = `  <metadata>\n`;
  xml += `    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n`;
  xml += `      <rdf:Description>\n`;
  xml += `        <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Paint by Numbers - Smart Export</dc:title>\n`;
  xml += `        <dc:format xmlns:dc="http://purl.org/dc/elements/1.1/">image/svg+xml</dc:format>\n`;
  xml += `        <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">PBN Generator v3.4</dc:creator>\n`;
  
  if (meta) {
    xml += `        <pbn:zones xmlns:pbn="http://pbn.app/ns">${result.zones.length}</pbn:zones>\n`;
    xml += `        <pbn:colors xmlns:pbn="http://pbn.app/ns">${result.palette.length}</pbn:colors>\n`;
    xml += `        <pbn:width xmlns:pbn="http://pbn.app/ns">${meta.width}</pbn:width>\n`;
    xml += `        <pbn:height xmlns:pbn="http://pbn.app/ns">${meta.height}</pbn:height>\n`;
  }
  
  if (artisticStats) {
    xml += `        <pbn:merged-zones xmlns:pbn="http://pbn.app/ns">${artisticStats.mergedCount}</pbn:merged-zones>\n`;
    xml += `        <pbn:avg-delta-e xmlns:pbn="http://pbn.app/ns">${artisticStats.averageDeltaE.toFixed(2)}</pbn:avg-delta-e>\n`;
  }
  
  xml += `      </rdf:Description>\n`;
  xml += `    </rdf:RDF>\n`;
  xml += `  </metadata>\n\n`;
  
  return xml;
}

/**
 * Export SVG as data URL (for immediate download)
 */
export function exportToSvgDataUrl(
  processedResult: ProcessedResult,
  options?: SvgExportOptions
): string {
  const blob = exportToSvg(processedResult, options);
  return URL.createObjectURL(blob);
}
