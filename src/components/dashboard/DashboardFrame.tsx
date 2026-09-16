"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { BottomNavigation, type BottomNavItem } from "./BottomNavigation";
import { DesktopSidebar } from "./DesktopSidebar";

interface DashboardFrameProps {
  children: ReactNode;
  items: BottomNavItem[];
  active: string;
  onSelect: (id: string) => void;
  /** Reset the scrolling column when this key changes (tab switches). */
  scrollResetKey?: string | number;
}

/**
 * Role dashboard chrome: floating tab bar on mobile, sidebar + scrolling
 * main column on wide web viewports.
 */
export function DashboardFrame({
  children,
  items,
  active,
  onSelect,
  scrollResetKey,
}: DashboardFrameProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [scrollResetKey]);

  return (
    <main className="app-shell flex min-h-[100dvh] flex-col bg-surface-muted lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
      <DesktopSidebar items={items} active={active} onSelect={onSelect} />
      <div ref={scrollRef} className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-y-auto">
        {children}
      </div>
      <BottomNavigation items={items} active={active} onSelect={onSelect} />
    </main>
  );
}
