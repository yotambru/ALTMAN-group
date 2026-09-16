"use client";

import { Banknote, Undo2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
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
      <div className="space-y-4">
        <div className="space-y-2">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">אין תאריכי פרעון להצגה</p>
          ) : (
            rows.map(({ payment, property, status }) => {
              const meta = statusLabel[status];
              return (
                <div key={payment.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
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
                </div>
              );
            })
          )}
        </div>

        {canReportReturned && (
          <section className="space-y-2 border-t border-border pt-3">
            <div>
              <p className="text-sm font-bold text-navy">דיווח צ׳ק שחזר</p>
              <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                פרעון מסומן אוטומטית אחרי תאריך הפרעון. אם צ׳ק חזר — דווחו כאן.
              </p>
            </div>
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
            {reportable.length === 0 && returned.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">
                אין צ׳קים שנפרעו לאחרונה לדיווח
              </p>
            ) : (
              reportable.slice(0, 8).map((payment) => (
                <div key={payment.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-navy">{formatDateDots(paymentClearanceDate(payment))}</p>
                    <p className="truncate text-xs text-text-muted">{checkAddress(propertyFor(payment))}</p>
                    <p className="text-[0.7rem] text-text-muted">{formatCurrency(payment.amount)}</p>
                  </div>
                  <Button variant="outline" onClick={() => reportCheckReturned(payment.id)}>
                    צ׳ק חזר
                  </Button>
                </div>
              ))
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}
