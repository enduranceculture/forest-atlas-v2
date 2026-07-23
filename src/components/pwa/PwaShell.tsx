import { useEffect, useState } from "react";
import { registerPwa, type PwaLifecycle } from "@/lib/pwa-register";

type OnlineState = "online" | "offline";

function readOnline(): OnlineState {
  if (typeof navigator === "undefined") return "online";
  return navigator.onLine ? "online" : "offline";
}

export function PwaShell() {
  // Only render after client hydration to avoid any SSR/client text mismatch
  // from navigator.onLine or listener-driven updates. Once mounted the
  // indicator resolves to a truthful Online/Offline state immediately.
  const [mounted, setMounted] = useState(false);
  const [online, setOnline] = useState<OnlineState>("online");
  const [pwa, setPwa] = useState<PwaLifecycle>({ state: "skipped", reason: "boot" });
  const [dismissedOffline, setDismissedOffline] = useState(false);
  const [dismissedUpdate, setDismissedUpdate] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOnline(readOnline());
    const goOnline = () => {
      setOnline("online");
      setDismissedOffline(false);
    };
    const goOffline = () => setOnline("offline");
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => registerPwa(setPwa), []);

  if (!mounted) return null;

  const showOffline = online === "offline" && !dismissedOffline;
  const showUpdate = pwa.state === "update-ready" && !dismissedUpdate;

  return (
    <>
      {/* Status dot — hidden while the offline banner is visible to avoid
          duplicate offline messaging in the same corner. Desktop: bottom-left.
          Mobile: top-right beneath the top bar so it never collides with the
          bottom sheet, Leaflet attribution, scale, or map action buttons. */}
      {showOffline ? null : (
      <div
        aria-live="polite"
        data-testid="pwa-status"
        className="pointer-events-none fixed z-[1200] flex items-center gap-2 rounded-full border border-white/10 bg-spruce-deep/85 px-2.5 py-1 font-field text-[10px] uppercase tracking-widest text-mineral backdrop-blur right-3 top-[3.75rem] md:right-auto md:top-auto md:left-3 md:bottom-3"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            online === "offline" ? "bg-ember" : "bg-lichen"
          }`}
          aria-hidden="true"
        />
        <span>{online === "offline" ? "Offline" : "Online"}</span>
      </div>
      )}

      {showOffline ? (
        <div
          role="status"
          className="fixed left-1/2 top-[3.5rem] z-[1300] w-[min(94vw,520px)] -translate-x-1/2 rounded-lg border border-ember/40 bg-spruce-deep/95 p-3 text-bone shadow-lg backdrop-blur md:top-3"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ember" aria-hidden="true" />
            <div className="min-w-0 text-sm">
              <div className="font-field text-[11px] uppercase tracking-widest text-mineral">
                Offline
              </div>
              <p className="mt-1 leading-snug text-bone/90">
                The app shell, bundled datasets, imported GPX, and your Field Kit stay
                available. Third-party basemap tiles will not load offline. The
                Landscape Inventory is blocked upstream until a valid checked-in
                snapshot exists. The browser never makes live USDA requests.
              </p>
              <button
                type="button"
                onClick={() => setDismissedOffline(true)}
                className="mt-2 rounded border border-white/15 px-2 py-1 font-field text-[10px] uppercase tracking-widest text-bone/80 hover:bg-white/5"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showUpdate && pwa.state === "update-ready" ? (
        <div
          role="dialog"
          aria-label="Update available"
          className="fixed right-3 bottom-3 z-[70] w-[min(94vw,360px)] rounded-lg border border-lichen/40 bg-spruce-deep/95 p-3 text-bone shadow-lg backdrop-blur"
        >
          <div className="font-field text-[11px] uppercase tracking-widest text-mineral">
            Update ready
          </div>
          <p className="mt-1 text-sm leading-snug text-bone/90">
            A new version of Forest Atlas is ready. Reload to apply — unsaved local edits
            in your Field Kit are stored in this browser and will remain after reload.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => pwa.activate()}
              className="rounded border border-lichen/60 bg-lichen/10 px-2 py-1 font-field text-[10px] uppercase tracking-widest text-bone hover:bg-lichen/20"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => setDismissedUpdate(true)}
              className="rounded border border-white/15 px-2 py-1 font-field text-[10px] uppercase tracking-widest text-bone/80 hover:bg-white/5"
            >
              Later
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
