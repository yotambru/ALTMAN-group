"use client";

import { useState } from "react";
import { Banknote, MoreVertical, Undo2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData } from "@/lib/store";
import {
  livePaymentStatus,
  paymentClearanceDate,
  reportableClearedCheckPayments,
  returnedCheckPayments,
  upcomingCheckPayments,
} from "@/lib/check-schedule";
import { propertyAddressLabel } from "@/lib/portfolio";
import { formatCurrency, formatDateDots } from "@/lib/utils";
import type { Payment, PaymentStatus, Property } from "@/types";

interface ChecksDialogProps {
  open: boolean;
  onClose: () => void;
  landlordId?: string;
  /** Landlord can report a bounced check instead of confirming clearance. */
  canReportReturned?: boolean;
}

const statusLabel: Record<PaymentStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  paid: { label: "נפרע", tone: "success" },
  due: { label: "היום", tone: "warning" },
  upcoming: { label: "צפוי", tone: "neutral" },
  overdue: { label: "באיחור", tone: "danger" },
};

function checkAddress(property: Property | undefined): string {
  return property ? propertyAddressLabel(property) : "נכס";
}

/** Portfolio view of check clearance dates: date · property · amount. */
export function ChecksDialog({
  open,
  onClose,
  landlordId,
  canReportReturned = false,
}: ChecksDialogProps) {
  const { payments, leases, properties, reportCheckReturned, clearCheckReturned } = useData();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const leaseIds = leases
    .filter((lease) => lease.active && (!landlordId || lease.landlordId === landlordId))
    .map((lease) => lease.id);
  const propertyFor = (payment: Payment) => {
    const lease = leases.find((item) => item.id === payment.leaseId);
    return properties.find((item) => item.id === lease?.propertyId);
  };
  const rows = upcomingCheckPayments(payments, leaseIds).map((payment) => {
    const status = livePaymentStatus(payment);
    return { payment, property: propertyFor(payment), status };
  });
  const reportable = canReportReturned ? reportableClearedCheckPayments(payments, leaseIds) : [];
  const returned = canReportReturned ? returnedCheckPayments(payments, leaseIds) : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="פרעון צ׳קים"
      description={rows.length ? `${rows.length} צ׳קים שטרם נפרעו` : "אין צ׳קים מתוכננים"}
    >
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">אין תאריכי פרעון להצגה</p>
        ) : (
          rows.map(({ payment, property, status }) => {
            const meta = statusLabel[status];
            const canBounce = canReportReturned && (status === "due" || status === "overdue" || status === "paid");
            return (
              <div key={payment.id} className="relative flex items-center gap-3 rounded-xl border border-border p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-soft text-orange">
                  <Banknote className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-navy">{formatDateDots(paymentClearanceDate(payment))}</p>
                  <p className="truncate text-xs text-text-muted">{checkAddress(property)}</p>
                  {payment.checkNumber && (
                    <p className="text-[0.7rem] text-text-muted">צ׳ק {payment.checkNumber}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-extrabold text-orange">{formatCurrency(payment.amount)}</span>
                  <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                </div>
                {canReportReturned && (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      aria-label="פעולות לצ׳ק"
                      onClick={() => setMenuFor((id) => (id === payment.id ? null : payment.id))}
                      className="grid h-9 w-9 place-items-center rounded-full text-text-muted hover:bg-surface-muted hover:text-navy"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuFor === payment.id && (
                      <div className="absolute end-0 top-10 z-20 min-w-40 rounded-xl border border-border bg-surface p-1 shadow-lg">
                        <button
                          type="button"
                          disabled={!canBounce}
                          onClick={() => {
                            reportCheckReturned(payment.id);
                            setMenuFor(null);
                          }}
                          className="w-full rounded-lg px-3 py-2 text-start text-sm font-semibold text-danger disabled:text-text-muted"
                        >
                          דיווח צ׳ק חוזר
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {reportable.map((payment) => (
          <div key={payment.id} className="relative flex items-center gap-3 rounded-xl border border-border p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-soft text-orange">
              <Banknote className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-navy">{formatDateDots(paymentClearanceDate(payment))}</p>
              <p className="truncate text-xs text-text-muted">{checkAddress(propertyFor(payment))}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-sm font-extrabold text-orange">{formatCurrency(payment.amount)}</span>
              <StatusBadge tone="success">נפרע</StatusBadge>
            </div>
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="פעולות לצ׳ק"
                onClick={() => setMenuFor((id) => (id === payment.id ? null : payment.id))}
                className="grid h-9 w-9 place-items-center rounded-full text-text-muted hover:bg-surface-muted hover:text-navy"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuFor === payment.id && (
                <div className="absolute end-0 top-10 z-20 min-w-40 rounded-xl border border-border bg-surface p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      reportCheckReturned(payment.id);
                      setMenuFor(null);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-start text-sm font-semibold text-danger"
                  >
                    דיווח צ׳ק חוזר
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {returned.map((payment) => (
          <div key={payment.id} className="flex items-center gap-3 rounded-xl border border-danger/20 bg-danger/5 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-navy">{formatDateDots(paymentClearanceDate(payment))}</p>
              <p className="truncate text-xs text-text-muted">{checkAddress(propertyFor(payment))}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <StatusBadge tone="danger">חזר</StatusBadge>
              <button
                type="button"
                onClick={() => clearCheckReturned(payment.id)}
                className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-text-muted hover:text-navy"
              >
                <Undo2 className="h-3.5 w-3.5" />
                ביטול דיווח
              </button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
