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
  /** `glass` — floating blur pill. `dusk` — Model E solid navy bar. */
  tone?: "glass" | "dusk";
}

/**
 * Bottom tab bar. `dusk` is edge-to-edge navy for Model E.
 */
export function BottomNavigation({
  items,
  active,
  onSelect,
  tone = "glass",
}: BottomNavigationProps) {
  if (tone === "dusk") {
    return (
      <nav className="sticky bottom-0 z-30 mt-auto border-t border-white/10 bg-navy-dark pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-[30rem] items-stretch justify-around px-1 py-2">
          {items.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelect(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[0.66rem] font-semibold transition-colors",
                  isActive ? "text-orange" : "text-white/55 hover:text-white/80",
                )}
              >
                <span className="relative">
                  <tab.icon className="h-6 w-6" strokeWidth={isActive ? 2.2 : 1.7} />
                  {tab.badge != null && tab.badge > 0 && (
                    <span className="absolute -end-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-orange px-1 text-[0.625rem] font-bold text-white">
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
    );
  }

  return (
    <nav className="sticky bottom-0 z-30 mt-auto px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2">
      <div
        className={cn(
          "mx-auto flex max-w-[30rem] items-stretch justify-around gap-1 rounded-[1.35rem] px-2 py-2.5",
          "border border-navy/15 bg-white/55 shadow-[0_8px_32px_-12px_rgba(20,40,90,0.28)]",
          "backdrop-blur-xl backdrop-saturate-150",
          "supports-[backdrop-filter]:bg-white/40",
        )}
      >
        {items.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-1 text-[0.66rem] font-semibold transition-colors",
                isActive ? "text-orange" : "text-navy/50 hover:text-navy/75",
              )}
            >
              <span className="relative">
                <tab.icon className="h-6 w-6" strokeWidth={isActive ? 2.2 : 1.7} />
                {tab.badge != null && tab.badge > 0 && (
                  <span className="absolute -end-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-orange px-1 text-[0.625rem] font-bold text-white">
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
  );
}
