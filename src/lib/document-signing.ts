import type { AppDocument } from "@/types";

const SIGNATURE_BREAK = "\n";

export function packSignature(name: string, imageUrl: string): string {
  return imageUrl ? `${name}${SIGNATURE_BREAK}${imageUrl}` : name;
}

export function unpackSignature(signedByName?: string | null): { name: string; imageUrl?: string } {
  if (!signedByName) return { name: "" };
  const nl = signedByName.indexOf(SIGNATURE_BREAK);
  if (nl === -1) return { name: signedByName };
  const name = signedByName.slice(0, nl).trim();
  const imageUrl = signedByName.slice(nl + 1).trim();
  if (imageUrl.startsWith("http") || imageUrl.startsWith("data:")) return { name, imageUrl };
  return { name: signedByName };
}

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
