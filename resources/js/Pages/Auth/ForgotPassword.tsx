import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button, Field, Notice, TextInput } from '../../components/ui';

export default function ForgotPassword() {
    const page = usePage<{ errors?: Record<string, string | string[]> }>();
    const [mode, setMode] = useState<'email' | 'phone'>('email');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [sent, setSent] = useState(false);
    const formError = page.props.errors?.form;
    const errorText = Array.isArray(formError) ? formError[0] : formError;

    const selectMode = (nextMode: 'email' | 'phone'): void => {
        setMode(nextMode);
        setSent(false);
    };

    const submitEmail = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post(
            '/auth/password/email',
            { email },
            { preserveScroll: true, onSuccess: () => setSent(true) },
        );
    };

    const submitPhone = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post(
            '/auth/password/phone',
            { phone },
            { preserveScroll: true, onSuccess: () => setSent(true) },
        );
    };

    return (
        <main className="sz-auth-split">
            <aside className="sz-auth-visual" aria-hidden={false}>
                <div className="sz-auth-visual-copy">
                    <p className="sz-eyebrow">Tagudin · neighbors helping neighbors</p>
                    <h2>Locked out? We’ll get you back in.</h2>
                    <p>
                        Use the email on your account, or the mobile you verified at signup. No SMS
                        unless you choose it.
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
                        <h1 className="sz-display-title">Reset your password</h1>
                        <p className="sz-auth-note">
                            Enter the email or mobile number linked to your account.
                        </p>
                    </div>

                    <div className="sz-auth-stack">
                        {errorText ? <Notice tone="danger">{errorText}</Notice> : null}
                        {sent ? (
                            <div className="sz-auth-confirmation" aria-live="polite">
                                <h2>Check your messages</h2>
                                <p>
                                    If an account matches those details, we’ll send reset
                                    instructions shortly.
                                </p>
                                <button
                                    type="button"
                                    className="sz-auth-secondary-link"
                                    onClick={() => setSent(false)}
                                >
                                    Try a different email or mobile number
                                </button>
                            </div>
                        ) : (
                            <>
                                <div
                                    className="sz-auth-methods sz-auth-actions"
                                    role="group"
                                    aria-label="Recovery method"
                                >
                                    <Button
                                        type="button"
                                        variant={mode === 'email' ? 'primary' : 'secondary'}
                                        aria-pressed={mode === 'email'}
                                        onClick={() => selectMode('email')}
                                    >
                                        Email
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={mode === 'phone' ? 'primary' : 'secondary'}
                                        aria-pressed={mode === 'phone'}
                                        onClick={() => selectMode('phone')}
                                    >
                                        Mobile
                                    </Button>
                                </div>

                                {mode === 'email' ? (
                                    <form onSubmit={submitEmail} className="sz-stack">
                                        <Field
                                            label="Email"
                                            hint="The email you linked to your account"
                                        >
                                            <TextInput
                                                type="email"
                                                value={email}
                                                onChange={(event) => setEmail(event.target.value)}
                                                autoComplete="username"
                                                required
                                            />
                                        </Field>
                                        <div className="sz-auth-actions">
                                            <Button type="submit" wide>
                                                Send reset link
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <form onSubmit={submitPhone} className="sz-stack">
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
                                            <Button type="submit" wide>
                                                Send code
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </>
                        )}

                        <div className="sz-auth-footer">
                            <Link href="/auth/sign-in" className="sz-auth-quiet-link">
                                ← Back to sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
