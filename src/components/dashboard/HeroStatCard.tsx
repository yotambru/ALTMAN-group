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
  /** Caption under the left (start) of the sparkline — time axis is LTR. */
  chartStartLabel?: string;
  /** Caption under the right (today) of the sparkline. */
  chartEndLabel?: string;
  /** 0–1: how far the sparkline reaches. New clients stay partial. */
  chartProgress?: number;
  /** Month/value samples for hover on the sparkline. */
  chartPoints?: { label: string; value: number }[];
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
  chartStartLabel,
  chartEndLabel,
  chartProgress = 1,
  chartPoints,
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
      <section className={cn("glass-card flex flex-col px-5 pt-5 pb-3 lg:p-6", className)}>
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
          <div className="relative text-start">
            <p className="text-sm font-medium text-white/70">{label}</p>
            <p className="mt-1.5 text-[2.15rem] font-extrabold leading-none tracking-tight lg:text-[2.45rem]">
              {value}
            </p>
            {subtitle && (
              <p className="mt-2 text-xs font-medium text-white/60">{subtitle}</p>
            )}
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
          </div>
          {secondary && (
            <SecondaryTag
              type={secondary.onClick ? "button" : undefined}
              onClick={secondary.onClick}
              className={cn(
                "relative mt-4 w-full rounded-2xl border-2 border-orange/70 bg-gradient-to-l from-orange/30 via-orange/15 to-white/8 px-3.5 py-3 text-start shadow-lg lg:mt-0 lg:self-start lg:px-4 lg:py-4",
                secondary.onClick && "transition-colors hover:from-orange/40 hover:via-orange/20",
              )}
            >
              <p className="text-xs font-medium text-white/70">{secondary.label}</p>
              <p className="mt-1 text-xl font-extrabold leading-none tracking-tight text-white">
                {secondary.value}
              </p>
              {secondary.sublabel && (
                <p className="mt-1.5 text-[0.7rem] font-medium text-white/60">
                  {secondary.sublabel}
                </p>
              )}
            </SecondaryTag>
          )}
        </div>
        {data && (
          <div dir="ltr" className="relative z-10 mt-3 -mx-1 overflow-visible lg:mt-4 lg:pt-2">
            <Sparkline
              data={data}
              className="h-14 w-full lg:h-14"
              color="var(--orange)"
              fillOpacity={0.16}
              showStartDot
              startDotColor="white"
              endDotColor="white"
              progress={chartProgress}
              hoverPoints={chartPoints}
            />
            {(chartStartLabel || chartEndLabel) && (
              <div className="mt-1 flex justify-between gap-2 text-[0.65rem] font-semibold text-white/70 lg:text-xs">
                <span dir="rtl">{chartStartLabel}</span>
                <span dir="rtl" className="text-end">
                  {chartEndLabel}
                </span>
              </div>
            )}
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
