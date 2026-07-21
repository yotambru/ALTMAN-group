"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  FileSignature,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
  Wrench,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { storage } from "@/lib/storage";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  role: Role;
  userName: string;
}

const roleLabels: Record<Role, string> = {
  manager: "מנהל",
  landlord: "משכיר",
  tenant: "שוכר",
};

export function MobileMenu({ open, onClose, role, userName }: MobileMenuProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const items = [
    { icon: LayoutDashboard, label: "דשבורד" },
    { icon: Building2, label: "הנכסים שלי" },
    { icon: FileSignature, label: "מסמכים וחתימות" },
    { icon: Wrench, label: "תקלות וקריאות שירות" },
    { icon: MessageSquareText, label: "צ׳אט" },
    { icon: Bell, label: "התראות" },
    { icon: Settings, label: "הגדרות" },
  ];

  const handleLogout = () => {
    storage.clearSession();
    router.push("/");
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="תפריט">
      <button
        aria-label="סגירה"
        className="animate-overlay absolute inset-0 bg-navy-dark/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="animate-menu absolute inset-y-0 end-0 flex w-72 max-w-[80%] flex-col bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-border p-4">
          <Logo tone="dark" size="sm" withTagline={false} />
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="grid h-9 w-9 place-items-center rounded-full text-text-muted hover:bg-surface-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-border p-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-navy text-base font-bold text-white">
            {userName.charAt(0)}
          </span>
          <div>
            <p className="font-bold text-navy">{userName}</p>
            <p className="text-xs text-text-muted">{roleLabels[role]}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-sm font-semibold text-text transition-colors hover:bg-surface-muted"
            >
              <item.icon className="h-5 w-5 text-navy" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-sm font-bold text-danger transition-colors hover:bg-[#fdecea]",
            )}
          >
            <LogOut className="h-5 w-5" />
            התנתקות
          </button>
        </div>
      </aside>
    </div>
  );
}
