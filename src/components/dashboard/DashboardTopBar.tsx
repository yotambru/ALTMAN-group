"use client";

import { Bell, Menu, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

interface DashboardTopBarProps {
  greeting?: string;
  subtitle?: string;
  onMenu?: () => void;
  onBell?: () => void;
  onProfile?: () => void;
  notificationCount?: number;
  /**
   * `brand` — centered logo strip.
   * `dusk` — Model E: navy greeting header + bell.
   * `light` / `dark` — legacy greeting headers.
   */
  tone?: "dark" | "light" | "brand" | "dusk";
  className?: string;
}

/**
 * Dashboard header. `dusk` matches Model E immersive navy chrome.
 */
export function DashboardTopBar({
  greeting,
  subtitle,
  onMenu,
  onBell,
  onProfile,
  notificationCount = 0,
  tone = "brand",
  className,
}: DashboardTopBarProps) {
  if (tone === "brand") {
    return (
      <header className={cn("flex items-center justify-between gap-3 bg-surface px-4 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]", className)}>
        {onMenu ? (
          <button
            type="button"
            onClick={onMenu}
            aria-label="תפריט"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-navy hover:bg-surface-muted"
          >
            <Menu className="h-6 w-6" strokeWidth={1.8} />
          </button>
        ) : (
          <span className="h-10 w-10 shrink-0" />
        )}

        <Logo size="sm" withTagline={false} className="shrink-0 lg:hidden" />

        {onProfile ? (
          <button
            type="button"
            onClick={onProfile}
            aria-label="פרופיל"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-navy ring-1 ring-border hover:bg-surface-muted"
          >
            <User className="h-5 w-5" strokeWidth={1.8} />
          </button>
        ) : onBell ? (
          <button
            type="button"
            onClick={onBell}
            aria-label="התראות"
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-navy hover:bg-surface-muted"
          >
            <Bell className="h-5 w-5" strokeWidth={1.8} />
            {notificationCount > 0 && (
              <span className="absolute end-1 top-1 h-2 w-2 rounded-full bg-orange" />
            )}
          </button>
        ) : (
          <span className="h-10 w-10 shrink-0" />
        )}
      </header>
    );
  }

  if (tone === "dusk") {
    return (
      <header className={cn("flex items-start justify-between gap-3 px-4 pb-3 pt-5 text-white", className)}>
        <div className="flex min-w-0 items-start gap-2">
          {onMenu && (
            <button
              type="button"
              onClick={onMenu}
              aria-label="תפריט"
              className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-white hover:bg-white/10"
            >
              <Menu className="h-6 w-6" strokeWidth={1.8} />
            </button>
          )}
          <div className="min-w-0 pt-0.5 text-start">
            {greeting && (
              <h1 className="truncate text-[1.35rem] font-extrabold leading-tight tracking-tight">
                {greeting}
              </h1>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-sm text-white/65">{subtitle}</p>
            )}
          </div>
        </div>

        {onBell ? (
          <button
            type="button"
            onClick={onBell}
            aria-label="התראות"
            className="relative mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-white hover:bg-white/10"
          >
            <Bell className="h-5 w-5" strokeWidth={1.8} />
            {notificationCount > 0 && (
              <span className="absolute end-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-orange px-1 text-[0.625rem] font-bold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>
        ) : onProfile ? (
          <button
            type="button"
            onClick={onProfile}
            aria-label="פרופיל"
            className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-white ring-1 ring-white/25 hover:bg-white/10"
          >
            <User className="h-5 w-5" strokeWidth={1.8} />
          </button>
        ) : (
          <span className="h-10 w-10 shrink-0" />
        )}
      </header>
    );
  }

  const dark = tone === "dark";
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 px-5 pb-4 pt-[max(1.5rem,env(safe-area-inset-top))]",
        dark && "bg-navy text-white",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {onMenu && (
          <button
            type="button"
            onClick={onMenu}
            aria-label="תפריט"
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors",
              dark ? "text-white hover:bg-white/10" : "text-navy hover:bg-surface-muted",
            )}
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <div className="min-w-0">
          <h1
            className={cn(
              "truncate text-[1.4rem] font-extrabold leading-tight tracking-tight",
              dark ? "text-white" : "text-navy",
            )}
          >
            {greeting}
          </h1>
          {subtitle && (
            <p className={cn("truncate text-sm", dark ? "text-white/65" : "text-text-muted")}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {onBell && (
        <button
          type="button"
          onClick={onBell}
          aria-label="התראות"
          className={cn(
            "relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors",
            dark ? "text-white hover:bg-white/10" : "text-navy hover:bg-surface-muted",
          )}
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute end-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-orange px-1 text-[0.625rem] font-bold text-white">
              {notificationCount}
            </span>
          )}
        </button>
      )}
    </header>
  );
}
