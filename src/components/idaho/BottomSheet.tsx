import { type ReactNode } from "react";

export type Snap = "peek" | "half" | "full";

const HEIGHT: Record<Snap, string> = { peek: "22vh", half: "56vh", full: "90vh" };
const LABEL: Record<Snap, string> = { peek: "Peek", half: "Half", full: "Full" };
const NEXT: Record<Snap, Snap> = { peek: "half", half: "full", full: "peek" };

export function BottomSheet({
  children,
  snap,
  onSnapChange,
  title,
}: {
  children: ReactNode;
  snap: Snap;
  onSnapChange: (s: Snap) => void;
  title?: string;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1100] rounded-t-3xl border-t border-white/10 bg-spruce shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.6)] transition-[height] duration-300 md:hidden"
      style={{ height: HEIGHT[snap] }}
      role="dialog"
      aria-label={title ?? "Field explorer panel"}
    >
      <button
        className="mx-auto mt-2 flex h-6 w-full items-center justify-center focus:outline-none"
        onClick={() => onSnapChange(NEXT[snap])}
        aria-label={`Sheet size: ${LABEL[snap]}. Tap to cycle.`}
      >
        <span className="block h-1.5 w-12 rounded-full bg-white/25 group-hover:bg-white/40" />
      </button>
      <div className="h-[calc(100%-1.75rem)] overflow-y-auto px-5 pb-6 pt-1">{children}</div>
    </div>
  );
}