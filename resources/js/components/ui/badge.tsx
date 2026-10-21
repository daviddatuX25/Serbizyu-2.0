import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
                secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
                destructive:
                    'bg-red-50 text-red-600 border-red-200/60 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60',
                outline:
                    'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
                ghost: 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
                link: 'text-primary underline-offset-4 hover:underline',
                royal: 'bg-royal-50 text-royal-950 border-royal-200/60 dark:bg-royal-950 dark:text-royal-300 dark:border-royal-800',
                navy: 'bg-royal-50 text-royal-950 border-royal-200/60 dark:bg-royal-950 dark:text-royal-300 dark:border-royal-800',
                forest: 'bg-forest-50 text-forest-700 border-forest-200/60 dark:bg-forest-950 dark:text-forest-300 dark:border-forest-800',
                success:
                    'bg-forest-50 text-forest-700 border-forest-200/60 dark:bg-forest-950 dark:text-forest-300 dark:border-forest-800',
                warm: 'bg-mango-50 text-mango-600 border-mango-200/60 dark:bg-mango-950/40 dark:text-mango-300 dark:border-mango-800/60',
                warning:
                    'bg-mango-50 text-mango-600 border-mango-200/60 dark:bg-mango-950/40 dark:text-mango-300 dark:border-mango-800/60',
                coral: 'bg-coral-50 text-coral-600 border-coral-200/60 dark:bg-coral-950/40 dark:text-coral-300 dark:border-coral-800/60',
                danger: 'bg-red-50 text-red-600 border-red-200/60 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60',
                error: 'bg-red-50 text-red-600 border-red-200/60 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60',
                info: 'bg-forest-50 text-forest-600 border-forest-200/60 dark:bg-forest-950 dark:text-forest-300 dark:border-forest-800',
                neutral: 'bg-muted text-muted-foreground border-border/60',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

export type BadgeTone =
    | 'neutral'
    | 'success'
    | 'warning'
    | 'danger'
    | 'error'
    | 'info'
    | 'forest'
    | 'warm'
    | 'coral'
    | 'royal'
    | 'navy';

export interface BadgeProps
    extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
    asChild?: boolean;
    tone?: BadgeTone;
}

function Badge({ className, variant = 'default', tone, asChild = false, ...props }: BadgeProps) {
    const Comp = asChild ? Slot.Root : 'span';
    const effectiveVariant = tone || variant;

    return (
        <Comp
            data-slot="badge"
            data-variant={effectiveVariant}
            className={cn(
                badgeVariants({
                    variant: effectiveVariant as VariantProps<typeof badgeVariants>['variant'],
                }),
                className,
            )}
            {...props}
        />
    );
}

export { Badge, badgeVariants };
