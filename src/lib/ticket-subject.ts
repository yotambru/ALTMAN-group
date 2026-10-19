import { propertyAddressLabel } from "@/lib/portfolio";
import type { Property, Tenant, User } from "@/types";

type Place = Pick<Property, "address" | "city" | "apartmentNumber">;
type OpenerTenant = Pick<Tenant, "id" | "fullName">;
type OpenerUser = Pick<User, "id" | "fullName" | "role" | "tenantId">;

/**
 * The tenant who opened the ticket. A manager who files a ticket is not
 * shown as the caller. Seed rows store a tenant id in `createdById`; live
 * rows store the tenant's login id.
 */
export function ticketOpenerName(
  createdById: string | undefined,
  tenants: OpenerTenant[],
  users: OpenerUser[],
): string | undefined {
  if (!createdById) return undefined;
  const user = users.find((item) => item.id === createdById);
  if (user?.role === "tenant") {
    const linked = user.tenantId ? tenants.find((item) => item.id === user.tenantId) : undefined;
    const name = (linked?.fullName || user.fullName).trim();
    return name || undefined;
  }
  const tenant = tenants.find((item) => item.id === createdById);
  const name = tenant?.fullName.trim();
  return name || undefined;
}

/** Street, apartment and city, then the opener: `ספיר 21, דירה 5, כפר סבא · עדי בועז`. */
export function ticketSubjectLine(property: Place | undefined, openerName: string | undefined): string {
  const place = property ? propertyAddressLabel(property) : "";
  if (place && openerName) return `${place} · ${openerName}`;
  return place || openerName || "";
}

export function ticketSubjectFor(
  ticket: { propertyId: string; createdById: string } | undefined,
  properties: (Place & { id: string })[],
  tenants: OpenerTenant[],
  users: OpenerUser[],
): string {
  if (!ticket) return "";
  const property = properties.find((item) => item.id === ticket.propertyId);
  return ticketSubjectLine(property, ticketOpenerName(ticket.createdById, tenants, users));
}
