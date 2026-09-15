import { normalizeEmail } from "@/lib/auth";
import type { DataState } from "@/lib/data-state";
import type { ActivityLogEntry, User } from "@/types";

function stripUsers(state: DataState, userIds: Set<string>): Pick<
  DataState,
  "notifications" | "chatThreads" | "chatMessages" | "tasks"
> {
  const threadIds = new Set(
    state.chatThreads
      .filter((th) => th.participantIds.some((id) => userIds.has(id)))
      .map((th) => th.id),
  );
  return {
    notifications: state.notifications.filter((n) => !n.forUserId || !userIds.has(n.forUserId)),
    chatThreads: state.chatThreads.filter((th) => !threadIds.has(th.id)),
    chatMessages: state.chatMessages.filter(
      (m) => !threadIds.has(m.threadId) && !userIds.has(m.fromUserId),
    ),
    tasks: state.tasks.map((t) =>
      t.assigneeUserId && userIds.has(t.assigneeUserId)
        ? { ...t, assigneeUserId: undefined }
        : t,
    ),
  };
}

function emailKey(value: string | undefined): string {
  return value ? normalizeEmail(value) : "";
}

/** Login accounts linked by id or by the same email as the domain record. */
function loginUserIds(
  users: User[],
  opts: {
    landlordId?: string;
    tenantIds?: Set<string>;
    emails?: Set<string>;
  },
): Set<string> {
  const emails = opts.emails ?? new Set<string>();
  return new Set(
    users
      .filter((u) => {
        if (opts.landlordId && u.landlordId === opts.landlordId) return true;
        if (opts.tenantIds && u.tenantId != null && opts.tenantIds.has(u.tenantId)) return true;
        const email = emailKey(u.email);
        if (!email || !emails.has(email)) return false;
        if (opts.landlordId && u.role === "landlord") return true;
        if (opts.tenantIds && u.role === "tenant") return true;
        return false;
      })
      .map((u) => u.id),
  );
}

/** Remove a tenant, their login, lease/payments, and vacate the current property. */
export function removeTenant(
  state: DataState,
  tenantId: string,
  log: ActivityLogEntry,
): DataState | null {
  const tenant = state.tenants.find((t) => t.id === tenantId);
  if (!tenant) return null;

  const tenantIds = new Set([tenantId]);
  const emails = new Set<string>();
  const tenantEmail = emailKey(tenant.email);
  if (tenantEmail) emails.add(tenantEmail);
  const secondaryEmail = emailKey(tenant.secondaryEmail);
  if (secondaryEmail) emails.add(secondaryEmail);

  const userIds = loginUserIds(state.users, { tenantIds, emails });
  const leaseIds = new Set(
    state.leases.filter((l) => l.tenantId === tenantId).map((l) => l.id),
  );
  const social = stripUsers(state, userIds);

  return {
    ...state,
    ...social,
    users: state.users.filter((u) => !userIds.has(u.id)),
    tenants: state.tenants.filter((t) => t.id !== tenantId),
    leases: state.leases.filter((l) => l.tenantId !== tenantId),
    payments: state.payments.filter((p) => !leaseIds.has(p.leaseId)),
    onboardings: state.onboardings.filter((o) => o.tenantId !== tenantId),
    documents: state.documents.filter((d) => d.tenantId !== tenantId),
    properties: state.properties.map((p) => {
      if (p.tenantId !== tenantId) return p;
      return {
        ...p,
        tenantId: undefined,
        status: p.status === "rented" ? "vacant" : p.status,
      };
    }),
    activityLog: [log, ...state.activityLog],
  };
}

