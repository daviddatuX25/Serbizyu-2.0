import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "warm";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-forest-600 text-white shadow-sm shadow-forest-900/10 hover:bg-forest-700 active:bg-forest-800",
  secondary: "bg-ink-950 text-white hover:bg-ink-800",
  outline: "border border-ink-200 bg-white text-ink-800 hover:border-forest-300 hover:bg-forest-50",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-950",
  danger: "bg-coral-50 text-coral-600 ring-1 ring-inset ring-coral-200 hover:bg-coral-100",
  warm: "bg-mango-300 text-ink-950 hover:bg-mango-400",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm rounded-xl",
  md: "min-h-11 px-4 text-sm rounded-xl",
  lg: "min-h-12 px-5 text-[15px] rounded-2xl",
  icon: "h-11 w-11 rounded-xl",
};

export function Button({ className, variant = "primary", size = "md", loading, leftIcon, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-200 disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
    </button>
  );
}
