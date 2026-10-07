import { Check, X } from 'lucide-react';

export interface PasswordRuleResult {
    id: string;
    label: string;
    met: boolean;
}

export interface PasswordValidationResult {
    isValid: boolean;
    score: number; // 0 to 4
    strength: 'none' | 'weak' | 'fair' | 'good' | 'strong';
    rules: {
        minLength: boolean;
        mixedCase: boolean;
        hasNumber: boolean;
        hasSymbol: boolean;
        matchesConfirmation?: boolean;
    };
}

export function validatePassword(
    password: string = '',
    confirmation?: string,
): PasswordValidationResult {
    const minLength = password.length >= 8;
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const mixedCase = hasLowercase && hasUppercase;
    const hasNumber = /\d/.test(password);
    // Matches symbols: non-alphanumeric or standard punctuation
    const hasSymbol = /[^A-Za-z0-9]/.test(password);

    const matchesConfirmation =
        confirmation !== undefined ? password.length > 0 && password === confirmation : undefined;

    let score = 0;
    if (minLength) score += 1;
    if (mixedCase) score += 1;
    if (hasNumber) score += 1;
    if (hasSymbol) score += 1;

    let strength: 'none' | 'weak' | 'fair' | 'good' | 'strong' = 'none';
    if (password.length > 0) {
        if (score <= 1) strength = 'weak';
        else if (score === 2) strength = 'fair';
        else if (score === 3) strength = 'good';
        else strength = 'strong';
    }

    const isValid =
        minLength &&
        mixedCase &&
        hasNumber &&
        hasSymbol &&
        (matchesConfirmation === undefined || matchesConfirmation);

    return {
        isValid,
        score,
        strength,
        rules: {
            minLength,
            mixedCase,
            hasNumber,
            hasSymbol,
            matchesConfirmation,
        },
    };
}

export interface PasswordRequirementsProps {
    password?: string;
    passwordConfirmation?: string;
    showConfirmation?: boolean;
    showStrengthBar?: boolean;
    className?: string;
}

export function PasswordRequirements({
    password = '',
    passwordConfirmation,
    showConfirmation = false,
    showStrengthBar = true,
    className = '',
}: PasswordRequirementsProps) {
    const isUntouched = password.length === 0;
    const result = validatePassword(password, showConfirmation ? passwordConfirmation : undefined);

    const ruleItems: Array<{ id: string; label: string; met: boolean }> = [
        {
            id: 'min_length',
            label: 'At least 8 characters',
            met: result.rules.minLength,
        },
        {
            id: 'mixed_case',
            label: 'At least one uppercase and one lowercase letter',
            met: result.rules.mixedCase,
        },
        {
            id: 'number',
            label: 'At least one number (0–9)',
            met: result.rules.hasNumber,
        },
        {
            id: 'symbol',
            label: 'At least one symbol (!@#$%^&*...)',
            met: result.rules.hasSymbol,
        },
    ];

    if (showConfirmation && passwordConfirmation !== undefined) {
        ruleItems.push({
            id: 'confirmation',
            label: 'Passwords match',
            met: Boolean(result.rules.matchesConfirmation),
        });
    }

    const getStrengthColor = () => {
        switch (result.strength) {
            case 'weak':
                return 'bg-rose-500';
            case 'fair':
                return 'bg-amber-500';
            case 'good':
                return 'bg-sky-500';
            case 'strong':
                return 'bg-emerald-500';
            default:
                return 'bg-slate-200';
        }
    };

    const getStrengthLabel = () => {
        switch (result.strength) {
            case 'weak':
                return 'Weak';
            case 'fair':
                return 'Fair';
            case 'good':
                return 'Good';
            case 'strong':
                return 'Strong & Secure ✓';
            default:
                return 'Password strength';
        }
    };

    return (
        <div
            data-testid="password-requirements-guide"
            className={`space-y-2.5 rounded-xl border border-slate-200/90 bg-[#FAFCFB] p-3 text-left transition-all ${className}`}
        >
            {/* Strength Meter Bar */}
            {showStrengthBar && (
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-500">Security rating:</span>
                        <span
                            className={`font-mono font-bold ${
                                result.strength === 'strong'
                                    ? 'text-emerald-700'
                                    : result.strength === 'good'
                                      ? 'text-sky-700'
                                      : result.strength === 'fair'
                                        ? 'text-amber-700'
                                        : result.strength === 'weak'
                                          ? 'text-rose-600'
                                          : 'text-slate-400'
                            }`}
                        >
                            {getStrengthLabel()}
                        </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                        {[1, 2, 3, 4].map((step) => {
                            const isFilled = !isUntouched && result.score >= step;
                            return (
                                <div
                                    key={step}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                        isFilled ? getStrengthColor() : 'bg-slate-200'
                                    }`}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Dynamic Rule Checklist */}
            <ul className="space-y-1.5 pt-0.5" aria-label="Password complexity requirements">
                {ruleItems.map((rule) => {
                    const isMet = rule.met;
                    const isUnmet = !isUntouched && !rule.met;

                    return (
                        <li
                            key={rule.id}
                            data-testid={`pwd-rule-${rule.id}`}
                            className={`flex items-center gap-2 text-xs transition-colors ${
                                isMet
                                    ? 'font-semibold text-emerald-800'
                                    : isUnmet
                                      ? 'font-medium text-rose-700'
                                      : 'font-normal text-slate-500'
                            }`}
                        >
                            <span
                                className={`flex size-4 shrink-0 items-center justify-center rounded-full transition-all ${
                                    isMet
                                        ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                                        : isUnmet
                                          ? 'bg-rose-100 text-rose-600 ring-1 ring-rose-300'
                                          : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'
                                }`}
                                aria-hidden="true"
                            >
                                {isMet ? (
                                    <Check className="size-2.5 stroke-[3]" />
                                ) : isUnmet ? (
                                    <X className="size-2.5 stroke-[3]" />
                                ) : (
                                    <span className="size-1 rounded-full bg-slate-400" />
                                )}
                            </span>
                            <span>{rule.label}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default PasswordRequirements;
