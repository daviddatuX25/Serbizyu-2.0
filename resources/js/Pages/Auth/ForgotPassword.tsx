import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { AuthShell } from '../../components/auth/AuthShell';
import { DevOtpReceiver } from '../../components/auth/DevOtpReceiver';
import { OtpPinInput } from '../../components/auth/OtpPinInput';
import {
    Button,
    Field,
    Notice,
    PasswordInput,
    PasswordRequirements,
    TextInput,
} from '../../components/ui';

interface ForgotPasswordProps {
    returnTo?: string;
    session?: {
        status?: 'method_picker' | 'challenge_pending';
        phone?: string | null;
        cooldown_remaining_seconds?: number;
    };
    devMode?: boolean;
    temporaryOtpPreview?: {
        phone_e164?: string;
        purpose?: string;
        code: string;
        expires_in_seconds: number;
        delivered_at?: string;
    } | null;
}

export default function ForgotPassword(props: ForgotPasswordProps) {
    const page = usePage<{ errors?: Record<string, string | string[]> }>();
    const returnTo = props.returnTo || '/';

    const isChallengePending = props.session?.status === 'challenge_pending';

    const [mode, setMode] = useState<'email' | 'phone'>(() =>
        isChallengePending ? 'phone' : 'email',
    );
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState(() => props.session?.phone || '');
    const [phoneStep, setPhoneStep] = useState<'request' | 'verify' | 'success'>(() =>
        isChallengePending ? 'verify' : 'request',
    );
    const [emailSent, setEmailSent] = useState(false);

    // Form inputs for verify & reset
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);

    // Cooldown countdown timer (persisted / hydrated from server session)
    const [cooldownSeconds, setCooldownSeconds] = useState<number>(
        () => props.session?.cooldown_remaining_seconds || 0,
    );

    // Form error resolution
    const formError = page.props.errors?.form;
    const codeError = page.props.errors?.code;
    const passwordError = page.props.errors?.password;
    const phoneError = page.props.errors?.phone;
    const emailError = page.props.errors?.email;

    const errorText = Array.isArray(formError)
        ? formError[0]
        : formError ||
          (Array.isArray(emailError) ? emailError[0] : emailError) ||
          (Array.isArray(codeError) ? codeError[0] : codeError) ||
          (Array.isArray(passwordError) ? passwordError[0] : passwordError) ||
          (Array.isArray(phoneError) ? phoneError[0] : phoneError);
    // Active countdown timer effect
    useEffect(() => {
        if (cooldownSeconds <= 0) return;

        const interval = setInterval(() => {
            setCooldownSeconds((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [cooldownSeconds]);

    // Update state when session props change
    useEffect(() => {
        if (props.session?.phone && !phone) {
            setPhone(props.session.phone);
        }
        if (props.session?.status === 'challenge_pending' && phoneStep === 'request') {
            setPhoneStep('verify');
        }
        if (
            typeof props.session?.cooldown_remaining_seconds === 'number' &&
            props.session.cooldown_remaining_seconds > 0
        ) {
            setCooldownSeconds(props.session.cooldown_remaining_seconds);
        }
    }, [props.session, phone, phoneStep]);

    const selectMode = (nextMode: 'email' | 'phone'): void => {
        setMode(nextMode);
        setEmailSent(false);
    };

    const submitEmail = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        router.post(
            '/auth/password/email',
            { email },
            {
                preserveScroll: true,
                onSuccess: () => setEmailSent(true),
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    const submitPhoneRequest = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        router.post(
            '/auth/password/phone',
            { phone },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setPhoneStep('verify');
                    setCooldownSeconds(60);
                },
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    const handleResendPhoneCode = () => {
        if (cooldownSeconds > 0 || isResending) return;
        setIsResending(true);
        router.post(
            '/auth/password/phone',
            { phone },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCooldownSeconds(60);
                },
                onFinish: () => setIsResending(false),
            },
        );
    };

    const submitPhoneResetVerify = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (code.length < 6 || !password || !passwordConfirmation) return;

        setIsSubmitting(true);
        router.post(
            '/auth/password/phone/verify',
            {
                phone,
                code,
                password,
                password_confirmation: passwordConfirmation,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setPhoneStep('success');
                },
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    const resetPhoneFlow = () => {
        router.get(
            '/auth/password/forgot?reset=1',
            {},
            {
                preserveScroll: false,
                onSuccess: () => {
                    setPhoneStep('request');
                    setCode('');
                    setPassword('');
                    setPasswordConfirmation('');
                    setCooldownSeconds(0);
                },
            },
        );
    };

    return (
        <AuthShell
            title="Reset your password"
            subtitle={
                mode === 'phone' && phoneStep === 'verify'
                    ? `Enter the 6-digit SMS code sent to ${phone}`
                    : 'Enter the email or mobile number linked to your account.'
            }
            returnTo={returnTo}
        >
            <div className="sz-auth-stack flex flex-col gap-4">
                {errorText ? <Notice tone="danger">{errorText}</Notice> : null}

                {/* Email Sent Confirmation */}
                {mode === 'email' && emailSent ? (
                    <div
                        className="sz-auth-confirmation flex flex-col gap-3 text-center"
                        aria-live="polite"
                    >
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950">
                            <h2 className="text-base font-bold">Check your messages</h2>
                            <p className="mt-1 text-xs text-emerald-800">
                                If an account matches those details, we’ll send reset instructions
                                shortly.
                            </p>
                        </div>
                        {props.devMode ? (
                            <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-left text-xs text-sky-950">
                                <p className="font-semibold text-sky-900">Developer mode notice:</p>
                                <p className="mt-1 text-sky-800">
                                    Emails are delivered to Mailpit at{' '}
                                    <a
                                        href="http://localhost:8025"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-semibold underline hover:text-sky-950"
                                    >
                                        localhost:8025
                                    </a>
                                    . By security design (anti-enumeration), reset emails are only dispatched
                                    if the email is linked to an existing account (e.g. <code>juan@tagudin.ph</code>,{' '}
                                    <code>rosa@tagudin.ph</code>). If the account was registered via mobile phone,
                                    use the <strong>Mobile</strong> recovery method instead.
                                </p>
                            </div>
                        ) : null}
                        <button
                            type="button"
                            className="sz-auth-secondary-link cursor-pointer py-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
                            onClick={() => setEmailSent(false)}
                        >
                            Try a different email address
                        </button>
                    </div>
                ) : null}

                {/* Mobile Step 3: Success Confirmation */}
                {mode === 'phone' && phoneStep === 'success' ? (
                    <div
                        className="sz-auth-confirmation flex flex-col gap-4 text-center"
                        aria-live="polite"
                    >
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 text-emerald-950">
                            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <svg
                                    className="h-6 w-6 stroke-current"
                                    fill="none"
                                    strokeWidth="2.5"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-base font-bold">Password reset successful!</h2>
                            <p className="mt-1 text-xs text-emerald-800">
                                Your password has been updated. You can now sign in with your mobile
                                number and new password.
                            </p>
                        </div>
                        <Link
                            href="/auth/sign-in"
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98]"
                        >
                            Continue to sign in
                        </Link>
                    </div>
                ) : null}

                {/* Main Interactive Form Views (when not in success/emailSent) */}
                {!(mode === 'email' && emailSent) &&
                !(mode === 'phone' && phoneStep === 'success') ? (
                    <>
                        {/* Method Selector Tabs (visible on initial steps) */}
                        {phoneStep === 'request' ? (
                            <div
                                className="sz-auth-methods grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1"
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
                        ) : null}

                        {/* Email Form */}
                        {mode === 'email' ? (
                            <form onSubmit={submitEmail} className="sz-stack flex flex-col gap-3">
                                <Field
                                    label="Email"
                                    hint="The email you linked to your account"
                                    error={Array.isArray(emailError) ? emailError[0] : emailError}
                                >
                                    <TextInput
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        autoComplete="username"
                                        placeholder="name@example.ph"
                                        required
                                    />
                                </Field>
                                {props.devMode ? (
                                    <p className="text-[11px] text-slate-500">
                                        Dev accounts with email: <code>juan@tagudin.ph</code>,{' '}
                                        <code>rosa@tagudin.ph</code>. Phone-registered accounts use Mobile recovery.
                                    </p>
                                ) : null}
                                <div className="sz-auth-actions mt-1">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98] disabled:opacity-50"
                                    >
                                        Send reset link
                                    </button>
                                </div>
                            </form>
                        ) : null}

                        {/* Mobile Step 1: Phone Request Form */}
                        {mode === 'phone' && phoneStep === 'request' ? (
                            <form
                                onSubmit={submitPhoneRequest}
                                className="sz-stack flex flex-col gap-3"
                            >
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
                                <div className="sz-auth-actions mt-1">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98] disabled:opacity-50"
                                    >
                                        Send verification code
                                    </button>
                                </div>
                            </form>
                        ) : null}

                        {/* Mobile Step 2: Verification Code & Set New Password */}
                        {mode === 'phone' && phoneStep === 'verify' ? (
                            <div className="flex flex-col gap-4">
                                {props.devMode && props.temporaryOtpPreview ? (
                                    <DevOtpReceiver
                                        otpPreview={props.temporaryOtpPreview}
                                        phone={phone}
                                        onFillCode={(receivedCode) => {
                                            setCode(receivedCode);
                                        }}
                                        onResend={handleResendPhoneCode}
                                        isResending={isResending || cooldownSeconds > 0}
                                    />
                                ) : null}

                                <form
                                    onSubmit={submitPhoneResetVerify}
                                    className="sz-stack flex flex-col gap-4"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <label className="text-xs font-semibold text-slate-700">
                                            Enter 6-digit reset code
                                        </label>
                                        <OtpPinInput
                                            value={code}
                                            onChange={setCode}
                                            onComplete={(completedCode) => {
                                                setCode(completedCode);
                                            }}
                                            hasError={Boolean(codeError)}
                                            autoFocus
                                        />
                                        <p className="text-[11px] text-slate-400">
                                            Auto-advances on typing · Paste supported
                                        </p>
                                    </div>

                                    {/* Resend Row with Cooldown Timer */}
                                    <div className="flex items-center justify-between border-y border-slate-100 py-2.5 text-xs">
                                        <span className="text-slate-500">
                                            Didn't receive the SMS code?
                                        </span>
                                        {cooldownSeconds > 0 ? (
                                            <span className="font-semibold text-slate-600">
                                                Resend in{' '}
                                                <span className="font-mono font-bold text-[#0F2F58]">
                                                    {cooldownSeconds}s
                                                </span>
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleResendPhoneCode}
                                                disabled={isResending}
                                                className="cursor-pointer font-bold text-[#0F2F58] hover:underline disabled:opacity-50"
                                            >
                                                {isResending ? 'Resending...' : 'Resend code'}
                                            </button>
                                        )}
                                    </div>

                                    {/* New Password & Confirmation */}
                                    <Field label="New password">
                                        <PasswordInput
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            autoComplete="new-password"
                                            required
                                            minLength={8}
                                        />
                                    </Field>

                                    <Field label="Confirm new password">
                                        <PasswordInput
                                            value={passwordConfirmation}
                                            onChange={(event) =>
                                                setPasswordConfirmation(event.target.value)
                                            }
                                            autoComplete="new-password"
                                            required
                                            minLength={8}
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
                                            disabled={
                                                code.length < 6 ||
                                                !password ||
                                                !passwordConfirmation ||
                                                isSubmitting
                                            }
                                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isSubmitting
                                                ? 'Saving password...'
                                                : 'Save new password'}
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        className="sz-auth-secondary-link cursor-pointer py-1 text-center text-xs font-semibold text-slate-500 hover:text-slate-900"
                                        onClick={resetPhoneFlow}
                                    >
                                        Try a different number
                                    </button>
                                </form>
                            </div>
                        ) : null}
                    </>
                ) : null}

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
