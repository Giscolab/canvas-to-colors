import {
  buildZonesFromLabels,
  consolidateColorMap,
  createNumberedVersion,
  createPreviewFusion,
  detectEdges,
  generateLegend,
  generateSVG,
  hexToRgb,
  labelConnectedComponents,
  mergeAdjacentPolygons,
  mergeNearIdenticalColors,
  mergeSimilarAdjacentZones,
  mergeSmallZones,
  quantizeColors,
  refineZoneLabelPositions,
  smoothZones,
  traceContours
} from './imageProcessing';
import { rgbToLab, deltaE2000, balancePalette, averagePaletteDeltaE } from './colorUtils';
import { artisticMerge, type ArtisticMergeStats } from './regionMerge';
import type { RawImageAnalysis } from './analysisPipeline';
import type { ProcessedResult } from './imageProcessing';

export interface RenderPipelineOptions {
  numColors: number;
  minRegionSize: number;
  smoothness: number;
  mergeTolerance: number;
  enableArtisticMerge: boolean;
  enableSmartPalette: boolean;
  report: (stage: string, progress: number, detail?: string) => void;
}

export interface RenderPipelineResult {
  processed: Omit<ProcessedResult, 'progressLog' | 'metadata'>;
  averageDeltaE?: number;
  artisticMergeStats?: ArtisticMergeStats;
}

