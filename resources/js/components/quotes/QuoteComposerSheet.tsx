import React, { useState, useMemo } from 'react';
import {
    Sparkles,
    Sliders,
    ArrowLeft,
    ArrowRight,
    Wrench,
    CheckCircle2,
    Coins,
    Truck,
    Plus,
    Minus,
    Check,
} from 'lucide-react';
import GlovoWaveModal from '../mobile/GlovoWaveModal';
import type { WorkChecklistItem, WorkMetricRequirement } from '../mobile/types';

export interface ProviderListingOption {
    id: string;
    title: string;
    listing_type: string;
    work_shape: string;
    price_amount_minor: number | null;
    listing_version_id?: string;
    variants?: Array<{
        id: string;
        name?: string;
        label?: string;
        price_amount_minor?: number;
        price?: number;
        is_default?: boolean;
        isDefault?: boolean;
        currency?: string;
    }>;
}

export interface QuoteComposerPipelineStage {
    id?: string;
    num?: string;
    title: string;
    desc?: string;
    dur?: string | null;
    bg?: string;
    color?: string;
    evidence?: string;
    evidenceType?: string;
    gateType?: string;
    clearanceMode?: string;
    approvalMethod?: string;
    requiredProofs?: string[];
    handoffParty?: string;
    checklistItems?: WorkChecklistItem[];
    metricRequirements?: WorkMetricRequirement[];
    checklist_items?: WorkChecklistItem[];
    metric_requirements?: WorkMetricRequirement[];
}

export interface QuoteComposerPipeline {
    template?: string;
    work_shape?: string;
    catalog_code?: string;
    target_sla?: string | null;
    stages?: QuoteComposerPipelineStage[];
}

export interface QuoteComposerSheetProps {
    isOpen: boolean;
    onClose: () => void;
    requestId: string;
    requestTitle: string;
    budgetFormatted?: string;
    budgetAmountMinor?: number | null;
    categoryCode?: string | null;
    categoryName?: string | null;
    requestPipeline?: QuoteComposerPipeline;
    preferredFulfillment?: string | null;
    requirements?: string[];
    myListings?: ProviderListingOption[];
    onSubmit: (payload: {
        amount_minor: number;
        currency: string;
        proposal: string;
        estimated_duration: string;
        work_shape: string;
        listing_id?: string | null;
        appointment_duration_minutes?: number;
        listing_version_id?: string;
        variant_id?: string;
        quantity?: number;
        idempotency_key: string;
        milestone_stages?: QuoteComposerPipelineStage[];
    }) => void;
    isSubmitting?: boolean;
    errorMessage?: string | null;
}
const EVIDENCE_TYPE_LABELS: Record<string, string> = {
    photo_required: 'Photo Proof',
    video_required: 'Video Proof',
    meter_log: 'Measurement Log',
    receipt_upload: 'Receipt Upload',
    dual_sign: 'Signoff',
    none: 'No proof requested',
    gps_checkin: 'GPS Check-in',
};
const COMPOSER_GUIDED_STEPS = [
    {
        step: 1,
        shortTitle: 'Foundation',
        guidedTitle: 'Choose your trade or listing foundation',
        guidedDescription:
            'Choose an active listing as your foundation or quote independently, then set your price.',
        standardTitle: '1. Foundation Listing & Base Craft',
    },
    {
        step: 2,
        shortTitle: 'Work Plan',
        guidedTitle: 'Review the request work steps',
        guidedDescription:
            'Review inherited milestone deliverables and choose any additional commitments.',
        standardTitle: '2. Work Flow Pipeline & Evidence',
    },
    {
        step: 3,
        shortTitle: 'Rates & Parts',
        guidedTitle: 'Set labor rate and itemized material costs',
        guidedDescription: 'Set your labor price and any itemized material costs.',
        standardTitle: '3. Labor Rate & Material Breakdown',
    },
    {
        step: 4,
        shortTitle: 'Logistics',
        guidedDescription:
            'Choose whether you travel directly, use courier fulfillment, or ask the requester to provide materials.',
        standardTitle: '4. Logistics & Sourcing Mode',
    },
    {
        step: 5,
        shortTitle: 'Schedule & Submit',
        guidedTitle: 'Set optional scheduling and terms',
        guidedDescription:
            'Optionally provide an arrival estimate, warranty commitment, and proposal message.',
        standardTitle: '5. Schedule, Warranty & Review',
    },
];

