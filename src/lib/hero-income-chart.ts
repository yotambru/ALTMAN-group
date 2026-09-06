import type { Lease } from "@/types";
import {
  buildPortfolioYieldSeries,
  formatPercent,
  portfolioJoinDate,
} from "@/lib/portfolio";
import { formatCurrency, formatMonthYear } from "@/lib/utils";

/** Gentle rise used when a client has no income history yet. */
function placeholderSparklineValues(): number[] {
  const n = 18;
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const s = t * t * (3 - 2 * t);
    return 12 + 88 * s;
  });
}

export interface HeroIncomeChartProps {
  data: number[];
  /** 0–1: how far across the chart the line reaches. New clients stay partial. */
  progress: number;
  chartStartLabel?: string;
  chartEndLabel?: string;
  trendPercent?: number;
  trendLabel?: string;
}

/**
 * Sparkline props for the dashboard hero.
 * Always returns drawable data: a short rising stub when there is no history,
 * a partial line for a brand-new client, and a full series otherwise.
 */
export function heroIncomeChartProps(
  leases: Lease[],
  opts?: { startCaption?: "הצטרפות" | "התחלה" },
  asOf: Date = new Date(),
): HeroIncomeChartProps {
  const series = buildPortfolioYieldSeries(leases, asOf);
  const joinDate = portfolioJoinDate(leases);
  const startCaption = opts?.startCaption ?? "הצטרפות";
  const sincePhrase =
    startCaption === "התחלה" ? "תחילת הניהול" : "ההצטרפות";

  if (series.length === 0) {
    return {
      data: placeholderSparklineValues(),
      progress: 0.4,
    };
  }

  const first = series[0];
  const last = series[series.length - 1];
  const values = series.map((p) => p.monthlyIncome);
  const data = values.length === 1 ? [values[0], values[0]] : values;
  const joinLabel = joinDate ? formatMonthYear(joinDate) : "";
  const growth = last.incomeGrowthPercent;

  return {
    data,
    progress: series.length < 4 ? 0.55 : 1,
    chartStartLabel: joinDate
      ? `${startCaption} ${joinLabel} · ${formatCurrency(first.monthlyIncome)}`
      : undefined,
    chartEndLabel: `${growth >= 0 ? "+" : ""}${formatPercent(growth)} · ${formatCurrency(last.monthlyIncome)}`,
    trendPercent: growth,
    trendLabel: joinDate
      ? `גידול בהכנסות מאז ${sincePhrase} · ${joinLabel}`
      : "גידול בדמי שכירות",
  };
}
