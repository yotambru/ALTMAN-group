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
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    upsert: true,
    contentType,
    cacheControl: "0",
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
  const photos = item.photoDataUrls;
  return Array.isArray(photos) && photos.some(isEmbedded);
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
