import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button, Field, Notice, TextInput } from '../../components/ui';
import type { HomeProps } from '../../types';

/** Placeholder — replace with a licensed Tagudin / local market asset later. */
const AUTH_HERO_IMAGE =
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80';

export default function PhoneAuth(props: HomeProps) {
    const pending = props.session?.status === 'challenge_pending';
    const [phone, setPhone] = useState(props.session?.phone ?? '');
    const [code, setCode] = useState('');
    const [message, setMessage] = useState<string | null>(null);

    const submitPhone = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post(
            '/auth/phone/request',
            { phone },
            {
                preserveScroll: true,
                onSuccess: () => setMessage('A verification code was requested. Check your approved SMS channel.'),
            },
        );
    };

    const submitCode = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post('/auth/phone/verify', { phone, code }, { preserveScroll: true });
    };

    return (
        <main className="sz-auth-split">
            <aside className="sz-auth-visual" aria-hidden={false}>
                <img src={AUTH_HERO_IMAGE} alt="Fresh produce at a public market — placeholder until a Tagudin local photo is added" />
                <div className="sz-auth-visual-copy">
                    <p className="sz-eyebrow">Tagudin · neighbors helping neighbors</p>
                    <h2>Useful work stays close to home.</h2>
                    <p>Greeting-card layouts, market errands, and quiet crafts — signed in with your own number.</p>
                </div>
            </aside>

            <section className="sz-auth-dock">
                <div className="sz-auth-brand">
                    <strong>Serbizyu</strong>
                    <span>Local marketplace</span>
                </div>

                <h1 className="sz-display-title">{pending ? 'Enter verification code' : 'Sign in with your phone'}</h1>
                <p className="sz-auth-note">
                    {pending
                        ? 'The code expires after 10 minutes and can only be used once.'
                        : 'Use your own mobile number. One-time verification — no shared demo accounts.'}
                </p>

                <div className="sz-auth-stack">
                    {message ? <Notice tone="success">{message}</Notice> : null}

                    {!pending ? (
                        <form onSubmit={submitPhone} className="sz-stack">
                            <Field label="Mobile number" hint="Philippine mobile · code expires in 10 minutes">
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
                                <Button type="submit">Send verification code</Button>
                                <Link href="/browse" className="sz-btn-link">
                                    Browse without signing in
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={submitCode} className="sz-stack">
                            <Field label="Verification code" hint={`Code sent toward ${phone || 'your number'}`}>
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
                                <Button type="submit">Verify and continue</Button>
                                <Button type="button" variant="ghost" onClick={() => router.post('/auth/logout')}>
                                    Use a different number
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
}
