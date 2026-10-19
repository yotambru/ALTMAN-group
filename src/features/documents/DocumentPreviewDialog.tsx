"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Portal } from "@/components/ui/Portal";
import { unpackSignature } from "@/lib/document-signing";
import { useSignedUrl } from "@/lib/supabase/files";
import { formatDateDots } from "@/lib/utils";
import type { AppDocument } from "@/types";

interface DocumentPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  document?: AppDocument | null;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|heic|heif)(?:\?|#|$)/i;
const PDF_EXT = /\.pdf(?:\?|#|$)/i;
const PHOTO_TYPES = new Set(["id", "property_photo"]);
const PHOTO_FOLDERS = new Set(["id_photos", "landlord_id", "guarantor_id", "meter_photos"]);

function isImageSource(url: string, doc?: AppDocument | null): boolean {
  if (url.startsWith("data:image/")) return true;
  if (IMAGE_EXT.test(url) || IMAGE_EXT.test(doc?.name ?? "")) return true;
  if (doc && (PHOTO_TYPES.has(doc.type) || (doc.folder && PHOTO_FOLDERS.has(doc.folder)))) {
    return !isPdfSource(url, doc);
  }
  return false;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char] ?? char;
  });
}

function openDocumentWindow(
  fileUrl: string,
  title: string,
  signer: string,
  signatureUrl: string | undefined,
  signedAt?: string,
) {
  if (!signer && !signatureUrl) {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const when = signedAt ? formatDateDots(signedAt) : "";
  const image = signatureUrl
    ? `<img alt="" src="${escapeHtml(signatureUrl)}" style="height:72px;background:#fff;border-radius:8px;" />`
    : "";
  win.document.write(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="margin:0;font-family:Assistant,Arial,sans-serif;background:#f6f7fb;color:#14285a;"><div style="display:flex;gap:16px;align-items:center;padding:16px 20px;background:#fff;border-bottom:1px solid #e6e8ef;">${image}<div><strong>${escapeHtml(title)}</strong><div style="font-size:13px;color:#667;">נחתם ע״י ${escapeHtml(signer || "חתימה")}${when ? ` · ${escapeHtml(when)}` : ""} · הזהות אומתה</div></div></div><iframe src="${escapeHtml(fileUrl)}" style="width:100%;height:calc(100vh - 88px);border:0;"></iframe></body></html>`);
  win.document.close();
}

function isPdfSource(url: string, doc?: AppDocument | null): boolean {
  if (url.startsWith("data:application/pdf")) return true;
  return PDF_EXT.test(url) || PDF_EXT.test(doc?.name ?? "");
}

export function DocumentFilePreview({
  document: doc,
  compact = false,
  emptyTitle = "אין קובץ לתצוגה",
  emptyDescription = "המסמך עדיין לא הועלה, או שלא ניתן להציג אותו כאן.",
}: {
  document?: AppDocument | null;
  compact?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = useSignedUrl(doc?.fileDataUrl);
  const signature = unpackSignature(doc?.signedByName);
  const signatureSrc = useSignedUrl(signature.imageUrl);
  const heading = doc?.name ?? "מסמך";
  const imageFailed = Boolean(url && failedUrl === url);
  const showImage = Boolean(url && !imageFailed && isImageSource(url, doc));
  const showPdf = Boolean(url && !showImage && isPdfSource(url, doc));
  const frameClass = compact
    ? "h-[28vh] w-full rounded-xl ring-1 ring-border"
    : "h-[60vh] w-full rounded-xl ring-1 ring-border";

  return (
    <div className="space-y-3">
      {url && showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={heading}
          className={
            compact
              ? "max-h-[28vh] w-full rounded-xl object-contain ring-1 ring-border"
              : "max-h-[60vh] w-full rounded-xl object-contain ring-1 ring-border"
          }
          onError={() => {
            if (url) setFailedUrl(url);
          }}
        />
      ) : url && showPdf ? (
        <object title={heading} data={url} type="application/pdf" className={frameClass}>
          <iframe title={heading} src={url} className={frameClass} />
        </object>
      ) : url ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <FileText className="h-8 w-8 text-text-muted" />
          <p className="text-sm font-semibold text-navy">אין תצוגה מקדימה לסוג קובץ זה</p>
          <p className="text-xs text-text-muted">ניתן לפתוח את המסמך בחלון חדש.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <FileText className="h-8 w-8 text-text-muted" />
          <p className="text-sm font-semibold text-navy">{emptyTitle}</p>
          <p className="text-xs text-text-muted">{emptyDescription}</p>
        </div>
      )}

      {(signature.name || signatureSrc) && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted p-3">
          {signatureSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signatureSrc} alt="" className="h-12 max-w-32 rounded bg-white object-contain" />
          ) : null}
          <p className="text-xs text-text-muted">
            נחתם ע״י {signature.name || "חתימה"}
            {doc?.signedAt ? ` · ${formatDateDots(doc.signedAt)}` : ""}
            {" · "}הזהות אומתה
          </p>
        </div>
      )}

      {url && (
        <Button
          variant="outline"
          fullWidth
          onClick={() => openDocumentWindow(url, heading, signature.name, signatureSrc, doc?.signedAt)}
        >
          <ExternalLink className="h-4 w-4" />
          פתיחה בחלון חדש
        </Button>
      )}
    </div>
  );
}

/** Full-screen overlay for viewing an uploaded document (image, PDF, or fallback). */
export function DocumentPreviewDialog({
  open,
  onClose,
  document: doc,
  title,
  description,
  emptyTitle = "אין קובץ לתצוגה",
  emptyDescription = "המסמך עדיין לא הועלה, או שלא ניתן להציג אותו כאן.",
}: DocumentPreviewDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.document.addEventListener("keydown", onKey, true);
    return () => window.document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const heading = title ?? doc?.name ?? "מסמך";

  return (
    <Portal>
    <div
      className="fixed inset-0 z-[var(--z-overlay-nested)] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={heading}
    >
      <button
        type="button"
        aria-label="סגירה"
        className="absolute inset-0 bg-navy-dark/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[30rem] rounded-t-2xl bg-surface p-5 shadow-lg sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-navy">{heading}</h3>
            {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <DocumentFilePreview
          document={doc}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </div>
    </div>
    </Portal>
  );
}
