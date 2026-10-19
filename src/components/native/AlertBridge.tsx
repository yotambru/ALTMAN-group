"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { storage } from "@/lib/storage";

const TOKEN_KEY = "altman-alert-token";

/** Keeps a device token so alerts can arrive after logout. */
export function AlertBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let stop = false;

    const showNew = async (token: string) => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const response = await fetch("/api/alerts/pull", { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const body = (await response.json()) as { notifications?: { id: string; title: string; body: string }[] };
      const seenKey = "altman-alert-seen";
      let seenIds: string[] = [];
      try {
        seenIds = JSON.parse(localStorage.getItem(seenKey) || "[]") as string[];
      } catch {
        seenIds = [];
      }
      const seen = new Set<string>(seenIds);
      for (const note of body.notifications ?? []) {
        if (!note.id || seen.has(note.id)) continue;
        seen.add(note.id);
        const popup = new Notification(note.title || "ALTMAN Group", { body: note.body || "", lang: "he", dir: "rtl" });
        popup.onclick = () => {
          window.location.href = `/?alert=${encodeURIComponent(note.id)}`;
        };
      }
      localStorage.setItem(seenKey, JSON.stringify([...seen].slice(-200)));
    };

    const sync = async () => {
      let token = localStorage.getItem(TOKEN_KEY);
      const session = storage.getSession();
      if (session?.userId) {
        const supabase = getSupabase();
        const access = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null;
        if (access && !stop) {
          if (!token) {
            token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
            localStorage.setItem(TOKEN_KEY, token);
          }
          await fetch("/api/alerts/register", {
            method: "POST",
            headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          if (!stop && "Notification" in window && Notification.permission === "default") {
            await Notification.requestPermission();
          }
          if ("serviceWorker" in navigator) {
            const registration = await navigator.serviceWorker.register("/sw.js");
            const ready = await navigator.serviceWorker.ready;
            ready.active?.postMessage({ type: "altman-watch", token });
            registration.active?.postMessage({ type: "altman-watch", token });
          }
        }
      }
      if (token) await showNew(token);
    };

    void sync();
    const timer = window.setInterval(() => void sync(), 60_000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
