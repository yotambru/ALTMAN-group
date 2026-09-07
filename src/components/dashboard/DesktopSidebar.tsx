"use client";

import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import type { BottomNavItem } from "./BottomNavigation";

interface DesktopSidebarProps {
  items: BottomNavItem[];
  active: string;
  onSelect: (id: string) => void;
}

/**
 * Persistent start-side navigation for wide web layouts.
 * Hidden below the `lg` breakpoint — mobile keeps the floating tab bar.
 */
export function DesktopSidebar({ items, active, onSelect }: DesktopSidebarProps) {
  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col bg-navy-dark px-3 py-6 lg:flex">
      <div className="mb-8 px-2">
        <Logo tone="light" size="md" withTagline />
      </div>
      <nav aria-label="ניווט ראשי" className="flex flex-1 flex-col gap-1">
        {items.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-3 text-start text-sm font-semibold transition-colors",
                isActive
                  ? "bg-white/10 text-orange"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              {isActive && (
                <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-orange" aria-hidden />
              )}
              <span className="relative">
                <tab.icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.7} />
                {tab.badge != null && tab.badge > 0 && (
                  <span className="absolute -end-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-orange px-1 text-[0.625rem] font-bold text-white">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </span>
              {tab.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
