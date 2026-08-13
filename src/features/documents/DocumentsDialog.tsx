"use client";

import { useMemo, useRef, useState } from "react";
import { Building2, FileCheck2, FileText, PenLine, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchField } from "@/components/dashboard/ClientRow";
import { SignatureDialog } from "@/features/documents/SignatureDialog";
import { useData } from "@/lib/store";
import { fileToDataUrl, formatDateDots } from "@/lib/utils";
import type { AppDocument, DocumentType, Landlord, Property, Tenant } from "@/types";

interface DocumentsDialogProps {
  open?: boolean;
  onClose?: () => void;
  /** Render list in-place (dashboard panel) instead of a modal sheet. */
  inline?: boolean;
  title?: string;
  description?: string;
  documents: AppDocument[];
  canSign?: boolean;
  signerName?: string;
  upload?: {
    ownerUserId?: string;
    propertyId?: string;
    landlordId?: string;
    tenantId?: string;
    defaultType?: DocumentType;
  };
  /** When set, documents are grouped under property sections. */
  properties?: Property[];
  /** Enable free-text search + client/property/tenant filters. */
  searchable?: boolean;
  landlords?: Landlord[];
  tenants?: Tenant[];
  /** Prefocus signature-only view. */
  awaitingSignatureOnly?: boolean;
}

const statusLabel: Record<NonNullable<AppDocument["status"]>, { label: string; tone: "success" | "warning" | "neutral" }> = {
  signed: { label: "חתום", tone: "success" },
  awaiting_signature: { label: "ממתין לחתימה", tone: "warning" },
  draft: { label: "טיוטה", tone: "neutral" },
};

const typeLabel: Record<DocumentType, string> = {
  contract: "חוזה",
  approval: "אישור",
  report: "דוח",
  id: "תעודה",
  invoice: "חשבונית",
  insurance: "ביטוח",
  utility: "חשבון",
  protocol: "פרוטוקול",
};

