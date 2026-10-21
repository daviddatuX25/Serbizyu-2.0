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

export interface ProviderListingOption {
    id: string;
    title: string;
    listing_type: string;
    work_shape: string;
    price_amount_minor: number | null;
}

export interface QuoteComposerSheetProps {
    isOpen: boolean;
    onClose: () => void;
    requestId: string;
    requestTitle: string;
    budgetFormatted?: string;
    myListings?: ProviderListingOption[];
    onSubmit: (payload: {
        amount_minor: number;
        currency: string;
        proposal: string;
        estimated_duration: string;
        work_shape: string;
        listing_id?: string | null;
        idempotency_key: string;
    }) => void;
    isSubmitting?: boolean;
    errorMessage?: string | null;
}

const COMPOSER_GUIDED_STEPS = [
    {
        step: 1,
        shortTitle: 'Foundation',
        guidedTitle: 'Choose your trade or listing foundation',
        guidedDescription: 'Select an active listing to inherit baseline pricing and warranty, or quote independently.',
        standardTitle: '1. Foundation Listing & Base Craft',
    },
    {
        step: 2,
        shortTitle: 'Work Plan',
        guidedTitle: 'Confirm the work steps and evidence commitments',
        guidedDescription: 'Review milestone deliverables. You commit to submitting photo proof at key stages.',
        standardTitle: '2. Work Flow Pipeline & Evidence',
    },
    {
        step: 3,
        shortTitle: 'Rates & Parts',
        guidedTitle: 'Set labor rate and itemized material costs',
        guidedDescription: 'Specify whether you supply replacement hardware or if the citizen provides materials.',
        standardTitle: '3. Labor Rate & Material Breakdown',
    },
    {
        step: 4,
        shortTitle: 'Logistics',
        guidedTitle: 'Select fulfillment and parts transit logistics',
        guidedDescription: 'Choose whether you travel directly solo or bundle courier assistance for parts sourcing.',
        standardTitle: '4. Logistics & Sourcing Mode',
    },
    {
        step: 5,
        shortTitle: 'Schedule & Submit',
        guidedTitle: 'Select arrival window and warranty guarantee',
        guidedDescription: 'Confirm when you can be on-site and write a direct proposal message to the requester.',
        standardTitle: '5. Schedule, Warranty & Review',
    },
];

