// Guarded service worker registration for Forest Atlas West.
// Never registers in dev, Lovable preview iframes, or when ?sw=off is set.
// Uses workbox-window so we can surface an update-ready state to the UI.

import { Workbox } from "workbox-window";
import { SW_URL, shouldRegisterServiceWorker, isSwKillSwitch } from "./pwa-config";

export type PwaLifecycle =
  | { state: "unsupported" }
  | { state: "skipped"; reason: string }
  | { state: "registered" }
  | { state: "update-ready"; activate: () => void }
  | { state: "failed"; error: unknown };

export type PwaListener = (event: PwaLifecycle) => void;

let wb: Workbox | null = null;
let registered = false;

async function unregisterAll(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => (r.active?.scriptURL ?? "").endsWith(SW_URL))
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

export function registerPwa(listener: PwaListener): () => void {
  if (typeof window === "undefined") return () => {};
  if (!("serviceWorker" in navigator)) {
    listener({ state: "unsupported" });
    return () => {};
  }

  const loc = {
    hostname: window.location.hostname,
    href: window.location.href,
    isProd: import.meta.env.PROD,
    isIframe: window.self !== window.top,
  };

  if (!shouldRegisterServiceWorker(loc)) {
    // Clean up any stale registration from a prior deploy on this origin.
    void unregisterAll();
    const reason = isSwKillSwitch(loc.href)
      ? "kill-switch"
      : !loc.isProd
      ? "dev"
      : loc.isIframe
      ? "preview-iframe"
      : "preview-host";
    listener({ state: "skipped", reason });
    return () => {};
  }

  if (registered) {
    listener({ state: "registered" });
    return () => {};
  }
  registered = true;

  try {
    wb = new Workbox(SW_URL);
    const onWaiting = () => {
      const activate = () => {
        if (!wb) return;
        wb.addEventListener("controlling", () => {
          window.location.reload();
        });
        wb.messageSkipWaiting();
      };
      listener({ state: "update-ready", activate });
    };
    wb.addEventListener("waiting", onWaiting);

    wb.register()
      .then(() => listener({ state: "registered" }))
      .catch((error) => listener({ state: "failed", error }));
  } catch (error) {
    listener({ state: "failed", error });
  }

  return () => {
    wb = null;
  };
}
