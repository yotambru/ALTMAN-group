import { cn } from "@/lib/utils";

/**
 * Atmospheric navy real-estate backdrop used behind the login hero.
 * Pure SVG — no remote images — with soft glow waves like the reference.
 */
export function Cityscape({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#1c3a78] via-navy to-navy-dark" />

      {/* Soft orange dusk glow */}
      <div
        className="absolute inset-x-0 top-0 h-[55%]"
        style={{
          background:
            "radial-gradient(80% 70% at 70% 20%, rgba(242,106,33,0.28) 0%, rgba(242,106,33,0) 60%)",
        }}
      />

      <svg
        viewBox="0 0 400 420"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {/* Glowing wave arcs (reference-style abstract overlay) */}
        <g fill="none" stroke="#f26a21" strokeWidth="1.2" opacity="0.35">
          <path d="M-20 210 C 80 150, 160 270, 420 180" />
          <path d="M-40 250 C 100 190, 200 310, 440 220" opacity="0.55" />
          <path d="M-10 290 C 120 230, 220 340, 430 260" opacity="0.35" />
        </g>

        {/* Building silhouettes */}
        <g fill="#ffffff">
          {[
            [8, 210, 42, 210],
            [56, 160, 38, 260],
            [100, 190, 48, 230],
            [154, 120, 40, 300],
            [200, 170, 46, 250],
            [252, 95, 38, 325],
            [296, 150, 44, 270],
            [346, 185, 42, 235],
          ].map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} opacity={0.12} />
              {Array.from({ length: Math.floor(h / 28) }).map((_, r) =>
                Array.from({ length: Math.max(1, Math.floor(w / 15)) }).map((_, c) => (
                  <rect
                    key={`${r}-${c}`}
                    x={x + 5 + c * 13}
                    y={y + 10 + r * 26}
                    width="6"
                    height="9"
                    opacity={0.18}
                  />
                )),
              )}
            </g>
          ))}
        </g>
      </svg>

      {/* Bottom vignette so CTAs sit on solid navy */}
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-navy-dark via-navy-dark/90 to-transparent" />
    </div>
  );
}
