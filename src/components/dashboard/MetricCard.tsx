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
 * Stat card matching the reference: muted label + plain line icon on top,
 * large navy value below. Soft white card with light border.
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
        "card flex w-full flex-col items-center gap-2 p-4 text-center shadow-sm",
        onClick && "transition-shadow hover:shadow",
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
