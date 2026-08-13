import { Bell, FileText, Home, User } from "lucide-react";
import type { BottomNavItem } from "./BottomNavigation";

export type AppTab = "dashboard" | "documents" | "notifications" | "profile";

/** Unified bottom tabs for every role: דשבורד · מסמכים · הודעות · פרופיל */
export function appBottomNavItems(unread = 0): BottomNavItem[] {
  return [
    { id: "dashboard", label: "דשבורד", icon: Home },
    { id: "documents", label: "מסמכים", icon: FileText },
    { id: "notifications", label: "הודעות", icon: Bell, badge: unread },
    { id: "profile", label: "פרופיל", icon: User },
  ];
}
