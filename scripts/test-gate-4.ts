// Gate 4 — PWA / offline-first behavior tests.
// Pure logic checks that don't spin up a browser. Covers: manifest fields,
// cache allowlist/denylist, third-party tile bypass, kill switch, guard
// registration logic, and cache-name determinism tied to APP_VERSION.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  APP_VERSION,
  CACHE_ID,
  isCacheableSameOrigin,
  isSwKillSwitch,
  isThirdPartyTile,
  shouldRegisterServiceWorker,
} from "../src/lib/pwa-config";

type Test = { name: string; run: () => void };

const tests: Test[] = [];
function test(name: string, run: () => void) {
  tests.push({ name, run });
}
function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

// ---- Manifest ----
test("manifest.webmanifest present with required fields", () => {
  const raw = readFileSync(resolve("public/manifest.webmanifest"), "utf8");
  const m = JSON.parse(raw);
  for (const key of [
    "name",
    "short_name",
    "description",
    "start_url",
    "scope",
    "display",
    "theme_color",
    "background_color",
    "icons",
  ]) {
    assert(key in m, `manifest missing ${key}`);
  }
  assert(m.display === "standalone", "display must be standalone");
  assert(Array.isArray(m.icons) && m.icons.length > 0, "icons array required");
  for (const icon of m.icons) {
    assert(icon.src && icon.type && icon.sizes, "icon entries need src/type/sizes");
  }
});

// ---- Allowlist / denylist ----
test("same-origin JSON and GeoJSON are cacheable", () => {
  assert(isCacheableSameOrigin(new URL("https://x.example/data.json")), "json");
  assert(isCacheableSameOrigin(new URL("https://x.example/inv.geojson")), "geojson");
});

test("same-origin JS/CSS/fonts/svg/images are cacheable", () => {
  for (const p of ["/app.js", "/app.css", "/f.woff2", "/i.svg", "/i.png", "/i.webp"]) {
    assert(isCacheableSameOrigin(new URL(`https://x.example${p}`)), `should cache ${p}`);
  }
});

test("same-origin HTML documents are not in file allowlist (handled by NetworkFirst nav handler)", () => {
  assert(!isCacheableSameOrigin(new URL("https://x.example/idaho")), "route html");
  assert(!isCacheableSameOrigin(new URL("https://x.example/")), "root html");
});

// ---- Third-party tile bypass ----
test("third-party map tile hosts are recognized and never cached", () => {
  for (const host of [
    "a.tile.openstreetmap.org",
    "server.arcgisonline.com",
    "basemaps.cartocdn.com",
    "b.tile.opentopomap.org",
  ]) {
    assert(isThirdPartyTile(new URL(`https://${host}/1/2/3.png`)), `${host} tile`);
  }
  assert(!isThirdPartyTile(new URL("https://forest-atlas.example/tile.png")), "same-origin");
});

// ---- Kill switch ----
test("?sw=off disables registration and is recognized", () => {
  assert(isSwKillSwitch("https://x.example/?sw=off"), "kill switch on");
  assert(!isSwKillSwitch("https://x.example/"), "no kill switch");
});

// ---- Register guard ----
test("register guard skips dev, previews, iframes, kill-switch", () => {
  const base = { hostname: "forest-atlas.example", href: "https://forest-atlas.example/", isProd: true, isIframe: false };
  assert(shouldRegisterServiceWorker(base), "prod host should register");
  assert(!shouldRegisterServiceWorker({ ...base, isProd: false }), "dev must skip");
  assert(!shouldRegisterServiceWorker({ ...base, isIframe: true }), "iframe must skip");
  assert(
    !shouldRegisterServiceWorker({ ...base, hostname: "id-preview--abc.lovable.app" }),
    "id-preview host must skip",
  );
  assert(
    !shouldRegisterServiceWorker({ ...base, hostname: "preview--abc.lovable.app" }),
    "preview host must skip",
  );
  assert(
    !shouldRegisterServiceWorker({ ...base, hostname: "abc.lovableproject.com" }),
    "lovableproject.com must skip",
  );
  assert(
    !shouldRegisterServiceWorker({ ...base, hostname: "abc.beta.lovable.dev" }),
    "beta.lovable.dev must skip",
  );
  assert(
    !shouldRegisterServiceWorker({ ...base, href: "https://forest-atlas.example/?sw=off" }),
    "?sw=off must skip",
  );
});

// ---- Cache name determinism ----
test("cache ID is deterministic and tied to APP_VERSION", () => {
  assert(CACHE_ID === `forest-atlas-west-v${APP_VERSION}`, "cache id must include version");
});

// ---- vite plugin config sanity ----
test("vite config declares APP_VERSION matching the runtime constant", () => {
  const src = readFileSync(resolve("vite.config.ts"), "utf8");
  const m = src.match(/APP_VERSION\s*=\s*"([^"]+)"/);
  assert(m, "APP_VERSION not found in vite.config.ts");
  assert(m![1] === APP_VERSION, `vite APP_VERSION (${m![1]}) must equal runtime (${APP_VERSION})`);
  assert(src.includes("cleanupOutdatedCaches: true"), "must cleanup outdated caches");
  assert(src.includes("skipWaiting: false"), "must not skipWaiting (update-ready prompt is manual)");
  assert(src.includes("NetworkFirst"), "must use NetworkFirst for navigations");
  assert(!/tile\.openstreetmap|arcgisonline|carto|opentopomap/i.test(
    src.split("runtimeCaching")[1] ?? ""
  ), "runtimeCaching must not target third-party tile hosts");
});

// ---- Runtime USDA guard ----
test("no runtime source file makes live USDA MapServer requests", () => {
  const { globSync } = require("node:fs") as typeof import("node:fs");
  // Node <22 has no globSync; fall back to a walker.
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of require("node:fs").readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(p, out);
      else if (/\.(t|j)sx?$/.test(entry.name)) out.push(p);
    }
    return out;
  };
  const files = walk(resolve("src"));
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    // Strip line and block comments, then look for a live URL literal.
    const stripped = s
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    if (/https?:\/\/[^\s"'`]*apps\.fs\.usda\.gov/i.test(stripped)) {
      throw new Error(`runtime source references USDA MapServer: ${f}`);
    }
  }
  // Silence unused import
  void globSync;
});

// ---- Runner ----
let passed = 0;
let failed = 0;
for (const t of tests) {
  try {
    t.run();
    console.log(`  ✓ ${t.name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${t.name}\n    ${(err as Error).message}`);
    failed++;
  }
}
console.log(`\nGate 4: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
