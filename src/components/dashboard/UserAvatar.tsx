"use client";

import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<AvatarSize, string> = {
  sm: "h-9 w-9 text-sm",
  md: "h-11 w-11 text-base",
  lg: "h-14 w-14 text-xl",
  xl: "h-16 w-16 text-2xl",
};

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: AvatarSize;
  className?: string;
  /** Softer gradient used on list/hero rows. */
  tone?: "solid" | "gradient";
}

/** Circular avatar: photo when set, otherwise the Hebrew initial. */
export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
  tone = "solid",
}: UserAvatarProps) {
  const initial = name.trim().charAt(0) || "?";
  const base =
    tone === "gradient"
      ? "bg-gradient-to-br from-navy to-navy-light shadow-[0_8px_18px_-10px_rgba(20,40,90,0.55)]"
      : "bg-navy";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URLs / remote URLs in prototype
      <img
        src={avatarUrl}
        alt={name}
        className={cn(
          "shrink-0 rounded-full object-cover",
          sizeClass[size],
          tone === "gradient" && "shadow-[0_8px_18px_-10px_rgba(20,40,90,0.55)]",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold text-white",
        sizeClass[size],
        base,
        className,
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}
