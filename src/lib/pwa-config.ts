// App-wide PWA constants. Keep APP_VERSION in sync with vite.config.ts so
// generated cache names and the runtime code agree on the current release.
export const APP_VERSION = "1.0.0";
export const SW_URL = "/sw.js";
export const CACHE_ID = `forest-atlas-west-v${APP_VERSION}`;

// Same-origin URL patterns the service worker is *allowed* to cache.
// Cross-origin URLs (map tiles, Google Fonts, leaflet CDN) are never cached
// by the SW — they fall through to normal browser HTTP cache behavior.
export function isCacheableSameOrigin(url: URL): boolean {
  if (/\.(?:json|geojson)$/i.test(url.pathname)) return true;
  if (/\.(?:js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|webp|avif|ico)$/i.test(url.pathname)) return true;
  return false;
}

// Explicit denylist for third-party map tile providers and other cross-origin
// hosts we must never route through the service worker cache.
const THIRD_PARTY_TILE_HOSTS = [
  "tile.openstreetmap.org",
  "a.tile.openstreetmap.org",
  "b.tile.openstreetmap.org",
  "c.tile.openstreetmap.org",
  "server.arcgisonline.com",
  "basemaps.cartocdn.com",
  "a.basemaps.cartocdn.com",
  "b.basemaps.cartocdn.com",
  "c.basemaps.cartocdn.com",
  "d.basemaps.cartocdn.com",
  "tile.opentopomap.org",
  "a.tile.opentopomap.org",
  "b.tile.opentopomap.org",
  "c.tile.opentopomap.org",
];

export function isThirdPartyTile(url: URL): boolean {
  return THIRD_PARTY_TILE_HOSTS.includes(url.hostname);
}

// URL contains ?sw=off — kill switch for the service worker.
export function isSwKillSwitch(href: string): boolean {
  try {
    return new URL(href).searchParams.get("sw") === "off";
  } catch {
    return false;
  }
}

// Hosts and contexts where the service worker must never register.
export function shouldRegisterServiceWorker(loc: {
  hostname: string;
  href: string;
  isProd: boolean;
  isIframe: boolean;
}): boolean {
  if (!loc.isProd) return false;
  if (loc.isIframe) return false;
  if (isSwKillSwitch(loc.href)) return false;
  const host = loc.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return false;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return false;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return false;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return false;
  return true;
}
