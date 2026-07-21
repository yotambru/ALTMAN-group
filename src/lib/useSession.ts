"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage, type Session } from "@/lib/storage";
import { currentUsers } from "@/lib/mock-data";
import type { Role } from "@/types";

/**
 * Reads the mock session for a dashboard. If none exists (e.g. direct URL
 * visit in the prototype), it falls back to the expected role so the page is
 * still viewable rather than redirecting away.
 */
export function useSession(expectedRole: Role): {
  session: Session;
  ready: boolean;
  logout: () => void;
} {
  const router = useRouter();
  const fallback: Session = {
    role: expectedRole,
    fullName: currentUsers[expectedRole].fullName,
    loginAt: new Date().toISOString(),
  };
  const [session, setSession] = useState<Session>(fallback);
  const [ready, setReady] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Hydrate from localStorage only after mount to avoid SSR/client mismatch.
    const stored = storage.getSession();
    if (stored) setSession(stored);
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const logout = () => {
    storage.clearSession();
    router.push("/");
  };

  return { session, ready, logout };
}
