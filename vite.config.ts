// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Cache version — bump to force a new service worker + cache scope.
// Keep in sync with APP_VERSION in src/lib/pwa-config.ts.
const APP_VERSION = "1.0.0";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "prompt",
        injectRegister: null,
        devOptions: { enabled: false },
        filename: "sw.js",
        strategies: "generateSW",
        manifest: false,
        workbox: {
          // Client assets ship to dist/client on this template; scope the
          // precache manifest there so URLs match the served paths.
          globDirectory: "dist/client",
          swDest: "dist/client/sw.js",
          cleanupOutdatedCaches: true,
          skipWaiting: false,
          clientsClaim: false,
          navigateFallback: null,
          cacheId: `forest-atlas-west-v${APP_VERSION}`,
          globPatterns: ["**/*.{js,css,html,svg,webmanifest,woff2,json,geojson}"],
          // Never precache leaflet CSS or other cross-origin assets.
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          runtimeCaching: [
            {
              // Same-origin HTML navigations — NetworkFirst so users always see fresh routes online,
              // but a cached shell renders offline after first visit.
              urlPattern: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: `pages-v${APP_VERSION}`,
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // Same-origin checked-in data (JSON / GeoJSON): stale-while-revalidate.
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.(?:json|geojson)$/i.test(url.pathname),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: `data-v${APP_VERSION}`,
                expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Same-origin static assets (built JS/CSS/font/img/svg).
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.(?:js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|webp|avif|ico)$/i.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: `assets-v${APP_VERSION}`,
                expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 60 },
              },
            },
            // Cross-origin requests (map tiles, Google Fonts, leaflet CDN) have no handler —
            // the service worker passes them through to the network + normal browser HTTP cache.
          ],
        },
      }),
    ],
  },
});
