"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { signOutSession } from "@/lib/auth";
import { storage } from "@/lib/storage";

const LOCK_MS = 15_000;

/** After 15 seconds in the background, the next return is the login screen. */
export function SessionLock() {
  useEffect(() => {
    let hiddenAt = 0;
    let removeApp: { remove: () => void } | undefined;

    const lock = () => {
      if (!storage.getSession()) return;
      storage.clearSession();
      void signOutSession();
      if (window.location.pathname !== "/") window.location.replace("/");
    };

    const hide = () => {
      if (!storage.getSession()) return;
      hiddenAt = Date.now();
    };

    const show = () => {
      if (!hiddenAt) return;
      const elapsed = Date.now() - hiddenAt;
      hiddenAt = 0;
      if (elapsed >= LOCK_MS) lock();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") hide();
      else show();
    };

    if (Capacitor.isNativePlatform()) {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) show();
        else hide();
      }).then((handle) => {
        removeApp = handle;
      });
    } else {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      removeApp?.remove();
    };
  }, []);

  return null;
}
