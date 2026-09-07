"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { Network } from "@capacitor/network";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * Boots Capacitor plugins when running inside the native shell.
 * No-ops on the regular web / Vercel deployment.
 */
export function CapacitorBootstrap() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.dataset.capacitor = "true";

    let removeBack: { remove: () => void } | undefined;
    let removeNetwork: { remove: () => void } | undefined;

    const boot = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === "android") {
          await StatusBar.setBackgroundColor({ color: "#14285a" });
        }
      } catch {
        /* StatusBar unsupported on some platforms */
      }

      try {
        await SplashScreen.hide();
      } catch {
        /* optional */
      }

      try {
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
      } catch {
        /* optional on iOS */
      }

      removeBack = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          void App.exitApp();
        }
      });

      removeNetwork = await Network.addListener("networkStatusChange", (status) => {
        document.documentElement.dataset.offline = status.connected ? "false" : "true";
      });

      const current = await Network.getStatus();
      document.documentElement.dataset.offline = current.connected ? "false" : "true";
    };

    void boot();

    return () => {
      removeBack?.remove();
      removeNetwork?.remove();
    };
  }, []);

  return null;
}
