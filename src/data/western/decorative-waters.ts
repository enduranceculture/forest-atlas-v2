// DECORATIVE — non-authoritative visual composition data for the Western
// Atlas poster. These river/lake polylines are hand-sketched at ~1° accuracy
// purely so the poster carries cobalt waterways in the vintage-map spirit.
// They MUST NOT be used for hydrology, permitting, navigation, or any
// analytical purpose. The runtime app clearly labels the atlas as an
// editorial illustration.

export type DecorativeRiver = {
  id: string;
  name: string;
  coordinates: [number, number][]; // [lon, lat] pairs
};

export const DECORATIVE_RIVERS: DecorativeRiver[] = [
  {
    id: "columbia",
    name: "Columbia",
    coordinates: [
      [-124.05, 46.25],
      [-123.1, 46.15],
      [-121.9, 45.7],
      [-120.5, 45.7],
      [-119.5, 45.9],
      [-118.9, 46.05],
      [-117.9, 46.15],
    ],
  },
  {
    id: "snake",
    name: "Snake",
    coordinates: [
      [-110.5, 44.1],
      [-111.3, 43.5],
      [-112.5, 43.5],
      [-113.6, 43.1],
      [-114.8, 42.85],
      [-116.0, 43.5],
      [-116.9, 44.3],
      [-117.2, 45.4],
      [-117.5, 46.2],
      [-118.9, 46.05],
    ],
  },
  {
    id: "salmon",
    name: "Salmon",
    coordinates: [
      [-114.2, 44.1],
      [-114.5, 44.5],
      [-114.8, 45.0],
      [-115.6, 45.4],
      [-116.4, 45.65],
    ],
  },
  {
    id: "yellowstone",
    name: "Yellowstone",
    coordinates: [
      [-110.4, 44.4],
      [-110.7, 45.1],
      [-109.5, 45.8],
      [-107.9, 46.0],
      [-105.9, 46.6],
      [-104.1, 47.9],
    ],
  },
  {
    id: "coloradoR",
    name: "Colorado",
    coordinates: [
      [-106.0, 40.4],
      [-107.5, 39.4],
      [-109.5, 38.6],
      [-110.6, 37.7],
      [-112.0, 36.9],
      [-113.8, 36.1],
      [-114.5, 35.0],
      [-114.6, 33.5],
      [-114.5, 32.7],
    ],
  },
  {
    id: "rioGrande",
    name: "Rio Grande",
    coordinates: [
      [-106.8, 37.8],
      [-106.5, 36.5],
      [-106.7, 35.0],
      [-106.8, 33.5],
      [-106.6, 32.0],
    ],
  },
  {
    id: "sacramento",
    name: "Sacramento",
    coordinates: [
      [-122.4, 41.3],
      [-122.0, 40.5],
      [-121.9, 39.5],
      [-121.6, 38.6],
      [-122.05, 38.05],
    ],
  },
];

export type DecorativeLake = {
  id: string;
  name: string;
  center: [number, number]; // [lon, lat]
  radius: number; // degrees, coarse
};

export const DECORATIVE_LAKES: DecorativeLake[] = [
  { id: "gsl", name: "Great Salt Lake", center: [-112.5, 41.15], radius: 0.55 },
  { id: "tahoe", name: "Tahoe", center: [-120.05, 39.1], radius: 0.18 },
  { id: "flathead", name: "Flathead", center: [-114.15, 47.9], radius: 0.28 },
  { id: "pendOreille", name: "Pend Oreille", center: [-116.5, 48.15], radius: 0.22 },
];