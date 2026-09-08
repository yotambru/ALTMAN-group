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
  /**
   * `sheet` (default): bottom sheet on small screens, centered from `sm` up.
   * `center`: always centered — better for login when the mobile keyboard opens.
   */
  placement?: "sheet" | "center";
}

/** Accessible modal: bottom-sheet by default, or centered when requested. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  placement = "sheet",
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

  const centered = placement === "center";

  return (
    <Portal>
    <div
      className={cn(
        "fixed inset-0 z-[var(--z-overlay)] flex justify-center",
        centered
          ? "items-center p-4"
          : "items-end sm:items-center",
      )}
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
          "animate-sheet relative z-10 w-full max-w-[30rem] bg-surface p-5 shadow-lg lg:max-w-xl",
          centered
            ? "max-h-[min(90dvh,calc(100dvh-2rem))] overflow-y-auto rounded-2xl"
            : "rounded-t-2xl pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] sm:rounded-2xl sm:pb-5",
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
