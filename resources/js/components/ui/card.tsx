import * as React from 'react';

import { cn } from '@/lib/utils';

export interface CardProps extends React.ComponentProps<'div'> {
    size?: 'default' | 'sm';
    surface?: 'default' | 'muted' | 'canvas' | 'surface';
    muted?: boolean;
    interactive?: boolean;
}

function Card({
    className,
    size = 'default',
    surface = 'default',
    muted = false,
    interactive = false,
    ...props
}: CardProps) {
    const isMuted = muted || surface === 'muted';
    const isCanvas = surface === 'canvas';
    const isSurface = surface === 'surface';

    return (
        <div
            data-slot="card"
            data-size={size}
            className={cn(
                'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl border border-border/80 bg-card py-(--card-spacing) text-sm text-card-foreground shadow-xs [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
                isMuted && 'bg-muted/40',
                isCanvas && 'border-ink/10 bg-canvas text-ink',
                isSurface && 'border-forest-100 bg-surface text-ink',
                interactive &&
                    'cursor-pointer transition-[transform,box-shadow,border-color] duration-150 ease-out hover:border-foreground/20 hover:shadow-md active:scale-[0.98]',
                className,
            )}
            {...props}
        />
    );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-header"
            className={cn(
                'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
                className,
            )}
            {...props}
        />
    );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-title"
            className={cn(
                'font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm',
                className,
            )}
            {...props}
        />
    );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-description"
            className={cn('text-sm text-muted-foreground', className)}
            {...props}
        />
    );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-action"
            className={cn(
                'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
                className,
            )}
            {...props}
        />
    );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div data-slot="card-content" className={cn('px-(--card-spacing)', className)} {...props} />
    );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-footer"
            className={cn(
                'flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)',
                className,
            )}
            {...props}
        />
    );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
