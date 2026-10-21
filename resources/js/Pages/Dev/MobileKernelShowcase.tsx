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
                {
                    role: 'STORE',
                    title: 'Tagudin HW',
                    sub: '₱180',
                    type: 'store',
                    bg: '#FEF3C7',
                    color: '#B45309',
                },
                {
                    role: 'COURIER',
                    title: 'Danny Exp.',
                    sub: '₱80',
                    type: 'delivery',
                    bg: '#E0F2FE',
                    color: '#0284C7',
                },
                {
                    role: 'YOU',
                    title: 'Kuya Ben AC',
                    sub: '₱450',
                    type: 'labor',
                    bg: '#E8F7F1',
                    color: '#0D715F',
                },
            ],
            slots: [
                {
                    type: 'store',
                    role: 'Hardware Store Depot',
                    name: 'Tagudin Hardware & Supply',
                    meta: '₱180.00 parts budget',
                },
                {
                    type: 'delivery',
                    role: 'Parts Courier Runner',
                    name: 'Danny Express Motorcycle Pool',
                    meta: '₱80.00 route fee',
                },
            ],
        },
        {
            id: 'combo-audit',
            title: 'Post-Service Safety Audit',
            icon: '🛡️',
            isDefault: false,
            nodes: [
                {
                    role: 'YOU',
                    title: 'Kuya Ben AC',
                    sub: '₱450',
                    type: 'labor',
                    bg: '#E8F7F1',
                    color: '#0D715F',
                },
                {
                    role: 'AUDIT',
                    title: 'Open Slot',
                    sub: '₱150',
                    type: 'audit',
                    bg: '#EDE9FE',
                    color: '#7C3AED',
                },
            ],
            slots: [
                {
                    type: 'audit',
                    role: 'Safety Auditor Slot',
                    name: 'Open Slot',
                    meta: '₱150.00 audit fee',
                },
            ],
        },
    ]);

    // 5. Wave Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Handlers
    const scrollToTop = () => {
        const main = document.querySelector('main');
        if (main) main.scrollTop = 0;
    };

    const handleStepChange = (step: number) => {
        setCurrentStep(step);
        scrollToTop();
    };

    const handlePrimaryClick = () => {
        if (currentStep >= 3) {
            alert('Listing published successfully to Tagudin marketplace!');
            setCurrentStep(1);
        } else {
            setCurrentStep((s) => s + 1);
        }
        scrollToTop();
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

    const isStepVisible = (step: number) => viewMode === 'advanced' || currentStep === step;

    return (
        <AppLayout
            variant="split"
            actingContext={{
                actorUserId: 'usr_rosa',
                ownerUserId: 'usr_mang_jose',
                ownerName: "Mang Jose's Vulcanizing",
                consentGrantId: 'cg_101',
                isActingOnBehalf: isActing,
            }}
            previewSlot={
                <div className="flex flex-col gap-3">
                    <div className="flex h-28 w-full items-center justify-center rounded-lg bg-emerald-100 text-xs font-[var(--sz-font-display)] font-bold text-emerald-900">
                        📷 Inverter Split AC Cover Photo
                    </div>
                    <div className="text-sm font-extrabold text-[#0F2F58]">
                        Inverter Split AC Deep Clean &amp; Checkup
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="font-bold text-emerald-700">★ 4.9</span>
                        <span>(42 reviews)</span>
                        <span>·</span>
                        <span>Tagudin Centro</span>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-700">
                        <div className="mb-1 font-bold text-[#0F2F58]">What's Included:</div>
                        <div className="flex flex-col gap-1 text-[11px]">
                            <div>✓ Chemical foam wash &amp; disinfection</div>
                            <div>✓ Blower wheel grease flush</div>
                            <div>✓ High-pressure drain line unclog</div>
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs">
                        <div className="mb-0.5 font-bold text-[#0F2F58]">Work Execution SLA:</div>
                        <div className="font-mono text-xs font-bold text-emerald-700">
                            75 mins · 4 Verified Milestone Gates
                        </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                        <span className="text-xs text-slate-500">Starting labor:</span>
                        <span className="font-mono text-base font-extrabold text-[#0F2F58]">
                            ₱450.00
                        </span>
                    </div>
                </div>
            }
            header={
                <StepWizardHeader
                    title={
                        viewMode === 'advanced' ? 'All-in-One Editor' : `Step ${currentStep} of 3`
                    }
                    draftVersion="v1"
                    onBack={() => {
                        if (currentStep > 1 && viewMode === 'guided') {
                            handleStepChange(currentStep - 1);
                        } else {
                            alert('Back pressed');
                        }
                    }}
                    onSaveDraft={() => alert('Draft saved')}
                />
            }
            dock={
                <StickyDock
                    primaryAction={
                        <span>
                            {currentStep === 3 || viewMode === 'advanced'
                                ? 'Publish Listing ✓'
                                : `Continue to Step ${currentStep + 1} →`}
                        </span>
                    }
                    onPrimaryAction={handlePrimaryClick}
                    steps={
                        viewMode === 'guided'
                            ? {
                                  total: 3,
                                  activeIndex: currentStep - 1,
                                  onDotClick: (i) => handleStepChange(i + 1),
                              }
                            : undefined
                    }
                    modeSwitcher={{
                        isAdvanced: viewMode === 'advanced',
                        onToggle: () => {
                            setViewMode((m) => (m === 'guided' ? 'advanced' : 'guided'));
                            scrollToTop();
                        },
                    }}
                />
            }
        >
            <div className="flex flex-col gap-4">
                {/* 1. Context Switcher Demo Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <div className="text-xs font-bold text-[#0F2F58]">
                                Acting-for Context (OBAC Banner)
                            </div>
                            <div className="text-[10px] text-slate-500">
                                Toggle to test the field-agent delegation state
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsActing((a) => !a)}
                            className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-bold text-[#0F2F58] hover:bg-slate-100"
                        >
                            {isActing ? 'Turn Off Acting' : 'Turn On Acting'}
                        </button>
                    </div>
                </div>

                {/* STEP 1: Service Identity & Work Execution Pipeline */}
                {isStepVisible(1) && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                            <div>
                                <div className="text-xs font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                    Step 1 · Scope & Work Pipeline
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    Define deliverables, milestones, and evidence gates
                                </div>
                            </div>
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[8.5px] font-bold text-emerald-800">
                                STEP 1
                            </span>
                        </div>

                        {/* Title & Description Preview */}
                        <div className="mb-3 flex flex-col gap-2 border-b border-slate-100 pb-3">
                            <div>
                                <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                                    Service Title
                                </label>
                                <input
                                    type="text"
                                    defaultValue="Inverter Split AC Deep Clean & Checkup"
                                    className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-[#FAFCFB] px-2.5 text-xs font-bold text-[#0F2F58] outline-none focus:border-emerald-600 focus:bg-white"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                                    Description
                                </label>
                                <textarea
                                    rows={2}
                                    defaultValue="Complete indoor evaporator coil deep chemical wash and outdoor condensing unit pressure inspection."
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-[#FAFCFB] p-2 text-xs text-slate-700 outline-none focus:border-emerald-600 focus:bg-white"
                                />
                            </div>
                        </div>

                        {/* Flow Type Switcher */}
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10.5px] font-bold text-[#0F2F58]">
                                DAG Topology
                            </span>
                            <div className="flex items-center gap-1">
                                {(['linear', 'parallel', 'branch'] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setFlowType(t)}
                                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize transition-all ${
                                            flowType === t
                                                ? 'border-transparent bg-[#0F2F58] text-white'
                                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Compact Bounded Canvas */}
                        <WorkPipelineCanvas
                            stages={stages}
                            flowType={flowType}
                            onStageClick={(s) => alert(`Stage clicked: ${s.title}`)}
                        />

                        {/* Editable Stages List */}
                        <div className="mt-3.5">
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-[10.5px] font-extrabold tracking-wider text-[#0F2F58] uppercase">
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
                )}

                {/* STEP 2: Rates & Options */}
                {isStepVisible(2) && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                            <div>
                                <div className="text-xs font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                    Step 2 · Rates & Options
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    Commercial base pricing, add-ons, and payment rails
                                </div>
                            </div>
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[8.5px] font-bold text-blue-800">
                                STEP 2
                            </span>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                                        Base Labor (₱)
                                    </label>
                                    <input
                                        type="text"
                                        defaultValue="450.00"
                                        className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-[#FAFCFB] px-2.5 font-mono text-sm font-bold text-[#0F2F58] outline-none focus:border-emerald-600"
                                    />
                                </div>
                                <div className="w-36">
                                    <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                                        Pricing Model
                                    </label>
                                    <select className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-[#FAFCFB] px-2 text-xs font-bold text-slate-800 outline-none">
                                        <option>Fixed Rate</option>
                                        <option>Price Range</option>
                                        <option>Package Tiers</option>
                                    </select>
                                </div>
                            </div>

                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                                <div className="text-xs font-bold text-[#0F2F58]">
                                    Accepted Payment Rails
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    <span className="rounded-full border border-emerald-300 bg-white px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                        ✓ Cash on Completion
                                    </span>
                                    <span className="rounded-full border border-emerald-300 bg-white px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                        ✓ GCash P2P
                                    </span>
                                    <span className="rounded-full border border-emerald-300 bg-white px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                        ✓ Tiwala Escrow
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: Partnered Services / Deal Chain */}
                {isStepVisible(3) && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                            <div>
                                <div className="text-xs font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                    Step 3 · Partnered Services
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    Customer-selectable Deal Chain partner combinations
                                </div>
                            </div>
                            <span className="border-navy-200 rounded-full border bg-[#0F2F58] px-2 py-0.5 text-[8.5px] font-bold text-white">
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

                        {/* Modal Trigger Demo */}
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="text-[10.5px] font-bold text-slate-600">
                                Browse Available Combinations
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="rounded-full bg-[#0F2F58] px-3 py-1 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#153e74]"
                            >
                                Open Catalog ↗
                            </button>
                        </div>
                    </div>
                )}
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
                            className="w-full rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 transition-colors outline-none focus:border-emerald-600 focus:bg-white"
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
