import { cn, formatCurrency, formatMonthYear } from "@/lib/utils";
import { formatPercent, type YieldPoint } from "@/lib/portfolio";

interface IncomeGrowthChartProps {
  points: YieldPoint[];
  className?: string;
}

/**
 * Rental-income chart from join date → today.
 * Bars are monthly rent; height jumps when a lease starts or rent is updated.
 */
export function IncomeGrowthChart({ points, className }: IncomeGrowthChartProps) {
  if (points.length < 2) {
    return (
      <p className="rounded-xl border border-border bg-surface px-3 py-4 text-center text-sm text-text-muted">
        אין עדיין מספיק היסטוריה להצגת גידול בהכנסות
      </p>
    );
  }

  const w = 320;
  const h = 132;
  const padX = 18;
  const padTop = 12;
  const padBottom = 28;
  const values = points.map((p) => p.monthlyIncome);
  const min = Math.min(...values) * 0.88;
  const max = Math.max(...values);
  const range = max - min || 1;
  const slot = (w - padX * 2) / points.length;
  const barW = Math.min(28, Math.max(10, slot * 0.55));

  const bars = points.map((p, i) => {
    const x = padX + i * slot + (slot - barW) / 2;
    const barH = ((p.monthlyIncome - min) / range) * (h - padTop - padBottom);
    const y = h - padBottom - barH;
    return { ...p, x, y, barH };
  });

  const last = points.at(-1)!;
  const first = points[0];
  const growth = last.incomeGrowthPercent;
  const labelEvery = points.length > 6 ? Math.ceil(points.length / 5) : 1;

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-white p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">גידול בהכנסות מאז ההצטרפות</p>
          <p className="mt-0.5 text-xs text-text-muted">
            דמי שכירות לפי תקופה — מיום ההצטרפות ועד היום
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-lg font-extrabold text-orange">{formatCurrency(last.monthlyIncome)}</p>
          <p className="text-[0.7rem] font-medium text-success">
            {growth >= 0 ? "+" : ""}
            {formatPercent(growth)} מאז ההצטרפות
          </p>
        </div>
      </div>

      <div dir="ltr">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="mt-3 h-32 w-full"
          role="img"
          aria-label="גרף גידול בהכנסות ממועד ההצטרפות"
        >
          {bars.map((b, i) => {
            const showTick = i === 0 || i === bars.length - 1 || i % labelEvery === 0;
            return (
              <g key={b.date}>
                <rect
                  x={b.x}
                  y={b.y}
                  width={barW}
                  height={Math.max(b.barH, 6)}
                  rx={5}
                  fill={i === bars.length - 1 ? "var(--orange)" : "var(--navy)"}
                  opacity={i === bars.length - 1 ? 1 : 0.78}
                />
                {showTick && (
                  <text
                    x={b.x + barW / 2}
                    y={h - 8}
                    textAnchor="middle"
                    className="fill-[var(--text-muted)]"
                    fontSize="9"
                  >
                    {i === 0 ? "הצטרפות" : i === bars.length - 1 ? "היום" : String(b.year)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex justify-between gap-3 text-[0.7rem] text-text-muted">
        <span>
          {formatMonthYear(first.date)} · {formatCurrency(first.monthlyIncome)}
        </span>
        <span className="text-end">
          {formatMonthYear(last.date)} · {formatCurrency(last.monthlyIncome)}
        </span>
      </div>
    </div>
  );
}