export function renderPipeline(
  raw: RawImageAnalysis,
  options: RenderPipelineOptions
): RenderPipelineResult {
  const {
    numColors,
    minRegionSize,
    smoothness,
    mergeTolerance,
    enableArtisticMerge,
    enableSmartPalette,
    report
  } = options;

  const { referenceImageData, referenceGrayscaleMap } = raw;
  const width = referenceImageData.width;
  const height = referenceImageData.height;

  if (referenceGrayscaleMap.length !== width * height) {
    throw new Error('referenceGrayscaleMap incohérente avec referenceImageData.');
  }

  const effectiveMinRegionSize = Math.max(minRegionSize, 20);
  const effectiveMergeTolerance = Math.max(mergeTolerance, 1);
  let artisticMergeStats: ArtisticMergeStats | undefined;

  // === STEP 1: Quantization ===
  report("Quantification des couleurs", 15, `K-means++ sur ${Math.round(referenceImageData.data.length / 4)} pixels`);
  const quantizationStart = Date.now();
  let palette = quantizeColors(referenceImageData, numColors);
  palette = mergeNearIdenticalColors(palette, effectiveMergeTolerance);

  const rawPalette = [...palette];
  let averageDeltaE = 0;

  if (enableSmartPalette) {
    report("Adaptation intelligente de la palette", 30, "Équilibrage chromatique");
    const adaptedPalette = balancePalette(palette, {
      targetLightness: 50,
      targetSaturation: 60,
      contrastBoost: 20,
      preserveHue: true
    });
    averageDeltaE = averagePaletteDeltaE(palette, adaptedPalette);
    palette = adaptedPalette;
    report("Palette optimisée", 33, `ΔE moyen: ${averageDeltaE.toFixed(2)}`);
  } else {
    report("Palette générée", 28, `${palette.length} couleurs extraites en ${Date.now() - quantizationStart}ms`);
  }

  // === STEP 2: Pixel mapping ===
  report("Attribution des pixels", 35, "Calcul des distances perceptuelles ΔE2000");
  const mappingStart = Date.now();

  const colorMap = new Uint16Array(width * height);
  const quantizedData = new ImageData(width, height);

  const paletteLabCache = new Array(palette.length);
  for (let i = 0; i < palette.length; i++) {
    const [r, g, b] = hexToRgb(palette[i]);
    paletteLabCache[i] = rgbToLab(r, g, b);
  }

  let pixelIndex = 0;
  for (let i = 0; i < referenceImageData.data.length; i += 4) {
    const r = referenceImageData.data[i];
    const g = referenceImageData.data[i + 1];
    const b = referenceImageData.data[i + 2];

    const pixelLab = rgbToLab(r, g, b);
    let minDist = Infinity;
    let colorIndex = 0;

    for (let idx = 0; idx < paletteLabCache.length; idx++) {
      const dist = deltaE2000(pixelLab, paletteLabCache[idx]);
      if (dist < minDist) {
        minDist = dist;
        colorIndex = idx;
      }
    }

    colorMap[pixelIndex++] = colorIndex;

    const [qr, qg, qb] = hexToRgb(palette[colorIndex]);
    quantizedData.data[i] = qr;
    quantizedData.data[i + 1] = qg;
    quantizedData.data[i + 2] = qb;
    quantizedData.data[i + 3] = 255;
  }

  report("Attribution terminée", 42, `Carte de couleurs générée en ${Date.now() - mappingStart}ms`);

  // === STEP 2.5: Consolidate near-identical colors ===
  report("Consolidation des couleurs", 44, "Fusion des couleurs perceptuellement identiques");
  const consolidationStart = Date.now();

  const { consolidatedPalette, consolidatedColorMap } = consolidateColorMap(
    palette,
    Array.from(colorMap),
    paletteLabCache,
    effectiveMergeTolerance
  );

  report(
    "Consolidation terminée",
    46,
    `${palette.length - consolidatedPalette.length} couleurs fusionnées en ${Date.now() - consolidationStart}ms`
  );

  palette = consolidatedPalette;
  const newColorMap = new Uint16Array(consolidatedColorMap.length);
  for (let i = 0; i < consolidatedColorMap.length; i++) {
    newColorMap[i] = consolidatedColorMap[i];
  }

  const pixelCount = Math.min(consolidatedColorMap.length, width * height);
  for (let i = 0; i < pixelCount; i++) {
    const colorIndex = consolidatedColorMap[i];
    if (
      typeof colorIndex !== "number" ||
      colorIndex < 0 ||
      colorIndex >= consolidatedPalette.length
    ) continue;

    const [qr, qg, qb] = hexToRgb(consolidatedPalette[colorIndex]);
    const base = i * 4;
    quantizedData.data[base] = qr;
    quantizedData.data[base + 1] = qg;
    quantizedData.data[base + 2] = qb;
    quantizedData.data[base + 3] = 255;
  }

  // === STEP 3: Connected components ===
  report("Segmentation des zones", 48, "Étiquetage des composantes connexes");
  const segmentationStart = Date.now();
  const { labels: initialLabels, zones: initialZones } =
    labelConnectedComponents(Array.from(newColorMap), width, height);
  report(
    "Segmentation terminée",
    52,
    `${initialZones.length} zones détectées en ${Date.now() - segmentationStart}ms`
  );

  // === STEP 4: Merge small zones ===
  report("Fusion des petites zones", 56, `Taille minimale ${effectiveMinRegionSize}px`);
  const mergeStart = Date.now();
  const { mergedLabels, mergedZones } = mergeSmallZones(
    initialZones,
    initialLabels,
    palette,
    width,
    height,
    effectiveMinRegionSize
  );

  // === STEP 4.5: Merge adjacent zones sharing identical colors ===
  const adjacencyTolerance = Math.min(effectiveMergeTolerance / 2, 2);
  let postMergeLabels = mergedLabels;
  let postMergeZones = mergedZones;
  if (adjacencyTolerance > 0 && mergedZones.length > 0) {
    report(
      "Fusion des contours fantômes",
      58,
      `ΔE ≤ ${adjacencyTolerance.toFixed(2)} entre zones adjacentes`
    );
    const adjacencyStart = Date.now();
    const mergedAdjacencyResult = mergeSimilarAdjacentZones(
      mergedZones,
      mergedLabels,
      palette,
      width,
      height,
      adjacencyTolerance
    );
    postMergeLabels = mergedAdjacencyResult.labels;
    postMergeZones = mergedAdjacencyResult.zones;
    report(
      "Contours fantômes fusionnés",
      59,
      `${mergedZones.length - postMergeZones.length} regroupements en ${Date.now() - adjacencyStart}ms`
    );
  }

  report(
    "Fusion terminée",
    60,
    `${postMergeZones.length} zones après fusion en ${Date.now() - mergeStart}ms`
  );

  if (enableArtisticMerge && postMergeZones.length > 0) {
    report(
      "Fusion artistique",
      61,
      `ΔE ≤ ${effectiveMergeTolerance.toFixed(1)} / aire ≤ ${effectiveMinRegionSize}px`
    );

    const artisticResult = artisticMerge(postMergeZones, postMergeLabels, palette, {
      mergeTolerance: effectiveMergeTolerance,
      minMergeArea: effectiveMinRegionSize,
      width,
      height,
    });

    postMergeLabels = artisticResult.labels;
    postMergeZones = artisticResult.zones;
    artisticMergeStats = artisticResult.stats;

    report(
      "Fusion artistique terminée",
      62,
      `${artisticMergeStats.mergedCount} fusions en ${artisticMergeStats.timeMs.toFixed(1)}ms`
    );
  }

  // === STEP 5: Smooth zones ===
  report("Lissage des bords", 64, `Itérations de lissage : ${Math.round(smoothness)}`);
  const smoothStart = Date.now();
  const smoothedLabels = smoothZones(
    postMergeLabels,
    width,
    height,
    Math.round(smoothness)
  );
  const smoothedZones = buildZonesFromLabels(
    smoothedLabels,
    palette,
    width,
    height,
    postMergeZones
  );
  report(
    "Lissage terminé",
    68,
    `${smoothedZones.length} zones prêtes en ${Date.now() - smoothStart}ms`
  );

  // === STEP 6: Edge detection ===
  report("Génération des contours", 90, "Rasterisation des lignes de séparation");
  const contoursData = detectEdges(smoothedLabels, referenceGrayscaleMap, width, height);

  // === STEP 7: Contour tracing ===
  report("Traçage des contours", 72, "Marching Squares en cours");
  const contourStart = Date.now();
  const contours = traceContours(width, height, smoothedZones);
  report(
    "Contours extraits",
    76,
    `${contours.length} chemins détectés en ${Date.now() - contourStart}ms`
  );

  // === STEP 8: Merge polygons of same color ===
  report("Fusion topologique", 80, "Regroupement des polygones par couleur");
  const topologyStart = Date.now();
  const mergedContours = mergeAdjacentPolygons(contours, smoothedZones);
  report(
    "Topologie stabilisée",
    83,
    `${mergedContours.length} contours après fusion en ${Date.now() - topologyStart}ms`
  );

  // === STEP 9: Label placement refinement ===
  report("Placement des numéros", 86, "Calcul des centres visuels");
  const labelPlacementStart = Date.now();
  const refinedZones = refineZoneLabelPositions(
    smoothedZones,
    mergedContours,
    width,
    height
  );
  report(
    "Positions des étiquettes",
    88,
    `Zones optimisées en ${Date.now() - labelPlacementStart}ms`
  );

  // === STEP 10: SVG generation ===
  report("Génération du SVG", 92, "Conversion des polygones en chemins");
  const svg = generateSVG(mergedContours, refinedZones, palette, width, height);

  // === STEP 11: Numbered version ===
  report("Création de la version numérotée", 94, "Rendu des zones et numéros");
  const numberedData = createNumberedVersion(
    quantizedData,
    refinedZones,
    palette,
    smoothedLabels,
    contoursData
  );

  // === STEP 12: True preview fusion ===
  report("Fusion de l'aperçu final", 96, "Superposition image + contours + numéros");
  const previewData = createPreviewFusion(
    referenceImageData,
    contoursData,
    numberedData,
    width,
    height
  );

  // === STEP 13: Legend generation ===
  report("Génération de la légende", 98, `${palette.length} couleurs ordonnées par surface`);
  const legend = generateLegend(refinedZones, palette, width * height);

  // === STEP 14: Build color->zone map ===
  const colorZoneMapping = new Map<number, number[]>();
  for (const zone of refinedZones) {
    if (!colorZoneMapping.has(zone.colorIdx)) {
      colorZoneMapping.set(zone.colorIdx, []);
    }
    colorZoneMapping.get(zone.colorIdx)!.push(zone.id);
  }

  return {
    processed: {
      contours: contoursData,
      numbered: numberedData,
      colorized: previewData,
      palette,
      rawPalette: enableSmartPalette ? rawPalette : undefined,
      zones: refinedZones,
      svg,
      legend,
      labels: smoothedLabels,
      colorZoneMapping,
      artisticMergeStats
    },
    averageDeltaE: enableSmartPalette ? averageDeltaE : undefined,
    artisticMergeStats
  };
}
