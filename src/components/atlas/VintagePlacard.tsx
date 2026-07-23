import type { ReactNode } from "react";

/**
 * Vermilion-inked plate for major geographic labels ("IDAHO"),
 * region titles, or emphasized status labels. Uses the display font
 * (Big Shoulders) for compact WPA-poster weight.
 */
export function VintagePlacard({
  children,
  size = "md",
  tone = "vermilion",
  className = "",
}: {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  tone?: "vermilion" | "ink" | "paper";
  className?: string;
}) {
  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3.5 py-1.5 text-sm",
  } as const;
  const tones = {
    vermilion:
      "font-display uppercase tracking-[0.18em] text-[var(--paper)] bg-[var(--vermilion)] border border-[var(--vermilion-deep)] shadow-[2px_2px_0_0_var(--ink)]",
    ink: "font-display uppercase tracking-[0.18em] text-[var(--paper)] bg-[var(--ink)] border border-[var(--ink)] shadow-[2px_2px_0_0_var(--vermilion)]",
    paper:
      "font-display uppercase tracking-[0.18em] text-[var(--vermilion)] bg-[var(--paper)] border border-[var(--vermilion)] shadow-[2px_2px_0_0_var(--vermilion)]",
  } as const;
  return (
    <span className={`inline-block ${sizes[size]} ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}