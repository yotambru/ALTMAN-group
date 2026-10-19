import { getSupabase } from "@/lib/supabase/client";

const DEVICE_KEY = "altman-device-id";
const MAX_DEVICES = 2;

export function localDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "דפדפן";
}

/**
 * A manager may stay signed in on two devices. A third login is refused
 * until one of the existing devices is disconnected.
 */
export async function claimManagerDevice(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: true };
  const deviceId = localDeviceId();
  const rowId = `dev_${userId}_${deviceId}`;
  const { data, error } = await supabase
    .from("notifications")
    .select("id, related_id")
    .eq("for_user_id", userId)
    .eq("kind", "session");
  if (error) return { ok: true };

  const rows = (data ?? []).filter((row) => row.related_id && row.related_id !== "alert-token");
  const mine = rows.find((row) => row.related_id === deviceId || row.id === rowId);
  const others = rows.filter((row) => row.id !== mine?.id);
  const now = new Date().toISOString();
  const label = deviceLabel();

  if (!mine && others.length >= MAX_DEVICES) {
    await supabase.from("notifications").insert({
      id: `loginblock_${userId}_${Date.now()}`,
      kind: "info",
      title: "ניסיון התחברות חסום",
      body: `${label} · ${new Date().toLocaleString("he-IL")}`,
      created_at: now,
      read: false,
      for_user_id: userId,
    });
    return {
      ok: false,
      error: "החשבון מחובר כבר משני מכשירים. נתקו מכשיר קיים ונסו שוב.",
    };
  }

  const payload = {
    id: mine?.id ?? rowId,
    kind: "session",
    title: label,
    body: now,
    created_at: now,
    read: true,
    for_user_id: userId,
    related_id: deviceId,
  };
  if (mine) await supabase.from("notifications").update(payload).eq("id", mine.id);
  else await supabase.from("notifications").insert(payload);

  await supabase.from("notifications").insert({
    id: `login_${userId}_${Date.now()}`,
    kind: "info",
    title: "התחברות למערכת",
    body: `${label} · ${new Date().toLocaleString("he-IL")}`,
    created_at: now,
    read: false,
    for_user_id: userId,
  });
  return { ok: true };
}