/** Remove one property and the tenants / leases / files attached to it. */
export function removeProperty(
  state: DataState,
  propertyId: string,
  log: ActivityLogEntry,
): DataState | null {
  const property = state.properties.find((p) => p.id === propertyId);
  if (!property) return null;

  const tenantIds = new Set<string>();
  if (property.tenantId) tenantIds.add(property.tenantId);
  for (const tenant of state.tenants) {
    if (tenant.propertyId === propertyId) tenantIds.add(tenant.id);
  }
  for (const lease of state.leases) {
    if (lease.propertyId === propertyId) tenantIds.add(lease.tenantId);
  }

  const leaseIds = new Set(
    state.leases
      .filter((l) => l.propertyId === propertyId || tenantIds.has(l.tenantId))
      .map((l) => l.id),
  );

  const emails = new Set<string>();
  for (const tenant of state.tenants) {
    if (!tenantIds.has(tenant.id)) continue;
    const email = emailKey(tenant.email);
    if (email) emails.add(email);
    const secondary = emailKey(tenant.secondaryEmail);
    if (secondary) emails.add(secondary);
  }

  const userIds = loginUserIds(state.users, { tenantIds, emails });
  const social = stripUsers(state, userIds);

  return {
    ...state,
    ...social,
    users: state.users.filter((u) => !userIds.has(u.id)),
    properties: state.properties.filter((p) => p.id !== propertyId),
    landlords: state.landlords.map((l) =>
      l.id === property.landlordId || l.propertyIds.includes(propertyId)
        ? { ...l, propertyIds: l.propertyIds.filter((id) => id !== propertyId) }
        : l,
    ),
    tenants: state.tenants.filter((t) => !tenantIds.has(t.id)),
    leases: state.leases.filter((l) => !leaseIds.has(l.id)),
    payments: state.payments.filter((p) => !leaseIds.has(p.leaseId)),
    expenses: state.expenses.filter((e) => e.propertyId !== propertyId),
    tickets: state.tickets.filter((t) => t.propertyId !== propertyId),
    documents: state.documents.filter(
      (d) =>
        d.propertyId !== propertyId &&
        !(d.tenantId && tenantIds.has(d.tenantId)),
    ),
    onboardings: state.onboardings.filter((o) => !tenantIds.has(o.tenantId)),
    protocols: state.protocols.filter((p) => p.propertyId !== propertyId),
    withdrawals: state.withdrawals.filter((w) => w.propertyId !== propertyId),
    tasks: social.tasks.filter((t) => t.relatedPropertyId !== propertyId),
    activityLog: [log, ...state.activityLog],
  };
}

