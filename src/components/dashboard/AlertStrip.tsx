import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertStripProps {
  title: string;
  onClick?: () => void;
  className?: string;
}

/** Thin critical-alert strip at the top of Focus Strip home. */
export function AlertStrip({ title, onClick, className }: AlertStripProps) {
  const classes = cn(
    "flex w-full items-center gap-2 border-b border-danger/15 bg-[#fdecee] px-4 py-2.5 text-start",
    onClick && "transition-colors hover:bg-[#fbd8dc]",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        <AlertTriangle className="h-4 w-4 shrink-0 text-danger" strokeWidth={2} />
        <span className="min-w-0 flex-1 truncate text-[0.8rem] font-bold text-danger">
          {title}
        </span>
      </button>
    );
  }

  return (
    <div className={classes}>
      <AlertTriangle className="h-4 w-4 shrink-0 text-danger" strokeWidth={2} />
      <span className="min-w-0 flex-1 truncate text-[0.8rem] font-bold text-danger">
        {title}
      </span>
    </div>
  );
}
