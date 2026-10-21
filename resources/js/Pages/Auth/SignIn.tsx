import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { AuthShell } from '../../components/auth/AuthShell';
import { DevOtpReceiver } from '../../components/auth/DevOtpReceiver';
import { OtpPinInput } from '../../components/auth/OtpPinInput';
import { Button, Field, Notice, PasswordInput, TextInput } from '../../components/ui';
import { cn } from '../../lib/utils';
import type { HomeProps } from '../../types';

type SignInProps = HomeProps & {
    returnTo?: string;
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
    const returnTo = props.returnTo || '/';
    let returnPathname = '/';
    try {
        if (returnTo.startsWith('/')) {
            returnPathname = returnTo.split('?')[0].split('#')[0];
        } else {
            returnPathname = new URL(returnTo, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
        }
    } catch {
        returnPathname = returnTo;
    }
    const isReturningToListingBuilder =
        returnPathname.startsWith('/listings/create/product') ||
        returnPathname.startsWith('/listings/create/service');

    const [mode, setMode] = useState<SignInMode>('phone');
    const [showOtpChallenge, setShowOtpChallenge] = useState(false);
    const [phone, setPhone] = useState(() => props.session?.phone ?? readRememberedPhone());
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

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
        <AuthShell
            title="Sign in"
            subtitle="Enter your details below to sign in to your account."
            returnTo={returnTo}
        >
            <div className="sz-auth-stack flex flex-col gap-4">
                {message ? <Notice tone="success">{message}</Notice> : null}
                {error || formError ? <Notice tone="danger">{error ?? formError}</Notice> : null}

                {/* Method Switcher Segmented Pills */}
                <div
                    className="sz-auth-methods grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1"
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
                                'min-h-9 cursor-pointer rounded-lg px-2 text-xs font-bold transition-all sm:text-sm',
                                mode === candidate
                                    ? 'bg-white text-[#0F2F58] shadow-xs'
                                    : 'text-slate-500 hover:text-slate-900',
                            )}
                        >
                            {METHOD_LABELS[candidate]}
                        </button>
                    ))}
                </div>

                {/* Phone OTP Challenge View */}
                {mode === 'phone' && methods.phone_password && showOtpChallenge ? (
                    <div className="flex flex-col gap-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                Sign in via phone code
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                We sent a one-time code to {phone || 'your number'}. It expires in
                                10 minutes.
                            </p>
                        </div>

                        {props.temporaryOtpPreview ? (
                            <DevOtpReceiver
                                otpPreview={props.temporaryOtpPreview}
                                phone={phone || props.session?.phone}
                                onFillCode={(receivedCode) => {
                                    setCode(receivedCode);
                                }}
                                onResend={() => {
                                    requestPhoneOtp();
                                }}
                            />
                        ) : null}

                        <form onSubmit={requestPhoneOtp} className="sz-stack flex flex-col gap-3">
                            <Field label="Mobile number">
                                <TextInput
                                    value={phone}
                                    onChange={(event) => setPhone(event.target.value)}
                                    placeholder="09XXXXXXXXX"
                                    autoComplete="tel"
                                    inputMode="tel"
                                    required
                                />
                            </Field>
                            <div className="sz-auth-actions flex items-center gap-2">
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

                        <form
                            onSubmit={verifyPhoneOtp}
                            className="sz-stack flex flex-col gap-4 border-t border-slate-100 pt-4"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <label className="text-xs font-semibold text-slate-700">
                                    Enter 6-digit code
                                </label>
                                <OtpPinInput
                                    value={code}
                                    onChange={setCode}
                                    onComplete={(completedCode) => {
                                        setCode(completedCode);
                                    }}
                                    autoFocus
                                />
                                <p className="text-[11px] text-slate-400">
                                    Auto-advances on typing · Paste supported
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={code.length < 6}
                                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Sign in with code
                            </button>
                        </form>
                    </div>
                ) : null}

                {/* Phone + Password View */}
                {mode === 'phone' && methods.phone_password && !showOtpChallenge ? (
                    <form onSubmit={submitPhonePassword} className="sz-stack flex flex-col gap-3">
                        <Field label="Mobile number">
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

                        <div className="-mt-1 flex justify-end">
                            <Link
                                href="/auth/password/forgot"
                                className="sz-auth-inline-link text-xs font-semibold text-[#0F2F58] hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <div className="sz-auth-actions mt-1">
                            <button
                                type="submit"
                                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98]"
                            >
                                Sign in
                            </button>
                        </div>

                        <button
                            type="button"
                            className="sz-auth-otp-btn cursor-pointer py-1.5 text-center text-xs font-semibold text-slate-500 transition-colors hover:text-[#0F2F58]"
                            onClick={() => requestPhoneOtp()}
                        >
                            Use a one-time code instead
                        </button>
                    </form>
                ) : null}

                {/* Email + Password View */}
                {mode === 'email' && methods.email ? (
                    <form onSubmit={submitEmail} className="sz-stack flex flex-col gap-3">
                        <Field label="Email">
                            <TextInput
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                autoComplete="username"
                                placeholder="name@example.ph"
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

                        <div className="-mt-1 flex justify-end">
                            <Link
                                href="/auth/password/forgot"
                                className="sz-auth-inline-link text-xs font-semibold text-[#0F2F58] hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <div className="sz-auth-actions mt-1">
                            <button
                                type="submit"
                                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98]"
                            >
                                Sign in with email
                            </button>
                        </div>
                    </form>
                ) : null}

                {/* Footer Links */}
                <div className="sz-auth-footer mt-2 flex flex-col items-center gap-1.5 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
                    <p>
                        New to Serbizyu?{' '}
                        <Link
                            href="/auth/register"
                            className="font-bold text-[#0F2F58] hover:underline"
                        >
                            Create an account
                        </Link>
                    </p>
                    <Link
                        href={isReturningToListingBuilder ? returnTo : '/'}
                        className="sz-auth-quiet-link font-medium text-slate-400 hover:text-slate-600"
                    >
                        {isReturningToListingBuilder ? 'Return to listing builder as a guest' : 'Back to Marketplace'}
                    </Link>
                </div>
            </div>
        </AuthShell>
    );
}
