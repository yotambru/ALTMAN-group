import { cn, formatCurrency, formatMonthYear } from "@/lib/utils";
import { formatPercent, yearlyChartPoints, type YieldPoint } from "@/lib/portfolio";

interface IncomeGrowthChartProps {
  points: YieldPoint[];
  className?: string;
}

function axisLabel(points: YieldPoint[], index: number): string {
  return String(points[index].year);
}

/**
 * Yearly rental-income bars from join date → today.
 * One column per calendar year so the axis stays readable on a phone.
 */
export function IncomeGrowthChart({ points, className }: IncomeGrowthChartProps) {
  const bars = yearlyChartPoints(points);
  if (bars.length < 2) {
    return (
      <p className="rounded-xl border border-border bg-surface px-3 py-4 text-center text-sm text-text-muted">
        אין עדיין מספיק היסטוריה להצגת גידול בהכנסות
      </p>
    );
  }

  const w = 320;
  const h = 148;
  const padX = 28;
  const padTop = 10;
  const padBottom = 28;
  const values = bars.map((p) => p.monthlyIncome);
  const min = Math.min(...values) * 0.72;
  const max = Math.max(...values);
  const range = max - min || 1;
  const slot = (w - padX * 2) / bars.length;
  const barW = Math.min(36, Math.max(14, slot * 0.58));

  const drawn = bars.map((p, i) => {
    const x = padX + i * slot + (slot - barW) / 2;
    const barH = ((p.monthlyIncome - min) / range) * (h - padTop - padBottom);
    const y = h - padBottom - barH;
    return { ...p, x, y, barH };
  });

  const last = bars.at(-1)!;
  const first = bars[0];
  const growth = last.incomeGrowthPercent;

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-white p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">גידול בהכנסות מאז ההצטרפות</p>
          <p className="mt-0.5 text-xs text-text-muted">
            דמי שכירות בסוף כל שנה — מיום ההצטרפות ועד היום
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
          className="mt-3 h-36 w-full"
          role="img"
          aria-label="גרף גידול בהכנסות ממועד ההצטרפות"
        >
          {drawn.map((b, i) => (
            <g key={b.date}>
              <rect
                x={b.x}
                y={b.y}
                width={barW}
                height={Math.max(b.barH, 6)}
                rx={6}
                fill={i === drawn.length - 1 ? "var(--orange)" : "var(--navy)"}
                opacity={i === drawn.length - 1 ? 1 : 0.82}
              />
              <text
                x={b.x + barW / 2}
                y={h - 8}
                textAnchor="middle"
                className="fill-[var(--text-muted)]"
                fontSize="11"
              >
                {axisLabel(bars, i)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-2 flex justify-between gap-3 text-[0.7rem] text-text-muted">
        <span>
          הצטרפות {formatMonthYear(first.date)} · {formatCurrency(first.monthlyIncome)}
        </span>
        <span className="text-end">
          היום · {formatCurrency(last.monthlyIncome)}
        </span>
      </div>
    </div>
  );
}
