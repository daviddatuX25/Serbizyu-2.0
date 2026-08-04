import type {
    ButtonHTMLAttributes,
    HTMLAttributes,
    InputHTMLAttributes,
    ReactNode,
    SelectHTMLAttributes,
    TextareaHTMLAttributes,
} from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge as ShadcnBadge } from '@/components/ui/badge';
import { Button as ShadcnButton } from '@/components/ui/button';
import { Card as ShadcnCard, CardContent as ShadcnCardContent } from '@/components/ui/card';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea as ShadcnTextarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'warm' | 'outline' | 'ghost' | 'danger';

const buttonVariantMap: Record<ButtonVariant, 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'> = {
    primary: 'default',
    secondary: 'secondary',
    warm: 'secondary',
    outline: 'outline',
    ghost: 'ghost',
    danger: 'destructive',
};

export function Button({
    variant = 'primary',
    wide = false,
    loading = false,
    children,
    className = '',
    disabled,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    wide?: boolean;
    loading?: boolean;
}) {
    return (
        <ShadcnButton
            {...props}
            variant={buttonVariantMap[variant]}
            size="lg"
            className={cn(wide && 'w-full', 'min-h-[var(--sz-target)]', variant === 'warm' && 'bg-[var(--sz-mango-400)] text-[var(--sz-ink)] hover:bg-[var(--sz-mango-400)]/90', className)}
            disabled={disabled || loading}
        >
            {loading ? 'Working…' : children}
        </ShadcnButton>
    );
}

export function Card({ className = '', muted = false, children, ...props }: HTMLAttributes<HTMLDivElement> & { muted?: boolean }) {
    return (
        <ShadcnCard {...props} className={cn(muted && 'bg-muted/40', className)}>
            {children}
        </ShadcnCard>
    );
}

export function CardContent({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <ShadcnCardContent {...props} className={cn('p-5', className)}>
            {children}
        </ShadcnCardContent>
    );
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const badgeToneClass: Record<BadgeTone, string> = {
    neutral: 'bg-muted text-muted-foreground',
    success: 'bg-[var(--sz-forest-50)] text-[var(--sz-forest-700)]',
    warning: 'bg-[var(--sz-mango-50)] text-[var(--sz-warn)]',
    danger: 'bg-[var(--sz-coral-50)] text-[var(--sz-bad)]',
    info: 'bg-[var(--sz-forest-50)] text-[var(--sz-info)]',
};

export function Badge({ tone = 'neutral', children, className = '', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
    return (
        <ShadcnBadge {...props} variant="outline" className={cn('border-transparent', badgeToneClass[tone], className)}>
            {children}
        </ShadcnBadge>
    );
}

export function Field({ label, error, hint, children }: { label: string; error?: string | null; hint?: string; children: ReactNode }) {
    return (
        <label className="grid gap-1.5">
            <Label className="text-sm font-semibold text-foreground">{label}</Label>
            {children}
            {hint && !error ? <span className="text-sm text-muted-foreground">{hint}</span> : null}
            {error ? (
                <span className="text-sm text-destructive" role="alert">
                    {error}
                </span>
            ) : null}
        </label>
    );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
    return <ShadcnInput {...props} className={cn('min-h-[var(--sz-target)]', props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={cn(
                'flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                props.className,
            )}
        />
    );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <ShadcnTextarea {...props} className={cn('min-h-28', props.className)} />;
}

export function Notice({
    tone = 'neutral',
    title,
    children,
    className = '',
}: {
    tone?: 'neutral' | 'warning' | 'danger' | 'success';
    title?: string;
    children: ReactNode;
    className?: string;
}) {
    const toneClass =
        tone === 'danger'
            ? 'border-destructive/40 text-destructive'
            : tone === 'warning'
              ? 'border-[var(--sz-mango-200)] text-[var(--sz-warn)]'
              : tone === 'success'
                ? 'border-[var(--sz-forest-100)] text-[var(--sz-forest-700)]'
                : 'border-border text-foreground';

    return (
        <Alert className={cn(toneClass, className)} role={tone === 'danger' ? 'alert' : 'note'}>
            {title ? <AlertTitle>{title}</AlertTitle> : null}
            <AlertDescription>{children}</AlertDescription>
        </Alert>
    );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Progress">
            {steps.map((step, index) => {
                const complete = index < current;
                const active = index === current;
                return (
                    <div
                        key={step}
                        className={cn(
                            'flex min-h-11 items-center gap-2 border-b-2 pb-2 text-xs font-semibold',
                            complete || active ? 'border-primary text-foreground' : 'border-border text-muted-foreground',
                        )}
                    >
                        <span
                            className={cn(
                                'grid size-7 place-items-center rounded-md font-mono text-[0.65rem]',
                                complete || active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                            )}
                        >
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        <span>{step}</span>
                    </div>
                );
            })}
        </div>
    );
}
