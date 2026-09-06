"use client";

import { useId } from "react";
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
  /** Fill for the end marker; defaults to the stroke color. */
  endDotColor?: string;
  /** 0–1: how far across the viewBox the line reaches. */
  progress?: number;
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
}: SparklineProps) {
  const uid = useId().replace(/:/g, "");
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

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" aria-hidden>
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
      <g mask={fade ? `url(#${maskId})` : undefined}>
        <path d={area} fill={color} fillOpacity={fillOpacity} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {showStartDot && (
        <circle
          cx={first.x}
          cy={first.y}
          r={3.5}
          fill={startDotColor ?? color}
          stroke={startDotColor ?? color}
          strokeWidth={1.5}
        />
      )}
      <circle
        cx={last.x}
        cy={last.y}
        r={3.5}
        fill={endDotColor ?? color}
        stroke={endDotColor ?? color}
        strokeWidth={1.5}
      />
    </svg>
  );
}
