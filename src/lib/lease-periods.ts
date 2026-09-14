import type { RentAdjustment } from "@/types";

export interface LeasePeriod {
  index: number;
  startDate: string;
  endDate: string;
  label: string;
}

function parseYmd(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addYears(d: Date, years: number): Date {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function addMonths(d: Date, months: number): Date {
  const day = d.getDate();
  const next = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

export function addMonthsIso(iso: string, months: number): string {
  return formatYmd(addMonths(parseYmd(iso.slice(0, 10)), months));
}

export function makeLeasePeriod(index: number, startDate: string, endDate: string): LeasePeriod {
  const start = startDate.slice(0, 10);
  const end = endDate.slice(0, 10);
  return {
    index,
    startDate: start,
    endDate: end,
    label: end
      ? `תקופה ${index} (${formatHebShort(start)} – ${formatHebShort(end)})`
      : `תקופה ${index} (מ-${formatHebShort(start)})`,
  };
}

export function relabelLeasePeriods(periods: LeasePeriod[]): LeasePeriod[] {
  return periods.map((period, i) => makeLeasePeriod(i + 1, period.startDate, period.endDate));
}

/** True when the contract spans more than 12 months. */
export function leaseLongerThanYear(startIso: string, endIso?: string): boolean {
  if (!startIso?.trim() || !endIso?.trim()) return false;
  return parseYmd(endIso.slice(0, 10)) > addMonths(parseYmd(startIso.slice(0, 10)), 12);
}

function formatHebShort(iso: string): string {
  return parseYmd(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Local calendar day as YYYY-MM-DD (not UTC). */
export function localTodayIso(asOf: Date = new Date()): string {
  return formatYmd(new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate()));
}

/** Monthly rent in force on `atIso`, from starting rent + dated adjustments. */
export function rentOnDate(
  startingMonthlyRent: number,
  adjustments: RentAdjustment[] | undefined,
  atIso: string,
): number {
  let rent = Math.max(0, startingMonthlyRent);
  const at = atIso.slice(0, 10);
  const sorted = [...(adjustments ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  for (const adj of sorted) {
    if (adj.date.slice(0, 10) <= at) rent = adj.monthlyRent;
  }
  return rent;
}

/** Keep period-rent inputs aligned with the current number of yearly periods. */
export function alignPeriodRents(prev: string[], count: number, fill = ""): string[] {
  if (count <= 0) return [""];
  // Always return a new array so callers can assign indexes without mutating React state.
  if (prev.length === count) return [...prev];
  if (prev.length < count) {
    const last = prev[prev.length - 1] ?? fill;
    return [...prev, ...Array.from({ length: count - prev.length }, () => last || fill)];
  }
  return prev.slice(0, count);
}

/** Keep optional per-period slots (e.g. lease PDFs) aligned with period count. */
export function alignPeriodSlots<T>(prev: (T | null)[], count: number): (T | null)[] {
  const n = Math.max(count, 1);
  if (prev.length === n) return [...prev];
  if (prev.length < n) {
    return [...prev, ...Array.from({ length: n - prev.length }, () => null)];
  }
  return prev.slice(0, n);
}

/**
 * Split a lease into yearly rent periods (anniversary of start → next anniversary / end).
 * Without an end date, returns one period per elapsed year through today (current period open).
 */
export function buildLeasePeriods(
  startIso: string,
  endIso?: string,
  asOf: Date = new Date(),
): LeasePeriod[] {
  if (!startIso?.trim()) return [];
  const startStr = startIso.slice(0, 10);
  const start = parseYmd(startStr);

  if (!endIso?.trim()) {
    const today = parseYmd(localTodayIso(asOf));
    const periods: LeasePeriod[] = [];
    for (let i = 0; i < 20; i++) {
      const periodStart = addYears(start, i);
      if (periodStart > today) break;
      const anniversary = addYears(start, i + 1);
      const isCurrent = !(anniversary <= today);
      const pStart = formatYmd(periodStart);
      const pEnd = isCurrent ? "" : formatYmd(anniversary);
      periods.push({
        index: i + 1,
        startDate: pStart,
        endDate: pEnd,
        label: isCurrent
          ? `תקופה ${i + 1} (מ-${formatHebShort(pStart)})`
          : `תקופה ${i + 1} (${formatHebShort(pStart)} – ${formatHebShort(pEnd)})`,
      });
    }
    return periods.length
      ? periods
      : [
          {
            index: 1,
            startDate: startStr,
            endDate: "",
            label: "תקופה 1",
          },
        ];
  }

  const endStr = endIso.slice(0, 10);
  const end = parseYmd(endStr);
  if (!(end > start)) {
    return [
      {
        index: 1,
        startDate: startStr,
        endDate: endStr,
        label: "תקופה 1",
      },
    ];
  }

  const periods: LeasePeriod[] = [];
  for (let i = 0; i < 20; i++) {
    const periodStart = addYears(start, i);
    if (!(periodStart < end)) break;
    const anniversary = addYears(start, i + 1);
    const periodEnd = anniversary < end ? anniversary : end;
    const pStart = formatYmd(periodStart);
    const pEnd = formatYmd(periodEnd);
    periods.push({
      index: i + 1,
      startDate: pStart,
      endDate: pEnd,
      label: `תקופה ${i + 1} (${formatHebShort(pStart)} – ${formatHebShort(pEnd)})`,
    });
  }

  return periods.length
    ? periods
    : [
        {
          index: 1,
          startDate: startStr,
          endDate: endStr,
          label: "תקופה 1",
        },
      ];
}

/**
 * Rebuild periods from lease start/end plus interior boundaries (stored as rent adjustment dates).
 * Falls back to yearly anniversary slices when no custom boundaries exist.
 */
export function resolveLeasePeriods(
  startIso: string,
  endIso?: string,
  adjustments?: RentAdjustment[],
): LeasePeriod[] {
  const start = startIso?.slice(0, 10);
  if (!start) return [];
  const end = endIso?.slice(0, 10) ?? "";
  const interiors = [...new Set(
    (adjustments ?? [])
      .map((item) => item.date.slice(0, 10))
      .filter((date) => date > start && (!end || date < end)),
  )].sort();
  if (interiors.length && end) {
    const bounds = [start, ...interiors, end];
    return relabelLeasePeriods(
      bounds.slice(0, -1).map((bound, i) => makeLeasePeriod(i + 1, bound, bounds[i + 1] ?? end)),
    );
  }
  return buildLeasePeriods(start, end || undefined);
}

/** Keep interior period starts when the overall lease dates change. */
export function rescaleLeasePeriods(
  previous: LeasePeriod[],
  startIso: string,
  endIso: string,
): LeasePeriod[] {
  if (!startIso.trim()) return [];
  if (!previous.length) return buildLeasePeriods(startIso, endIso || undefined);
  const interiors = previous
    .slice(1)
    .map((period) => period.startDate.slice(0, 10))
    .filter((date) => date > startIso.slice(0, 10) && (!endIso || date < endIso.slice(0, 10)));
  if (!interiors.length) return buildLeasePeriods(startIso, endIso || undefined);
  return resolveLeasePeriods(
    startIso,
    endIso || undefined,
    interiors.map((date) => ({ date, monthlyRent: 0 })),
  );
}

/** Change period `index` (0-based) end date and shift the next period's start. */
export function setPeriodEnd(
  periods: LeasePeriod[],
  index: number,
  nextEndIso: string,
  leaseEndIso: string,
): LeasePeriod[] {
  if (!periods[index]) return periods;
  const start = periods[index].startDate.slice(0, 10);
  let end = nextEndIso.slice(0, 10);
  const cap = leaseEndIso.slice(0, 10);
  if (end <= start) return periods;
  if (cap && end > cap) end = cap;
  const next = periods.map((period) => ({ ...period }));
  next[index] = makeLeasePeriod(index + 1, start, end);
  if (index < next.length - 1) {
    next[index + 1] = makeLeasePeriod(index + 2, end, next[index + 1].endDate);
  }
  const cleaned = next.filter((period) => !period.endDate || period.startDate < period.endDate);
  if (cleaned.length && cap) {
    const last = cleaned[cleaned.length - 1];
    cleaned[cleaned.length - 1] = makeLeasePeriod(cleaned.length, last.startDate, cap);
  }
  return relabelLeasePeriods(cleaned);
}

/** Stored custom periods if present; otherwise yearly anniversary slices. */
export function activeLeasePeriods(
  stored: LeasePeriod[],
  startIso: string,
  endIso?: string,
): LeasePeriod[] {
  if (stored.length) return stored;
  return startIso.trim() ? buildLeasePeriods(startIso, endIso) : [];
}

/** Split the last period (prefer +12 months from its start, otherwise midpoint). */
export function addLeasePeriod(periods: LeasePeriod[]): LeasePeriod[] {
  if (!periods.length) return periods;
  const last = periods[periods.length - 1];
  if (!last.endDate) return periods;
  let split = addMonthsIso(last.startDate, 12);
  if (split <= last.startDate || split >= last.endDate) {
    const mid = (parseYmd(last.startDate).getTime() + parseYmd(last.endDate).getTime()) / 2;
    split = formatYmd(new Date(mid));
  }
  if (split <= last.startDate || split >= last.endDate) return periods;
  return relabelLeasePeriods([
    ...periods.slice(0, -1),
    makeLeasePeriod(0, last.startDate, split),
    makeLeasePeriod(0, split, last.endDate),
  ]);
}

export function removeLastLeasePeriod(periods: LeasePeriod[]): LeasePeriod[] {
  if (periods.length <= 1) return periods;
  const last = periods[periods.length - 1];
  const prev = periods[periods.length - 2];
  return relabelLeasePeriods([
    ...periods.slice(0, -2),
    makeLeasePeriod(0, prev.startDate, last.endDate),
  ]);
}

/** Map period rents into lease starting rent + dated adjustments (boundaries always stored). */
export function rentScheduleFromPeriods(
  periods: LeasePeriod[],
  rents: number[],
): {
  monthlyRent: number;
  startingMonthlyRent: number;
  rentAdjustments: RentAdjustment[];
} {
  const starting = Math.max(0, rents[0] ?? 0);
  const adjustments: RentAdjustment[] = [];
  let previous = starting;
  for (let i = 1; i < periods.length; i++) {
    const rent = Math.max(0, rents[i] ?? previous);
    adjustments.push({ date: periods[i].startDate, monthlyRent: rent });
    previous = rent;
  }

  const today = localTodayIso();
  let current = starting;
  for (const adj of adjustments) {
    if (adj.date.slice(0, 10) <= today) current = adj.monthlyRent;
  }

  return {
    monthlyRent: current,
    startingMonthlyRent: starting,
    rentAdjustments: adjustments,
  };
}
