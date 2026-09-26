import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Sparkles,
    Calendar,
    Clock,
    ShieldCheck,
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

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
            <DesktopGlobalNav activeRoute="browse" />

            <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col bg-white pb-[90px] lg:pb-8 shadow-xs lg:my-8 lg:min-h-[auto] lg:rounded-2xl lg:border lg:border-slate-200">
                <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur lg:rounded-t-2xl">
                    <Link
                        href="/browse"
                        className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div className="text-center">
                        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            Step {step} of 3
                        </span>
                        <h1 className="text-xs font-extrabold text-[#0F2F58]">
                            Post Community Request
                        </h1>
                    </div>
                    <div className="size-9" />
                </header>

                {/* Stepper Progress */}
                <div className="flex items-center justify-center gap-1.5 border-b border-slate-100 bg-[#FAFCFB] py-2.5">
                    <div
                        className={`h-1.5 rounded-full transition-all ${step === 1 ? 'w-8 bg-[#0F2F58]' : 'w-2 bg-slate-300'}`}
                    />
                    <div
                        className={`h-1.5 rounded-full transition-all ${step === 2 ? 'w-8 bg-[#0F2F58]' : 'w-2 bg-slate-300'}`}
                    />
                    <div
                        className={`h-1.5 rounded-full transition-all ${step === 3 ? 'w-8 bg-[#0F2F58]' : 'w-2 bg-slate-300'}`}
                    />
                </div>

                {/* Step Form Content */}
                <main className="flex-1 space-y-5 p-5">
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
