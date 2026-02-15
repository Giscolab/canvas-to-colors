declare module 'polylabel' {
  type PolylabelPolygon = Array<[number, number]>;
  
  /**
   * Find the pole of inaccessibility (visual center) of a polygon
   * @param polygon Array of rings (outer ring + holes)
   * @param precision Tolerance for approximation (default: 1.0)
   * @returns [x, y] coordinates of the pole, with distance property
   */
  export default function polylabel(
    polygon: Array<PolylabelPolygon>,
    precision?: number
  ): [number, number] & { distance: number };
}

declare module 'marchingsquares' {
  /**
   * Extract iso-contours from a 2D scalar field
   * @param data 2D array of scalar values
   * @param threshold Threshold value for contour extraction
   * @param options Configuration options
   * @returns Array of polygons (each polygon is an array of rings, each ring is an array of [x, y] coordinates)
   */
  export function isoContours(
    data: number[][],
    threshold: number,
    options?: {
      noFrame?: boolean;
      linearRing?: boolean;
      polygons?: boolean;
    }
  ): number[][][];
  
  /**
   * Extract iso-bands from a 2D scalar field
   * @param data 2D array of scalar values
   * @param lowerBound Lower threshold value
   * @param upperBound Upper threshold value
   * @param options Configuration options
   * @returns Array of polygons representing the band
   */
  export function isoBands(
    data: number[][],
    lowerBound: number,
    upperBound: number,
    options?: {
      noFrame?: boolean;
      linearRing?: boolean;
      polygons?: boolean;
    }
  ): number[][][];
}

declare module 'martinez-polygon-clipping' {
  type Position = [number, number];
  type Ring = Position[];
  type Polygon = Ring[];
  type MultiPolygon = Polygon[];
  
  export function union(
    polygon1: Polygon | MultiPolygon,
    polygon2: Polygon | MultiPolygon
  ): MultiPolygon;
  
  export function intersection(
    polygon1: Polygon | MultiPolygon,
    polygon2: Polygon | MultiPolygon
  ): MultiPolygon;
  
  export function diff(
    polygon1: Polygon | MultiPolygon,
    polygon2: Polygon | MultiPolygon
  ): MultiPolygon;
  
  export function xor(
    polygon1: Polygon | MultiPolygon,
    polygon2: Polygon | MultiPolygon
  ): MultiPolygon;
}

declare module 'simplify-js' {
  export interface Point {
    x: number;
    y: number;
  }
  
  /**
   * Simplify a polyline using Ramer-Douglas-Peucker algorithm
   * @param points Array of points to simplify
   * @param tolerance Tolerance value (higher = more simplification)
   * @param highestQuality Use slower but more accurate algorithm
   * @returns Simplified array of points
   */
  export default function simplify(
    points: Point[],
    tolerance?: number,
    highestQuality?: boolean
  ): Point[];
}
