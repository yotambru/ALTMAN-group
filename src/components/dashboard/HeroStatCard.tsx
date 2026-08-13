import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

interface HeroSecondaryStat {
  label: string;
  value: string;
  sublabel?: string;
  onClick?: () => void;
}

interface HeroStatCardProps {
  label: string;
  value: string;
  /** Optional trend series for the sparkline. */
  data?: number[];
  /** Optional line under the value (e.g. occupancy summary). */
  subtitle?: string;
  /** Percent change shown as a pill on glass tone (e.g. 8.3). */
  trendPercent?: number;
  trendLabel?: string;
  /** Companion metric in the glass hero (e.g. monthly income). */
  secondary?: HeroSecondaryStat;
  /**
   * `navy` — dark gradient card.
   * `focus` — light centered metric.
   * `glass` — Model E frosted card on dusk header.
   */
  tone?: "navy" | "focus" | "glass";
  className?: string;
}

/**
 * Focal dashboard metric. `glass` matches Model E dusk income card.
 */
export function HeroStatCard({
  label,
  value,
  data,
  subtitle,
  trendPercent,
  trendLabel = "לעומת חודש שעבר",
  secondary,
  tone = "navy",
  className,
}: HeroStatCardProps) {
  if (tone === "focus") {
    return (
      <section className={cn("px-2 pb-2 pt-5 text-center", className)}>
        <p className="text-[0.95rem] font-semibold text-navy">{label}</p>
        <p className="mt-2 text-[2.75rem] font-extrabold leading-none tracking-tight text-navy">
          {value}
        </p>
        {subtitle && (
          <p className="mt-2.5 text-xs font-medium text-text-muted">{subtitle}</p>
        )}
        {data && data.length > 1 && (
          <div className="mx-auto mt-4 max-w-[14rem]">
            <Sparkline data={data} className="h-10 w-full" color="var(--navy)" />
          </div>
        )}
      </section>
    );
  }

  if (tone === "glass") {
    const trendUp = trendPercent != null && trendPercent >= 0;
    const SecondaryTag = secondary?.onClick ? "button" : "div";
    return (
      <section className={cn("glass-card px-5 pt-5 pb-3", className)}>
        <div className="relative text-start">
          <p className="text-sm font-medium text-white/70">{label}</p>
          <p className="mt-1.5 text-[2.15rem] font-extrabold leading-none tracking-tight">
            {value}
          </p>
          {trendPercent != null && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold",
                  trendUp ? "bg-success/20 text-[#7dffb2]" : "bg-danger/25 text-[#ffb4ac]",
                )}
              >
                {trendUp ? "↑" : "↓"} {Math.abs(trendPercent).toFixed(1)}%
              </span>
              <span className="text-xs text-white/55">{trendLabel}</span>
            </div>
          )}
          {subtitle && trendPercent == null && (
            <p className="mt-2 text-xs font-medium text-white/60">{subtitle}</p>
          )}
        </div>
        {secondary && (
          <SecondaryTag
            type={secondary.onClick ? "button" : undefined}
            onClick={secondary.onClick}
            className={cn(
              "relative mt-4 w-full rounded-xl border border-white/12 bg-white/8 px-3.5 py-3 text-start",
              secondary.onClick && "transition-colors hover:bg-white/12",
            )}
          >
            <p className="text-xs font-medium text-white/65">{secondary.label}</p>
            <p className="mt-1 text-xl font-extrabold leading-none tracking-tight text-white">
              {secondary.value}
            </p>
            {secondary.sublabel && (
              <p className="mt-1.5 text-[0.7rem] font-medium text-white/50">
                {secondary.sublabel}
              </p>
            )}
          </SecondaryTag>
        )}
        {data && data.length > 1 && (
          <div className="relative mt-3 -mx-1">
            <Sparkline
              data={data}
              className="h-14 w-full"
              color="var(--orange)"
              fillOpacity={0.16}
            />
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={cn("hero-navy px-5 pt-5 pb-4", className)}>
      <div className="relative text-start">
        <p className="text-sm font-medium text-white/70">{label}</p>
        <p className="mt-1.5 text-[2.15rem] font-extrabold leading-none tracking-tight">
          {value}
        </p>
      </div>
      {data && data.length > 1 && (
        <div className="relative mt-3 -mx-5">
          <Sparkline data={data} className="h-14" color="rgba(255,255,255,0.85)" fillOpacity={0.12} />
        </div>
      )}
    </section>
  );
}
