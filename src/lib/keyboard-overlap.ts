"use client";

import { useEffect, useState } from "react";

/** Pixels of the window covered by the on-screen keyboard (0 when closed). */
export function useKeyboardOverlap(active = true): number {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    if (!active) return;
    const update = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setOverlap(0);
        return;
      }
      const next = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setOverlap(Math.round(next));
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

  return active ? overlap : 0;
}
