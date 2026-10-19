"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useVisualViewport } from "@/lib/keyboard-overlap";
import { BottomNavigation, type BottomNavItem } from "./BottomNavigation";
import { DesktopSidebar } from "./DesktopSidebar";
import { cn } from "@/lib/utils";

interface DashboardFrameProps {
  children: ReactNode;
  items: BottomNavItem[];
  active: string;
  onSelect: (id: string) => void;
  /** Reset the scrolling column when this key changes (tab switches). */
  scrollResetKey?: string | number;
  /** Lock the page and give the child the height between the header and the tab bar. */
  pinned?: boolean;
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
  pinned = false,
}: DashboardFrameProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewport = useVisualViewport(pinned);
  const keyboardOpen = pinned && viewport.overlap > 0;

  useEffect(() => {
    const reset = () => {
      scrollRef.current?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0 });
    };
    reset();
    const id = window.requestAnimationFrame(reset);
    return () => window.cancelAnimationFrame(id);
  }, [scrollResetKey]);

  useEffect(() => {
    if (!pinned) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0 });
    return () => {
      document.body.style.overflow = previous;
    };
  }, [pinned]);

  return (
    <main
      className={cn(
        "app-shell flex min-h-0 flex-col bg-surface-muted lg:h-[100dvh] lg:flex-row lg:overflow-hidden",
        pinned ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh]",
      )}
      style={
        pinned && viewport.height > 0
          ? {
              height: viewport.height,
              transform: keyboardOpen && viewport.offsetTop > 0 ? `translateY(${viewport.offsetTop}px)` : undefined,
            }
          : undefined
      }
    >
      <DesktopSidebar items={items} active={active} onSelect={onSelect} />
      <div
        ref={scrollRef}
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          pinned ? "overflow-hidden" : "lg:overflow-y-auto",
        )}
      >
        {children}
      </div>
      <BottomNavigation items={items} active={active} onSelect={onSelect} inset={!keyboardOpen} />
    </main>
  );
}