function DocRow({
  doc,
  canSign,
  onSign,
  metaLine,
}: {
  doc: AppDocument;
  canSign: boolean;
  onSign: (doc: AppDocument) => void;
  metaLine?: string;
}) {
  const meta = statusLabel[doc.status ?? (doc.signed ? "signed" : "draft")];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy/5 text-navy">
        {doc.signed ? <FileCheck2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-navy">{doc.name}</p>
        <p className="text-[0.7rem] text-text-muted">
          {typeLabel[doc.type]} · {formatDateDots(doc.createdAt)}
          {doc.signedByName ? ` • נחתם ע״י ${doc.signedByName}` : ""}
          {metaLine ? ` • ${metaLine}` : ""}
        </p>
      </div>
      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
      {canSign && !doc.signed && (
        <button
          type="button"
          onClick={() => onSign(doc)}
          aria-label="חתימה"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-soft text-orange hover:bg-orange hover:text-white"
        >
          <PenLine className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function PropertySection({
  title,
  docs,
  canSign,
  onSign,
  hideIfEmpty = false,
}: {
  title: string;
  docs: AppDocument[];
  canSign: boolean;
  onSign: (doc: AppDocument) => void;
  hideIfEmpty?: boolean;
}) {
  if (hideIfEmpty && docs.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-0.5 pt-1">
        <Building2 className="h-4 w-4 text-orange" />
        <h4 className="text-sm font-bold text-navy">{title}</h4>
        <span className="text-xs text-text-muted">({docs.length})</span>
      </div>
      {docs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-3 text-center text-xs text-text-muted">
          אין מסמכים לנכס זה
        </p>
      ) : (
        docs.map((doc) => <DocRow key={doc.id} doc={doc} canSign={canSign} onSign={onSign} />)
      )}
    </section>
  );
}

export function DocumentsDialog({
  open = false,
  onClose,
  inline = false,
  title = "כספת מסמכים",
  description = "חוזים, אישורים ומסמכים חשובים במקום אחד",
  documents,
  canSign = false,
  signerName = "",
  upload,
  properties,
  searchable = false,
  landlords = [],
  tenants = [],
  awaitingSignatureOnly = false,
}: DocumentsDialogProps) {
  const { addDocument } = useData();
  const [signingDoc, setSigningDoc] = useState<AppDocument | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [query, setQuery] = useState("");
  const [landlordFilter, setLandlordFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "awaiting_signature" | "signed" | "draft">(
    awaitingSignatureOnly ? "awaiting_signature" : "all",
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    addDocument({
      name: uploadName.trim() || file.name,
      type: upload?.defaultType ?? "approval",
      propertyId: upload?.propertyId ?? (propertyFilter !== "all" ? propertyFilter : undefined),
      landlordId: upload?.landlordId ?? (landlordFilter !== "all" ? landlordFilter : undefined),
      tenantId: upload?.tenantId ?? (tenantFilter !== "all" ? tenantFilter : undefined),
      ownerUserId: upload?.ownerUserId,
      fileDataUrl: dataUrl,
    });
    setUploadName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((d) => {
      if (landlordFilter !== "all" && d.landlordId !== landlordFilter) {
        const prop = properties?.find((p) => p.id === d.propertyId);
        if (prop?.landlordId !== landlordFilter && d.landlordId !== landlordFilter) return false;
      }
      if (propertyFilter !== "all" && d.propertyId !== propertyFilter) return false;
      if (tenantFilter !== "all" && d.tenantId !== tenantFilter) return false;
      if (statusFilter !== "all") {
        const st = d.status ?? (d.signed ? "signed" : "draft");
        if (st !== statusFilter) return false;
      }
      if (!q) return true;
      const landlordName = landlords.find((l) => l.id === d.landlordId)?.fullName ?? "";
      const tenantName = tenants.find((t) => t.id === d.tenantId)?.fullName ?? "";
      const prop = properties?.find((p) => p.id === d.propertyId);
      const address = prop ? `${prop.address} ${prop.city}` : "";
      const hay = `${d.name} ${typeLabel[d.type]} ${landlordName} ${tenantName} ${address}`.toLowerCase();
      return hay.includes(q);
    });
  }, [
    documents,
    query,
    landlordFilter,
    propertyFilter,
    tenantFilter,
    statusFilter,
    landlords,
    tenants,
    properties,
  ]);

  const grouped = Boolean(properties?.length) && !searchable;
  const knownIds = new Set(properties?.map((p) => p.id) ?? []);
  const generalDocs = grouped
    ? filtered.filter((d) => !d.propertyId || !knownIds.has(d.propertyId))
    : filtered;

  const filters = searchable && (
    <div className="mb-3 space-y-2">
      <SearchField value={query} onChange={setQuery} placeholder="חיפוש חופשי — שם מסמך, לקוח, נכס…" />
      <div className="grid grid-cols-2 gap-2">
        {landlords.length > 0 && (
          <select
            value={landlordFilter}
            onChange={(e) => {
              setLandlordFilter(e.target.value);
              setPropertyFilter("all");
            }}
            className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-navy focus:border-orange focus:outline-none"
            aria-label="סינון לפי לקוח"
          >
            <option value="all">כל הלקוחות</option>
            {landlords.map((l) => (
              <option key={l.id} value={l.id}>{l.fullName}</option>
            ))}
          </select>
        )}
        {properties && properties.length > 0 && (
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-navy focus:border-orange focus:outline-none"
            aria-label="סינון לפי נכס"
          >
            <option value="all">כל הנכסים</option>
            {properties
              .filter((p) => landlordFilter === "all" || p.landlordId === landlordFilter)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.address}, {p.city}</option>
              ))}
          </select>
        )}
        {tenants.length > 0 && (
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-navy focus:border-orange focus:outline-none"
            aria-label="סינון לפי שוכר"
          >
            <option value="all">כל השוכרים</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.fullName}</option>
            ))}
          </select>
        )}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-border bg-surface px-2 py-2 text-xs text-navy focus:border-orange focus:outline-none"
          aria-label="סינון לפי סטטוס"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="awaiting_signature">מסמכים לחתימה</option>
          <option value="signed">חתומים</option>
          <option value="draft">טיוטות</option>
        </select>
      </div>
    </div>
  );

  const list = (
    <div className={inline ? "space-y-4" : "no-scrollbar max-h-[55vh] space-y-4 overflow-y-auto"}>
      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-text-muted">אין מסמכים להצגה.</p>
      )}

      {grouped ? (
        <>
          {properties!.map((property) => (
            <PropertySection
              key={property.id}
              title={`${property.address}, ${property.city}`}
              docs={filtered.filter((d) => d.propertyId === property.id)}
              canSign={canSign}
              onSign={setSigningDoc}
            />
          ))}
          <PropertySection
            title="כללי · ללא שיוך לנכס"
            docs={generalDocs}
            canSign={canSign}
            onSign={setSigningDoc}
            hideIfEmpty
          />
        </>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const landlordName = landlords.find((l) => l.id === doc.landlordId)?.fullName;
            const tenantName = tenants.find((t) => t.id === doc.tenantId)?.fullName;
            const metaBits = [landlordName, tenantName].filter(Boolean).join(" · ");
            return (
              <DocRow
                key={doc.id}
                doc={doc}
                canSign={canSign}
                onSign={setSigningDoc}
                metaLine={metaBits || undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  const body = (
    <>
      {filters}
      {upload && (
        <div className="mb-4 rounded-xl border border-dashed border-border bg-surface-muted p-3">
          <input
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            placeholder="שם המסמך (לא חובה)"
            className="mb-2 w-full rounded-lg border bg-surface px-3 py-2 text-sm focus:border-orange focus:outline-none"
          />
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
            }}
          />
          <Button variant="outline" fullWidth onClick={() => fileRef.current?.click()}>
            <Upload className="h-5 w-5" />
            העלאת מסמך
          </Button>
        </div>
      )}
      {list}
    </>
  );

  return (
    <>
      {inline ? (
        <div>{body}</div>
      ) : (
        <Modal open={open} onClose={onClose ?? (() => undefined)} title={title} description={description}>
          {body}
        </Modal>
      )}

      <SignatureDialog
        open={signingDoc !== null}
        onClose={() => setSigningDoc(null)}
        document={signingDoc}
        signerName={signerName}
      />
    </>
  );
}
