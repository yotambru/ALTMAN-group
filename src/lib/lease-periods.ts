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

/** Map period rents into lease starting rent + dated adjustments. */
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
    if (rent !== previous) {
      adjustments.push({ date: periods[i].startDate, monthlyRent: rent });
      previous = rent;
    }
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
