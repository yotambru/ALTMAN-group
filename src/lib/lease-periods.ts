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

/**
 * Split a lease into yearly rent periods (anniversary of start → next anniversary / end).
 * Without an end date, returns a single open period.
 */
export function buildLeasePeriods(startIso: string, endIso?: string): LeasePeriod[] {
  if (!startIso?.trim()) return [];
  const startStr = startIso.slice(0, 10);
  const start = parseYmd(startStr);

  if (!endIso?.trim()) {
    return [
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

  const today = new Date().toISOString().slice(0, 10);
  let current = starting;
  for (const adj of adjustments) {
    if (adj.date <= today) current = adj.monthlyRent;
  }

  return {
    monthlyRent: current,
    startingMonthlyRent: starting,
    rentAdjustments: adjustments,
  };
}
