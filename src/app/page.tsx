"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { LoginModal } from "@/features/auth/LoginModal";
import { loadSessionUser } from "@/lib/auth";
import { routeByRole } from "@/lib/permissions";

export default function LoginPage() {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const profile = await loadSessionUser();
      if (cancelled || !profile) return;
      router.replace(routeByRole[profile.role]);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="app-shell relative flex min-h-[100dvh] flex-col overflow-hidden bg-surface lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
      {/* Photo hero */}
      <div className="relative min-h-0 flex-1 lg:order-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/login-photo.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/10"
          aria-hidden
        />
        <div className="absolute inset-x-0 top-0 flex justify-center pt-[max(2rem,calc(env(safe-area-inset-top)+0.75rem))] drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] lg:justify-start lg:px-10 lg:pt-10">
          <Logo tone="light" size="lg" withTagline={false} />
        </div>
      </div>

      {/* White dock */}
      <section className="relative z-10 -mt-8 rounded-t-[2rem] bg-surface px-7 pb-8 pt-9 shadow-[0_-12px_40px_-20px_rgba(20,40,90,0.18)] lg:order-1 lg:mt-0 lg:flex lg:w-[min(32rem,44%)] lg:shrink-0 lg:flex-col lg:justify-center lg:rounded-none lg:px-12 lg:shadow-none">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
          <h1 className="text-[1.85rem] font-extrabold leading-tight tracking-tight text-navy lg:text-[2.15rem]">
            ברוכים הבאים
          </h1>
          <p className="mt-2.5 max-w-[17.5rem] text-[0.95rem] leading-relaxed text-text-muted lg:max-w-none">
            הדרך הנכונה לבית החדש שלכם מתחילה כאן
          </p>

          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-orange text-base font-bold text-white shadow-[0_12px_28px_-10px_rgba(242,106,33,0.7)] transition-colors hover:bg-orange-dark"
          >
            התחברות
          </button>
        </div>
      </section>

      <LoginModal open={formOpen} onClose={() => setFormOpen(false)} />
    </main>
  );
}
