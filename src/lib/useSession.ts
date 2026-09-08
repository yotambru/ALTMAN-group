"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage, type Session } from "@/lib/storage";
import { loadSessionUser, signOutSession } from "@/lib/auth";
import { routeByRole } from "@/lib/permissions";
import { useData } from "@/lib/store";
import { isLoginRole, type Role, type User } from "@/types";

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

const EMPTY_SESSION: Session = {
  role: "tenant",
  userId: "",
  fullName: "",
  loginAt: "",
};

/**
 * Reads the authenticated session for a dashboard and syncs the store's acting user.
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

  const [session, setSession] = useState<Session>(EMPTY_SESSION);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const profile = await loadSessionUser();
      if (cancelled) return;
      if (!profile) {
        storage.clearSession();
        router.replace("/");
        return;
      }
      if (!isLoginRole(profile.role)) {
        storage.clearSession();
        void signOutSession();
        router.replace("/");
        return;
      }
      if (!allowedRoles.includes(profile.role)) {
        router.replace(routeByRole[profile.role]);
        return;
      }
      const next = sessionFromUser(profile);
      storage.setSession(next);
      setSession(next);
      setActor({ id: profile.id, name: profile.fullName, role: profile.role });
      if (dataReady) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady]);

  const user = users.find((u) => u.id === session.userId) ?? {
    id: session.userId,
    fullName: session.fullName,
    role: session.role,
    landlordId: session.landlordId,
    tenantId: session.tenantId,
    professionalId: session.professionalId,
  };

  const logout = () => {
    storage.clearSession();
    void signOutSession().finally(() => {
      router.push("/");
    });
  };

  return { session, user, ready, logout };
}
