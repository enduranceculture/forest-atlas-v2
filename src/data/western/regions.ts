// FIXTURE — stylized forest density regions. Not survey-accurate; polygons are
// hand-authored with many vertices per ring so the map reads as organic rather
// than rectangular. Replace with authoritative source data
// (USFS FIA / LANDFIRE / MOG 2024) before any non-preview use.
import type { RegionCollection, RegionFeature } from "../schema";

type F = Omit<RegionFeature, "type">;
const feat = (f: F): RegionFeature => ({ type: "Feature", ...f });

// Rings are [lon, lat]; ordered clockwise. Extra vertices give an organic edge.
type Ring = [number, number][];
const rings: Record<string, Ring> = {
  olympic: [[-124.72,48.38],[-124.35,48.42],[-123.85,48.30],[-123.45,48.10],[-123.20,47.75],[-123.30,47.45],[-123.65,47.30],[-124.15,47.35],[-124.55,47.55],[-124.72,47.95],[-124.72,48.38]],
  cascadesN: [[-122.05,49.00],[-121.35,48.95],[-120.80,48.75],[-120.40,48.35],[-120.30,47.90],[-120.55,47.55],[-121.10,47.40],[-121.75,47.55],[-122.05,47.95],[-122.10,48.55],[-122.05,49.00]],
  cascadesS: [[-122.45,45.55],[-121.90,45.40],[-121.45,44.80],[-121.55,43.90],[-121.85,43.20],[-122.30,42.55],[-122.60,42.45],[-122.75,43.10],[-122.55,44.10],[-122.45,44.85],[-122.45,45.55]],
  coastRangeOR: [[-124.30,46.20],[-123.85,46.10],[-123.55,45.45],[-123.65,44.55],[-123.90,43.55],[-124.15,42.65],[-124.40,42.05],[-124.45,43.05],[-124.40,44.05],[-124.35,45.10],[-124.30,46.20]],
  klamath: [[-124.20,42.35],[-123.60,42.45],[-123.10,42.20],[-122.75,41.85],[-122.90,41.35],[-123.35,41.15],[-123.95,41.20],[-124.20,41.55],[-124.20,42.35]],
  redwoods: [[-124.15,41.70],[-123.95,41.35],[-123.75,40.60],[-123.55,39.75],[-123.50,39.05],[-123.75,38.90],[-124.00,39.45],[-124.10,40.25],[-124.20,41.05],[-124.15,41.70]],
  sierraN: [[-121.30,40.35],[-120.65,40.25],[-120.05,40.05],[-119.65,39.30],[-119.75,38.55],[-120.20,38.45],[-120.75,38.65],[-121.15,39.35],[-121.35,39.85],[-121.30,40.35]],
  sierraS: [[-119.65,38.35],[-119.15,37.95],[-118.55,37.35],[-118.15,36.65],[-118.05,36.05],[-118.55,35.75],[-119.10,35.85],[-119.35,36.55],[-119.55,37.25],[-119.75,37.85],[-119.65,38.35]],
  blueMtns: [[-119.45,45.65],[-118.85,45.75],[-118.10,45.65],[-117.30,45.55],[-117.15,44.85],[-117.55,44.35],[-118.25,44.25],[-118.95,44.35],[-119.35,44.85],[-119.55,45.25],[-119.45,45.65]],
  wallowa: [[-117.85,45.75],[-117.30,45.80],[-116.85,45.65],[-116.80,45.15],[-117.05,44.75],[-117.55,44.65],[-117.90,45.05],[-117.95,45.45],[-117.85,45.75]],
  northIdaho: [[-117.00,49.00],[-116.60,48.95],[-116.10,48.85],[-115.75,48.50],[-115.70,47.85],[-115.90,47.30],[-116.35,47.05],[-116.85,47.10],[-117.05,47.55],[-117.05,48.30],[-117.00,49.00]],
  centralIdaho: [[-116.40,46.00],[-115.75,46.05],[-115.05,45.95],[-114.35,45.75],[-113.75,45.35],[-113.65,44.70],[-113.85,44.05],[-114.45,43.85],[-115.25,43.85],[-115.95,44.05],[-116.35,44.55],[-116.45,45.25],[-116.40,46.00]],
  sawtoothWB: [[-115.35,44.40],[-114.85,44.45],[-114.35,44.35],[-114.15,43.95],[-114.30,43.55],[-114.75,43.45],[-115.20,43.55],[-115.40,43.95],[-115.35,44.40]],
  bitterroot: [[-115.00,47.30],[-114.55,47.35],[-114.05,47.20],[-113.75,46.75],[-113.65,46.05],[-113.85,45.65],[-114.35,45.55],[-114.85,45.75],[-115.05,46.35],[-115.00,47.30]],
  glacier: [[-114.50,49.00],[-113.75,48.95],[-113.05,48.75],[-112.45,48.25],[-112.40,47.75],[-112.85,47.45],[-113.55,47.40],[-114.15,47.55],[-114.50,47.95],[-114.50,49.00]],
  gye: [[-111.15,45.15],[-110.45,45.20],[-109.65,45.05],[-108.95,44.75],[-108.85,44.15],[-109.25,43.65],[-109.95,43.55],[-110.75,43.65],[-111.15,44.05],[-111.20,44.65],[-111.15,45.15]],
  uintas: [[-111.15,40.95],[-110.55,41.00],[-109.95,40.90],[-109.55,40.70],[-109.65,40.45],[-110.15,40.40],[-110.75,40.45],[-111.15,40.60],[-111.15,40.95]],
  sanjuan: [[-108.35,38.15],[-107.75,38.20],[-107.15,38.10],[-106.55,37.85],[-106.45,37.35],[-106.85,37.05],[-107.45,37.00],[-108.05,37.10],[-108.35,37.55],[-108.35,38.15]],
  sangre: [[-106.35,40.55],[-105.85,40.60],[-105.35,40.35],[-105.05,39.55],[-104.95,38.75],[-105.15,38.05],[-105.45,37.35],[-105.85,37.05],[-106.15,37.35],[-106.35,38.15],[-106.30,39.05],[-106.35,40.55]],
  mogollon: [[-112.35,35.35],[-111.55,35.45],[-110.65,35.35],[-109.85,35.15],[-109.45,34.65],[-109.65,34.15],[-110.35,33.85],[-111.15,33.85],[-111.85,33.95],[-112.30,34.25],[-112.40,34.85],[-112.35,35.35]],
  skyIslands: [[-110.75,32.55],[-110.25,32.50],[-109.65,32.55],[-109.05,32.35],[-108.65,32.05],[-108.85,31.55],[-109.45,31.40],[-110.15,31.45],[-110.65,31.75],[-110.85,32.15],[-110.75,32.55]],
  jemez: [[-106.95,36.55],[-106.45,36.60],[-105.95,36.45],[-105.55,36.10],[-105.45,35.65],[-105.75,35.40],[-106.25,35.40],[-106.75,35.55],[-106.95,35.95],[-106.95,36.55]],
};

