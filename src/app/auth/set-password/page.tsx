"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import {
  loadSessionUser,
  MIN_PASSWORD_LENGTH,
  validateNewPassword,
} from "@/lib/auth";
import { routeByRole } from "@/lib/permissions";
import { getSupabase } from "@/lib/supabase/client";
import { storage } from "@/lib/storage";

/** After invite email link — choose a password and enter the app. */
export default function AuthSetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- load session after invite redirect */
    const supabase = getSupabase();
    if (!supabase) {
      setError("אין חיבור לשרת.");
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authError || !data.user) {
        setError("יש לפתוח את הקישור מהמייל מחדש.");
        return;
      }
      setEmail(data.user.email ?? "");
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateNewPassword(password, confirm);
    if (invalid) {
      setError(invalid);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setError("אין חיבור לשרת.");
      return;
    }
    setSubmitting(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      setError("שמירת הסיסמה נכשלה. נסו שוב או בקשו הזמנה חדשה.");
      return;
    }
    const profile = await loadSessionUser();
    if (!profile) {
      setSubmitting(false);
      setError("הסיסמה נשמרה, אך לא נמצא פרופיל. פנו למשרד.");
      return;
    }
    storage.setSession({
      role: profile.role,
      userId: profile.id,
      fullName: profile.fullName,
      landlordId: profile.landlordId,
      tenantId: profile.tenantId,
      professionalId: profile.professionalId,
      loginAt: new Date().toISOString(),
    });
    router.replace(routeByRole[profile.role]);
  };

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-surface">
      <header className="flex items-center justify-center px-4 py-5">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-navy">הפעלת חשבון</h1>
            <p className="mt-1 text-sm text-text-muted">
              המייל אומת. בחרו סיסמה לכניסות הבאות
              {email ? (
                <>
                  {" "}
                  · <span dir="ltr">{email}</span>
                </>
              ) : null}
            </p>
          </div>

          {!ready ? (
            <p className="text-sm text-text-muted">{error || "טוענים…"}</p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <FormField
                label="סיסמה חדשה"
                hint={`לפחות ${MIN_PASSWORD_LENGTH} תווים`}
                inputProps={{
                  type: showPassword ? "text" : "password",
                  value: password,
                  onChange: (e) => {
                    setPassword(e.target.value);
                    setError("");
                  },
                  autoComplete: "new-password",
                  required: true,
                  dir: "ltr",
                }}
              />
              <FormField
                label="אימות סיסמה"
                inputProps={{
                  type: showPassword ? "text" : "password",
                  value: confirm,
                  onChange: (e) => {
                    setConfirm(e.target.value);
                    setError("");
                  },
                  autoComplete: "new-password",
                  required: true,
                  dir: "ltr",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy/70"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}
              </button>
              {error && <p className="text-sm font-semibold text-danger">{error}</p>}
              <Button type="submit" fullWidth size="lg" disabled={submitting}>
                <Lock className="h-5 w-5" />
                {submitting ? "שומרים…" : "שמירה וכניסה"}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
