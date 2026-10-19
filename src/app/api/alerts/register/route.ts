import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient, findAppUserByEmail } from "@/lib/supabase/account-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const header = request.headers.get("authorization");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!header?.startsWith("Bearer ") || !url || !key) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim() ?? "";
  if (token.length < 16 || token.length > 200) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const userClient = createClient(url, key, {
    global: { headers: { Authorization: header } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await userClient.auth.getUser();
  const email = data.user?.email;
  if (!email) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = createAdminClient();
  const profile = await findAppUserByEmail(admin, email);
  if (!profile) return NextResponse.json({ ok: false }, { status: 404 });

  const now = new Date().toISOString();
  const { error } = await admin.from("notifications").upsert({
    id: `poll_${profile.id}`,
    kind: "session",
    title: "התראות",
    body: token,
    created_at: now,
    read: true,
    for_user_id: profile.id,
    related_id: "alert-token",
  });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
