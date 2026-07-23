import { Layers as LayersIcon, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import type { IdahoMode } from "@/lib/url-state";

export function DatasetSwitch({
  value,
  onChange,
}: {
  value: IdahoMode;
  onChange: (m: IdahoMode) => void;
}) {
  return (
    <div
      className="pointer-events-auto inline-flex overflow-hidden rounded-none border border-white/15 bg-spruce-deep/85 backdrop-blur"
      role="radiogroup"
      aria-label="Dataset"
    >
      <SwitchButton
        active={value === "inventory"}
        onClick={() => onChange("inventory")}
        label="Landscape Inventory"
        icon={<LayersIcon size={11} />}
      />
      <SwitchButton
        active={value === "sites"}
        onClick={() => onChange("sites")}
        label="Field Sites"
        icon={<MapPin size={11} />}
      />
    </div>
  );
}

function SwitchButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-field text-[10px] uppercase tracking-widest transition ${
        active ? "bg-ember/25 text-ember-soft" : "text-mineral hover:text-bone"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}