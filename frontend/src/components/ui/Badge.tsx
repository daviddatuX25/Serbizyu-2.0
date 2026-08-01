import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "forest" | "mango" | "coral" | "blue" | "sandbox" | "dark";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  forest: "bg-forest-50 text-forest-700 ring-forest-200",
  mango: "bg-mango-50 text-mango-700 ring-mango-200",
  coral: "bg-coral-50 text-coral-600 ring-coral-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  sandbox: "bg-violet-50 text-violet-700 ring-violet-200",
  dark: "bg-ink-950 text-white ring-ink-900",
};

export function Badge({ tone = "neutral", className, children, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ring-1 ring-inset", tones[tone], className)} {...props}>{children}</span>;
}
