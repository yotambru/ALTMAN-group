import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FocusActionItem {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  /** Selected panel — orange border + orange icon/label. */
  active?: boolean;
  /** @deprecated Prefer `active`. Kept for call-site compatibility. */
  highlight?: boolean;
}

interface FocusActionsProps {
  items: FocusActionItem[];
  /** Optional section title (Model E: פעולות מהירות). */
  title?: string;
  className?: string;
}

/**
 * Quick-action tile row. Active tile gets orange outline (Model E).
 */
export function FocusActions({ items, title, className }: FocusActionsProps) {
  return (
    <section className={cn("space-y-2.5", className)}>
      {title && (
        <h2 className="text-start text-base font-bold text-navy">{title}</h2>
      )}
      <div
        className="grid gap-2.5"
        style={{
          gridTemplateColumns: `repeat(${items.length > 5 ? 3 : Math.min(items.length, 5)}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = Boolean(item.active ?? item.highlight);
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl bg-surface px-1 py-3 text-center shadow-sm transition-all lg:gap-2 lg:px-2 lg:py-4",
                isActive
                  ? "ring-2 ring-orange"
                  : "ring-1 ring-border hover:shadow",
              )}
            >
              <Icon
                className={cn("h-6 w-6", isActive ? "text-orange" : "text-navy")}
                strokeWidth={1.8}
              />
              <span
                className={cn(
                  "text-[0.65rem] font-bold leading-tight lg:text-xs",
                  isActive ? "text-orange" : "text-navy",
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
