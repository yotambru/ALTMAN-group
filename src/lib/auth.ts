import { currentUsers } from "@/lib/mock-data";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { isLoginRole, type Role, type User } from "@/types";

export const MIN_PASSWORD_LENGTH = 8;

const INVALID_CREDENTIALS = "שם משתמש או סיסמה שגויים.";

/** Username shortcuts → seeded account emails (password is never stored here). */
const LOGIN_ALIASES: Record<string, string> = {
  manager: "avi@altmangroup.co.il",
  assistant: "noa@altmangroup.co.il",
  landlord: "daniel@example.com",
  tenant: "danny@example.com",
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

export function resolveLoginEmail(identifier: string): string {
  const raw = identifier.trim().toLowerCase();
  if (!raw) return "";
  if (LOGIN_ALIASES[raw]) return LOGIN_ALIASES[raw];
  return raw;
}

export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים.`;
  }
  if (password !== confirm) {
    return "הסיסמאות אינן תואמות.";
  }
  return null;
}

async function accountApi(
  action: "pending" | "activate" | "legacy" | "upgrade" | "set-password" | "update-auth-email",
  payload: {
    email?: string;
    password?: string;
    newPassword?: string;
    userId?: string;
    newEmail?: string;
  },
): Promise<{
  ok: boolean;
  error?: string;
  needsNewPassword?: boolean;
  retry?: boolean;
}> {
  const supabase = getSupabase();
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
  const response = await fetch("/api/auth/account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  try {
    return (await response.json()) as {
      ok: boolean;
      error?: string;
      needsNewPassword?: boolean;
      retry?: boolean;
    };
  } catch {
    return { ok: false, error: "השרת לא זמין. נסו שוב." };
  }
}

export async function signInWithCredentials(
  identifier: string,
  password: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string; needsNewPassword?: boolean }> {
  if (!identifier.trim() || !password) {
    return { ok: false, error: "יש להזין מייל וסיסמה." };
  }

  const email = resolveLoginEmail(identifier);
  if (!email.includes("@")) {
    return { ok: false, error: INVALID_CREDENTIALS };
  }

  const supabase = getSupabase();
  if (!supabase) {
    if (process.env.NODE_ENV === "development") {
      return localDevSignIn(email, password);
    }
    return { ok: false, error: "אין חיבור לשרת. נסו שוב מאוחר יותר." };
  }

  const first = await supabase.auth.signInWithPassword({ email, password });
  if (!first.error) return { ok: true, email };

  const migrated = await accountApi("legacy", { email, password });
  if (migrated.needsNewPassword) {
    return { ok: false, error: migrated.error ?? INVALID_CREDENTIALS, needsNewPassword: true };
  }
  if (migrated.ok) {
    const retry = await supabase.auth.signInWithPassword({ email, password });
    if (!retry.error) return { ok: true, email };
  }

  return { ok: false, error: INVALID_CREDENTIALS };
}

export async function checkFirstLoginEmail(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidEmail(email)) {
    return { ok: false, error: "יש להזין כתובת מייל תקינה." };
  }
  const normalized = normalizeEmail(email);
  // Persist can lag a second or two after the office opens the account.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await accountApi("pending", { email: normalized });
    if (result.ok) return { ok: true };
    if (!result.retry || attempt === 3) {
      return { ok: false, error: result.error ?? "לא ניתן להפעיל את החשבון." };
    }
    await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
  }
  return { ok: false, error: "לא ניתן להפעיל את החשבון." };
}

export async function upgradeLegacyPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await accountApi("upgrade", {
    email: normalizeEmail(email),
    password: currentPassword,
    newPassword,
  });
  if (!result.ok) return { ok: false, error: result.error ?? "עדכון הסיסמה נכשל." };
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "אין חיבור לשרת." };
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password: newPassword,
  });
  if (error) return { ok: false, error: INVALID_CREDENTIALS };
  return { ok: true };
}

export async function activateAccount(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeEmail(email);
  let result = await accountApi("activate", { email: normalized, password });
  for (let attempt = 0; !result.ok && result.retry && attempt < 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    result = await accountApi("activate", { email: normalized, password });
  }
  if (!result.ok) return { ok: false, error: result.error ?? "הפעלת החשבון נכשלה." };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "אין חיבור לשרת." };
  const { error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });
  if (error) {
    return {
      ok: false,
      error:
        "הסיסמה נשמרה אך ההתחברות נכשלה. נסו להיכנס עם הסיסמה החדשה במסך הכניסה הרגיל.",
    };
  }
  return { ok: true };
}

export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const invalid = validateNewPassword(newPassword, newPassword);
  if (invalid) return { ok: false, error: invalid };
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "אין חיבור לשרת." };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const email = authData.user?.email;
  if (authError || !email) return { ok: false, error: "יש להתחבר מחדש." };
  const check = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (check.error) return { ok: false, error: "הסיסמה הנוכחית שגויה." };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: "עדכון הסיסמה נכשל. נסו שוב." };
  return { ok: true };
}

export async function setPasswordAsManager(
  userId: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const invalid = validateNewPassword(newPassword, newPassword);
  if (invalid) return { ok: false, error: invalid };
  const result = await accountApi("set-password", { userId, newPassword });
  if (!result.ok) return { ok: false, error: result.error ?? "עדכון הסיסמה נכשל." };
  return { ok: true };
}

/** Keep Supabase Auth email in sync after app_users.email changes (staff only). */
export async function syncAuthLoginEmail(
  userId: string,
  newEmail: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!userId || !isValidEmail(newEmail)) {
    return { ok: false, error: "חסרים מזהה משתמש או מייל תקין." };
  }
  const result = await accountApi("update-auth-email", {
    userId,
    newEmail: normalizeEmail(newEmail),
  });
  if (!result.ok) return { ok: false, error: result.error ?? "סנכרון מייל הכניסה נכשל." };
  return { ok: true };
}

export async function signOutSession(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) await supabase.auth.signOut();
}

export async function loadSessionUser(): Promise<User | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const authUser = authData.user;
  if (authError || !authUser) return null;

  const { data, error } = await supabase
    .from("app_users")
    .select("id, full_name, role, email, phone, avatar_url, landlord_id, tenant_id, professional_id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();
  if (error || !data) return null;
  const role = String(data.role ?? "");
  if (!isLoginRole(role)) return null;
  return {
    id: String(data.id),
    fullName: String(data.full_name ?? ""),
    role,
    email: data.email ? String(data.email) : undefined,
    phone: data.phone ? String(data.phone) : undefined,
    avatarUrl: data.avatar_url ? String(data.avatar_url) : undefined,
    landlordId: data.landlord_id ? String(data.landlord_id) : undefined,
    tenantId: data.tenant_id ? String(data.tenant_id) : undefined,
    professionalId: data.professional_id ? String(data.professional_id) : undefined,
  };
}

function localDevSignIn(
  email: string,
  password: string,
): { ok: true; email: string } | { ok: false; error: string } {
  if (!isSupabaseConfigured() && password.length >= MIN_PASSWORD_LENGTH) {
    const match = (Object.values(currentUsers) as User[]).find(
      (user) => user.email && normalizeEmail(user.email) === email,
    );
    if (match) return { ok: true, email };
  }
  return { ok: false, error: INVALID_CREDENTIALS };
}

export type { Role };
