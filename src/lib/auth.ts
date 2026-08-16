import { currentUsers } from "@/lib/mock-data";
import type { Role, User } from "@/types";

/** Simple prototype credentials — one username per role, shared password. */
export const DEMO_PASSWORD = "1234";

export const MIN_PASSWORD_LENGTH = 4;

export const demoCredentials: Record<Role, string> = {
  manager: "manager",
  assistant: "assistant",
  landlord: "landlord",
  tenant: "tenant",
  professional: "professional",
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function accountDisplayName(name: string | undefined, email: string): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  const local = email.split("@")[0]?.trim();
  return local || "לא צויין";
}

export function emailInUse(email: string, records: { email?: string }[]): boolean {
  const needle = normalizeEmail(email);
  if (!needle) return false;
  return records.some((r) => r.email && normalizeEmail(r.email) === needle);
}

export function findUserByEmail(users: User[], email: string): User | undefined {
  const needle = normalizeEmail(email);
  if (!needle) return undefined;
  return users.find((u) => u.email && normalizeEmail(u.email) === needle);
}

export function needsPasswordSetup(user: User): boolean {
  return !user.passwordHash;
}

export async function hashPassword(password: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function authenticateDemo(
  role: Role,
  identifier: string,
  password: string,
): { ok: true; user: User } | { ok: false; error: string } {
  const username = identifier.trim().toLowerCase();
  const expected = demoCredentials[role];
  const demoUser = currentUsers[role];
  const demoEmail = demoUser.email ? normalizeEmail(demoUser.email) : "";

  if (!username || !password) {
    return { ok: false, error: "יש להזין שם משתמש וסיסמה." };
  }

  const matchesIdentifier = username === expected || (demoEmail !== "" && username === demoEmail);
  if (!matchesIdentifier || password !== DEMO_PASSWORD) {
    return {
      ok: false,
      error: "שם משתמש או סיסמה שגויים לתפקיד שנבחר.",
    };
  }

  return { ok: true, user: demoUser };
}

export async function authenticateUser(
  users: User[],
  role: Role,
  identifier: string,
  password: string,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const demo = authenticateDemo(role, identifier, password);
  if (demo.ok) {
    const live =
      users.find((u) => u.id === demo.user.id) ??
      findUserByEmail(users, identifier) ??
      demo.user;
    return { ok: true, user: live };
  }

  if (!identifier.trim() || !password) {
    return { ok: false, error: "יש להזין מייל וסיסמה." };
  }

  const user = findUserByEmail(users, identifier);
  if (!user || user.role !== role) {
    return { ok: false, error: "שם משתמש או סיסמה שגויים לתפקיד שנבחר." };
  }
  if (needsPasswordSetup(user)) {
    return { ok: false, error: "יש להפעיל את החשבון דרך «כניסה פעם ראשונה»." };
  }

  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) {
    return { ok: false, error: "שם משתמש או סיסמה שגויים לתפקיד שנבחר." };
  }
  return { ok: true, user };
}

export function beginFirstLogin(
  users: User[],
  email: string,
): { ok: true; user: User } | { ok: false; error: string } {
  if (!isValidEmail(email)) {
    return { ok: false, error: "יש להזין כתובת מייל תקינה." };
  }
  const user = findUserByEmail(users, email);
  if (!user) {
    return { ok: false, error: "לא נמצא חשבון הממתין להפעלה עבור המייל הזה." };
  }
  if (!needsPasswordSetup(user)) {
    return { ok: false, error: "החשבון כבר הופעל. היכנסו עם הסיסמה." };
  }
  return { ok: true, user };
}

export function validateNewPassword(
  password: string,
  confirm: string,
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים.`;
  }
  if (password !== confirm) {
    return "הסיסמאות אינן תואמות.";
  }
  return null;
}
