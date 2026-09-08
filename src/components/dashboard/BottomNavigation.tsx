"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BottomNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface BottomNavigationProps {
  items: BottomNavItem[];
  /** Currently active item id. */
  active: string;
  onSelect: (id: string) => void;
}

/**
 * Floating liquid-glass tab bar. Documents stay reachable from dashboard actions / menu.
 */
export function BottomNavigation({
  items,
  active,
  onSelect,
}: BottomNavigationProps) {
  return (
    <div className="lg:hidden">
      <div
        className="h-[calc(6.75rem+env(safe-area-inset-bottom))] shrink-0"
        aria-hidden
      />
      <nav
        aria-label="ניווט ראשי"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-nav)] mx-auto w-full max-w-[30rem] px-1.5 pb-0"
      >
        <div className="liquid-glass-bar pointer-events-auto flex items-stretch justify-around gap-1 px-2 pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] backdrop-blur-[48px] backdrop-saturate-150 backdrop-brightness-110">
          {items.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelect(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative z-10 flex flex-1 flex-col items-center gap-1 rounded-full py-2.5 text-[0.72rem] font-semibold transition-colors",
                  isActive ? "liquid-glass-chip text-orange backdrop-blur-md" : "text-navy/50 hover:text-navy/75",
                )}
              >
                <span className="relative">
                  <tab.icon className="h-7 w-7" strokeWidth={isActive ? 2.2 : 1.7} />
                  {tab.badge != null && tab.badge > 0 && (
                    <span className="absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-orange px-1 text-[0.625rem] font-bold text-white">
                      {tab.badge}
                    </span>
                  )}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
