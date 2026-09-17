"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { useKeyboardOverlap } from "@/lib/keyboard-overlap";
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
  /** Stack above another open modal (password / confirm). */
  nested?: boolean;
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
  nested = false,
}: ModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const keyboardOverlap = useKeyboardOverlap(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (nested) e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, nested);
    const html = document.documentElement;
    const prevOverscroll = html.style.overscrollBehavior;
    html.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, nested);
      html.style.overscrollBehavior = prevOverscroll;
      document.body.style.overflow = "";
    };
  }, [open, onClose, nested]);

  useEffect(() => {
    if (!open) return;
    const root = sheetRef.current;
    if (!root) return;
    const onFocus = (e: FocusEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && target.tagName !== "SELECT") {
        return;
      }
      window.setTimeout(() => {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 80);
    };
    root.addEventListener("focusin", onFocus);
    return () => root.removeEventListener("focusin", onFocus);
  }, [open]);

  if (!open) return null;

  const centered = placement === "center";
  const keyboardOpen = keyboardOverlap > 0;

  return (
    <Portal>
    <div
      className={cn(
        "fixed inset-0 flex justify-center overscroll-none touch-pan-y",
        nested ? "z-[var(--z-overlay-nested)]" : "z-[var(--z-overlay)]",
        keyboardOpen ? "overflow-y-auto" : "overflow-hidden",
        centered || keyboardOpen
          ? "items-center p-4"
          : "items-end sm:items-center",
      )}
      style={keyboardOpen ? { paddingBottom: keyboardOverlap } : undefined}
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
        ref={sheetRef}
        className={cn(
          "animate-sheet relative z-10 flex w-full min-h-0 min-w-0 max-w-[min(30rem,100%)] flex-col overflow-x-hidden bg-surface p-5 shadow-lg lg:max-w-xl",
          "max-h-full",
          centered || keyboardOpen
            ? "rounded-2xl"
            : "rounded-t-2xl pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] sm:rounded-2xl sm:pb-5",
          className,
        )}
      >
        <div className="mb-4 flex min-w-0 shrink-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-navy">{title}</h3>
            {description && (
              <p className="mt-1 text-pretty text-sm text-text-muted">{description}</p>
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
        <div className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y">
          {children}
        </div>
        {footer && <div className="mt-5 shrink-0">{footer}</div>}
      </div>
    </div>
    </Portal>
  );
}
