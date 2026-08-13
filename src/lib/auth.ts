import { currentUsers } from "@/lib/mock-data";
import type { Role, User } from "@/types";

/** Simple prototype credentials — one username per role, shared password. */
export const DEMO_PASSWORD = "1234";

export const demoCredentials: Record<Role, string> = {
  manager: "manager",
  assistant: "assistant",
  landlord: "landlord",
  tenant: "tenant",
  professional: "professional",
};

export function authenticateDemo(
  role: Role,
  identifier: string,
  password: string,
): { ok: true; user: User } | { ok: false; error: string } {
  const username = identifier.trim().toLowerCase();
  const expected = demoCredentials[role];

  if (!username || !password) {
    return { ok: false, error: "יש להזין שם משתמש וסיסמה." };
  }

  if (username !== expected || password !== DEMO_PASSWORD) {
    return {
      ok: false,
      error: "שם משתמש או סיסמה שגויים לתפקיד שנבחר.",
    };
  }

  return { ok: true, user: currentUsers[role] };
}
