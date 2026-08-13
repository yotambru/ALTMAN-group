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
  /** Annual rental income (ILS) at that year. */
  annualIncome: number;
  /**
   * Cash yield vs the management-start anchor value (%).
   * Starts near the Israel average and rises as rent grows.
   */
  yieldPercent: number;
  /** Cumulative income growth vs the first year (%). */
  incomeGrowthPercent: number;
}

function leaseStartYear(lease: Lease): number {
  return new Date(lease.managementStartDate ?? lease.startDate).getFullYear();
}

function leaseEndYear(lease: Lease, asOfYear: number): number {
  if (lease.active) return asOfYear;
  const iso = lease.managementEndDate ?? lease.endDate;
  return new Date(iso).getFullYear();
}

/** Whether a lease contributed rental income during `year`. */
function leaseActiveInYear(lease: Lease, year: number, asOfYear: number): boolean {
  return year >= leaseStartYear(lease) && year <= leaseEndYear(lease, asOfYear);
}

/**
 * Estimated annual rent for a lease in a given calendar year.
 * Current `monthlyRent` is treated as today's rent and deflated by
 * `RENT_GROWTH_RATE` for past years (prototype; real ledger later).
 */
function annualRentInYear(lease: Lease, year: number, asOfYear: number): number {
  const yearsFromNow = Math.max(0, asOfYear - year);
  const monthly = lease.monthlyRent / Math.pow(1 + RENT_GROWTH_RATE, yearsFromNow);
  return monthly * 12;
}

/**
 * Portfolio yield / income history from the earliest management start through `asOf`.
 *
 * Income is summed **per lease per year** — only leases that were under management
 * in that year count. Adding or renting a property raises recent years more than
 * early ones, so "גידול בהכנסות" updates automatically with the portfolio.
 *
 * Value is anchored once (start income ÷ Israel avg yield) so yield % grows with rent.
 */
export function buildPortfolioYieldHistory(
  leases: Lease[],
  asOf: Date = new Date(),
): YieldPoint[] {
  if (leases.length === 0) return [];

  const endYear = asOf.getFullYear();
  const startYear = Math.min(...leases.map(leaseStartYear));
  if (endYear < startYear) return [];

  const points: YieldPoint[] = [];
  for (let year = startYear; year <= endYear; year++) {
    const annualIncome = Math.round(
      leases
        .filter((l) => leaseActiveInYear(l, year, endYear))
        .reduce((sum, l) => sum + annualRentInYear(l, year, endYear), 0),
    );
    points.push({ year, annualIncome, yieldPercent: 0, incomeGrowthPercent: 0 });
  }

  const baseIncome = points.find((p) => p.annualIncome > 0)?.annualIncome ?? 0;
  if (baseIncome <= 0) return [];

  const anchorValue = estimateMarketValue(baseIncome);
  return points.map((p) => ({
    ...p,
    yieldPercent:
      anchorValue > 0 ? Math.round((p.annualIncome / anchorValue) * 1000) / 10 : 0,
    incomeGrowthPercent:
      baseIncome > 0
        ? Math.round(((p.annualIncome / baseIncome) - 1) * 1000) / 10
        : 0,
  }));
}

/** Cumulative income growth (%) from first management year → today. */
export function portfolioIncomeGrowth(
  leases: Lease[],
  asOf: Date = new Date(),
): number | undefined {
  const history = buildPortfolioYieldHistory(leases, asOf);
  if (history.length < 2) return undefined;
  return history.at(-1)!.incomeGrowthPercent;
}

/** Current portfolio yield vs the management-start anchor. */
export function currentPortfolioYield(leases: Lease[], asOf: Date = new Date()): number {
  const history = buildPortfolioYieldHistory(leases, asOf);
  return history.at(-1)?.yieldPercent ?? 0;
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
