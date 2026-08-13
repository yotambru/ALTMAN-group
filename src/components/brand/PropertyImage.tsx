import type { PropertyImageId } from "@/types";
import { cn } from "@/lib/utils";

interface PropertyImageProps {
  variant: PropertyImageId;
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
 * Calm premium illustrations — not photos, not flashy clip-art.
 */
export function PropertyImage({
  variant,
  className,
  rounded = "rounded-xl",
  muted = false,
}: PropertyImageProps) {
  return (
    <div className={cn("relative overflow-hidden bg-[#f3f0ea]", rounded, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SOURCES[variant]}
        alt={ALT[variant]}
        className={cn(
          "h-full w-full object-cover object-center",
          muted && "brightness-[0.99] saturate-[0.92]",
        )}
      />
    </div>
  );
}
