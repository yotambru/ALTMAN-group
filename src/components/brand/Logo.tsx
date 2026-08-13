import { cn } from "@/lib/utils";

interface LogoProps {
  /** "light" for dark/navy backgrounds, "dark" for light backgrounds. */
  tone?: "light" | "dark";
  className?: string;
  /** Show the small Hebrew tagline under the wordmark. */
  withTagline?: boolean;
  size?: "sm" | "md" | "lg";
}

/** Temporary ALTMAN Group wordmark — Focus Strip style. */
export function Logo({
  tone = "dark",
  className,
  withTagline = true,
  size = "md",
}: LogoProps) {
  const word = tone === "light" ? "text-white" : "text-navy";
  const sizes = {
    sm: "text-[1.15rem]",
    md: "text-2xl",
    lg: "text-3xl",
  } as const;
  const groupSizes = {
    sm: "text-[0.55rem]",
    md: "text-[0.65rem]",
    lg: "text-xs",
  } as const;

  return (
    <div
      dir="ltr"
      className={cn("inline-flex flex-col items-center leading-none", className)}
      aria-label="ALTMAN Group"
    >
      <span className={cn("font-extrabold tracking-[0.04em]", word, sizes[size])}>
        ALTMAN
      </span>
      <span
        className={cn(
          "mt-0.5 flex items-center gap-1.5 font-bold tracking-[0.28em]",
          tone === "light" ? "text-white/80" : "text-navy/70",
          groupSizes[size],
        )}
      >
        <span className={cn("h-px w-3", tone === "light" ? "bg-white/50" : "bg-navy/30")} />
        GROUP
        <span className={cn("h-px w-3", tone === "light" ? "bg-white/50" : "bg-navy/30")} />
      </span>
      {withTagline && (
        <span
          className={cn(
            "mt-1 text-[0.6rem] font-semibold tracking-wide",
            tone === "light" ? "text-white/75" : "text-text-muted",
          )}
        >
          כוח של קבוצה.
        </span>
      )}
    </div>
  );
}
