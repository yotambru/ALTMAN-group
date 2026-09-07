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

/** Amount already reserved (pending or approved) against the same rent cycle. */
export function committedWithdrawalAmount(
  withdrawals: WithdrawalRequest[],
  propertyId: string,
  rentDueDate?: string,
): number {
  return withdrawals
    .filter(
      (w) =>
        w.propertyId === propertyId &&
        (w.status === "pending" || w.status === "approved") &&
        (rentDueDate ? w.rentDueDate === rentDueDate : true),
    )
    .reduce((sum, w) => sum + w.amount, 0);
}

export function availableWithdrawalAmount(
  withdrawals: WithdrawalRequest[],
  propertyId: string,
  rent: number,
  rentDueDate?: string,
): number {
  return Math.max(0, Math.round((rent - committedWithdrawalAmount(withdrawals, propertyId, rentDueDate)) * 100) / 100);
}
