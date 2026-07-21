"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { Cityscape } from "@/components/brand/Cityscape";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { RoleSelector } from "@/features/auth/RoleSelector";
import { currentUsers } from "@/lib/mock-data";
import { storage } from "@/lib/storage";
import type { Role } from "@/types";

const routeByRole: Record<Role, string> = {
  manager: "/manager",
  landlord: "/landlord",
  tenant: "/tenant",
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("manager");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Restore the remembered identifier after mount (client-only storage).
    const saved = storage.getRememberedIdentifier();
    if (saved) {
      setIdentifier(saved);
      setRemember(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (identifier.trim().length < 3 || password.trim().length < 4) {
      setError("יש להזין אימייל/טלפון וסיסמה תקינים (לפחות 4 תווים).");
      return;
    }
    if (remember) storage.setRememberedIdentifier(identifier.trim());
    else storage.clearRememberedIdentifier();

    storage.setSession({
      role,
      fullName: currentUsers[role].fullName,
      loginAt: new Date().toISOString(),
    });
    router.push(routeByRole[role]);
  };

  return (
    <main className="app-shell flex min-h-[100dvh] flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center px-6 pt-12 pb-10 text-center text-white">
        <Cityscape />
        <div className="relative">
          <Logo tone="light" size="lg" />
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight">
            ברוכים הבאים
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-white/80">
            מערכת ניהול נכסים ושכירויות של ALTMAN Group
          </p>
        </div>
      </section>

      {/* Login card */}
      <section className="relative -mt-6 flex-1 rounded-t-3xl bg-surface px-5 pb-8 pt-6 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-navy">הזדהות</h2>
            <p className="mt-1 text-sm text-text-muted">בחרו את התפקיד שלכם</p>
          </div>

          <RoleSelector value={role} onChange={setRole} />

          <div className="flex items-center gap-3 text-text-muted">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold">או</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div>
            <div className="relative">
              <Mail className="pointer-events-none absolute inset-y-0 end-3.5 my-auto h-5 w-5 text-text-muted" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError("");
                }}
                placeholder="אימייל או מספר טלפון"
                autoComplete="username"
                aria-label="אימייל או מספר טלפון"
                className="w-full rounded-xl border bg-surface px-3.5 py-3 pe-10 text-sm focus:border-orange focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className="pointer-events-none absolute inset-y-0 end-3.5 my-auto h-5 w-5 text-text-muted" />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                className="absolute inset-y-0 start-2 my-auto grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-surface-muted"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
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
                className="w-full rounded-xl border bg-surface px-3.5 py-3 pe-10 ps-10 text-sm focus:border-orange focus:outline-none"
              />
            </div>
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

          {error && (
            <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth size="lg">
            כניסה
          </Button>

          <div className="text-center">
            <button
              type="button"
              className="text-sm font-semibold text-navy-light hover:underline"
            >
              שכחת סיסמה?
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
            <ShieldCheck className="h-4 w-4 text-navy" />
            הנתונים שלך מאובטחים
          </div>
        </form>
      </section>
    </main>
  );
}
