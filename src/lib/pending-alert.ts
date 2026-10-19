"use client";

import { useEffect, useRef } from "react";
import type { AppNotification } from "@/types";

/** After a logged-out alert tap, open that item once the session is back. */
export function usePendingAlert(
  ready: boolean,
  notifications: AppNotification[],
  open: (notification: AppNotification) => void,
) {
  const opened = useRef(false);
  useEffect(() => {
    if (!ready || opened.current) return;
    const id = sessionStorage.getItem("altman-pending-alert");
    if (!id) return;
    const note = notifications.find((item) => item.id === id);
    if (!note) return;
    opened.current = true;
    sessionStorage.removeItem("altman-pending-alert");
    open(note);
  }, [ready, notifications, open]);
}
