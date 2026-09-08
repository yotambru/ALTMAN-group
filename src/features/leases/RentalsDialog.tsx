"use client";

import { CalendarClock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PropertyImage } from "@/components/brand/PropertyImage";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData } from "@/lib/store";
import { nextPaymentDate } from "@/lib/payment-dates";
import { paymentClearanceDate, upcomingCheckPayments } from "@/lib/check-schedule";
import { currentMonthlyRent } from "@/lib/portfolio";
import { formatCurrency, formatDateDots, isValidIsoDate } from "@/lib/utils";

interface RentalsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Restrict to a single landlord's leases. */
  landlordId?: string;
}

/** All active leases with property, tenant, rent and next payment. */
export function RentalsDialog({ open, onClose, landlordId }: RentalsDialogProps) {
  const { leases, properties, tenants, payments } = useData();
  const rows = leases
    .filter((l) => l.active && (!landlordId || l.landlordId === landlordId))
    .map((lease) => ({
      lease,
      property: properties.find((p) => p.id === lease.propertyId),
      tenant: tenants.find((t) => t.id === lease.tenantId),
      nextCheck: upcomingCheckPayments(payments, [lease.id])[0],
    }));

  return (
    <Modal open={open} onClose={onClose} title="ניהול שכירויות" description={`${rows.length} שכירויות פעילות`}>
      <div className="no-scrollbar max-h-[62vh] space-y-2 overflow-y-auto">
        {rows.map(({ lease, property, tenant, nextCheck }) => (
          <div key={lease.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-3">
              {property && (
                <PropertyImage variant={property.imageId} src={property.photoUrls?.[0]} className="h-12 w-12 shrink-0" rounded="rounded-lg" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-navy">
                  {property ? `${property.address}, ${property.city}` : "נכס"}
                </p>
                <p className="truncate text-xs text-text-muted">שוכר: {tenant?.fullName ?? "—"}</p>
              </div>
              <span className="text-sm font-extrabold text-orange">{formatCurrency(currentMonthlyRent(lease))}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4" />
                {nextCheck
                  ? `פרעון הבא: ${formatDateDots(paymentClearanceDate(nextCheck))} · ${formatCurrency(nextCheck.amount)}`
                  : `תשלום הבא: ${formatDateDots(nextPaymentDate(lease) ?? "")}`}
              </span>
              <StatusBadge tone="navy">
                עד {isValidIsoDate(lease.endDate) ? formatDateDots(lease.endDate) : "ללא סיום"}
              </StatusBadge>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
