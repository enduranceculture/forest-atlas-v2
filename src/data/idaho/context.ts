// FIXTURE — Idaho forest-context overlay. Stylized polygons for local reference only.
// These are NOT survey-accurate boundaries — do not use for management decisions.
export type ContextPolygon = {
  id: string;
  name: string;
  densityClass: number; // 1-9 (matches western density ramp)
  ring: Array<[number, number]>; // [lat, lon] pairs, closed
};

export const IDAHO_FOREST_CONTEXT: ContextPolygon[] = [
  {
    id: "panhandle",
    name: "Panhandle Inland Rainforest",
    densityClass: 8,
    ring: [
      [49.0, -117.0],
      [49.0, -115.75],
      [47.9, -115.75],
      [47.4, -116.2],
      [47.0, -117.0],
      [49.0, -117.0],
    ],
  },
  {
    id: "clearwater",
    name: "Clearwater / Nez Perce",
    densityClass: 7,
    ring: [
      [47.0, -116.6],
      [47.0, -114.5],
      [45.8, -114.6],
      [45.6, -116.6],
      [47.0, -116.6],
    ],
  },
  {
    id: "salmon-challis",
    name: "Salmon-Challis / Frank Church",
    densityClass: 7,
    ring: [
      [45.8, -115.6],
      [45.8, -113.6],
      [44.4, -113.8],
      [44.4, -115.6],
      [45.8, -115.6],
    ],
  },
  {
    id: "sawtooth",
    name: "Sawtooth NRA",
    densityClass: 6,
    ring: [
      [44.4, -115.4],
      [44.4, -114.2],
      [43.5, -114.2],
      [43.5, -115.4],
      [44.4, -115.4],
    ],
  },
  {
    id: "payette",
    name: "Payette / Boise NF",
    densityClass: 5,
    ring: [
      [45.6, -116.6],
      [45.6, -115.4],
      [43.6, -115.4],
      [43.6, -116.6],
      [45.6, -116.6],
    ],
  },
  {
    id: "caribou",
    name: "Caribou-Targhee",
    densityClass: 5,
    ring: [
      [44.6, -111.6],
      [44.6, -111.05],
      [42.0, -111.05],
      [42.0, -112.4],
      [44.6, -111.6],
    ],
  },
];