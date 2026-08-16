import { cn, formatCurrency } from "@/lib/utils";
import { formatPercent, type YieldPoint } from "@/lib/portfolio";

interface YieldGrowthChartProps {
  points: YieldPoint[];
  className?: string;
}

/**
 * Simple SVG chart of portfolio yield % from management start → today.
 * Value is anchored at start so rent growth lifts the yield line.
 */
export function YieldGrowthChart({ points, className }: YieldGrowthChartProps) {
  if (points.length < 2) {
    return (
      <p className="rounded-xl border border-border bg-surface px-3 py-4 text-center text-sm text-text-muted">
        אין עדיין מספיק היסטוריה להצגת גידול בתשואה
      </p>
    );
  }

  const w = 320;
  const h = 120;
  const padX = 8;
  const padTop = 16;
  const padBottom = 28;
  const values = points.map((p) => p.yieldPercent);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * (w - padX * 2);
    const y = padTop + (1 - (p.yieldPercent - min) / range) * (h - padTop - padBottom);
    return { ...p, x, y };
  });

  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${coords.at(-1)!.x.toFixed(1)} ${h - padBottom} L ${coords[0].x.toFixed(1)} ${h - padBottom} Z`;
  const first = coords[0];
  const last = coords.at(-1)!;
  const growth = last.incomeGrowthPercent;

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy">גידול בתשואה</p>
          <p className="mt-0.5 text-xs text-text-muted">
            ממועד ההצטרפות לחברה · לפי מחשבון תשואה (שווי מעוגן ב-3%)
          </p>
        </div>
        <div className="text-end">
          <p className="text-lg font-extrabold text-orange">{formatPercent(last.yieldPercent)}</p>
          <p className="text-[0.7rem] font-medium text-success">
            {growth >= 0 ? "+" : ""}
            {formatPercent(growth)} הכנסה
          </p>
        </div>
      </div>

      <div dir="ltr">
        <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-28 w-full" role="img" aria-label="גרף תשואה ממועד ההצטרפות">
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
          {coords.map((c, i) => (
            <text
              key={c.date}
              x={c.x}
              y={h - 8}
              textAnchor="middle"
              className="fill-[var(--text-muted)]"
              fontSize="10"
            >
              {i === 0 ? "הצטרפות" : c.year}
            </text>
          ))}
        </svg>

        <div className="mt-1 flex justify-between text-[0.7rem] text-text-muted">
          <span>
            הצטרפות {formatPercent(first.yieldPercent)} · {formatCurrency(first.annualIncome)}/שנה
          </span>
          <span>
            היום {formatPercent(last.yieldPercent)} · {formatCurrency(last.annualIncome)}/שנה
          </span>
        </div>
      </div>
    </div>
  );
}
