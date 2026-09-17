import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  /** Optional extra action, opposite the title. */
  action?: React.ReactNode;
  /** Optional action to return to the dashboard. */
  onBack?: () => void;
  className?: string;
}

/** Section title with the brand orange accent bar (right side in RTL). */
export function SectionHeader({ title, action, onBack, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="חזרה לדשבורד"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-sm font-bold text-navy transition-colors hover:bg-orange-soft hover:text-orange"
          >
            חזרה
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
        <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold text-navy">
          <span className="inline-block h-5 w-1.5 shrink-0 rounded-full bg-orange" />
          <span className="truncate">{title}</span>
        </h2>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
