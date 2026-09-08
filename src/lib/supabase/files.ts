import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

const BUCKET = "uploads";
const SIGNED_TTL_SEC = 60 * 60 * 24 * 7;
const BLOCKED_TYPES = /^(image\/svg|text\/html|application\/xhtml|text\/javascript|application\/javascript)/i;
const BLOCKED_EXT = /^(svg|html|htm|js|mjs|xhtml)$/i;

const signedCache = new Map<string, { url: string; exp: number }>();

function extFromContentType(contentType: string): string {
  const raw = contentType.split("/")[1]?.split("+")[0] ?? "bin";
  if (raw === "jpeg") return "jpg";
  if (raw === "svg+xml" || raw === "svg") return "bin";
  return raw.replace(/[^a-z0-9]/gi, "") || "bin";
}

function isBlockedUpload(contentType: string, ext: string): boolean {
  return BLOCKED_TYPES.test(contentType) || BLOCKED_EXT.test(ext);
}

export function storagePathFromUrl(url: string): string | null {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return null;
  const cleaned = url.split("?")[0] ?? url;
  const markers = [
    `/storage/v1/object/public/${BUCKET}/`,
    `/storage/v1/object/sign/${BUCKET}/`,
    `/storage/v1/object/authenticated/${BUCKET}/`,
  ];
  for (const marker of markers) {
    const index = cleaned.indexOf(marker);
    if (index >= 0) return decodeURIComponent(cleaned.slice(index + marker.length));
  }
  if (!cleaned.includes("://") && !cleaned.startsWith("/")) return cleaned;
  return null;
}

export function canonicalStorageUrl(url: string): string {
  const path = storagePathFromUrl(url);
  const supabase = getSupabase();
  if (!path || !supabase) return url;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return url;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function signedUrlFor(url: string): Promise<string> {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  const path = storagePathFromUrl(url);
  if (!path) return url;
  const now = Date.now();
  const hit = signedCache.get(path);
  if (hit && hit.exp > now + 60_000) return hit.url;
  const supabase = getSupabase();
  if (!supabase) return url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL_SEC);
  if (error || !data?.signedUrl) return url;
  signedCache.set(path, { url: data.signedUrl, exp: now + SIGNED_TTL_SEC * 1000 });
  return data.signedUrl;
}

export async function warmSignedUrls(urls: Array<string | undefined | null>): Promise<void> {
  const unique = [...new Set(urls.filter((u): u is string => Boolean(u)))];
  await Promise.all(unique.map((url) => signedUrlFor(url)));
}

export function cachedSignedUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const path = storagePathFromUrl(url);
  if (!path) return url;
  const hit = signedCache.get(path);
  return hit && hit.exp > Date.now() ? hit.url : url;
}

export function useSignedUrl(url: string | undefined | null): string | undefined {
  const [src, setSrc] = useState<string | undefined>(() => cachedSignedUrl(url) ?? url ?? undefined);
  /* eslint-disable react-hooks/set-state-in-effect -- resolve private storage URLs */
  useEffect(() => {
    if (!url) {
      setSrc(undefined);
      return;
    }
    const cached = cachedSignedUrl(url);
    if (cached && cached !== url) {
      setSrc(cached);
      return;
    }
    setSrc(cached ?? url);
    void signedUrlFor(url).then(setSrc);
  }, [url]);
  /* eslint-enable react-hooks/set-state-in-effect */
  return src;
}

