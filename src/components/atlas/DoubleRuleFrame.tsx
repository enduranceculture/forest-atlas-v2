import type { ReactNode } from "react";

type Variant = "poster" | "inset" | "panel";

/**
 * Nested vermilion + ink border, printed-map style.
 * - "poster": heavy outer + inner rule, the hero frame around a page.
 * - "inset":  a printed inset panel for legends / notes / sidebars.
 * - "panel":  slim single-rule frame for compact controls.
 * Clipped corners give the plate its 1930s printed feel without leaning
 * into "distressed" texture.
 */
export function DoubleRuleFrame({
  variant = "inset",
  children,
  className = "",
  as: Tag = "div",
  label,
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "aside" | "header" | "footer" | "article";
  label?: string;
}) {
  if (variant === "poster") {
    return (
      <Tag
        className={`relative isolate p-[6px] ${className}`}
        style={{
          background:
            "linear-gradient(var(--vermilion),var(--vermilion)) padding-box, var(--paper)",
          border: "1px solid var(--vermilion)",
        }}
      >
        <div
          className="relative"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--vermilion)",
            boxShadow:
              "inset 0 0 0 6px var(--paper), inset 0 0 0 7px var(--ink)",
          }}
        >
          {label ? (
            <div className="pointer-events-none absolute -top-[9px] left-6 z-10 bg-[var(--paper)] px-2 font-field text-[9px] uppercase tracking-[0.3em] text-[var(--vermilion)]">
              {label}
            </div>
          ) : null}
          {children}
        </div>
      </Tag>
    );
  }
  if (variant === "inset") {
    return (
      <Tag
        className={`relative ${className}`}
        style={{
          background: "var(--paper)",
          border: "1px solid var(--vermilion)",
          boxShadow:
            "inset 0 0 0 3px var(--paper), inset 0 0 0 4px var(--vermilion)",
        }}
      >
        {label ? (
          <div className="pointer-events-none absolute -top-[8px] left-4 z-10 bg-[var(--paper)] px-1.5 font-field text-[9px] uppercase tracking-[0.28em] text-[var(--vermilion)]">
            {label}
          </div>
        ) : null}
        {children}
      </Tag>
    );
  }
  // panel — slim single rule
  return (
    <Tag
      className={`relative ${className}`}
      style={{
        background: "var(--paper)",
        border: "1px solid color-mix(in oklab, var(--ink) 60%, transparent)",
      }}
    >
      {children}
    </Tag>
  );
}