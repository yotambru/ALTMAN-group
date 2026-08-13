"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage, type Session } from "@/lib/storage";
import { currentUsers } from "@/lib/mock-data";
import { routeByRole } from "@/lib/permissions";
import { useData } from "@/lib/store";
import type { Role, User } from "@/types";

function sessionFromUser(user: User): Session {
  return {
    role: user.role,
    userId: user.id,
    fullName: user.fullName,
    landlordId: user.landlordId,
    tenantId: user.tenantId,
    professionalId: user.professionalId,
    loginAt: new Date().toISOString(),
  };
}

/**
 * Reads the session for a dashboard and syncs the store's acting user.
 * `allowed` is the role (or roles) permitted on the route. Unauthenticated
 * visitors are sent back to login; a session for another role is redirected
 * to that role's dashboard.
 */
export function useSession(allowed: Role | Role[]): {
  session: Session;
  user: User;
  ready: boolean;
  logout: () => void;
} {
  const router = useRouter();
  const { users, setActor, ready: dataReady } = useData();
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  const primary = allowedRoles[0];

  const fallback: Session = sessionFromUser(currentUsers[primary]);
  const [session, setSession] = useState<Session>(fallback);
  const [ready, setReady] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!dataReady) return;
    const stored = storage.getSession();
    if (!stored) {
      router.replace("/");
      return;
    }
    if (!allowedRoles.includes(stored.role)) {
      router.replace(routeByRole[stored.role]);
      return;
    }
    setSession(stored);
    setActor({ id: stored.userId, name: stored.fullName, role: stored.role });
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const user =
    users.find((u) => u.id === session.userId) ?? currentUsers[session.role];

  const logout = () => {
    storage.clearSession();
    router.push("/");
  };

  return { session, user, ready, logout };
}
