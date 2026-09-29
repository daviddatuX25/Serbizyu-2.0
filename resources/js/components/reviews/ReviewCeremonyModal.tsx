import React, { useState } from 'react';
import {
    Camera,
    CheckCircle2,
    Clock,
    Lock,
    ShieldCheck,
    Star,
    X,
} from 'lucide-react';

export type ReviewCeremonyTarget = {
    orderId: string;
    providerName: string;
    role: string;
    avatarUrl?: string;
    title?: string;
};

export interface ReviewCeremonyModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId?: string;
    dealChainId?: string;
    referenceTitle: string;
    actorRole?: 'buyer' | 'provider';
    targets: ReviewCeremonyTarget[];
    initialStage?: 'compose' | 'sealed' | 'revealed';
    existingReview?: {
        status: 'sealed' | 'approved' | 'unblinded';
        sealedUntil?: string | null;
        unblindedAt?: string | null;
        rating?: number | null;
        content?: string | null;
        attributeChips?: string[];
    };
    onSubmitted?: () => void;
}

const BUYER_ATTRIBUTE_CHIPS = [
    { id: 'on_time', label: 'On Time Arrival' },
    { id: 'clean_workspace', label: 'Clean Workspace' },
    { id: 'expert_fix', label: 'Expert Fix' },
    { id: 'fair_pricing', label: 'Fair Pricing' },
    { id: 'respectful', label: 'Respectful Conduct' },
];

const PROVIDER_RELIABILITY_CHIPS = [
    { id: 'cash_ready_on_site', label: 'Cash Ready on Site' },
    { id: 'site_accessible', label: 'Site Accessible & Ready' },
    { id: 'respectful_communication', label: 'Respectful Communication' },
];

const STAR_LABELS: Record<number, string> = {
    1: '1.0 · Significant delays / poor fix',
    2: '2.0 · Below expectations',
    3: '3.0 · Completed with minor issues',
    4: '4.0 · Good execution & coordination',
    5: '5.0 · Outstanding work & punctuality',
};

