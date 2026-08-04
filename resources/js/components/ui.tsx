import type {
    ButtonHTMLAttributes,
    HTMLAttributes,
    InputHTMLAttributes,
    ReactNode,
    SelectHTMLAttributes,
    TextareaHTMLAttributes,
} from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'warm' | 'outline' | 'ghost' | 'danger';

const buttonClasses: Record<ButtonVariant, string> = {
    primary: 'sz-btn sz-btn-primary',
    secondary: 'sz-btn sz-btn-secondary',
    warm: 'sz-btn sz-btn-warm',
    outline: 'sz-btn sz-btn-outline',
    ghost: 'sz-btn sz-btn-ghost',
    danger: 'sz-btn sz-btn-danger',
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
        <button
            {...props}
            className={`${buttonClasses[variant]} ${wide ? 'sz-btn-wide' : ''} ${className}`.trim()}
            disabled={disabled || loading}
        >
            {loading ? 'Working…' : children}
        </button>
    );
}

export function Card({ className = '', muted = false, children, ...props }: HTMLAttributes<HTMLDivElement> & { muted?: boolean }) {
    return (
        <div {...props} className={`sz-card ${muted ? 'sz-card-muted' : ''} ${className}`.trim()}>
            {children}
        </div>
    );
}

export function CardContent({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div {...props} className={`sz-card-pad ${className}`.trim()}>{children}</div>;
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function Badge({ tone = 'neutral', children, className = '', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
    return <span {...props} className={`sz-badge sz-badge-${tone} ${className}`.trim()}>{children}</span>;
}

export function Field({ label, error, hint, children }: { label: string; error?: string | null; hint?: string; children: ReactNode }) {
    return (
        <label className="sz-field">
            <span className="sz-field-label">{label}</span>
            {children}
            {hint && !error ? <span className="sz-copy">{hint}</span> : null}
            {error ? <span className="sz-field-error" role="alert">{error}</span> : null}
        </label>
    );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={`sz-input ${props.className ?? ''}`.trim()} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
    return <select {...props} className={`sz-select ${props.className ?? ''}`.trim()} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={`sz-textarea ${props.className ?? ''}`.trim()} />;
}

export function Notice({ tone = 'neutral', title, children, className = '' }: { tone?: 'neutral' | 'warning' | 'danger' | 'success'; title?: string; children: ReactNode; className?: string }) {
    return (
        <div className={`sz-notice ${tone === 'neutral' ? '' : `sz-notice-${tone}`} ${className}`.trim()} role={tone === 'danger' ? 'alert' : 'note'}>
            <div>
                {title ? <strong>{title}</strong> : null}
                <span>{children}</span>
            </div>
        </div>
    );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
    return (
        <div className="sz-stepper" aria-label="Progress">
            {steps.map((step, index) => (
                <div key={step} className={`sz-step ${index < current ? 'is-complete' : ''} ${index === current ? 'is-current' : ''}`}>
                    <span className="sz-step-number">{String(index + 1).padStart(2, '0')}</span>
                    <span>{step}</span>
                </div>
            ))}
        </div>
    );
}
