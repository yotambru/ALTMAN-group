import { cn, formatCurrency } from "@/lib/utils";
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
  const padX = 16;
  const padTop = 22;
  const padBottom = 30;
  const values = points.map((p) => p.monthlyIncome);
  const min = Math.min(...values) * 0.92;
  const max = Math.max(...values);
  const range = max - min || 1;
  const gap = 10;
  const barW = Math.min(36, (w - padX * 2 - gap * (points.length - 1)) / points.length);

  const bars = points.map((p, i) => {
    const x = padX + i * ((w - padX * 2) / points.length) + ((w - padX * 2) / points.length - barW) / 2;
    const barH = ((p.monthlyIncome - min) / range) * (h - padTop - padBottom);
    const y = h - padBottom - barH;
    return { ...p, x, y, barH };
  });

  const first = points[0];
  const last = points.at(-1)!;
  const growth = last.incomeGrowthPercent;

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy">גידול בהכנסות מאז ההצטרפות</p>
          <p className="mt-0.5 text-xs text-text-muted">
            דמי שכירות ביום ההצטרפות, ואז בכל עדכון שכירות
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
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="mt-3 h-32 w-full"
          role="img"
          aria-label="גרף גידול בהכנסות ממועד ההצטרפות"
        >
          {bars.map((b, i) => (
            <g key={b.date}>
              <rect
                x={b.x}
                y={b.y}
                width={barW}
                height={Math.max(b.barH, 4)}
                rx={6}
                fill={i === bars.length - 1 ? "var(--orange)" : "var(--navy)"}
                opacity={i === bars.length - 1 ? 1 : 0.75}
              />
              <text
                x={b.x + barW / 2}
                y={Math.max(11, b.y - 4)}
                textAnchor="middle"
                className="fill-[var(--navy)]"
                fontSize="9"
                fontWeight="700"
              >
                {i === 0 ? formatCurrency(b.monthlyIncome) : `${b.incomeGrowthPercent >= 0 ? "+" : ""}${formatPercent(b.incomeGrowthPercent)}`}
              </text>
              <text
                x={b.x + barW / 2}
                y={h - 8}
                textAnchor="middle"
                className="fill-[var(--text-muted)]"
                fontSize="10"
              >
                {i === 0 ? "הצטרפות" : b.year}
              </text>
            </g>
          ))}
        </svg>

        <div className="mt-1 flex justify-between text-[0.7rem] text-text-muted">
          <span>הצטרפות: {formatCurrency(first.monthlyIncome)} / חודש</span>
          <span>היום: {formatCurrency(last.monthlyIncome)} / חודש</span>
        </div>
      </div>
    </div>
  );
}
