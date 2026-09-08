"use client";

import { Bell, ChevronLeft } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { isNotificationForAudience } from "@/lib/notifications";
import { useData } from "@/lib/store";
import type { AppNotification, Role } from "@/types";

interface NotificationsTabProps {
  forUserId: string;
  forRole: Role;
  onOpen?: (notification: AppNotification) => void;
  onBack?: () => void;
}

/** Inline notifications list for the unified bottom-nav "הודעות" tab. */
export function NotificationsTab({ forUserId, forRole, onOpen, onBack }: NotificationsTabProps) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();

  const mine = notifications.filter(
    (n) => !n.read && isNotificationForAudience(n, forUserId, forRole),
  );

  return (
    <div className="space-y-3 px-4 pt-4 pb-8">
      <SectionHeader
        title="הודעות"
        onBack={onBack}
        action={
          mine.length > 0 ? (
            <button
              type="button"
              onClick={() => markAllNotificationsRead(forUserId, forRole)}
              className="text-sm font-semibold text-orange"
            >
              נקה הכל
            </button>
          ) : undefined
        }
      />
      {mine.length === 0 && (
        <p className="py-6 text-center text-sm text-text-muted">אין הודעות.</p>
      )}
      {mine.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => {
            markNotificationRead(n.id);
            onOpen?.(n);
          }}
          className="flex w-full items-start gap-3 rounded-[var(--radius)] bg-surface p-4 text-start ring-1 ring-border transition-shadow hover:shadow-sm"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-soft text-orange">
            <Bell className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-navy">{n.title}</p>
            <p className="text-sm text-text-muted">{n.body}</p>
          </div>
          <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-text-muted" />
        </button>
      ))}
    </div>
  );
}
