"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, KeyRound, LogOut, Trash2, UserX } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { ChangePasswordDialog } from "@/features/auth/ChangePasswordDialog";
import { roleLabels } from "@/lib/permissions";
import { useData } from "@/lib/store";
import { uploadImageFile } from "@/lib/supabase/files";
import type { Role } from "@/types";

interface ProfileTabProps {
  userId: string;
  fullName: string;
  role: Role;
  /** Optional detail line under the role (e.g. address, trade). */
  detail?: string;
  /** Optional extra content between the card and logout. */
  children?: React.ReactNode;
  onLogout: () => void;
  onBack?: () => void;
}

/** Shared profile screen for the unified bottom-nav "פרופיל" tab. */
export function ProfileTab({
  userId,
  fullName,
  role,
  detail,
  children,
  onLogout,
  onBack,
}: ProfileTabProps) {
  const { users, updateUser, deleteOwnAccount } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const avatarUrl = users.find((u) => u.id === userId)?.avatarUrl;

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    const mime = file.type.toLowerCase();
    const looksLikeImage =
      mime.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!looksLikeImage) return;
    setBusy(true);
    setError("");
    try {
      const previous = avatarUrl;
      const preview = URL.createObjectURL(file);
      updateUser(userId, { avatarUrl: preview });
      const url = await uploadImageFile(file, `avatars/${userId}-${Date.now()}`, { maxEdge: 720 });
      URL.revokeObjectURL(preview);
      if (!url) {
        updateUser(userId, { avatarUrl: previous });
        setError("לא הצלחנו לשמור את התמונה. בדקו את החיבור ונסו שוב.");
        return;
      }
      updateUser(userId, { avatarUrl: url });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = () => {
    setError("");
    updateUser(userId, { avatarUrl: undefined });
  };

  const handleDeleteAccount = () => {
    setConfirmDelete(false);
    deleteOwnAccount(userId);
    onLogout();
  };

  return (
    <div className="space-y-4 px-4 pt-4 pb-8">
      <SectionHeader title="פרופיל" onBack={onBack} />
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius)] bg-surface p-6 text-center ring-1 ring-border">
        <div className="relative">
          <UserAvatar name={fullName} avatarUrl={avatarUrl} size="xl" />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            aria-label="העלאת תמונת פרופיל"
            className="absolute -bottom-1 -start-1 grid h-9 w-9 place-items-center rounded-full bg-orange text-white shadow-md ring-2 ring-surface transition-colors hover:bg-orange-dark disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void pickPhoto(e.target.files?.[0])}
          />
        </div>
        <p className="mt-2 text-lg font-bold text-navy">{fullName}</p>
        <p className="text-sm text-text-muted">{roleLabels[role]}</p>
        {detail && <p className="mt-1 text-sm text-text">{detail}</p>}
        <div className="mt-3 flex w-full flex-col gap-2">
          <Button
            variant="outline"
            fullWidth
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="h-5 w-5" />
            {avatarUrl ? "החלפת תמונת פרופיל" : "העלאת תמונת פרופיל"}
          </Button>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          {avatarUrl && (
            <Button variant="ghost" fullWidth disabled={busy} onClick={removePhoto}>
              <Trash2 className="h-4 w-4" />
              הסרת תמונה
            </Button>
          )}
        </div>
      </div>
      {children}
      <Button variant="outline" fullWidth onClick={() => setPasswordOpen(true)} disabled={busy}>
        <KeyRound className="h-5 w-5" />
        שינוי סיסמה
      </Button>
      <Button variant="outline" fullWidth onClick={onLogout} disabled={busy}>
        <LogOut className="h-5 w-5" />
        התנתקות
      </Button>
      <div className="rounded-[var(--radius)] bg-surface p-4 ring-1 ring-border">
        <p className="text-sm font-bold text-navy">מחיקת חשבון</p>
        <p className="mt-1 text-sm leading-relaxed text-text-muted">
          מחיקת החשבון מסירה לצמיתות את פרטי הכניסה ואת הנתונים האישיים מהשרת.
        </p>
        <Button
          variant="danger"
          fullWidth
          className="mt-3"
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
        >
          <UserX className="h-5 w-5" />
          מחיקת חשבון
        </Button>
      </div>
      <p className="text-center text-sm text-text-muted">
        <Link href="/privacy" className="font-semibold text-navy underline-offset-2 hover:underline">
          מדיניות פרטיות
        </Link>
      </p>
      <ChangePasswordDialog
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onSuccess={() => setToast("הסיסמה עודכנה")}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteAccount}
        title="מחיקת החשבון"
        description="החשבון והנתונים האישיים יימחקו לצמיתות ולא ניתן לשחזר אותם. לאחר האישור תנותקו מהמערכת."
        confirmLabel="מחיקה סופית"
      />
    </div>
  );
}
