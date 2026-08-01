import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-ink-100 bg-white shadow-soft", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-4 p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-base font-bold tracking-[-0.015em] text-ink-950", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-2", className)} {...props} />;
}

export function Avatar({ initials, tone = "forest", className }: { initials: string; tone?: "forest" | "mango" | "coral" | "blue"; className?: string }) {
  const tones = { forest: "bg-forest-100 text-forest-800", mango: "bg-mango-100 text-mango-700", coral: "bg-coral-100 text-coral-600", blue: "bg-blue-100 text-blue-700" };
  return <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xs font-extrabold", tones[tone], className)}>{initials}</span>;
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="mb-4 flex items-end justify-between gap-4"><div>{eyebrow && <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-forest-600">{eyebrow}</p>}<h2 className="font-display text-xl font-bold tracking-[-0.025em] text-ink-950">{title}</h2></div>{action}</div>;
}
