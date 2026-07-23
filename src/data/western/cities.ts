// FIXTURE — orientation-only city markers.
export type City = { name: string; state: string; lon: number; lat: number };

export const WESTERN_CITIES: City[] = [
  { name: "Seattle", state: "WA", lon: -122.33, lat: 47.61 },
  { name: "Portland", state: "OR", lon: -122.68, lat: 45.52 },
  { name: "Bend", state: "OR", lon: -121.31, lat: 44.06 },
  { name: "San Francisco", state: "CA", lon: -122.42, lat: 37.77 },
  { name: "Reno", state: "NV", lon: -119.81, lat: 39.53 },
  { name: "Boise", state: "ID", lon: -116.20, lat: 43.62 },
  { name: "Missoula", state: "MT", lon: -113.99, lat: 46.87 },
  { name: "Salt Lake City", state: "UT", lon: -111.89, lat: 40.76 },
  { name: "Denver", state: "CO", lon: -104.99, lat: 39.74 },
  { name: "Flagstaff", state: "AZ", lon: -111.65, lat: 35.20 },
  { name: "Albuquerque", state: "NM", lon: -106.65, lat: 35.08 },
  { name: "Spokane", state: "WA", lon: -117.43, lat: 47.66 },
];