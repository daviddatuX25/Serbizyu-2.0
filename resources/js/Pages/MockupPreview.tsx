import { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    ExternalLink,
    FileText,
    KeyRound,
    Lock,
    Plus,
    Sparkles,
    Store,
} from 'lucide-react';
import { OtpPinInput } from '../components/auth/OtpPinInput';
import { ModernOnboarding } from '../components/onboarding/ModernOnboarding';
import { cn } from '../lib/utils';

export default function MockupPreview() {
    const [activeTab, setActiveTab] = useState<
        'otp' | 'auth' | 'listings_provider' | 'listings_onboarding'
    >('otp');
    const [testOtp, setTestOtp] = useState('958622');
    const [otpHasError, setOtpHasError] = useState(false);
    const [lastCompleted, setLastCompleted] = useState<string | null>('958622');

    // Auth preview state
    const [authMode, setAuthMode] = useState<'phone' | 'email'>('phone');
    const [authChallenge, setAuthChallenge] = useState(true);

    return (
        <div className="flex min-h-screen flex-col bg-[#F8FAFC] font-[var(--sz-font-sans)] text-slate-900">
            {/* Top Minimalist Header */}
            <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F2F58] font-bold text-white shadow-xs">
                            S
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold tracking-tight text-[#0F2F58]">
                                    SERBIZYU
                                </span>
                                <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                    Cult UI · Component Showcase
                                </span>
                            </div>
                            <p className="hidden text-[11px] text-slate-500 sm:block">
                                Minimalist, high-craft components with Glovo energetic accents &
                                Tagudin Market branding
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/auth/sign-in"
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900"
                        >
                            <span>Live Sign In</span>
                            <ExternalLink className="size-3" />
                        </Link>
                        <Link
                            href="/my-listings"
                            className="flex items-center gap-1 rounded-lg border border-amber-300 bg-[#FFC72C] px-2.5 py-1.5 text-xs font-semibold text-slate-950 shadow-2xs hover:bg-[#F2BA18]"
                        >
                            <span>Live My Listings</span>
                            <ExternalLink className="size-3" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Showcase Tab Navigator */}
            <div className="sticky top-[61px] z-40 border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2.5">
                    <button
                        type="button"
                        onClick={() => setActiveTab('otp')}
                        className={cn(
                            'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                            activeTab === 'otp'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
                        )}
                    >
                        <KeyRound className="size-3.5" />
                        <span>1. Cult UI OTP Pin Input</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('auth')}
                        className={cn(
                            'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                            activeTab === 'auth'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
                        )}
                    >
                        <Lock className="size-3.5" />
                        <span>2. Glovo Auth Shell & Sign In</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('listings_provider')}
                        className={cn(
                            'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                            activeTab === 'listings_provider'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
                        )}
                    >
                        <Store className="size-3.5" />
                        <span>3. My Listings (Provider Studio)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('listings_onboarding')}
                        className={cn(
                            'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                            activeTab === 'listings_onboarding'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
                        )}
                    >
                        <Sparkles className="size-3.5" />
                        <span>4. Storefront Onboarding (Buyer)</span>
                    </button>
                </div>
            </div>

            {/* Showcase Main Content Area */}
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
                {/* 1. OTP Pin Input Showcase */}
                {activeTab === 'otp' && (
                    <div className="space-y-6">
                        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                                <Sparkles className="size-3.5 text-amber-600" />
                                <span>Cult UI Component: Segmented Pin Input</span>
                            </div>
                            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
                                6-Digit Segmented OTP Component
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Individual slotted input cells with auto-advance, backspace retreat,
                                arrow key navigation, paste parsing, and Glovo yellow active rings.
                            </p>

                            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/70 p-8">
                                <span className="mb-4 text-xs font-bold text-slate-600">
                                    Interactive Live Demo (Type or Paste)
                                </span>
                                <OtpPinInput
                                    value={testOtp}
                                    onChange={(v) => {
                                        setTestOtp(v);
                                        setOtpHasError(false);
                                    }}
                                    onComplete={(v) => setLastCompleted(v)}
                                    hasError={otpHasError}
                                    autoFocus
                                />

                                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTestOtp('958622');
                                            setLastCompleted('958622');
                                        }}
                                        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-2xs hover:bg-slate-100"
                                    >
                                        Fill Sample "958622"
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTestOtp('');
                                            setLastCompleted(null);
                                        }}
                                        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-100"
                                    >
                                        Clear Code
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOtpHasError(!otpHasError)}
                                        className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100"
                                    >
                                        {otpHasError
                                            ? 'Clear Error State'
                                            : 'Simulate Invalid Error'}
                                    </button>
                                </div>

                                <div className="mt-4 text-center">
                                    <p className="text-xs text-slate-500">
                                        Current Value:{' '}
                                        <code className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono font-bold text-slate-900">
                                            {testOtp || '(empty)'}
                                        </code>
                                    </p>
                                    {lastCompleted && (
                                        <p className="mt-1 flex items-center justify-center gap-1 text-xs font-semibold text-emerald-600">
                                            <CheckCircle2 className="size-3.5" />
                                            <span>Completed 6-digit payload: {lastCompleted}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Features Checklist */}
                            <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 text-xs text-slate-600 sm:grid-cols-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                    <span>Auto-advances to next slot upon keydown</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                    <span>Backspace clears and retreats to previous slot</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                    <span>Pasting 6 digits populates all boxes at once</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                    <span>Cult UI pulsing cursor & Glovo #FFC72C focus ring</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Auth Flow Preview */}
                {activeTab === 'auth' && (
                    <div className="mx-auto max-w-md">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50">
                            <div className="mb-4 flex items-center justify-between">
                                <span className="rounded-md bg-[#EBF2FA] px-2 py-0.5 text-[11px] font-bold text-[#0F2F58]">
                                    Tagudin Citizen Identity
                                </span>
                                <span className="text-xs text-slate-400">Step 1 of 2</span>
                            </div>

                            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                                Sign in to Serbizyu
                            </h1>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Access local services, bookings, and provider tools.
                            </p>

                            {/* Pill Switcher */}
                            <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                                <button
                                    type="button"
                                    onClick={() => setAuthMode('phone')}
                                    className={cn(
                                        'cursor-pointer rounded-lg py-1.5 text-xs font-bold transition-all',
                                        authMode === 'phone'
                                            ? 'bg-white text-[#0F2F58] shadow-xs'
                                            : 'text-slate-500 hover:text-slate-900',
                                    )}
                                >
                                    Phone Number
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAuthMode('email')}
                                    className={cn(
                                        'cursor-pointer rounded-lg py-1.5 text-xs font-bold transition-all',
                                        authMode === 'email'
                                            ? 'bg-white text-[#0F2F58] shadow-xs'
                                            : 'text-slate-500 hover:text-slate-900',
                                    )}
                                >
                                    Email Address
                                </button>
                            </div>

                            {/* Form Preview */}
                            <div className="mt-5 space-y-4">
                                {authMode === 'phone' && (
                                    <>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                                Mobile Number
                                            </label>
                                            <input
                                                type="tel"
                                                defaultValue="09171234567"
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-[#FFC72C] focus:bg-white focus:ring-2 focus:ring-[#FFC72C]/20"
                                            />
                                            <span className="mt-1 block text-[11px] text-slate-400">
                                                Philippine mobile · example 09XXXXXXXXX
                                            </span>
                                        </div>

                                        {authChallenge ? (
                                            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                                <label className="block text-center text-xs font-bold text-slate-800">
                                                    Enter 6-Digit SMS Verification Code
                                                </label>
                                                <OtpPinInput
                                                    value={testOtp}
                                                    onChange={setTestOtp}
                                                />
                                                <p className="text-center text-[11px] text-slate-400">
                                                    We sent a one-time code to 09171234567
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="mb-1 flex items-center justify-between">
                                                    <label className="text-xs font-semibold text-slate-700">
                                                        Password
                                                    </label>
                                                    <span className="cursor-pointer text-xs font-semibold text-[#0F2F58] hover:underline">
                                                        Forgot?
                                                    </span>
                                                </div>
                                                <input
                                                    type="password"
                                                    defaultValue="password"
                                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-[#FFC72C] focus:bg-white focus:ring-2 focus:ring-[#FFC72C]/20"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                {authMode === 'email' && (
                                    <>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                defaultValue="juan@tagudin.ph"
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-[#FFC72C] focus:bg-white focus:ring-2 focus:ring-[#FFC72C]/20"
                                            />
                                        </div>
                                        <div>
                                            <div className="mb-1 flex items-center justify-between">
                                                <label className="text-xs font-semibold text-slate-700">
                                                    Password
                                                </label>
                                                <span className="cursor-pointer text-xs font-semibold text-[#0F2F58] hover:underline">
                                                    Forgot?
                                                </span>
                                            </div>
                                            <input
                                                type="password"
                                                defaultValue="password"
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-[#FFC72C] focus:bg-white focus:ring-2 focus:ring-[#FFC72C]/20"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Glovo Signature Primary Button */}
                                <button
                                    type="button"
                                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98]"
                                >
                                    {authChallenge ? 'Verify and Sign In' : 'Sign In'}
                                </button>

                                {authMode === 'phone' && (
                                    <button
                                        type="button"
                                        onClick={() => setAuthChallenge(!authChallenge)}
                                        className="w-full cursor-pointer py-1 text-center text-xs font-semibold text-slate-500 hover:text-[#0F2F58]"
                                    >
                                        {authChallenge
                                            ? 'Use password instead'
                                            : 'Use one-time code instead'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Provider Studio View */}
                {activeTab === 'listings_provider' && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                        <CheckCircle2 className="size-3.5" />
                                        <span>Verified Tagudin Provider · Rosa Tagudin</span>
                                    </div>
                                    <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                                        Provider Studio
                                    </h1>
                                    <p className="mt-1 max-w-xl text-xs text-slate-500 sm:text-sm">
                                        Manage your active service listings, review draft offers,
                                        and handle orders for neighbors in Tagudin.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FFC72C] px-4 py-2.5 text-xs font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] sm:text-sm"
                                    >
                                        <Plus className="size-4" />
                                        <span>Create Listing</span>
                                    </button>
                                </div>
                            </div>

                            {/* Minimalist Metrics Grid (Cult UI) */}
                            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
                                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <Store className="size-3.5 text-emerald-600" />
                                        <span>Active on Market</span>
                                    </div>
                                    <p className="mt-1.5 font-mono text-xl font-bold text-slate-900 sm:text-2xl">
                                        3
                                    </p>
                                </div>

                                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <Clock className="size-3.5 text-amber-600" />
                                        <span>Under Review</span>
                                    </div>
                                    <p className="mt-1.5 font-mono text-xl font-bold text-slate-900 sm:text-2xl">
                                        1
                                    </p>
                                </div>

                                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <FileText className="size-3.5 text-slate-600" />
                                        <span>Draft Offers</span>
                                    </div>
                                    <p className="mt-1.5 font-mono text-xl font-bold text-slate-900 sm:text-2xl">
                                        0
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Sample Provider Listings */}
                        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                            <h3 className="text-sm font-bold text-slate-900">
                                Your Active Tagudin Listings
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900">
                                                AC Capacitor & Motor Overhaul
                                            </span>
                                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                                Active · v2
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Barangay Del Pilar · Repairs & AC · Turnkey Eligible
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono text-base font-bold text-slate-900">
                                            ₱450.00
                                        </span>
                                        <div className="mt-1 flex items-center gap-2">
                                            <button
                                                type="button"
                                                className="text-xs font-semibold text-[#0F2F58] hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <span className="text-slate-300">·</span>
                                            <button
                                                type="button"
                                                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                                            >
                                                Pause
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900">
                                                Refrigerator Compressor Diagnostic
                                            </span>
                                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                                Under Review · v1
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Barangay Del Pilar · Stays private until municipal check
                                            approves
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono text-base font-bold text-slate-900">
                                            ₱600.00
                                        </span>
                                        <div className="mt-1 flex items-center gap-2">
                                            <button
                                                type="button"
                                                className="text-xs font-semibold text-[#0F2F58] hover:underline"
                                            >
                                                View Draft
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Modern Storefront Onboarding View */}
                {activeTab === 'listings_onboarding' && (
                    <div className="mx-auto max-w-xl">
                        <ModernOnboarding
                            initialDisplayName="Juan's Electrical & Appliance Repair"
                            initialAreaCode="Tagudin Centro"
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
