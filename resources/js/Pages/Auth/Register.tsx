import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { AuthShell } from '../../components/auth/AuthShell';
import { DevOtpReceiver } from '../../components/auth/DevOtpReceiver';
import { OtpPinInput } from '../../components/auth/OtpPinInput';
import { Field, Notice, TextInput } from '../../components/ui';
import type { HomeProps } from '../../types';

type RegisterProps = HomeProps & {
    returnTo?: string;
};

export default function Register(props: RegisterProps) {
    const pending = props.session?.status === 'challenge_pending';
    const temporaryOtpPreview = props.temporaryOtpPreview;
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
        <AuthShell
            title={pending ? 'Verify signup code' : 'Create an account'}
            subtitle={
                pending
                    ? `We sent a one-time code to ${phone || 'your number'}. It expires in 10 minutes.`
                    : 'Mobile verification is required to finish signup.'
            }
            returnTo={returnTo}
        >
            <div className="sz-auth-stack flex flex-col gap-4">
                {message ? <Notice tone="success">{message}</Notice> : null}

                {pending && temporaryOtpPreview ? (
                    <DevOtpReceiver
                        otpPreview={temporaryOtpPreview}
                        phone={phone || props.session?.phone}
                        onFillCode={(receivedCode) => {
                            setCode(receivedCode);
                        }}
                        onResend={() => {
                            router.post(
                                '/auth/register/request',
                                {
                                    phone: phone || props.session?.phone,
                                    display_name: displayName,
                                },
                                {
                                    preserveScroll: true,
                                    onSuccess: () => setMessage('Fresh code dispatched.'),
                                },
                            );
                        }}
                    />
                ) : null}

                {!pending && props.devMode ? (
                    <div
                        className="sz-auth-dev-helper rounded-xl border border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900"
                        role="status"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="sz-auth-dev-helper-title font-bold text-amber-950">
                                Local Dev Simulation Active
                            </span>
                            <button
                                type="button"
                                className="sz-auth-dev-helper-button inline-flex min-h-7 cursor-pointer items-center justify-center rounded-lg bg-amber-600 px-2.5 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-amber-700"
                                onClick={() => {
                                    const randomSuffix = Math.floor(
                                        1000000 + Math.random() * 9000000,
                                    );
                                    setPhone(`0917${randomSuffix}`);
                                    setDisplayName('Dev Test User');
                                }}
                            >
                                Quick-fill test number
                            </button>
                        </div>
                        <p className="sz-auth-dev-helper-description mt-1 text-[11px] text-amber-800/80">
                            Enter any number (or click quick-fill) and submit. The Simulated SMS
                            Receiver will pop up with your OTP and auto-fill timer.
                        </p>
                    </div>
                ) : null}

                {!pending ? (
                    <form onSubmit={submitPhone} className="sz-stack flex flex-col gap-3">
                        <Field
                            label="Display name"
                            hint="Optional — you can finish this in onboarding"
                        >
                            <TextInput
                                value={displayName}
                                onChange={(event) => setDisplayName(event.target.value)}
                                autoComplete="name"
                                placeholder="Your name or business name"
                            />
                        </Field>
                        <Field label="Mobile number" hint="Philippine mobile · example 09XXXXXXXXX">
                            <TextInput
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                placeholder="09XXXXXXXXX"
                                autoComplete="tel"
                                inputMode="tel"
                                required
                            />
                        </Field>
                        <div className="sz-auth-actions mt-1">
                            <button
                                type="submit"
                                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98]"
                            >
                                Create account
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={submitCode} className="sz-stack flex flex-col gap-4">
                        <div className="flex flex-col items-center gap-2">
                            <label className="text-xs font-semibold text-slate-700">
                                Enter 6-digit signup code
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
                        <div className="sz-auth-actions mt-1">
                            <button
                                type="submit"
                                disabled={code.length < 6}
                                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Verify and finish signup
                            </button>
                        </div>
                        <button
                            type="button"
                            className="sz-auth-otp-btn cursor-pointer py-1 text-center text-xs font-semibold text-slate-500 hover:text-[#0F2F58]"
                            onClick={() => {
                                router.post(
                                    '/auth/register/reset',
                                    {},
                                    {
                                        preserveScroll: false,
                                        onSuccess: () => {
                                            setCode('');
                                            setMessage(null);
                                        },
                                    },
                                );
                            }}
                        >
                            Use a different number
                        </button>
                    </form>
                )}

                <div className="sz-auth-footer mt-2 flex flex-col items-center gap-1.5 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
                    <p>
                        Already have an account?{' '}
                        <Link
                            href="/auth/sign-in"
                            className="font-bold text-[#0F2F58] hover:underline"
                        >
                            Sign in
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
