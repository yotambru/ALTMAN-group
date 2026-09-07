"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/** Accessible bottom-sheet style modal, centered within the mobile canvas. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
    <div
      className="fixed inset-0 z-[var(--z-overlay)] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        aria-label="סגירה"
        className="animate-overlay absolute inset-0 bg-navy-dark/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "animate-sheet relative z-10 w-full max-w-[30rem] rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] shadow-lg sm:rounded-2xl sm:pb-5 lg:max-w-xl",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-navy">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-text-muted">{description}</p>
            )}
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
        <div>{children}</div>
        {footer && <div className="mt-5">{footer}</div>}
      </div>
    </div>
    </Portal>
  );
}
