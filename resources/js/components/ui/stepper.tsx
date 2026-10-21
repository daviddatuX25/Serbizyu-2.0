import * as React from 'react';
import { cn } from '@/lib/utils';

export interface StepperProps extends React.ComponentProps<'div'> {
    steps: string[];
    current: number;
}

function Stepper({ steps, current, className, ...props }: StepperProps) {
    return (
        <div
            className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}
            aria-label="Progress"
            {...props}
        >
            {steps.map((step, index) => {
                const complete = index < current;
                const active = index === current;
                return (
                    <div
                        key={step}
                        className={cn(
                            'flex min-h-11 items-center gap-2 border-b-2 pb-2 text-xs font-semibold transition-colors duration-150',
                            complete || active
                                ? 'border-primary text-foreground'
                                : 'border-border text-muted-foreground',
                        )}
                    >
                        <span
                            className={cn(
                                'grid size-7 place-items-center rounded-md font-mono text-[0.65rem] font-bold transition-[transform,background-color,color] duration-150',
                                complete || active
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-muted text-muted-foreground',
                            )}
                        >
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="truncate">{step}</span>
                    </div>
                );
            })}
        </div>
    );
}

export { Stepper };
