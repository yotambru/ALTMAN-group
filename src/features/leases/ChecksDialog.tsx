"use client";

import { Banknote } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData } from "@/lib/store";
import {
  livePaymentStatus,
  paymentClearanceDate,
  upcomingCheckPayments,
} from "@/lib/check-schedule";
import { formatCurrency, formatDateDots } from "@/lib/utils";
import type { PaymentStatus } from "@/types";

interface ChecksDialogProps {
  open: boolean;
  onClose: () => void;
  landlordId?: string;
}

const statusLabel: Record<PaymentStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  paid: { label: "נפרע", tone: "success" },
  due: { label: "היום", tone: "warning" },
  upcoming: { label: "צפוי", tone: "neutral" },
  overdue: { label: "באיחור", tone: "danger" },
};

/** Portfolio view of check clearance dates: date · property · amount. */
export function ChecksDialog({ open, onClose, landlordId }: ChecksDialogProps) {
  const { payments, leases, properties } = useData();
  const leaseIds = leases
    .filter((lease) => lease.active && (!landlordId || lease.landlordId === landlordId))
    .map((lease) => lease.id);
  const rows = upcomingCheckPayments(payments, leaseIds).map((payment) => {
    const lease = leases.find((item) => item.id === payment.leaseId);
    const property = properties.find((item) => item.id === lease?.propertyId);
    const status = livePaymentStatus(payment);
    return { payment, property, status };
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="פרעון צ׳קים"
      description={rows.length ? `${rows.length} צ׳קים שטרם נפרעו` : "אין צ׳קים מתוכננים"}
    >
      <div className="no-scrollbar max-h-[62vh] space-y-2 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">אין תאריכי פרעון להצגה</p>
        ) : (
          rows.map(({ payment, property, status }) => {
            const meta = statusLabel[status];
            const address = property
              ? `${property.address}${property.apartmentNumber ? ` דירה ${property.apartmentNumber}` : ""}${property.city ? `, ${property.city}` : ""}`
              : "נכס";
            return (
              <div key={payment.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-soft text-orange">
                  <Banknote className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-navy">{formatDateDots(paymentClearanceDate(payment))}</p>
                  <p className="truncate text-xs text-text-muted">{address}</p>
                  {payment.checkNumber && (
                    <p className="text-[0.7rem] text-text-muted">צ׳ק {payment.checkNumber}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-extrabold text-orange">{formatCurrency(payment.amount)}</span>
                  <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
