"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ClipboardList,
  Eye,
  FileCheck2,
  FileText,
  Folder,
  FolderInput,
  Gauge,
  IdCard,
  Paperclip,
  PenLine,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchField } from "@/components/dashboard/ClientRow";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { DocumentPreviewDialog } from "@/features/documents/DocumentPreviewDialog";
import { SignatureDialog } from "@/features/documents/SignatureDialog";
import { useData } from "@/lib/store";
import {
  DOCUMENT_FOLDER_CHILD,
  DOCUMENT_FOLDER_LABEL,
  DOCUMENT_FOLDER_PARENT,
  ROOT_DOCUMENT_FOLDERS,
  docsInFolder,
  documentFolderAncestors,
  emptyFoldersLast,
  folderCount,
  folderToDocumentType,
  inferDocumentFolder,
  intakeDocumentName,
} from "@/lib/document-folders";
import { fileToDataUrl, formatDateDots } from "@/lib/utils";
import type { AppDocument, DocumentFolder, DocumentType, Landlord, Property, Tenant } from "@/types";

const UNASSIGNED = "unassigned";

type FolderId = string;

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
  /** Properties become top-level folders. */
  properties?: Property[];
  /** Enable free-text search + client filter on the apartments list. */
  searchable?: boolean;
  /** Hide folders and their documents for role-specific views. */
  hiddenFolders?: DocumentFolder[];
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

const folderIcon: Record<DocumentFolder, LucideIcon> = {
  lease: FileText,
  lease_renewal: FileText,
  management: FileText,
  landlord_id: IdCard,
  id_photos: IdCard,
  guarantor_id: Users,
  meter_photos: Gauge,
  appendices: Paperclip,
  entry_protocol: ClipboardList,
};

function docsCountLabel(n: number) {
  if (n === 0) return "אין מסמכים";
  if (n === 1) return "מסמך אחד";
  return `${n} מסמכים`;
}

