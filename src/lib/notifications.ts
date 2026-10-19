import type { AppNotification, Role } from "@/types";

/** Newest first — persisted rows often come back in insertion order (oldest first). */
export function sortNotificationsNewestFirst<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

/** Whether a notification should appear in this user/role inbox. */
export function isNotificationForAudience(
  n: Pick<AppNotification, "forUserId" | "forRole" | "kind">,
  forUserId?: string,
  forRole?: Role,
): boolean {
  if (n.kind === "session") return false;
  if (forUserId && n.forUserId === forUserId) return true;
  if (forRole && n.forRole === forRole) return true;
  if (!n.forUserId && !n.forRole) return true;
  return false;
}
