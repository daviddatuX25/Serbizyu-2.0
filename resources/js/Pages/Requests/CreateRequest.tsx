import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Sparkles,
    Calendar,
    Clock,
    ShieldCheck,
    Eye,
    X,
    MapPin,
    Coins,
} from 'lucide-react';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';
import { BottomNavBar, type NavTabId } from '../../marketplace/components/BottomNavBar';
import { CreatorPostModal } from '../../components/marketplace/CreatorPostModal';
import { QuickDealScanModal } from '../../components/marketplace/QuickDealScanModal';

interface CreateRequestProps {
    session?: unknown;
    readiness?: unknown;
    correlationId?: string;
    errors?: Record<string, string>;
}

export default function CreateRequest(_props: CreateRequestProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [creatorOpen, setCreatorOpen] = useState(false);
    const [quickDealOpen, setQuickDealOpen] = useState(false);

    // Step 1: Need & Category
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('repairs');
    const [description, setDescription] = useState('');

    // Step 2: Urgency & Budget
    const [urgency, setUrgency] = useState<'today' | 'this_week' | 'flexible'>('today');
    const [budgetMode, setBudgetMode] = useState<'fixed' | 'quotes'>('fixed');
    const [budget, setBudget] = useState('450');

    // Step 3: Fulfillment & Location
    const [fulfillment, setFulfillment] = useState<'direct' | 'courier' | 'all'>('direct');
    const [area] = useState('Tagudin Centro');
    const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
    // Form Submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormErrors({});

        const effectiveDescription =
            description.trim().length >= 10
                ? description.trim()
                : `${title.trim()} — Tagudin community citizen service request. Verified local providers can submit bids and quotes.`;

        const payload = {
            title: title.trim(),
            description: effectiveDescription,
            category_code: category,
            budget_amount: budgetMode === 'quotes' ? null : parseFloat(budget || '0'),
            urgency,
            preferred_fulfillment: fulfillment,
        };

        router.post('/requests', payload, {
            onSuccess: () => {
                router.visit('/browse');
            },
            onError: (errs) => {
                setFormErrors(errs);
                setIsSubmitting(false);
                if (errs.title || errs.description || errs.category_code) {
                    setStep(1);
                } else if (errs.budget_amount || errs.urgency) {
                    setStep(2);
                }
            },
        });
    };
    const renderCustomerLiveTwin = () => (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0F2F58] uppercase tracking-wider">
                        <Eye className="size-3.5 text-blue-600" />
                        <span>Job Board Live Twin</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                        Real-time preview of how local providers see this request
                    </p>
                </div>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-900 uppercase">
                    Citizen Need
                </span>
            </div>

            {/* Community Request Card Preview */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 transition-all hover:shadow-md">
                <div className="flex items-center justify-between text-xs">
                    <span className="rounded-full bg-[#EBF2FA] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F2F58] uppercase">
                        {category}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        urgency === 'today'
                            ? 'bg-rose-100 text-rose-800'
                            : urgency === 'this_week'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                    }`}>
                        {urgency === 'today' ? '⚡ Needed Today' : urgency === 'this_week' ? '📅 This Week' : '🕒 Flexible Timing'}
                    </span>
                </div>

                <div>
                    <h3 className="text-sm font-extrabold text-[#0F2F58]">
                        {title.trim() || 'Need urgent electrician / plumbing repair'}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 line-clamp-3">
                        {description.trim() || 'Describe what you need fixed, installed, or picked up in Tagudin...'}
                    </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                    <div className="flex items-center gap-1 font-mono font-bold text-[#0F2F58]">
                        <Coins className="size-3.5 text-emerald-600" />
                        <span>
                            {budgetMode === 'fixed'
                                ? `₱${parseFloat(budget || '0').toLocaleString('en-PH', { minimumFractionDigits: 2 })} Target Budget`
                                : 'Open to Competitive Bids'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10.5px] text-slate-500">
                    <div className="flex items-center gap-1">
                        <MapPin className="size-3 text-slate-400" />
                        <span className="truncate max-w-[170px]">{area || 'Tagudin Centro'}</span>
                    </div>
                    <span className="font-semibold text-emerald-700">0% Citizen Fee</span>
                </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-[11px] text-blue-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="size-3.5 text-blue-700" />
                    <span>Public Tagudin Job Rails</span>
                </div>
                <p className="text-[10.5px] leading-relaxed text-blue-900/90">
                    Verified local trades in Tagudin will be notified. You can review quotes, check provider badges, and accept when satisfied.
                </p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 pb-16">
            <DesktopGlobalNav activeRoute="browse" />

            <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:py-6 space-y-6">
                {/* Top Header Control Bar */}
                <header className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/browse"
                            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                            <ArrowLeft className="size-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-extrabold text-[#0F2F58] sm:text-base">
                                    Post Community Request
                                </h1>
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-900 uppercase">
                                    Step {step} of 3
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Request assistance, emergency repairs, or services from verified Tagudin providers.
                            </p>
                        </div>
                    </div>
                </header>

                {/* Stepper Progress */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white px-5 py-3 shadow-2xs">
                    <div className="flex items-center gap-2">
                        <div className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                            step >= 1 ? 'bg-[#0F2F58] text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                            1
                        </div>
                        <span className={`text-xs font-bold ${step === 1 ? 'text-[#0F2F58]' : 'text-slate-600'}`}>
                            Need &amp; Category
                        </span>
                    </div>
                    <div className="h-0.5 w-12 bg-slate-200 sm:w-24" />
                    <div className="flex items-center gap-2">
                        <div className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                            step >= 2 ? 'bg-[#0F2F58] text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                            2
                        </div>
                        <span className={`text-xs font-bold ${step === 2 ? 'text-[#0F2F58]' : 'text-slate-600'}`}>
                            Urgency &amp; Budget
                        </span>
                    </div>
                    <div className="h-0.5 w-12 bg-slate-200 sm:w-24" />
                    <div className="flex items-center gap-2">
                        <div className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                            step >= 3 ? 'bg-[#0F2F58] text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                            3
                        </div>
                        <span className={`text-xs font-bold ${step === 3 ? 'text-[#0F2F58]' : 'text-slate-600'}`}>
                            Location &amp; Submit
                        </span>
                    </div>
                </div>

                {/* Responsive 2-Column Grid */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
                    {/* LEFT COLUMN: Request Form Studio (Cols 1-7) */}
                    <main className="rounded-2xl border border-slate-200/80 bg-white p-5 lg:col-span-7 lg:p-7 shadow-xs space-y-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <span className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-900">
                                    <Sparkles className="size-3 text-blue-700" />
                                    <span>Citizen Need / RFQ</span>
                                </span>
                                <h2 className="text-lg font-extrabold text-slate-900">
                                    What service do you need?
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Describe your task to receive direct proposals from Tagudin tradespeople.
                                </p>
                            </div>

                            {formErrors.title && (
                                <p className="text-xs font-bold text-red-600">{formErrors.title}</p>
                            )}

                            {/* Request Title */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Request Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Split AC not cooling / Emergency circuit breaker fix"
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                />
                            </div>

                            {/* Trade Category */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Trade Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                >
                                    <option value="repairs">Repairs &amp; AC / Electrical</option>
                                    <option value="home-cleaning">House Cleaning &amp; Chores</option>
                                    <option value="courier">Courier &amp; Delivery Runner</option>
                                    <option value="print-assist">Document Printing &amp; Scan</option>
                                    <option value="local-services">General Municipal Help</option>
                                </select>
                            </div>

                            {/* Scope Description */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Task Details</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    placeholder="Describe the issue, location in the house, brand of unit, or any materials you already have..."
                                    className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] p-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                />
                            </div>

                            <button
                                type="button"
                                disabled={!title.trim()}
                                onClick={() => setStep(2)}
                                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] py-3 text-xs font-bold text-slate-950 shadow-xs transition-colors hover:bg-[#e6b327] disabled:opacity-50"
                            >
                                <span>Continue to Timing &amp; Budget</span>
                                <ArrowRight className="size-3.5" />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900">Timing &amp; Budget</h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Set your scheduling preferences and budget range.
                                </p>
                            </div>

                            {/* Urgency Selector */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">When is it needed?</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setUrgency('today')}
                                        className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition-all ${
                                            urgency === 'today'
                                                ? 'border-[#0F2F58] bg-[#EBF2FA] text-[#0F2F58]'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        <Clock className="size-4 mb-1" />
                                        <span className="text-[11px] font-extrabold">Today</span>
                                        <span className="text-[9px] text-slate-500">Urgent</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setUrgency('this_week')}
                                        className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition-all ${
                                            urgency === 'this_week'
                                                ? 'border-[#0F2F58] bg-[#EBF2FA] text-[#0F2F58]'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        <Calendar className="size-4 mb-1" />
                                        <span className="text-[11px] font-extrabold">This Week</span>
                                        <span className="text-[9px] text-slate-500">Next 2-3 days</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setUrgency('flexible')}
                                        className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition-all ${
                                            urgency === 'flexible'
                                                ? 'border-[#0F2F58] bg-[#EBF2FA] text-[#0F2F58]'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        <Sparkles className="size-4 mb-1" />
                                        <span className="text-[11px] font-extrabold">Flexible</span>
                                        <span className="text-[9px] text-slate-500">Anytime</span>
                                    </button>
                                </div>
                            </div>

                            {/* Budget Mode */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Budget Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setBudgetMode('fixed')}
                                        className={`rounded-xl border py-2.5 text-center text-xs font-bold transition-all ${
                                            budgetMode === 'fixed'
                                                ? 'border-[#0F2F58] bg-[#EBF2FA] text-[#0F2F58]'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        Target Budget
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBudgetMode('quotes')}
                                        className={`rounded-xl border py-2.5 text-center text-xs font-bold transition-all ${
                                            budgetMode === 'quotes'
                                                ? 'border-[#0F2F58] bg-[#EBF2FA] text-[#0F2F58]'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        Get Quotes / Undisclosed
                                    </button>
                                </div>
                            </div>

                            {/* Target Budget Input */}
                            {budgetMode === 'fixed' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Estimated Budget (PHP)</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                            ₱
                                        </span>
                                        <input
                                            type="number"
                                            value={budget}
                                            onChange={(e) => setBudget(e.target.value)}
                                            min="50"
                                            step="50"
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] pl-8 pr-3.5 py-2.5 font-mono text-sm font-extrabold text-slate-900 outline-none focus:border-[#0F2F58]"
                                        />
                                    </div>
                                    <p className="text-[10.5px] text-slate-500">
                                        Tagudin providers can propose matching or alternative quotes.
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="flex-1 rounded-xl bg-[#FFC72C] py-3 text-xs font-bold text-slate-950 shadow-xs hover:bg-[#e6b327] cursor-pointer"
                                >
                                    Review &amp; Post
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900">Review &amp; Post</h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Broadcast your request to verified providers across Tagudin.
                                </p>
                            </div>

                            {/* Preferred Fulfillment */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Fulfillment Preference</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFulfillment('direct')}
                                        className={`rounded-xl border p-2.5 text-left transition-all ${
                                            fulfillment === 'direct'
                                                ? 'border-[#0F2F58] bg-[#EBF2FA]'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="text-xs font-extrabold text-[#0F2F58]">Direct Provider</div>
                                        <div className="text-[10px] text-slate-500">On-site execution</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFulfillment('courier')}
                                        className={`rounded-xl border p-2.5 text-left transition-all ${
                                            fulfillment === 'courier'
                                                ? 'border-[#0F2F58] bg-[#EBF2FA]'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="text-xs font-extrabold text-[#0F2F58]">Include Courier</div>
                                        <div className="text-[10px] text-slate-500">Padala transit needed</div>
                                    </button>
                                </div>
                            </div>

                            {/* Request Preview Card */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                    <span className="rounded-full bg-[#EBF2FA] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F2F58] uppercase">
                                        RFQ · {category}
                                    </span>
                                    <span className="font-mono text-sm font-extrabold text-[#0F2F58]">
                                        {budgetMode === 'quotes' ? 'Open for Bids' : `₱${parseFloat(budget || '0').toFixed(2)}`}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
                                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                        {description || 'Community service request.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Urgency</span>
                                        <div className="font-extrabold text-slate-800 capitalize">
                                            {urgency.replace('_', ' ')}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Area</span>
                                        <div className="font-extrabold text-slate-800">{area}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-emerald-800 font-semibold pt-1">
                                    <ShieldCheck className="size-4 text-emerald-700 shrink-0" />
                                    <span>Tenders protected by Tagudin Municipal Code of Conduct</span>
                                </div>
                            </div>

                            <div className="flex gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 rounded-xl bg-[#0F2F58] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#153e74] disabled:opacity-50 cursor-pointer"
                                >
                                    {isSubmitting ? 'Posting Request...' : 'Post Request to Tagudin ✓'}
                                </button>
                            </div>
                        </form>
                    )}
                    </main>

                    {/* RIGHT COLUMN: Customer Live Twin Request Preview (Cols 8-12, Sticky on Desktop) */}
                    <aside className="sticky top-20 hidden space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-5 lg:block">
                        {renderCustomerLiveTwin()}
                    </aside>
                </div>

                {/* Floating Preview Button for Mobile Screens */}
                <div className="fixed bottom-20 right-4 z-40 lg:hidden">
                    <button
                        type="button"
                        onClick={() => setMobilePreviewOpen(true)}
                        className="flex items-center gap-2 rounded-full bg-[#0F2F58] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
                    >
                        <Eye className="size-4 text-blue-400" />
                        <span>Live Twin Preview</span>
                    </button>
                </div>

                {/* Mobile Customer Twin Modal Sheet */}
                {mobilePreviewOpen && (
                    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/60 backdrop-blur-xs lg:hidden">
                        <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <span className="font-extrabold text-[#0F2F58] text-sm">Citizen Job Board Twin</span>
                                <button
                                    type="button"
                                    onClick={() => setMobilePreviewOpen(false)}
                                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>
                            <div className="pt-3">
                                {renderCustomerLiveTwin()}
                            </div>
                        </div>
                    </div>
                )}

                <BottomNavBar
                    activeTab="post"
                    onTabSelect={(tab: NavTabId) => {
                        if (tab === 'explore') router.visit('/browse');
                        if (tab === 'post') setCreatorOpen(true);
                        if (tab === 'quick_deal') setQuickDealOpen(true);
                        if (tab === 'orders') router.visit('/orders');
                        if (tab === 'profile') router.visit('/my-listings');
                    }}
                    onQuickDealClick={() => setQuickDealOpen(true)}
                />

                <CreatorPostModal open={creatorOpen} onClose={() => setCreatorOpen(false)} />
                <QuickDealScanModal open={quickDealOpen} onClose={() => setQuickDealOpen(false)} />
            </div>
        </div>
    );
}
