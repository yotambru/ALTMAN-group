"use client";

import { useEffect, useState } from "react";

export interface VisualViewportBox {
  /** Pixels covered by the on-screen keyboard. */
  overlap: number;
  /** Visible viewport height, already above the keyboard. */
  height: number;
  /** How far the visual viewport has been pushed down. */
  offsetTop: number;
}

/** Live visual viewport, so a pinned screen can sit on the keyboard. */
export function useVisualViewport(active = true): VisualViewportBox {
  const [box, setBox] = useState<VisualViewportBox>({ overlap: 0, height: 0, offsetTop: 0 });

  useEffect(() => {
    if (!active) return;
    const update = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setBox({ overlap: 0, height: window.innerHeight, offsetTop: 0 });
        return;
      }
      setBox({
        overlap: Math.round(Math.max(0, window.innerHeight - vv.height - vv.offsetTop)),
        height: Math.round(vv.height),
        offsetTop: Math.round(vv.offsetTop),
      });
    };
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    const frame = window.requestAnimationFrame(update);
    return () => {
      window.cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [active]);

  return active ? box : { overlap: 0, height: 0, offsetTop: 0 };
}

/** Pixels of the window covered by the on-screen keyboard (0 when closed). */
export function useKeyboardOverlap(active = true): number {
  return useVisualViewport(active).overlap;
}
