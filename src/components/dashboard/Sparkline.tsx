interface SparklineProps {
  data: number[];
  className?: string;
  /** Stroke color — defaults to navy for Focus Strip. */
  color?: string;
  /** Soft fill under the line. */
  fillOpacity?: number;
  /** Mark the first point (join / start). */
  showStartDot?: boolean;
  /** Fill for the start marker; defaults to the stroke color. */
  startDotColor?: string;
}

/** Minimal wave chart used under the hero income metric. */
export function Sparkline({
  data,
  className,
  color = "var(--navy)",
  fillOpacity = 0.08,
  showStartDot = false,
  startDotColor,
}: SparklineProps) {
  if (data.length < 2) return null;

  const w = 320;
  const h = 48;
  const padY = 6;
  const padX = 6;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * (w - padX * 2);
    const y = h - padY - ((v - min) / range) * (h - padY * 2);
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" aria-hidden>
      <path d={area} fill={color} fillOpacity={fillOpacity} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
      {showStartDot && (
        <circle
          cx={first.x}
          cy={first.y}
          r={3.5}
          fill={startDotColor ?? color}
          stroke={color}
          strokeWidth={1.5}
        />
      )}
      <circle cx={last.x} cy={last.y} r={3.5} fill={color} />
    </svg>
  );
}
