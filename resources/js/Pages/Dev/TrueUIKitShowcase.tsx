import { useState } from 'react';
import { DesktopGlobalNav } from '@/components/layout/DesktopGlobalNav';
import { DesktopStepProgress } from '@/components/layout/DesktopStepProgress';
import {
    WorkPipelineCanvas,
    EditableStageRow,
    DealChainCarousel,
    GlovoWaveModal,
    type WorkStage,
    type DealChainCombination,
    type SlotType,
} from '@/components/mobile';

export default function TrueUIKitShowcase() {
    // 1. Acting-for context state
    const [isActing, setIsActing] = useState(true);

    // 2. Multi-step state
    const [currentStep, setCurrentStep] = useState(1);

    // 3. Work Pipeline state
    const [flowType, setFlowType] = useState<'linear' | 'parallel' | 'branch'>('linear');
    const [stages, setStages] = useState<WorkStage[]>([
        {
            id: 's1',
            num: '1',
            title: 'Intake Triage',
            dur: '15m',
            desc: 'Isolate main breaker, inspect coil status, customer intake interview.',
            evidence: 'Breaker lock-out photo',
            color: '#0D715F',
            bg: '#E8F7F1',
        },
        {
            id: 's2',
            num: '2',
            title: 'Coil Wash',
            dur: '20m',
            desc: 'Apply specialized chemical foam on evaporator fins and pressure flush.',
            evidence: 'Chemical foam coverage photo',
            color: '#0F766E',
            bg: '#CCFBF1',
        },
        {
            id: 's3',
            num: '3',
            title: 'Cold Run',
            dur: '15m',
            desc: 'Restore power and verify compressor startup, amp draw, and fan cycle.',
            evidence: 'Amperage reading photo',
            color: '#B45309',
            bg: '#FEF3C7',
        },
        {
            id: 's4',
            num: '4',
            title: 'Delta Test',
            dur: '15m',
            desc: 'Verify temperature drop (ΔT ≥ 12°C) with dual digital thermometer probes.',
            evidence: 'Dual-probe delta photo + Customer OTP sign-off',
            color: '#475569',
            bg: '#F1F5F9',
        },
    ]);

    // 4. Deal Chain state
    const [activeComboIndex, setActiveComboIndex] = useState(0);
    const [combinations, setCombinations] = useState<DealChainCombination[]>([
        {
            id: 'combo-parts',
            title: 'Turnkey Sourced Parts',
            icon: '📦',
            isDefault: true,
            nodes: [
                { role: 'STORE', title: 'Tagudin HW', sub: '₱180', type: 'store', bg: '#FEF3C7', color: '#B45309' },
                { role: 'COURIER', title: 'Danny Exp.', sub: '₱80', type: 'delivery', bg: '#E0F2FE', color: '#0284C7' },
                { role: 'YOU', title: 'Kuya Ben AC', sub: '₱450', type: 'labor', bg: '#E8F7F1', color: '#0D715F' },
            ],
            slots: [
                { type: 'store', role: 'Hardware Store Depot', name: 'Tagudin Hardware & Supply', meta: '₱180.00 parts budget' },
                { type: 'delivery', role: 'Parts Courier Runner', name: 'Danny Express Motorcycle Pool', meta: '₱80.00 route fee' },
            ],
        },
        {
            id: 'combo-audit',
            title: 'Post-Service Safety Audit',
            icon: '🛡️',
            isDefault: false,
            nodes: [
                { role: 'YOU', title: 'Kuya Ben AC', sub: '₱450', type: 'labor', bg: '#E8F7F1', color: '#0D715F' },
                { role: 'AUDIT', title: 'Open Slot', sub: '₱150', type: 'audit', bg: '#EDE9FE', color: '#7C3AED' },
            ],
            slots: [
                { type: 'audit', role: 'Safety Auditor Slot', name: 'Open Slot', meta: '₱150.00 audit fee' },
            ],
        },
    ]);

    // 5. Wave Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Handlers
    const handleStepNav = (step: number) => {
        setCurrentStep(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStageChange = (idx: number, updated: Partial<WorkStage>) => {
        setStages((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...updated };
            return next;
        });
    };

    const handleStageRemove = (idx: number) => {
        if (stages.length <= 1) {
            alert('At least 1 stage is required.');
            return;
        }
        setStages((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleAddStage = () => {
        const nextNum = stages.length + 1;
        setStages((prev) => [
            ...prev,
            {
                id: `s-${Date.now()}`,
                num: String(nextNum),
                title: `Milestone Stage ${nextNum}`,
                dur: '15m',
                desc: 'Operational verification task description.',
                evidence: 'Photo evidence required',
                color: '#0D715F',
                bg: '#E8F7F1',
            },
        ]);
    };

    const handleSlotClick = (comboId: string, slotType: SlotType) => {
        alert(`Slot picker triggered for combo ${comboId} -> role: ${slotType}`);
    };

    const handleToggleDefault = (comboId: string) => {
        setCombinations((prev) =>
            prev.map((c) => ({
                ...c,
                isDefault: c.id === comboId,
            })),
        );
    };

    const handleRemoveCombo = (comboId: string) => {
        if (combinations.length <= 1) {
            alert('At least 1 combination is required.');
            return;
        }
        setCombinations((prev) => prev.filter((c) => c.id !== comboId));
    };

    const wizardSteps = [
        { id: 1, title: 'Scope & Work Pipeline', description: 'What is included & milestones' },
        { id: 2, title: 'Rates & Add-ons', description: 'Base pricing & payment rails' },
        { id: 3, title: 'Partnered Extensions', description: 'Deal Chain delivery & slots' },
    ];

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900">
            {/* 1. Global Desktop Navigation (Hidden on Mobile, Visible on Desktop lg:) */}
            <DesktopGlobalNav
                activeRoute="listings"
                actingContext={{
                    actorUserId: 'usr_rosa',
                    ownerUserId: 'usr_mang_jose',
                    ownerName: "Mang Jose's Vulcanizing",
                    consentGrantId: 'cg_101',
                    isActingOnBehalf: isActing,
                }}
                rightSlot={
                    <button
                        type="button"
                        onClick={() => setIsActing(!isActing)}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-[#0F2F58] hover:bg-slate-50 cursor-pointer"
                    >
                        {isActing ? 'Exit Delegation' : 'Act for Mang Jose'}
                    </button>
                }
            />

            {/* 2. Mobile-Only Top Navigation (Hidden on Desktop) */}
            <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => currentStep > 1 && handleStepNav(currentStep - 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700"
                    >
                        ←
                    </button>
                    <div>
                        <div className="text-xs font-extrabold text-[#0F2F58]">
                            Step {currentStep} of 3
                        </div>
                        <div className="text-[10px] text-slate-500">Service Creator</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[9.5px] font-bold text-amber-800 border border-amber-200">
                        Draft · v1
                    </span>
                    <button
                        type="button"
                        onClick={() => alert('Draft saved')}
                        className="text-xs font-bold text-[#0F2F58]"
                    >
                        Save
                    </button>
                </div>
            </header>

            {/* Acting-for Mobile Banner */}
            {isActing && (
                <div className="flex items-center justify-between border-b border-amber-200 bg-[#FEF3C7] px-4 py-2 text-xs font-bold text-[#92400E] lg:hidden">
                    <span>👤 Acting for: Mang Jose's Vulcanizing</span>
                    <button
                        type="button"
                        onClick={() => setIsActing(false)}
                        className="text-[10px] underline"
                    >
                        Exit
                    </button>
                </div>
            )}

            {/* Main Responsive Body Container */}
            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
                {/* Desktop Stepper Bar (Hidden on Mobile) */}
                <DesktopStepProgress
                    steps={wizardSteps}
                    currentStep={currentStep}
                    onStepClick={handleStepNav}
                />

                {/* Responsive Dual-Column Grid (Single column on Mobile, 58% / 42% on Desktop) */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    {/* LEFT COLUMN (58% on Desktop): The Form Wizard Card */}
                    <div className="flex flex-col gap-6 lg:col-span-7">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                            {/* STEP 1: Scope & Work Pipeline */}
                            {currentStep === 1 && (
                                <div className="flex flex-col gap-5">
                                    <div className="border-b border-slate-100 pb-4">
                                        <h2 className="text-base font-extrabold text-[#0F2F58] sm:text-lg">
                                            Step 1 · Scope &amp; Work Pipeline
                                        </h2>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Define base deliverables, category coverage, and operational milestone stages
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                            Service Title
                                        </label>
                                        <input
                                            type="text"
                                            defaultValue="Inverter Split AC Deep Clean & Checkup"
                                            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-[#FAFCFB] px-3 text-xs font-bold text-[#0F2F58] outline-none transition-colors focus:border-[#0F2F58] focus:bg-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                            Description
                                        </label>
                                        <textarea
                                            rows={3}
                                            defaultValue="Complete indoor evaporator coil deep chemical foam wash and outdoor condensing unit pressure inspection in Tagudin."
                                            className="mt-1 w-full rounded-lg border border-slate-300 bg-[#FAFCFB] p-3 text-xs text-slate-700 outline-none transition-colors focus:border-[#0F2F58] focus:bg-white"
                                        />
                                    </div>

                                    {/* What's Included */}
                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                                What's Included
                                            </label>
                                            <span className="text-[10px] font-bold text-emerald-700">
                                                Base Deliverables
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {[
                                                'Evaporator coil chemical foam wash & disinfection',
                                                'Blower fan wheel disassembly & grease flush',
                                                'Drain line high-pressure unclogging',
                                            ].map((inc, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-[#FAFCFB] px-3 py-2 text-xs font-medium text-slate-800"
                                                >
                                                    <span className="font-bold text-emerald-600">✓</span>
                                                    <input
                                                        type="text"
                                                        defaultValue={inc}
                                                        className="flex-1 border-none bg-transparent outline-none text-xs font-semibold text-slate-800"
                                                    />
                                                    <button type="button" className="text-slate-400 hover:text-slate-600">
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Work Execution Pipeline */}
                                    <div className="mt-2 border-t border-slate-100 pt-4">
                                        <div className="mb-2.5 flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                                    Work Execution Pipeline
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    Bounded light-mode DAG canvas with SVG wires
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {(['linear', 'parallel', 'branch'] as const).map((t) => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => setFlowType(t)}
                                                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize transition-all cursor-pointer ${
                                                            flowType === t
                                                                ? 'border-transparent bg-[#0F2F58] text-white shadow-sm'
                                                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <WorkPipelineCanvas
                                            stages={stages}
                                            flowType={flowType}
                                            onStageClick={(s) => alert(`Stage clicked: ${s.title}`)}
                                        />

                                        {/* Editable Stages List */}
                                        <div className="mt-4">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                                    Milestone Stages &amp; Proof Gates
                                                </span>
                                                <span className="text-[10px] font-bold text-emerald-700">
                                                    {stages.length} Tracked Gates
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-2.5">
                                                {stages.map((st, i) => (
                                                    <EditableStageRow
                                                        key={st.id}
                                                        stage={st}
                                                        index={i}
                                                        onChange={handleStageChange}
                                                        onRemove={handleStageRemove}
                                                    />
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddStage}
                                                className="mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-600 bg-emerald-50/40 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-50"
                                            >
                                                <span>＋ Add Milestone Stage</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Rates & Options */}
                            {currentStep === 2 && (
                                <div className="flex flex-col gap-5">
                                    <div className="border-b border-slate-100 pb-4">
                                        <h2 className="text-base font-extrabold text-[#0F2F58] sm:text-lg">
                                            Step 2 · Rates &amp; Options
                                        </h2>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Commercial labor pricing, add-on upgrades, and accepted payment rails
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                                Base Labor Rate (₱)
                                            </label>
                                            <div className="mt-1 flex h-10 items-center rounded-lg border border-slate-300 bg-[#FAFCFB] px-3 focus-within:border-[#0F2F58] focus-within:bg-white">
                                                <span className="font-bold text-[#0F2F58]">₱</span>
                                                <input
                                                    type="text"
                                                    defaultValue="450.00"
                                                    className="ml-2 w-full border-none bg-transparent font-mono text-sm font-bold text-[#0F2F58] outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                                Pricing Model
                                            </label>
                                            <select className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-[#FAFCFB] px-3 text-xs font-bold text-slate-800 outline-none">
                                                <option>Fixed Rate per Service</option>
                                                <option>Price Range (Min - Max)</option>
                                                <option>Volume Package Tiers</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="text-xs font-bold text-[#0F2F58]">
                                            Accepted Payment Rails in Tagudin
                                        </div>
                                        <div className="mt-2.5 flex flex-wrap gap-2">
                                            <span className="flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-800 shadow-sm">
                                                <span>✓</span> Cash on Completion
                                            </span>
                                            <span className="flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-800 shadow-sm">
                                                <span>✓</span> GCash P2P
                                            </span>
                                            <span className="flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-800 shadow-sm">
                                                <span>✓</span> Tiwala Escrow
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Partnered Services / Deal Chain */}
                            {currentStep === 3 && (
                                <div className="flex flex-col gap-5">
                                    <div className="border-b border-slate-100 pb-4">
                                        <h2 className="text-base font-extrabold text-[#0F2F58] sm:text-lg">
                                            Step 3 · Partnered Services (Deal Chain)
                                        </h2>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Customer-selectable Deal Chain partner combinations (parts, delivery, audit)
                                        </p>
                                    </div>

                                    <DealChainCarousel
                                        combinations={combinations}
                                        activeIndex={activeComboIndex}
                                        onIndexChange={setActiveComboIndex}
                                        onSlotChangeClick={handleSlotClick}
                                        onToggleDefault={handleToggleDefault}
                                        onRemoveCombo={handleRemoveCombo}
                                        onAddComboClick={() => setIsModalOpen(true)}
                                    />

                                    <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                                        <div>
                                            <div className="text-xs font-bold text-[#0F2F58]">
                                                Browse Catalog Combinations
                                            </div>
                                            <div className="text-[10px] text-slate-500">
                                                Attach pre-configured multi-party recipes
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(true)}
                                            className="rounded-full bg-[#0F2F58] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#153e74] cursor-pointer"
                                        >
                                            Open Catalog ↗
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* INLINE FORM FOOTER (Shown on Desktop, Replaces Floating Bottom Dock) */}
                            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                                <button
                                    type="button"
                                    disabled={currentStep === 1}
                                    onClick={() => handleStepNav(currentStep - 1)}
                                    className="rounded-full border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                                >
                                    ← Previous Step
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (currentStep >= 3) {
                                            alert('Listing successfully published!');
                                        } else {
                                            handleStepNav(currentStep + 1);
                                        }
                                    }}
                                    className="rounded-full bg-[#0F2F58] px-7 py-2.5 text-xs font-extrabold tracking-wide text-white shadow-md transition-all hover:bg-[#153e74] active:scale-98 cursor-pointer"
                                >
                                    {currentStep === 3 ? 'Publish Listing ✓' : `Continue to Step ${currentStep + 1} →`}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN (42% on Desktop): Live Real-Time Customer Preview */}
                    <div className="hidden lg:col-span-5 lg:block">
                        <div className="sticky top-24 flex flex-col gap-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        Live Buyer Preview (WYSIWYG)
                                    </span>
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                                        Public Shape
                                    </span>
                                </div>

                                <div className="flex flex-col gap-4">
                                    {/* Cover Placeholder */}
                                    <div className="flex h-36 w-full items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 text-xs font-bold text-emerald-900 border border-emerald-200/60">
                                        📷 Inverter Split AC Cover Media
                                    </div>

                                    <div>
                                        <h3 className="text-base font-extrabold text-[#0F2F58]">
                                            Inverter Split AC Deep Clean &amp; Checkup
                                        </h3>
                                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                                            <span className="font-bold text-emerald-700">★ 4.9</span>
                                            <span>(42 citizen reviews)</span>
                                            <span>·</span>
                                            <span>Tagudin Centro</span>
                                        </div>
                                    </div>

                                    {/* Deliverables */}
                                    <div className="rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs text-slate-700">
                                        <div className="mb-1.5 font-bold text-[#0F2F58]">What's Included:</div>
                                        <div className="flex flex-col gap-1 text-[11px]">
                                            <div>✓ Chemical foam wash &amp; disinfection</div>
                                            <div>✓ Blower wheel grease flush</div>
                                            <div>✓ High-pressure drain line unclog</div>
                                        </div>
                                    </div>

                                    {/* Work SLA Preview */}
                                    <div className="rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs">
                                        <div className="mb-1 font-bold text-[#0F2F58]">Work Execution SLA:</div>
                                        <div className="font-mono text-xs font-bold text-emerald-700">
                                            75 mins · 4 Verified Milestone Gates
                                        </div>
                                    </div>

                                    {/* Partner Deal Chain Options */}
                                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-xs">
                                        <div className="mb-1 font-bold text-[#0F2F58]">Available Deal Chains:</div>
                                        <div className="flex flex-col gap-1 text-[11px] text-slate-700">
                                            <div>• 📦 Turnkey Sourced Parts (+₱260.00)</div>
                                            <div>• 🛡️ Post-Service Safety Audit (+₱150.00)</div>
                                        </div>
                                    </div>

                                    {/* Pricing Row */}
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                                Base Labor
                                            </div>
                                            <div className="font-mono text-lg font-extrabold text-[#0F2F58]">
                                                ₱450.00
                                            </div>
                                        </div>
                                        <span className="rounded-full bg-[#0F2F58] px-4 py-2 text-xs font-bold text-white shadow-sm opacity-90 cursor-not-allowed">
                                            Book Service ↗
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Live Wave Modal Component */}
            <GlovoWaveModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Work Execution Catalog"
                subtitle="Pick a standardized workflow template for your service category"
                headerSlot={
                    <div className="mt-2">
                        <input
                            type="text"
                            placeholder="Search workflows, stages, or shapes..."
                            className="w-full rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none transition-colors focus:border-[#0F2F58] focus:bg-white"
                        />
                    </div>
                }
                bottomSlot={
                    <button
                        type="button"
                        onClick={() => alert('Redirecting to full Work Studio')}
                        className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] text-xs font-extrabold tracking-wide text-white shadow-md transition-all hover:bg-[#153e74]"
                    >
                        <span>＋ Build Custom Workflow in Work Studio ↗</span>
                    </button>
                }
            >
                <div className="flex flex-col gap-2.5 py-2">
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-3">
                        <div className="text-xs font-extrabold text-[#0F2F58]">
                            Standard Inverter Deep Clean
                        </div>
                        <div className="text-[10px] text-slate-500">
                            4 Stages · 75m SLA · Chemical wash & delta test
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs font-extrabold text-[#0F2F58]">
                            Express Dual-Tech Clean (Parallel)
                        </div>
                        <div className="text-[10px] text-slate-500">
                            2 Concurrent Streams · 45m SLA · Synchronized indoor/outdoor
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs font-extrabold text-[#0F2F58]">
                            AC Leak Detection & Braze Triage (Branch)
                        </div>
                        <div className="text-[10px] text-slate-500">
                            Decision Gate · 60m SLA · Nitrogen pressure test
                        </div>
                    </div>
                </div>
            </GlovoWaveModal>

            {/* 3. Mobile Floating Bottom Dock (Hidden on Desktop lg:hidden) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
                <div className="flex w-full flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 pb-5 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur">
                    {/* Glovo Step Dots */}
                    <div className="flex items-center justify-center gap-1.5">
                        {[1, 2, 3].map((stepId) => (
                            <span
                                key={stepId}
                                onClick={() => handleStepNav(stepId)}
                                className={`h-1.5 cursor-pointer rounded-full transition-all ${
                                    stepId === currentStep
                                        ? 'w-6 bg-[#0F2F58]'
                                        : 'w-2 bg-slate-300'
                                }`}
                            />
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (currentStep >= 3) {
                                alert('Listing successfully published!');
                            } else {
                                handleStepNav(currentStep + 1);
                            }
                        }}
                        className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-[#0F2F58] text-xs font-extrabold text-white shadow-md active:bg-[#0a2240]"
                    >
                        {currentStep === 3 ? 'Publish Listing ✓' : `Continue to Step ${currentStep + 1} →`}
                    </button>
                </div>
            </div>
        </div>
    );
}
