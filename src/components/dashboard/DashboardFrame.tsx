"use client";

import { BottomNavigation, type BottomNavItem } from "./BottomNavigation";
import { DesktopSidebar } from "./DesktopSidebar";

interface DashboardFrameProps {
  children: React.ReactNode;
  items: BottomNavItem[];
  active: string;
  onSelect: (id: string) => void;
}

/**
 * Role dashboard chrome: floating tab bar on mobile, sidebar + scrolling
 * main column on wide web viewports.
 */
export function DashboardFrame({ children, items, active, onSelect }: DashboardFrameProps) {
  return (
    <main className="app-shell flex min-h-[100dvh] flex-col bg-surface-muted lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
      <DesktopSidebar items={items} active={active} onSelect={onSelect} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-y-auto">{children}</div>
      <BottomNavigation items={items} active={active} onSelect={onSelect} />
    </main>
  );
}
