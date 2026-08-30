import type { Lease } from "@/types";
import { localTodayIso } from "@/lib/lease-periods";

function parseYmd(iso: string): Date | null {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

function formatYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateForMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/**
 * Returns the next monthly payment on or after today.
 * The stored date supplies the payment day, while the current date prevents
 * an old persisted value from being displayed as the next payment forever.
 */
export function nextPaymentDate(lease: Lease, asOf: Date = new Date()): string | undefined {
  const anchor = parseYmd(lease.nextPaymentDate) ?? parseYmd(lease.startDate);
  if (!anchor) return undefined;

  const today = parseYmd(localTodayIso(asOf));
  if (!today) return undefined;

  let candidate: Date;
  if (anchor >= today) {
    candidate = anchor;
  } else {
    candidate = dateForMonth(today.getFullYear(), today.getMonth(), anchor.getDate());
    if (candidate < today) {
      candidate = dateForMonth(today.getFullYear(), today.getMonth() + 1, anchor.getDate());
    }
  }

  const end = parseYmd(lease.endDate);
  if (end && candidate > end) return undefined;
  return formatYmd(candidate);
}
