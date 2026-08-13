"use client";

import { cn } from "@/lib/utils";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_ORDER,
} from "@/lib/portfolio";
import type { PropertyStatus } from "@/types";

interface PropertyStatusFilterProps {
  value: PropertyStatus | "all";
  onChange: (next: PropertyStatus | "all") => void;
  /** Optional counts per status for chip badges. */
  counts?: Partial<Record<PropertyStatus | "all", number>>;
  className?: string;
}

/** Horizontal chip filter — selected is bold orange; idle chips stay quiet. */
export function PropertyStatusFilter({
  value,
  onChange,
  counts,
  className,
}: PropertyStatusFilterProps) {
  const chips: { id: PropertyStatus | "all"; label: string }[] = [
    { id: "all", label: "הכל" },
    ...PROPERTY_STATUS_ORDER.map((id) => ({
      id,
      label: PROPERTY_STATUS_LABELS[id],
    })),
  ];

  return (
    <div
      className={cn(
        "no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5",
        className,
      )}
      role="tablist"
      aria-label="סינון לפי סטטוס נכס"
    >
      {chips.map((chip) => {
        const active = value === chip.id;
        const count = counts?.[chip.id];
        const show = chip.id === "all" || typeof count !== "number" || count > 0;
        if (!show && !active) return null;
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(chip.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all",
              active
                ? "bg-orange text-white shadow-[0_8px_18px_-10px_rgba(242,106,33,0.85)]"
                : "bg-surface-muted text-text-muted hover:bg-navy/8 hover:text-navy",
            )}
          >
            <span>{chip.label}</span>
            {typeof count === "number" ? (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[0.65rem] font-extrabold tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-white text-text-muted",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
