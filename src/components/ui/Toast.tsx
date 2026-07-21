"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

interface ToastProps {
  message: string | null;
  onDone: () => void;
  duration?: number;
}

/** Transient bottom toast, positioned within the mobile canvas. */
export function Toast({ message, onDone, duration = 2200 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [message, duration, onDone]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div className="animate-sheet pointer-events-auto flex max-w-[26rem] items-center gap-2 rounded-full bg-navy px-4 py-3 text-sm font-semibold text-white shadow-lg">
        <CheckCircle2 className="h-5 w-5 text-orange" />
        {message}
      </div>
    </div>
  );
}
