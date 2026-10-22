import { getSupabase } from "@/lib/supabase/client";

const DEVICE_KEY = "altman-device-id";

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

/** Remember this browser. A previous login never blocks a new one. */
export async function claimManagerDevice(userId: string): Promise<{ ok: true }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: true };
  const deviceId = localDeviceId();
  const rowId = `dev_${userId}_${deviceId}`;
  const now = new Date().toISOString();
  const payload = {
    id: rowId,
    kind: "session",
    title: deviceLabel(),
    body: now,
    created_at: now,
    read: true,
    for_user_id: userId,
    related_id: deviceId,
  };
  const { data } = await supabase.from("notifications").select("id").eq("id", rowId).maybeSingle();
  if (data) await supabase.from("notifications").update(payload).eq("id", rowId);
  else await supabase.from("notifications").insert(payload);
  return { ok: true };
}

/** Drop this browser's device row when the session ends, so it is not left "connected". */
export async function releaseManagerDevice(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) return;
  await supabase.from("notifications").delete().eq("kind", "session").eq("related_id", deviceId);
}
