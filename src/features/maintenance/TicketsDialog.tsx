"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, FileText, Receipt, Upload, UserCheck, Wrench } from "lucide-react";
import { SearchField } from "@/components/dashboard/ClientRow";
import { useSignedUrl } from "@/lib/supabase/files";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useData } from "@/lib/store";
import { ticketOpenerName, ticketSubjectLine } from "@/lib/ticket-subject";
import { cn, fileToDataUrl, formatDateDots, parseMoneyInput } from "@/lib/utils";
import { localTodayIso } from "@/lib/lease-periods";
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
  /** Tenant may append a note. Status and the original description stay as they are. */
  canAddNote?: boolean;
  /** Keep treatment invoices private from tenants when viewing tickets. */
  canViewInvoices?: boolean;
  title?: string;
  /** Ticket to emphasize after navigating from a notification. */
  highlightTicketId?: string | null;
  /** Hide resolved tickets (tenant view). */
  hideResolved?: boolean;
}

export function TicketsDialog({
  open = false,
  onClose,
  inline = false,
  propertyIds,
  readOnly = false,
  canAddNote = false,
  canViewInvoices = true,
  title = "ניהול קריאות ותקלות",
  highlightTicketId = null,
  hideResolved = false,
}: TicketsDialogProps) {
  const { tickets, properties, professionals, documents, tenants, users, attachTicketInvoice } =
    useData();
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [query, setQuery] = useState("");
  const effectiveFilter: TicketStatus | "all" = highlightTicketId ? "all" : filter;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tickets;
    if (propertyIds) list = list.filter((t) => propertyIds.includes(t.propertyId));
    if (hideResolved) list = list.filter((t) => t.status !== "resolved");
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
          ticketSubjectLine(prop, ticketOpenerName(t.createdById, tenants, users)),
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
  }, [tickets, propertyIds, hideResolved, effectiveFilter, highlightTicketId, query, properties, professionals, tenants, users]);

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
          placeholder="חיפוש לפי כותרת, דייר, דירה, כתובת או בעל מקצוע…"
        />
        <div className="flex gap-1.5">
          {(hideResolved ? filters.filter((f) => f.id !== "resolved") : filters).map((f) => (
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

      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="py-6 text-center text-sm text-text-muted">{emptyMessage}</p>
        )}
        {visible.map((t) => (
          <TicketRow
            key={`${t.id}-${t.id === highlightTicketId ? "focus" : "row"}`}
            ticket={t}
            highlighted={t.id === highlightTicketId}
            subjectLine={ticketSubjectLine(
              propertyById(t.propertyId),
              ticketOpenerName(t.createdById, tenants, users),
            )}
            professionalName={professionals.find((p) => p.id === t.assignedProfessionalId)?.fullName}
            professionals={professionals}
            invoice={
              canViewInvoices && t.invoiceDocId
                ? documents.find((d) => d.id === t.invoiceDocId)
                : undefined
            }
            canViewInvoices={canViewInvoices}
            readOnly={readOnly}
            canAddNote={canAddNote}
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

function noteStamp(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDateDots(iso)} ${hh}:${mm}`;
}

function TicketRow({
  ticket,
  highlighted,
  subjectLine,
  professionalName,
  professionals,
  invoice,
  canViewInvoices,
  readOnly,
  canAddNote,
  onAttachInvoice,
}: {
  ticket: MaintenanceTicket;
  highlighted?: boolean;
  subjectLine?: string;
  professionalName?: string;
  professionals: { id: string; fullName: string; trade: string; phone: string }[];
  invoice?: AppDocument;
  canViewInvoices: boolean;
  readOnly: boolean;
  canAddNote: boolean;
  onAttachInvoice: (file: File) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(Boolean(highlighted));
  const [uploading, setUploading] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [draftStatus, setDraftStatus] = useState(ticket.status);
  const [draftProfessionalId, setDraftProfessionalId] = useState(ticket.assignedProfessionalId ?? "");
  const [note, setNote] = useState("");
  const [tenantNote, setTenantNote] = useState("");
  const [expenseDesc, setExpenseDesc] = useState(ticket.title);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseSaved, setExpenseSaved] = useState(false);
  const { commitTicketUpdate, addExpense, properties, expenses } = useData();
  const ref = useRef<HTMLDivElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const photoUrl = useSignedUrl(ticket.photoDataUrl);
  const invoiceUrl = useSignedUrl(invoice?.fileDataUrl);

  useEffect(() => {
    if (!highlighted) return;
    const id = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(id);
  }, [highlighted]);

  const savedKey = `${ticket.id}|${ticket.status}|${ticket.assignedProfessionalId ?? ""}`;
  const [syncedKey, setSyncedKey] = useState(savedKey);
  if (syncedKey !== savedKey) {
    setSyncedKey(savedKey);
    setDraftStatus(ticket.status);
    setDraftProfessionalId(ticket.assignedProfessionalId ?? "");
    setNote("");
    setGuestName("");
    setGuestPhone("");
  }

  const discardDraft = () => {
    setDraftStatus(ticket.status);
    setDraftProfessionalId(ticket.assignedProfessionalId ?? "");
    setNote("");
    setGuestName("");
    setGuestPhone("");
  };

  const guestReady = Boolean(guestName.trim() && guestPhone.trim());
  const dirty =
    draftStatus !== ticket.status ||
    note.trim().length > 0 ||
    guestReady ||
    draftProfessionalId !== (ticket.assignedProfessionalId ?? "");
  const savedNotes = (ticket.updates ?? []).filter((update) => update.note?.trim());
  const assigned = professionals.find((item) => item.id === ticket.assignedProfessionalId);

  const invoiceAlreadyExpensed = Boolean(
    invoice && expenses.some((e) => e.invoiceDocId === invoice.id),
  );
  const expenseLinked = expenseSaved || invoiceAlreadyExpensed;

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
      <button
        type="button"
        onClick={() => {
          if (expanded) discardDraft();
          setExpanded((open) => !open);
        }}
        className="flex w-full items-start gap-3 text-start"
      >
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
          <p className="text-pretty text-xs text-text-muted">
            {subjectLine || ticket.category}
            {subjectLine ? ` · ${ticket.category}` : ""}
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
          {photoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photoUrl} alt="תמונת תקלה" className="max-h-40 rounded-xl object-cover" />
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
                  {invoiceUrl && (
                    <a
                      href={invoiceUrl}
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
              {invoice && !readOnly && (
                <div className="mt-3 rounded-xl border border-dashed border-orange/40 bg-orange-soft/30 p-3">
                  <p className="mb-1.5 text-xs font-semibold text-navy">שיוך להוצאות המשכיר</p>
                  <p className="mb-2 text-[0.7rem] text-text-muted">
                    התיאור והסכום נכנסים להוצאות החודשיות, לתיקיית הוצאות בנכס, ולדוח השנתי
                  </p>
                  {expenseLinked ? (
                    <p className="text-xs font-semibold text-success">ההוצאה נשמרה בדוח השנתי ובתיקיית הוצאות של הנכס</p>
                  ) : (
                    <>
                      <input
                        value={expenseDesc}
                        onChange={(e) => setExpenseDesc(e.target.value)}
                        placeholder="תיאור ההוצאה"
                        className="mb-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-orange focus:outline-none"
                      />
                      <input
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        placeholder="סכום (₪)"
                        inputMode="decimal"
                        className="mb-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-orange focus:outline-none"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        fullWidth
                        onClick={() => {
                          const amount = parseMoneyInput(expenseAmount);
                          if (amount <= 0) return;
                          const property = properties.find((p) => p.id === ticket.propertyId);
                          if (!property?.landlordId) return;
                          addExpense({
                            landlordId: property.landlordId,
                            propertyId: ticket.propertyId,
                            amount,
                            date: localTodayIso(),
                            description: expenseDesc.trim() || ticket.title,
                            invoiceDocId: invoice.id,
                          });
                          setExpenseSaved(true);
                        }}
                      >
                        שמירת הוצאה
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {(savedNotes.length > 0 || assigned) && (
            <div className="rounded-xl border border-border bg-surface-muted/60 p-3">
              <p className="mb-1.5 text-xs font-semibold text-navy">העדכון שנשמר</p>
              {savedNotes.map((update) => (
                <p key={`${update.at}-${update.note}`} className="text-sm text-text">
                  <span className="text-text-muted">{noteStamp(update.at)} · </span>
                  {update.note}
                </p>
              ))}
              {assigned && (
                <p className="mt-1.5 text-sm font-semibold text-navy">
                  {assigned.fullName}
                  {assigned.phone ? (
                    <>
                      {" · "}
                      <span dir="ltr">{assigned.phone}</span>
                    </>
                  ) : null}
                </p>
              )}
            </div>
          )}

          {readOnly && canAddNote && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-navy">הוספת הערה</p>
              <p className="mb-2 text-[0.7rem] text-text-muted">
                ההערה נוספת לקריאה. התיאור המקורי והסטטוס נשארים כמו שהם.
              </p>
              <textarea
                value={tenantNote}
                onChange={(e) => setTenantNote(e.target.value)}
                rows={2}
                placeholder="הערה על התקלה"
                aria-label="הערה על התקלה"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-orange focus:outline-none"
              />
              <Button
                type="button"
                fullWidth
                className="mt-2"
                disabled={!tenantNote.trim()}
                onClick={() => {
                  commitTicketUpdate(ticket.id, {
                    status: ticket.status,
                    note: tenantNote.trim(),
                    professionalId: ticket.assignedProfessionalId,
                  });
                  setTenantNote("");
                }}
              >
                הוספת הערה
              </Button>
            </div>
          )}

          {!readOnly && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-navy">עדכון הקריאה</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(statusMeta) as TicketStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraftStatus(s)}
                    className={
                      "rounded-lg border py-1.5 text-xs font-semibold transition-colors " +
                      (draftStatus === s
                        ? "border-navy bg-navy text-white"
                        : "border-border bg-surface text-text-muted hover:bg-surface-muted")
                    }
                  >
                    {statusMeta[s].label}
                  </button>
                ))}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="הודעה לדייר"
                aria-label="הודעה לדייר"
                className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-orange focus:outline-none"
              />
              <label className="mb-1.5 mt-2 block text-xs font-semibold text-navy" htmlFor={`pro-${ticket.id}`}>
                איש מקצוע
              </label>
              <select
                id={`pro-${ticket.id}`}
                value={draftProfessionalId}
                onChange={(e) => {
                  setDraftProfessionalId(e.target.value);
                  setGuestName("");
                  setGuestPhone("");
                }}
                className="w-full rounded-lg border bg-surface px-3 py-2 text-sm focus:border-orange focus:outline-none"
              >
                <option value="">ללא איש מקצוע</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} · {p.trade}
                    {p.phone ? ` · ${p.phone}` : ""}
                  </option>
                ))}
              </select>
              <p className="mb-1.5 mt-2 text-xs font-semibold text-navy">איש מקצוע חד-פעמי</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="שם"
                  aria-label="שם איש מקצוע חד-פעמי"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-orange focus:outline-none"
                />
                <input
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="טלפון"
                  aria-label="טלפון איש מקצוע חד-פעמי"
                  dir="ltr"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-orange focus:outline-none"
                />
              </div>
              <p className="mt-2 text-[0.7rem] text-text-muted">נשמר רק בלחיצה על עדכון. יציאה מהקריאה בלי לחיצה לא שומרת.</p>
              <Button
                type="button"
                fullWidth
                className="mt-2"
                disabled={!dirty}
                onClick={() => {
                  commitTicketUpdate(ticket.id, {
                    status: draftStatus,
                    note: note.trim() || undefined,
                    professionalId: guestReady ? undefined : draftProfessionalId,
                    guest: guestReady
                      ? { fullName: guestName.trim(), phone: guestPhone.trim(), trade: ticket.category }
                      : undefined,
                  });
                  setNote("");
                  setGuestName("");
                  setGuestPhone("");
                }}
              >
                עדכון
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
