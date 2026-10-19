import { cn, formatCurrency } from "@/lib/utils";
import { formatPercent, PORTFOLIO_YIELD_RATE, yearlyChartPoints, type YieldPoint } from "@/lib/portfolio";
import { smoothLinePath, smoothSeries } from "./smooth-path";

interface YieldGrowthChartProps {
  points: YieldPoint[];
  className?: string;
}

/** Keep year labels from sitting on top of each other. First and last always stay. */
function visibleYearTicks<T extends { x: number; year: number; date: string }>(coords: T[]): T[] {
  if (coords.length === 0) return [];
  const first = coords[0];
  const last = coords[coords.length - 1];
  const ticks: T[] = [first];
  for (const point of coords.slice(1, -1)) {
    const firstOfYear = coords.findIndex((item) => item.year === point.year) === coords.indexOf(point);
    if (!firstOfYear || point.year === first.year || point.year === last.year) continue;
    const prev = ticks[ticks.length - 1];
    if (point.x - prev.x < 36) continue;
    ticks.push(point);
  }
  if (last !== first) {
    const prev = ticks[ticks.length - 1];
    if (ticks.length > 1 && last.x - prev.x < 36) ticks.pop();
    ticks.push(last);
  }
  return ticks;
}

/**
 * Line of monthly rental income from join date → today.
 * Asset value is implied at 2.8% of annual rent; the line itself is income.
 */
export function YieldGrowthChart({ points, className }: YieldGrowthChartProps) {
  if (points.length < 2) {
    return (
      <p className="rounded-xl border border-border bg-surface px-3 py-4 text-center text-sm text-text-muted">
        אין עדיין מספיק היסטוריה להצגת גידול בהכנסות
      </p>
    );
  }

  const w = 320;
  const h = 120;
  const padX = 8;
  const padTop = 16;
  const padBottom = 28;
  const series = points.length > 12 ? yearlyChartPoints(points) : points;
  const values = smoothSeries(series.map((p) => p.monthlyIncome));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = series.map((p, i) => {
    const x = padX + (i / (series.length - 1)) * (w - padX * 2);
    const y = padTop + (1 - (values[i] - min) / range) * (h - padTop - padBottom);
    return { ...p, x, y };
  });

  const line = smoothLinePath(coords.map((c) => ({ x: c.x, y: c.y })));
  const area = `${line} L ${coords.at(-1)!.x.toFixed(2)} ${h - padBottom} L ${coords[0].x.toFixed(2)} ${h - padBottom} Z`;
  const first = coords[0];
  const last = coords.at(-1)!;
  const growth = last.incomeGrowthPercent;

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy">גרף הכנסות</p>
          <p className="mt-0.5 text-xs text-text-muted">
            ממועד ההצטרפות · שווי נכסים לפי תשואה {formatPercent(PORTFOLIO_YIELD_RATE * 100)}
          </p>
        </div>
        <div className="text-end">
          <p className="text-lg font-extrabold text-orange">{formatCurrency(last.monthlyIncome)}</p>
          <p className="text-[0.7rem] font-medium text-success">
            {growth >= 0 ? "+" : ""}
            {formatPercent(growth)} מאז ההצטרפות
          </p>
        </div>
      </div>

      <div dir="ltr">
        <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-28 w-full" role="img" aria-label="גרף הכנסות ממועד ההצטרפות">
          <path d={area} fill="var(--orange)" fillOpacity={0.12} />
          <path
            d={line}
            fill="none"
            stroke="var(--orange)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={first.x} cy={first.y} r={3.5} fill="var(--navy)" />
          <circle cx={last.x} cy={last.y} r={4} fill="var(--orange)" />
          {visibleYearTicks(coords).map((c) => (
            <text
              key={c.date}
              x={c.x}
              y={h - 8}
              textAnchor="middle"
              className="fill-[var(--text-muted)]"
              fontSize="11"
            >
              {c.date === last.date ? "היום" : String(c.year)}
            </text>
          ))}
        </svg>

        <div className="mt-1 flex justify-between text-[0.7rem] text-text-muted">
          <span>
            הצטרפות {formatCurrency(first.monthlyIncome)} / חודש
          </span>
          <span>
            היום {formatCurrency(last.monthlyIncome)} / חודש
          </span>
        </div>
      </div>
    </div>
  );
}
