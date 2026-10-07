import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AuthShell } from '../../components/auth/AuthShell';
import { Field, Notice, PasswordInput, PasswordRequirements } from '../../components/ui';

type ResetPasswordProps = {
    token?: string;
    email?: string;
    returnTo?: string;
};

export default function ResetPassword(props: ResetPasswordProps) {
    const page = usePage<{ errors?: Record<string, string | string[]> }>();
    const token = props.token ?? '';
    const email = props.email ?? '';
    const returnTo = props.returnTo || '/';
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
            <AuthShell
                title="Password reset"
                subtitle="Your password has been changed successfully."
                returnTo={returnTo}
            >
                <div className="sz-auth-stack flex flex-col gap-4">
                    <Notice tone="success">
                        Your password was changed. Sign in with your new password to continue.
                    </Notice>
                    <div className="sz-auth-footer mt-2 flex flex-col items-center gap-1.5 border-t border-slate-100 pt-4 text-center text-xs">
                        <Link
                            href="/auth/sign-in"
                            className="sz-auth-quiet-link font-bold text-[#0F2F58] hover:underline"
                        >
                            Go to sign in →
                        </Link>
                    </div>
                </div>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title="Create a new password"
            subtitle="Choose the password you’ll use the next time you sign in."
            returnTo={returnTo}
        >
            <div className="sz-auth-stack flex flex-col gap-4">
                {errorText ? <Notice tone="danger">{errorText}</Notice> : null}

                <form onSubmit={submit} className="sz-stack flex flex-col gap-3">
                    <Field label="New password">
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
                            onChange={(event) => setPasswordConfirmation(event.target.value)}
                            autoComplete="new-password"
                            aria-label="Confirm new password"
                            required
                        />
                    </Field>
                    <PasswordRequirements
                        password={password}
                        passwordConfirmation={passwordConfirmation}
                        showConfirmation={Boolean(passwordConfirmation)}
                    />
                    <div className="sz-auth-actions mt-1">
                        <button
                            type="submit"
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98]"
                        >
                            Reset password
                        </button>
                    </div>
                </form>

                <div className="sz-auth-footer mt-2 flex flex-col items-center gap-1.5 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
                    <Link
                        href="/auth/sign-in"
                        className="sz-auth-quiet-link font-semibold text-[#0F2F58] hover:underline"
                    >
                        ← Back to sign in
                    </Link>
                </div>
            </div>
        </AuthShell>
    );
}