export const WESTERN_REGIONS: RegionCollection = {
  type: "FeatureCollection",
  features: [
    feat({ id: "olympic", properties: { name: "Olympic Temperate Rainforest", state: "WA", densityClass: 9, summary: "Coastal Sitka spruce and western hemlock old-growth on the Olympic Peninsula.", fireshed: "Olympic" }, geometry: { type: "Polygon", coordinates: [rings.olympic as [number, number][]] } }),
    feat({ id: "cascades-n", properties: { name: "North Cascades", state: "WA", densityClass: 8, summary: "Glaciated ranges with mesic westside mature Douglas-fir and hemlock.", fireshed: "North Cascades" }, geometry: { type: "Polygon", coordinates: [rings.cascadesN as [number, number][]] } }),
    feat({ id: "cascades-s", properties: { name: "South Cascades", state: "OR", densityClass: 7, summary: "Mt Hood through the Umpqua — mixed conifer late-successional stands.", fireshed: "Cascades" }, geometry: { type: "Polygon", coordinates: [rings.cascadesS as [number, number][]] } }),
    feat({ id: "coast-range-or", properties: { name: "Oregon Coast Range", state: "OR", densityClass: 6, summary: "Historic coastal old-growth footprint; largely mature second-growth today.", fireshed: "Oregon Coast" }, geometry: { type: "Polygon", coordinates: [rings.coastRangeOR as [number, number][]] } }),
    feat({ id: "klamath", properties: { name: "Klamath-Siskiyou", state: "OR-CA", densityClass: 7, summary: "Globally significant conifer diversity; serpentine and mixed evergreen forest.", fireshed: "Klamath" }, geometry: { type: "Polygon", coordinates: [rings.klamath as [number, number][]] } }),
    feat({ id: "redwoods", properties: { name: "Redwood Belt", state: "CA", densityClass: 9, summary: "Coast redwood groves — the tallest primary forest in North America.", fireshed: "North Coast" }, geometry: { type: "Polygon", coordinates: [rings.redwoods as [number, number][]] } }),
    feat({ id: "sierra-n", properties: { name: "Northern Sierra Nevada", state: "CA", densityClass: 6, summary: "Mixed conifer with sugar pine and giant Douglas-fir remnants.", fireshed: "Sierra" }, geometry: { type: "Polygon", coordinates: [rings.sierraN as [number, number][]] } }),
    feat({ id: "sierra-s", properties: { name: "Southern Sierra & Sequoia", state: "CA", densityClass: 8, summary: "Giant sequoia groves of Sequoia-Kings and mixed conifer above 1500 m.", fireshed: "Southern Sierra" }, geometry: { type: "Polygon", coordinates: [rings.sierraS as [number, number][]] } }),
    feat({ id: "blue-mtns", properties: { name: "Blue Mountains", state: "OR", densityClass: 5, summary: "Interior ponderosa pine and mixed conifer; historic old-growth pine.", fireshed: "Blue Mountains" }, geometry: { type: "Polygon", coordinates: [rings.blueMtns as [number, number][]] } }),
    feat({ id: "wallowa", properties: { name: "Wallowa-Whitman", state: "OR", densityClass: 6, summary: "Cool, wet inland conifer with Engelmann spruce and subalpine fir.", fireshed: "Wallowa" }, geometry: { type: "Polygon", coordinates: [rings.wallowa as [number, number][]] } }),
    feat({ id: "north-idaho", properties: { name: "North Idaho Inland Rainforest", state: "ID", densityClass: 8, summary: "The only inland temperate rainforest in North America — western red cedar and hemlock.", fireshed: "Panhandle" }, geometry: { type: "Polygon", coordinates: [rings.northIdaho as [number, number][]] } }),
    feat({ id: "central-idaho", properties: { name: "Central Idaho Wildlands", state: "ID", densityClass: 7, summary: "Frank Church and Sawtooth mixed conifer; mature Douglas-fir and lodgepole.", fireshed: "Salmon-Challis" }, geometry: { type: "Polygon", coordinates: [rings.centralIdaho as [number, number][]] } }),
    feat({ id: "sawtooth-whitebark", properties: { name: "Sawtooth Whitebark Belt", state: "ID", densityClass: 5, summary: "High-elevation whitebark pine, a keystone species in retreat.", fireshed: "Sawtooth" }, geometry: { type: "Polygon", coordinates: [rings.sawtoothWB as [number, number][]] } }),
    feat({ id: "bitterroot", properties: { name: "Bitterroot & Selway", state: "MT-ID", densityClass: 7, summary: "Wilderness-scale mixed conifer straddling the Bitterroot Divide.", fireshed: "Bitterroot" }, geometry: { type: "Polygon", coordinates: [rings.bitterroot as [number, number][]] } }),
    feat({ id: "glacier", properties: { name: "Glacier & Northern Rockies", state: "MT", densityClass: 6, summary: "Cold-climate spruce-fir and larch, including ancient western larch.", fireshed: "Northern Rockies" }, geometry: { type: "Polygon", coordinates: [rings.glacier as [number, number][]] } }),
    feat({ id: "gye", properties: { name: "Greater Yellowstone", state: "WY-MT", densityClass: 6, summary: "Lodgepole and mixed conifer of Yellowstone and the Absarokas.", fireshed: "GYE" }, geometry: { type: "Polygon", coordinates: [rings.gye as [number, number][]] } }),
    feat({ id: "uintas", properties: { name: "Uinta High Country", state: "UT", densityClass: 5, summary: "East-west range of spruce-fir and aspen above 2500 m.", fireshed: "Uintas" }, geometry: { type: "Polygon", coordinates: [rings.uintas as [number, number][]] } }),
    feat({ id: "sanjuan", properties: { name: "San Juan Mountains", state: "CO", densityClass: 6, summary: "Southern Rockies spruce-fir, engelmann and old aspen clones.", fireshed: "San Juans" }, geometry: { type: "Polygon", coordinates: [rings.sanjuan as [number, number][]] } }),
    feat({ id: "sangre", properties: { name: "Sangre de Cristo & Front Range", state: "CO", densityClass: 5, summary: "Mixed conifer along the Colorado Front and Sangre spine.", fireshed: "Front Range" }, geometry: { type: "Polygon", coordinates: [rings.sangre as [number, number][]] } }),
    feat({ id: "mogollon", properties: { name: "Mogollon Rim", state: "AZ", densityClass: 4, summary: "Vast ponderosa pine belt across the Colorado Plateau escarpment.", fireshed: "Mogollon" }, geometry: { type: "Polygon", coordinates: [rings.mogollon as [number, number][]] } }),
    feat({ id: "sky-islands", properties: { name: "Sky Islands", state: "AZ-NM", densityClass: 3, summary: "Isolated Madrean pine-oak ranges rising from the Sonoran floor.", fireshed: "Sky Islands" }, geometry: { type: "Polygon", coordinates: [rings.skyIslands as [number, number][]] } }),
    feat({ id: "jemez", properties: { name: "Jemez & Sangres NM", state: "NM", densityClass: 4, summary: "Northern New Mexico mixed conifer and old-growth ponderosa.", fireshed: "Jemez" }, geometry: { type: "Polygon", coordinates: [rings.jemez as [number, number][]] } }),
  ],
};