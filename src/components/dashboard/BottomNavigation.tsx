"use client";

import { Bell, Home, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type BottomTab = "dashboard" | "notifications" | "profile";

interface BottomNavigationProps {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
  notificationCount?: number;
}

const tabs: { id: BottomTab; label: string; icon: typeof Home }[] = [
  { id: "profile", label: "פרופיל", icon: User },
  { id: "notifications", label: "הודעות", icon: Bell },
  { id: "dashboard", label: "דשבורד", icon: Home },
];

/** Fixed bottom tab bar for the tenant experience. */
export function BottomNavigation({
  active,
  onChange,
  notificationCount = 0,
}: BottomNavigationProps) {
  return (
    <nav className="sticky bottom-0 z-30 mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[30rem] items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-xs font-semibold transition-colors",
                isActive ? "text-orange" : "text-text-muted",
              )}
            >
              <span className="relative">
                <tab.icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 2} />
                {tab.id === "notifications" && notificationCount > 0 && (
                  <span className="absolute -end-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-orange px-1 text-[0.625rem] font-bold text-white">
                    {notificationCount}
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
