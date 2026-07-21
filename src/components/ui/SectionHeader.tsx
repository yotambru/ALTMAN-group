import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  /** Optional trailing action rendered at the start (left in RTL). */
  action?: React.ReactNode;
  className?: string;
}

/** Section title with the brand orange accent bar (right side in RTL). */
export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
        <span className="inline-block h-5 w-1.5 rounded-full bg-orange" />
        {title}
      </h2>
      {action}
    </div>
  );
}
