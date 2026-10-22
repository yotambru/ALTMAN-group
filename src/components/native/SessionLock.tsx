"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { signOutSession } from "@/lib/auth";
import { releaseManagerDevice } from "@/lib/manager-devices";
import { storage } from "@/lib/storage";

const BACKGROUND_LOCK_MS = 15_000;
const IDLE_LOCK_MS = 15 * 60_000;

/** Leave the app for 15 seconds, or leave it open without use for 15 minutes, and the next screen is login. */
export function SessionLock() {
  useEffect(() => {
    let hiddenAt = 0;
    let idleTimer = 0;
    let removeApp: { remove: () => void } | undefined;

    const lock = () => {
      if (!storage.getSession()) return;
      storage.clearSession();
      void releaseManagerDevice().finally(() => {
        void signOutSession();
      });
      if (window.location.pathname !== "/") window.location.replace("/");
    };

    const armIdle = () => {
      window.clearTimeout(idleTimer);
      if (!storage.getSession()) return;
      idleTimer = window.setTimeout(lock, IDLE_LOCK_MS);
    };

    const hide = () => {
      if (!storage.getSession()) return;
      hiddenAt = Date.now();
    };

    const show = () => {
      if (!hiddenAt) return;
      const elapsed = Date.now() - hiddenAt;
      hiddenAt = 0;
      if (elapsed >= BACKGROUND_LOCK_MS) lock();
      else armIdle();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") hide();
      else show();
    };

    const onActivity = () => {
      if (document.visibilityState === "hidden") return;
      armIdle();
    };

    armIdle();
    document.addEventListener("pointerdown", onActivity);
    document.addEventListener("keydown", onActivity);

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
      window.clearTimeout(idleTimer);
      document.removeEventListener("pointerdown", onActivity);
      document.removeEventListener("keydown", onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
      removeApp?.remove();
    };
  }, []);

  return null;
}
