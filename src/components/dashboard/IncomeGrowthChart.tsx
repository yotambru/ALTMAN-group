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
  const h = 148;
  const padX = 16;
  const padTop = 28;
  const padBottom = 32;
  const values = points.map((p) => p.monthlyIncome);
  const min = Math.min(...values) * 0.85;
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

  const last = points.at(-1)!;
  const growth = last.incomeGrowthPercent;

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy">גידול בהכנסות מאז ההצטרפות</p>
          <p className="mt-0.5 text-xs text-text-muted">
            דמי שכירות לפי תקופה — מיום ההצטרפות ועד היום
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
          className="mt-3 h-36 w-full"
          role="img"
          aria-label="גרף גידול בהכנסות ממועד ההצטרפות"
        >
          {bars.map((b, i) => (
            <g key={b.date}>
              <rect
                x={b.x}
                y={b.y}
                width={barW}
                height={Math.max(b.barH, 8)}
                rx={6}
                fill={i === bars.length - 1 ? "var(--orange)" : "var(--navy)"}
                opacity={i === bars.length - 1 ? 1 : 0.75}
              />
              <text
                x={b.x + barW / 2}
                y={Math.max(12, b.y - 6)}
                textAnchor="middle"
                className="fill-[var(--navy)]"
                fontSize="9"
                fontWeight="700"
              >
                {formatCurrency(b.monthlyIncome)}
              </text>
              <text
                x={b.x + barW / 2}
                y={h - 8}
                textAnchor="middle"
                className="fill-[var(--text-muted)]"
                fontSize="10"
              >
                {i === 0 ? "הצטרפות" : i === bars.length - 1 ? "היום" : String(b.year)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
        {points.map((p, i) => (
          <li key={p.date} className="flex items-center justify-between text-xs">
            <span className="text-text-muted">
              {i === 0
                ? `הצטרפות · ${formatMonthYear(p.date)}`
                : i === points.length - 1
                  ? `היום · ${formatMonthYear(p.date)}`
                  : formatMonthYear(p.date)}
            </span>
            <span className="font-bold tabular-nums text-navy">
              {formatCurrency(p.monthlyIncome)}
              {i > 0 && (
                <span className="ms-1.5 font-medium text-success">
                  {p.incomeGrowthPercent >= 0 ? "+" : ""}
                  {formatPercent(p.incomeGrowthPercent)}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
