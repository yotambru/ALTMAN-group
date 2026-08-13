import { cn, formatCurrency } from "@/lib/utils";
import { formatPercent, type YieldPoint } from "@/lib/portfolio";

interface IncomeGrowthChartProps {
  points: YieldPoint[];
  className?: string;
}

/**
 * Yearly rental-income growth chart (management start → today).
 * Uses the same reconstructed series as yield history.
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
  const padTop = 18;
  const padBottom = 30;
  const values = points.map((p) => p.annualIncome);
  const min = Math.min(...values) * 0.92;
  const max = Math.max(...values);
  const range = max - min || 1;
  const gap = 10;
  const barW = Math.min(36, (w - padX * 2 - gap * (points.length - 1)) / points.length);

  const bars = points.map((p, i) => {
    const x = padX + i * ((w - padX * 2) / points.length) + ((w - padX * 2) / points.length - barW) / 2;
    const barH = ((p.annualIncome - min) / range) * (h - padTop - padBottom);
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
          <p className="text-sm font-semibold text-navy">גידול בהכנסות לפי שנה</p>
          <p className="mt-0.5 text-xs text-text-muted">הכנסה שנתית מצטברת מאז תחילת הניהול</p>
        </div>
        <div className="text-end">
          <p className="text-lg font-extrabold text-orange">{formatCurrency(last.annualIncome)}</p>
          <p className="text-[0.7rem] font-medium text-success">
            {growth >= 0 ? "+" : ""}
            {formatPercent(growth)} מההתחלה
          </p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-3 h-32 w-full"
        role="img"
        aria-label="גרף גידול בהכנסות לפי שנים"
      >
        {bars.map((b, i) => (
          <g key={b.year}>
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
              y={h - 8}
              textAnchor="middle"
              className="fill-[var(--text-muted)]"
              fontSize="10"
            >
              {b.year}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-1 flex justify-between text-[0.7rem] text-text-muted">
        <span>
          {first.year}: {formatCurrency(first.annualIncome)}
        </span>
        <span>
          {last.year}: {formatCurrency(last.annualIncome)}
        </span>
      </div>
    </div>
  );
}
