import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  sublabel?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Centered metric card with a liquid-glass surface over the dashboard canvas.
 */
export function MetricCard({
  icon: Icon,
  value,
  label,
  sublabel,
  className,
  onClick,
}: MetricCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "liquid-glass-card flex w-full flex-col items-center gap-2 rounded-[var(--radius)] p-4 text-center backdrop-blur-[22px] backdrop-saturate-150",
        onClick && "transition-shadow hover:shadow-lg",
        className,
      )}
    >
      <Icon className="h-5 w-5 shrink-0 text-navy/80" strokeWidth={1.7} />
      <span className="text-[0.78rem] font-semibold leading-tight text-text-muted">
        {label}
      </span>
      <span className="text-[1.7rem] font-extrabold leading-none tracking-tight text-navy">
        {value}
      </span>
      {sublabel && (
        <span className="text-[0.72rem] leading-tight text-text-muted">
          {sublabel}
        </span>
      )}
    </Comp>
  );
}
