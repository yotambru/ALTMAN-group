import { nextPaymentDate } from "@/lib/payment-dates";
import { propertyMonthlyIncome } from "@/lib/portfolio";
import type { Lease, Property, WithdrawalRequest, WithdrawalStatus } from "@/types";

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: "ממתין לאישור",
  approved: "אושרה",
  rejected: "נדחתה",
};

export function propertyAddressLabel(property: Pick<Property, "address" | "city" | "apartmentNumber">): string {
  const apt = property.apartmentNumber?.trim();
  const city = property.city?.trim();
  const base = apt ? `${property.address} דירה ${apt}` : property.address;
  return city ? `${base}, ${city}` : base;
}

/** Upcoming rent cycle this withdrawal would draw from. */
export function upcomingRentCycle(
  property: Property,
  leases: Lease[],
): { rent: number; dueDate?: string; leaseId?: string } {
  const lease = leases.find((l) => l.propertyId === property.id && l.active);
  const rent = propertyMonthlyIncome(property, lease);
  return {
    rent,
    dueDate: lease ? nextPaymentDate(lease) : undefined,
    leaseId: lease?.id,
  };
}

export interface LandlordRentPool {
  total: number;
  available: number;
  propertyCount: number;
  earliestDueDate?: string;
  latestDueDate?: string;
  dueDates: string[];
}

function landlordRentCycles(
  properties: Property[],
  leases: Lease[],
  landlordId: string,
): { rent: number; dueDate?: string }[] {
  return properties
    .filter((p) => p.landlordId === landlordId)
    .map((property) => upcomingRentCycle(property, leases))
    .filter((cycle) => cycle.rent > 0);
}

function roundMoney(value: number): number {
  return Math.max(0, Math.round(value * 100) / 100);
}

/** Pending requests always reserve funds; approved ones count until the rent cycle rolls. */
export function committedLandlordWithdrawalAmount(
  withdrawals: WithdrawalRequest[],
  landlordId: string,
  currentDueDates: string[],
): number {
  const dueSet = new Set(currentDueDates);
  return withdrawals
    .filter((w) => w.landlordId === landlordId && (w.status === "pending" || w.status === "approved"))
    .filter((w) => {
      if (w.status === "pending") return true;
      if (!w.rentDueDate) return true;
      return dueSet.has(w.rentDueDate);
    })
    .reduce((sum, w) => sum + w.amount, 0);
}

/** Total upcoming rent across every property the landlord owns, minus reserved withdrawals. */
export function landlordRentPool(
  withdrawals: WithdrawalRequest[],
  properties: Property[],
  leases: Lease[],
  landlordId: string,
): LandlordRentPool {
  const cycles = landlordRentCycles(properties, leases, landlordId);
  const dueDates = cycles
    .map((c) => c.dueDate)
    .filter((d): d is string => Boolean(d))
    .sort();
  const total = cycles.reduce((sum, c) => sum + c.rent, 0);
  const committed = committedLandlordWithdrawalAmount(withdrawals, landlordId, dueDates);
  return {
    total: roundMoney(total),
    available: roundMoney(total - committed),
    propertyCount: cycles.length,
    earliestDueDate: dueDates[0],
    latestDueDate: dueDates[dueDates.length - 1],
    dueDates,
  };
}
