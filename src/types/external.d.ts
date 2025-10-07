declare module 'polylabel' {
  type PolylabelPolygon = Array<[number, number]>;
  export default function polylabel(
    polygon: Array<PolylabelPolygon>,
    precision?: number
  ): [number, number] & { distance: number };
}

declare module 'marchingsquares' {
  export function isoContours(
    data: number[][],
    threshold: number,
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
  
  export default function simplify(
    points: Point[],
    tolerance?: number,
    highestQuality?: boolean
  ): Point[];
}
