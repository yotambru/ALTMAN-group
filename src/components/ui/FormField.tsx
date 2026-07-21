"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  /** Leading icon (start side in RTL). */
  icon?: React.ReactNode;
  /** Trailing control, e.g. a show/hide password button. */
  trailing?: React.ReactNode;
  hint?: string;
  error?: string;
  className?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  textareaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  as?: "input" | "textarea";
  children?: React.ReactNode;
}

/** Labeled field wrapper with icon slots; supports input, textarea or custom. */
export function FormField({
  label,
  icon,
  trailing,
  hint,
  error,
  className,
  inputProps,
  textareaProps,
  as = "input",
  children,
}: FormFieldProps) {
  const id = useId();
  const base =
    "w-full rounded-xl border bg-surface px-3.5 py-3 text-sm text-text placeholder:text-text-muted/70 transition-colors focus:border-orange focus:outline-none";

  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 end-3.5 flex items-center text-text-muted">
            {icon}
          </span>
        )}
        {children ? (
          children
        ) : as === "textarea" ? (
          <textarea
            id={id}
            className={cn(base, !!icon && "pe-10", "min-h-24 resize-none")}
            {...textareaProps}
          />
        ) : (
          <input
            id={id}
            className={cn(base, !!icon && "pe-10", !!trailing && "ps-10")}
            {...inputProps}
          />
        )}
        {trailing && (
          <span className="absolute inset-y-0 start-2 flex items-center">
            {trailing}
          </span>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
