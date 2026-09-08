import type { AppNotification, Role } from "@/types";

/** Whether a notification should appear in this user/role inbox. */
export function isNotificationForAudience(
  n: Pick<AppNotification, "forUserId" | "forRole">,
  forUserId?: string,
  forRole?: Role,
): boolean {
  if (forUserId && n.forUserId === forUserId) return true;
  if (forRole && n.forRole === forRole) return true;
  if (!n.forUserId && !n.forRole) return true;
  return false;
}
