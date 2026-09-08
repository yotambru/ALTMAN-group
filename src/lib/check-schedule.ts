import { localTodayIso, rentOnDate } from "@/lib/lease-periods";
import type { CheckScheduleEntry, Payment, PaymentStatus, RentAdjustment } from "@/types";

export interface CheckDraft {
  clearanceDate: string;
  amount: string;
  checkNumber: string;
}

function parseYmd(iso: string): Date | null {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function formatYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonthsClamped(iso: string, months: number): string | null {
  const date = parseYmd(iso);
  if (!date) return null;
  const day = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return formatYmd(next);
}

function incrementCheckNumber(seed: string, offset: number): string {
  const trimmed = seed.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(.*?)(\d+)$/);
  if (!match) return offset === 0 ? trimmed : "";
  const next = String(Number(match[2]) + offset);
  return `${match[1]}${next.padStart(match[2].length, "0")}`;
}

/** Planned clearance date for a payment row (תאריך פרעון). */
export function paymentClearanceDate(payment: Payment): string {
  return (payment.depositDate || payment.dueDate || "").slice(0, 10);
}

export function paymentStatusForDate(
  iso: string,
  confirmed: boolean,
  today: string = localTodayIso(),
): PaymentStatus {
  if (confirmed) return "paid";
  const day = iso.slice(0, 10);
  if (!day) return "upcoming";
  if (day > today) return "upcoming";
  if (day === today) return "due";
  return "overdue";
}

export function livePaymentStatus(payment: Payment, today: string = localTodayIso()): PaymentStatus {
  if (payment.clearanceConfirmed || payment.status === "paid") return "paid";
  return paymentStatusForDate(paymentClearanceDate(payment), false, today);
}

/** Monthly check dates from the first clearance until lease end (or 12 months). */
export function buildMonthlyClearanceDates(firstIso: string, endIso?: string, maxMonths = 36): string[] {
  const first = firstIso.slice(0, 10);
  if (!parseYmd(first)) return [];
  const explicitEnd = endIso?.trim() ? parseYmd(endIso.slice(0, 10)) : null;
  const twelveMonths = parseYmd(addMonthsClamped(first, 11) ?? first);
  const last = explicitEnd ?? twelveMonths;
  const dates: string[] = [];
  for (let i = 0; i < maxMonths; i++) {
    const next = i === 0 ? first : addMonthsClamped(first, i);
    if (!next) break;
    const parsed = parseYmd(next);
    if (!parsed) break;
    if (last && parsed > last) break;
    dates.push(next);
  }
  return dates.length ? dates : [first];
}

export function buildCheckDrafts(opts: {
  firstDate: string;
  endDate?: string;
  startingMonthlyRent: number;
  rentAdjustments?: RentAdjustment[];
  firstCheckNumber?: string;
}): CheckDraft[] {
  const first = opts.firstDate.slice(0, 10);
  if (!parseYmd(first)) return [];
  const seed = opts.firstCheckNumber?.trim() ?? "";
  return buildMonthlyClearanceDates(first, opts.endDate).map((date, i) => ({
    clearanceDate: date,
    amount: String(
      rentOnDate(Math.max(0, opts.startingMonthlyRent), opts.rentAdjustments, date) || "",
    ),
    checkNumber: incrementCheckNumber(seed, i),
  }));
}

export function draftsToCheckEntries(rows: CheckDraft[]): CheckScheduleEntry[] {
  return rows
    .map((row) => ({
      clearanceDate: row.clearanceDate.slice(0, 10),
      amount: Number(String(row.amount).replace(/[^0-9.]/g, "")) || 0,
      checkNumber: row.checkNumber.trim() || undefined,
    }))
    .filter((row) => row.clearanceDate && row.amount > 0);
}

export function validateCheckDrafts(rows: CheckDraft[]): string | null {
  if (!rows.length) return "יש להזין לפחות צ׳ק אחד עם תאריך פרעון וסכום.";
  if (rows.some((row) => !row.clearanceDate.trim() || !(Number(String(row.amount).replace(/[^0-9.]/g, "")) > 0))) {
    return "יש להשלים תאריך פרעון וסכום לכל צ׳ק.";
  }
  return null;
}

export function isCheckPayment(payment: Payment): boolean {
  return payment.method === "check" || Boolean(payment.depositDate);
}

/** Upcoming / uncleared checks for the given leases, soonest first. */
export function upcomingCheckPayments(
  payments: Payment[],
  leaseIds: Iterable<string>,
  today: string = localTodayIso(),
): Payment[] {
  const allowed = new Set(leaseIds);
  return payments
    .filter((payment) => allowed.has(payment.leaseId) && isCheckPayment(payment))
    .filter((payment) => livePaymentStatus(payment, today) !== "paid")
    .sort((a, b) => paymentClearanceDate(a).localeCompare(paymentClearanceDate(b)));
}
