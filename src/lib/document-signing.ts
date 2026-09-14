import type { AppDocument } from "@/types";

export function isAwaitingSignature(doc: AppDocument): boolean {
  if (doc.signed) return false;
  return (doc.status ?? "draft") === "awaiting_signature";
}

/** Recipient may sign only an awaiting doc addressed to them (legacy rows without owner stay open). */
export function canSignDocument(doc: AppDocument, userId?: string | null): boolean {
  if (!isAwaitingSignature(doc)) return false;
  if (!userId) return false;
  if (doc.ownerUserId && doc.ownerUserId !== userId) return false;
  return true;
}
