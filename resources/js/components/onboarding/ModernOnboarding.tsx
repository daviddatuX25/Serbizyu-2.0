import { router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowRight, Building2, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { Field, Notice, PasswordInput, PasswordRequirements, TextInput } from '@/components/ui';
export interface ModernOnboardingProps {
    initialDisplayName?: string;
    initialAreaCode?: string;
    initialLanguageCode?: 'fil' | 'en';
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ModernOnboarding({
    initialDisplayName = '',
    initialAreaCode = 'Tagudin Centro',
    initialLanguageCode = 'fil',
    onSuccess,
    onCancel,
}: ModernOnboardingProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [displayName, setDisplayName] = useState(initialDisplayName);
    const [areaCode, setAreaCode] = useState(
        initialAreaCode === 'Tagudin' || initialAreaCode === 'Tagudin Centro'
            ? initialAreaCode
            : 'Tagudin Centro',
    );
    const [languageCode, setLanguageCode] = useState<'fil' | 'en'>(initialLanguageCode);
    const [providerIntent, setProviderIntent] = useState(true);
    const lowDataMode = false;
    const helpPreference = 'self_managed';

    // Password credentials
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    const handleContinueToSecurity = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorText(null);

        const trimmed = displayName.trim();
        if (!trimmed) {
            setErrorText('Please enter your storefront or provider display name.');
            return;
        }
        if (trimmed.length > 120) {
            setErrorText('Display name must not exceed 120 characters.');
            return;
        }

        setStep(2);
    };

    const handleCompleteOnboarding = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorText(null);

        if (!password || password.length < 8) {
            setErrorText('Password must be at least 8 characters long.');
            return;
        }

        if (password !== passwordConfirmation) {
            setErrorText('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);

        router.post(
            '/onboarding',
            {
                provider_intent: providerIntent,
                display_name: displayName.trim(),
                area_code: areaCode,
                language_code: languageCode,
                low_data_mode: lowDataMode,
                help_preference: helpPreference,
                password,
                password_confirmation: passwordConfirmation,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    setStep(3);
                    if (onSuccess) {
                        onSuccess();
                    }
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    const firstError = Object.values(errors)[0];
                    if (Array.isArray(firstError)) {
                        setErrorText(String(firstError[0]));
                    } else if (typeof firstError === 'string') {
                        setErrorText(firstError);
                    } else {
                        setErrorText(
                            'Unable to complete storefront setup. Please review the fields.',
                        );
                    }
                },
            },
        );
    };

    return (
        <div className="w-full">
            {/* Step Indicator Header */}
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0F2F58] text-[11px] font-bold text-white">
                        {step === 3 ? '✓' : step}
                    </span>
                    <span className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                        {step === 1
                            ? 'Step 1 of 2: Tagudin Presence'
                            : step === 2
                              ? 'Step 2 of 2: Credential Lock'
                              : 'Storefront Activated'}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div
                        className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'w-8 bg-[#0F2F58]' : 'w-3 bg-slate-200'}`}
                    />
                    <div
                        className={`h-1.5 rounded-full transition-all ${step >= 2 ? 'w-8 bg-[#0F2F58]' : 'w-3 bg-slate-200'}`}
                    />
                    <div
                        className={`h-1.5 rounded-full transition-all ${step === 3 ? 'w-8 bg-emerald-500' : 'w-3 bg-slate-200'}`}
                    />
                </div>
            </div>

            {errorText ? (
                <div className="mb-4">
                    <Notice tone="danger">{errorText}</Notice>
                </div>
            ) : null}

            {/* Step 1: Profile & Tagudin Presence */}
            {step === 1 ? (
                <form onSubmit={handleContinueToSecurity} className="space-y-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        {/* Left Column: Identity & Location */}
                        <div className="space-y-4">
                            <Field
                                label="Provider / Storefront Display Name"
                                hint={`${displayName.length}/120`}
                            >
                                <TextInput
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="e.g. Rosa's Tailoring / Mang Jose"
                                    required
                                    maxLength={120}
                                />
                            </Field>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Service Area in Tagudin
                                </label>
                                <select
                                    value={areaCode}
                                    onChange={(e) => setAreaCode(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 transition-all outline-none focus:border-[#0F2F58] focus:bg-white focus:ring-2 focus:ring-[#0F2F58]/15"
                                >
                                    <option value="Tagudin Centro">
                                        Tagudin Centro (Poblacion)
                                    </option>
                                    <option value="Tagudin">Tagudin General Area</option>
                                </select>
                            </div>
                        </div>

                        {/* Right Column: Language & Storefront Toggle */}
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Primary Language
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setLanguageCode('fil')}
                                        className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                                            languageCode === 'fil'
                                                ? 'border-[#0F2F58] bg-[#0F2F58] text-white shadow-xs'
                                                : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        Filipino
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLanguageCode('en')}
                                        className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                                            languageCode === 'en'
                                                ? 'border-[#0F2F58] bg-[#0F2F58] text-white shadow-xs'
                                                : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        English
                                    </button>
                                </div>
                            </div>

                            {/* Provider Intent Toggle */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Storefront Participation
                                </label>
                                <div
                                    onClick={() => setProviderIntent(!providerIntent)}
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                                        providerIntent
                                            ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                                            : 'border-slate-200 bg-slate-50 text-slate-700'
                                    }`}
                                >
                                    <div
                                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                            providerIntent
                                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                                : 'border-slate-300 bg-white'
                                        }`}
                                    >
                                        {providerIntent ? '✓' : ''}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900">
                                            Open Storefront &amp; Offer Services
                                        </div>
                                        <div className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                                            Enables service listing creation, RFQ bidding, and
                                            commercial trade in Tagudin.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-5">
                        {onCancel ? (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        ) : null}
                        <button
                            type="submit"
                            className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#FFC72C] px-5 py-2.5 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98]"
                        >
                            <span>Continue to Security</span>
                            <span>→</span>
                        </button>
                    </div>
                </form>
            ) : null}

            {/* Step 2: Account Security (Password Setup) */}
            {step === 2 ? (
                <form onSubmit={handleCompleteOnboarding} className="space-y-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        {/* Left Column: Password Inputs */}
                        <div className="space-y-4">
                            <Field label="Password">
                                <PasswordInput
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                />
                            </Field>

                            <Field label="Confirm Password">
                                <PasswordInput
                                    value={passwordConfirmation}
                                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                />
                            </Field>
                        </div>

                        {/* Right Column: Security Guidance */}
                        {/* Right Column: Dynamic Password Requirements Guide */}
                        <div className="flex flex-col justify-center">
                            <PasswordRequirements
                                password={password}
                                passwordConfirmation={passwordConfirmation}
                                showConfirmation={Boolean(passwordConfirmation)}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            ← Back
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || password.length < 8 || !passwordConfirmation}
                            className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#FFC72C] px-5 py-2.5 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span>{isSubmitting ? 'Saving...' : 'Complete Storefront Setup'}</span>
                            <span>✓</span>
                        </button>
                    </div>
                </form>
            ) : null}

            {/* Step 3: Success Celebration State with Unlocked Capabilities & Tiers */}
            {step === 3 ? (
                <div className="space-y-6 py-4 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
                        <Check className="h-7 w-7 stroke-[3]" />
                    </div>

                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800">
                            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                            <span>LEVEL 1 · PHONE VERIFIED ACTIVE</span>
                        </div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                            Congratulations, {displayName || 'Neighbor'}!
                        </h2>
                        <p className="mx-auto max-w-md text-xs text-slate-500 sm:text-sm">
                            Your account is verified and ready for trade in Tagudin.
                        </p>
                    </div>

                    {/* Unlocked Capabilities Box */}
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 text-left">
                        <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-800 uppercase">
                            <Sparkles className="size-3.5 text-amber-500" />
                            <span>Unlocked Capabilities</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-3">
                            <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-2.5 shadow-2xs">
                                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                                    ✓
                                </span>
                                <span className="font-medium">Publish Service Listings</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-2.5 shadow-2xs">
                                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                                    ✓
                                </span>
                                <span className="font-medium">Direct Chat with Buyers</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-2.5 shadow-2xs">
                                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                                    ✓
                                </span>
                                <span className="font-medium">Submit Quotes &amp; RFQs</span>
                            </div>
                        </div>
                    </div>

                    {/* Future Tiers Preview */}
                    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-left">
                        <div className="mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                            Next Trust Milestones (Upgrade anytime in Settings)
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-2xs">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                    <Building2 className="size-3.5 text-blue-600" />
                                    <span>Level 2: Barangay Endorsed</span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Submit Barangay Clearance for boosted search placement and
                                    community trust badge.
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-2xs">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                    <ShieldCheck className="size-3.5 text-purple-600" />
                                    <span>Level 3: Formally Verified</span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Submit PhilSys ID or Trade License for certified blue checkmark
                                    and high-trust escrow.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-2.5 pt-2">
                        <button
                            type="button"
                            onClick={() => router.visit('/my-listings')}
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0F2F58] px-8 py-3 text-sm font-bold text-white shadow-xs transition-all hover:bg-[#091E38] active:scale-[0.98] sm:w-auto"
                        >
                            <span>Go to My Listings</span>
                            <ArrowRight className="size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => router.visit('/')}
                            className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline"
                        >
                            Or explore Tagudin Marketplace →
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default ModernOnboarding;
