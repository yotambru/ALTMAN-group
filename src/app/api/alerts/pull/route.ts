import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/account-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token.length < 16) return NextResponse.json({ notifications: [] }, { status: 401 });

  const admin = createAdminClient();
  const { data: tokens, error } = await admin
    .from("notifications")
    .select("for_user_id, body")
    .eq("kind", "session")
    .eq("related_id", "alert-token")
    .eq("body", token)
    .limit(1);
  if (error || !tokens?.[0]?.for_user_id) {
    return NextResponse.json({ notifications: [] }, { status: 401 });
  }

  const { data: notes } = await admin
    .from("notifications")
    .select("id, title, body, kind, created_at")
    .eq("for_user_id", tokens[0].for_user_id)
    .eq("read", false)
    .neq("kind", "session")
    .order("created_at", { ascending: false })
    .limit(8);

  return NextResponse.json({
    notifications: (notes ?? []).map((note) => ({
      id: note.id,
      title: note.title,
      body: note.body,
    })),
  });
}