export default function ReviewCeremonyModal({
    isOpen,
    onClose,
    orderId,
    dealChainId,
    referenceTitle,
    actorRole = 'buyer',
    targets,
    initialStage = 'compose',
    existingReview,
    onSubmitted,
}: ReviewCeremonyModalProps) {
    const isChain = Boolean(dealChainId && targets.length > 1);
    const [stage, setStage] = useState<'compose' | 'sealed' | 'revealed'>(
        existingReview?.status === 'sealed'
            ? 'sealed'
            : existingReview?.status === 'approved' || existingReview?.status === 'unblinded'
              ? 'revealed'
              : initialStage,
    );

    // Cascading Deal Chain Toggle (AD-21)
    const [isCascading, setIsCascading] = useState(true);

    // Unified Review State (Buyer)
    const [unifiedRating, setUnifiedRating] = useState(5);
    const [unifiedChips, setUnifiedChips] = useState<string[]>(['on_time', 'clean_workspace']);
    const [unifiedNote, setUnifiedNote] = useState('');
    const [unifiedPhotoUrl, setUnifiedPhotoUrl] = useState<string | null>('/photos/ac-clean.jpg');

    // Granular Per-Node Review State (Buyer uncascaded)
    const [granularReviews, setGranularReviews] = useState<
        Record<string, { rating: number; note: string; chips: string[]; photoUrl?: string | null }>
    >(() => {
        const initial: Record<string, { rating: number; note: string; chips: string[]; photoUrl?: string | null }> = {};
        for (const t of targets) {
            initial[t.orderId] = {
                rating: 5,
                note: '',
                chips: ['on_time'],
                photoUrl: null,
            };
        }
        return initial;
    });

    // Provider Feedback State (Non-numeric Citizen Reliability)
    const [providerChips, setProviderChips] = useState<string[]>(['cash_ready_on_site', 'respectful_communication']);
    const [providerNote, setProviderNote] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const toggleChip = (chipId: string, isUnified: boolean, targetOrderId?: string) => {
        if (actorRole === 'provider') {
            setProviderChips((prev) =>
                prev.includes(chipId) ? prev.filter((c) => c !== chipId) : [...prev, chipId],
            );
            return;
        }

        if (isUnified || !targetOrderId) {
            setUnifiedChips((prev) =>
                prev.includes(chipId) ? prev.filter((c) => c !== chipId) : [...prev, chipId],
            );
        } else {
            setGranularReviews((prev) => {
                const current = prev[targetOrderId]?.chips ?? [];
                const updated = current.includes(chipId)
                    ? current.filter((c) => c !== chipId)
                    : [...current, chipId];
                return {
                    ...prev,
                    [targetOrderId]: {
                        ...(prev[targetOrderId] ?? { rating: 5, note: '' }),
                        chips: updated,
                    },
                };
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setSubmitError(null);

        try {
            if (isChain && dealChainId) {
                // Batch Deal Chain Review Endpoint
                const payload = isCascading
                    ? {
                          mode: 'cascade',
                          unified_review: {
                              rating: unifiedRating,
                              content: unifiedNote || null,
                              attribute_chips: unifiedChips,
                              evidence_file_id: null,
                          },
                      }
                    : {
                          mode: 'granular',
                          granular_reviews: targets.map((t) => ({
                              order_id: t.orderId,
                              rating: granularReviews[t.orderId]?.rating ?? 5,
                              content: granularReviews[t.orderId]?.note || null,
                              attribute_chips: granularReviews[t.orderId]?.chips ?? [],
                              evidence_file_id: null,
                          })),
                      };

                const res = await fetch(`/deal-chains/${dealChainId}/reviews`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN':
                            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
                                ?.content || '',
                    },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const errJson = await res.json().catch(() => ({}));
                    throw new Error(errJson?.error?.message || 'Failed to submit reviews.');
                }

                const resData = await res.json();
                const unblinded = resData?.data?.reviews?.every((r: { unblinded: boolean }) => r.unblinded);
                setStage(unblinded ? 'revealed' : 'sealed');
                onSubmitted?.();
            } else {
                // Single Order Review Endpoint
                const targetOrder = orderId || targets[0]?.orderId;
                if (!targetOrder) throw new Error('Order identifier not provided.');

                const payload =
                    actorRole === 'buyer'
                        ? {
                              rating: unifiedRating,
                              content: unifiedNote || null,
                              attribute_chips: unifiedChips,
                              cascade: true,
                          }
                        : {
                              rating: 5, // internal DB constraint placeholder, server stores NULL
                              content: providerNote || null,
                              attribute_chips: providerChips,
                              cascade: false,
                          };

                const res = await fetch(`/orders/${targetOrder}/reviews`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN':
                            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
                                ?.content || '',
                    },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const errJson = await res.json().catch(() => ({}));
                    throw new Error(errJson?.error?.message || 'Failed to submit review.');
                }

                const resData = await res.json();
                const willUnblind = Boolean(resData?.data?.unblinded);
                setStage(willUnblind ? 'revealed' : 'sealed');
                onSubmitted?.();
            }
        } catch (err: unknown) {
            setSubmitError(err instanceof Error ? err.message : 'An error occurred.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            data-testid="review-ceremony-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
            <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                {/* Topbar */}
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-5">
                    <div>
                        <h2 className="text-sm font-extrabold text-[#0F2F58]">
                            {stage === 'compose'
                                ? actorRole === 'buyer'
                                    ? isChain
                                        ? 'Rate Deal Chain Project'
                                        : 'Rate Service Order'
                                    : 'Citizen Reliability Feedback'
                                : stage === 'sealed'
                                  ? 'Review Cryptographically Sealed'
                                  : 'Verified Reviews Revealed'}
                        </h2>
                        <p className="text-[11px] font-semibold text-emerald-700">
                            {referenceTitle} · Bilateral Tiwala
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {submitError && (
                        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                            {submitError}
                        </div>
                    )}

                    {/* STAGE 1: COMPOSE */}
                    {stage === 'compose' && (
                        <form id="review-ceremony-form" onSubmit={handleSubmit} className="space-y-4">
                            {/* Context Card */}
                            <div className="rounded-2xl border border-slate-200 bg-[#FAFCFB] p-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0F2F58] text-xs font-extrabold text-white">
                                        {referenceTitle.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-xs font-extrabold text-slate-900">
                                            {referenceTitle}
                                        </div>
                                        <div className="text-[10.5px] text-slate-500">
                                            {targets.length} {targets.length === 1 ? 'provider' : 'providers'}{' '}
                                            in this project
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BUYER REVIEW FLOW */}
                            {actorRole === 'buyer' && (
                                <>
                                    {/* AD-21 Cascading Deal Chain Toggle Card */}
                                    {isChain && (
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                                            <label className="flex cursor-pointer items-center gap-2.5">
                                                <input
                                                    type="checkbox"
                                                    data-testid="cascading-toggle"
                                                    checked={isCascading}
                                                    onChange={(e) => setIsCascading(e.target.checked)}
                                                    className="size-4 rounded accent-emerald-600"
                                                />
                                                <span className="text-xs font-extrabold text-[#06362e]">
                                                    Apply this rating to all {targets.length} providers in this deal chain
                                                </span>
                                            </label>
                                            <p className="mt-1 ml-6 text-[10.5px] text-slate-600">
                                                Uncheck to assign independent star ratings, notes, and photos to each individual
                                                provider (Labor, Parts, Courier).
                                            </p>
                                        </div>
                                    )}

                                    {/* UNIFIED / CASCADING REVIEW CARD */}
                                    {(!isChain || isCascading) && (
                                        <div className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                            {/* Star Rating Selector */}
                                            <div className="text-center">
                                                <div className="text-xs font-extrabold text-slate-700 uppercase">
                                                    Overall Rating
                                                </div>
                                                <div className="mt-2 flex justify-center gap-2">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            data-testid={`star-${star}`}
                                                            onClick={() => setUnifiedRating(star)}
                                                            className="cursor-pointer text-2xl transition-transform hover:scale-110"
                                                        >
                                                            <Star
                                                                className={`size-8 ${
                                                                    star <= unifiedRating
                                                                        ? 'fill-amber-400 text-amber-500'
                                                                        : 'text-slate-200'
                                                                }`}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="mt-1 text-xs font-bold text-amber-700">
                                                    {STAR_LABELS[unifiedRating]}
                                                </div>
                                            </div>

                                            {/* Attribute Chips */}
                                            <div>
                                                <div className="text-[11px] font-bold text-slate-600">
                                                    Key Strengths (Attribute Chips)
                                                </div>
                                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                    {BUYER_ATTRIBUTE_CHIPS.map((chip) => {
                                                        const isSelected = unifiedChips.includes(chip.id);
                                                        return (
                                                            <button
                                                                key={chip.id}
                                                                type="button"
                                                                onClick={() => toggleChip(chip.id, true)}
                                                                className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                                                                    isSelected
                                                                        ? 'border border-emerald-600 bg-[#EFFCF6] text-emerald-900 shadow-xs'
                                                                        : 'border border-slate-200 bg-[#FAFCFB] text-slate-600 hover:text-slate-900'
                                                                }`}
                                                            >
                                                                {isSelected && '✓ '}
                                                                {chip.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Written Feedback */}
                                            <div>
                                                <label className="text-[11px] font-bold text-slate-600">
                                                    Written Note
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={unifiedNote}
                                                    onChange={(e) => setUnifiedNote(e.target.value)}
                                                    placeholder="Describe the quality of work, speed of delivery, and coordination..."
                                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-[#FAFCFB] p-3 text-xs text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                                />
                                            </div>

                                            {/* Photo Attachment Strip */}
                                            <div>
                                                <div className="text-[11px] font-bold text-slate-600">
                                                    Job Photo Evidence
                                                </div>
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    {unifiedPhotoUrl ? (
                                                        <div className="relative">
                                                            <img
                                                                src={unifiedPhotoUrl}
                                                                alt="Verified proof"
                                                                className="size-14 rounded-lg border border-slate-200 object-cover"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setUnifiedPhotoUrl(null)}
                                                                className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white"
                                                            >
                                                                &times;
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setUnifiedPhotoUrl('/photos/ac-clean.jpg')}
                                                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-[#FAFCFB] px-3 py-2 text-xs font-bold text-slate-600 hover:border-[#0F2F58]"
                                                        >
                                                            <Camera className="size-3.5 text-slate-500" />
                                                            <span>Attach Milestone Photo</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* GRANULAR PER-NODE CARDS (When Uncascaded) */}
                                    {isChain && !isCascading && (
                                        <div className="space-y-3" data-testid="granular-review-cards">
                                            {targets.map((target) => {
                                                const current = granularReviews[target.orderId] ?? {
                                                    rating: 5,
                                                    note: '',
                                                    chips: ['on_time'],
                                                };
                                                return (
                                                    <div
                                                        key={target.orderId}
                                                        className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="text-xs font-extrabold text-slate-900">
                                                                    {target.providerName}
                                                                </div>
                                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[9.5px] font-extrabold text-slate-600 uppercase">
                                                                    {target.role}
                                                                </span>
                                                            </div>
                                                            {/* Star Picker */}
                                                            <div className="flex gap-1">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <button
                                                                        key={star}
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setGranularReviews((prev) => ({
                                                                                ...prev,
                                                                                [target.orderId]: {
                                                                                    ...(prev[target.orderId] ?? {
                                                                                        rating: 5,
                                                                                        note: '',
                                                                                        chips: [],
                                                                                    }),
                                                                                    rating: star,
                                                                                },
                                                                            }))
                                                                        }
                                                                        className="cursor-pointer text-sm"
                                                                    >
                                                                        <Star
                                                                            className={`size-5 ${
                                                                                star <= current.rating
                                                                                    ? 'fill-amber-400 text-amber-500'
                                                                                    : 'text-slate-200'
                                                                            }`}
                                                                        />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Node Note Input */}
                                                        <input
                                                            type="text"
                                                            value={current.note}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setGranularReviews((prev) => ({
                                                                    ...prev,
                                                                    [target.orderId]: {
                                                                        ...(prev[target.orderId] ?? {
                                                                            rating: 5,
                                                                            chips: [],
                                                                        }),
                                                                        note: val,
                                                                    },
                                                                }));
                                                            }}
                                                            placeholder={`Feedback for ${target.providerName}...`}
                                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* PROVIDER REVIEW FLOW (Citizen Reliability Record) */}
                            {actorRole === 'provider' && (
                                <div className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                                            <ShieldCheck className="size-4 text-emerald-700" />
                                            <span>Asymmetric Citizen Reliability Record</span>
                                        </div>
                                        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                                            Per Serbizyu anti-discrimination policy, providers submit factual reliability
                                            context rather than subjective star ratings for citizens.
                                        </p>
                                    </div>

                                    <div>
                                        <div className="text-[11px] font-bold text-slate-600">
                                            Factual Context Chips
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {PROVIDER_RELIABILITY_CHIPS.map((chip) => {
                                                const isSelected = providerChips.includes(chip.id);
                                                return (
                                                    <button
                                                        key={chip.id}
                                                        type="button"
                                                        onClick={() => toggleChip(chip.id, true)}
                                                        className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                                                            isSelected
                                                                ? 'border border-emerald-600 bg-[#EFFCF6] text-emerald-900 shadow-xs'
                                                                : 'border border-slate-200 bg-[#FAFCFB] text-slate-600 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        {isSelected && '✓ '}
                                                        {chip.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600">
                                            Factual Notes (Optional)
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={providerNote}
                                            onChange={(e) => setProviderNote(e.target.value)}
                                            placeholder="Note site accessibility, cash readiness, or handover details..."
                                            className="mt-1 w-full rounded-xl border border-slate-200 bg-[#FAFCFB] p-3 text-xs text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Double-Blind 72h Hold Policy Card */}
                            <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
                                <Lock className="mt-0.5 size-4 shrink-0 text-[#0F2F58]" />
                                <div className="text-[11px] leading-relaxed">
                                    <strong className="text-slate-900">72-Hour Double-Blind Hold:</strong> Your review
                                    remains sealed until the counterparty submits their feedback or 72 hours elapse. Neither party can view or retaliate against the other's feedback.
                                </div>
                            </div>
                        </form>
                    )}

                    {/* STAGE 2: SEALED */}
                    {stage === 'sealed' && (
                        <div className="space-y-4 text-center py-4">
                            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <Lock className="size-8" />
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-[#0F2F58]">
                                    Review Sealed & Protected
                                </h3>
                                <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs font-bold text-amber-700">
                                    <Clock className="size-3.5" />
                                    <span>72-Hour Anti-Retaliation Window Active</span>
                                </div>
                            </div>
                            <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-600">
                                Your review is stored securely in our escrow hold. It will automatically unblind and publish
                                once the counterparty submits their review, or when the 72-hour timer elapses.
                            </p>
                            <div className="rounded-2xl border border-slate-200 bg-[#FAFCFB] p-4 text-left">
                                <div className="text-xs font-extrabold text-slate-700 uppercase">
                                    Your Submitted Feedback:
                                </div>
                                {actorRole === 'buyer' && (
                                    <div className="mt-2 flex items-center gap-1 text-sm font-bold text-amber-500">
                                        {'★'.repeat(unifiedRating)}
                                    </div>
                                )}
                                <p className="mt-1 text-xs text-slate-700 italic">
                                    &ldquo;{unifiedNote || providerNote || 'Verified project completion.'}&rdquo;
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STAGE 3: REVEALED */}
                    {stage === 'revealed' && (
                        <div className="space-y-4 text-center py-4">
                            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="size-8" />
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-[#0F2F58]">
                                    Reviews Revealed & Published!
                                </h3>
                                <p className="mt-1 text-xs text-slate-600">
                                    Both counterparties have completed the bilateral ceremony. Feedback is now reflected in
                                    community reputation.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Dock */}
                <div className="border-t border-slate-100 bg-[#FAFCFB] p-4">
                    {stage === 'compose' ? (
                        <button
                            type="submit"
                            form="review-ceremony-form"
                            disabled={submitting}
                            data-testid="submit-review-btn"
                            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#0F2F58] py-3 text-xs font-extrabold text-white shadow-sm hover:bg-[#153e74] disabled:opacity-50"
                        >
                            <Lock className="size-4" />
                            <span>{submitting ? 'Sealing review...' : 'Submit Sealed Review'}</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl bg-[#0F2F58] py-3 text-xs font-extrabold text-white shadow-sm hover:bg-[#153e74]"
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
