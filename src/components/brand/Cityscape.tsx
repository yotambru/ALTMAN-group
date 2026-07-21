import { cn } from "@/lib/utils";

/**
 * Decorative navy real-estate backdrop (buildings silhouette) used behind
 * hero areas. Pure SVG so it never depends on remote images.
 */
export function Cityscape({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-b from-navy-light via-navy to-navy-dark" />
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full opacity-25"
        aria-hidden
      >
        <g fill="#ffffff">
          {[
            [10, 150, 46, 150],
            [62, 90, 40, 210],
            [108, 130, 52, 170],
            [166, 60, 44, 240],
            [216, 110, 48, 190],
            [270, 40, 40, 260],
            [316, 120, 50, 180],
            [372, 150, 40, 150],
          ].map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} opacity={0.14} />
              {Array.from({ length: Math.floor(h / 26) }).map((_, r) =>
                Array.from({ length: Math.max(1, Math.floor(w / 16)) }).map(
                  (_, c) => (
                    <rect
                      key={`${r}-${c}`}
                      x={x + 5 + c * 14}
                      y={y + 8 + r * 24}
                      width="7"
                      height="10"
                      opacity={0.16}
                    />
                  ),
                ),
              )}
            </g>
          ))}
        </g>
      </svg>
      <div className="absolute inset-0 bg-navy/25" />
    </div>
  );
}
