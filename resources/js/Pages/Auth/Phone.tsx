import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Badge, Button, Card, CardContent, Field, Notice, TextInput } from '../../components/ui';
import type { HomeProps } from '../../types';

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
        <main className="sz-auth-screen">
            <header>
                <div className="sz-auth-header">
                    <Badge tone="info">Serbizyu</Badge>
                    <Badge tone="neutral">Phone sign-in</Badge>
                </div>
                <p className="sz-eyebrow">Secure access</p>
                <h1 className="sz-display-title">{pending ? 'Enter verification code' : 'Sign in with your phone'}</h1>
                <p className="sz-auth-note">
                    {pending
                        ? 'The code expires after 10 minutes and can only be used once.'
                        : 'Use your own mobile number. One-time verification — no fictional accounts or shared credentials.'}
                </p>
            </header>

            <Card>
                <CardContent className="sz-stack">
                    {message ? <Notice tone="success">{message}</Notice> : null}
                    {!pending ? (
                        <form onSubmit={submitPhone} className="sz-stack">
                            <Field label="Mobile number" hint="Philippine format: 09XXXXXXXXX or +639XXXXXXXXX">
                                <TextInput
                                    value={phone}
                                    onChange={(event) => setPhone(event.target.value)}
                                    placeholder="09XXXXXXXXX"
                                    autoComplete="tel"
                                    inputMode="tel"
                                    required
                                />
                            </Field>
                            <div className="sz-actionbar">
                                <Button type="submit">Send verification code</Button>
                                <Link href="/browse" className="sz-btn sz-btn-ghost">
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
                            <div className="sz-actionbar">
                                <Button type="submit">Verify and continue</Button>
                                <Button type="button" variant="ghost" onClick={() => router.post('/auth/logout')}>
                                    Use a different number
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