export default function QuoteComposerSheet({
    isOpen,
    onClose,
    requestTitle,
    budgetFormatted,
    requestPipeline,
    preferredFulfillment,
    myListings = [],
    onSubmit,
    isSubmitting = false,
    errorMessage = null,
}: QuoteComposerSheetProps) {
    const [builderMode, setBuilderMode] = useState<'guided' | 'standard'>('guided');
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

    // Step 1: Foundation Listing
    const initialListing = requestPipeline?.work_shape
        ? myListings.find((listing) => listing.work_shape === requestPipeline.work_shape)
        : myListings[0];
    const initialDefaultVariant = initialListing?.variants?.find(
        (variant) => variant.is_default || variant.isDefault,
    );
    const initialPrice = initialListing?.listing_type === 'product' && initialDefaultVariant
        ? (initialDefaultVariant.price_amount_minor !== undefined
            ? initialDefaultVariant.price_amount_minor / 100
            : Number(initialDefaultVariant.price ?? 0))
        : (initialListing?.price_amount_minor ?? 0) / 100;
    const [selectedListingId, setSelectedListingId] = useState<string>(
        initialListing?.id ?? 'independent',
    );
    const [workShape, setWorkShape] = useState<string>(
        requestPipeline?.work_shape || initialListing?.work_shape || 'A1',
    );
    const [selectedVariantId, setSelectedVariantId] = useState(initialDefaultVariant?.id ?? '');
    const [productQuantity, setProductQuantity] = useState(1);
    const selectedListing = myListings.find((listing) => listing.id === selectedListingId);
    const isProductQuote = selectedListing?.listing_type === 'product';
    const productSelectionIsValid = !isProductQuote || (
        Boolean(selectedListing.listing_version_id)
        && Boolean(selectedListing.variants?.some((variant) => variant.id === selectedVariantId))
        && Number.isInteger(productQuantity) && productQuantity >= 1 && productQuantity <= 999
    );

    const baseStages = useMemo(
        () =>
            (requestPipeline?.stages ?? []).map((stage, index) => ({
                ...stage,
                num: stage.num ?? String(index + 1).padStart(2, '0'),
                desc: stage.desc ?? '',
                dur: stage.dur ?? null,
            })),
        [requestPipeline],
    );

    // Step 2: Work Plan
    const [customStepActive, setCustomStepActive] = useState<boolean>(false);
    const [customStepText, setCustomStepText] = useState<string>('');
    const [commitPhotoEvidence, setCommitPhotoEvidence] = useState<boolean>(false);

    // Step 3: Rates & Parts
    const [laborRate, setLaborRate] = useState<number>(initialPrice);
    const [includeParts, setIncludeParts] = useState<boolean>(false);
    const [partsAmount, setPartsAmount] = useState<number>(0);
    const [partsDescription, setPartsDescription] = useState<string>('');
    const [includeSurcharge, setIncludeSurcharge] = useState<boolean>(false);
    const [surchargeAmount, setSurchargeAmount] = useState<number>(0);

    // Step 4: Logistics & Partners
    const [fulfillmentMode, setFulfillmentMode] = useState<'solo' | 'courier' | 'citizen' | null>(
        preferredFulfillment === 'direct' ? 'solo' : null,
    );
    const courierFee = 0;

    // Step 5: Schedule & Proposal Note
    const [arrivalWindow, setArrivalWindow] = useState<string>('');
    const [warrantyPeriod, setWarrantyPeriod] = useState<string>('');
    const [proposalNote, setProposalNote] = useState<string>('');
    const [appointmentDuration, setAppointmentDuration] = useState('');
    const requiresAppointmentDuration = workShape === 'A3' && selectedListingId === 'independent';
    const appointmentDurationMinutes = Number(appointmentDuration);
    const appointmentDurationIsValid =
        !requiresAppointmentDuration ||
        (Number.isInteger(appointmentDurationMinutes) &&
            appointmentDurationMinutes >= 1 &&
            appointmentDurationMinutes <= 480);

    // Dynamic Live Total Calculation
    const totalAmount = useMemo(() => {
        return (
            laborRate +
            (includeParts ? partsAmount : 0) +
            (includeSurcharge ? surchargeAmount : 0) +
            courierFee
        );
    }, [laborRate, includeParts, partsAmount, includeSurcharge, surchargeAmount, courierFee]);

    const handleListingSelect = (listingId: string) => {
        setSelectedListingId(listingId);
        const foundListing = myListings.find((listing) => listing.id === listingId);
        const defaultVariant = foundListing?.variants?.find((variant) => variant.is_default || variant.isDefault);
        setSelectedVariantId(defaultVariant?.id ?? '');
        setProductQuantity(1);
        if (foundListing?.listing_type === 'product' && defaultVariant) {
            setLaborRate(defaultVariant.price_amount_minor !== undefined
                ? defaultVariant.price_amount_minor / 100 : Number(defaultVariant.price ?? 0));
        } else if (foundListing?.price_amount_minor != null) {
            setLaborRate(foundListing.price_amount_minor / 100);
        }
        if (foundListing?.work_shape) {
            setWorkShape(foundListing.work_shape);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!appointmentDurationIsValid) return;
        if (!productSelectionIsValid) return;

        const usedStageIds = new Set(
            baseStages
                .map((stage) => stage.id)
                .filter((id): id is string => typeof id === 'string'),
        );
        let customStageId = 'stage-custom';
        for (let suffix = 2; usedStageIds.has(customStageId); suffix += 1) {
            customStageId = `stage-custom-${suffix}`;
        }

        const committedStages = [
            ...baseStages,
            ...(customStepActive && customStepText.trim()
                ? [
                      {
                          id: customStageId,
                          num: String(baseStages.length + 1).padStart(2, '0'),
                          title: customStepText.trim(),
                          desc: 'Custom provider commitment',
                          dur: null,
                          evidence: commitPhotoEvidence
                              ? 'Photo verification proof'
                              : 'No evidence requested',
                          evidenceType: commitPhotoEvidence ? 'photo_required' : 'none',
                          requiredProofs: commitPhotoEvidence ? ['photo_proof'] : [],
                      },
                  ]
                : []),
        ].map((stage: QuoteComposerPipelineStage) => {
            const { checklistItems, metricRequirements, ...persistedStage } = stage;
            return {
                ...persistedStage,
                ...(checklistItems === undefined ? {} : { checklist_items: checklistItems }),
                ...(metricRequirements === undefined ? {} : { metric_requirements: metricRequirements }),
            };
        });

        const workGatesSummary = committedStages
            .map((s, idx) => `${s.num || idx + 1}. ${s.title}${s.desc ? ` (${s.desc})` : ''}`)
            .join('; ');

        const itemizedBreakdown = [
            includeParts && partsDescription.trim()
                ? `${partsDescription.trim()}: ₱${partsAmount.toFixed(2)}`
                : null,
            fulfillmentMode
                ? `Fulfillment: ${
                      fulfillmentMode === 'solo'
                          ? 'Provider-managed transport'
                          : fulfillmentMode === 'courier'
                            ? 'Courier fulfillment'
                            : 'Requester-provided materials'
                  }`
                : null,
            warrantyPeriod ? `Warranty: ${warrantyPeriod}` : null,
            arrivalWindow ? `Arrival: ${arrivalWindow}` : null,
        ]
            .filter(Boolean)
            .join(' · ');

        const finalProposal = [
            proposalNote.trim(),
            workGatesSummary ? `Work plan: ${workGatesSummary}` : null,
            itemizedBreakdown || null,
            `Quote total: ₱${totalAmount.toFixed(2)}`,
        ]
            .filter(Boolean)
            .join(' · ')
            .slice(0, 1950);

        onSubmit({
            amount_minor: Math.round(totalAmount * 100),
            currency: 'PHP',
            proposal: finalProposal,
            estimated_duration: arrivalWindow,
            work_shape: workShape,
            listing_id: selectedListingId !== 'independent' ? selectedListingId : null,
            ...(requiresAppointmentDuration
                ? { appointment_duration_minutes: appointmentDurationMinutes }
                : {}),
            ...(isProductQuote ? {
                listing_version_id: selectedListing.listing_version_id,
                variant_id: selectedVariantId,
                quantity: productQuantity,
            } : {}),
            idempotency_key: `qte-${crypto.randomUUID()}`,
            milestone_stages: committedStages,
        });
    };

    return (
        <GlovoWaveModal
            isOpen={isOpen}
            onClose={onClose}
            title="Create Offer"
            subtitle={`Responding to ${requestTitle}`}
            headerSlot={
                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                        {builderMode === 'guided' ? (
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-900">
                                Step {step} of 5 · {COMPOSER_GUIDED_STEPS[step - 1]?.shortTitle}
                            </span>
                        ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                                Standard Form
                            </span>
                        )}
                        {budgetFormatted && (
                            <span className="text-[11px] font-bold text-[#0D715F]">
                                Target: {budgetFormatted}
                            </span>
                        )}
                    </div>

                    <div
                        className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200/70 bg-slate-100 p-0.5"
                        data-testid="composer-mode-switcher"
                    >
                        <button
                            type="button"
                            onClick={() => setBuilderMode('guided')}
                            className={`flex cursor-pointer items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition-all ${
                                builderMode === 'guided'
                                    ? 'bg-white text-[#0F2F58] shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Sparkles className="size-3 text-amber-500" />
                            <span>Guided</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setBuilderMode('standard')}
                            className={`flex cursor-pointer items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition-all ${
                                builderMode === 'standard'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Sliders className="size-3" />
                            <span>Standard</span>
                        </button>
                    </div>
                </div>
            }
        >
            <form onSubmit={handleFormSubmit} className="space-y-5 text-xs text-slate-800">
                {errorMessage && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 font-bold text-red-900">
                        {errorMessage}
                    </div>
                )}

                {/* Guided Progress Bar */}
                {builderMode === 'guided' && (
                    <div className="-mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${(step / 5) * 100}%` }}
                        />
                    </div>
                )}

                {/* STEP 1: Foundation Listing & Craft */}
                {(builderMode === 'standard' || step === 1) && (
                    <section className="space-y-3">
                        {builderMode === 'guided' ? (
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-extrabold text-[#0F2F58]">
                                    {COMPOSER_GUIDED_STEPS[0].guidedTitle}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    {COMPOSER_GUIDED_STEPS[0].guidedDescription}
                                </p>
                            </div>
                        ) : (
                            <h3 className="border-b border-slate-100 pb-1 text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">
                                {COMPOSER_GUIDED_STEPS[0].standardTitle}
                            </h3>
                        )}

                        <div className="grid grid-cols-1 gap-2">
                            {myListings.map((l) => (
                                <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => handleListingSelect(l.id)}
                                    className={`cursor-pointer rounded-xl border p-3 text-left transition-all ${
                                        selectedListingId === l.id
                                            ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Wrench className="size-4 text-blue-600" />
                                            <span className="font-bold">{l.title}</span>
                                        </div>
                                        {l.price_amount_minor && (
                                            <span className="font-mono font-bold text-[#0D715F]">
                                                Base: ₱{(l.price_amount_minor / 100).toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                    <span className="mt-1 block text-[10px] text-slate-400">
                                        Shape: {l.work_shape} · Verified Listing
                                    </span>
                                </button>
                            ))}

                            <button
                                type="button"
                                onClick={() => handleListingSelect('independent')}
                                className={`cursor-pointer rounded-xl border p-3 text-left transition-all ${
                                    selectedListingId === 'independent'
                                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-2 font-bold">
                                    <Coins className="size-4 text-emerald-600" />
                                    <span>Independent Labor &amp; Custom Quote</span>
                                </div>
                                <span className="mt-1 block text-[10px] text-slate-400">
                                    Set your own rates and materials without linking a specific
                                    listing.
                                </span>
                            </button>
                        </div>

                        {isProductQuote && (
                            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
                                <label className="block font-bold text-slate-700">
                                    Product variant
                                    <select value={selectedVariantId} onChange={(event) => {
                                        setSelectedVariantId(event.target.value);
                                        const variant = selectedListing.variants?.find((item) => item.id === event.target.value);
                                        if (variant) {
                                            const unit = variant.price_amount_minor !== undefined ? variant.price_amount_minor / 100 : Number(variant.price ?? 0);
                                            setLaborRate(unit * productQuantity);
                                        }
                                    }} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
                                        <option value="">Choose a variant</option>
                                        {selectedListing.variants?.map((variant) => <option key={variant.id} value={variant.id}>{variant.name ?? variant.label ?? variant.id}</option>)}
                                    </select>
                                </label>
                                <label className="block font-bold text-slate-700">
                                    Product quantity
                                    <input type="number" min={1} max={999} step={1} value={productQuantity} onChange={(event) => {
                                        const quantity = Number(event.target.value);
                                        setProductQuantity(quantity);
                                        const variant = selectedListing.variants?.find((item) => item.id === selectedVariantId);
                                        if (variant && Number.isInteger(quantity) && quantity > 0) {
                                            const unit = variant.price_amount_minor !== undefined ? variant.price_amount_minor / 100 : Number(variant.price ?? 0);
                                            setLaborRate(unit * quantity);
                                        }
                                    }} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" />
                                </label>
                                {!selectedListing.listing_version_id && <p role="alert" className="text-xs text-red-800">Refresh the listing terms before quoting this product.</p>}
                            </div>
                        )}
                        {builderMode === 'guided' && (
                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="flex cursor-pointer items-center gap-1 rounded-xl bg-[#0F2F58] px-4 py-2 font-bold text-white shadow-xs hover:bg-[#1a447c]"
                                >
                                    <span>Continue to Work Plan</span>
                                    <ArrowRight className="size-3.5" />
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {/* STEP 2: Work Plan & Milestone Evidence */}
                {(builderMode === 'standard' || step === 2) && (
                    <section className="space-y-3 border-t border-slate-100 pt-3">
                        {builderMode === 'guided' ? (
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-extrabold text-[#0F2F58]">
                                    {COMPOSER_GUIDED_STEPS[1].guidedTitle}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    {COMPOSER_GUIDED_STEPS[1].guidedDescription}
                                </p>
                            </div>
                        ) : (
                            <h3 className="border-b border-slate-100 pb-1 text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">
                                {COMPOSER_GUIDED_STEPS[1].standardTitle}
                            </h3>
                        )}

                        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase">
                                Planned Work Gates
                            </span>
                            <div className="space-y-1.5">
                                {baseStages.map((gate, i) => (
                                    <div
                                        key={gate.id || i}
                                        className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-white p-2.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="size-3.5 shrink-0 text-teal-600" />
                                                <span className="text-xs font-semibold text-slate-800">
                                                    {gate.num ? `${gate.num}. ` : `${i + 1}. `}
                                                    {gate.title}
                                                </span>
                                            </div>
                                            <span className="shrink-0 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
                                                {EVIDENCE_TYPE_LABELS[gate.evidenceType ?? ''] ??
                                                    'Evidence not specified'}
                                            </span>
                                        </div>
                                        {gate.desc && (
                                            <span className="pl-5.5 text-[11px] font-normal text-slate-500">
                                                {gate.desc}
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {customStepActive && (
                                    <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-900">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                                            <Plus className="size-3.5 shrink-0 text-amber-600" />
                                            <span>Custom Scope Step</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={customStepText}
                                            onChange={(e) => setCustomStepText(e.target.value)}
                                            placeholder="Enter custom scope step description..."
                                            className="w-full rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden"
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setCustomStepActive((prev) => !prev)}
                                className="block cursor-pointer pt-1 text-[11px] font-bold text-[#0D715F] transition-colors hover:text-[#0a574a] hover:underline"
                            >
                                {customStepActive
                                    ? '− Remove Custom Step'
                                    : '+ Add Custom Scope Step for This Request'}
                            </button>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                            <div className="space-y-0.5">
                                <span className="block font-bold text-slate-800">
                                    Photo Proof for Custom Step
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    Select to include photo proof for the custom stage above.
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                checked={commitPhotoEvidence}
                                onChange={(e) => setCommitPhotoEvidence(e.target.checked)}
                                className="size-4 cursor-pointer rounded text-blue-600"
                            />
                        </div>

                        {builderMode === 'guided' && (
                            <div className="flex justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    <ArrowLeft className="size-3.5" />
                                    <span>Back</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="flex cursor-pointer items-center gap-1 rounded-xl bg-[#0F2F58] px-4 py-2 font-bold text-white shadow-xs hover:bg-[#1a447c]"
                                >
                                    <span>Continue to Rates</span>
                                    <ArrowRight className="size-3.5" />
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {/* STEP 3: Rates & Parts Breakdown */}
                {(builderMode === 'standard' || step === 3) && (
                    <section className="space-y-3 border-t border-slate-100 pt-3">
                        {builderMode === 'guided' ? (
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-extrabold text-[#0F2F58]">
                                    {COMPOSER_GUIDED_STEPS[2].guidedTitle}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    {COMPOSER_GUIDED_STEPS[2].guidedDescription}
                                </p>
                            </div>
                        ) : (
                            <h3 className="border-b border-slate-100 pb-1 text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">
                                {COMPOSER_GUIDED_STEPS[2].standardTitle}
                            </h3>
                        )}

                        {/* Labor Rate */}
                        <div className="space-y-1.5">
                            <label className="block font-bold text-slate-700">
                                {isProductQuote ? 'Proposed product total (PHP)' : 'Base Labor Rate (PHP)'}
                            </label>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    aria-label="Decrease labor rate"
                                    onClick={() => setLaborRate((prev) => Math.max(100, prev - 25))}
                                    className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    <Minus className="size-4" />
                                </button>
                                <input
                                    aria-label={isProductQuote ? 'Proposed product total' : 'Base labor rate'}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={laborRate}
                                    onChange={(e) =>
                                        setLaborRate(Math.max(0, Number(e.target.value) || 0))
                                    }
                                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-center font-mono text-sm font-extrabold text-[#0F2F58]"
                                />
                                <button
                                    type="button"
                                    aria-label="Increase labor rate"
                                    onClick={() => setLaborRate((prev) => prev + 25)}
                                    className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    <Plus className="size-4" />
                                </button>
                            </div>
                        </div>

                        {/* Parts Toggle */}
                        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="block font-bold text-slate-800">
                                        Include Replacement Hardware
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        Enter the part price you are offering
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    data-testid="quote-include-parts-toggle"
                                    checked={includeParts}
                                    onChange={(e) => setIncludeParts(e.target.checked)}
                                    className="size-4 cursor-pointer rounded text-blue-600"
                                />
                            </div>

                            {includeParts && (
                                <div className="flex gap-2 border-t border-slate-100 pt-2">
                                    <input
                                        type="text"
                                        value={partsDescription}
                                        onChange={(e) => setPartsDescription(e.target.value)}
                                        placeholder="Hardware name (e.g. 1/2 Brass Ball Valve)"
                                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                                    />
                                    <input
                                        type="number"
                                        aria-label="Parts amount"
                                        min="0"
                                        value={partsAmount}
                                        onChange={(e) =>
                                            setPartsAmount(
                                                Math.max(0, parseFloat(e.target.value) || 0),
                                            )
                                        }
                                        className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs font-bold text-slate-900"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Additional Charge */}
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                            <div>
                                <span className="block font-bold text-slate-800">
                                    Additional Charge
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    Enter the amount for any extra costs you include.
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                checked={includeSurcharge}
                                onChange={(e) => setIncludeSurcharge(e.target.checked)}
                                className="size-4 cursor-pointer rounded text-blue-600"
                            />
                        </div>
                        {includeSurcharge && (
                            <label className="flex items-center gap-2 text-xs text-slate-700">
                                Amount (PHP)
                                <input
                                    type="number"
                                    min="0"
                                    value={surchargeAmount}
                                    onChange={(e) =>
                                        setSurchargeAmount(Math.max(0, Number(e.target.value) || 0))
                                    }
                                    className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-slate-900"
                                />
                            </label>
                        )}

                        {builderMode === 'guided' && (
                            <div className="flex justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    <ArrowLeft className="size-3.5" />
                                    <span>Back</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(4)}
                                    className="flex cursor-pointer items-center gap-1 rounded-xl bg-[#0F2F58] px-4 py-2 font-bold text-white shadow-xs hover:bg-[#1a447c]"
                                >
                                    <span>Continue to Logistics</span>
                                    <ArrowRight className="size-3.5" />
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {/* STEP 4: Logistics & Partners */}
                {(builderMode === 'standard' || step === 4) && (
                    <section className="space-y-3 border-t border-slate-100 pt-3">
                        {builderMode === 'guided' ? (
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-extrabold text-[#0F2F58]">
                                    {COMPOSER_GUIDED_STEPS[3].guidedTitle}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    {COMPOSER_GUIDED_STEPS[3].guidedDescription}
                                </p>
                            </div>
                        ) : (
                            <h3 className="border-b border-slate-100 pb-1 text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">
                                {COMPOSER_GUIDED_STEPS[3].standardTitle}
                            </h3>
                        )}

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {[
                                {
                                    id: 'solo',
                                    label: 'Solo On-Site',
                                    sub: 'Provider-managed transport',
                                    fee: 0,
                                },
                                {
                                    id: 'courier',
                                    label: 'Bundle Courier',
                                    sub: 'Courier fulfillment; cost included in quote',
                                    fee: 0,
                                },
                                {
                                    id: 'citizen',
                                    label: 'Citizen Parts',
                                    sub: 'Customer handles materials',
                                    fee: 0,
                                },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() =>
                                        setFulfillmentMode(f.id as typeof fulfillmentMode)
                                    }
                                    className={`cursor-pointer rounded-xl border p-3 text-left transition-all ${
                                        fulfillmentMode === f.id
                                            ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <Truck className="size-3.5 text-blue-600" />
                                        <span>{f.label}</span>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-slate-400">
                                        {f.sub}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {builderMode === 'guided' && (
                            <div className="flex justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    <ArrowLeft className="size-3.5" />
                                    <span>Back</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(5)}
                                    className="flex cursor-pointer items-center gap-1 rounded-xl bg-[#0F2F58] px-4 py-2 font-bold text-white shadow-xs hover:bg-[#1a447c]"
                                >
                                    <span>Continue to Schedule</span>
                                    <ArrowRight className="size-3.5" />
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {/* STEP 5: Schedule, Warranty & Final Submit */}
                {(builderMode === 'standard' || step === 5) && (
                    <section className="space-y-3 border-t border-slate-100 pt-3">
                        {builderMode === 'guided' ? (
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-extrabold text-[#0F2F58]">
                                    {COMPOSER_GUIDED_STEPS[4].guidedTitle}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    {COMPOSER_GUIDED_STEPS[4].guidedDescription}
                                </p>
                            </div>
                        ) : (
                            <h3 className="border-b border-slate-100 pb-1 text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">
                                {COMPOSER_GUIDED_STEPS[4].standardTitle}
                            </h3>
                        )}

                        {requiresAppointmentDuration && (
                            <div className="space-y-1">
                                <label
                                    htmlFor="quote-appointment-duration"
                                    className="block font-bold text-slate-700"
                                >
                                    Appointment duration (minutes)
                                </label>
                                <input
                                    id="quote-appointment-duration"
                                    type="number"
                                    min={1}
                                    max={480}
                                    step={1}
                                    required
                                    value={appointmentDuration}
                                    onChange={(event) => setAppointmentDuration(event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                                />
                                <p className="text-[11px] text-slate-600">
                                    The customer chooses a full-duration slot before accepting.
                                </p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="block font-bold text-slate-700">
                                    Arrival Window
                                </label>
                                <input
                                    type="text"
                                    value={arrivalWindow}
                                    onChange={(e) => setArrivalWindow(e.target.value)}
                                    placeholder="Enter an estimated arrival window"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block font-bold text-slate-700">
                                    Warranty Commitment
                                </label>
                                <select
                                    value={warrantyPeriod}
                                    onChange={(e) => setWarrantyPeriod(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                                >
                                    <option value="">No warranty commitment</option>
                                    <option value="30-Day Workmanship Warranty">
                                        30-Day Workmanship Warranty
                                    </option>
                                    <option value="14-Day Service Warranty">
                                        14-Day Service Warranty
                                    </option>
                                    <option value="Standard Inspection Warranty">
                                        Standard Inspection Warranty
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block font-bold text-slate-700">
                                Direct Proposal Message to Citizen
                            </label>
                            <textarea
                                rows={2}
                                value={proposalNote}
                                onChange={(e) => setProposalNote(e.target.value)}
                                placeholder="Explain your tools, background, or arrival details..."
                                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                            />
                        </div>

                        {/* Live Total Computed Breakdown Box */}
                        <div className="space-y-2 rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-teal-950">Proposal Total</span>
                                <span className="font-mono text-base font-extrabold text-[#0D715F]">
                                    ₱{totalAmount.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-teal-900">
                                <span>Labor: ₱{laborRate.toFixed(2)}</span>
                                {includeParts && <span>· Parts: +₱{partsAmount.toFixed(2)}</span>}
                                {includeSurcharge && (
                                    <span>· Surcharge: +₱{surchargeAmount.toFixed(2)}</span>
                                )}
                                {courierFee > 0 && <span>· Courier: +₱80.00</span>}
                            </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                            {builderMode === 'guided' && (
                                <button
                                    type="button"
                                    onClick={() => setStep(4)}
                                    className="flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    <ArrowLeft className="size-3.5" />
                                    <span>Back</span>
                                </button>
                            )}
                            <button
                                type="submit"
                                data-testid="submit-quote-proposal-btn"
                                disabled={
                                    isSubmitting || laborRate <= 0 || !appointmentDurationIsValid || !productSelectionIsValid
                                }
                                className="ml-auto flex cursor-pointer items-center gap-2 rounded-xl bg-[#0D715F] px-5 py-2.5 font-extrabold text-white shadow-md transition-all hover:bg-[#0a574a] disabled:opacity-50"
                            >
                                <Check className="size-4 text-emerald-300" />
                                <span>{isSubmitting ? 'Submitting...' : 'Submit Proposal'}</span>
                            </button>
                        </div>
                    </section>
                )}
            </form>
        </GlovoWaveModal>
    );
}
