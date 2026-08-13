"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RoleSelector } from "@/features/auth/RoleSelector";
import { authenticateDemo, demoCredentials } from "@/lib/auth";
import { currentUsers } from "@/lib/mock-data";
import { routeByRole } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import type { Role } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("manager");
  const [identifier, setIdentifier] = useState(demoCredentials.manager);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = storage.getRememberedIdentifier();
    if (saved) {
      setIdentifier(saved);
      setRemember(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleRoleChange = (next: Role) => {
    setRole(next);
    setError("");
    if (!remember) setIdentifier(demoCredentials[next]);
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = authenticateDemo(role, identifier, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (remember) storage.setRememberedIdentifier(identifier.trim());
    else storage.clearRememberedIdentifier();

    const account = result.user;
    storage.setSession({
      role,
      userId: account.id,
      fullName: account.fullName,
      landlordId: account.landlordId,
      tenantId: account.tenantId,
      professionalId: account.professionalId,
      loginAt: new Date().toISOString(),
    });
    router.push(routeByRole[role]);
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

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="כניסה למערכת"
        description="בחרו את התפקיד והזדהו"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <RoleSelector value={role} onChange={handleRoleChange} />

          <div className="relative">
            <Mail className="pointer-events-none absolute inset-y-0 end-3.5 my-auto h-5 w-5 text-text-muted" />
            <input
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError("");
              }}
              placeholder="שם משתמש"
              autoComplete="username"
              aria-label="שם משתמש"
              dir="ltr"
              className="w-full rounded-xl border bg-surface px-3.5 py-3 pe-10 text-sm text-text focus:border-orange focus:outline-none"
            />
          </div>

          <div className="relative">
            <Lock className="pointer-events-none absolute inset-y-0 end-3.5 my-auto h-5 w-5 text-text-muted" />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
              className="absolute inset-y-0 start-2 my-auto grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-surface-muted"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="סיסמה"
              autoComplete="current-password"
              aria-label="סיסמה"
              dir="ltr"
              className="w-full rounded-xl border bg-surface px-3.5 py-3 pe-10 ps-10 text-sm text-text focus:border-orange focus:outline-none"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-[color:var(--orange)]"
            />
            זכור אותי
          </label>

          <p className="text-center text-[0.7rem] leading-relaxed text-text-muted" dir="ltr">
            demo: {demoCredentials[role]} / 1234
          </p>

          {error && (
            <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth size="lg">
            כניסה
          </Button>
        </form>
      </Modal>
    </main>
  );
}
