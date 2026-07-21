"use client";

import { Bell, Menu } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

interface BrandHeaderProps {
  tone?: "navy" | "light";
  onMenu?: () => void;
  onBell?: () => void;
  notificationCount?: number;
}

/**
 * Sticky top brand bar: hamburger menu, centered wordmark, optional bell.
 * `tone="navy"` for immersive dashboards, `tone="light"` for the landlord view.
 */
export function BrandHeader({
  tone = "navy",
  onMenu,
  onBell,
  notificationCount = 0,
}: BrandHeaderProps) {
  const isNavy = tone === "navy";
  const iconBtn = cn(
    "grid h-10 w-10 place-items-center rounded-full transition-colors",
    isNavy ? "text-white hover:bg-white/10" : "text-navy hover:bg-surface-muted",
  );

  return (
    <header
      className={cn(
        "relative z-20 flex items-center justify-between px-4 pt-4 pb-2",
        isNavy ? "text-white" : "bg-transparent text-navy",
      )}
    >
      {onBell ? (
        <button className={iconBtn} onClick={onBell} aria-label="התראות">
          <span className="relative">
            <Bell className="h-6 w-6" />
            {notificationCount > 0 && (
              <span className="absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-orange px-1 text-[0.625rem] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </span>
        </button>
      ) : (
        <span className="h-10 w-10" aria-hidden />
      )}

      <Logo tone={isNavy ? "light" : "dark"} size="md" />

      <button className={iconBtn} onClick={onMenu} aria-label="תפריט">
        <Menu className="h-6 w-6" />
      </button>
    </header>
  );
}
