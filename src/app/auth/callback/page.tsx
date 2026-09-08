"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";

/**
 * Handles Supabase Auth invite / magic-link redirects.
 * Uses a one-off client with detectSessionInUrl so hash/query tokens are applied.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("מאמתים את החשבון…");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- auth bootstrap from URL / session */
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setMessage("חסר חיבור לשרת.");
      return;
    }

    const client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit",
      },
    });

    let cancelled = false;

    const finish = async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error && !cancelled) {
          setMessage("הקישור אינו תקין או שפג תוקפו. בקשו הזמנה חדשה מהמשרד.");
          return;
        }
      } else {
        await client.auth.getSession();
      }

      const { data, error } = await client.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) {
        setMessage("הקישור אינו תקין או שפג תוקפו. בקשו הזמנה חדשה מהמשרד.");
        return;
      }
      router.replace("/auth/set-password");
    };

    void finish();
    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router]);

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-surface">
      <header className="flex items-center justify-center px-4 py-5">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <p className="text-center text-sm font-semibold text-navy">{message}</p>
      </main>
    </div>
  );
}