export default function QuoteComposerSheet({
    isOpen,
    onClose,
    requestId: _requestId,
    requestTitle,
    budgetFormatted,
    myListings = [],
    onSubmit,
    isSubmitting = false,
    errorMessage = null,
}: QuoteComposerSheetProps) {
    const [builderMode, setBuilderMode] = useState<'guided' | 'standard'>('guided');
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

    // Step 1: Foundation Listing
    const initialListing = myListings[0];
    const initialPrice =
        initialListing?.price_amount_minor && initialListing.price_amount_minor > 0
            ? Math.round(initialListing.price_amount_minor / 100)
            : 350;
    const [selectedListingId, setSelectedListingId] = useState<string>(initialListing?.id ?? 'independent');
    const [workShape, setWorkShape] = useState<string>(initialListing?.work_shape || 'A1');

    // Step 2: Work Plan
    const [customStepActive, setCustomStepActive] = useState<boolean>(false);
    const [customStepText] = useState<string>('Terminal solder and heat shrink seal');
    const [commitPhotoEvidence, setCommitPhotoEvidence] = useState<boolean>(true);

    // Step 3: Rates & Parts
    const [laborRate, setLaborRate] = useState<number>(initialPrice);
    const [includeParts, setIncludeParts] = useState<boolean>(false);
    const [partsAmount, setPartsAmount] = useState<number>(180);
    const [partsDescription, setPartsDescription] = useState<string>('Replacement 35uF Dual-Run Capacitor');
    const [includeSurcharge, setIncludeSurcharge] = useState<boolean>(false);
    const [surchargeAmount] = useState<number>(100);

    // Step 4: Logistics & Partners
    const [fulfillmentMode, setFulfillmentMode] = useState<'solo' | 'courier' | 'citizen'>('solo');
    const courierFee = fulfillmentMode === 'courier' ? 80 : 0;

    // Step 5: Schedule & Proposal Note
    const [arrivalWindow, setArrivalWindow] = useState<string>('Today 2:00 PM - 4:00 PM');
    const [warrantyPeriod, setWarrantyPeriod] = useState<string>('30-Day Workmanship Warranty');
    const [proposalNote, setProposalNote] = useState<string>(
        'Experienced technician with complete diagnostic tools and insulated multimeter. Ready to inspect and repair promptly.'
    );

    // Dynamic Live Total Calculation
    const totalAmount = useMemo(() => {
        return laborRate + (includeParts ? partsAmount : 0) + (includeSurcharge ? surchargeAmount : 0) + courierFee;
    }, [laborRate, includeParts, partsAmount, includeSurcharge, surchargeAmount, courierFee]);

    const handleListingSelect = (listingId: string) => {
        setSelectedListingId(listingId);
        if (listingId !== 'independent') {
            const found = myListings.find((l) => l.id === listingId);
            if (found) {
                if (found.price_amount_minor && found.price_amount_minor > 0) {
                    setLaborRate(Math.round(found.price_amount_minor / 100));
                }
                if (found.work_shape) {
                    setWorkShape(found.work_shape);
                }
            }
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const itemizedBreakdown = [
            `Labor: ₱${laborRate.toFixed(2)}`,
            includeParts ? `${partsDescription}: ₱${partsAmount.toFixed(2)}` : 'Materials: Citizen Sourced',
            fulfillmentMode === 'courier' ? 'Transit: Danny Express (+₱80.00)' : 'Logistics: Solo Direct',
            `Warranty: ${warrantyPeriod}`,
            `Arrival: ${arrivalWindow}`,
        ].join(' · ');

        const finalProposal = proposalNote.trim()
            ? `${proposalNote.trim()} [Scope: ${itemizedBreakdown}]`
            : `Professional service: ${itemizedBreakdown}`;

        onSubmit({
            amount_minor: Math.round(totalAmount * 100),
            currency: 'PHP',
            proposal: finalProposal,
            estimated_duration: arrivalWindow,
            work_shape: workShape,
            listing_id: selectedListingId !== 'independent' ? selectedListingId : null,
            idempotency_key: `qte-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
                            className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition-all cursor-pointer ${
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
                            className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition-all cursor-pointer ${
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
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-900 font-bold">
                        {errorMessage}
                    </div>
                )}

                {/* Guided Progress Bar */}
                {builderMode === 'guided' && (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 -mt-2">
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
                                <p className="text-[11px] text-slate-500">{COMPOSER_GUIDED_STEPS[0].guidedDescription}</p>
                            </div>
                        ) : (
                            <h3 className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                                {COMPOSER_GUIDED_STEPS[0].standardTitle}
                            </h3>
                        )}

                        <div className="grid grid-cols-1 gap-2">
                            {myListings.map((l) => (
                                <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => handleListingSelect(l.id)}
                                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
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
                                    <span className="text-[10px] text-slate-400 block mt-1">
                                        Shape: {l.work_shape} · Verified Listing
                                    </span>
                                </button>
                            ))}

                            <button
                                type="button"
                                onClick={() => handleListingSelect('independent')}
                                className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                                    selectedListingId === 'independent'
                                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-2 font-bold">
                                    <Coins className="size-4 text-emerald-600" />
                                    <span>Independent Labor &amp; Custom Quote</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-1">
                                    Set your own rates and materials without linking a specific listing.
                                </span>
                            </button>
                        </div>

                        {builderMode === 'guided' && (
                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="flex items-center gap-1 rounded-xl bg-[#0F2F58] px-4 py-2 font-bold text-white shadow-xs hover:bg-[#1a447c] cursor-pointer"
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
                    <section className="space-y-3 pt-3 border-t border-slate-100">
                        {builderMode === 'guided' ? (
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-extrabold text-[#0F2F58]">
                                    {COMPOSER_GUIDED_STEPS[1].guidedTitle}
                                </h3>
                                <p className="text-[11px] text-slate-500">{COMPOSER_GUIDED_STEPS[1].guidedDescription}</p>
                            </div>
                        ) : (
                            <h3 className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                                {COMPOSER_GUIDED_STEPS[1].standardTitle}
                            </h3>
                        )}

                        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                                Planned Work Gates
                            </span>
                            <div className="space-y-1.5">
                                {[
                                    '1. Diagnostic inspection & safety isolation',
                                    '2. Component replacement & joint installation',
                                    '3. Full pressure test & operational verification',
                                ].map((gate, i) => (
                                    <div key={i} className="flex items-center gap-2 rounded-lg bg-white p-2 border border-slate-100">
                                        <CheckCircle2 className="size-3.5 text-teal-600" />
                                        <span className="font-semibold text-slate-800">{gate}</span>
                                    </div>
                                ))}
                                {customStepActive && (
                                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 border border-amber-200 text-amber-900 font-semibold">
                                        <Plus className="size-3.5 text-amber-600" />
                                        <span>{customStepText}</span>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setCustomStepActive((prev) => !prev)}
                                className="text-[11px] font-bold text-blue-700 hover:underline pt-1 block cursor-pointer"
                            >
                                {customStepActive ? '− Remove Custom Step' : '+ Add Custom Scope Step for This Request'}
                            </button>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <span className="font-bold text-slate-800 block">Milestone Evidence Commitment</span>
                                <span className="text-[10px] text-slate-400">
                                    Submit photo proof at each milestone gate for bilateral protection.
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                checked={commitPhotoEvidence}
                                onChange={(e) => setCommitPhotoEvidence(e.target.checked)}
                                className="size-4 rounded text-blue-600 cursor-pointer"
                            />
                        </div>

                        {builderMode === 'guided' && (
                            <div className="flex justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                    <ArrowLeft className="size-3.5" />
                                    <span>Back</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="flex items-center gap-1 rounded-xl bg-[#0F2F58] px-4 py-2 font-bold text-white shadow-xs hover:bg-[#1a447c] cursor-pointer"
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
                    <section className="space-y-3 pt-3 border-t border-slate-100">
                        {builderMode === 'guided' ? (
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-extrabold text-[#0F2F58]">
                                    {COMPOSER_GUIDED_STEPS[2].guidedTitle}
                                </h3>
                                <p className="text-[11px] text-slate-500">{COMPOSER_GUIDED_STEPS[2].guidedDescription}</p>
                            </div>
                        ) : (
                            <h3 className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                                {COMPOSER_GUIDED_STEPS[2].standardTitle}
                            </h3>
                        )}

                        {/* Labor Rate */}
                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 block">Base Labor Rate (PHP)</label>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setLaborRate((prev) => Math.max(100, prev - 25))}
                                    className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                    <Minus className="size-4" />
                                </button>
                                <div className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-center font-mono text-sm font-extrabold text-[#0F2F58]">
                                    ₱{laborRate.toFixed(2)}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLaborRate((prev) => prev + 25)}
                                    className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                    <Plus className="size-4" />
                                </button>
                            </div>
                        </div>

                        {/* Parts Toggle */}
                        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="font-bold text-slate-800 block">Include Replacement Hardware</span>
                                    <span className="text-[10px] text-slate-400">
                                        Provider supplies new part (+₱{partsAmount.toFixed(2)})
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    data-testid="quote-include-parts-toggle"
                                    checked={includeParts}
                                    onChange={(e) => setIncludeParts(e.target.checked)}
                                    className="size-4 rounded text-blue-600 cursor-pointer"
                                />
                            </div>

                            {includeParts && (
                                <div className="pt-2 border-t border-slate-100 flex gap-2">
                                    <input
                                        type="text"
                                        value={partsDescription}
                                        onChange={(e) => setPartsDescription(e.target.value)}
                                        placeholder="Hardware name (e.g. 1/2 Brass Ball Valve)"
                                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        value={partsAmount}
                                        onChange={(e) => setPartsAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                                        className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Surcharge Toggle */}
                        <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between">
                            <div>
                                <span className="font-bold text-slate-800 block">Specialized Equipment / Height Surcharge</span>
                                <span className="text-[10px] text-slate-400">Ladder, scaffold, or emergency surcharge (+₱100)</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={includeSurcharge}
                                onChange={(e) => setIncludeSurcharge(e.target.checked)}
                                className="size-4 rounded text-blue-600 cursor-pointer"
                            />
                        </div>

                        {builderMode === 'guided' && (
                            <div className="flex justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                    <ArrowLeft className="size-3.5" />
                                    <span>Back</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(4)}
                                    className="flex items-center gap-1 rounded-xl bg-[#0F2F58] px-4 py-2 font-bold text-white shadow-xs hover:bg-[#1a447c] cursor-pointer"
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
                    <section className="space-y-3 pt-3 border-t border-slate-100">
                        {builderMode === 'guided' ? (
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-extrabold text-[#0F2F58]">
                                    {COMPOSER_GUIDED_STEPS[3].guidedTitle}
                                </h3>
                                <p className="text-[11px] text-slate-500">{COMPOSER_GUIDED_STEPS[3].guidedDescription}</p>
                            </div>
                        ) : (
                            <h3 className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                                {COMPOSER_GUIDED_STEPS[3].standardTitle}
                            </h3>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                                { id: 'solo', label: 'Solo On-Site', sub: 'Travel with tools', fee: 0 },
                                { id: 'courier', label: 'Bundle Courier', sub: 'Danny Express (+₱80)', fee: 80 },
                                { id: 'citizen', label: 'Citizen Parts', sub: 'No transit needed', fee: 0 },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setFulfillmentMode(f.id as typeof fulfillmentMode)}
                                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                                        fulfillmentMode === f.id
                                            ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <Truck className="size-3.5 text-blue-600" />
                                        <span>{f.label}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 block mt-1">{f.sub}</span>
                                </button>
                            ))}
                        </div>

                        {builderMode === 'guided' && (
                            <div className="flex justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                    <ArrowLeft className="size-3.5" />
                                    <span>Back</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(5)}
                                    className="flex items-center gap-1 rounded-xl bg-[#0F2F58] px-4 py-2 font-bold text-white shadow-xs hover:bg-[#1a447c] cursor-pointer"
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
                    <section className="space-y-3 pt-3 border-t border-slate-100">
                        {builderMode === 'guided' ? (
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-extrabold text-[#0F2F58]">
                                    {COMPOSER_GUIDED_STEPS[4].guidedTitle}
                                </h3>
                                <p className="text-[11px] text-slate-500">{COMPOSER_GUIDED_STEPS[4].guidedDescription}</p>
                            </div>
                        ) : (
                            <h3 className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                                {COMPOSER_GUIDED_STEPS[4].standardTitle}
                            </h3>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="font-bold text-slate-700 block">Arrival Window</label>
                                <select
                                    value={arrivalWindow}
                                    onChange={(e) => setArrivalWindow(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                                >
                                    <option value="Today 2:00 PM - 4:00 PM">Today 2:00 PM - 4:00 PM</option>
                                    <option value="Tomorrow Morning 8:00 AM - 12:00 PM">Tomorrow Morning 8:00 AM - 12:00 PM</option>
                                    <option value="Tomorrow Afternoon 1:00 PM - 5:00 PM">Tomorrow Afternoon 1:00 PM - 5:00 PM</option>
                                    <option value="Flexible this week">Flexible this week</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-slate-700 block">Warranty Commitment</label>
                                <select
                                    value={warrantyPeriod}
                                    onChange={(e) => setWarrantyPeriod(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                                >
                                    <option value="30-Day Workmanship Warranty">30-Day Workmanship Warranty</option>
                                    <option value="14-Day Service Warranty">14-Day Service Warranty</option>
                                    <option value="Standard Inspection Warranty">Standard Inspection Warranty</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="font-bold text-slate-700 block">Direct Proposal Message to Citizen</label>
                            <textarea
                                rows={2}
                                value={proposalNote}
                                onChange={(e) => setProposalNote(e.target.value)}
                                placeholder="Explain your tools, background, or arrival details..."
                                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                            />
                        </div>

                        {/* Live Total Computed Breakdown Box */}
                        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-teal-950">Proposal Total</span>
                                <span className="font-mono text-base font-extrabold text-[#0D715F]">
                                    ₱{totalAmount.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-teal-900">
                                <span>Labor: ₱{laborRate.toFixed(2)}</span>
                                {includeParts && <span>· Parts: +₱{partsAmount.toFixed(2)}</span>}
                                {includeSurcharge && <span>· Surcharge: +₱{surchargeAmount.toFixed(2)}</span>}
                                {courierFee > 0 && <span>· Courier: +₱80.00</span>}
                            </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            {builderMode === 'guided' && (
                                <button
                                    type="button"
                                    onClick={() => setStep(4)}
                                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                    <ArrowLeft className="size-3.5" />
                                    <span>Back</span>
                                </button>
                            )}
                            <button
                                type="submit"
                                data-testid="submit-quote-proposal-btn"
                                disabled={isSubmitting || laborRate <= 0}
                                className="ml-auto flex items-center gap-2 rounded-xl bg-[#0D715F] px-5 py-2.5 font-extrabold text-white shadow-md hover:bg-[#0a574a] transition-all disabled:opacity-50 cursor-pointer"
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
