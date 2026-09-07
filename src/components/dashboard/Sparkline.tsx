"use client";

import { useId, useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { smoothLinePath, smoothSeries } from "./smooth-path";

export interface SparklineHoverPoint {
  label: string;
  value: number;
}

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
  /** Fill for the end marker; defaults to the stroke color. */
  endDotColor?: string;
  /** 0–1: how far across the viewBox the line reaches. */
  progress?: number;
  /**
   * Month/value samples aligned with `data`. When set, hovering (or dragging)
   * snaps to the nearest sample and shows its label.
   */
  hoverPoints?: SparklineHoverPoint[];
}

function placeholderRise(): number[] {
  const n = 18;
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const s = t * t * (3 - 2 * t);
    return 12 + 88 * s;
  });
}

/**
 * Display series that never falls: running max, plus a small lift when
 * the history is flat so the hero always reads as growth.
 */
function risingDisplaySeries(data: number[]): number[] {
  const source = data.length >= 2 ? data : placeholderRise();
  const out: number[] = [];
  let peak = source[0];
  for (const value of source) {
    peak = Math.max(peak, value);
    out.push(peak);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (last > first) return out;
  const lift = Math.max(Math.abs(first) * 0.12, 1);
  const n = out.length - 1;
  return out.map((value, i) => value + (n === 0 ? lift : (i / n) * lift));
}

function nearestIndex(x: number, points: { x: number }[]): number {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i += 1) {
    const dist = Math.abs(points[i].x - x);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/** CSS pixels — stays circular even when the SVG viewBox is stretched. */
function ChartDot({
  x,
  y,
  vw,
  vh,
  size,
  fill,
  ring,
}: {
  x: number;
  y: number;
  vw: number;
  vh: number;
  size: number;
  fill: string;
  ring?: string;
}) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `${(x / vw) * 100}%`,
        top: `${(y / vh) * 100}%`,
        transform: "translate(-50%, -50%)",
        backgroundColor: fill,
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
    />
  );
}

/** Minimal wave chart used under the hero income metric. */
export function Sparkline({
  data,
  className,
  color = "var(--navy)",
  fillOpacity = 0.08,
  showStartDot = false,
  startDotColor,
  endDotColor,
  progress = 1,
  hoverPoints,
}: SparklineProps) {
  const uid = useId().replace(/:/g, "");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const series = smoothSeries(risingDisplaySeries(data));
  const w = 320;
  const h = 48;
  const padY = 6;
  const padX = 6;
  const span = Math.min(1, Math.max(0.18, progress));
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const innerW = (w - padX * 2) * span;

  const points = series.map((v, i) => {
    const x = padX + (i / (series.length - 1)) * innerW;
    const y = h - padY - ((v - min) / range) * (h - padY * 2);
    return { x, y };
  });

  const line = smoothLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  const area = `${line} L ${last.x.toFixed(2)} ${h} L ${first.x.toFixed(2)} ${h} Z`;
  const fade = span < 0.98;
  const fadeId = `spark-fade-${uid}`;
  const maskId = `spark-mask-${uid}`;
  const samples = hoverPoints && hoverPoints.length > 0 ? hoverPoints : null;
  const interactive = samples != null;
  const active =
    interactive && hoverIndex != null ? points[hoverIndex] : undefined;
  const activeSample =
    samples && hoverIndex != null
      ? (samples[hoverIndex] ?? samples[0])
      : undefined;

  const setFromPointer = (clientX: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = ((clientX - rect.left) / rect.width) * w;
    setHoverIndex(nearestIndex(x, points));
  };

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={cn("h-full w-full", interactive && "cursor-crosshair")}
        preserveAspectRatio="none"
        aria-hidden={!interactive}
        role={interactive ? "img" : undefined}
        aria-label={interactive ? "גרף הכנסה חודשית לפי חודש" : undefined}
        onPointerMove={
          interactive
            ? (e) => setFromPointer(e.clientX, e.currentTarget)
            : undefined
        }
        onPointerLeave={interactive ? () => setHoverIndex(null) : undefined}
        style={interactive ? { touchAction: "none" } : undefined}
      >
        {fade && (
          <defs>
            <linearGradient
              id={fadeId}
              gradientUnits="userSpaceOnUse"
              x1={first.x}
              y1="0"
              x2={last.x}
              y2="0"
            >
              <stop offset="0%" stopColor="white" />
              <stop offset="70%" stopColor="white" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <mask id={maskId}>
              <rect x="0" y="0" width={w} height={h} fill={`url(#${fadeId})`} />
            </mask>
          </defs>
        )}
        {interactive && <rect x="0" y="0" width={w} height={h} fill="transparent" />}
        <g mask={fade ? `url(#${maskId})` : undefined}>
          <path d={area} fill={color} fillOpacity={fillOpacity} />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="nonScalingStroke"
          />
        </g>
      </svg>
      {showStartDot && (
        <ChartDot
          x={first.x}
          y={first.y}
          vw={w}
          vh={h}
          size={8}
          fill={startDotColor ?? color}
        />
      )}
      <ChartDot
        x={last.x}
        y={last.y}
        vw={w}
        vh={h}
        size={8}
        fill={endDotColor ?? color}
      />
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 w-px opacity-55"
          style={{
            left: `${(active.x / w) * 100}%`,
            transform: "translateX(-50%)",
            backgroundImage: `repeating-linear-gradient(${color} 0 3px, transparent 3px 6px)`,
          }}
        />
      )}
      {active && (
        <ChartDot
          x={active.x}
          y={active.y}
          vw={w}
          vh={h}
          size={11}
          fill={color}
          ring="#fff"
        />
      )}
      {active && activeSample && (
        <div
          dir="rtl"
          className="pointer-events-none absolute z-10 flex items-center gap-1 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-[0.65rem] font-bold leading-tight text-navy shadow-sm"
          style={{
            left: `${Math.min(86, Math.max(14, (active.x / w) * 100))}%`,
            top: `${(active.y / h) * 100}%`,
            transform: "translate(-50%, calc(-100% - 0.45rem))",
          }}
        >
          <span>{activeSample.label}</span>
          <span aria-hidden>·</span>
          <span dir="ltr">{formatCurrency(activeSample.value)}</span>
        </div>
      )}
    </div>
  );
}