/** Remove a landlord, their properties, and everyone/everything attached to them. */
export function removeLandlord(
  state: DataState,
  landlordId: string,
  log: ActivityLogEntry,
): DataState | null {
  const landlord = state.landlords.find((l) => l.id === landlordId);
  if (!landlord) return null;

  const propertyIds = new Set(
    state.properties.filter((p) => p.landlordId === landlordId).map((p) => p.id),
  );
  for (const id of landlord.propertyIds) propertyIds.add(id);

  const tenantIds = new Set(
    state.tenants
      .filter(
        (t) =>
          propertyIds.has(t.propertyId) ||
          state.properties.some((p) => p.id === t.propertyId && p.landlordId === landlordId),
      )
      .map((t) => t.id),
  );
  for (const p of state.properties) {
    if (p.landlordId === landlordId && p.tenantId) tenantIds.add(p.tenantId);
  }
  for (const lease of state.leases) {
    if (lease.landlordId === landlordId || propertyIds.has(lease.propertyId)) {
      tenantIds.add(lease.tenantId);
      propertyIds.add(lease.propertyId);
    }
  }

  const leaseIds = new Set(
    state.leases
      .filter(
        (l) =>
          l.landlordId === landlordId ||
          propertyIds.has(l.propertyId) ||
          tenantIds.has(l.tenantId),
      )
      .map((l) => l.id),
  );

  const emails = new Set<string>();
  const landlordEmail = emailKey(landlord.email);
  if (landlordEmail) emails.add(landlordEmail);
  for (const t of state.tenants) {
    if (!tenantIds.has(t.id)) continue;
    const email = emailKey(t.email);
    if (email) emails.add(email);
    const secondary = emailKey(t.secondaryEmail);
    if (secondary) emails.add(secondary);
  }

  const userIds = loginUserIds(state.users, { landlordId, tenantIds, emails });
  const social = stripUsers(state, userIds);

  return {
    ...state,
    ...social,
    users: state.users.filter((u) => !userIds.has(u.id)),
    landlords: state.landlords.filter((l) => l.id !== landlordId),
    properties: state.properties.filter((p) => p.landlordId !== landlordId && !propertyIds.has(p.id)),
    tenants: state.tenants.filter((t) => !tenantIds.has(t.id)),
    leases: state.leases.filter((l) => !leaseIds.has(l.id)),
    payments: state.payments.filter((p) => !leaseIds.has(p.leaseId)),
    expenses: state.expenses.filter((e) => e.landlordId !== landlordId && !(e.propertyId && propertyIds.has(e.propertyId))),
    tickets: state.tickets.filter((t) => !propertyIds.has(t.propertyId)),
    documents: state.documents.filter(
      (d) =>
        d.landlordId !== landlordId &&
        !(d.propertyId && propertyIds.has(d.propertyId)) &&
        !(d.tenantId && tenantIds.has(d.tenantId)),
    ),
    onboardings: state.onboardings.filter((o) => !tenantIds.has(o.tenantId)),
    protocols: state.protocols.filter((p) => !propertyIds.has(p.propertyId)),
    withdrawals: state.withdrawals.filter(
      (w) => w.landlordId !== landlordId && !(w.propertyId && propertyIds.has(w.propertyId)),
    ),
    tasks: social.tasks.filter((t) => !t.relatedPropertyId || !propertyIds.has(t.relatedPropertyId)),
    activityLog: [log, ...state.activityLog],
  };
}

/** Remove the signed-in login and the personal data tied to that account. */
export function removeOwnAccount(
  state: DataState,
  userId: string,
  log: ActivityLogEntry,
): DataState | null {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return null;

  if (user.tenantId) {
    const otherTenantLogins = state.users.filter(
      (u) => u.id !== userId && u.tenantId === user.tenantId && u.role === "tenant",
    );
    if (otherTenantLogins.length === 0) {
      const next = removeTenant(state, user.tenantId, log);
      if (next) return next;
    }
  }
  if (user.landlordId) {
    const next = removeLandlord(state, user.landlordId, log);
    if (next) return next;
  }

  const userIds = new Set([userId]);
  const social = stripUsers(state, userIds);
  return {
    ...state,
    ...social,
    users: state.users.filter((u) => u.id !== userId),
    professionals: user.professionalId
      ? state.professionals.filter((p) => p.id !== user.professionalId)
      : state.professionals,
    tickets: user.professionalId
      ? state.tickets.map((t) =>
          t.assignedProfessionalId === user.professionalId
            ? { ...t, assignedProfessionalId: undefined }
            : t,
        )
      : state.tickets,
    activityLog: [log, ...state.activityLog],
  };
}

/**
 * Drop login accounts whose landlord/tenant row is missing.
 * That leftover occupies the email and blocks creating the person again.
 */
export function removeDanglingLogins(state: DataState): DataState {
  const landlordIds = new Set(state.landlords.map((l) => l.id));
  const tenantIds = new Set(state.tenants.map((t) => t.id));
  const dangling = new Set(
    state.users
      .filter((u) => {
        if (u.landlordId && !landlordIds.has(u.landlordId)) return true;
        if (u.tenantId && !tenantIds.has(u.tenantId)) return true;
        return false;
      })
      .map((u) => u.id),
  );
  if (dangling.size === 0) return state;
  const social = stripUsers(state, dangling);
  return {
    ...state,
    ...social,
    users: state.users.filter((u) => !dangling.has(u.id)),
  };
}
