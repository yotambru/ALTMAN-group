"use client";

import { useState, type ReactNode } from "react";
import { Banknote, MoreVertical, Undo2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchField } from "@/components/dashboard/ClientRow";
import { useData } from "@/lib/store";
import {
  clearedCheckPayments,
  livePaymentStatus,
  paymentClearanceDate,
  returnedCheckPayments,
  upcomingCheckPayments,
} from "@/lib/check-schedule";
import { comparePropertiesByLocation, matchesPlaceQuery, propertyAddressLabel } from "@/lib/portfolio";
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

function CheckRow({
  payment,
  address,
  status,
  menu,
}: {
  payment: Payment;
  address: string;
  status: PaymentStatus;
  menu?: ReactNode;
}) {
  const meta = statusLabel[status];
  return (
    <div className="relative flex items-center gap-3 rounded-xl border border-border p-3">
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
      {menu}
    </div>
  );
}

function RowMenu({
  open,
  onToggle,
  onReport,
}: {
  open: boolean;
  onToggle: () => void;
  onReport: () => void;
}) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="פעולות לצ׳ק"
        onClick={onToggle}
        className="grid h-9 w-9 place-items-center rounded-full text-text-muted hover:bg-surface-muted hover:text-navy"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute end-0 top-10 z-20 min-w-40 rounded-xl border border-border bg-surface p-1 shadow-lg">
          <button
            type="button"
            onClick={onReport}
            className="w-full rounded-lg px-3 py-2 text-start text-sm font-semibold text-danger"
          >
            דיווח צ׳ק חוזר
          </button>
        </div>
      )}
    </div>
  );
}

/** Open checks stay in one column. Cleared checks move to «נפרעו». */
export function ChecksDialog({
  open,
  onClose,
  landlordId,
  canReportReturned = false,
}: ChecksDialogProps) {
  const { payments, leases, properties, tenants, reportCheckReturned, clearCheckReturned } = useData();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const leaseIds = leases
    .filter((lease) => lease.active && (!landlordId || lease.landlordId === landlordId))
    .map((lease) => lease.id);
  const propertyFor = (payment: Payment) => {
    const lease = leases.find((item) => item.id === payment.leaseId);
    return properties.find((item) => item.id === lease?.propertyId);
  };
  const matches = (payment: Payment) => {
    const property = propertyFor(payment);
    const tenant = tenants.find((item) => item.id === property?.tenantId);
    return matchesPlaceQuery(query, property, [tenant?.fullName, payment.checkNumber]);
  };
  const byPlace = (a: Payment, b: Payment) => {
    const left = propertyFor(a);
    const right = propertyFor(b);
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return comparePropertiesByLocation(left, right);
  };
  const openRows = upcomingCheckPayments(payments, leaseIds)
    .filter(matches)
    .sort(byPlace)
    .map((payment) => ({
      payment,
      property: propertyFor(payment),
      status: livePaymentStatus(payment),
    }));
  const cleared = clearedCheckPayments(payments, leaseIds).filter(matches).sort(byPlace);
  const returned = returnedCheckPayments(payments, leaseIds).filter(matches).sort(byPlace);

  const report = (paymentId: string) => {
    reportCheckReturned(paymentId);
    setMenuFor(null);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="פרעון צ׳קים"
      description={openRows.length ? `${openRows.length} צ׳קים שטרם נפרעו` : "אין צ׳קים שטרם נפרעו"}
      className="lg:max-w-4xl"
    >
      <div className="mb-3">
        <SearchField value={query} onChange={setQuery} placeholder="חיפוש לפי שם, רחוב, דירה או עיר…" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-2">
          <h4 className="text-sm font-bold text-navy">
            שטרם נפרעו
            <span className="ms-2 font-semibold text-text-muted">{openRows.length}</span>
          </h4>
          {openRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">אין צ׳קים שטרם נפרעו</p>
          ) : (
            openRows.map(({ payment, property, status }) => (
              <CheckRow
                key={payment.id}
                payment={payment}
                address={checkAddress(property)}
                status={status}
                menu={
                  canReportReturned ? (
                    <RowMenu
                      open={menuFor === payment.id}
                      onToggle={() => setMenuFor((id) => (id === payment.id ? null : payment.id))}
                      onReport={() => report(payment.id)}
                    />
                  ) : undefined
                }
              />
            ))
          )}
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-bold text-navy">
            נפרעו
            <span className="ms-2 font-semibold text-text-muted">{cleared.length}</span>
          </h4>
          {cleared.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">אין צ׳קים שנפרעו</p>
          ) : (
            cleared.map((payment) => (
              <CheckRow
                key={payment.id}
                payment={payment}
                address={checkAddress(propertyFor(payment))}
                status="paid"
                menu={
                  canReportReturned ? (
                    <RowMenu
                      open={menuFor === payment.id}
                      onToggle={() => setMenuFor((id) => (id === payment.id ? null : payment.id))}
                      onReport={() => report(payment.id)}
                    />
                  ) : undefined
                }
              />
            ))
          )}

          {returned.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-sm font-bold text-navy">
                חזרו
                <span className="ms-2 font-semibold text-text-muted">{returned.length}</span>
              </h4>
              {returned.map((payment) => (
                <div key={payment.id} className="flex items-center gap-3 rounded-xl border border-danger/20 bg-danger/5 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-navy">{formatDateDots(paymentClearanceDate(payment))}</p>
                    <p className="truncate text-xs text-text-muted">{checkAddress(propertyFor(payment))}</p>
                    <p className="text-sm font-extrabold text-orange">{formatCurrency(payment.amount)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge tone="danger">חזר</StatusBadge>
                    {canReportReturned && (
                      <button
                        type="button"
                        onClick={() => clearCheckReturned(payment.id)}
                        className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-text-muted hover:text-navy"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        ביטול דיווח
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
