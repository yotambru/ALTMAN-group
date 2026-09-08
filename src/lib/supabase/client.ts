import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Browser/anon client. Null when env vars are missing (local seed-only mode). */
export function getSupabase(): SupabaseClient | null {
  if (browserClient !== undefined) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    browserClient = null;
    return null;
  }
  const inBrowser = typeof window !== "undefined";
  browserClient = createClient(url, key, {
    auth: {
      persistSession: inBrowser,
      autoRefreshToken: inBrowser,
      detectSessionInUrl: false,
      storage: inBrowser ? window.localStorage : undefined,
    },
  });
  return browserClient;
}

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Scripts may run on Node 20, which has no native WebSocket. Seed/auth admin
    // only use PostgREST + Auth — they never subscribe to Realtime.
    realtime:
      typeof WebSocket === "undefined"
        ? { transport: ClosedWebSocket }
        : {},
  });
}

/** Minimal WebSocket stub so supabase-js can construct a client without `ws`. */
class ClosedWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  readyState = 3;
  url = "";
  protocol = "";
  binaryType = "blob";
  onopen = null;
  onmessage = null;
  onclose = null;
  onerror = null;
  close(): void {}
  send(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
}
