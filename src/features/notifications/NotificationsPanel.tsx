"use client";

import {
  Bell,
  CreditCard,
  FileSignature,
  Info,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { notifications as seed } from "@/lib/mock-data";
import { formatDateDots } from "@/lib/utils";
import type { NotificationKind } from "@/types";

const kindIcon: Record<NotificationKind, LucideIcon> = {
  info: Info,
  payment: CreditCard,
  maintenance: Wrench,
  signature: FileSignature,
};

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  return (
    <Modal open={open} onClose={onClose} title="התראות" description="עדכונים אחרונים בחשבון שלך">
      <div className="space-y-2">
        {seed.map((n) => {
          const Icon = kindIcon[n.kind];
          return (
            <div
              key={n.id}
              className="flex items-start gap-3 rounded-xl border border-border p-3"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-soft text-orange">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-navy">{n.title}</p>
                  {!n.read && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-orange" />
                  )}
                </div>
                <p className="text-sm text-text-muted">{n.body}</p>
                <p className="mt-1 text-[0.7rem] text-text-muted">
                  {formatDateDots(n.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-text-muted">
        <Bell className="h-4 w-4" />
        זה הכל בינתיים
      </div>
    </Modal>
  );
}
