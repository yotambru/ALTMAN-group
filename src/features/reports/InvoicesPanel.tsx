"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, FileText, Receipt, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useSignedUrl } from "@/lib/supabase/files";
import { buildInvoiceList, type InvoiceListItem } from "@/lib/invoice-place";
import { useData } from "@/lib/store";
import { formatCurrency, formatDateDots } from "@/lib/utils";

interface InvoicesPanelProps {
  /** Landlord sees only invoices on their properties. */
  landlordId?: string;
  /** Manager can delete. Landlord cannot. */
  canDelete?: boolean;
  onOpenTicket?: (ticketId: string) => void;
}

/** Invoices with the apartment they belong to, for the manager and the landlord. */
export function InvoicesPanel({ landlordId, canDelete = false, onOpenTicket }: InvoicesPanelProps) {
  const { documents, expenses, properties, tickets, deleteExpense, deleteInvoiceDocument } = useData();
  const [pending, setPending] = useState<InvoiceListItem | null>(null);

  const rows = useMemo(
    () =>
      buildInvoiceList({
        documents,
        expenses: expenses ?? [],
        properties,
        tickets,
        landlordId,
      }),
    [documents, expenses, properties, tickets, landlordId],
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        כל חשבונית עם הדירה שאליה היא שייכת. לחיצה על תקלה פותחת את הקריאה, גם אחרי שטופלה.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface-muted px-4 py-8 text-center text-sm text-text-muted">
          אין חשבוניות להצגה. חשבונית שמועלית לתקלה או לדוח השנתי מופיעה כאן עם הדירה.
        </p>
      ) : (
        <div className="card divide-y divide-border">
          {rows.map((row) => (
            <InvoiceRow
              key={row.key}
              row={row}
              canDelete={canDelete}
              onOpenTicket={row.ticketId && onOpenTicket ? () => onOpenTicket(row.ticketId!) : undefined}
              onDelete={() => setPending(row)}
            />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          if (pending.expenseId) deleteExpense(pending.expenseId);
          else if (pending.documentId) deleteInvoiceDocument(pending.documentId);
          setPending(null);
        }}
        title="מחיקת חשבונית"
        description={
          pending
            ? `למחוק את «${pending.description}»? החשבונית תרד מהדוח. התקלה עצמה תישאר בקריאות.`
            : ""
        }
      />
    </div>
  );
}

function InvoiceRow({
  row,
  canDelete,
  onOpenTicket,
  onDelete,
}: {
  row: InvoiceListItem;
  canDelete: boolean;
  onOpenTicket?: () => void;
  onDelete: () => void;
}) {
  const fileUrl = useSignedUrl(row.fileDataUrl);

  return (
    <div className="flex items-start gap-2 px-3 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-soft text-orange">
        <Receipt className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-navy">{row.description}</p>
        <p className="text-xs text-text-muted">{row.propertyLabel}</p>
        <p className="mt-0.5 text-[0.7rem] text-text-muted">
          {formatDateDots(row.date)}
          {" · "}
          {row.amount == null ? "ללא סכום" : formatCurrency(row.amount)}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {fileUrl ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-bold text-orange hover:bg-orange-soft"
            >
              <FileText className="h-3.5 w-3.5" />
              צפייה בחשבונית
            </a>
          ) : (
            <span className="text-[0.7rem] text-text-muted">אין קובץ מצורף</span>
          )}
          {onOpenTicket && (
            <button
              type="button"
              onClick={onOpenTicket}
              className="inline-flex items-center gap-0.5 text-xs font-bold text-navy"
            >
              לתקלה
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {canDelete && (row.expenseId || row.documentId) && (
        <button
          type="button"
          aria-label={`מחיקת ${row.description}`}
          onClick={onDelete}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-danger hover:bg-danger/10"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
