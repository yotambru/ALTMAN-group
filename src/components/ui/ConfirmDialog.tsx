"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Portal } from "@/components/ui/Portal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/** Destructive-action confirmation, stacked above other sheets. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "מחיקה",
  cancelLabel = "ביטול",
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
    <div
      className="fixed inset-0 z-[var(--z-overlay-nested)] flex items-end justify-center sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
    >
      <button
        type="button"
        aria-label="סגירה"
        className="animate-overlay absolute inset-0 bg-navy-dark/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="animate-sheet relative z-10 mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] w-full max-w-[30rem] rounded-2xl bg-surface p-5 shadow-lg sm:mb-0">
        <h3 id="confirm-title" className="text-lg font-bold text-navy">
          {title}
        </h3>
        <p id="confirm-desc" className="mt-2 text-sm leading-relaxed text-text-muted">
          {description}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
