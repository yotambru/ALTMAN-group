import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  /** Filled orange treatment for the primary quick action. */
  highlight?: boolean;
  className?: string;
}

/** Quick-action tile: plain centered line icon, bold title, muted subtitle. */
export function ActionCard({
  icon: Icon,
  title,
  subtitle,
  onClick,
  highlight = false,
  className,
}: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-[var(--radius)] px-3 py-4 text-center transition-all focus-visible:shadow",
        highlight
          ? "bg-orange text-white shadow-sm hover:bg-orange-dark"
          : "card hover:shadow",
        className,
      )}
    >
      <Icon
        className={cn("h-6 w-6", highlight ? "text-white" : "text-navy")}
        strokeWidth={1.8}
      />
      <span
        className={cn(
          "text-[0.82rem] font-bold leading-tight",
          highlight ? "text-white" : "text-navy",
        )}
      >
        {title}
      </span>
      {subtitle && (
        <span
          className={cn(
            "text-[0.66rem] leading-snug",
            highlight ? "text-white/85" : "text-text-muted",
          )}
        >
          {subtitle}
        </span>
      )}
    </button>
  );
}
