"use client";

import { CalendarClock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PropertyImage } from "@/components/brand/PropertyImage";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData } from "@/lib/store";
import { formatCurrency, formatDateDots } from "@/lib/utils";

interface RentalsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Restrict to a single landlord's leases. */
  landlordId?: string;
}

/** All active leases with property, tenant, rent and next payment. */
export function RentalsDialog({ open, onClose, landlordId }: RentalsDialogProps) {
  const { leases, properties, tenants } = useData();
  const rows = leases
    .filter((l) => l.active && (!landlordId || l.landlordId === landlordId))
    .map((lease) => ({
      lease,
      property: properties.find((p) => p.id === lease.propertyId),
      tenant: tenants.find((t) => t.id === lease.tenantId),
    }));

  return (
    <Modal open={open} onClose={onClose} title="ניהול שכירויות" description={`${rows.length} שכירויות פעילות`}>
      <div className="no-scrollbar max-h-[62vh] space-y-2 overflow-y-auto">
        {rows.map(({ lease, property, tenant }) => (
          <div key={lease.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-3">
              {property && (
                <PropertyImage variant={property.imageId} className="h-12 w-12 shrink-0" rounded="rounded-lg" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-navy">
                  {property ? `${property.address}, ${property.city}` : "נכס"}
                </p>
                <p className="truncate text-xs text-text-muted">שוכר: {tenant?.fullName ?? "—"}</p>
              </div>
              <span className="text-sm font-extrabold text-orange">{formatCurrency(lease.monthlyRent)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4" />
                תשלום הבא: {formatDateDots(lease.nextPaymentDate)}
              </span>
              <StatusBadge tone="navy">עד {formatDateDots(lease.endDate)}</StatusBadge>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
