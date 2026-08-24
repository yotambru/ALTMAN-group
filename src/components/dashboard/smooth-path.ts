export interface PathPoint {
  x: number;
  y: number;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function gaussianPass(data: number[], radius: number): number[] {
  const n = data.length;
  const sigma = radius / 1.85;
  const twoSigmaSq = 2 * sigma * sigma;
  return data.map((_, i) => {
    let sum = 0;
    let wsum = 0;
    for (let k = -radius; k <= radius; k += 1) {
      const j = Math.min(n - 1, Math.max(0, i + k));
      const w = Math.exp(-(k * k) / twoSigmaSq);
      sum += data[j] * w;
      wsum += w;
    }
    return sum / wsum;
  });
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Ease the first/last stretch into the real endpoints so the line does not kink. */
function easeToEndpoints(smoothed: number[], original: number[]): number[] {
  const n = smoothed.length;
  const out = [...smoothed];
  const fade = Math.min(Math.floor((n - 1) / 2), Math.max(8, Math.round(n * 0.28)));
  if (fade <= 1) {
    out[0] = original[0];
    out[n - 1] = original[n - 1];
    return out;
  }
  for (let i = 0; i < fade; i += 1) {
    const e = smoothstep(i / (fade - 1));
    out[i] = original[0] * (1 - e) + out[i] * e;
    const j = n - 1 - i;
    out[j] = original[n - 1] * (1 - e) + out[j] * e;
  }
  out[0] = original[0];
  out[n - 1] = original[n - 1];
  return out;
}

/**
 * Very heavy smooth. Endpoints stay exact so the start/end dots
 * still match the labeled values; jumps become one long S-curve.
 */
export function smoothSeries(data: number[]): number[] {
  const n = data.length;
  if (n < 3) return data;
  const radius = Math.max(14, Math.round(n * 0.52));
  const blurred = gaussianPass(gaussianPass(data, radius), radius);
  return easeToEndpoints(blurred, data);
}

function downsample(points: PathPoint[], maxPoints: number): PathPoint[] {
  if (points.length <= maxPoints) return points;
  const out: PathPoint[] = [];
  for (let i = 0; i < maxPoints; i += 1) {
    const idx = Math.round((i * (points.length - 1)) / (maxPoints - 1));
    out.push(points[idx]);
  }
  return out;
}

/** Monotone cubic Hermite (no overshoot) as SVG cubics. */
function monotoneCubicPath(points: PathPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  if (points.length === 2) {
    return `M ${fmt(points[0].x)} ${fmt(points[0].y)} L ${fmt(points[1].x)} ${fmt(points[1].y)}`;
  }

  const n = points.length;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1].x - points[i].x;
    m[i] = dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i];
  }

  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    if (m[i - 1] * m[i] <= 0) {
      t[i] = 0;
    } else {
      const dx0 = dx[i - 1];
      const dx1 = dx[i];
      t[i] = (3 * (dx0 + dx1)) / ((2 * dx1 + dx0) / m[i - 1] + (dx1 + 2 * dx0) / m[i]);
    }
  }

  let d = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const k = dx[i] / 1.85;
    d += ` C ${fmt(p0.x + k)} ${fmt(p0.y + t[i] * k)}, ${fmt(p1.x - k)} ${fmt(p1.y - t[i + 1] * k)}, ${fmt(p1.x)} ${fmt(p1.y)}`;
  }
  return d;
}

/** Smooth SVG path through already-placed points. */
export function smoothLinePath(points: PathPoint[]): string {
  return monotoneCubicPath(downsample(points, 8));
}
