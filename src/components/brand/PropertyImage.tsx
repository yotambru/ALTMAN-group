"use client";

import type { PropertyImageId } from "@/types";
import { useSignedUrl } from "@/lib/supabase/files";
import { cn } from "@/lib/utils";

interface PropertyImageProps {
  variant: PropertyImageId;
  /** Uploaded photo URL; falls back to the illustration variant. */
  src?: string;
  className?: string;
  rounded?: string;
  /** Soften for small thumbnails (list rows). */
  muted?: boolean;
}

const SOURCES: Record<PropertyImageId, string> = {
  residential: "/brand/properties/residential.png",
  tower: "/brand/properties/tower.png",
  boutique: "/brand/properties/boutique.png",
  garden: "/brand/properties/garden.png",
};

const ALT: Record<PropertyImageId, string> = {
  residential: "איור נכס מגורים",
  tower: "איור קו רקיע רגוע",
  boutique: "איור בניין בוטיק",
  garden: "איור בית עם גינה",
};

/**
 * Property cover: uploaded photo when available, otherwise a calm illustration.
 */
export function PropertyImage({
  variant,
  src,
  className,
  rounded = "rounded-xl",
  muted = false,
}: PropertyImageProps) {
  const signed = useSignedUrl(src);
  const photo = signed?.trim();
  return (
    <div className={cn("relative overflow-hidden bg-[#f3f0ea]", rounded, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo || SOURCES[variant]}
        alt={photo ? "תמונת נכס" : ALT[variant]}
        className={cn(
          "h-full w-full object-cover object-center",
          muted && !photo && "brightness-[0.99] saturate-[0.92]",
        )}
      />
    </div>
  );
}
