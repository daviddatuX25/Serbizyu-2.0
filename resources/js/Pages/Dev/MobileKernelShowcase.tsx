import { useState } from 'react';
import {
    AppLayout,
    StickyDock,
    StepWizardHeader,
    WorkPipelineCanvas,
    EditableStageRow,
    DealChainCarousel,
    GlovoWaveModal,
    type WorkStage,
    type DealChainCombination,
    type SlotType,
} from '@/components/mobile';

export default function MobileKernelShowcase() {
    // 1. Acting-for context toggle
    const [isActing, setIsActing] = useState(false);

    // 2. Wizard state
    const [currentStep, setCurrentStep] = useState(1);
    const [viewMode, setViewMode] = useState<'guided' | 'advanced'>('guided');

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

    return (
        <AppLayout
            actingContext={{
                actorUserId: 'usr_rosa',
                ownerUserId: 'usr_mang_jose',
                ownerName: "Mang Jose's Vulcanizing",
                consentGrantId: 'cg_101',
                isActingOnBehalf: isActing,
            }}
            header={
                <StepWizardHeader
                    title="Mobile UI Kernel Showcase"
                    draftVersion="v1"
                    onBack={() => alert('Back pressed')}
                    onSaveDraft={() => alert('Draft saved')}
                    steps={{
                        total: 3,
                        activeIndex: currentStep - 1,
                        onDotClick: (i) => setCurrentStep(i + 1),
                    }}
                />
            }
            dock={
                <StickyDock
                    primaryAction={
                        <span>
                            {currentStep === 3 ? 'Publish Listing ✓' : `Step ${currentStep} · Continue →`}
                        </span>
                    }
                    onPrimaryAction={() => setCurrentStep((s) => (s >= 3 ? 1 : s + 1))}
                    steps={{
                        total: 3,
                        activeIndex: currentStep - 1,
                        onDotClick: (i) => setCurrentStep(i + 1),
                    }}
                    modeSwitcher={{
                        isAdvanced: viewMode === 'advanced',
                        onToggle: () =>
                            setViewMode((m) => (m === 'guided' ? 'advanced' : 'guided')),
                    }}
                />
            }
        >
            <div className="flex flex-col gap-5">
                {/* 1. Context Switcher Demo */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-[#0F2F58]">
                                Acting-for Context (OBAC Banner)
                            </div>
                            <div className="text-[10px] text-slate-500">
                                Toggle to preview the Rosa / Mang Jose delegation bar
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsActing((a) => !a)}
                            className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-bold text-[#0F2F58]"
                        >
                            {isActing ? 'Turn Off Acting' : 'Turn On Acting'}
                        </button>
                    </div>
                </div>

                {/* 2. Work Execution Pipeline Section */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                Work Execution Pipeline
                            </div>
                            <div className="text-[10px] text-slate-500">
                                Bounded light-mode DAG canvas with SVG wires
                            </div>
                        </div>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[8.5px] font-bold text-emerald-800">
                            DAG CANVAS
                        </span>
                    </div>

                    {/* Flow Type Switcher */}
                    <div className="mb-2.5 flex items-center gap-1.5">
                        {(['linear', 'parallel', 'branch'] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setFlowType(t)}
                                className={`rounded-full border px-2.5 py-1 text-[10.5px] font-bold capitalize transition-all ${
                                    flowType === t
                                        ? 'border-transparent bg-[#0F2F58] text-white'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {t} flow
                            </button>
                        ))}
                    </div>

                    {/* Compact Canvas */}
                    <WorkPipelineCanvas
                        stages={stages}
                        flowType={flowType}
                        onStageClick={(s) => alert(`Clicked stage: ${s.title}`)}
                    />

                    {/* Editable Stages List */}
                    <div className="mt-3.5">
                        <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                Live Editable Stages & Evidence
                            </span>
                            <span className="text-[9px] font-bold text-emerald-700">
                                {stages.length} Tracked Gates
                            </span>
                        </div>
                        <div className="flex flex-col gap-2">
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
                            className="mt-2 flex h-8 w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-emerald-600 bg-emerald-50/50 text-[11px] font-bold text-emerald-800 transition-colors hover:bg-emerald-50"
                        >
                            <span>＋ Add Milestone Stage</span>
                        </button>
                    </div>
                </div>

                {/* 3. Deal Chain Carousel Section */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                Deal Chain Carousel Deck
                            </div>
                            <div className="text-[10px] text-slate-500">
                                Horizontal swipe deck with scroll-snap & touch locking
                            </div>
                        </div>
                        <span className="rounded-full border border-navy-200 bg-[#0F2F58] px-2 py-0.5 text-[8.5px] font-bold text-white">
                            DEAL CHAIN
                        </span>
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
                </div>

                {/* 4. Glovo Wave Modal Demo */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-[#0F2F58]">
                                Glovo Organic Wave Modal
                            </div>
                            <div className="text-[10px] text-slate-500">
                                Asymmetrical wave cap with pinned search and bottom action
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="rounded-full bg-[#0F2F58] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#153e74]"
                        >
                            Open Modal ↗
                        </button>
                    </div>
                </div>
            </div>

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
                            className="w-full rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none transition-colors focus:border-emerald-600 focus:bg-white"
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
        </AppLayout>
    );
}
