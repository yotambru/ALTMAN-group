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
  const { data, error } = await admin
    .from("app_users")
    .select("id, email, auth_user_id, password_hash, role")
    .ilike("email", needle)
    .maybeSingle();
  if (error) throw error;
  return (data as AppUserRow | null) ?? null;
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
  await linkAuthUser(admin, appUserId, data.user.id);
}

/** Whether the Auth user still needs to accept invite / set a password. */
export function authInvitePending(user: AuthUser): boolean {
  if (user.last_sign_in_at) return false;
  return Boolean(user.invited_at) || !user.email_confirmed_at;
}

/**
 * Send Supabase Auth invite email and link the Auth user to app_users.
 * Redirect should land on /auth/callback so they can set a password.
 */
export async function inviteAppUser(
  admin: SupabaseClient,
  email: string,
  appUserId: string,
  redirectTo: string,
): Promise<{ alreadyActive?: boolean }> {
  const normalized = email.trim().toLowerCase();
  const existing = await findAuthUserByEmail(admin, normalized);

  if (existing && !authInvitePending(existing)) {
    await admin.auth.admin.updateUserById(existing.id, {
      user_metadata: { ...(existing.user_metadata ?? {}), app_user_id: appUserId },
    });
    await linkAuthUser(admin, appUserId, existing.id);
    return { alreadyActive: true };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(normalized, {
    redirectTo,
    data: { app_user_id: appUserId },
  });

  if (error) {
    // Already invited / registered — keep the app link and surface a soft success.
    if (existing) {
      await linkAuthUser(admin, appUserId, existing.id);
      return { alreadyActive: !authInvitePending(existing) };
    }
    throw error;
  }

  const authId = data.user?.id;
  if (!authId) throw new Error("inviteUserByEmail returned no user");
  await linkAuthUser(admin, appUserId, authId);
  return {};
}
