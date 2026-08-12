import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button, Field, Notice, PasswordInput } from '../../components/ui';

type ResetPasswordProps = {
    token?: string;
    email?: string;
};

export default function ResetPassword(props: ResetPasswordProps) {
    const page = usePage<{ errors?: Record<string, string | string[]> }>();
    const token = props.token ?? '';
    const email = props.email ?? '';
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [done, setDone] = useState(false);
    const formError = page.props.errors?.form;
    const errorText = Array.isArray(formError) ? formError[0] : formError;

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.post(
            '/auth/password/reset',
            { email, token, password, password_confirmation: passwordConfirmation },
            { preserveScroll: true, onSuccess: () => setDone(true) },
        );
    };

    if (done) {
        return (
            <main className="sz-auth-split">
                <aside className="sz-auth-visual" aria-hidden={false}>
                    <div className="sz-auth-visual-copy">
                        <p className="sz-eyebrow">Tagudin · neighbors helping neighbors</p>
                        <h2>Password updated.</h2>
                        <p>You can now sign in using your new password.</p>
                    </div>
                </aside>
                <section className="sz-auth-dock">
                    <div className="sz-auth-card">
                        <div className="sz-auth-brand">
                            <strong>Serbizyu</strong>
                            <span>Marketplace</span>
                        </div>
                        <div className="sz-auth-header">
                            <h1 className="sz-display-title">Password reset</h1>
                            <p className="sz-auth-note">
                                Your password has been changed successfully.
                            </p>
                        </div>
                        <div className="sz-auth-stack">
                            <Notice tone="success">
                                Your password was changed. Sign in with your new password to
                                continue.
                            </Notice>
                            <div className="sz-auth-footer">
                                <Link href="/auth/sign-in" className="sz-auth-quiet-link">
                                    Go to sign in →
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="sz-auth-split">
            <aside className="sz-auth-visual" aria-hidden={false}>
                <div className="sz-auth-visual-copy">
                    <p className="sz-eyebrow">Tagudin · neighbors helping neighbors</p>
                    <h2>Choose a new password.</h2>
                    <p>This link can only be used once, and expires in 60 minutes.</p>
                </div>
            </aside>

            <section className="sz-auth-dock">
                <div className="sz-auth-card">
                    <div className="sz-auth-brand">
                        <strong>Serbizyu</strong>
                        <span>Marketplace</span>
                    </div>

                    <div className="sz-auth-header">
                        <h1 className="sz-display-title">Create a new password</h1>
                        <p className="sz-auth-note">
                            Choose the password you’ll use the next time you sign in.
                        </p>
                    </div>

                    <div className="sz-auth-stack">
                        {errorText ? <Notice tone="danger">{errorText}</Notice> : null}

                        <form onSubmit={submit} className="sz-stack">
                            <Field
                                label="New password"
                                hint="At least 8 characters, with letters and numbers"
                            >
                                <PasswordInput
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    autoComplete="new-password"
                                    aria-label="New password"
                                    required
                                />
                            </Field>
                            <Field label="Confirm new password">
                                <PasswordInput
                                    value={passwordConfirmation}
                                    onChange={(event) =>
                                        setPasswordConfirmation(event.target.value)
                                    }
                                    autoComplete="new-password"
                                    aria-label="Confirm new password"
                                    required
                                />
                            </Field>
                            <div className="sz-auth-actions">
                                <Button type="submit" wide>
                                    Reset password
                                </Button>
                            </div>
                        </form>

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
