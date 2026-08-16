"use client";

import { CloudOff } from "lucide-react";
import { useData } from "@/lib/store";

/** Shown when a local change did not persist to Supabase. */
export function PersistBanner() {
  const { persistError, retryPersist } = useData();
  if (!persistError) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-danger px-3 py-2 text-xs font-semibold text-white"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>השמירה לשרת נכשלה — השינוי עלול להיעלם אחרי רענון</span>
      <button
        type="button"
        onClick={retryPersist}
        className="ms-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[0.7rem] font-bold hover:bg-white/25"
      >
        נסו שוב
      </button>
    </div>
  );
}
