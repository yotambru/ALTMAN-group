"use client";

import type { ReactNode } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { cn } from "@/lib/utils";

interface PinnedScreenProps {
  header: ReactNode;
  title: string;
  onBack: () => void;
  children: ReactNode;
  /**
   * Scroll the body inside the screen. Chat turns this off and scrolls its
   * own message list, so the dashboard behind stays still.
   */
  scroll?: boolean;
}

/**
 * A dashboard panel that fills the space between the top bar and the bottom
 * navigation. Height comes from the frame, not from a fixed pixel size.
 */
export function PinnedScreen({ header, title, onBack, children, scroll = true }: PinnedScreenProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="dusk-header shrink-0">{header}</div>
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface px-4 pt-3">
        <SectionHeader title={title} onBack={onBack} className="mb-2 shrink-0" />
        <div
          className={cn(
            "min-h-0 flex-1",
            scroll ? "overflow-y-auto overscroll-y-contain pb-2" : "flex flex-col overflow-hidden",
          )}
        >
          {children}
        </div>
      </section>
    </div>
  );
}
