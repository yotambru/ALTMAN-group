import type { Property } from "@/types";

export interface PropertyKeyCounts {
  apartment: number;
  storage: number;
  mailbox: number;
}

/** Split a concatenated 3-digit intake value such as 211 → 2 / 1 / 1. */
export function splitLegacyKeyCount(value: number): PropertyKeyCounts | null {
  if (!Number.isInteger(value) || value < 100 || value > 999) return null;
  return {
    apartment: Math.floor(value / 100),
    storage: Math.floor((value % 100) / 10),
    mailbox: value % 10,
  };
}

export function propertyKeyCounts(
  property: Pick<Property, "keysApartment" | "keysStorage" | "keysMailbox" | "keysReceived">,
): PropertyKeyCounts | null {
  const hasStructured =
    property.keysApartment != null || property.keysStorage != null || property.keysMailbox != null;
  if (hasStructured) {
    return {
      apartment: property.keysApartment ?? 0,
      storage: property.keysStorage ?? 0,
      mailbox: property.keysMailbox ?? 0,
    };
  }
  if (property.keysReceived == null) return null;
  return splitLegacyKeyCount(property.keysReceived);
}

export function formatPropertyKeys(
  property: Pick<Property, "keysApartment" | "keysStorage" | "keysMailbox" | "keysReceived">,
): string {
  const counts = propertyKeyCounts(property);
  if (counts) {
    return `${counts.apartment} לדירה · ${counts.storage} למחסן · ${counts.mailbox} לדואר`;
  }
  if (property.keysReceived != null && property.keysReceived !== 0) {
    return String(property.keysReceived);
  }
  return "לא הוזן";
}

export function totalKeysReceived(counts: Partial<PropertyKeyCounts>): number | undefined {
  const apartment = counts.apartment ?? 0;
  const storage = counts.storage ?? 0;
  const mailbox = counts.mailbox ?? 0;
  const total = apartment + storage + mailbox;
  return total > 0 ? total : undefined;
}
