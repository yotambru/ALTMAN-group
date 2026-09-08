"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { changeOwnPassword, setPasswordAsManager, validateNewPassword } from "@/lib/auth";

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** When set, a manager is assigning a password to this user. */
  target?: { userId: string; name: string } | null;
}

/** Own-password change, or manager-assigned password for another account. */
export function ChangePasswordDialog({
  open,
  onClose,
  onSuccess,
  target,
}: ChangePasswordDialogProps) {
  const adminMode = Boolean(target?.userId);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setShow(false);
    setError("");
    setSubmitting(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateNewPassword(password, confirmPassword);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!adminMode && !currentPassword) {
      setError("יש להזין את הסיסמה הנוכחית.");
      return;
    }
    setSubmitting(true);
    const result = adminMode && target
      ? await setPasswordAsManager(target.userId, password)
      : await changeOwnPassword(currentPassword, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    handleClose();
    onSuccess?.();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={adminMode ? "הגדרת סיסמה" : "שינוי סיסמה"}
      description={
        adminMode
          ? `סיסמה חדשה עבור ${target?.name ?? "המשתמש"}`
          : "הזינו את הסיסמה הנוכחית ואת הסיסמה החדשה"
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {!adminMode && (
          <PasswordField
            value={currentPassword}
            show={show}
            onToggle={() => setShow((s) => !s)}
            onChange={(v) => {
              setCurrentPassword(v);
              setError("");
            }}
            placeholder="סיסמה נוכחית"
            autoComplete="current-password"
            label="סיסמה נוכחית"
          />
        )}
        <PasswordField
          value={password}
          show={show}
          onToggle={() => setShow((s) => !s)}
          onChange={(v) => {
            setPassword(v);
            setError("");
          }}
          placeholder="סיסמה חדשה"
          autoComplete="new-password"
          label="סיסמה חדשה"
        />
        <PasswordField
          value={confirmPassword}
          show={show}
          onToggle={() => setShow((s) => !s)}
          onChange={(v) => {
            setConfirmPassword(v);
            setError("");
          }}
          placeholder="אימות סיסמה"
          autoComplete="new-password"
          label="אימות סיסמה"
        />
        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" fullWidth disabled={submitting}>
          שמירת סיסמה
        </Button>
      </form>
    </Modal>
  );
}

function PasswordField({
  value,
  show,
  onToggle,
  onChange,
  placeholder,
  autoComplete,
  label,
}: {
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  label: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-navy">{label}</label>
      <div className="relative" dir="ltr">
        <Lock className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-5 w-5 text-text-muted" />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "הסתר סיסמה" : "הצג סיסמה"}
          className="absolute inset-y-0 end-2 my-auto grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-surface-muted"
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
          className="w-full rounded-xl border bg-surface py-3 ps-11 pe-11 text-sm text-text focus:border-orange focus:outline-none"
        />
      </div>
    </div>
  );
}
