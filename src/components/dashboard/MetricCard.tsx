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

/** Compact stat card: orange icon, large value, muted label. */
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
        "card flex flex-col items-center gap-1 px-3 py-4 text-center",
        onClick && "transition-shadow hover:shadow",
        className,
      )}
    >
      <Icon className="mb-1 h-6 w-6 text-orange" strokeWidth={2} />
      <span className="text-2xl font-extrabold leading-none text-navy">
        {value}
      </span>
      <span className="text-xs font-semibold text-text">{label}</span>
      {sublabel && (
        <span className="text-[0.7rem] text-text-muted">{sublabel}</span>
      )}
    </Comp>
  );
}
