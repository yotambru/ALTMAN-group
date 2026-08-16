"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RoleSelector } from "@/features/auth/RoleSelector";
import {
  authenticateUser,
  beginFirstLogin,
  demoCredentials,
  hashPassword,
  validateNewPassword,
} from "@/lib/auth";
import { routeByRole } from "@/lib/permissions";
import { useData } from "@/lib/store";
import { storage } from "@/lib/storage";
import type { Role, User } from "@/types";
import { useRouter } from "next/navigation";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "regular" | "first" | "set-password";

function persistSession(account: User) {
  storage.setSession({
    role: account.role,
    userId: account.id,
    fullName: account.fullName,
    landlordId: account.landlordId,
    tenantId: account.tenantId,
    professionalId: account.professionalId,
    loginAt: new Date().toISOString(),
  });
}

/** Login + first-time password setup (email-only invite). */
export function LoginModal({ open, onClose }: LoginModalProps) {
  const router = useRouter();
  const { users, ready, setUserPassword } = useData();
  const [step, setStep] = useState<Step>("regular");
  const [role, setRole] = useState<Role>("manager");
  const [identifier, setIdentifier] = useState(demoCredentials.manager);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    const saved = storage.getRememberedIdentifier();
    if (saved) {
      setIdentifier(saved);
      setRemember(true);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetTransient = () => {
    setStep("regular");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setError("");
    setPendingUser(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetTransient, 200);
  };

  const handleRoleChange = (next: Role) => {
    setRole(next);
    setError("");
    if (!remember) setIdentifier(demoCredentials[next]);
  };

  const goFirst = () => {
    setStep("first");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setPendingUser(null);
    if (!remember) setIdentifier("");
  };

  const goRegular = () => {
    setStep("regular");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setPendingUser(null);
    if (!remember) setIdentifier(demoCredentials[role]);
  };

  const enter = (account: User) => {
    persistSession(account);
    router.push(routeByRole[account.role]);
  };

  const handleRegularSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    const result = await authenticateUser(users, role, identifier, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (remember) storage.setRememberedIdentifier(identifier.trim());
    else storage.clearRememberedIdentifier();
    enter(result.user);
  };

  const handleFirstSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    const result = beginFirstLogin(users, identifier);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPendingUser(result.user);
    setPassword("");
    setConfirmPassword("");
    setError("");
    setStep("set-password");
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    const invalid = validateNewPassword(password, confirmPassword);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    const hash = await hashPassword(password);
    setUserPassword(pendingUser.id, hash);
    setSubmitting(false);
    enter({ ...pendingUser, passwordHash: hash });
  };

  const title =
    step === "set-password"
      ? "קביעת סיסמה"
      : step === "first"
        ? "כניסה פעם ראשונה"
        : "כניסה למערכת";
  const description =
    step === "set-password"
      ? "בחרו סיסמה לחשבון. מכאן והלאה תיכנסו איתה"
      : step === "first"
        ? "הזינו רק את המייל שקיבלתם מהמשרד"
        : "בחרו את התפקיד והזדהו";

  return (
    <Modal open={open} onClose={handleClose} title={title} description={description}>
      {step === "regular" && (
        <form onSubmit={handleRegularSubmit} className="space-y-5">
          <RoleSelector value={role} onChange={handleRoleChange} />

          <IdentifierField
            value={identifier}
            onChange={(v) => {
              setIdentifier(v);
              setError("");
            }}
            placeholder="מייל או שם משתמש"
            label="מייל או שם משתמש"
          />

          <PasswordField
            value={password}
            show={showPassword}
            onToggle={() => setShowPassword((s) => !s)}
            onChange={(v) => {
              setPassword(v);
              setError("");
            }}
            placeholder="סיסמה"
            autoComplete="current-password"
          />

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

          {error && <ErrorText>{error}</ErrorText>}

          <Button type="submit" fullWidth size="lg" disabled={!ready || submitting}>
            כניסה
          </Button>

          <button
            type="button"
            onClick={goFirst}
            className="w-full text-center text-sm font-bold text-navy transition-opacity hover:opacity-70"
          >
            כניסה פעם ראשונה
          </button>
        </form>
      )}

      {step === "first" && (
        <form onSubmit={handleFirstSubmit} className="space-y-5">
          <IdentifierField
            value={identifier}
            onChange={(v) => {
              setIdentifier(v);
              setError("");
            }}
            placeholder="מייל"
            label="מייל"
            type="email"
          />

          {error && <ErrorText>{error}</ErrorText>}

          <Button type="submit" fullWidth size="lg" disabled={!ready}>
            המשך
          </Button>

          <button
            type="button"
            onClick={goRegular}
            className="w-full text-center text-sm font-bold text-navy transition-opacity hover:opacity-70"
          >
            חזרה לכניסה רגילה
          </button>
        </form>
      )}

      {step === "set-password" && pendingUser && (
        <form onSubmit={handleSetPassword} className="space-y-5">
          <p className="rounded-xl bg-surface-muted px-3.5 py-3 text-sm text-text" dir="ltr">
            {pendingUser.email}
          </p>

          <PasswordField
            value={password}
            show={showPassword}
            onToggle={() => setShowPassword((s) => !s)}
            onChange={(v) => {
              setPassword(v);
              setError("");
            }}
            placeholder="סיסמה חדשה"
            autoComplete="new-password"
          />
          <PasswordField
            value={confirmPassword}
            show={showPassword}
            onToggle={() => setShowPassword((s) => !s)}
            onChange={(v) => {
              setConfirmPassword(v);
              setError("");
            }}
            placeholder="אימות סיסמה"
            autoComplete="new-password"
            label="אימות סיסמה"
          />

          {error && <ErrorText>{error}</ErrorText>}

          <Button type="submit" fullWidth size="lg" disabled={submitting}>
            שמירת סיסמה וכניסה
          </Button>
        </form>
      )}
    </Modal>
  );
}

function IdentifierField({
  value,
  onChange,
  placeholder,
  label,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  type?: "text" | "email";
}) {
  return (
    <div className="relative">
      <Mail className="pointer-events-none absolute inset-y-0 end-3.5 my-auto h-5 w-5 text-text-muted" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="username"
        aria-label={label}
        dir="ltr"
        className="w-full rounded-xl border bg-surface px-3.5 py-3 pe-10 text-sm text-text focus:border-orange focus:outline-none"
      />
    </div>
  );
}

function PasswordField({
  value,
  show,
  onToggle,
  onChange,
  placeholder,
  autoComplete,
  label = "סיסמה",
}: {
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  label?: string;
}) {
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute inset-y-0 end-3.5 my-auto h-5 w-5 text-text-muted" />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "הסתר סיסמה" : "הצג סיסמה"}
        className="absolute inset-y-0 start-2 my-auto grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-surface-muted"
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-label={label}
        dir="ltr"
        className="w-full rounded-xl border bg-surface px-3.5 py-3 pe-10 ps-10 text-sm text-text focus:border-orange focus:outline-none"
      />
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-xs font-medium text-danger">{children}</p>
  );
}
