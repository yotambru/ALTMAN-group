"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, FileText, Receipt, Upload, UserCheck, Wrench } from "lucide-react";
import { SearchField } from "@/components/dashboard/ClientRow";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData } from "@/lib/store";
import { cn, fileToDataUrl, formatDateDots } from "@/lib/utils";
import type { AppDocument, MaintenanceTicket, TicketPriority, TicketStatus } from "@/types";

const statusMeta: Record<TicketStatus, { label: string; tone: "success" | "warning" | "navy" }> = {
  open: { label: "פתוחה", tone: "warning" },
  in_progress: { label: "בטיפול", tone: "navy" },
  resolved: { label: "טופלה", tone: "success" },
};

const priorityMeta: Record<TicketPriority, { label: string; tone: "danger" | "warning" | "neutral" }> = {
  high: { label: "דחופה", tone: "danger" },
  medium: { label: "בינונית", tone: "warning" },
  low: { label: "נמוכה", tone: "neutral" },
};

const filters: { id: TicketStatus | "all"; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "open", label: "פתוחות" },
  { id: "in_progress", label: "בטיפול" },
  { id: "resolved", label: "טופלו" },
];

interface TicketsDialogProps {
  /** When false / omitted with inline=false, modal is hidden. Ignored when inline. */
  open?: boolean;
  onClose?: () => void;
  /** Render list in-place (dashboard panel) instead of a modal sheet. */
  inline?: boolean;
  propertyIds?: string[];
  readOnly?: boolean;
  /** Keep treatment invoices private from tenants when viewing tickets. */
  canViewInvoices?: boolean;
  title?: string;
  /** Ticket to emphasize after navigating from a notification. */
  highlightTicketId?: string | null;
}

