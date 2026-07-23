import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Tone = "vermilion" | "ink" | "paper";
type Size = "sm" | "md";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  size?: Size;
  children: ReactNode;
};

/**
 * Square, clipped-corner button with a printed-offset vermilion shadow.
 * Replaces rounded-pill CTAs where a stronger poster gesture is wanted.
 * Hover subtly lifts (translate + tightened offset). Reduced-motion safe.
 */
export const InkButton = forwardRef<HTMLButtonElement, Props>(function InkButton(
  { tone = "vermilion", size = "md", className = "", children, ...rest },
  ref,
) {
  const sizes: Record<Size, string> = {
    sm: "px-2.5 py-1 text-[10px]",
    md: "px-3.5 py-1.5 text-[11px]",
  };
  const tones: Record<Tone, string> = {
    vermilion:
      "bg-[var(--vermilion)] text-[var(--paper)] border-[var(--vermilion-deep)] shadow-[2px_2px_0_0_var(--ink)] hover:shadow-[1px_1px_0_0_var(--ink)] hover:translate-x-[1px] hover:translate-y-[1px]",
    ink: "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)] shadow-[2px_2px_0_0_var(--vermilion)] hover:shadow-[1px_1px_0_0_var(--vermilion)] hover:translate-x-[1px] hover:translate-y-[1px]",
    paper:
      "bg-[var(--paper)] text-[var(--ink)] border-[var(--ink)] shadow-[2px_2px_0_0_var(--vermilion)] hover:bg-[var(--paper-deep)] hover:shadow-[1px_1px_0_0_var(--vermilion)] hover:translate-x-[1px] hover:translate-y-[1px]",
  };
  return (
    <button
      ref={ref}
      className={`inline-flex items-center gap-1.5 border font-field uppercase tracking-[0.2em] transition-[transform,box-shadow] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] focus-visible:ring-[var(--vermilion)] ${sizes[size]} ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});