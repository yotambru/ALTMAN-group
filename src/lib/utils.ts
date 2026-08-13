/** Small presentation helpers shared across the app. */

/** Join class names, dropping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Format an ILS amount, e.g. 2450000 -> "₪2,450,000". */
export function formatCurrency(value: number): string {
  return `₪${value.toLocaleString("en-US")}`;
}

/** Format an ISO date as DD.MM.YYYY (used across dashboards). */
export function formatDateDots(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/** Format an ISO date as DD/MM/YYYY. */
export function formatDateSlashes(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Whole days from today until an ISO date (negative if past). */
export function daysUntil(iso: string, from: Date = new Date()): number {
  const target = new Date(iso);
  const ms = target.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Calendar-day difference (0 = same day, 1 = yesterday when looking at past). */
function calendarDaysAgo(iso: string, from: Date = new Date()): number {
  const then = new Date(iso);
  const startToday = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const startThen = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  return Math.round((startToday.getTime() - startThen.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * WhatsApp-style list timestamp (Hebrew):
 * today → time, another day this week → weekday name, older → date.
 */
export function formatChatListTime(iso: string, from: Date = new Date()): string {
  const then = new Date(iso);
  const daysAgo = calendarDaysAgo(iso, from);

  if (daysAgo <= 0) {
    return then.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  }
  if (daysAgo === 1) return "אתמול";
  if (daysAgo < 7) {
    return then.toLocaleDateString("he-IL", { weekday: "long" });
  }
  if (then.getFullYear() === from.getFullYear()) {
    const dd = String(then.getDate()).padStart(2, "0");
    const mm = String(then.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}`;
  }
  return formatDateDots(iso);
}

/** Hebrew relative phrase, e.g. "בעוד 5 ימים" / "בעוד 3 חודשים". */
export function humanizeUntil(iso: string, from: Date = new Date()): string {
  const days = daysUntil(iso, from);
  if (days < 0) return "עבר התאריך";
  if (days === 0) return "היום";
  if (days === 1) return "מחר";
  if (days < 31) return `בעוד ${days} ימים`;
  const months = Math.round(days / 30);
  if (months === 1) return "בעוד חודש";
  return `בעוד ${months} חודשים`;
}

/** Generate a lightweight unique-ish id for mock records. */
export function generateId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Read a File into a data URL (used for prototype uploads/attachments). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
