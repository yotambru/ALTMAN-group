import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "neutral" | "navy" | "danger";

interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
}

const toneStyles: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-orange-soft text-orange-dark",
  neutral: "bg-surface-muted text-text-muted",
  navy: "bg-navy/10 text-navy",
  danger: "bg-[#fdecea] text-danger",
};

export function StatusBadge({
  children,
  tone = "neutral",
  icon,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        toneStyles[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
