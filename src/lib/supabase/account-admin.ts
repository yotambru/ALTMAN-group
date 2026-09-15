import { createHash } from "node:crypto";
import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/client";

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

export async function findAppUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<AppUserRow | null> {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  // Emails are stored normalized (lowercase). Prefer exact eq — ilike treats `_`
  // as a wildcard and can match the wrong row or trip maybeSingle().
  const { data, error } = await admin
    .from("app_users")
    .select("id, email, auth_user_id, password_hash, role")
    .eq("email", needle)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as AppUserRow;

  // Legacy rows that were saved with mixed case before normalizeEmail.
  const { data: fallback, error: fallbackError } = await admin
    .from("app_users")
    .select("id, email, auth_user_id, password_hash, role")
    .ilike("email", needle.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_"))
    .limit(5);
  if (fallbackError) throw fallbackError;
  const matches = (fallback ?? []).filter(
    (row) => String(row.email ?? "").trim().toLowerCase() === needle,
  );
  return (matches[0] as AppUserRow | undefined) ?? null;
}

/** Clear a stale auth_user_id when the Auth user was deleted or never linked. */
export async function clearAuthLink(admin: SupabaseClient, appUserId: string): Promise<void> {
  const { error } = await admin
    .from("app_users")
    .update({ auth_user_id: null })
    .eq("id", appUserId);
  if (error) throw error;
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
  const existing = await findAuthUserByEmail(admin, email);
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

/**
 * True when first-login may still set a password for this app row
 * (no Auth link, invite leftover, or dangling auth_user_id).
 */
export async function authLinkNeedsActivation(
  admin: SupabaseClient,
  row: AppUserRow,
  email: string,
): Promise<boolean> {
  if (!row.auth_user_id) return true;

  const needle = email.trim().toLowerCase();
  const byEmail = await findAuthUserByEmail(admin, needle);
  if (byEmail) {
    if (byEmail.id !== row.auth_user_id) {
      // Stale link on the app row — clear so provision can attach the email's Auth user.
      await clearAuthLink(admin, row.id);
    }
    return authInvitePending(byEmail);
  }

  const { data, error } = await admin.auth.admin.getUserById(row.auth_user_id);
  if (error || !data.user) {
    await clearAuthLink(admin, row.id);
    return true;
  }
  const linkedEmail = data.user.email?.toLowerCase() ?? "";
  if (linkedEmail && linkedEmail !== needle) {
    // App email and Auth email diverged — allow activate to create/link the login email.
    await clearAuthLink(admin, row.id);
    return true;
  }
  return authInvitePending(data.user);
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

/** Whether the Auth user still needs to set a password (unused invite leftover). */
export function authInvitePending(user: AuthUser): boolean {
  if (user.last_sign_in_at) return false;
  return Boolean(user.invited_at) || !user.email_confirmed_at;
}
