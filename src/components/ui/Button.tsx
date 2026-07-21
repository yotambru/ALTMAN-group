import { cn } from "@/lib/utils";

type Variant = "primary" | "navy" | "ghost" | "outline";
type Size = "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-orange text-white shadow-sm hover:bg-orange-dark active:translate-y-px",
  navy: "bg-navy text-white hover:bg-navy-dark active:translate-y-px",
  ghost: "bg-surface-muted text-navy hover:bg-border",
  outline: "border border-border bg-surface text-navy hover:bg-surface-muted",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-4 text-sm",
  lg: "h-13 px-5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