function FolderBreadcrumb({
  crumbs,
}: {
  crumbs: { id: string; label: string; onClick: () => void }[];
}) {
  if (crumbs.length === 0) return null;
  return (
    <nav aria-label="ניווט בתיקיות">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, index) => (
          <li key={crumb.id} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-navy/30" aria-hidden />
            )}
            <button
              type="button"
              onClick={crumb.onClick}
              className="inline-flex max-w-[11rem] items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-sm font-semibold text-navy/75 transition-colors hover:bg-navy/10"
            >
              {index === 0 && <ArrowRight className="h-4 w-4 shrink-0" />}
              <span className="truncate">{crumb.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function FolderRow({
  icon,
  title,
  subtitle,
  count,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 text-start transition-all hover:bg-surface-muted/90 active:scale-[0.995]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-orange-soft text-orange">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.95rem] font-extrabold tracking-tight text-navy">{title}</p>
        <p className="mt-0.5 truncate text-xs text-text-muted">{subtitle}</p>
      </div>
      <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-navy/5 px-2 py-1 text-[0.7rem] font-bold tabular-nums text-navy">
        {count}
      </span>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-muted text-navy/35 transition-colors group-hover:bg-orange-soft group-hover:text-orange">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
      </span>
    </button>
  );
}

function DocRow({
  doc,
  canSign,
  onSign,
  onPreview,
  moveToFolder,
  moveLabel,
  onMove,
}: {
  doc: AppDocument;
  canSign: boolean;
  onSign: (doc: AppDocument) => void;
  onPreview: (doc: AppDocument) => void;
  moveToFolder?: DocumentFolder;
  moveLabel?: string;
  onMove?: (doc: AppDocument, folder: DocumentFolder) => void;
}) {
  const meta = statusLabel[doc.status ?? (doc.signed ? "signed" : "draft")];
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border p-3 transition-colors hover:bg-surface-muted/90">
      <button
        type="button"
        onClick={() => onPreview(doc)}
        aria-label={`תצוגת ${doc.name}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-start"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy/5 text-navy">
          {doc.signed ? <FileCheck2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-navy">{doc.name}</p>
          <p className="text-[0.7rem] text-text-muted">
            {DOCUMENT_FOLDER_LABEL[inferDocumentFolder(doc)]} · {formatDateDots(doc.createdAt)}
            {doc.signedByName ? ` • נחתם ע״י ${doc.signedByName}` : ""}
          </p>
        </div>
        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy/5 text-navy">
          <Eye className="h-4 w-4" />
        </span>
      </button>
      {moveToFolder && onMove && moveLabel && (
        <button
          type="button"
          onClick={() => onMove(doc, moveToFolder)}
          aria-label={moveLabel}
          title={moveLabel}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-soft text-orange hover:bg-orange hover:text-white"
        >
          <FolderInput className="h-4 w-4" />
        </button>
      )}
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
  properties = [],
  searchable = false,
  hiddenFolders = [],
  landlords = [],
  tenants = [],
  awaitingSignatureOnly = false,
}: DocumentsDialogProps) {
  const { addDocument, updateDocument, leases, tenants: allTenants, users } = useData();
  const [signingDoc, setSigningDoc] = useState<AppDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<AppDocument | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [query, setQuery] = useState("");
  const [landlordFilter, setLandlordFilter] = useState<string>("all");
  const [selectedPropertyId, setSelectedPropertyId] = useState<FolderId | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<FolderId | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<DocumentFolder | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tenantLookup = useMemo(() => {
    const map = new Map<string, Tenant>();
    for (const t of allTenants) map.set(t.id, t);
    for (const t of tenants) map.set(t.id, t);
    return map;
  }, [allTenants, tenants]);

  const vaultDocs = useMemo(
    () =>
      documents.filter((d) => {
        if (d.type === "property_photo") return false;
        if (hiddenFolders.includes(inferDocumentFolder(d))) return false;
        if (!awaitingSignatureOnly) return true;
        const st = d.status ?? (d.signed ? "signed" : "draft");
        return st === "awaiting_signature";
      }),
    [documents, awaitingSignatureOnly, hiddenFolders],
  );

  const knownIds = useMemo(() => new Set(properties.map((p) => p.id)), [properties]);

  const propertyFolders = useMemo(() => {
    const docsFor = (propertyId: FolderId) =>
      vaultDocs.filter((d) => {
        if (propertyId === UNASSIGNED) return !d.propertyId || !knownIds.has(d.propertyId);
        return d.propertyId === propertyId;
      });

    const folders = properties
      .filter((p) => landlordFilter === "all" || p.landlordId === landlordFilter)
      .map((p) => {
        const docs = docsFor(p.id);
        const landlordName = landlords.find((l) => l.id === p.landlordId)?.fullName ?? "";
        const tenantName = tenantLookup.get(p.tenantId ?? "")?.fullName ?? "";
        const hay = `${p.address} ${p.city} ${p.apartmentNumber} ${landlordName} ${tenantName} ${docs.map((d) => d.name).join(" ")}`.toLowerCase();
        return {
          id: p.id,
          title: `${p.address}, ${p.city}`,
          subtitle: `דירה ${p.apartmentNumber} · ${docsCountLabel(docs.length)}`,
          count: docs.length,
          hay,
        };
      });

    const general = docsFor(UNASSIGNED);
    if (general.length > 0 || (upload && properties.length === 0)) {
      folders.push({
        id: UNASSIGNED,
        title: "כללי",
        subtitle: `ללא שיוך לדירה · ${docsCountLabel(general.length)}`,
        count: general.length,
        hay: `כללי ללא שיוך ${general.map((d) => d.name).join(" ")}`.toLowerCase(),
      });
    }

    return awaitingSignatureOnly ? folders.filter((f) => f.count > 0) : folders;
  }, [
    properties,
    landlordFilter,
    landlords,
    tenantLookup,
    vaultDocs,
    knownIds,
    upload,
    awaitingSignatureOnly,
  ]);

  const skipPropertyList = propertyFolders.length <= 1 && landlordFilter === "all";
  const activePropertyId = skipPropertyList
    ? (propertyFolders[0]?.id ?? null)
    : selectedPropertyId;

  const visiblePropertyFolders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || activePropertyId) return propertyFolders;
    return propertyFolders.filter((f) => f.hay.includes(q));
  }, [propertyFolders, query, activePropertyId]);

  const activeProperty = properties.find((p) => p.id === activePropertyId);

  const propertyDocs = useMemo(() => {
    if (!activePropertyId) return [];
    return vaultDocs.filter((d) => {
      if (activePropertyId === UNASSIGNED) return !d.propertyId || !knownIds.has(d.propertyId);
      return d.propertyId === activePropertyId;
    });
  }, [activePropertyId, vaultDocs, knownIds]);

  const tenantFolders = useMemo(() => {
    if (!activePropertyId) return [];
    const ids = new Set<string>();
    if (activeProperty?.tenantId) ids.add(activeProperty.tenantId);
    for (const t of tenantLookup.values()) {
      if (t.propertyId === activePropertyId) ids.add(t.id);
    }
    for (const lease of leases) {
      if (lease.propertyId === activePropertyId) ids.add(lease.tenantId);
    }
    for (const doc of propertyDocs) {
      if (doc.tenantId) ids.add(doc.tenantId);
    }

    const currentId = activeProperty?.tenantId ?? null;
    let fallbackId = currentId;
    if (!fallbackId) {
      let bestDate = "";
      for (const id of ids) {
        const start = leases
          .filter((l) => l.propertyId === activePropertyId && l.tenantId === id)
          .sort((a, b) => b.startDate.localeCompare(a.startDate))[0]?.startDate ?? "";
        if (start > bestDate) {
          bestDate = start;
          fallbackId = id;
        }
      }
      if (!fallbackId) fallbackId = [...ids][0] ?? null;
    }

    const folders = [...ids].map((id) => {
      const tenant = tenantLookup.get(id);
      const lease = leases
        .filter((l) => l.propertyId === activePropertyId && l.tenantId === id)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
      const docs = propertyDocs.filter(
        (d) => d.tenantId === id || (!d.tenantId && id === fallbackId),
      );
      const isCurrent = currentId === id;
      const period = lease
        ? `${formatDateDots(lease.startDate)}–${formatDateDots(lease.endDate)}`
        : "";
      const roleLabel = isCurrent ? "שוכר נוכחי" : "שוכר לשעבר";
      return {
        id,
        title: tenant?.fullName ?? "שוכר",
        subtitle: period ? `${roleLabel} · ${period}` : `${roleLabel} · ${docsCountLabel(docs.length)}`,
        count: docs.length,
        isCurrent,
        hay: `${tenant?.fullName ?? ""} ${docs.map((d) => d.name).join(" ")}`.toLowerCase(),
        startDate: lease?.startDate ?? "",
      };
    });

    folders.sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      return b.startDate.localeCompare(a.startDate);
    });

    const visible = awaitingSignatureOnly ? folders.filter((f) => f.count > 0) : folders;
    return visible;
  }, [
    activePropertyId,
    activeProperty,
    tenantLookup,
    leases,
    propertyDocs,
    awaitingSignatureOnly,
  ]);

  const skipTenantList =
    (Boolean(activePropertyId) && tenantFolders.length === 0) ||
    (tenantFolders.length <= 1 && propertyFolders.length <= 1);
  const activeTenantId = skipTenantList
    ? (tenantFolders[0]?.id ?? null)
    : selectedTenantId;
  const atTenantLevel = Boolean(activeTenantId) || (Boolean(activePropertyId) && tenantFolders.length === 0);

  const visibleTenantFolders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || activeTenantId) return tenantFolders;
    return tenantFolders.filter((f) => f.hay.includes(q) || f.title.toLowerCase().includes(q));
  }, [tenantFolders, query, activeTenantId]);

  const activeTenant = activeTenantId ? tenantLookup.get(activeTenantId) : undefined;

  const tenantDocs = useMemo(() => {
    if (activeTenantId) {
      const fallbackId = tenantFolders.find((f) => f.isCurrent)?.id ?? tenantFolders[0]?.id;
      return propertyDocs.filter(
        (d) => d.tenantId === activeTenantId || (!d.tenantId && activeTenantId === fallbackId),
      );
    }
    if (atTenantLevel) return propertyDocs;
    return [];
  }, [activeTenantId, tenantFolders, propertyDocs, atTenantLevel]);

  const categoryFolders = useMemo(() => {
    if (!atTenantLevel) return [];
    const q = query.trim().toLowerCase();
    const folders = ROOT_DOCUMENT_FOLDERS.filter((folder) => !hiddenFolders.includes(folder)).map((folder) => ({
      folder,
      title: DOCUMENT_FOLDER_LABEL[folder],
      count: folderCount(tenantDocs, folder),
    }));
    const visible = awaitingSignatureOnly ? folders.filter((f) => f.count > 0) : folders;
    const sorted = emptyFoldersLast(visible);
    if (!q || selectedFolder) return sorted;
    return sorted.filter(
      (f) =>
        f.title.includes(q) ||
        tenantDocs.some(
          (d) =>
            inferDocumentFolder(d) === f.folder &&
            d.name.toLowerCase().includes(q),
        ),
    );
  }, [atTenantLevel, tenantDocs, awaitingSignatureOnly, query, selectedFolder, hiddenFolders]);

  const childFolder = selectedFolder ? DOCUMENT_FOLDER_CHILD[selectedFolder] : undefined;
  const ChildIcon = childFolder ? folderIcon[childFolder] : null;

  const folderDocs = useMemo(() => {
    if (!selectedFolder) return [];
    const q = query.trim().toLowerCase();
    const docs = docsInFolder(tenantDocs, selectedFolder);
    if (!q) return docs;
    return docs.filter((d) => d.name.toLowerCase().includes(q));
  }, [selectedFolder, tenantDocs, query]);

  const resetQuery = () => setQuery("");

  const openProperty = (id: FolderId) => {
    resetQuery();
    setSelectedFolder(null);
    setSelectedTenantId(null);
    setSelectedPropertyId(id);
  };

  const backToProperties = () => {
    resetQuery();
    setSelectedFolder(null);
    setSelectedTenantId(null);
    setSelectedPropertyId(null);
  };

  const backToTenants = () => {
    resetQuery();
    setSelectedFolder(null);
    setSelectedTenantId(null);
  };

  const backToTenantFolders = () => {
    resetQuery();
    setSelectedFolder(null);
  };

  const openTenant = (id: FolderId) => {
    resetQuery();
    setSelectedFolder(null);
    setSelectedTenantId(id);
  };

  const openFolder = (folder: DocumentFolder) => {
    resetQuery();
    setSelectedFolder(folder);
  };

  const crumbs: { id: string; label: string; onClick: () => void }[] = [];
  if (!skipPropertyList && activePropertyId) {
    crumbs.push({ id: "properties", label: "דירות", onClick: backToProperties });
  }
  if (!skipTenantList && activeTenantId) {
    crumbs.push({ id: "tenants", label: "שוכרים", onClick: backToTenants });
  }
  if (selectedFolder) {
    crumbs.push({
      id: "tenant-folders",
      label: activeTenant?.fullName ?? "תיקיות",
      onClick: backToTenantFolders,
    });
    for (const ancestor of documentFolderAncestors(selectedFolder)) {
      crumbs.push({
        id: ancestor,
        label: DOCUMENT_FOLDER_LABEL[ancestor],
        onClick: () => openFolder(ancestor),
      });
    }
  }

  const handleUpload = async (file: File) => {
    if (!selectedFolder) return;
    const dataUrl = await fileToDataUrl(file);
    const photoLabel =
      selectedFolder === "guarantor_id"
        ? "תצלום תעודת זהות — ערב"
        : selectedFolder === "id_photos"
          ? "תצלום תעודת זהות"
          : null;
    addDocument({
      name: uploadName.trim() || (photoLabel ? intakeDocumentName(photoLabel, file.name) : file.name),
      type: folderToDocumentType(selectedFolder),
      folder: selectedFolder,
      propertyId:
        activePropertyId && activePropertyId !== UNASSIGNED
          ? activePropertyId
          : upload?.propertyId,
      landlordId: activeProperty?.landlordId ?? upload?.landlordId,
      tenantId: activeTenantId ?? upload?.tenantId,
      ownerUserId: upload?.ownerUserId,
      fileDataUrl: dataUrl,
    });
    setUploadName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const parentFolder = selectedFolder ? DOCUMENT_FOLDER_PARENT[selectedFolder] : undefined;
  const moveToFolder = upload ? (childFolder ?? parentFolder) : undefined;
  const moveLabel = moveToFolder
    ? `העברה לתיקיית ${DOCUMENT_FOLDER_LABEL[moveToFolder]}`
    : undefined;

  const handleMove = (doc: AppDocument, folder: DocumentFolder) => {
    const name =
      folder === "guarantor_id"
        ? intakeDocumentName("תצלום תעודת זהות — ערב", doc.name)
        : doc.name;
    updateDocument(doc.id, { folder, name });
  };

  const searchPlaceholder = selectedFolder
    ? "חיפוש מסמך בתיקייה…"
    : atTenantLevel
      ? "חיפוש תיקייה או מסמך…"
      : activePropertyId
        ? "חיפוש שוכר או מסמך…"
        : "חיפוש דירה, לקוח או מסמך…";

  const HeaderIcon = selectedFolder
    ? folderIcon[selectedFolder]
    : activeTenantId
      ? Users
      : Building2;

  const headerTitle = selectedFolder
    ? DOCUMENT_FOLDER_LABEL[selectedFolder]
    : activeTenant
      ? activeTenant.fullName
      : activeProperty
        ? `${activeProperty.address}, ${activeProperty.city}`
        : "כללי";

  const headerSubtitle = selectedFolder
    ? docsCountLabel(
        folderDocs.length + (childFolder ? folderCount(tenantDocs, childFolder) : 0),
      )
    : activeTenantId
      ? docsCountLabel(tenantDocs.length)
      : activeProperty
        ? `דירה ${activeProperty.apartmentNumber} · ${docsCountLabel(propertyDocs.length)}`
        : docsCountLabel(propertyDocs.length);

  const header = (activePropertyId || activeTenantId || selectedFolder) && (
    <div className="mb-3 space-y-2">
      <FolderBreadcrumb crumbs={crumbs} />
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-l from-orange-soft/70 to-surface-muted px-3.5 py-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface text-orange shadow-sm">
          {activeTenant && !selectedFolder ? (
            <UserAvatar
              name={activeTenant.fullName}
              avatarUrl={users.find((u) => u.tenantId === activeTenant.id)?.avatarUrl}
              size="md"
              tone="gradient"
              className="h-11 w-11"
            />
          ) : (
            <HeaderIcon className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h3 className="truncate text-base font-extrabold tracking-tight text-navy">{headerTitle}</h3>
          <p className="mt-0.5 text-xs font-medium text-text-muted">{headerSubtitle}</p>
        </div>
      </div>
    </div>
  );

  const filters = searchable && (
    <div className="mb-3 space-y-2">
      <SearchField value={query} onChange={setQuery} placeholder={searchPlaceholder} />
      {!activePropertyId && landlords.length > 0 && (
        <select
          value={landlordFilter}
          onChange={(e) => {
            setLandlordFilter(e.target.value);
            backToProperties();
          }}
          className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs text-navy focus:border-orange focus:outline-none"
          aria-label="סינון לפי לקוח"
        >
          <option value="all">כל הלקוחות</option>
          {landlords.map((l) => (
            <option key={l.id} value={l.id}>
              {l.fullName}
            </option>
          ))}
        </select>
      )}
    </div>
  );

  const uploadBox = upload && selectedFolder && (
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
  );

  const list = (
    <div className={inline ? "space-y-2" : "no-scrollbar max-h-[55vh] space-y-2 overflow-y-auto"}>
      {selectedFolder ? (
        <>
          {childFolder && ChildIcon && folderCount(tenantDocs, childFolder) > 0 && (
            <FolderRow
              icon={<ChildIcon className="h-5 w-5" />}
              title={DOCUMENT_FOLDER_LABEL[childFolder]}
              subtitle={docsCountLabel(folderCount(tenantDocs, childFolder))}
              count={folderCount(tenantDocs, childFolder)}
              onClick={() => openFolder(childFolder)}
            />
          )}
          {folderDocs.length === 0 && !(childFolder && folderCount(tenantDocs, childFolder) > 0) ? (
            <p className="py-6 text-center text-sm text-text-muted">אין מסמכים בתיקייה זו.</p>
          ) : (
            folderDocs.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                canSign={canSign}
                onSign={setSigningDoc}
                onPreview={setPreviewDoc}
                moveToFolder={moveToFolder}
                moveLabel={moveLabel}
                onMove={handleMove}
              />
            ))
          )}
          {childFolder && ChildIcon && folderCount(tenantDocs, childFolder) === 0 && (
            <FolderRow
              icon={<ChildIcon className="h-5 w-5" />}
              title={DOCUMENT_FOLDER_LABEL[childFolder]}
              subtitle={docsCountLabel(0)}
              count={0}
              onClick={() => openFolder(childFolder)}
            />
          )}
        </>
      ) : atTenantLevel ? (
        categoryFolders.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">אין תיקיות להצגה.</p>
        ) : (
          categoryFolders.map((folder) => {
            const Icon = folderIcon[folder.folder];
            return (
              <FolderRow
                key={folder.folder}
                icon={<Icon className="h-5 w-5" />}
                title={folder.title}
                subtitle={docsCountLabel(folder.count)}
                count={folder.count}
                onClick={() => openFolder(folder.folder)}
              />
            );
          })
        )
      ) : activePropertyId ? (
        visibleTenantFolders.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">אין שוכרים לנכס זה.</p>
        ) : (
          visibleTenantFolders.map((folder) => (
            <FolderRow
              key={folder.id}
              icon={
                <UserAvatar
                  name={folder.title}
                  avatarUrl={users.find((u) => u.tenantId === folder.id)?.avatarUrl}
                  size="md"
                  tone="gradient"
                  className="h-11 w-11 rounded-xl"
                />
              }
              title={folder.title}
              subtitle={folder.subtitle}
              count={folder.count}
              onClick={() => openTenant(folder.id)}
            />
          ))
        )
      ) : visiblePropertyFolders.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">אין מסמכים להצגה.</p>
      ) : (
        visiblePropertyFolders.map((folder) => (
          <FolderRow
            key={folder.id}
            icon={<Folder className="h-5 w-5" />}
            title={folder.title}
            subtitle={folder.subtitle}
            count={folder.count}
            onClick={() => openProperty(folder.id)}
          />
        ))
      )}
    </div>
  );

  const body = (
    <>
      {header}
      {filters}
      {uploadBox}
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

      <DocumentPreviewDialog
        open={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        description={
          previewDoc
            ? `${DOCUMENT_FOLDER_LABEL[inferDocumentFolder(previewDoc)]} · ${formatDateDots(previewDoc.createdAt)}`
            : undefined
        }
      />

      <SignatureDialog
        open={signingDoc !== null}
        onClose={() => setSigningDoc(null)}
        document={signingDoc}
        signerName={signerName}
      />
    </>
  );
}