export function TicketsDialog({
  open = false,
  onClose,
  inline = false,
  propertyIds,
  readOnly = false,
  canViewInvoices = true,
  title = "ניהול קריאות ותקלות",
  highlightTicketId = null,
}: TicketsDialogProps) {
  const { tickets, properties, professionals, documents, setTicketStatus, assignTicket, attachTicketInvoice } =
    useData();
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [query, setQuery] = useState("");
  const effectiveFilter: TicketStatus | "all" = highlightTicketId ? "all" : filter;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tickets;
    if (propertyIds) list = list.filter((t) => propertyIds.includes(t.propertyId));
    if (effectiveFilter !== "all") list = list.filter((t) => t.status === effectiveFilter);
    if (q) {
      list = list.filter((t) => {
        const prop = properties.find((p) => p.id === t.propertyId);
        const pro = professionals.find((p) => p.id === t.assignedProfessionalId);
        const hay = [
          t.title,
          t.description,
          t.category,
          statusMeta[t.status].label,
          priorityMeta[t.priority].label,
          prop?.address,
          prop?.city,
          pro?.fullName,
          pro?.trade,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (highlightTicketId) {
      const focused = list.find((t) => t.id === highlightTicketId);
      if (focused) {
        list = [focused, ...list.filter((t) => t.id !== highlightTicketId)];
      }
    }
    return list;
  }, [tickets, propertyIds, effectiveFilter, highlightTicketId, query, properties, professionals]);

  const propertyById = (id: string) => properties.find((p) => p.id === id);
  const emptyMessage = query.trim()
    ? "לא נמצאו קריאות התואמות לחיפוש."
    : "אין קריאות בקטגוריה זו.";

  const body = (
    <>
      <div className="mb-3 space-y-2">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="חיפוש לפי כותרת, כתובת, קטגוריה או בעל מקצוע…"
        />
        <div className="flex gap-1.5">
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

      <div className={inline ? "space-y-2" : "no-scrollbar max-h-[60vh] space-y-2 overflow-y-auto"}>
        {visible.length === 0 && (
          <p className="py-6 text-center text-sm text-text-muted">{emptyMessage}</p>
        )}
        {visible.map((t) => (
          <TicketRow
            key={`${t.id}-${t.id === highlightTicketId ? "focus" : "row"}`}
            ticket={t}
            highlighted={t.id === highlightTicketId}
            propertyLabel={propertyById(t.propertyId)?.address}
            professionalName={professionals.find((p) => p.id === t.assignedProfessionalId)?.fullName}
            professionals={professionals}
            invoice={
              canViewInvoices && t.invoiceDocId
                ? documents.find((d) => d.id === t.invoiceDocId)
                : undefined
            }
            canViewInvoices={canViewInvoices}
            readOnly={readOnly}
            onStatus={(s) => setTicketStatus(t.id, s)}
            onAssign={(pid, when) => assignTicket(t.id, pid, when)}
            onAttachInvoice={async (file) => {
              const dataUrl = await fileToDataUrl(file);
              attachTicketInvoice(t.id, {
                name: `חשבונית — ${t.title}`,
                dataUrl,
              });
            }}
          />
        ))}
      </div>
    </>
  );

  if (inline) return <div>{body}</div>;

  return (
    <Modal open={open} onClose={onClose ?? (() => undefined)} title={title} description={`${visible.length} קריאות`}>
      {body}
    </Modal>
  );
}

function TicketRow({
  ticket,
  highlighted,
  propertyLabel,
  professionalName,
  professionals,
  invoice,
  canViewInvoices,
  readOnly,
  onStatus,
  onAssign,
  onAttachInvoice,
}: {
  ticket: MaintenanceTicket;
  highlighted?: boolean;
  propertyLabel?: string;
  professionalName?: string;
  professionals: { id: string; fullName: string; trade: string }[];
  invoice?: AppDocument;
  canViewInvoices: boolean;
  readOnly: boolean;
  onStatus: (s: TicketStatus) => void;
  onAssign: (professionalId: string, scheduledAt?: string) => void;
  onAttachInvoice: (file: File) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(Boolean(highlighted));
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!highlighted) return;
    const id = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(id);
  }, [highlighted]);

  const handleInvoicePick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await onAttachInvoice(file);
    } finally {
      setUploading(false);
      if (invoiceInputRef.current) invoiceInputRef.current.value = "";
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border p-3 transition-shadow",
        highlighted
          ? "border-orange bg-orange-soft/40 ring-2 ring-orange shadow-sm"
          : "border-border",
      )}
    >
      <button type="button" onClick={() => setExpanded((e) => !e)} className="flex w-full items-start gap-3 text-start">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-soft text-orange">
          <Wrench className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-bold text-navy">{ticket.title}</p>
            <StatusBadge tone={statusMeta[ticket.status].tone}>
              {statusMeta[ticket.status].label}
            </StatusBadge>
          </div>
          <p className="truncate text-xs text-text-muted">
            {ticket.category}
            {propertyLabel ? ` • ${propertyLabel}` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge tone={priorityMeta[ticket.priority].tone}>
              {priorityMeta[ticket.priority].label}
            </StatusBadge>
            <span className="text-[0.7rem] text-text-muted">{formatDateDots(ticket.createdAt)}</span>
            {professionalName && (
              <span className="flex items-center gap-1 text-[0.7rem] text-navy">
                <UserCheck className="h-3.5 w-3.5" />
                {professionalName}
              </span>
            )}
            {invoice && (
              <span className="flex items-center gap-1 text-[0.7rem] text-success">
                <Receipt className="h-3.5 w-3.5" />
                חשבונית
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {ticket.description && <p className="text-sm text-text">{ticket.description}</p>}
          {ticket.photoDataUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={ticket.photoDataUrl} alt="תמונת תקלה" className="max-h-40 rounded-xl object-cover" />
          )}
          {ticket.scheduledAt && (
            <p className="flex items-center gap-1.5 text-xs text-text-muted">
              <CalendarClock className="h-4 w-4" />
              מועד טיפול: {formatDateDots(ticket.scheduledAt)}
            </p>
          )}

          {canViewInvoices && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-navy">חשבונית</p>
              {invoice ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted/60 p-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy/5 text-navy">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy">{invoice.name}</p>
                    <p className="text-[0.7rem] text-text-muted">{formatDateDots(invoice.createdAt)}</p>
                  </div>
                  {invoice.fileDataUrl && (
                    <a
                      href={invoice.fileDataUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-bold text-orange hover:bg-orange-soft"
                    >
                      צפייה
                    </a>
                  )}
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 shrink-0 px-2.5 text-xs"
                      disabled={uploading}
                      onClick={() => invoiceInputRef.current?.click()}
                    >
                      החלפה
                    </Button>
                  )}
                </div>
              ) : readOnly ? (
                <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-center text-xs text-text-muted">
                  לא הועלתה חשבונית לתקלה זו
                </p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  disabled={uploading}
                  onClick={() => invoiceInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "מעלה…" : "העלאת חשבונית"}
                </Button>
              )}
              {!readOnly && (
                <input
                  ref={invoiceInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  aria-label="העלאת חשבונית"
                  onChange={(e) => void handleInvoicePick(e.target.files?.[0])}
                />
              )}
            </div>
          )}

          {!readOnly && (
            <>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-navy">עדכון סטטוס</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(statusMeta) as TicketStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onStatus(s)}
                      className={
                        "rounded-lg border py-1.5 text-xs font-semibold transition-colors " +
                        (ticket.status === s
                          ? "border-navy bg-navy text-white"
                          : "border-border bg-surface text-text-muted hover:bg-surface-muted")
                      }
                    >
                      {statusMeta[s].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-navy">שיוך בעל מקצוע</p>
                <select
                  value={ticket.assignedProfessionalId ?? ""}
                  onChange={(e) => e.target.value && onAssign(e.target.value)}
                  className="w-full rounded-lg border bg-surface px-3 py-2 text-sm focus:border-orange focus:outline-none"
                >
                  <option value="">— בחר/י בעל מקצוע —</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} · {p.trade}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
