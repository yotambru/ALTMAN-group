"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { LoginModal } from "@/features/auth/LoginModal";
import { currentUsers } from "@/lib/mock-data";
import { routeByRole } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import type { Role } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);

  const enterAs = (nextRole: Role) => {
    const account = currentUsers[nextRole];
    storage.setSession({
      role: nextRole,
      userId: account.id,
      fullName: account.fullName,
      landlordId: account.landlordId,
      tenantId: account.tenantId,
      professionalId: account.professionalId,
      loginAt: new Date().toISOString(),
    });
    router.push(routeByRole[nextRole]);
  };

  return (
    <main className="app-shell relative flex min-h-[100dvh] flex-col overflow-hidden bg-surface">
      {/* Photo hero */}
      <div className="relative min-h-0 flex-1">
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
        <div className="absolute inset-x-0 top-0 flex justify-center pt-8 drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
          <Logo tone="light" size="lg" withTagline={false} />
        </div>
      </div>

      {/* White dock */}
      <section className="relative z-10 -mt-8 rounded-t-[2rem] bg-surface px-7 pb-8 pt-9 shadow-[0_-12px_40px_-20px_rgba(20,40,90,0.18)]">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
          <h1 className="text-[1.85rem] font-extrabold leading-tight tracking-tight text-navy">
            ברוכים הבאים
          </h1>
          <p className="mt-2.5 max-w-[17.5rem] text-[0.95rem] leading-relaxed text-text-muted">
            הדרך הנכונה לבית החדש שלכם מתחילה כאן
          </p>

          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-orange text-base font-bold text-white shadow-[0_12px_28px_-10px_rgba(242,106,33,0.7)] transition-colors hover:bg-orange-dark"
          >
            התחברות
          </button>

          <button
            type="button"
            onClick={() => enterAs("manager")}
            className="mt-5 text-[0.95rem] font-bold text-navy transition-opacity hover:opacity-70"
          >
            המשך ללא התחברות
          </button>
        </div>
      </section>

      <LoginModal open={formOpen} onClose={() => setFormOpen(false)} />
    </main>
  );
}
