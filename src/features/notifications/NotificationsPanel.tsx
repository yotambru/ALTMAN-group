"use client";

import {
  AlertTriangle,
  Banknote,
  Bell,
  CheckCheck,
  Droplets,
  FileSignature,
  MessageSquareText,
  ShieldAlert,
  Wallet,
  Wrench,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { isNotificationForAudience } from "@/lib/notifications";
import { useData } from "@/lib/store";
import { formatDateDots } from "@/lib/utils";
import type { AppNotification, NotificationKind, Role } from "@/types";

const kindIcon: Record<NotificationKind, typeof Bell> = {
  info: Bell,
  payment: Wallet,
  maintenance: Wrench,
  signature: FileSignature,
  utility: Droplets,
  insurance: ShieldAlert,
  reminder: Bell,
  critical: AlertTriangle,
  chat: MessageSquareText,
  withdrawal: Banknote,
};

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  forUserId?: string;
  forRole?: Role;
  /** Called when a notification is tapped, to open the relevant screen/dialog. */
  onOpen?: (notification: AppNotification) => void;
}

/** Notification center scoped to the current user / role. */
export function NotificationsPanel({ open, onClose, forUserId, forRole, onOpen }: NotificationsPanelProps) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();

  const mine = notifications.filter(
    (n) => !n.read && isNotificationForAudience(n, forUserId, forRole),
  );

  return (
    <Modal open={open} onClose={onClose} title="התראות" description={mine.length ? `${mine.length} חדשות` : "אין חדשות"}>
      {mine.length > 0 && (
        <button
          onClick={() => markAllNotificationsRead(forUserId, forRole)}
          className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-orange"
        >
          <CheckCheck className="h-4 w-4" />
          נקה הכל
        </button>
      )}
      <div className="no-scrollbar max-h-[62vh] space-y-2 overflow-y-auto">
        {mine.length === 0 && <p className="py-6 text-center text-sm text-text-muted">אין התראות.</p>}
        {mine.map((n) => {
          const Icon = kindIcon[n.kind];
          return (
            <button
              key={n.id}
              onClick={() => {
                markNotificationRead(n.id);
                onOpen?.(n);
              }}
              className="flex w-full items-start gap-3 rounded-xl border border-border p-3 text-start transition-colors hover:bg-surface-muted"
            >
              <span
                className={
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full " +
                  (n.kind === "critical" ? "bg-[#fdecea] text-danger" : "bg-orange-soft text-orange")
                }
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-navy">{n.title}</p>
                <p className="text-sm text-text-muted">{n.body}</p>
                <p className="mt-1 text-[0.7rem] text-text-muted">{formatDateDots(n.createdAt)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
