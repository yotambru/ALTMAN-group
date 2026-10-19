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
  /** Unread count drawn on the tile. Hidden when zero. */
  badge?: number;
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
          const badge = item.badge && item.badge > 0 ? item.badge : 0;
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              aria-current={isActive ? "page" : undefined}
              aria-label={
                badge > 1
                  ? `${item.label}, ${badge} הודעות שלא נקראו`
                  : badge === 1
                    ? `${item.label}, הודעה אחת שלא נקראה`
                    : undefined
              }
              className={cn(
                "liquid-glass-card flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center backdrop-blur-[22px] backdrop-saturate-150 transition-all lg:gap-2 lg:px-2 lg:py-4",
                isActive
                  ? "ring-2 ring-orange"
                  : "hover:shadow-lg",
              )}
            >
              <span className="relative">
                <Icon
                  className={cn("h-6 w-6", isActive ? "text-orange" : "text-navy")}
                  strokeWidth={1.8}
                />
                {badge > 0 && (
                  <span className="absolute -end-2.5 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-orange px-1 text-[0.625rem] font-bold text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
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
