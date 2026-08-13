import { getSupabase } from "@/lib/supabase/client";

const BUCKET = "uploads";

function extFromContentType(contentType: string): string {
  const raw = contentType.split("/")[1]?.split("+")[0] ?? "bin";
  if (raw === "jpeg") return "jpg";
  if (raw === "svg") return "svg";
  return raw.replace(/[^a-z0-9]/gi, "") || "bin";
}

function parseDataUrl(dataUrl: string): { blob: Blob; contentType: string; ext: string } | null {
  const trimmed = dataUrl.replace(/\s/g, "");
  const comma = trimmed.indexOf(",");
  if (!trimmed.startsWith("data:") || comma < 0) return null;
  const meta = trimmed.slice(5, comma);
  if (!/;base64/i.test(meta)) return null;
  const contentType = meta.split(";")[0] || "application/octet-stream";
  try {
    const binary = atob(trimmed.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return {
      blob: new Blob([bytes], { type: contentType }),
      contentType,
      ext: extFromContentType(contentType),
    };
  } catch {
    return null;
  }
}

async function compressToJpeg(source: Blob, maxEdge: number, quality: number): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(source);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return source;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((next) => resolve(next), "image/jpeg", quality);
    });
    return blob ?? source;
  } catch {
    return source;
  }
}

async function putObject(path: string, body: Blob, contentType: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });
  if (error) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Upload a data URL to Storage and return the public URL. Leaves http(s) URLs as-is. */
export async function uploadDataUrl(dataUrl: string, pathWithoutExt: string): Promise<string> {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return dataUrl;
  const fullPath = `${pathWithoutExt}.${parsed.ext}`;
  return (await putObject(fullPath, parsed.blob, parsed.contentType)) ?? dataUrl;
}

/** Compress and upload an image file. Returns a public Storage URL, or null on failure. */
export async function uploadImageFile(
  file: File,
  pathWithoutExt: string,
  options?: { maxEdge?: number; quality?: number },
): Promise<string | null> {
  const blob = await compressToJpeg(file, options?.maxEdge ?? 720, options?.quality ?? 0.82);
  return putObject(`${pathWithoutExt}.jpg`, blob, "image/jpeg");
}

function stillEmbedded(item: Record<string, unknown>): boolean {
  const fields = ["avatarUrl", "fileDataUrl", "photoDataUrl"] as const;
  for (const field of fields) {
    const value = item[field];
    if (typeof value === "string" && value.startsWith("data:")) return true;
  }
  const photos = item.photoDataUrls;
  return (
    Array.isArray(photos) &&
    photos.some((url) => typeof url === "string" && url.startsWith("data:"))
  );
}

export async function hydrateFileFields<T extends Record<string, unknown>>(
  key: string,
  item: T,
): Promise<T> {
  const id =
    typeof item.id === "string"
      ? item.id
      : typeof item.tenantId === "string"
        ? item.tenantId
        : "file";

  if (key === "documents" && typeof item.fileDataUrl === "string") {
    const fileDataUrl = await uploadDataUrl(item.fileDataUrl, `documents/${id}`);
    return { ...item, fileDataUrl };
  }
  if (key === "tickets" && typeof item.photoDataUrl === "string") {
    const photoDataUrl = await uploadDataUrl(item.photoDataUrl, `tickets/${id}`);
    return { ...item, photoDataUrl };
  }
  if (key === "users" && typeof item.avatarUrl === "string") {
    const avatarUrl = await uploadDataUrl(item.avatarUrl, `avatars/${id}`);
    return { ...item, avatarUrl };
  }
  if (key === "protocols" && Array.isArray(item.photoDataUrls)) {
    const photoDataUrls = await Promise.all(
      (item.photoDataUrls as string[]).map((url, i) =>
        uploadDataUrl(url, `protocols/${id}/${i}`),
      ),
    );
    return { ...item, photoDataUrls };
  }
  return item;
}

export { stillEmbedded };
