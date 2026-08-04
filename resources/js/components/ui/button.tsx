import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 min-h-[var(--sz-target)] px-4',
    {
        variants: {
            variant: {
                default: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--sz-forest-700)]',
                secondary: 'border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--secondary)]',
                outline: 'border border-[var(--border)] bg-transparent hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
                ghost: 'hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]',
                destructive: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90',
                warm: 'bg-[var(--sz-mango-400)] text-[var(--sz-ink)] hover:opacity-90',
            },
            size: {
                default: 'h-11 px-4 py-2',
                sm: 'h-9 rounded-md px-3',
                lg: 'h-12 rounded-[var(--radius)] px-6',
                icon: 'h-11 w-11',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
    },
);
Button.displayName = 'Button';

export { buttonVariants };
