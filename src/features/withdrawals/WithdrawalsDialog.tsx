"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Banknote, Check, X } from "lucide-react";
import { SearchField } from "@/components/dashboard/ClientRow";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData } from "@/lib/store";
import { formatCurrency, formatDateDots, cn } from "@/lib/utils";
import {
  landlordRentPool,
  propertyAddressLabel,
  WITHDRAWAL_STATUS_LABELS,
} from "@/lib/withdrawals";
import type { WithdrawalRequest, WithdrawalStatus } from "@/types";

const statusMeta: Record<WithdrawalStatus, { label: string; tone: "success" | "warning" | "danger" }> = {
  pending: { label: WITHDRAWAL_STATUS_LABELS.pending, tone: "warning" },
  approved: { label: WITHDRAWAL_STATUS_LABELS.approved, tone: "success" },
  rejected: { label: WITHDRAWAL_STATUS_LABELS.rejected, tone: "danger" },
};

const filters: { id: WithdrawalStatus | "all"; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "pending", label: "ממתינות" },
  { id: "approved", label: "אושרו" },
  { id: "rejected", label: "נדחו" },
];

interface WithdrawalsDialogProps {
  open?: boolean;
  onClose?: () => void;
  inline?: boolean;
  /** Landlord mode: create requests and see own history. */
  landlordId?: string;
  createdByUserId?: string;
  canDecide?: boolean;
  highlightId?: string | null;
  onSubmitted?: () => void;
  onDecided?: (status: "approved" | "rejected") => void;
}

