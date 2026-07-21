import { cn } from "@/lib/utils";

interface DashboardHeroProps {
  title: string;
  subtitle?: string;
  tone?: "navy" | "light";
  underline?: boolean;
  className?: string;
}

/** Large dashboard title block with optional orange underline accent. */
export function DashboardHero({
  title,
  subtitle,
  tone = "navy",
  underline = false,
  className,
}: DashboardHeroProps) {
  const isNavy = tone === "navy";
  return (
    <div className={cn("px-4 text-center", className)}>
      <h1
        className={cn(
          "text-3xl font-extrabold tracking-tight",
          isNavy ? "text-white" : "text-navy",
        )}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={cn(
            "mt-1 text-sm font-medium",
            isNavy ? "text-white/80" : "text-text-muted",
          )}
        >
          {subtitle}
        </p>
      )}
      {underline && (
        <span className="mt-3 inline-block h-1 w-14 rounded-full bg-orange" />
      )}
    </div>
  );
}
