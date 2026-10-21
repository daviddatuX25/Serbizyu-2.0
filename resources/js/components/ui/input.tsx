import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.ComponentProps<'input'> {
    inputSize?: 'default' | 'sm' | 'lg' | 'touch';
}

function Input({ className, type, inputSize = 'default', ...props }: InputProps) {
    return (
        <input
            type={type}
            data-slot="input"
            data-size={inputSize}
            className={cn(
                'flex w-full min-w-0 rounded-lg border border-input bg-card/60 px-3 py-1.5 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
                inputSize === 'default' && 'h-9',
                inputSize === 'sm' && 'h-8 px-2.5 text-xs',
                (inputSize === 'lg' || inputSize === 'touch') &&
                    'h-11 min-h-[44px] px-3.5 text-base md:text-sm',
                className,
            )}
            {...props}
        />
    );
}

function TextInput(props: InputProps) {
    return <Input inputSize="touch" {...props} />;
}

function PasswordInput({ className, ...props }: InputProps) {
    const [visible, setVisible] = React.useState(false);
    const label = visible ? 'Hide password' : 'Show password';

    return (
        <div className="relative w-full">
            <Input
                {...props}
                type={visible ? 'text' : 'password'}
                inputSize={props.inputSize ?? 'touch'}
                className={cn('pr-16', className)}
            />
            <button
                type="button"
                className="absolute inset-y-0 right-2 my-auto flex h-7 cursor-pointer items-center justify-center rounded px-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={label}
                aria-pressed={visible}
                onClick={() => setVisible((current) => !current)}
            >
                {visible ? 'Hide' : 'Show'}
            </button>
        </div>
    );
}

export { Input, TextInput, PasswordInput };
