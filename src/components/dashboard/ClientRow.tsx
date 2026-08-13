"use client";

import { Building2, ChevronLeft, Phone, Search } from "lucide-react";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { cn } from "@/lib/utils";
import type { Landlord } from "@/types";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder = "חיפוש…",
  className,
}: SearchFieldProps) {
  return (
    <label className={cn("relative block", className)}>
      <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border/80 bg-surface-muted/60 py-3 pe-3.5 ps-11 text-sm text-navy shadow-sm placeholder:text-text-muted focus:border-orange focus:bg-surface focus:outline-none"
      />
    </label>
  );
}

interface ClientRowProps {
  landlord: Landlord;
  propertyCount: number;
  subtitle?: string;
  avatarUrl?: string;
  onClick: () => void;
}

/** Client (landlord) row for the manager home list. */
export function ClientRow({ landlord, propertyCount, subtitle, avatarUrl, onClick }: ClientRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl px-2.5 py-3 text-start transition-all hover:bg-surface-muted/90 active:scale-[0.995]"
    >
      <UserAvatar name={landlord.fullName} avatarUrl={avatarUrl} size="md" tone="gradient" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.98rem] font-extrabold tracking-tight text-navy">
          {landlord.fullName}
        </p>
        <p className="mt-0.5 truncate text-[0.78rem] text-text-muted">
          {subtitle ?? `${propertyCount} נכסים`}
        </p>
        {landlord.phone && (
          <p className="mt-0.5 flex items-center gap-1 text-[0.7rem] text-text-muted" dir="ltr">
            <Phone className="h-3 w-3" />
            {landlord.phone}
          </p>
        )}
      </div>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-soft px-2 py-1 text-[0.7rem] font-bold text-orange">
          <Building2 className="h-3.5 w-3.5" />
          {propertyCount}
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-muted text-navy/35 transition-colors group-hover:bg-orange-soft group-hover:text-orange">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </span>
      </span>
    </button>
  );
}
