import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button, Field, Notice, TextInput } from '../../components/ui';
import type { HomeProps } from '../../types';

/** Placeholder — replace with a licensed Tagudin / local market asset later. */
const AUTH_HERO_IMAGE =
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80';

export default function Register(props: HomeProps) {
    const pending = props.session?.status === 'challenge_pending';
    const [phone, setPhone] = useState(props.session?.phone ?? '');
    const [displayName, setDisplayName] = useState('');
    const [code, setCode] = useState('');
    const [message, setMessage] = useState<string | null>(null);

    const submitPhone = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post(
            '/auth/register/request',
            { phone, display_name: displayName },
            {
                preserveScroll: true,
                onSuccess: () => setMessage('Code sent. Enter it below to finish registering.'),
            },
        );
    };

    const submitCode = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post('/auth/register/verify', { phone, code }, { preserveScroll: true });
    };

    return (
        <main className="sz-auth-split">
            <aside className="sz-auth-visual" aria-hidden={false}>
                <img
                    src={AUTH_HERO_IMAGE}
                    alt="Fresh produce at a public market — placeholder until a Tagudin local photo is added"
                />
                <div className="sz-auth-visual-copy">
                    <p className="sz-eyebrow">Tagudin · real local accounts</p>
                    <h2>We verify your number once.</h2>
                    <p>
                        That keeps Tagudin accounts real. Next you’ll set a password on the profile
                        step — email stays optional.
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
                        <h1 className="sz-display-title">
                            {pending ? 'Enter your signup code' : 'Create an account'}
                        </h1>
                        <p className="sz-auth-note">
                            {pending
                                ? `We sent a one-time code to ${phone || 'your number'}. It expires in 10 minutes.`
                                : 'Mobile verification is required to finish signup.'}
                        </p>
                    </div>

                    <div className="sz-auth-stack">
                        {message ? <Notice tone="success">{message}</Notice> : null}

                        {!pending ? (
                            <form onSubmit={submitPhone} className="sz-stack">
                                <Field
                                    label="Display name"
                                    hint="Optional — you can finish this in onboarding"
                                >
                                    <TextInput
                                        value={displayName}
                                        onChange={(event) => setDisplayName(event.target.value)}
                                        autoComplete="name"
                                    />
                                </Field>
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
                                        Create account
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={submitCode} className="sz-stack">
                                <Field
                                    label="Signup code"
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
                                <div className="sz-auth-actions">
                                    <Button type="submit" wide>
                                        Verify and finish signup
                                    </Button>
                                </div>
                                <button
                                    type="button"
                                    className="sz-auth-otp-btn"
                                    onClick={() => router.get('/auth/register')}
                                >
                                    Use a different number
                                </button>
                            </form>
                        )}

                        <div className="sz-auth-footer">
                            <p>
                                Already have an account? <Link href="/auth/sign-in">Sign in</Link>
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
