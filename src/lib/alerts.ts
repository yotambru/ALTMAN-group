import { daysUntil } from "@/lib/utils";
import type { Lease, Property, TenantOnboarding, UtilityKind } from "@/types";

const utilityLabel: Record<UtilityKind, string> = {
  arnona: "ארנונה",
  water: "מים",
  electricity: "חשמל",
  gas: "גז",
  vaad: "ועד בית",
};

const utilityOrder: UtilityKind[] = ["vaad", "gas", "electricity", "water", "arnona"];

export type CriticalKind = "lease_end" | "option" | "insurance" | "guarantee";

export interface CriticalDate {
  id: string;
  leaseId: string;
  propertyId: string;
  address: string;
  kind: CriticalKind;
  label: string;
  date: string; // ISO
  daysLeft: number;
}

const kindLabels: Record<CriticalKind, string> = {
  lease_end: "סיום חוזה",
  option: "מימוש אופציה",
  insurance: "חידוש ביטוח",
  guarantee: "פקיעת ערבויות",
};

/**
 * Critical dates within `windowDays` (default 90). Covers lease end, option
 * exercise, insurance renewal and guarantee expiry (section 5 — obligatory 90d).
 */
export function getCriticalDates(
  leases: Lease[],
  properties: Property[],
  windowDays = 90,
  from: Date = new Date(),
): CriticalDate[] {
  const byId = (id: string) => properties.find((p) => p.id === id);
  const out: CriticalDate[] = [];

  const push = (lease: Lease, kind: CriticalKind, date?: string) => {
    if (!date?.trim()) return;
    const daysLeft = daysUntil(date, from);
    if (!Number.isFinite(daysLeft) || daysLeft < 0 || daysLeft > windowDays) return;
    const property = byId(lease.propertyId);
    out.push({
      id: `${lease.id}_${kind}`,
      leaseId: lease.id,
      propertyId: lease.propertyId,
      address: property ? `${property.address}, ${property.city}` : "נכס",
      kind,
      label: kindLabels[kind],
      date,
      daysLeft,
    });
  };

  for (const lease of leases) {
    if (!lease.active) continue;
    push(lease, "lease_end", lease.endDate);
    push(lease, "option", lease.optionDate);
    push(lease, "insurance", lease.insuranceRenewalDate);
    push(lease, "guarantee", lease.guaranteeExpiry);
  }

  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Whether an item has been uploaded (submitted or already approved). */
function isUploaded(status: TenantOnboarding["insurance"]["status"]): boolean {
  return status === "submitted" || status === "approved";
}

function allUtilitiesUploaded(ob: TenantOnboarding): boolean {
  return utilityOrder.every((kind) => {
    const item = ob.utilities.find((u) => u.utility === kind);
    return item != null && isUploaded(item.status);
  });
}

const ALL_ONBOARDING_LABELS = [...utilityOrder.map((kind) => utilityLabel[kind]), "פוליסת ביטוח"];

/** Outstanding uploads for a tenant (utilities + insurance still pending). */
export function pendingOnboardingCount(ob: TenantOnboarding | undefined): number {
  return pendingOnboardingLabels(ob).length;
}

/** Hebrew labels for items the tenant still needs to upload. */
export function pendingOnboardingLabels(ob: TenantOnboarding | undefined): string[] {
  if (!ob) return [...ALL_ONBOARDING_LABELS];
  const labels: string[] = [];
  for (const kind of utilityOrder) {
    const item = ob.utilities.find((u) => u.utility === kind);
    if (!item || item.status === "pending") labels.push(utilityLabel[kind]);
  }
  if (ob.insurance.status === "pending") labels.push("פוליסת ביטוח");
  return labels;
}

/**
 * All required uploads are in, but management has not released the account yet.
 * Tenant stays locked until a manager/assistant approves.
 */
export function awaitingManagementApproval(ob: TenantOnboarding | undefined): boolean {
  if (!ob || ob.completed) return false;
  return allUtilitiesUploaded(ob) && isUploaded(ob.insurance.status);
}

/** Account is locked until onboarding is completed (uploads + management approval). Missing onboarding is treated as locked. */
export function isOnboardingLocked(ob: TenantOnboarding | undefined): boolean {
  return !ob || !ob.completed;
}

/**
 * Reminder cadence for onboarding: every 3 days in the first two weeks after
 * move-in, then daily until complete. Returns whether a reminder is "due today".
 */
export function onboardingReminderDue(
  ob: TenantOnboarding | undefined,
  from: Date = new Date(),
): { due: boolean; cadence: "none" | "every3" | "daily" } {
  if (!ob || ob.completed) return { due: false, cadence: "none" };
  const daysSinceMoveIn = Math.max(0, -daysUntil(ob.moveInDate, from));
  if (daysSinceMoveIn <= 14) {
    return { due: daysSinceMoveIn % 3 === 0, cadence: "every3" };
  }
  return { due: true, cadence: "daily" };
}

/** Whether AC filters are due for cleaning (every 3 months). */
export function acFilterDue(ob: TenantOnboarding | undefined, from: Date = new Date()): boolean {
  if (!ob) return false;
  const last = ob.acFilterLastCleaned ?? ob.moveInDate;
  const days = Math.max(0, -daysUntil(last, from));
  return days >= 90;
}
