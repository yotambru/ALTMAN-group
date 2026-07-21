"use client";

import { Download, FileCheck2, FileText } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { documents } from "@/lib/mock-data";
import { formatDateDots } from "@/lib/utils";

interface DocumentsDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Read-only document vault list (mock). */
export function DocumentsDialog({ open, onClose }: DocumentsDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="כספת מסמכים"
      description="חוזים, אישורים ומסמכים חשובים במקום אחד"
    >
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 rounded-xl border border-border p-3"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy/5 text-navy">
              {doc.signed ? (
                <FileCheck2 className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-navy">{doc.name}</p>
              <p className="text-[0.7rem] text-text-muted">
                {formatDateDots(doc.createdAt)}
              </p>
            </div>
            {doc.signed ? (
              <StatusBadge tone="success">חתום</StatusBadge>
            ) : (
              <StatusBadge tone="warning">ממתין</StatusBadge>
            )}
            <button
              aria-label="הורדה"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-muted hover:bg-surface-muted"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
