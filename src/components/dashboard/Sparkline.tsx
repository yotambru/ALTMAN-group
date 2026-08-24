import { smoothLinePath, smoothSeries } from "./smooth-path";

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
  const series = smoothSeries(data);
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  const points = series.map((v, i) => {
    const x = padX + (i / (series.length - 1)) * (w - padX * 2);
    const y = h - padY - ((v - min) / range) * (h - padY * 2);
    return { x, y };
  });

  const line = smoothLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  const area = `${line} L ${last.x.toFixed(2)} ${h} L ${first.x.toFixed(2)} ${h} Z`;

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
