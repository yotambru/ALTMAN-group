import { cn } from "@/lib/utils";

interface LogoProps {
  /** "light" for dark/navy backgrounds, "dark" for light backgrounds. */
  tone?: "light" | "dark";
  className?: string;
  /** Show the small Hebrew tagline under the wordmark. */
  withTagline?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Temporary reusable ALTMAN Group wordmark built from styled text.
 * Isolated on purpose so it can be swapped for the official SVG/PNG later.
 */
export function Logo({
  tone = "dark",
  className,
  withTagline = true,
  size = "md",
}: LogoProps) {
  const word = tone === "light" ? "text-white" : "text-navy";
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  } as const;

  return (
    <div
      dir="ltr"
      className={cn("inline-flex flex-col items-center leading-none", className)}
      aria-label="ALTMAN Group"
    >
      <div className="flex items-end gap-1">
        <span
          className={cn(
            "font-extrabold tracking-tight text-orange",
            sizes[size],
          )}
        >
          A
        </span>
        <span className={cn("font-extrabold tracking-tight", word, sizes[size])}>
          LTMAN
        </span>
        <span className="mb-[2px] text-[0.6em] font-bold text-orange">Group</span>
      </div>
      {withTagline && (
        <span
          className={cn(
            "mt-0.5 text-[0.6rem] font-semibold tracking-wide",
            tone === "light" ? "text-white/75" : "text-text-muted",
          )}
        >
          כוח של קבוצה.
        </span>
      )}
    </div>
  );
}
