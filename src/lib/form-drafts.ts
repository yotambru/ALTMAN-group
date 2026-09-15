import { storage } from "@/lib/storage";
import type { CheckDraft } from "@/lib/check-schedule";
import type { LeasePeriod } from "@/lib/lease-periods";
import type { TenantPersonForm } from "@/features/landlord/TenantPeopleFields";
import type { CriticalLeaseDates } from "@/features/leases/CriticalLeaseDatesFields";

export interface AddTenantDraft {
  propertyId: string;
  primary: TenantPersonForm;
  secondary: TenantPersonForm;
  startDate: string;
  endDate: string;
  leasePeriods: LeasePeriod[];
  periodRents: string[];
  checkRows: CheckDraft[];
  criticalDates: CriticalLeaseDates;
  savedAt: string;
}

const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isFresh(savedAt: string): boolean {
  const t = Date.parse(savedAt);
  return Number.isFinite(t) && Date.now() - t < DRAFT_MAX_AGE_MS;
}

/** Persist in-progress "שוכר חדש" form (text fields only — files stay in memory). */
export function saveAddTenantDraft(draft: Omit<AddTenantDraft, "savedAt">): void {
  storage.setItem(storage.keys.addTenantDraft, {
    ...draft,
    savedAt: new Date().toISOString(),
  } satisfies AddTenantDraft);
}

export function loadAddTenantDraft(): AddTenantDraft | null {
  const draft = storage.getItem<AddTenantDraft | null>(storage.keys.addTenantDraft, null);
  if (!draft?.savedAt || !isFresh(draft.savedAt)) {
    clearAddTenantDraft();
    return null;
  }
  return draft;
}

export function clearAddTenantDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storage.keys.addTenantDraft);
  } catch {
    /* ignore */
  }
}

export interface AddClientTenantDraft {
  includeTenant: boolean;
  tenantPrimary: TenantPersonForm;
  tenantSecondary: TenantPersonForm;
  leaseStartDate: string;
  leaseEndDate: string;
  leasePeriods: LeasePeriod[];
  periodRents: string[];
  checkRows: CheckDraft[];
  criticalDates: CriticalLeaseDates;
  city: string;
  address: string;
  monthlyRent: string;
  savedAt: string;
}

/** Lightweight draft for the tenant+lease portion of משכיר חדש (avoids huge photo payloads). */
export function saveAddClientDraft(draft: Omit<AddClientTenantDraft, "savedAt">): void {
  storage.setItem(storage.keys.addClientDraft, {
    ...draft,
    savedAt: new Date().toISOString(),
  } satisfies AddClientTenantDraft);
}

export function loadAddClientDraft(): AddClientTenantDraft | null {
  const draft = storage.getItem<AddClientTenantDraft | null>(storage.keys.addClientDraft, null);
  if (!draft?.savedAt || !isFresh(draft.savedAt)) {
    clearAddClientDraft();
    return null;
  }
  return draft;
}

export function clearAddClientDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storage.keys.addClientDraft);
  } catch {
    /* ignore */
  }
}
