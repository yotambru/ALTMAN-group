"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { WifiOff } from "lucide-react";

function initialOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return !navigator.onLine;
}

/** Compact offline notice for the native shell (and browsers). */
export function OfflineBanner() {
  const [offline, setOffline] = useState(initialOffline);

  useEffect(() => {
    let remove: { remove: () => void } | undefined;
    let cancelled = false;

    if (Capacitor.isNativePlatform()) {
      void Network.getStatus().then((status) => {
        if (!cancelled) setOffline(!status.connected);
      });
      void Network.addListener("networkStatusChange", (s) => {
        setOffline(!s.connected);
      }).then((handle) => {
        remove = handle;
      });
      return () => {
        cancelled = true;
        remove?.remove();
      };
    }

    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-navy px-3 py-2 text-xs font-semibold text-white"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      אין חיבור לרשת — חלק מהפעולות עלולות שלא לעבוד
    </div>
  );
}