function parseDataUrl(dataUrl: string): { blob: Blob; contentType: string; ext: string } | null {
  const trimmed = dataUrl.replace(/\s/g, "");
  const comma = trimmed.indexOf(",");
  if (!trimmed.startsWith("data:") || comma < 0) return null;
  const meta = trimmed.slice(5, comma);
  if (!/;base64/i.test(meta)) return null;
  const contentType = meta.split(";")[0] || "application/octet-stream";
  const ext = extFromContentType(contentType);
  if (isBlockedUpload(contentType, ext)) return null;
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

async function canvasToJpeg(
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  maxEdge: number,
  quality: number,
): Promise<Blob | null> {
  const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  paint(ctx, w, h);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

async function compressToJpeg(source: Blob, maxEdge: number, quality: number): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(source);
    const blob = await canvasToJpeg(
      bitmap.width,
      bitmap.height,
      (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      maxEdge,
      quality,
    );
    bitmap.close();
    if (blob) return blob;
  } catch {
    /* Safari / HEIC: fall through to Image() */
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      void canvasToJpeg(
        img.naturalWidth,
        img.naturalHeight,
        (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        maxEdge,
        quality,
      ).then((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob);
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

async function putObject(path: string, body: Blob, contentType: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const ext = path.split(".").pop() ?? "";
  if (isBlockedUpload(contentType, ext)) return null;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });
  if (error) {
    console.error(`[supabase] storage upload ${path}: ${error.message}`);
    return null;
  }
  const canonical = canonicalStorageUrl(path);
  await signedUrlFor(canonical);
  return canonical;
}

function fileExt(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (fromName && !BLOCKED_EXT.test(fromName)) return fromName.replace(/[^a-z0-9]/gi, "") || "bin";
  return extFromContentType(file.type || "application/octet-stream");
}

async function blobForUpload(source: Blob, contentType: string): Promise<{ blob: Blob; contentType: string; ext: string }> {
  if (contentType.startsWith("image/") && !isBlockedUpload(contentType, extFromContentType(contentType))) {
    const compressed = await compressToJpeg(source, 1600, 0.82);
    if (compressed) return { blob: compressed, contentType: "image/jpeg", ext: "jpg" };
  }
  return { blob: source, contentType, ext: extFromContentType(contentType) };
}

/** Upload a data URL to Storage and return the public URL. Leaves http(s) URLs as-is. */
export async function uploadDataUrl(dataUrl: string, pathWithoutExt: string): Promise<string> {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return dataUrl;
  const ready = await blobForUpload(parsed.blob, parsed.contentType);
  const fullPath = `${pathWithoutExt}.${ready.ext}`;
  return (await putObject(fullPath, ready.blob, ready.contentType)) ?? dataUrl;
}

/** Compress images and upload a File. Returns a Storage URL, or null on failure. */
export async function uploadBinaryFile(file: File, pathWithoutExt: string): Promise<string | null> {
  const ext = fileExt(file);
  if (isBlockedUpload(file.type, ext)) return null;
  const ready = await blobForUpload(file, file.type || "application/octet-stream");
  return putObject(`${pathWithoutExt}.${ready.ext}`, ready.blob, ready.contentType);
}

/** Compress and upload an image file. Returns a public Storage URL, or null on failure. */
export async function uploadImageFile(
  file: File,
  pathWithoutExt: string,
  options?: { maxEdge?: number; quality?: number },
): Promise<string | null> {
  const blob = await compressToJpeg(file, options?.maxEdge ?? 720, options?.quality ?? 0.82);
  if (!blob) return null;
  return putObject(`${pathWithoutExt}.jpg`, blob, "image/jpeg");
}

function isEmbedded(value: unknown): boolean {
  return typeof value === "string" && (value.startsWith("data:") || value.startsWith("blob:"));
}

function stillEmbedded(item: Record<string, unknown>): boolean {
  const fields = ["avatarUrl", "fileDataUrl", "photoDataUrl"] as const;
  for (const field of fields) {
    if (isEmbedded(item[field])) return true;
  }
  const protocolPhotos = item.photoDataUrls;
  if (Array.isArray(protocolPhotos) && protocolPhotos.some(isEmbedded)) return true;
  const propertyPhotos = item.photoUrls;
  return Array.isArray(propertyPhotos) && propertyPhotos.some(isEmbedded);
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
  if (key === "properties" && Array.isArray(item.photoUrls)) {
    const stamp = Date.now();
    const photoUrls = await Promise.all(
      (item.photoUrls as string[]).map((url, i) =>
        uploadDataUrl(url, `properties/${id}/${stamp}-${i}`),
      ),
    );
    return { ...item, photoUrls };
  }
  return item;
}

export { stillEmbedded };
