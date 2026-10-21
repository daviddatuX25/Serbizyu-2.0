import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:scale-[0.97] transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/95',
                primary:
                    'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/95',
                warm: 'bg-mango-400 text-ink font-semibold shadow-xs border-mango-400/30 hover:bg-mango-500 active:bg-mango-600 active:text-ink',
                royal: 'bg-[#0F2F58] text-white shadow-xs hover:bg-[#091E38] active:bg-[#061528]',
                navy: 'bg-[#0F2F58] text-white shadow-xs hover:bg-[#091E38] active:bg-[#061528]',
                forest: 'bg-forest-600 text-white shadow-xs hover:bg-forest-700 active:bg-forest-800',
                success:
                    'bg-forest-50 text-forest-700 border-forest-200/60 hover:bg-forest-100 active:bg-forest-200',
                outline:
                    'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
                secondary:
                    'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
                ghost: 'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
                destructive:
                    'bg-red-600 text-white shadow-xs hover:bg-red-700 focus-visible:border-red-500/40 focus-visible:ring-red-500/20 active:bg-red-800',
                danger: 'bg-red-600 text-white shadow-xs hover:bg-red-700 focus-visible:border-red-500/40 focus-visible:ring-red-500/20 active:bg-red-800',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-9 gap-2 px-3.5',
                xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
                sm: "h-8 gap-1.5 rounded-[min(var(--radius-md),12px)] px-3 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
                lg: 'h-11 min-h-[44px] gap-2 px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
                touch: 'h-11 min-h-[44px] gap-2 px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
                icon: 'size-9',
                'icon-xs':
                    "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
                'icon-sm':
                    'size-8 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
                'icon-lg': 'size-11 min-h-[44px] min-w-[44px]',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export interface ButtonProps
    extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    loading?: boolean;
    wide?: boolean;
}

function Button({
    className,
    variant = 'default',
    size = 'default',
    asChild = false,
    loading = false,
    wide = false,
    disabled,
    children,
    ...props
}: ButtonProps) {
    const Comp = asChild ? Slot.Root : 'button';

    return (
        <Comp
            data-slot="button"
            data-variant={variant}
            data-size={size}
            className={cn(
                buttonVariants({ variant, size, className }),
                wide && 'w-full',
                loading && 'cursor-wait opacity-80',
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className="inline-flex items-center gap-2">
                    <svg
                        className="size-4 animate-spin text-current"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <span>{typeof children === 'string' ? 'Working…' : children}</span>
                </span>
            ) : (
                children
            )}
        </Comp>
    );
}

export { Button, buttonVariants };
