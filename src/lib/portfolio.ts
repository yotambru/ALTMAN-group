import type { Lease, Property, PropertyStatus } from "@/types";

/**
 * Average residential rental yield used for Israeli market valuation.
 * Anchoring property value to this rate at management-start lets subsequent
 * rent increases raise the displayed yield (instead of revaluing 1:1 with rent).
 */
export const ISRAEL_AVG_YIELD = 0.03;

/** Assumed annual rent indexation when reconstructing historical income. */
export const RENT_GROWTH_RATE = 0.03;

export const PROPERTY_STATUS_ORDER: PropertyStatus[] = [
  "rented",
  "vacant",
  "in_process",
  "renovation",
  "issue",
];

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  rented: "מושכר",
  vacant: "פנוי",
  in_process: "בתהליך",
  renovation: "בשיפוץ",
  issue: "תקלה",
};

export type StatusTone = "success" | "warning" | "navy" | "danger" | "neutral";

export const PROPERTY_STATUS_TONES: Record<PropertyStatus, StatusTone> = {
  rented: "success",
  vacant: "warning",
  in_process: "navy",
  renovation: "warning",
  issue: "danger",
};

/** Occupancy = share of properties that currently have a tenant. */
export function occupancyPercent(properties: Property[]): number {
  if (properties.length === 0) return 0;
  const occupied = properties.filter((p) => Boolean(p.tenantId) || p.status === "rented").length;
  return Math.round((occupied / properties.length) * 100);
}

/** Market value implied by annual rent ÷ average Israeli yield. */
export function estimateMarketValue(
  annualRent: number,
  yieldRate: number = ISRAEL_AVG_YIELD,
): number {
  if (annualRent <= 0 || yieldRate <= 0) return 0;
  return Math.round(annualRent / yieldRate);
}

export interface YieldPoint {
  year: number;
  /** 1–12 for monthly snapshots from the join date. */
  month?: number;
  /** ISO date of the snapshot (join date, month start, or Jan 1 of the year). */
  date: string;
  /** Annual rental income (ILS) at that snapshot. */
  annualIncome: number;
  /**
   * Cash yield vs each lease's management-start anchor (%).
   * Starts near the Israel average and rises as rent grows.
   */
  yieldPercent: number;
  /** Cumulative income growth vs the first snapshot (%). */
  incomeGrowthPercent: number;
}

type YieldSeed = Omit<YieldPoint, "yieldPercent" | "incomeGrowthPercent">;

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function isoDate(year: number, monthIndex: number, day = 1): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function leaseStartIso(lease: Lease): string {
  return (lease.managementStartDate ?? lease.startDate).slice(0, 10);
}

function leaseStartDate(lease: Lease): Date {
  return parseIsoDate(leaseStartIso(lease));
}

function leaseEndDate(lease: Lease, asOf: Date): Date {
  if (lease.active) return asOf;
  return parseIsoDate(lease.managementEndDate ?? lease.endDate);
}

/** Whether a lease contributed rental income during a calendar month (`monthIndex` 0–11). */
function leaseActiveInMonth(lease: Lease, year: number, monthIndex: number, asOf: Date): boolean {
  const start = leaseStartDate(lease);
  const end = leaseEndDate(lease, asOf);
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59);
  return monthEnd >= start && monthStart <= end;
}

/** Annualized rent at a month, deflated from today's rent by `RENT_GROWTH_RATE`. */
function annualRentInMonth(lease: Lease, year: number, monthIndex: number, asOf: Date): number {
  const monthsFromNow = Math.max(0, (asOf.getFullYear() - year) * 12 + (asOf.getMonth() - monthIndex));
  const monthly = lease.monthlyRent / Math.pow(1 + RENT_GROWTH_RATE, monthsFromNow / 12);
  return monthly * 12;
}

