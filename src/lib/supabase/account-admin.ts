import { createHash } from "node:crypto";
import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/client";
import { isLoginRole } from "@/types";

export const MIN_AUTH_PASSWORD_LENGTH = 8;

type AppUserRow = {
  id: string;
  email: string | null;
  auth_user_id: string | null;
  password_hash: string | null;
  role: string;
};

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createAdminClient(): SupabaseClient {
  return createServiceClient();
}

export async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<AuthUser | null> {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === needle);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

export async function findAppUserById(
  admin: SupabaseClient,
  id: string,
): Promise<AppUserRow | null> {
  const { data, error } = await admin
    .from("app_users")
    .select("id, email, auth_user_id, password_hash, role")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as AppUserRow | null) ?? null;
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

const APP_USER_AUTH_COLS = "id, email, auth_user_id, password_hash, role";

export async function findAppUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<AppUserRow | null> {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  const exact = await admin
    .from("app_users")
    .select(APP_USER_AUTH_COLS)
    .eq("email", needle)
    .maybeSingle();
  if (exact.error) throw exact.error;
  if (exact.data) return exact.data as AppUserRow;
  const { data, error } = await admin
    .from("app_users")
    .select(APP_USER_AUTH_COLS)
    .ilike("email", escapeIlike(needle))
    .maybeSingle();
  if (error) throw error;
  return (data as AppUserRow | null) ?? null;
}

export async function findAuthUserForAppUser(
  admin: SupabaseClient,
  row: AppUserRow,
): Promise<AuthUser | null> {
  if (row.auth_user_id) {
    const { data } = await admin.auth.admin.getUserById(row.auth_user_id);
    if (data.user) return data.user;
  }
  const email = (row.email ?? "").trim();
  if (!email) return null;
  return findAuthUserByEmail(admin, email);
}

/** First-login can still set a password if Auth was created but nobody ever signed in. */
export function canSetFirstPassword(row: AppUserRow, authUser: AuthUser | null): boolean {
  if (!isLoginRole(row.role)) return false;
  if (!row.auth_user_id) return true;
  if (!authUser || authUser.last_sign_in_at) return false;
  if (authInvitePending(authUser)) return true;
  return row.role === "landlord" || row.role === "tenant";
}

/** Whether the Auth user still needs to set a password (unused invite leftover). */
export function authInvitePending(user: AuthUser): boolean {
  if (user.last_sign_in_at) return false;
  return Boolean(user.invited_at) || !user.email_confirmed_at;
}

export async function linkAuthUser(
  admin: SupabaseClient,
  appUserId: string,
  authUserId: string,
): Promise<void> {
  const { error } = await admin
    .from("app_users")
    .update({ auth_user_id: authUserId, password_hash: null })
    .eq("id", appUserId);
  if (error) throw error;
}

export async function provisionAuthUser(
  admin: SupabaseClient,
  email: string,
  password: string,
  appUserId: string,
): Promise<void> {
  const row = await findAppUserById(admin, appUserId);
  const linked =
    row?.auth_user_id != null
      ? (await admin.auth.admin.getUserById(row.auth_user_id)).data.user
      : null;
  const existing = linked ?? (await findAuthUserByEmail(admin, email));
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { app_user_id: appUserId },
    });
    if (error) throw error;
    await linkAuthUser(admin, appUserId, existing.id);
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { app_user_id: appUserId },
  });
  if (error) throw error;
  if (!data.user) throw new Error("createUser returned no user");
  try {
    await linkAuthUser(admin, appUserId, data.user.id);
  } catch (err) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw err;
  }
}

export async function deleteAuthUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<boolean> {
  const existing = await findAuthUserByEmail(admin, email);
  if (!existing) return false;
  const { error } = await admin.auth.admin.deleteUser(existing.id);
  if (error) throw error;
  return true;
}

/** Rename Auth login email for an app user that already has auth_user_id. */
export async function updateAuthEmailForAppUser(
  admin: SupabaseClient,
  appUserId: string,
  newEmail: string,
): Promise<"updated" | "skipped"> {
  const needle = newEmail.trim().toLowerCase();
  if (!needle.includes("@")) throw new Error("invalid email");
  const row = await findAppUserById(admin, appUserId);
  if (!row?.auth_user_id) return "skipped";
  const authId = row.auth_user_id;
  const { data: authUser, error: getError } = await admin.auth.admin.getUserById(authId);
  if (getError) throw getError;
  const current = authUser.user?.email?.toLowerCase() ?? "";
  if (current === needle) return "skipped";
  const conflict = await findAuthUserByEmail(admin, needle);
  if (conflict && conflict.id !== authId) {
    throw new Error("email already in auth");
  }
  const { error } = await admin.auth.admin.updateUserById(authId, {
    email: needle,
    email_confirm: true,
  });
  if (error) throw error;
  return "updated";
}
