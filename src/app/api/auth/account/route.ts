import { NextResponse } from "next/server";
import {
  createAdminClient,
  findAppUserByEmail,
  findAppUserById,
  MIN_AUTH_PASSWORD_LENGTH,
  provisionAuthUser,
  sha256Hex,
} from "@/lib/supabase/account-admin";
import { isLoginRole } from "@/types";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 12;
const attempts = new Map<string, { count: number; resetAt: number }>();

const GENERIC_ACTIVATE = "לא ניתן להפעיל את החשבון. בדקו את המייל או פנו למשרד.";
const GENERIC_LOGIN = "שם משתמש או סיסמה שגויים.";

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}

type Body = {
  action?: string;
  email?: string;
  password?: string;
  newPassword?: string;
  userId?: string;
};

export async function POST(request: Request) {
  const key = clientKey(request);
  if (rateLimited(key)) {
    return NextResponse.json({ ok: false, error: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "בקשה לא תקינה." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const action = body.action ?? "";

  try {
    const admin = createAdminClient();

    if (action === "set-password") {
      const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
      if (!token) {
        return NextResponse.json({ ok: false, error: "יש להתחבר מחדש." }, { status: 401 });
      }
      const { data: authData, error: authError } = await admin.auth.getUser(token);
      if (authError || !authData.user) {
        return NextResponse.json({ ok: false, error: "יש להתחבר מחדש." }, { status: 401 });
      }
      const { data: caller, error: callerError } = await admin
        .from("app_users")
        .select("id, role")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();
      if (callerError || caller?.role !== "manager") {
        return NextResponse.json({ ok: false, error: "אין הרשאה לשנות סיסמה למשתמש אחר." }, { status: 403 });
      }
      const nextPassword = body.newPassword ?? "";
      if (nextPassword.length < MIN_AUTH_PASSWORD_LENGTH) {
        return NextResponse.json(
          { ok: false, error: `הסיסמה חייבת להכיל לפחות ${MIN_AUTH_PASSWORD_LENGTH} תווים.` },
          { status: 400 },
        );
      }
      const targetId = (body.userId ?? "").trim();
      const target = targetId ? await findAppUserById(admin, targetId) : null;
      if (!target || !isLoginRole(target.role)) {
        return NextResponse.json({ ok: false, error: "המשתמש לא נמצא." }, { status: 404 });
      }
      const targetEmail = (target.email ?? "").trim().toLowerCase();
      if (!targetEmail.includes("@")) {
        return NextResponse.json(
          { ok: false, error: "לחשבון אין כתובת מייל — אי אפשר להגדיר סיסמה." },
          { status: 400 },
        );
      }
      await provisionAuthUser(admin, targetEmail, nextPassword, target.id);
      return NextResponse.json({ ok: true });
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "יש להזין כתובת מייל תקינה." }, { status: 400 });
    }

    if (action === "pending") {
      const row = await findAppUserByEmail(admin, email);
      if (!row || !isLoginRole(row.role)) {
        return NextResponse.json({ ok: false, error: GENERIC_ACTIVATE });
      }
      if (row.auth_user_id) {
        return NextResponse.json({ ok: false, error: "החשבון כבר הופעל. היכנסו עם הסיסמה." });
      }
      return NextResponse.json({ ok: true, pending: true });
    }

    if (action === "activate") {
      if (password.length < MIN_AUTH_PASSWORD_LENGTH) {
        return NextResponse.json(
          { ok: false, error: `הסיסמה חייבת להכיל לפחות ${MIN_AUTH_PASSWORD_LENGTH} תווים.` },
          { status: 400 },
        );
      }
      const row = await findAppUserByEmail(admin, email);
      if (!row || !isLoginRole(row.role) || row.auth_user_id || row.password_hash) {
        return NextResponse.json({ ok: false, error: GENERIC_ACTIVATE });
      }
      await provisionAuthUser(admin, email, password, row.id);
      return NextResponse.json({ ok: true });
    }

    if (action === "upgrade") {
      const nextPassword = body.newPassword ?? "";
      if (nextPassword.length < MIN_AUTH_PASSWORD_LENGTH) {
        return NextResponse.json(
          { ok: false, error: `הסיסמה חייבת להכיל לפחות ${MIN_AUTH_PASSWORD_LENGTH} תווים.` },
          { status: 400 },
        );
      }
      const row = await findAppUserByEmail(admin, email);
      if (!row || !isLoginRole(row.role) || !row.password_hash) {
        return NextResponse.json({ ok: false, error: GENERIC_LOGIN });
      }
      if (sha256Hex(password) !== row.password_hash) {
        return NextResponse.json({ ok: false, error: GENERIC_LOGIN });
      }
      await provisionAuthUser(admin, email, nextPassword, row.id);
      return NextResponse.json({ ok: true, migrated: true });
    }

    if (action === "legacy") {
      const row = await findAppUserByEmail(admin, email);
      if (!row || !isLoginRole(row.role) || !row.password_hash) {
        return NextResponse.json({ ok: false, error: GENERIC_LOGIN });
      }
      if (sha256Hex(password) !== row.password_hash) {
        return NextResponse.json({ ok: false, error: GENERIC_LOGIN });
      }
      if (password.length < 6) {
        return NextResponse.json({
          ok: false,
          needsNewPassword: true,
          error: `יש לקבוע סיסמה חדשה (לפחות ${MIN_AUTH_PASSWORD_LENGTH} תווים).`,
        });
      }
      await provisionAuthUser(admin, email, password, row.id);
      return NextResponse.json({ ok: true, migrated: true });
    }

    return NextResponse.json({ ok: false, error: "בקשה לא תקינה." }, { status: 400 });
  } catch (err) {
    console.error("[auth/account]", err);
    return NextResponse.json({ ok: false, error: "הפעולה נכשלה. נסו שוב." }, { status: 500 });
  }
}
