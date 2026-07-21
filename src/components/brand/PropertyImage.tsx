import type { PropertyImageId } from "@/types";
import { cn } from "@/lib/utils";

interface PropertyImageProps {
  variant: PropertyImageId;
  className?: string;
  rounded?: string;
}

/**
 * Clean, self-contained SVG placeholders for property imagery.
 * Avoids dependence on remote image URLs while keeping a real-estate feel.
 */
export function PropertyImage({
  variant,
  className,
  rounded = "rounded-xl",
}: PropertyImageProps) {
  const palettes: Record<PropertyImageId, [string, string, string]> = {
    tower: ["#1f3f7a", "#2f5aa8", "#dbe6fb"],
    residential: ["#2b6cb0", "#4a90d9", "#e3eefb"],
    boutique: ["#3a5a8c", "#5c7fb5", "#e8eef8"],
    garden: ["#2f7d5b", "#4aa37a", "#e2f3ea"],
  };
  const [dark, mid, sky] = palettes[variant];

  return (
    <div className={cn("overflow-hidden", rounded, className)}>
      <svg
        viewBox="0 0 160 120"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        role="img"
        aria-label="תצלום נכס"
      >
        <defs>
          <linearGradient id={`sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sky} />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
        <rect width="160" height="120" fill={`url(#sky-${variant})`} />
        {/* back building */}
        <rect x="10" y="42" width="42" height="78" fill={mid} opacity="0.85" />
        {/* main tower */}
        <rect x="56" y="24" width="52" height="96" fill={dark} />
        {/* side building */}
        <rect x="112" y="52" width="40" height="68" fill={mid} />
        {/* windows */}
        {Array.from({ length: 6 }).map((_, r) =>
          Array.from({ length: 3 }).map((_, c) => (
            <rect
              key={`m-${r}-${c}`}
              x={62 + c * 15}
              y={32 + r * 13}
              width="9"
              height="8"
              fill="#ffffff"
              opacity={0.75}
              rx="1"
            />
          )),
        )}
        {Array.from({ length: 5 }).map((_, r) =>
          Array.from({ length: 2 }).map((_, c) => (
            <rect
              key={`s-${r}-${c}`}
              x={118 + c * 16}
              y={60 + r * 11}
              width="10"
              height="7"
              fill="#ffffff"
              opacity={0.6}
              rx="1"
            />
          )),
        )}
        {variant === "garden" && (
          <g>
            <circle cx="30" cy="112" r="14" fill="#3f9a6f" />
            <circle cx="46" cy="114" r="10" fill="#54b184" />
          </g>
        )}
      </svg>
    </div>
  );
}
