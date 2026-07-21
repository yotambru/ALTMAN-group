import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

/** Square quick-action tile: orange line icon, bold title, muted subtitle. */
export function ActionCard({
  icon: Icon,
  title,
  subtitle,
  onClick,
  className,
}: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "card flex flex-col items-center gap-1.5 px-3 py-4 text-center transition-shadow hover:shadow focus-visible:shadow",
        className,
      )}
    >
      <Icon className="h-6 w-6 text-orange" strokeWidth={2} />
      <span className="text-sm font-bold text-navy leading-tight">{title}</span>
      {subtitle && (
        <span className="text-[0.7rem] leading-snug text-text-muted">
          {subtitle}
        </span>
      )}
    </button>
  );
}
