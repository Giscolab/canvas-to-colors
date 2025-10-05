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
