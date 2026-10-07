import { useState } from 'react';
import {
    Check,
    Sparkles,
    Layers,
    Sliders,
    Smartphone,
    Laptop,
    Fingerprint,
    RefreshCw,
    Wrench,
    Truck,
    Store,
    Package,
    ShieldCheck,
    Camera,
    Coins,
    GitMerge,
    GitBranch,
    ClipboardCheck,
} from 'lucide-react';
import WorkflowsPrototypeShowcase from '@/components/mobile/WorkflowsPrototypeShowcase';
import { DesktopGlobalNav } from '@/components/layout/DesktopGlobalNav';
import { DesktopStepProgress } from '@/components/layout/DesktopStepProgress';
import {
    WorkPipelineCanvas,
    EditableStageRow,
    DealChainCarousel,
    type WorkStage,
    type DealChainCombination,
    type SlotType,
} from '@/components/mobile';
import {
    Button,
    Badge,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    TextInput,
    PasswordInput,
    PasswordRequirements,
    Field,
    NativeSelect,
    Textarea,
    Switch,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Notice,
    Stepper,
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    GlovoWaveModal,
} from '@/components/ui';

export default function TrueUIKitShowcase() {
    // 0. Top-Level Showcase Mode: 'primitives' (UI Kit Foundation) vs 'wizard' (Service Creator flow)
    const [topMode, setTopMode] = useState<'primitives' | 'wizard' | 'workflows'>('primitives');

    // UI Kit Interactive Playground States
    const [btnLoading, setBtnLoading] = useState(false);
    const [formHasError, setFormHasError] = useState(false);
    const [switchActive, setSwitchActive] = useState(true);
    const [activeDemoTab, setActiveDemoTab] = useState('marketplace');
    const [activeStepperStep, setActiveStepperStep] = useState(1);
    const [isGlovoWaveOpen, setIsGlovoWaveOpen] = useState(false);
    const [cardPressCount, setCardPressCount] = useState(0);

    // Form inputs state
    const [inputVal, setInputVal] = useState('Aircon Full Chemical Wash & Disinfection');
    const [pwdVal, setPwdVal] = useState('SecurePass123!');
    const [categoryVal, setCategoryVal] = useState('hvac');
    const [notesVal, setNotesVal] = useState(
        'Includes standard high-pressure water pump flush, evaporator foaming, and coil antimicrobial treatment.',
    );

    // 1. Wizard Acting-for context state
    const [isActing, setIsActing] = useState(true);

    // 2. Wizard Multi-step state
    const [currentStep, setCurrentStep] = useState(1);

    // 3. Work Pipeline state
    const [flowType] = useState<'linear' | 'parallel' | 'branch'>('linear');
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

    const triggerLoadingDemo = () => {
        setBtnLoading(true);
        setTimeout(() => setBtnLoading(false), 2000);
    };

    return (
        <div className="min-h-screen w-full bg-slate-50 text-slate-900">
            {/* Global Desktop Navigation */}
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
                        className="cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-primary hover:bg-slate-50"
                    >
                        {isActing ? 'Exit Delegation' : 'Act for Mang Jose'}
                    </button>
                }
            />

            {/* Top-Level Mode Selector Banner */}
            <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-xs">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-xl border border-royal-200 bg-royal-50 text-royal-950">
                            <Sparkles className="size-5 text-[#0F2F58]" />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-extrabold text-foreground sm:text-base">
                                    Serbizyu Final UI Kit &amp; Design System
                                </h1>
                                <Badge tone="royal">Primary Brand · Royal Navy</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Impeccable Craft · Emil Kowalski Tactile Physics · Tailwind v4
                                Design Tokens
                            </p>
                        </div>
                    </div>

                    <div className="inline-flex rounded-lg border border-border bg-muted/60 p-1">
                        <button
                            type="button"
                            onClick={() => setTopMode('primitives')}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                                topMode === 'primitives'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Layers className="size-3.5" />
                            <span>Living Primitives</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setTopMode('wizard')}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                                topMode === 'wizard'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Sliders className="size-3.5" />
                            <span>Pipeline Wizard Prototype</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setTopMode('workflows')}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                                topMode === 'workflows'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <GitBranch className="size-3.5" />
                            <span>Workflows &amp; Canonical Nodes</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* VIEW A: LIVING UI KIT PRIMITIVES & DESIGN SYSTEM                          */}
            {/* ========================================================================= */}
            {topMode === 'primitives' && (
                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
                    <div className="flex flex-col gap-10">
                        {/* 1. BRAND PALETTE & TOKENS */}
                        <section className="flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                                        1. Serbizyu Brand Design Tokens
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Tailwind v4 @theme inline tokens — Zero rogue hex codes in
                                        application markup
                                    </p>
                                </div>
                                <Badge tone="neutral">app.css</Badge>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                {/* Royal Blue & Navy Anchor Palette */}
                                <Card className="border-royal-200/80 bg-white p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground">
                                            Royal Navy (Brand Anchor)
                                        </span>
                                        <Badge tone="royal">#0F2F58</Badge>
                                    </div>
                                    <div className="mt-3 flex flex-col gap-1.5">
                                        <div className="flex h-9 items-center justify-between rounded-md bg-[#0F2F58] px-3 text-xs font-bold text-white shadow-xs">
                                            <span>navy-950 (#0F2F58)</span>
                                            <span>Royal Anchor</span>
                                        </div>
                                        <div className="flex h-6 items-center justify-between rounded bg-gradient-to-r from-[#0F2F58] via-[#1E3A8A] to-[#2563EB] px-2 text-[10px] font-bold text-white shadow-xs">
                                            <span>Hero Royal Gradient</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1 text-[11px] font-medium">
                                            <div className="rounded border border-royal-200 bg-royal-50 p-2 text-royal-950">
                                                50 Ice
                                            </div>
                                            <div className="rounded bg-[#1E3A8A] p-2 text-white">
                                                900 Deep
                                            </div>
                                            <div className="rounded bg-[#2563EB] p-2 text-white">
                                                600 Vivid
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Forest Palette */}
                                <Card className="p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground">
                                            Forest (Marketplace Primary)
                                        </span>
                                        <Badge tone="forest">--primary</Badge>
                                    </div>
                                    <div className="mt-3 flex flex-col gap-1.5">
                                        <div className="flex h-9 items-center justify-between rounded-md bg-forest-600 px-3 text-xs font-bold text-white shadow-xs">
                                            <span>forest-600 (#0D715F)</span>
                                            <span>Marketplace</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1 text-[11px] font-medium">
                                            <div className="rounded bg-forest-50 p-2 text-forest-700">
                                                50 Tint
                                            </div>
                                            <div className="rounded bg-forest-100 p-2 text-forest-800">
                                                100 Soft
                                            </div>
                                            <div className="rounded bg-forest-700 p-2 text-white">
                                                700 Deep
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Mango Palette */}
                                <Card className="p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground">
                                            Mango (Warm CTA)
                                        </span>
                                        <Badge tone="warm">variant="warm"</Badge>
                                    </div>
                                    <div className="mt-3 flex flex-col gap-1.5">
                                        <div className="flex h-9 items-center justify-between rounded-md bg-mango-400 px-3 text-xs font-bold text-ink shadow-xs">
                                            <span>mango-400 (#F0B429)</span>
                                            <span>Warm CTA</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1 text-[11px] font-medium">
                                            <div className="rounded bg-mango-50 p-2 text-mango-600">
                                                50 Tint
                                            </div>
                                            <div className="text-mango-700 rounded bg-mango-200 p-2">
                                                200 Light
                                            </div>
                                            <div className="rounded bg-mango-500 p-2 text-ink">
                                                500 Dark
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* True Error Red Palette */}
                                <Card className="border-red-200/80 bg-white p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground">
                                            True Red (Error / Danger)
                                        </span>
                                        <Badge tone="danger">#DC2626</Badge>
                                    </div>
                                    <div className="mt-3 flex flex-col gap-1.5">
                                        <div className="flex h-9 items-center justify-between rounded-md bg-red-600 px-3 text-xs font-bold text-white shadow-xs">
                                            <span>red-600 (#DC2626)</span>
                                            <span>True Red</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1 text-[11px] font-medium">
                                            <div className="rounded border border-red-200 bg-red-50 p-2 text-red-700">
                                                50 Tint
                                            </div>
                                            <div className="rounded bg-red-100 p-2 text-red-800">
                                                100 Soft
                                            </div>
                                            <div className="rounded bg-red-700 p-2 text-white">
                                                700 Deep
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Canvas & Ink */}
                                <Card className="p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground">
                                            Canvas &amp; Ink
                                        </span>
                                        <Badge tone="neutral">Semantic</Badge>
                                    </div>
                                    <div className="mt-3 flex flex-col gap-1.5">
                                        <div className="flex h-9 items-center justify-between rounded-md border border-ink/10 bg-canvas px-3 text-xs font-bold text-ink shadow-xs">
                                            <span>canvas (#F3EFE4)</span>
                                            <span>Canvas</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1 text-[11px] font-medium">
                                            <div className="rounded border border-slate-200 bg-surface p-2 text-ink">
                                                Surface (#FFFCF6)
                                            </div>
                                            <div className="rounded bg-slate-900 p-2 text-white">
                                                Ink (#12201C)
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </section>

                        {/* 2. BUTTONS & ACTIONS (EMIL KOWALSKI TACTILE PHYSICS) */}
                        <section className="flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                                        2. Buttons &amp; Physical Press States
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Emil Kowalski feedback:{' '}
                                        <code className="rounded bg-muted px-1.5 py-0.5">
                                            :active:scale-[0.97]
                                        </code>{' '}
                                        with 150ms ease-out transitions. Minimum 44px mobile touch
                                        targets.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={triggerLoadingDemo}
                                    >
                                        <RefreshCw className="mr-1.5 size-3.5" />
                                        Test Loading State
                                    </Button>
                                </div>
                            </div>

                            <Card className="p-6">
                                <div className="flex flex-col gap-6">
                                    {/* Variants Row */}
                                    <div>
                                        <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                            Brand Variants
                                        </span>
                                        <div className="mt-3 flex flex-wrap items-center gap-3">
                                            <Button variant="default">
                                                Primary Royal Blue (#0F2F58)
                                            </Button>
                                            <Button variant="warm">Warm CTA (Mango)</Button>
                                            <Button variant="secondary">Secondary</Button>
                                            <Button variant="outline">Outline</Button>
                                            <Button variant="ghost">Ghost</Button>
                                            <Button variant="destructive">
                                                Destructive (True Red #DC2626)
                                            </Button>
                                            <Button variant="forest">Secondary Forest</Button>
                                            <Button variant="warm" loading={btnLoading}>
                                                Interactive Spinner
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Touch & Sizing Row */}
                                    <div className="border-t border-border pt-4">
                                        <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                            Sizes &amp; Mobile Touch Target (44px)
                                        </span>
                                        <div className="mt-3 flex flex-wrap items-center gap-3">
                                            <Button size="xs" variant="outline">
                                                Extra Small (24px)
                                            </Button>
                                            <Button size="sm" variant="outline">
                                                Small (32px)
                                            </Button>
                                            <Button size="default" variant="outline">
                                                Default (36px)
                                            </Button>
                                            <Button size="touch" variant="default">
                                                Touch / Mobile (44px min-h)
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                aria-label="Icon Action"
                                            >
                                                <Check className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </section>

                        {/* 3. BADGES & STATUS INDICATORS */}
                        <section className="flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                                        3. Status Badges &amp; Lifecycle Tones
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Semantic status pill tags for listings, orders, deal chains,
                                        and disputes
                                    </p>
                                </div>
                            </div>

                            <Card className="p-6">
                                <div className="flex flex-wrap items-center gap-3">
                                    <Badge tone="royal">Royal Navy · #0F2F58</Badge>
                                    <Badge tone="forest">Active · Live (Forest)</Badge>
                                    <Badge tone="warm">Draft · In Progress (Mango)</Badge>
                                    <Badge tone="danger">
                                        Action Required · Error (True Red #DC2626)
                                    </Badge>
                                    <Badge tone="info">Pending Review</Badge>
                                    <Badge tone="neutral">Archived / Neutral</Badge>
                                    <Badge variant="outline">Outline Pill</Badge>
                                    <Badge variant="secondary">Secondary Pill</Badge>
                                </div>
                            </Card>
                        </section>

                        {/* 4. FORMS, FIELDS & ACCESSIBLE INPUTS */}
                        <section className="flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                                        4. Form Controls &amp; Input Fields
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        44px touch targets, password visibility toggles, and unified{' '}
                                        <code className="rounded bg-muted px-1.5 py-0.5">
                                            Field
                                        </code>{' '}
                                        error/hint messaging
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setFormHasError((prev) => !prev)}
                                >
                                    {formHasError
                                        ? 'Clear Form Error'
                                        : 'Simulate Validation Error'}
                                </Button>
                            </div>

                            <Card className="p-6">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {/* Text Field */}
                                    <Field
                                        label="Service Title"
                                        hint="Clear description of the primary offering"
                                        error={
                                            formHasError
                                                ? 'Service title is required and cannot be empty'
                                                : null
                                        }
                                    >
                                        <TextInput
                                            value={inputVal}
                                            onChange={(e) => setInputVal(e.target.value)}
                                            placeholder="e.g. Aircon Repair"
                                        />
                                    </Field>

                                    {/* Password Field */}
                                    <Field
                                        label="Account Security Key"
                                        hint="Built-in accessible show/hide toggle"
                                    >
                                        <PasswordInput
                                            value={pwdVal}
                                            onChange={(e) => setPwdVal(e.target.value)}
                                        />
                                    </Field>
                                    <PasswordRequirements password={pwdVal} />

                                    {/* Native Select */}
                                    <Field
                                        label="Primary Trade Category"
                                        hint="Standardized trade category rail"
                                    >
                                        <NativeSelect
                                            value={categoryVal}
                                            onChange={(e) => setCategoryVal(e.target.value)}
                                        >
                                            <option value="hvac">Aircon &amp; HVAC Services</option>
                                            <option value="plumbing">
                                                Sanitary &amp; Plumbing
                                            </option>
                                            <option value="electrical">
                                                Residential Electrical
                                            </option>
                                            <option value="vulcanizing">
                                                Tire Vulcanizing &amp; Moto
                                            </option>
                                        </NativeSelect>
                                    </Field>

                                    {/* Switch Toggle */}
                                    <div className="flex flex-col justify-center gap-1.5 rounded-lg border border-border/80 bg-muted/20 p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-foreground">
                                                Instant Book Direct Dispatch
                                            </span>
                                            <Switch
                                                checked={switchActive}
                                                onCheckedChange={setSwitchActive}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {switchActive
                                                ? 'Enabled · Customers can checkout immediately without prior quote chat'
                                                : 'Disabled · Requires quote negotiation first'}
                                        </span>
                                    </div>

                                    {/* Textarea */}
                                    <div className="md:col-span-2">
                                        <Field
                                            label="Service Scope Specifications"
                                            hint="Detailed deliverables and customer intake instructions"
                                        >
                                            <Textarea
                                                value={notesVal}
                                                onChange={(e) => setNotesVal(e.target.value)}
                                                rows={3}
                                            />
                                        </Field>
                                    </div>
                                    <div className="border-t border-border pt-2 md:col-span-2">
                                        <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                            Tabs Navigation Primitive
                                        </span>
                                        <div className="mt-2.5">
                                            <Tabs
                                                value={activeDemoTab}
                                                onValueChange={setActiveDemoTab}
                                            >
                                                <TabsList>
                                                    <TabsTrigger value="marketplace">
                                                        Marketplace Service
                                                    </TabsTrigger>
                                                    <TabsTrigger value="dealchain">
                                                        Deal Chain Nodes
                                                    </TabsTrigger>
                                                    <TabsTrigger value="settlement">
                                                        Escrow Settlement
                                                    </TabsTrigger>
                                                </TabsList>
                                                <TabsContent
                                                    value="marketplace"
                                                    className="rounded-lg border border-border bg-muted/20 p-4"
                                                >
                                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                                        Direct customer booking with instant
                                                        checkout and service discovery.
                                                    </p>
                                                </TabsContent>
                                                <TabsContent
                                                    value="dealchain"
                                                    className="rounded-lg border border-border bg-muted/20 p-4"
                                                >
                                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                                        Turnkey multi-party workflows linking
                                                        hardware depots, couriers, and technicians.
                                                    </p>
                                                </TabsContent>
                                                <TabsContent
                                                    value="settlement"
                                                    className="rounded-lg border border-border bg-muted/20 p-4"
                                                >
                                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                                        Dual OTP customer confirmation before escrow
                                                        payout release.
                                                    </p>
                                                </TabsContent>
                                            </Tabs>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </section>

                        {/* 5. SURFACES, CARDS & ELEVATIONS */}
                        <section className="flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                                        5. Surfaces, Cards &amp; Progress
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Elevation hierarchy and Emil Kowalski interactive card
                                        response
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                {/* Default Surface Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Standard Card</CardTitle>
                                        <CardDescription>
                                            Default surface for dashboards and forms
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground">
                                            Clean card border with 1px border-border and subtle
                                            shadow-xs.
                                        </p>
                                    </CardContent>
                                    <CardFooter>
                                        <Badge tone="royal">Royal Navy Standard</Badge>
                                    </CardFooter>
                                </Card>

                                {/* Serbizyu Warm Canvas Card */}
                                <Card surface="canvas">
                                    <CardHeader>
                                        <CardTitle>Warm Canvas Card</CardTitle>
                                        <CardDescription>
                                            Brand natural background card
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-ink-soft">
                                            Rendered on{' '}
                                            <code className="rounded bg-black/5 px-1 py-0.5">
                                                var(--sz-canvas)
                                            </code>{' '}
                                            with ink typography.
                                        </p>
                                    </CardContent>
                                    <CardFooter>
                                        <Badge tone="warm">Canvas Surface</Badge>
                                    </CardFooter>
                                </Card>

                                {/* Interactive Card */}
                                <Card
                                    interactive
                                    onClick={() => setCardPressCount((c) => c + 1)}
                                    className="cursor-pointer"
                                >
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span>Interactive Card</span>
                                            <Fingerprint className="size-4 text-primary" />
                                        </CardTitle>
                                        <CardDescription>
                                            Click/tap to feel physical response
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground">
                                            Emil Kowalski hover lift +{' '}
                                            <code className="rounded bg-muted px-1 py-0.5">
                                                :active:scale-[0.98]
                                            </code>{' '}
                                            on press.
                                        </p>
                                        <div className="mt-3 text-xs font-bold text-primary">
                                            Pressed: {cardPressCount} times
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <span className="text-[11px] font-semibold text-primary">
                                            Press surface →
                                        </span>
                                    </CardFooter>
                                </Card>
                            </div>

                            {/* Stepper Progress Demo */}
                            <Card className="p-6">
                                <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Interactive Multi-Step Progress Tracker
                                </span>
                                <div className="mt-4">
                                    <Stepper
                                        steps={[
                                            'Intake',
                                            'Rates & Add-ons',
                                            'Deal Chain Nodes',
                                            'Verification',
                                        ]}
                                        current={activeStepperStep}
                                    />
                                    <div className="mt-4 flex gap-2">
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            disabled={activeStepperStep <= 0}
                                            onClick={() =>
                                                setActiveStepperStep((s) => Math.max(0, s - 1))
                                            }
                                        >
                                            Previous Step
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="default"
                                            disabled={activeStepperStep >= 3}
                                            onClick={() =>
                                                setActiveStepperStep((s) => Math.min(3, s + 1))
                                            }
                                        >
                                            Next Step
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {/* Notice Banners */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Notice tone="success" title="Service Verified">
                                    Provider credentials verified with government DTI record.
                                </Notice>
                                <Notice tone="warning" title="Dispute Boundary">
                                    Direct customer cash transactions forfeit escrow protection.
                                </Notice>
                                <Notice tone="danger" title="Safety Inspection Alert · True Red">
                                    Refrigerant recovery pump mandatory prior to compressor opening.
                                </Notice>
                                <Notice tone="neutral" title="System Notice">
                                    Platform platform maintenance scheduled Sundays 02:00 PHT.
                                </Notice>
                            </div>
                        </section>

                        {/* 6. MODALS, SHEETS & GLOVO ORGANIC WAVE */}
                        <section className="flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                                        6. Modals, Sheets &amp; Locked Mobile Wave
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Strict compliance with{' '}
                                        <code className="rounded bg-muted px-1.5 py-0.5">
                                            .ai/rules/ui-kit.md
                                        </code>{' '}
                                        signature organic asymmetrical wave
                                    </p>
                                </div>
                            </div>

                            <Card className="p-6">
                                <div className="flex flex-wrap items-center gap-4">
                                    {/* 1. Signature Wave Bottom Sheet Trigger */}
                                    <Button
                                        variant="default"
                                        size="touch"
                                        onClick={() => setIsGlovoWaveOpen(true)}
                                    >
                                        <Smartphone className="mr-2 size-4" />
                                        Launch Glovo Wave Bottom Sheet
                                    </Button>

                                    {/* 2. Desktop Centered Dialog Trigger */}
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="touch">
                                                <Laptop className="mr-2 size-4" />
                                                Launch Desktop Dialog
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Standard Centered Dialog</DialogTitle>
                                                <DialogDescription>
                                                    Uses Emil Kowalski non-zero entrance: starts
                                                    from scale(0.95) with fade for natural physical
                                                    depth.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-2 text-sm text-muted-foreground">
                                                Desktop dialog maintains centered viewport anchoring
                                                while respecting keyboard ESC dismissal.
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="outline">Dismiss</Button>
                                                </DialogClose>
                                                <Button variant="default">Acknowledge</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    {/* 3. Slide-over Sheet Trigger */}
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="secondary" size="touch">
                                                <Layers className="mr-2 size-4" />
                                                Launch Slide-over Sheet
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent side="right">
                                            <SheetHeader>
                                                <SheetTitle>Slide-over Sheet</SheetTitle>
                                                <SheetDescription>
                                                    Asymmetric duration: fast snappy exit (200ms)
                                                    and responsive entrance (300ms).
                                                </SheetDescription>
                                            </SheetHeader>
                                            <div className="py-6 text-sm text-muted-foreground">
                                                Slide-over sheets are reserved for side drawer
                                                contexts, inspector panels, and cart inspection.
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                </div>
                            </Card>
                        </section>

                        {/* 7. WORK CONTRACT SHAPES & DEAL CHAIN VISUAL SYSTEM */}
                        <section className="flex flex-col gap-6">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                                        7. Work Contract Shapes &amp; Deal Chain Visual System
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Canonical work archetypes (A1, A3, A4, A9), milestone proof
                                        gates, and Deal Chain visual nodes with big icons and real
                                        listing imagery.
                                    </p>
                                </div>
                                <Badge variant="outline" className="font-mono text-xs">
                                    Spec 22 &amp; 26
                                </Badge>
                            </div>

                            {/* 7A: 4 Canonical Work Shapes */}
                            <div className="flex flex-col gap-3">
                                <div className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">
                                    7A · Canonical Work Archetypes (Shapes A1, A3, A4, A9)
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    {/* Shape A1 */}
                                    <Card className="flex flex-col justify-between p-4 shadow-xs transition-all hover:border-[#0F2F58]">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-emerald-800">
                                                    Shape A1
                                                </span>
                                                <span className="text-[10px] font-bold text-muted-foreground">
                                                    Direct Labor
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700">
                                                    <Wrench className="size-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-foreground">
                                                        Single-Provider Service
                                                    </h3>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Simple trade execution
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                                                Bilateral agreement between citizen and
                                                tradesperson. Progresses from scope agreement to
                                                on-site labor and photographic completion sign-off.
                                            </p>
                                        </div>
                                        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 text-[10.5px] font-semibold text-emerald-900">
                                            Bilateral Escrow · Direct Provider Payment
                                        </div>
                                    </Card>

                                    {/* Shape A3 */}
                                    <Card className="flex flex-col justify-between p-4 shadow-xs transition-all hover:border-[#0F2F58]">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-amber-800">
                                                    Shape A3
                                                </span>
                                                <span className="text-[10px] font-bold text-muted-foreground">
                                                    Service + Parts
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
                                                    <Layers className="size-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-foreground">
                                                        Turnkey Parts &amp; Labor
                                                    </h3>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Hardware + Technician
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                                                Labor bundled with physical materials sourced from a
                                                verified Tagudin hardware depot. Separate parts
                                                commitment gate prior to execution.
                                            </p>
                                        </div>
                                        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/50 p-2.5 text-[10.5px] font-semibold text-amber-900">
                                            Split Milestone · Part Lock + Labor Handoff
                                        </div>
                                    </Card>

                                    {/* Shape A4 */}
                                    <Card className="flex flex-col justify-between p-4 shadow-xs transition-all hover:border-[#0F2F58]">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-sky-800">
                                                    Shape A4
                                                </span>
                                                <span className="text-[10px] font-bold text-muted-foreground">
                                                    Physical Goods
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700">
                                                    <Package className="size-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-foreground">
                                                        Local Products &amp; Food
                                                    </h3>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Stall pickup &amp; delivery
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                                                Tangible items, baked goods, or agricultural
                                                supplies. Covers merchant inventory commit,
                                                motorcycle/tricycle transit, and delivery proof.
                                            </p>
                                        </div>
                                        <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/50 p-2.5 text-[10.5px] font-semibold text-sky-900">
                                            Delivery Proof · Doorstep Handshake Gate
                                        </div>
                                    </Card>

                                    {/* Shape A9 */}
                                    <Card className="flex flex-col justify-between p-4 shadow-xs transition-all hover:border-[#0F2F58]">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-indigo-800">
                                                    Shape A9
                                                </span>
                                                <span className="text-[10px] font-bold text-muted-foreground">
                                                    Multi-Party Relay
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-700">
                                                    <GitMerge className="size-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-foreground">
                                                        Deal Chain Pipeline
                                                    </h3>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Multi-vendor coordination
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                                                Acyclic DAG chaining independent bilateral contracts
                                                across Store, Courier, Labor, and Safety Auditor
                                                with strict legal isolation.
                                            </p>
                                        </div>
                                        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 text-[10.5px] font-semibold text-indigo-900">
                                            Bilateral Isolation · Zero Cross-Default
                                        </div>
                                    </Card>
                                </div>
                            </div>

                            {/* 7B: Milestone Execution & Proof Iconography */}
                            <div className="flex flex-col gap-3">
                                <div className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">
                                    7B · Milestone Execution &amp; Handoff Proof Iconography
                                </div>
                                <Card className="p-6">
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
                                        {/* 1. Intake */}
                                        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-center">
                                            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                                <ClipboardCheck className="size-5" />
                                            </div>
                                            <span className="text-xs font-extrabold text-foreground">
                                                1. Scope
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                Intake agreement
                                            </span>
                                        </div>
                                        {/* 2. Parts */}
                                        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-center">
                                            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                                                <Store className="size-5" />
                                            </div>
                                            <span className="text-xs font-extrabold text-foreground">
                                                2. Sourcing
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                Hardware reserve
                                            </span>
                                        </div>
                                        {/* 3. Transit */}
                                        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-center">
                                            <div className="flex size-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                                                <Truck className="size-5" />
                                            </div>
                                            <span className="text-xs font-extrabold text-foreground">
                                                3. Transit
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                Courier padala
                                            </span>
                                        </div>
                                        {/* 4. Labor */}
                                        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-center">
                                            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                                <Wrench className="size-5" />
                                            </div>
                                            <span className="text-xs font-extrabold text-foreground">
                                                4. Execution
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                On-site delivery
                                            </span>
                                        </div>
                                        {/* 5. Audit */}
                                        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-center">
                                            <div className="flex size-11 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                                                <ShieldCheck className="size-5" />
                                            </div>
                                            <span className="text-xs font-extrabold text-foreground">
                                                5. Quality Gate
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                Safety review
                                            </span>
                                        </div>
                                        {/* 6. Photo Evidence */}
                                        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-center">
                                            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                                                <Camera className="size-5" />
                                            </div>
                                            <span className="text-xs font-extrabold text-foreground">
                                                6. Photo Proof
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                Signed evidence
                                            </span>
                                        </div>
                                        {/* 7. Settlement */}
                                        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-center">
                                            <div className="flex size-11 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700">
                                                <Coins className="size-5" />
                                            </div>
                                            <span className="text-xs font-extrabold text-foreground">
                                                7. Escrow Settle
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                Funds release
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* 7C: Deal Chain Visual Components (Showing Big Icon & Listing Photo Image) */}
                            <div className="flex flex-col gap-3">
                                <div className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">
                                    7C · Deal Chain Visual Node Components (Big Icon &amp; Listing
                                    Photo)
                                </div>
                                <Card className="flex flex-col gap-6 p-6">
                                    <p className="text-xs text-muted-foreground">
                                        Deal chain partner slots combine prominent role glyphs with
                                        real listing photo thumbnails for high-trust municipal
                                        transparency.
                                    </p>

                                    {/* 1. Large Visual Node Cards Grid */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        {/* Slot 1: Store */}
                                        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                                            <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                                                <img
                                                    src="/photos/ac-capacitor.jpg"
                                                    alt="AC Capacitor"
                                                    className="size-full object-cover"
                                                />
                                                <div className="absolute top-2.5 left-2.5 flex size-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
                                                    <Store className="size-5.5" />
                                                </div>
                                                <span className="absolute right-2 bottom-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-white uppercase">
                                                    Store Slot
                                                </span>
                                            </div>
                                            <div className="flex flex-col p-3.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-extrabold text-slate-900">
                                                        Tagudin Hardware Depot
                                                    </span>
                                                    <span className="font-mono text-xs font-extrabold text-[#0F2F58]">
                                                        ₱180.00
                                                    </span>
                                                </div>
                                                <span className="mt-0.5 text-[11px] text-slate-500">
                                                    35uF AC Run Capacitor · Central
                                                </span>
                                                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-semibold text-emerald-700">
                                                    <span>✓ In Stock · Ready in 15m</span>
                                                    <span className="text-slate-400">
                                                        Poblacion
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Slot 2: Courier */}
                                        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                                            <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                                                <img
                                                    src="/photos/courier.jpg"
                                                    alt="Courier Transit"
                                                    className="size-full object-cover"
                                                />
                                                <div className="absolute top-2.5 left-2.5 flex size-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md">
                                                    <Truck className="size-5.5" />
                                                </div>
                                                <span className="absolute right-2 bottom-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-white uppercase">
                                                    Rider Slot
                                                </span>
                                            </div>
                                            <div className="flex flex-col p-3.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-extrabold text-slate-900">
                                                        Danny Express Cargo
                                                    </span>
                                                    <span className="font-mono text-xs font-extrabold text-[#0F2F58]">
                                                        ₱35.00
                                                    </span>
                                                </div>
                                                <span className="mt-0.5 text-[11px] text-slate-500">
                                                    Fast 15-25m · Insulated box
                                                </span>
                                                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-semibold text-sky-700">
                                                    <span>⚡ Point-to-Point Padala</span>
                                                    <span className="text-slate-400">
                                                        Motorcycle
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Slot 3: Labor */}
                                        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                                            <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                                                <img
                                                    src="/photos/ac-clean.jpg"
                                                    alt="Labor Technician"
                                                    className="size-full object-cover"
                                                />
                                                <div className="absolute top-2.5 left-2.5 flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                                                    <Wrench className="size-5.5" />
                                                </div>
                                                <span className="absolute right-2 bottom-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-white uppercase">
                                                    Labor Slot
                                                </span>
                                            </div>
                                            <div className="flex flex-col p-3.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-extrabold text-slate-900">
                                                        Kuya Ben Aircon Services
                                                    </span>
                                                    <span className="font-mono text-xs font-extrabold text-[#0F2F58]">
                                                        ₱450.00
                                                    </span>
                                                </div>
                                                <span className="mt-0.5 text-[11px] text-slate-500">
                                                    Certified HVAC &amp; Refrigeration Tech
                                                </span>
                                                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-semibold text-emerald-700">
                                                    <span>⭐ 4.9 (128 reviews)</span>
                                                    <span className="text-slate-400">Tagudin</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Slot 4: Auditor */}
                                        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                                            <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                                                <img
                                                    src="/photos/req-electrician.jpg"
                                                    alt="Electrical Audit"
                                                    className="size-full object-cover"
                                                />
                                                <div className="absolute top-2.5 left-2.5 flex size-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md">
                                                    <ShieldCheck className="size-5.5" />
                                                </div>
                                                <span className="absolute right-2 bottom-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-white uppercase">
                                                    Audit Slot
                                                </span>
                                            </div>
                                            <div className="flex flex-col p-3.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-extrabold text-slate-900">
                                                        Safety Check (Electrician)
                                                    </span>
                                                    <span className="font-mono text-xs font-extrabold text-[#0F2F58]">
                                                        ₱150.00
                                                    </span>
                                                </div>
                                                <span className="mt-0.5 text-[11px] text-slate-500">
                                                    Thermal load &amp; circuit verification
                                                </span>
                                                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-semibold text-purple-700">
                                                    <span>🛡️ Municipal Safety Gate</span>
                                                    <span className="text-slate-400">
                                                        Master Tech
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Connected DAG Pipeline Visualizer */}
                                    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-[#F8FAFD] p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                                Connected Multi-Vendor Deal Chain DAG (Live Relay)
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="border-emerald-200 bg-emerald-50 font-bold text-emerald-700"
                                            >
                                                Total Pipeline: ₱665.00 · Zero Commission
                                            </Badge>
                                        </div>

                                        <div className="mt-2 flex [scrollbar-width:none] items-center gap-2 overflow-x-auto p-2">
                                            {/* Node 1: Store */}
                                            <div className="flex min-w-[130px] flex-col items-center rounded-xl border border-slate-200 bg-white p-2.5 text-center shadow-xs">
                                                <div className="relative mb-1.5 size-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                                                    <img
                                                        src="/photos/ac-capacitor.jpg"
                                                        alt="Capacitor"
                                                        className="size-full object-cover"
                                                    />
                                                    <div className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-md bg-amber-500 text-white">
                                                        <Store className="size-3" />
                                                    </div>
                                                </div>
                                                <span className="w-full truncate text-[11px] font-extrabold text-slate-900">
                                                    Hardware Depot
                                                </span>
                                                <span className="font-mono text-[10px] font-bold text-[#0F2F58]">
                                                    ₱180.00
                                                </span>
                                            </div>

                                            {/* Wire 1 */}
                                            <div className="flex flex-col items-center px-1">
                                                <svg
                                                    className="h-4 w-8 text-[#0F2F58]"
                                                    viewBox="0 0 32 12"
                                                >
                                                    <line
                                                        x1="0"
                                                        y1="6"
                                                        x2="32"
                                                        y2="6"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeDasharray="4 4"
                                                    />
                                                </svg>
                                                <span className="text-[8px] font-extrabold text-emerald-700 uppercase">
                                                    Transit
                                                </span>
                                            </div>

                                            {/* Node 2: Courier */}
                                            <div className="flex min-w-[130px] flex-col items-center rounded-xl border border-slate-200 bg-white p-2.5 text-center shadow-xs">
                                                <div className="relative mb-1.5 size-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                                                    <img
                                                        src="/photos/courier.jpg"
                                                        alt="Courier"
                                                        className="size-full object-cover"
                                                    />
                                                    <div className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-md bg-sky-500 text-white">
                                                        <Truck className="size-3" />
                                                    </div>
                                                </div>
                                                <span className="w-full truncate text-[11px] font-extrabold text-slate-900">
                                                    Danny Express
                                                </span>
                                                <span className="font-mono text-[10px] font-bold text-[#0F2F58]">
                                                    ₱35.00
                                                </span>
                                            </div>

                                            {/* Wire 2 */}
                                            <div className="flex flex-col items-center px-1">
                                                <svg
                                                    className="h-4 w-8 text-[#0F2F58]"
                                                    viewBox="0 0 32 12"
                                                >
                                                    <line
                                                        x1="0"
                                                        y1="6"
                                                        x2="32"
                                                        y2="6"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeDasharray="4 4"
                                                    />
                                                </svg>
                                                <span className="text-[8px] font-extrabold text-emerald-700 uppercase">
                                                    On-Site
                                                </span>
                                            </div>

                                            {/* Node 3: Labor */}
                                            <div className="flex min-w-[130px] flex-col items-center rounded-xl border border-slate-200 bg-white p-2.5 text-center shadow-xs">
                                                <div className="relative mb-1.5 size-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                                                    <img
                                                        src="/photos/ac-clean.jpg"
                                                        alt="Labor"
                                                        className="size-full object-cover"
                                                    />
                                                    <div className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-md bg-emerald-600 text-white">
                                                        <Wrench className="size-3" />
                                                    </div>
                                                </div>
                                                <span className="w-full truncate text-[11px] font-extrabold text-slate-900">
                                                    Kuya Ben
                                                </span>
                                                <span className="font-mono text-[10px] font-bold text-[#0F2F58]">
                                                    ₱450.00
                                                </span>
                                            </div>

                                            {/* Wire 3 */}
                                            <div className="flex flex-col items-center px-1">
                                                <svg
                                                    className="h-4 w-8 text-[#0F2F58]"
                                                    viewBox="0 0 32 12"
                                                >
                                                    <line
                                                        x1="0"
                                                        y1="6"
                                                        x2="32"
                                                        y2="6"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeDasharray="4 4"
                                                    />
                                                </svg>
                                                <span className="text-[8px] font-extrabold text-purple-700 uppercase">
                                                    Certified
                                                </span>
                                            </div>

                                            {/* Node 4: Audit */}
                                            <div className="flex min-w-[130px] flex-col items-center rounded-xl border border-slate-200 bg-white p-2.5 text-center shadow-xs">
                                                <div className="relative mb-1.5 size-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                                                    <img
                                                        src="/photos/req-electrician.jpg"
                                                        alt="Audit"
                                                        className="size-full object-cover"
                                                    />
                                                    <div className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-md bg-purple-600 text-white">
                                                        <ShieldCheck className="size-3" />
                                                    </div>
                                                </div>
                                                <span className="w-full truncate text-[11px] font-extrabold text-slate-900">
                                                    Safety Check
                                                </span>
                                                <span className="font-mono text-[10px] font-bold text-[#0F2F58]">
                                                    ₱150.00
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </section>
                    </div>

                    {/* LIVE GLOVO WAVE MODAL DEMO */}
                    <GlovoWaveModal
                        open={isGlovoWaveOpen}
                        onClose={() => setIsGlovoWaveOpen(false)}
                        title="Book Aircon Disinfection & Chemical Wash"
                        subtitle="Kuya Ben Aircon Hub · 4.9 ★ (128 completed jobs)"
                        bottomSlot={
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setIsGlovoWaveOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="warm"
                                    className="flex-1 font-bold"
                                    onClick={() => {
                                        setIsGlovoWaveOpen(false);
                                        alert(
                                            'Booking confirmed with signature Glovo bottom sheet!',
                                        );
                                    }}
                                >
                                    Confirm ₱450.00
                                </Button>
                            </div>
                        }
                    >
                        <div className="flex flex-col gap-3 py-2">
                            <Notice tone="success" title="Escrow Guarantee Active">
                                Your payment is held safely until you verify work completion delta.
                            </Notice>

                            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-900">
                                        Standard Chemical Wash
                                    </span>
                                    <span className="text-xs font-extrabold text-primary">
                                        ₱450.00
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Coil chemical foaming, high-pressure rinse, drain hose clearing.
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-900">
                                        Antibacterial Fogging Add-on
                                    </span>
                                    <span className="text-xs font-extrabold text-gray-700">
                                        +₱150.00
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Hospital-grade non-toxic disinfectant misting for blower wheel.
                                </p>
                            </div>
                        </div>
                    </GlovoWaveModal>
                </main>
            )}

            {/* ========================================================================= */}
            {/* VIEW B: ORIGINAL SERVICE CREATOR & PIPELINE WIZARD PROTOTYPE             */}
            {/* ========================================================================= */}
            {topMode === 'wizard' && (
                <>
                    {/* Mobile-Only Top Navigation (Hidden on Desktop) */}
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
                                <div className="text-xs font-extrabold text-primary">
                                    Step {currentStep} of 3
                                </div>
                                <div className="text-[10px] text-slate-500">Service Creator</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[9.5px] font-bold text-amber-800">
                                Draft · v1
                            </span>
                            <button
                                type="button"
                                onClick={() => alert('Draft saved')}
                                className="text-xs font-bold text-primary"
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
                        {/* Desktop Stepper Bar */}
                        <DesktopStepProgress
                            steps={wizardSteps}
                            currentStep={currentStep}
                            onStepClick={handleStepNav}
                        />

                        {/* Responsive Dual-Column Grid */}
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                            {/* LEFT COLUMN: The Form Wizard Card */}
                            <div className="flex flex-col gap-6 lg:col-span-7">
                                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                                    {/* STEP 1: Scope & Work Pipeline */}
                                    {currentStep === 1 && (
                                        <div className="flex flex-col gap-5">
                                            <div className="border-b border-slate-100 pb-4">
                                                <h2 className="text-base font-extrabold text-primary sm:text-lg">
                                                    Step 1 · Scope &amp; Work Pipeline
                                                </h2>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    Define base deliverables, category coverage, and
                                                    operational milestone stages
                                                </p>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                                                    Service Title
                                                </label>
                                                <input
                                                    type="text"
                                                    defaultValue="Inverter Split-Type AC Cleaning &amp; Delta Test"
                                                    className="mt-1.5 flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                                                />
                                            </div>

                                            {/* Milestone Stages List */}
                                            <div className="flex flex-col gap-2.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                                                        Milestone Stages ({stages.length})
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddStage}
                                                        className="cursor-pointer text-xs font-extrabold text-primary hover:underline"
                                                    >
                                                        + Add Stage
                                                    </button>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    {stages.map((stage, idx) => (
                                                        <EditableStageRow
                                                            key={stage.id}
                                                            stage={stage}
                                                            index={idx}
                                                            onChange={(
                                                                index: number,
                                                                updated: Partial<WorkStage>,
                                                            ) => handleStageChange(index, updated)}
                                                            onRemove={(index: number) =>
                                                                handleStageRemove(index)
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 2: Rates & Add-ons */}
                                    {currentStep === 2 && (
                                        <div className="flex flex-col gap-5">
                                            <div className="border-b border-slate-100 pb-4">
                                                <h2 className="text-base font-extrabold text-primary sm:text-lg">
                                                    Step 2 · Rates &amp; Payment Rails
                                                </h2>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    Configure base labor pricing and authorized
                                                    payment settlement channels
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div>
                                                    <label className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                                                        Standard Service Rate (₱)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        defaultValue={450}
                                                        className="mt-1.5 flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                                                        Settlement Rail
                                                    </label>
                                                    <select
                                                        defaultValue="escrow"
                                                        className="mt-1.5 flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                                                    >
                                                        <option value="escrow">
                                                            Serbizyu Verified Escrow
                                                        </option>
                                                        <option value="cash">
                                                            Direct Cash Upon Completion
                                                        </option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 3: Partnered Extensions */}
                                    {currentStep === 3 && (
                                        <div className="flex flex-col gap-5">
                                            <div className="border-b border-slate-100 pb-4">
                                                <h2 className="text-base font-extrabold text-primary sm:text-lg">
                                                    Step 3 · Partnered Extensions (Deal Chain)
                                                </h2>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    Link external hardware stores, motorcycle
                                                    runners, or QA safety auditors
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                <span className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                                                    Active Chains ({combinations.length})
                                                </span>
                                                <DealChainCarousel
                                                    combinations={combinations}
                                                    activeIndex={activeComboIndex}
                                                    onIndexChange={(idx: number) =>
                                                        setActiveComboIndex(idx)
                                                    }
                                                    onSlotChangeClick={(
                                                        comboId: string,
                                                        slotType: SlotType,
                                                    ) => handleSlotClick(comboId, slotType)}
                                                    onToggleDefault={handleToggleDefault}
                                                    onRemoveCombo={handleRemoveCombo}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Desktop Step Nav Actions */}
                                    <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                                        <button
                                            type="button"
                                            disabled={currentStep === 1}
                                            onClick={() => handleStepNav(currentStep - 1)}
                                            className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                        >
                                            ← Back
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (currentStep >= 3) {
                                                    alert(
                                                        'Listing successfully published to Serbizyu marketplace!',
                                                    );
                                                } else {
                                                    handleStepNav(currentStep + 1);
                                                }
                                            }}
                                            className="cursor-pointer rounded-xl bg-primary px-6 py-2.5 text-xs font-extrabold text-white shadow-md transition-all hover:bg-primary/90 active:scale-95"
                                        >
                                            {currentStep === 3
                                                ? 'Publish Listing ✓'
                                                : 'Continue to Next Step →'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Real-time Live Artifact Canvas */}
                            <div className="flex flex-col gap-5 lg:col-span-5">
                                <div className="sticky top-20 flex flex-col gap-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-extrabold tracking-wider text-slate-500 uppercase">
                                            Real-Time Pipeline Canvas
                                        </h3>
                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                            Interactive Preview
                                        </span>
                                    </div>

                                    <WorkPipelineCanvas
                                        flowType={flowType}
                                        stages={stages}
                                        onStageClick={(stage: WorkStage) => {
                                            alert(
                                                `Inspecting Stage ${stage.num}: ${stage.title}\nEvidence: ${stage.evidence}`,
                                            );
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* Mobile Floating Bottom Bar */}
                    <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-md lg:hidden">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-center gap-1.5">
                                {[1, 2, 3].map((stepId) => (
                                    <span
                                        key={stepId}
                                        onClick={() => handleStepNav(stepId)}
                                        className={`h-1.5 cursor-pointer rounded-full transition-all ${
                                            stepId === currentStep
                                                ? 'w-6 bg-primary'
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
                                className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white shadow-md active:bg-primary/90"
                            >
                                {currentStep === 3
                                    ? 'Publish Listing ✓'
                                    : `Continue to Step ${currentStep + 1} →`}
                            </button>
                        </div>
                    </div>
                </>
            )}
            {/* ========================================================================= */}
            {/* VIEW C: WORKFLOWS & CANONICAL WORK NODE SYSTEM                            */}
            {/* ========================================================================= */}
            {topMode === 'workflows' && <WorkflowsPrototypeShowcase />}
        </div>
    );
}
