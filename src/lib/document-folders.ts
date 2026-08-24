import type { AppDocument, DocumentFolder, DocumentType } from "@/types";

export const ROOT_DOCUMENT_FOLDERS: DocumentFolder[] = [
  "lease",
  "id_photos",
  "meter_photos",
  "appendices",
  "entry_protocol",
];

export const DOCUMENT_FOLDER_LABEL: Record<DocumentFolder, string> = {
  lease: "הסכם שכירות",
  lease_renewal: "חידוש הסכם שכירות",
  id_photos: "צילומי ת״ז",
  guarantor_id: "צילומי ת״ז ערבים",
  meter_photos: "צילומי מונים",
  appendices: "נספחים",
  entry_protocol: "פרוטוקול כניסה",
};

export function isDocumentFolder(value: string | undefined | null): value is DocumentFolder {
  return Boolean(value && value in DOCUMENT_FOLDER_LABEL);
}

export const DOCUMENT_FOLDER_CHILD: Partial<Record<DocumentFolder, DocumentFolder>> = {
  lease: "lease_renewal",
  id_photos: "guarantor_id",
};

export const DOCUMENT_FOLDER_PARENT: Partial<Record<DocumentFolder, DocumentFolder>> = {
  lease_renewal: "lease",
  guarantor_id: "id_photos",
};

/** Ancestor folders from the root down to the immediate parent (empty at a root folder). */
export function documentFolderAncestors(folder: DocumentFolder): DocumentFolder[] {
  const ancestors: DocumentFolder[] = [];
  let current = DOCUMENT_FOLDER_PARENT[folder];
  while (current) {
    ancestors.unshift(current);
    current = DOCUMENT_FOLDER_PARENT[current];
  }
  return ancestors;
}

const FOLDER_TYPE: Record<DocumentFolder, DocumentType> = {
  lease: "contract",
  lease_renewal: "contract",
  id_photos: "id",
  guarantor_id: "id",
  meter_photos: "id",
  appendices: "approval",
  entry_protocol: "protocol",
};

export function folderToDocumentType(folder: DocumentFolder): DocumentType {
  return FOLDER_TYPE[folder];
}

export function inferDocumentFolder(
  doc: Pick<AppDocument, "type" | "name" | "folder">,
): DocumentFolder {
  if (doc.folder) return doc.folder;
  const name = doc.name;
  if (doc.type === "contract") {
    return /חידוש/.test(name) ? "lease_renewal" : "lease";
  }
  if (doc.type === "id") {
    return /ערב/.test(name) ? "guarantor_id" : "id_photos";
  }
  if (doc.type === "protocol") return "entry_protocol";
  if (/מונה/.test(name)) return "meter_photos";
  return "appendices";
}

export function docsInFolder(docs: AppDocument[], folder: DocumentFolder): AppDocument[] {
  return docs.filter((d) => inferDocumentFolder(d) === folder);
}

export function folderCount(docs: AppDocument[], folder: DocumentFolder): number {
  const child = DOCUMENT_FOLDER_CHILD[folder];
  return docsInFolder(docs, folder).length + (child ? docsInFolder(docs, child).length : 0);
}

/** Keep original order, but send empty folders (count 0) to the end. */
export function emptyFoldersLast<T extends { count: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => Number(a.count === 0) - Number(b.count === 0));
}
