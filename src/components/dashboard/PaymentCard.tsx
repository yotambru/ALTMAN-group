import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  /** Renders the value in orange to emphasize amounts/dates. */
  emphasize?: boolean;
  className?: string;
}

/** Info tile for a payment amount or date. Label top, value center, note bottom. */
export function PaymentCard({
  icon: Icon,
  label,
  value,
  sublabel,
  emphasize = true,
  className,
}: PaymentCardProps) {
  return (
    <div className={cn("card flex flex-col gap-2 p-4 text-center", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text">{label}</span>
        <Icon className="h-5 w-5 text-orange" />
      </div>
      <span
        className={cn(
          "text-2xl font-extrabold leading-none",
          emphasize ? "text-orange" : "text-navy",
        )}
      >
        {value}
      </span>
      {sublabel && <span className="text-xs text-text-muted">{sublabel}</span>}
    </div>
  );
}
