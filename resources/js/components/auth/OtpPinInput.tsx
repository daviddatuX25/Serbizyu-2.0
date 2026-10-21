import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export interface OtpPinInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    hasError?: boolean;
    className?: string;
}

export function OtpPinInput({
    length = 6,
    value = '',
    onChange,
    onComplete,
    disabled = false,
    autoFocus = false,
    hasError = false,
    className,
}: OtpPinInputProps) {
    const inputId = useId();
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    // Normalize value to an array of characters
    const digits = Array.from({ length }, (_, i) => value[i] ?? '');

    useEffect(() => {
        if (autoFocus && !disabled && inputRefs.current[0]) {
            inputRefs.current[0]?.focus();
        }
    }, [autoFocus, disabled]);

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        if (e.key === 'Backspace') {
            e.preventDefault();
            if (digits[index]) {
                // Clear current digit
                const newDigits = [...digits];
                newDigits[index] = '';
                const nextVal = newDigits.join('').trimEnd();
                onChange(nextVal);
            } else if (index > 0) {
                // Move to previous and clear it
                const newDigits = [...digits];
                newDigits[index - 1] = '';
                const nextVal = newDigits.join('').trimEnd();
                onChange(nextVal);
                inputRefs.current[index - 1]?.focus();
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (index < length - 1) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const raw = e.target.value;
        const clean = raw.replace(/\D/g, '');

        if (!clean) {
            const newDigits = [...digits];
            newDigits[index] = '';
            onChange(newDigits.join('').trimEnd());
            return;
        }

        // Take only the last character typed into this box
        const char = clean.slice(-1);
        const newDigits = [...digits];
        newDigits[index] = char;
        const nextVal = newDigits.join('');
        onChange(nextVal);

        // Auto advance to next input
        if (index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        if (nextVal.length === length && onComplete) {
            onComplete(nextVal);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (disabled) return;
        e.preventDefault();
        const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '');
        if (!pasted) return;

        const nextVal = pasted.slice(0, length);
        onChange(nextVal);

        const focusTarget = Math.min(nextVal.length, length - 1);
        inputRefs.current[focusTarget]?.focus();

        if (nextVal.length === length && onComplete) {
            onComplete(nextVal);
        }
    };

    return (
        <div className={cn('flex flex-col items-center gap-2', className)}>
            <div
                className="flex items-center justify-center gap-2 sm:gap-2.5"
                onPaste={handlePaste}
                role="group"
                aria-label="One-time verification code input"
            >
                {Array.from({ length }).map((_, index) => {
                    const digit = digits[index] || '';
                    const isFocused = focusedIndex === index;
                    const isFilled = digit !== '';

                    return (
                        <div
                            key={index}
                            className={cn(
                                'relative flex h-13 w-11 items-center justify-center rounded-xl border bg-white font-mono text-xl font-semibold transition-all duration-150 sm:h-14 sm:w-12 sm:text-2xl',
                                'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
                                isFocused &&
                                    'z-10 scale-[1.03] border-[#FFC72C] shadow-md ring-3 ring-[#FFC72C]/25',
                                !isFocused &&
                                    isFilled &&
                                    'border-neutral-400 bg-neutral-50/50 text-neutral-900',
                                !isFocused &&
                                    !isFilled &&
                                    'border-neutral-200 text-neutral-900 hover:border-neutral-300',
                                hasError &&
                                    'border-rose-400 bg-rose-50/30 text-rose-600 ring-2 ring-rose-200/50',
                                disabled && 'cursor-not-allowed bg-neutral-100 opacity-50',
                            )}
                            onClick={() => inputRefs.current[index]?.focus()}
                        >
                            <input
                                ref={(el) => {
                                    inputRefs.current[index] = el;
                                }}
                                id={`${inputId}-${index}`}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={1}
                                value={digit}
                                disabled={disabled}
                                onFocus={() => setFocusedIndex(index)}
                                onBlur={() => setFocusedIndex(null)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onChange={(e) => handleChange(index, e)}
                                className="absolute inset-0 h-full w-full cursor-pointer text-center opacity-0 disabled:cursor-not-allowed"
                                aria-label={`Digit ${index + 1} of ${length}`}
                                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                            />

                            {digit ? (
                                <span className="tracking-tight text-neutral-900 select-none">
                                    {digit}
                                </span>
                            ) : isFocused ? (
                                <span className="h-5 w-0.5 animate-pulse rounded-full bg-neutral-900" />
                            ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
