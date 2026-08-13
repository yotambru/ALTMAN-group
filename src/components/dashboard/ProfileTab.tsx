"use client";

import { useRef, useState } from "react";
import { Camera, LogOut, Trash2 } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
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
}

/** Shared profile screen for the unified bottom-nav "פרופיל" tab. */
export function ProfileTab({
  userId,
  fullName,
  role,
  detail,
  children,
  onLogout,
}: ProfileTabProps) {
  const { users, updateUser } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const avatarUrl = users.find((u) => u.id === userId)?.avatarUrl;

  const pickPhoto = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    setError("");
    try {
      const url = await uploadImageFile(file, `avatars/${userId}`, { maxEdge: 720 });
      if (!url) {
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

  return (
    <div className="space-y-4 px-4 pt-4 pb-8">
      <SectionHeader title="פרופיל" />
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
      <Button variant="outline" fullWidth onClick={onLogout}>
        <LogOut className="h-5 w-5" />
        התנתקות
      </Button>
    </div>
  );
}
