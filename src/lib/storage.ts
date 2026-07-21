import type { Role } from "@/types";

/**
 * Thin, SSR-safe localStorage wrapper for prototype persistence.
 * All access is guarded so it is a no-op during server rendering.
 */

const KEYS = {
  session: "altman.session",
  tickets: "altman.tickets",
  clients: "altman.clients",
  remember: "altman.remember",
} as const;

export interface Session {
  role: Role;
  fullName: string;
  loginAt: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — ignore in prototype */
  }
}

export const storage = {
  keys: KEYS,

  getSession(): Session | null {
    return read<Session | null>(KEYS.session, null);
  },
  setSession(session: Session): void {
    write(KEYS.session, session);
  },
  clearSession(): void {
    if (isBrowser()) window.localStorage.removeItem(KEYS.session);
  },

  getRememberedIdentifier(): string {
    return read<string>(KEYS.remember, "");
  },
  setRememberedIdentifier(identifier: string): void {
    write(KEYS.remember, identifier);
  },
  clearRememberedIdentifier(): void {
    if (isBrowser()) window.localStorage.removeItem(KEYS.remember);
  },

  getItem<T>(key: string, fallback: T): T {
    return read<T>(key, fallback);
  },
  setItem<T>(key: string, value: T): void {
    write(key, value);
  },
};
