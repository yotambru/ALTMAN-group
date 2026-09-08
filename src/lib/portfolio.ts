import type { Lease, Property, PropertyStatus } from "@/types";
import { localTodayIso, rentOnDate } from "@/lib/lease-periods";

/**
 * Valuation yield: total asset value is the amount of which 2.8% equals
 * the client's annual rental income (e.g. ₪7,000/mo → ₪3,000,000).
 */
export const PORTFOLIO_YIELD_RATE = 0.028;
export const ISRAEL_AVG_YIELD = PORTFOLIO_YIELD_RATE;

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

/** User-facing address with apartment number when present: `ספיר 21 דירה 5, כפר סבא`. */
export function propertyAddressLabel(
  property: Pick<Property, "address" | "city" | "apartmentNumber">,
): string {
  const apt = property.apartmentNumber?.trim();
  const city = property.city?.trim();
  const base = apt ? `${property.address} דירה ${apt}` : property.address;
  return city ? `${base}, ${city}` : base;
}

/** Same building together, then apartment number ascending (1, 2, 10…). */
export function comparePropertiesByLocation(
  a: Pick<Property, "city" | "address" | "apartmentNumber">,
  b: Pick<Property, "city" | "address" | "apartmentNumber">,
): number {
  const city = (a.city || "").localeCompare(b.city || "", "he");
  if (city !== 0) return city;
  const address = (a.address || "").localeCompare(b.address || "", "he", { numeric: true });
  if (address !== 0) return address;
  return (a.apartmentNumber || "").localeCompare(b.apartmentNumber || "", "he", { numeric: true });
}

export function sortPropertiesByLocation<T extends Pick<Property, "city" | "address" | "apartmentNumber">>(
  items: T[],
): T[] {
  return [...items].sort(comparePropertiesByLocation);
}

/** Occupancy = share of properties that currently have a tenant. */
export function occupancyPercent(properties: Property[]): number {
  if (properties.length === 0) return 0;
  const occupied = properties.filter((p) => Boolean(p.tenantId) || p.status === "rented").length;
  return Math.round((occupied / properties.length) * 100);
}

/** Market value implied by annual rent ÷ the 2.8% portfolio yield. */
export function estimateMarketValue(
  annualRent: number,
  yieldRate: number = PORTFOLIO_YIELD_RATE,
): number {
  if (annualRent <= 0 || yieldRate <= 0) return 0;
  return Math.round(annualRent / yieldRate);
}

/** Total asset value such that 2.8% of it equals annual rental income. */
export function impliedPortfolioValue(monthlyIncome: number): number {
  return estimateMarketValue(monthlyIncome * 12);
}

/**
 * Display value for a property: stored appraisal if set, otherwise the 2.8%
 * yield estimate from current (or listed) monthly rent.
 */
export function propertyDisplayValue(
  property: Pick<Property, "value" | "listedRent">,
  monthlyRent?: number,
): number {
  if (property.value > 0) return property.value;
  const rent = monthlyRent && monthlyRent > 0 ? monthlyRent : property.listedRent ?? 0;
  return impliedPortfolioValue(rent);
}

/** Monthly rent in force today (starting rent + adjustments), not the frozen saved field. */
export function currentMonthlyRent(
  lease: Pick<Lease, "monthlyRent" | "startingMonthlyRent" | "rentAdjustments">,
  asOf: Date = new Date(),
): number {
  const starting = lease.startingMonthlyRent ?? lease.monthlyRent;
  const fromSchedule = rentOnDate(starting, lease.rentAdjustments, localTodayIso(asOf));
  if (lease.rentAdjustments?.length) return fromSchedule;
  return lease.monthlyRent > 0 ? lease.monthlyRent : fromSchedule;
}

/** Sum of current monthly rent from the given leases. */
export function monthlyRentalIncome(leases: Lease[]): number {
  return leases.reduce((sum, l) => sum + currentMonthlyRent(l), 0);
}

export function activeLeaseForProperty(leases: Lease[], propertyId: string): Lease | undefined {
  return leases.find((l) => l.active && l.propertyId === propertyId);
}

/**
 * Monthly income for a property: live lease rent, otherwise listed rent when
 * the unit is occupied. Keeps the hero totals aligned with property rows when
 * a tenant exists but the lease row never persisted (or has ₪0 rent).
 */
export function propertyMonthlyIncome(
  property: Pick<Property, "listedRent" | "status" | "tenantId">,
  lease?: Pick<Lease, "monthlyRent" | "startingMonthlyRent" | "rentAdjustments"> | null,
): number {
  if (lease) {
    const rent = currentMonthlyRent(lease);
    if (rent > 0) return rent;
  }
  if (property.tenantId || property.status === "rented") {
    return property.listedRent && property.listedRent > 0 ? property.listedRent : 0;
  }
  return 0;
}

/** Portfolio totals that match the per-property values shown in the list. */
export function summarizePortfolio(
  properties: Property[],
  leases: Lease[],
): { monthlyIncome: number; portfolioValue: number } {
  let monthlyIncome = 0;
  let portfolioValue = 0;
  for (const property of properties) {
    const lease = activeLeaseForProperty(leases, property.id);
    const rent = propertyMonthlyIncome(property, lease);
    monthlyIncome += rent;
    portfolioValue += propertyDisplayValue(property, rent);
  }
  return { monthlyIncome, portfolioValue };
}

