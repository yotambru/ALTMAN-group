"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/**
 * Mount overlays on document.body so `position:fixed` is not trapped inside
 * dashboard stacking contexts (`.dash-sheet` z-index, liquid-glass filters).
 * That keeps sheets, confirms, and menus above the floating tab bar.
 */
export function Portal({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(emptySubscribe, clientSnapshot, serverSnapshot);
  if (!isClient) return null;
  return createPortal(children, document.body);
}
