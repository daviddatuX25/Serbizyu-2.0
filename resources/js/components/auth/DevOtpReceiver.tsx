import { useEffect, useRef, useState } from 'react';

export interface DevOtpReceiverProps {
    otpPreview?: {
        code: string;
        expires_in_seconds: number;
        delivered_at?: string;
    } | null;
    phone?: string | null;
    onFillCode: (code: string) => void;
    onResend?: () => void;
    isResending?: boolean;
    autoFillDelaySeconds?: number;
}

function formatSeconds(seconds: number): string {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function DevOtpReceiver({
    otpPreview,
    phone,
    onFillCode,
    onResend,
    isResending = false,
    autoFillDelaySeconds = 3,
}: DevOtpReceiverProps) {
    if (!otpPreview || !otpPreview.code) {
        return null;
    }

    const currentCode = otpPreview.code;
    const [countdown, setCountdown] = useState<number>(autoFillDelaySeconds);
    const [autoFillEnabled, setAutoFillEnabled] = useState<boolean>(true);
    const [isFilled, setIsFilled] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);
    const [remainingSeconds, setRemainingSeconds] = useState<number>(
        () => otpPreview.expires_in_seconds || 600,
    );

    // Track the last filled code to prevent duplicate fills on the same code.
    const lastFilledCodeRef = useRef<string | null>(null);

    // When the OTP code from props changes, reset state for the new code.
    useEffect(() => {
        setCountdown(autoFillDelaySeconds);
        setIsFilled(false);
        lastFilledCodeRef.current = null;
        setRemainingSeconds(otpPreview.expires_in_seconds || 600);
    }, [currentCode, autoFillDelaySeconds, otpPreview.expires_in_seconds]);

    // Simulated SMS arrival timer -> Auto-fill countdown.
    useEffect(() => {
        if (!autoFillEnabled || isFilled || countdown <= 0) {
            if (countdown === 0 && !isFilled && lastFilledCodeRef.current !== currentCode) {
                lastFilledCodeRef.current = currentCode;
                setIsFilled(true);
                onFillCode(currentCode);
            }
            return;
        }

        const timer = window.setTimeout(() => {
            setCountdown((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => window.clearTimeout(timer);
    }, [countdown, autoFillEnabled, isFilled, currentCode, onFillCode]);

    // OTP real-time expiration countdown.
    useEffect(() => {
        if (remainingSeconds <= 0) {
            return;
        }

        const interval = window.setInterval(() => {
            setRemainingSeconds((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => window.clearInterval(interval);
    }, [remainingSeconds]);

    const handleFillImmediately = () => {
        lastFilledCodeRef.current = currentCode;
        setIsFilled(true);
        setCountdown(0);
        onFillCode(currentCode);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(currentCode);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback if clipboard API is restricted
            setCopied(false);
        }
    };

    // Calculate countdown progress percentage
    const progressPercent = Math.min(
        100,
        Math.max(0, ((autoFillDelaySeconds - countdown) / autoFillDelaySeconds) * 100),
    );

    return (
        <section
            aria-label="Developer OTP receiver"
            className="overflow-hidden rounded-xl border border-amber-500/35 bg-amber-500/5 p-4 text-card-foreground shadow-xs transition-all dark:border-amber-400/25 dark:bg-amber-400/5"
        >
            {/* Header Badge & Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/15 pb-2.5 text-xs">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 font-semibold text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400"></span>
                        </span>
                        Dev SMS Receiver
                    </span>
                    {phone ? (
                        <span className="font-mono text-muted-foreground">
                            To: <strong className="text-foreground">{phone}</strong>
                        </span>
                    ) : null}
                </div>

                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="text-[11px] tracking-wider uppercase">Expires:</span>
                    <span
                        className={`font-mono font-medium ${remainingSeconds < 60 ? 'font-bold text-destructive' : 'text-foreground'}`}
                    >
                        {formatSeconds(remainingSeconds)}
                    </span>
                </div>
            </div>

            {/* OTP Code Display Box */}
            <div className="my-3 flex flex-col items-center justify-center gap-2 rounded-lg border border-amber-500/20 bg-background/80 px-4 py-3 shadow-2xs">
                <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Simulated Verification Code
                </div>
                <div
                    className="flex items-center gap-1.5 font-mono text-2xl font-bold tracking-[0.25em] text-foreground sm:text-3xl"
                    title="Click to copy code"
                >
                    {currentCode.split('').map((digit, idx) => (
                        <span
                            key={idx}
                            className="inline-flex h-10 w-8 items-center justify-center rounded-md border border-border/80 bg-muted/40 font-mono text-foreground shadow-2xs sm:h-11 sm:w-9"
                        >
                            {digit}
                        </span>
                    ))}
                </div>
            </div>

            {/* Timed Auto-fill Status & Progress Bar */}
            {autoFillEnabled && !isFilled ? (
                <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-medium text-amber-800 dark:text-amber-300">
                            <svg
                                className="h-3.5 w-3.5 animate-spin text-amber-600 dark:text-amber-400"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8H4z"
                                ></path>
                            </svg>
                            Auto-filling code in{' '}
                            <strong className="font-mono font-bold text-foreground">
                                {countdown}s
                            </strong>
                            ...
                        </span>
                        <button
                            type="button"
                            onClick={() => setAutoFillEnabled(false)}
                            className="text-[11px] text-muted-foreground underline hover:text-foreground"
                        >
                            Cancel timer
                        </button>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-amber-500/20">
                        <div
                            className="h-full bg-amber-500 transition-all duration-1000 ease-linear dark:bg-amber-400"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            ) : null}

            {isFilled ? (
                <div className="mb-3 flex items-center justify-between rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                        <svg
                            className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Code placed in verification input
                    </span>
                    <button
                        type="button"
                        onClick={handleFillImmediately}
                        className="text-[11px] font-semibold underline hover:text-foreground"
                    >
                        Re-fill
                    </button>
                </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleFillImmediately}
                        className="inline-flex h-8 items-center justify-center rounded-md bg-amber-600 px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-amber-700 active:bg-amber-800 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-400"
                    >
                        {isFilled ? 'Re-place Code' : 'Auto-fill Code Now'}
                    </button>

                    <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground shadow-2xs transition-colors hover:bg-muted"
                    >
                        {copied ? '✓ Copied!' : 'Copy Code'}
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {onResend ? (
                        <button
                            type="button"
                            onClick={onResend}
                            disabled={isResending}
                            className="text-xs font-medium text-amber-900 underline hover:text-foreground disabled:opacity-50 dark:text-amber-300"
                        >
                            {isResending ? 'Resending...' : 'Request fresh code'}
                        </button>
                    ) : null}

                    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground select-none">
                        <input
                            type="checkbox"
                            checked={autoFillEnabled}
                            onChange={(e) => setAutoFillEnabled(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-border text-amber-600 focus:ring-amber-500"
                        />
                        <span>Auto-fill timer</span>
                    </label>
                </div>
            </div>
        </section>
    );
}

export default DevOtpReceiver;