export interface YieldPoint {
  year: number;
  /** 1–12 for monthly snapshots from the join date. */
  month?: number;
  /** ISO date of the snapshot (join date, month end, or today). */
  date: string;
  /** Monthly rental income (ILS) at that snapshot. */
  monthlyIncome: number;
  /** Annualized rental income (monthly × 12). */
  annualIncome: number;
  /** Valuation yield used to imply asset value (always 2.8% when there is rent). */
  yieldPercent: number;
  /** Cumulative income growth vs the join-date snapshot (%). */
  incomeGrowthPercent: number;
}

type YieldSeed = Pick<YieldPoint, "year" | "month" | "date" | "monthlyIncome">;

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function isoDate(year: number, monthIndex: number, day = 1): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
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

function leaseActiveOn(lease: Lease, at: Date, asOf: Date): boolean {
  const start = leaseStartDate(lease);
  const end = leaseEndDate(lease, asOf);
  return at >= start && at <= end;
}

/** Monthly rent in force on `at` (starting rent + adjustments up to that day). */
function monthlyRentOnDate(lease: Lease, at: Date, asOf: Date): number {
  if (!leaseActiveOn(lease, at, asOf)) return 0;
  const starting = lease.startingMonthlyRent ?? lease.monthlyRent;
  return rentOnDate(
    starting,
    lease.rentAdjustments,
    isoDate(at.getFullYear(), at.getMonth(), at.getDate()),
  );
}

function portfolioMonthlyOn(leases: Lease[], at: Date, asOf: Date): number {
  return Math.round(leases.reduce((sum, l) => sum + monthlyRentOnDate(l, at, asOf), 0));
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function annotateIncome(points: YieldSeed[]): YieldPoint[] {
  const baseIncome = points.find((p) => p.monthlyIncome > 0)?.monthlyIncome ?? 0;
  if (baseIncome <= 0) return [];
  const yieldPercent = roundTenth(PORTFOLIO_YIELD_RATE * 100);

  return points.map((p) => ({
    ...p,
    annualIncome: p.monthlyIncome * 12,
    yieldPercent: p.monthlyIncome > 0 ? yieldPercent : 0,
    incomeGrowthPercent: roundTenth((p.monthlyIncome / baseIncome - 1) * 100),
  }));
}

/** Earliest management-start (when the landlord joined ALTMAN). */
export function portfolioJoinDate(leases: Lease[]): string | undefined {
  if (leases.length === 0) return undefined;
  return [...leases.map(leaseStartIso)].sort()[0];
}

/**
 * Chart snapshots: join date, each rent change, and a point for every calendar
 * year through today — so the graph always shows real ₪ amounts, not a flat stub.
 */
export function buildPortfolioYieldHistory(
  leases: Lease[],
  asOf: Date = new Date(),
): YieldPoint[] {
  const series = buildPortfolioYieldSeries(leases, asOf);
  if (series.length === 0) return [];

  const selected: YieldPoint[] = [];
  const seen = new Set<string>();
  const take = (p: YieldPoint | undefined) => {
    if (!p || seen.has(p.date)) return;
    seen.add(p.date);
    selected.push(p);
  };

  take(series[0]);
  let prevIncome = series[0].monthlyIncome;
  for (const point of series.slice(1)) {
    if (point.monthlyIncome !== prevIncome) {
      take(point);
      prevIncome = point.monthlyIncome;
    }
  }

  const lastByYear = new Map<number, YieldPoint>();
  for (const p of series) lastByYear.set(p.year, p);
  for (const year of [...lastByYear.keys()].sort((a, b) => a - b)) {
    if (selected.some((s) => s.year === year)) continue;
    take(lastByYear.get(year));
  }
  take(series.at(-1));
  return selected.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Monthly income from the join date through `asOf`.
 * First point = rent the properties generated the day the client joined;
 * later points rise only when a lease starts or rent is updated.
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
    const isFirst = seeds.length === 0;
    const isCurrent = year === asOf.getFullYear() && monthIndex === asOf.getMonth();
    const at = isFirst
      ? join
      : isCurrent
        ? asOf
        : new Date(year, monthIndex, lastDayOfMonth(year, monthIndex));
    seeds.push({
      year,
      month: monthIndex + 1,
      date: isFirst ? joinIso : isoDate(year, monthIndex, at.getDate()),
      monthlyIncome: portfolioMonthlyOn(leases, at, asOf),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return annotateIncome(seeds);
}

/** Cumulative income growth (%) from join-date rent → today. */
export function portfolioIncomeGrowth(
  leases: Lease[],
  asOf: Date = new Date(),
): number | undefined {
  const history = buildPortfolioYieldSeries(leases, asOf);
  if (history.length < 2) return undefined;
  return history.at(-1)!.incomeGrowthPercent;
}

/** Display yield: 2.8% whenever the client has rental income. */
export function currentPortfolioYield(leases: Lease[]): number {
  const income = monthlyRentalIncome(leases.filter((l) => l.active));
  return income > 0 ? roundTenth(PORTFOLIO_YIELD_RATE * 100) : 0;
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
    | "monthlyRent"
    | "startingMonthlyRent"
    | "rentAdjustments"
    | "managementFeePercent"
    | "managementFeeBeforeVat"
    | "managementFeeIncVat"
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
  const rent = currentMonthlyRent(lease);
  if (pct != null && pct > 0 && rent > 0) {
    return Math.round(rent * (pct / 100));
  }
  return 0;
}