export function WithdrawalsDialog({
  open = false,
  onClose,
  inline = false,
  landlordId,
  createdByUserId,
  canDecide = false,
  highlightId = null,
  onSubmitted,
  onDecided,
}: WithdrawalsDialogProps) {
  const { withdrawals, properties, leases, landlords, addWithdrawalRequest, decideWithdrawal } = useData();
  const [filter, setFilter] = useState<WithdrawalStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const canCreate = Boolean(landlordId && createdByUserId);

  const pool = useMemo(
    () =>
      landlordId
        ? landlordRentPool(withdrawals, properties, leases, landlordId)
        : { total: 0, available: 0, propertyCount: 0, dueDates: [] as string[] },
    [withdrawals, properties, leases, landlordId],
  );

  const effectiveFilter: WithdrawalStatus | "all" = highlightId ? "all" : filter;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = withdrawals;
    if (landlordId) list = list.filter((w) => w.landlordId === landlordId);
    if (effectiveFilter !== "all") list = list.filter((w) => w.status === effectiveFilter);
    if (q) {
      list = list.filter((w) => {
        const prop = properties.find((p) => p.id === w.propertyId);
        const landlord = landlords.find((l) => l.id === w.landlordId);
        const hay = [
          prop?.address,
          prop?.city,
          prop?.apartmentNumber,
          w.propertyId ? undefined : "סך דמי השכירות",
          landlord?.fullName,
          statusMeta[w.status].label,
          w.note,
          String(w.amount),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (highlightId) {
      const focused = list.find((w) => w.id === highlightId);
      if (focused) list = [focused, ...list.filter((w) => w.id !== highlightId)];
    }
    return list;
  }, [withdrawals, landlordId, effectiveFilter, highlightId, query, properties, landlords]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!landlordId || !createdByUserId) {
      setError("לא ניתן לשלוח בקשה.");
      return;
    }
    if (pool.total <= 0) {
      setError("אין שכ״ד קרוב למשיכה.");
      return;
    }
    const parsed = Number(amount.replace(/,/g, "").trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("יש להזין סכום חיובי.");
      return;
    }
    if (parsed > pool.available + 0.009) {
      setError(`ניתן למשוך עד ${formatCurrency(pool.available)} מתוך סך דמי השכירות.`);
      return;
    }
    const created = addWithdrawalRequest({
      landlordId,
      amount: parsed,
      note,
      createdByUserId,
    });
    if (!created) {
      setError("לא ניתן לשלוח את הבקשה. בדקו את הסכום.");
      return;
    }
    setAmount("");
    setNote("");
    onSubmitted?.();
  };

  const emptyMessage = query.trim()
    ? "לא נמצאו בקשות התואמות לחיפוש."
    : "אין בקשות משיכה להצגה.";

  const body = (
    <>
      {canCreate && (
        <form onSubmit={submit} className="mb-4 space-y-3 rounded-xl border border-border bg-surface-muted/60 p-3">
          <p className="text-sm text-text-muted">
            בחרו סכום למשיכה מתוך סך דמי השכירות הקרובים של כל הנכסים. הבקשה תישלח למנהל לאישור.
          </p>
          {pool.total <= 0 ? (
            <p className="text-sm font-medium text-text-muted">אין כרגע שכ״ד קרוב למשיכה.</p>
          ) : (
            <>
              <FormField
                label="סכום למשיכה"
                hint={
                  `ניתן למשוך עד ${formatCurrency(pool.available)} מתוך סך שכ״ד של ${formatCurrency(pool.total)}` +
                  (pool.propertyCount > 0 ? ` (${pool.propertyCount} נכסים)` : "") +
                  (pool.earliestDueDate ? ` · תשלום קרוב ב-${formatDateDots(pool.earliestDueDate)}` : "")
                }
                error={error || undefined}
                inputProps={{
                  inputMode: "decimal",
                  value: amount,
                  onChange: (e) => {
                    setAmount(e.target.value);
                    setError("");
                  },
                  placeholder: pool.available > 0 ? String(pool.available) : "0",
                  required: true,
                }}
              />
              <FormField
                label="הערה למנהל"
                as="textarea"
                textareaProps={{
                  value: note,
                  onChange: (e) => setNote(e.target.value),
                  placeholder: "אופציונלי",
                }}
              />
              <Button type="submit" fullWidth disabled={pool.available <= 0}>
                שליחת בקשה
              </Button>
            </>
          )}
        </form>
      )}

      <div className="mb-3 space-y-2">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={canDecide ? "חיפוש לפי כתובת, משכיר או סכום…" : "חיפוש לפי כתובת או סכום…"}
        />
        <div className="flex gap-1.5" role="tablist" aria-label="סינון בקשות משיכה">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={
                "flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors " +
                (effectiveFilter === f.id ? "bg-navy text-white" : "bg-surface-muted text-text-muted")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={inline ? "space-y-2" : "no-scrollbar max-h-[55vh] space-y-2 overflow-y-auto"}>
        {visible.length === 0 && <p className="py-6 text-center text-sm text-text-muted">{emptyMessage}</p>}
        {visible.map((w) => (
          <WithdrawalRow
            key={w.id}
            request={w}
            highlighted={w.id === highlightId}
            propertyLabel={(() => {
              const prop = w.propertyId ? properties.find((p) => p.id === w.propertyId) : undefined;
              return prop ? propertyAddressLabel(prop) : "סך דמי השכירות";
            })()}
            landlordName={canDecide ? landlords.find((l) => l.id === w.landlordId)?.fullName : undefined}
            canDecide={canDecide}
            onApprove={() => {
              decideWithdrawal(w.id, "approved");
              onDecided?.("approved");
            }}
            onReject={() => setRejectId(w.id)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={rejectId != null}
        onClose={() => setRejectId(null)}
        onConfirm={() => {
          if (!rejectId) return;
          decideWithdrawal(rejectId, "rejected");
          setRejectId(null);
          onDecided?.("rejected");
        }}
        title="דחיית בקשת משיכה"
        description="לדחות את בקשת המשיכה המיידית? המשכיר יקבל על כך הודעה."
        confirmLabel="דחייה"
        cancelLabel="ביטול"
      />
    </>
  );

  if (inline) return <div>{body}</div>;

  return (
    <Modal
      open={open}
      onClose={onClose ?? (() => undefined)}
      title="משיכה מיידית"
      description={canCreate ? "בקשה למשיכת שכ״ד לפני מועד התשלום" : "בקשות משיכה מהמשכירים"}
    >
      {body}
    </Modal>
  );
}

function WithdrawalRow({
  request,
  highlighted,
  propertyLabel,
  landlordName,
  canDecide,
  onApprove,
  onReject,
}: {
  request: WithdrawalRequest;
  highlighted?: boolean;
  propertyLabel?: string;
  landlordName?: string;
  canDecide: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlighted) return;
    const id = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(id);
  }, [highlighted]);

  const meta = statusMeta[request.status];

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border p-3",
        highlighted ? "border-orange bg-orange-soft/40 ring-2 ring-orange shadow-sm" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-soft text-orange">
          <Banknote className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-navy">{formatCurrency(request.amount)}</p>
            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          </div>
          <p className="truncate text-xs text-text-muted">
            {landlordName ? `${landlordName} · ` : ""}
            {propertyLabel ?? "סך דמי השכירות"}
          </p>
          <p className="mt-1 text-[0.7rem] text-text-muted">
            מתוך {request.propertyId ? "שכ״ד" : "סך שכ״ד"} {formatCurrency(request.rentAmount)}
            {request.rentDueDate ? ` · תשלום ${formatDateDots(request.rentDueDate)}` : ""}
            {` · ${formatDateDots(request.createdAt)}`}
          </p>
          {request.note && <p className="mt-1.5 text-sm text-text">{request.note}</p>}
          {request.decisionNote && (
            <p className="mt-1 text-xs text-text-muted">הערת מנהל: {request.decisionNote}</p>
          )}
          {canDecide && request.status === "pending" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={onReject}>
                <X className="h-4 w-4" />
                דחייה
              </Button>
              <Button type="button" variant="navy" onClick={onApprove}>
                <Check className="h-4 w-4" />
                אישור
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
