import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button, Field, Notice, PasswordInput, TextInput } from '../../components/ui';
import { cn } from '../../lib/utils';
import type { HomeProps } from '../../types';

/** Placeholder — replace with a licensed Tagudin / local market asset later. */
const AUTH_HERO_IMAGE =
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80';

type SignInProps = HomeProps & {
    methods?: {
        phone_password?: boolean;
        email?: boolean;
    };
};

type SignInMode = 'phone' | 'email';

const METHOD_LABELS: Record<SignInMode, string> = {
    phone: 'Phone',
    email: 'Email',
};

const LAST_PHONE_KEY = 'serbizyu.last_phone';

function readRememberedPhone(): string {
    try {
        return localStorage.getItem(LAST_PHONE_KEY) ?? '';
    } catch {
        return '';
    }
}

function rememberPhone(phone: string): void {
    try {
        localStorage.setItem(LAST_PHONE_KEY, phone.trim());
    } catch {
        // Ignore private-mode / blocked storage.
    }
}

export default function SignIn(props: SignInProps) {
    const methods = props.methods ?? { phone_password: true, email: true };
    const challengePending = props.session?.status === 'challenge_pending';

    const [mode, setMode] = useState<SignInMode>('phone');
    const [showOtpChallenge, setShowOtpChallenge] = useState(false);
    const [phone, setPhone] = useState(props.session?.phone ?? '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (props.session?.phone || phone !== '') {
            return;
        }

        const remembered = readRememberedPhone();
        if (remembered !== '') {
            setPhone(remembered);
        }
    }, [phone, props.session?.phone]);

    const errors = (props.errors ?? {}) as Record<string, string | string[]>;
    const formError = typeof errors.form === 'string' ? errors.form : (errors.form?.[0] ?? null);

    const selectMode = (nextMode: SignInMode): void => {
        setMode(nextMode);
        setMessage(null);
        setError(null);
        setShowOtpChallenge(nextMode === 'phone' && challengePending);
    };

    const submitPhonePassword = (event: React.FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        router.post('/auth/phone/login', { phone, password }, { preserveScroll: true });
    };

    const submitEmail = (event: React.FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        router.post('/auth/email/login', { email, password }, { preserveScroll: true });
    };

    const requestPhoneOtp = (event?: React.FormEvent<HTMLFormElement>): void => {
        event?.preventDefault();
        rememberPhone(phone);
        setMessage(null);
        setError(null);
        router.post(
            '/auth/phone/request',
            { phone },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setMode('phone');
                    setShowOtpChallenge(true);
                    setMessage('Code sent. Enter it below to finish signing in.');
                },
            },
        );
    };

    const verifyPhoneOtp = (event: React.FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        setError(null);
        router.post('/auth/phone/verify', { phone, code }, { preserveScroll: true });
    };

    const availableModes = (['phone', 'email'] as const).filter((candidate) =>
        candidate === 'phone' ? methods.phone_password : methods.email,
    );

    return (
        <main className="sz-auth-split">
            <aside className="sz-auth-visual" aria-hidden={false}>
                <img
                    src={AUTH_HERO_IMAGE}
                    alt="Fresh produce at a public market — placeholder until a Tagudin local photo is added"
                />
                <div className="sz-auth-visual-copy">
                    <p className="sz-eyebrow">Tagudin · neighbors helping neighbors</p>
                    <h2>One sign-in, your way.</h2>
                    <p>
                        Use your phone or email password. A one-time code is available from the
                        phone sign-in.
                    </p>
                </div>
            </aside>

            <section className="sz-auth-dock">
                <div className="sz-auth-card">
                    <div className="sz-auth-brand">
                        <strong>Serbizyu</strong>
                        <span>Marketplace</span>
                    </div>

                    <div className="sz-auth-header">
                        <h1 className="sz-display-title">Sign in</h1>
                        <p className="sz-auth-note">
                            Enter your details below to sign in to your account.
                        </p>
                    </div>

                    <div className="sz-auth-stack">
                        {message ? <Notice tone="success">{message}</Notice> : null}
                        {error || formError ? (
                            <Notice tone="danger">{error ?? formError}</Notice>
                        ) : null}

                        <div
                            className="sz-auth-methods grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/60 p-1"
                            role="group"
                            aria-label="Sign-in method"
                        >
                            {availableModes.map((candidate) => (
                                <button
                                    key={candidate}
                                    type="button"
                                    aria-pressed={mode === candidate}
                                    onClick={() => selectMode(candidate)}
                                    className={cn(
                                        'min-h-9 rounded-md px-2 text-sm font-semibold transition-colors',
                                        mode === candidate
                                            ? 'bg-card text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {METHOD_LABELS[candidate]}
                                </button>
                            ))}
                        </div>

                        {mode === 'phone' && methods.phone_password && showOtpChallenge ? (
                            <>
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">
                                        Sign in via phone code
                                    </h2>
                                    <p className="sz-auth-note">
                                        We sent a one-time code to {phone || 'your number'}. It
                                        expires in 10 minutes.
                                    </p>
                                </div>
                                <form onSubmit={requestPhoneOtp} className="sz-stack">
                                    <Field
                                        label="Mobile number"
                                        hint="Philippine mobile · example 09XXXXXXXXX"
                                    >
                                        <TextInput
                                            value={phone}
                                            onChange={(event) => setPhone(event.target.value)}
                                            placeholder="09XXXXXXXXX"
                                            autoComplete="tel"
                                            inputMode="tel"
                                            required
                                        />
                                    </Field>
                                    <div className="sz-auth-actions">
                                        <Button type="submit" variant="outline">
                                            Send new code
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setShowOtpChallenge(false)}
                                        >
                                            Use password instead
                                        </Button>
                                    </div>
                                </form>
                                <form onSubmit={verifyPhoneOtp} className="sz-stack">
                                    <Field
                                        label="One-time code"
                                        hint="6 digits from your SMS or local OTP channel"
                                    >
                                        <TextInput
                                            value={code}
                                            onChange={(event) => setCode(event.target.value)}
                                            placeholder="6-digit code"
                                            autoComplete="one-time-code"
                                            inputMode="numeric"
                                            maxLength={6}
                                            required
                                        />
                                    </Field>
                                    <Button type="submit">Sign in with code</Button>
                                </form>
                            </>
                        ) : null}

                        {mode === 'phone' && methods.phone_password && !showOtpChallenge ? (
                            <form onSubmit={submitPhonePassword} className="sz-stack">
                                <Field
                                    label="Mobile number"
                                    hint="Philippine mobile · example 09XXXXXXXXX"
                                >
                                    <TextInput
                                        value={phone}
                                        onChange={(event) => setPhone(event.target.value)}
                                        placeholder="09XXXXXXXXX"
                                        autoComplete="tel"
                                        inputMode="tel"
                                        required
                                    />
                                </Field>
                                <Field label="Password">
                                    <PasswordInput
                                        type="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        autoComplete="current-password"
                                        aria-label="Password"
                                        required
                                    />
                                </Field>
                                <div className="text-right -mt-1">
                                    <Link
                                        href="/auth/password/forgot"
                                        className="sz-auth-inline-link"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="sz-auth-actions">
                                    <Button type="submit" wide>
                                        Sign in
                                    </Button>
                                </div>
                                <button
                                    type="button"
                                    className="sz-auth-otp-btn"
                                    onClick={() => requestPhoneOtp()}
                                >
                                    Use a one-time code instead
                                </button>
                            </form>
                        ) : null}

                        {mode === 'email' && methods.email ? (
                            <form onSubmit={submitEmail} className="sz-stack">
                                <Field label="Email">
                                    <TextInput
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        autoComplete="username"
                                        required
                                    />
                                </Field>
                                <Field label="Password">
                                    <PasswordInput
                                        type="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        autoComplete="current-password"
                                        aria-label="Password"
                                        required
                                    />
                                </Field>
                                <div className="text-right -mt-1">
                                    <Link
                                        href="/auth/password/forgot"
                                        className="sz-auth-inline-link"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="sz-auth-actions">
                                    <Button type="submit" wide>
                                        Sign in
                                    </Button>
                                </div>
                            </form>
                        ) : null}

                        <div className="sz-auth-footer">
                            <p>
                                New to Serbizyu?{' '}
                                <Link href="/auth/register">Create an account</Link>
                            </p>
                            <Link href="/browse" className="sz-auth-quiet-link">
                                Browse the marketplace as a guest
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