/** Market value locked in at the lease's management start (Israel avg yield). */
function leaseStartAnchor(lease: Lease, asOf: Date): number {
  const start = leaseStartDate(lease);
  return estimateMarketValue(annualRentInMonth(lease, start.getFullYear(), start.getMonth(), asOf));
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Yield-calculator metrics: each lease is valued at start-of-management
 * (annual rent ÷ Israel avg yield). Rent growth then lifts cash yield
 * without revaluing the asset 1:1. New leases add their own start anchor,
 * so adding a property raises income without faking a yield spike.
 */
function annotateYield(points: YieldSeed[], leases: Lease[], asOf: Date): YieldPoint[] {
  const baseIncome = points.find((p) => p.annualIncome > 0)?.annualIncome ?? 0;
  if (baseIncome <= 0) return [];

  return points.map((p) => {
    const active = leases.filter((l) => leaseActiveInMonth(l, p.year, (p.month ?? 1) - 1, asOf));
    const anchor = active.reduce((sum, l) => sum + leaseStartAnchor(l, asOf), 0);
    return {
      ...p,
      yieldPercent: anchor > 0 ? roundTenth((p.annualIncome / anchor) * 100) : 0,
      incomeGrowthPercent: roundTenth((p.annualIncome / baseIncome - 1) * 100),
    };
  });
}

/** Earliest management-start (when the landlord joined ALTMAN). */
export function portfolioJoinDate(leases: Lease[]): string | undefined {
  if (leases.length === 0) return undefined;
  return [...leases.map(leaseStartIso)].sort()[0];
}

/**
 * Yearly snapshots of the yield-calculator series: join month, then the
 * last month of each following year (including today). Used by bar charts.
 */
export function buildPortfolioYieldHistory(
  leases: Lease[],
  asOf: Date = new Date(),
): YieldPoint[] {
  const series = buildPortfolioYieldSeries(leases, asOf);
  if (series.length === 0) return [];

  const selected: YieldPoint[] = [];
  const seen = new Set<string>();
  const take = (p: YieldPoint) => {
    if (seen.has(p.date)) return;
    seen.add(p.date);
    selected.push(p);
  };

  take(series[0]);
  const lastByYear = new Map<number, YieldPoint>();
  for (const p of series) lastByYear.set(p.year, p);
  for (const year of [...lastByYear.keys()].sort((a, b) => a - b)) {
    take(lastByYear.get(year)!);
  }
  take(series.at(-1)!);
  return selected;
}

/**
 * Monthly yield-calculator series from the join date through `asOf`.
 * First point = month the landlord joined; later points = income, yield %
 * and cumulative income-growth % as the portfolio and rents change.
 */
export function buildPortfolioYieldSeries(
  leases: Lease[],
  asOf: Date = new Date(),
): YieldPoint[] {
  const joinIso = portfolioJoinDate(leases);
  if (!joinIso) return [];
  const join = parseIsoDate(joinIso);
  if (asOf < join) return [];

  const seeds: YieldSeed[] = [];
  const cursor = new Date(join.getFullYear(), join.getMonth(), 1);
  const last = new Date(asOf.getFullYear(), asOf.getMonth(), 1);

  while (cursor.getTime() <= last.getTime()) {
    const year = cursor.getFullYear();
    const monthIndex = cursor.getMonth();
    const annualIncome = Math.round(
      leases
        .filter((l) => leaseActiveInMonth(l, year, monthIndex, asOf))
        .reduce((sum, l) => sum + annualRentInMonth(l, year, monthIndex, asOf), 0),
    );
    seeds.push({
      year,
      month: monthIndex + 1,
      date: seeds.length === 0 ? joinIso : isoDate(year, monthIndex),
      annualIncome,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return annotateYield(seeds, leases, asOf);
}

/** Cumulative income growth (%) from join date → today (yield calculator). */
export function portfolioIncomeGrowth(
  leases: Lease[],
  asOf: Date = new Date(),
): number | undefined {
  const history = buildPortfolioYieldSeries(leases, asOf);
  if (history.length < 2) return undefined;
  return history.at(-1)!.incomeGrowthPercent;
}

/** Current portfolio yield vs the management-start anchors. */
export function currentPortfolioYield(leases: Lease[], asOf: Date = new Date()): number {
  const series = buildPortfolioYieldSeries(leases, asOf);
  return series.at(-1)?.yieldPercent ?? 0;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/**
 * Monthly management fee the landlord pays ALTMAN.
 * Prefers the stored incl.-VAT amount; falls back to before-VAT, then percent of rent.
 */
export function monthlyManagementFee(
  lease: Pick<
    Lease,
    "monthlyRent" | "managementFeePercent" | "managementFeeBeforeVat" | "managementFeeIncVat"
  >,
  fallbackPercent?: number,
): number {
  if (lease.managementFeeIncVat != null && lease.managementFeeIncVat > 0) {
    return lease.managementFeeIncVat;
  }
  if (lease.managementFeeBeforeVat != null && lease.managementFeeBeforeVat > 0) {
    return lease.managementFeeBeforeVat;
  }
  const pct = lease.managementFeePercent ?? fallbackPercent;
  if (pct != null && pct > 0 && lease.monthlyRent > 0) {
    return Math.round(lease.monthlyRent * (pct / 100));
  }
  return 0;
}
