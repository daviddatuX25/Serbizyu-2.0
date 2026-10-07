import { useState } from 'react';
import {
    Camera,
    Check,
    Gauge,
    GitBranch,
    ImageIcon,
    MapPin,
    ShieldAlert,
    Sliders,
    Truck,
    UserCheck,
    Wrench,
} from 'lucide-react';
import CanonicalWorkNode, {
    type WorkNodeClearance,
    type WorkNodeMediaVariant,
    type WorkNodeRole,
    type WorkProofType,
} from './CanonicalWorkNode';

/* ── Wire Connectors ── */
function Wire({ width = 24 }: { width?: number }) {
    return (
        <div className="flex shrink-0 items-center justify-center" style={{ width }}>
            <svg width={width} height="12" viewBox={`0 0 ${width} 12`} fill="none">
                <line
                    x1="0"
                    y1="6"
                    x2={width}
                    y2="6"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                />
            </svg>
        </div>
    );
}

function ForkWire() {
    return (
        <div className="flex h-[160px] w-8 shrink-0 items-center justify-center">
            <svg width="32" height="160" viewBox="0 0 32 160" fill="none">
                <path
                    d="M0 80 H10 C18 80 18 35 32 35"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    fill="none"
                />
                <path
                    d="M0 80 H10 C18 80 18 125 32 125"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    fill="none"
                />
            </svg>
        </div>
    );
}

function JoinWire() {
    return (
        <div className="flex h-[160px] w-8 shrink-0 items-center justify-center">
            <svg width="32" height="160" viewBox="0 0 32 160" fill="none">
                <path
                    d="M0 35 C14 35 14 80 22 80 H32"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    fill="none"
                />
                <path
                    d="M0 125 C14 125 14 80 22 80 H32"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    fill="none"
                />
            </svg>
        </div>
    );
}

const REAL_PHOTOS = [
    { label: 'Chemical Clean (AC)', url: '/photos/ac-clean.jpg' },
    { label: 'Capacitor Parts', url: '/photos/ac-capacitor.jpg' },
    { label: 'Courier Express', url: '/photos/courier.jpg' },
    { label: 'Electrical Audit', url: '/photos/req-electrician.jpg' },
    { label: 'Bibingka Cuisine', url: '/photos/bibingka.jpg' },
    { label: 'Graphic Greeting', url: '/photos/greeting.jpg' },
];

export default function WorkflowsPrototypeShowcase() {
    // Flow Type Tab
    const [selectedFlow, setSelectedFlow] = useState<
        'linear' | 'parallel' | 'decision' | 'dealchain'
    >('linear');

    // Card Media Presentation Style: Full-Bleed (Glovo) by default!
    const [cardMediaStyle, setCardMediaStyle] = useState<WorkNodeMediaVariant>('full-bleed');

    // Active Node for Live Customization
    const [selectedNodeId, setSelectedNodeId] = useState<string>('node-linear-2');

    // Live Customizer Form State
    const [customTitle, setCustomTitle] = useState('Deep Chemical Wash & Foam');
    const [customDur, setCustomDur] = useState('45m');
    const [customClearance, setCustomClearance] = useState<WorkNodeClearance>('worker_direct');
    const [customProofs, setCustomProofs] = useState<WorkProofType[]>([
        'photo_proof',
        'metric_reading',
    ]);
    const [customRole, setCustomRole] = useState<WorkNodeRole>('labor');
    const [customPhotoUrl, setCustomPhotoUrl] = useState<string>('/photos/ac-clean.jpg');

    // Simulator Perspective
    const [simulatorPerspective, setSimulatorPerspective] = useState<'worker' | 'customer'>(
        'worker',
    );

    const toggleProof = (proof: WorkProofType) => {
        setCustomProofs((prev) =>
            prev.includes(proof) ? prev.filter((p) => p !== proof) : [...prev, proof],
        );
    };

    return (
        <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:py-10">
            {/* 1. Header & Philosophy */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-[#0F2F58] text-white shadow-xs">
                            <GitBranch className="size-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                                Serbizyu Flow Architecture
                            </span>
                            <h2 className="text-xl font-black text-[#0F2F58] sm:text-2xl">
                                Canonical Work Node &amp; Rich Imagery Prototype
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-xs font-bold text-emerald-800">
                            Glovo-Grade Visuals
                        </span>
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-mono text-xs font-bold text-blue-800">
                            Uncompressed Imagery
                        </span>
                    </div>
                </div>

                <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
                    Photos are no longer compressed into tiny 16px icon chips. Cards now feature
                    real uncompressed imagery: either as a{' '}
                    <strong className="text-slate-900">Full-Bleed Photo Background</strong> (like
                    Glovo category cards) with dark gradient scrim and frosted glass badges, or as a{' '}
                    <strong className="text-slate-900">Top Photo Banner</strong> (like Serbizyu
                    ListingCard).
                </p>
            </div>

            {/* 2. Side-by-Side Interface Audit: Before vs After with Real Images */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                            Visual Evolution Audit
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900">
                            Before (Cramped plain box) vs After (Glovo &amp; ListingCard Visuals)
                        </h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                        Real Job Photos · Zero Clumping
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Before: Old Cramped 74px Plain Node */}
                    <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-rose-200 bg-rose-50/30 p-4">
                        <div className="space-y-1">
                            <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800">
                                BEFORE: Cramped 74px Text Box
                            </span>
                            <p className="text-[11px] text-rose-900">
                                Walang picture, 7.5px font, laging putol ang text.
                            </p>
                        </div>

                        <div className="flex items-center justify-center p-3">
                            <div className="flex min-w-[82px] flex-col gap-0.5 rounded-lg border border-slate-300 bg-white p-1.5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="rounded bg-emerald-50 px-1 text-[7.5px] font-extrabold text-emerald-700">
                                        1
                                    </span>
                                    <span className="font-mono text-[8px] text-slate-400">15m</span>
                                </div>
                                <span className="truncate text-[9.5px] font-extrabold text-[#0F2F58]">
                                    Chemical F...
                                </span>
                            </div>
                        </div>

                        <ul className="list-inside list-disc space-y-1 text-xs text-rose-800">
                            <li>Zero imagery (boring corporate look)</li>
                            <li>Font size is microscopic (7.5px - 9.5px)</li>
                        </ul>
                    </div>

                    {/* After Style 1: Full-Bleed Photo Background (Glovo Category Hero) */}
                    <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-emerald-300 bg-emerald-50/30 p-4">
                        <div className="space-y-1">
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                AFTER A: Full-Bleed Photo Background
                            </span>
                            <p className="text-[11px] text-emerald-900">
                                Photo covers the whole card with dark gradient and glass badges.
                            </p>
                        </div>

                        <div className="flex items-center justify-center py-2">
                            <CanonicalWorkNode
                                id="demo-full-bleed"
                                ordinal="02"
                                title="Deep Chemical Foam Flush"
                                dur="45m"
                                photoUrl="/photos/ac-clean.jpg"
                                mediaVariant="full-bleed"
                                requiredProofs={['photo_proof', 'metric_reading']}
                                isSelected={true}
                            />
                        </div>

                        <ul className="list-inside list-disc space-y-1 text-xs text-emerald-950">
                            <li>Glovo-style full-bleed image with gradient scrim</li>
                            <li>Crisp white text and frosted glass badges</li>
                        </ul>
                    </div>

                    {/* After Style 2: Top Photo Banner (ListingCard Style) */}
                    <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-sky-300 bg-sky-50/30 p-4">
                        <div className="space-y-1">
                            <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-extrabold text-sky-800">
                                AFTER B: Top Photo Banner
                            </span>
                            <p className="text-[11px] text-sky-900">
                                Top 50% cover photo, bottom 50% clean metadata.
                            </p>
                        </div>

                        <div className="flex items-center justify-center py-2">
                            <CanonicalWorkNode
                                id="demo-card-banner"
                                ordinal="01"
                                title="Site Check-In & Safety QA"
                                dur="15m"
                                photoUrl="/photos/req-electrician.jpg"
                                mediaVariant="card-banner"
                                requiredProofs={['gps_checkin', 'photo_proof']}
                            />
                        </div>

                        <ul className="list-inside list-disc space-y-1 text-xs text-sky-950">
                            <li>Matches Serbizyu ListingCard anatomy</li>
                            <li>Clear division of visual cover and details</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* 3. Interactive Flow Canvas with Card Style Switcher */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-4">
                    {/* Top Row: Flow Selector */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                                System Workflows
                            </span>
                            <h3 className="text-base font-extrabold text-slate-900">
                                Interactive Pipeline with Real Photos
                            </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
                            <button
                                type="button"
                                onClick={() => setSelectedFlow('linear')}
                                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                                    selectedFlow === 'linear'
                                        ? 'bg-[#0F2F58] text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                1. Linear Flow
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedFlow('parallel')}
                                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                                    selectedFlow === 'parallel'
                                        ? 'bg-[#0F2F58] text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                2. Parallel Flow
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedFlow('decision')}
                                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                                    selectedFlow === 'decision'
                                        ? 'bg-[#0F2F58] text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                3. Decision Gate
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedFlow('dealchain')}
                                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                                    selectedFlow === 'dealchain'
                                        ? 'bg-[#0D715F] text-white shadow-2xs'
                                        : 'text-emerald-800 hover:text-emerald-950'
                                }`}
                            >
                                4. Deal Chain Relay
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row: Card Visual Style Switcher */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-[#FAFCFB] p-2.5">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="size-4 text-[#0F2F58]" />
                            <span className="text-xs font-extrabold text-slate-800">
                                Card Presentation Style:
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            {[
                                {
                                    id: 'full-bleed',
                                    label: '🖼️ Full-Bleed Photo (Glovo Style)',
                                },
                                {
                                    id: 'card-banner',
                                    label: '🎴 Top Photo Banner (ListingCard)',
                                },
                                {
                                    id: 'split-media',
                                    label: '📱 Split Thumbnail (Marketplace)',
                                },
                                {
                                    id: 'compact-clean',
                                    label: '⚡ Wire Compact Strip',
                                },
                            ].map((style) => (
                                <button
                                    key={style.id}
                                    type="button"
                                    onClick={() =>
                                        setCardMediaStyle(style.id as WorkNodeMediaVariant)
                                    }
                                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                        cardMediaStyle === style.id
                                            ? 'bg-[#0F2F58] text-white shadow-xs'
                                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    {style.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Canvas Container */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-[#F8FAFC] p-6 shadow-inner">
                    {/* FLOW 1: LINEAR */}
                    {selectedFlow === 'linear' && (
                        <div className="flex min-w-[850px] items-center gap-3">
                            <CanonicalWorkNode
                                id="node-linear-1"
                                ordinal="01"
                                title="Site Check-In & Safety Prep"
                                dur="10m"
                                photoUrl="/photos/req-electrician.jpg"
                                mediaVariant={cardMediaStyle}
                                requiredProofs={['gps_checkin']}
                                isSelected={selectedNodeId === 'node-linear-1'}
                                onClick={() => {
                                    setSelectedNodeId('node-linear-1');
                                    setCustomTitle('Site Check-In & Safety Prep');
                                    setCustomDur('10m');
                                    setCustomPhotoUrl('/photos/req-electrician.jpg');
                                    setCustomProofs(['gps_checkin']);
                                    setCustomClearance('worker_direct');
                                }}
                            />
                            <Wire />
                            <CanonicalWorkNode
                                id="node-linear-2"
                                ordinal="02"
                                title="Chemical Foam Application"
                                dur="30m"
                                photoUrl="/photos/ac-clean.jpg"
                                mediaVariant={cardMediaStyle}
                                requiredProofs={['photo_proof']}
                                isSelected={selectedNodeId === 'node-linear-2'}
                                onClick={() => {
                                    setSelectedNodeId('node-linear-2');
                                    setCustomTitle('Chemical Foam Application');
                                    setCustomDur('30m');
                                    setCustomPhotoUrl('/photos/ac-clean.jpg');
                                    setCustomProofs(['photo_proof']);
                                    setCustomClearance('worker_direct');
                                }}
                            />
                            <Wire />
                            <CanonicalWorkNode
                                id="node-linear-3"
                                ordinal="03"
                                title="Delta Temp Cold Air Test"
                                dur="15m"
                                photoUrl="/photos/ac-clean.jpg"
                                mediaVariant={cardMediaStyle}
                                requiredProofs={['metric_reading']}
                                isSelected={selectedNodeId === 'node-linear-3'}
                                onClick={() => {
                                    setSelectedNodeId('node-linear-3');
                                    setCustomTitle('Delta Temp Cold Air Test');
                                    setCustomDur('15m');
                                    setCustomPhotoUrl('/photos/ac-clean.jpg');
                                    setCustomProofs(['metric_reading']);
                                    setCustomClearance('worker_direct');
                                }}
                            />
                            <Wire />
                            <CanonicalWorkNode
                                id="node-linear-4"
                                ordinal="04"
                                title="Customer Acceptance Sign-Off"
                                dur="5m"
                                photoUrl="/photos/greeting.jpg"
                                mediaVariant={cardMediaStyle}
                                gateType="signoff"
                                clearanceMode="customer_approval"
                                requiredProofs={['customer_otp']}
                                isSelected={selectedNodeId === 'node-linear-4'}
                                onClick={() => {
                                    setSelectedNodeId('node-linear-4');
                                    setCustomTitle('Customer Acceptance Sign-Off');
                                    setCustomDur('5m');
                                    setCustomPhotoUrl('/photos/greeting.jpg');
                                    setCustomProofs(['customer_otp']);
                                    setCustomClearance('customer_approval');
                                }}
                            />
                        </div>
                    )}

                    {/* FLOW 2: PARALLEL */}
                    {selectedFlow === 'parallel' && (
                        <div className="flex min-w-[880px] items-center gap-3">
                            <CanonicalWorkNode
                                id="node-par-1"
                                ordinal="01"
                                title="Unit Isolation & Circuit Off"
                                dur="10m"
                                photoUrl="/photos/req-electrician.jpg"
                                mediaVariant={cardMediaStyle}
                                requiredProofs={['photo_proof']}
                                isSelected={selectedNodeId === 'node-par-1'}
                                onClick={() => {
                                    setSelectedNodeId('node-par-1');
                                    setCustomTitle('Unit Isolation & Circuit Off');
                                    setCustomDur('10m');
                                    setCustomPhotoUrl('/photos/req-electrician.jpg');
                                }}
                            />
                            <ForkWire />
                            <div className="flex flex-col gap-3">
                                <CanonicalWorkNode
                                    id="node-par-2a"
                                    ordinal="2A"
                                    title="Indoor Evaporator Deep Clean"
                                    dur="35m"
                                    photoUrl="/photos/ac-clean.jpg"
                                    mediaVariant={cardMediaStyle}
                                    requiredProofs={['photo_proof']}
                                    isSelected={selectedNodeId === 'node-par-2a'}
                                    onClick={() => {
                                        setSelectedNodeId('node-par-2a');
                                        setCustomTitle('Indoor Evaporator Deep Clean');
                                        setCustomDur('35m');
                                        setCustomPhotoUrl('/photos/ac-clean.jpg');
                                    }}
                                />
                                <CanonicalWorkNode
                                    id="node-par-2b"
                                    ordinal="2B"
                                    title="Outdoor Condenser Overhaul"
                                    dur="35m"
                                    photoUrl="/photos/ac-clean.jpg"
                                    mediaVariant={cardMediaStyle}
                                    requiredProofs={['photo_proof']}
                                    isSelected={selectedNodeId === 'node-par-2b'}
                                    onClick={() => {
                                        setSelectedNodeId('node-par-2b');
                                        setCustomTitle('Outdoor Condenser Overhaul');
                                        setCustomDur('35m');
                                        setCustomPhotoUrl('/photos/ac-clean.jpg');
                                    }}
                                />
                            </div>
                            <JoinWire />
                            <CanonicalWorkNode
                                id="node-par-3"
                                ordinal="03"
                                title="Dual Recommissioning Test"
                                dur="15m"
                                photoUrl="/photos/req-electrician.jpg"
                                mediaVariant={cardMediaStyle}
                                requiredProofs={['metric_reading', 'photo_proof']}
                                isSelected={selectedNodeId === 'node-par-3'}
                                onClick={() => {
                                    setSelectedNodeId('node-par-3');
                                    setCustomTitle('Dual Recommissioning Test');
                                    setCustomDur('15m');
                                    setCustomPhotoUrl('/photos/req-electrician.jpg');
                                }}
                            />
                        </div>
                    )}

                    {/* FLOW 3: DECISION GATE */}
                    {selectedFlow === 'decision' && (
                        <div className="flex min-w-[920px] items-center gap-3">
                            <CanonicalWorkNode
                                id="node-dec-1"
                                ordinal="01"
                                title="Refrigerant Pressure Gauge"
                                dur="15m"
                                photoUrl="/photos/ac-clean.jpg"
                                mediaVariant={cardMediaStyle}
                                requiredProofs={['metric_reading']}
                                isSelected={selectedNodeId === 'node-dec-1'}
                                onClick={() => {
                                    setSelectedNodeId('node-dec-1');
                                    setCustomTitle('Refrigerant Pressure Gauge');
                                    setCustomDur('15m');
                                    setCustomPhotoUrl('/photos/ac-clean.jpg');
                                }}
                            />
                            <Wire />
                            <CanonicalWorkNode
                                id="node-dec-gate"
                                ordinal="?"
                                title="Freon Leak Detected?"
                                dur="Gate"
                                photoUrl="/photos/req-electrician.jpg"
                                mediaVariant={cardMediaStyle}
                                gateType="decision"
                                clearanceMode="customer_approval"
                                isSelected={selectedNodeId === 'node-dec-gate'}
                                onClick={() => {
                                    setSelectedNodeId('node-dec-gate');
                                    setCustomTitle('Freon Leak Detected?');
                                    setCustomDur('Gate');
                                    setCustomPhotoUrl('/photos/req-electrician.jpg');
                                }}
                            />
                            <ForkWire />
                            <div className="flex flex-col gap-3">
                                <CanonicalWorkNode
                                    id="node-dec-branch-a"
                                    ordinal="YES"
                                    title="Braze Copper & Full Recharge"
                                    dur="45m"
                                    photoUrl="/photos/ac-capacitor.jpg"
                                    mediaVariant={cardMediaStyle}
                                    requiredProofs={['photo_proof', 'metric_reading']}
                                    isSelected={selectedNodeId === 'node-dec-branch-a'}
                                    onClick={() => {
                                        setSelectedNodeId('node-dec-branch-a');
                                        setCustomTitle('Braze Copper & Full Recharge');
                                        setCustomDur('45m');
                                        setCustomPhotoUrl('/photos/ac-capacitor.jpg');
                                    }}
                                />
                                <CanonicalWorkNode
                                    id="node-dec-branch-b"
                                    ordinal="NO"
                                    title="Standard Chemical Wash Only"
                                    dur="20m"
                                    photoUrl="/photos/ac-clean.jpg"
                                    mediaVariant={cardMediaStyle}
                                    requiredProofs={['photo_proof']}
                                    isSelected={selectedNodeId === 'node-dec-branch-b'}
                                    onClick={() => {
                                        setSelectedNodeId('node-dec-branch-b');
                                        setCustomTitle('Standard Chemical Wash Only');
                                        setCustomDur('20m');
                                        setCustomPhotoUrl('/photos/ac-clean.jpg');
                                    }}
                                />
                            </div>
                            <JoinWire />
                            <CanonicalWorkNode
                                id="node-dec-4"
                                ordinal="03"
                                title="Final Delta Cooling Sign-Off"
                                dur="10m"
                                photoUrl="/photos/greeting.jpg"
                                mediaVariant={cardMediaStyle}
                                gateType="signoff"
                                clearanceMode="customer_approval"
                                requiredProofs={['customer_otp']}
                                isSelected={selectedNodeId === 'node-dec-4'}
                                onClick={() => {
                                    setSelectedNodeId('node-dec-4');
                                    setCustomTitle('Final Delta Cooling Sign-Off');
                                    setCustomDur('10m');
                                    setCustomPhotoUrl('/photos/greeting.jpg');
                                }}
                            />
                        </div>
                    )}

                    {/* FLOW 4: DEAL CHAIN MULTI-PARTY RELAY */}
                    {selectedFlow === 'dealchain' && (
                        <div className="flex min-w-[920px] items-center gap-3">
                            <CanonicalWorkNode
                                id="node-dc-1"
                                role="store"
                                title="Tagudin Hardware Depot"
                                feeMinor={85000}
                                desc="Capacitor & Freon R410A"
                                photoUrl="/photos/ac-capacitor.jpg"
                                mediaVariant={cardMediaStyle}
                                requiredProofs={['photo_proof']}
                                isSelected={selectedNodeId === 'node-dc-1'}
                                onClick={() => {
                                    setSelectedNodeId('node-dc-1');
                                    setCustomTitle('Tagudin Hardware Depot');
                                    setCustomRole('store');
                                    setCustomPhotoUrl('/photos/ac-capacitor.jpg');
                                    setCustomProofs(['photo_proof']);
                                }}
                            />
                            <Wire />
                            <CanonicalWorkNode
                                id="node-dc-2"
                                role="courier"
                                title="Danny Express Moto Relay"
                                feeMinor={15000}
                                desc="Express Transit to Jobsite"
                                photoUrl="/photos/courier.jpg"
                                mediaVariant={cardMediaStyle}
                                requiredProofs={['gps_checkin', 'photo_proof']}
                                isSelected={selectedNodeId === 'node-dc-2'}
                                onClick={() => {
                                    setSelectedNodeId('node-dc-2');
                                    setCustomTitle('Danny Express Moto Relay');
                                    setCustomRole('courier');
                                    setCustomPhotoUrl('/photos/courier.jpg');
                                    setCustomProofs(['gps_checkin', 'photo_proof']);
                                }}
                            />
                            <Wire />
                            <CanonicalWorkNode
                                id="node-dc-3"
                                role="labor"
                                title="Kuya Ben AC Technical Service"
                                feeMinor={120000}
                                desc="Component Replacement & Vacuum"
                                photoUrl="/photos/ac-clean.jpg"
                                mediaVariant={cardMediaStyle}
                                requiredProofs={['photo_proof', 'metric_reading']}
                                isSelected={selectedNodeId === 'node-dc-3'}
                                onClick={() => {
                                    setSelectedNodeId('node-dc-3');
                                    setCustomTitle('Kuya Ben AC Technical Service');
                                    setCustomRole('labor');
                                    setCustomPhotoUrl('/photos/ac-clean.jpg');
                                    setCustomProofs(['photo_proof', 'metric_reading']);
                                }}
                            />
                            <Wire />
                            <CanonicalWorkNode
                                id="node-dc-4"
                                role="audit"
                                title="Tagudin Safety Electrical QA"
                                feeMinor={30000}
                                desc="Independent Voltage Verification"
                                photoUrl="/photos/req-electrician.jpg"
                                mediaVariant={cardMediaStyle}
                                gateType="signoff"
                                clearanceMode="customer_approval"
                                requiredProofs={['customer_otp']}
                                isSelected={selectedNodeId === 'node-dc-4'}
                                onClick={() => {
                                    setSelectedNodeId('node-dc-4');
                                    setCustomTitle('Tagudin Safety Electrical QA');
                                    setCustomRole('audit');
                                    setCustomPhotoUrl('/photos/req-electrician.jpg');
                                    setCustomProofs(['customer_otp']);
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Live Customizer & Inspector */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left 7 Columns: Live Form Controls */}
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <Sliders className="size-4 text-[#0F2F58]" />
                            <h3 className="text-sm font-extrabold text-slate-900">
                                Node Customizer Inspector
                            </h3>
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-500">
                            Editing: #{selectedNodeId}
                        </span>
                    </div>

                    {/* Step Title Input */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Step Title</label>
                        <input
                            type="text"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder="e.g. Deep Chemical Foam Flush"
                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
                        />
                    </div>

                    {/* Photo Selector */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">
                            Cover Image / Job Photo
                        </label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {REAL_PHOTOS.map((p) => {
                                const isActive = customPhotoUrl === p.url;
                                return (
                                    <button
                                        key={p.url}
                                        type="button"
                                        onClick={() => setCustomPhotoUrl(p.url)}
                                        className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all ${
                                            isActive
                                                ? 'border-[#0F2F58] bg-slate-50 ring-1 ring-[#0F2F58]'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <img
                                            src={p.url}
                                            alt={p.label}
                                            className="size-8 shrink-0 rounded-lg object-cover"
                                        />
                                        <span className="truncate text-[11px] font-bold text-slate-800">
                                            {p.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Duration Preset Pills */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Target Duration</label>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {['10m', '15m', '30m', '45m', '60m', '90m'].map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setCustomDur(d)}
                                    className={`rounded-lg border px-3 py-1 text-xs font-bold transition-all ${
                                        customDur === d
                                            ? 'border-[#0F2F58] bg-[#0F2F58] text-white shadow-2xs'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Clearance Authority Selector */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">
                            Clearance Authority (Who Signs Off)
                        </label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {[
                                {
                                    mode: 'worker_direct',
                                    label: 'Worker Direct',
                                    desc: 'Provider taps done upon completion',
                                    icon: Wrench,
                                },
                                {
                                    mode: 'customer_approval',
                                    label: 'Customer Sign-off',
                                    desc: 'Client reviews evidence before next step',
                                    icon: UserCheck,
                                },
                                {
                                    mode: 'physical_handoff',
                                    label: 'Handoff Transfer',
                                    desc: 'Recipient physical OTP or photo drop',
                                    icon: Truck,
                                },
                            ].map((item) => (
                                <button
                                    key={item.mode}
                                    type="button"
                                    onClick={() =>
                                        setCustomClearance(item.mode as WorkNodeClearance)
                                    }
                                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                        customClearance === item.mode
                                            ? 'border-[#0F2F58] bg-slate-50 ring-1 ring-[#0F2F58]'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                        <item.icon className="size-3.5 text-[#0F2F58]" />
                                        <span>{item.label}</span>
                                    </div>
                                    <span className="mt-1 text-[10px] leading-tight text-slate-500">
                                        {item.desc}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Required Proofs Toggle Bar */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">
                            Required Evidence Artifacts
                        </label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {[
                                { type: 'photo_proof', label: 'Photo Proof', icon: Camera },
                                { type: 'gps_checkin', label: 'GPS Pin', icon: MapPin },
                                { type: 'metric_reading', label: 'Metric Unit', icon: Gauge },
                                { type: 'customer_otp', label: 'Customer OTP', icon: ShieldAlert },
                            ].map((item) => {
                                const active = customProofs.includes(item.type as WorkProofType);
                                return (
                                    <button
                                        key={item.type}
                                        type="button"
                                        onClick={() => toggleProof(item.type as WorkProofType)}
                                        className={`flex items-center justify-between rounded-xl border p-2.5 transition-all ${
                                            active
                                                ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-950 shadow-2xs'
                                                : 'border-slate-200 bg-white font-medium text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 text-xs">
                                            <item.icon className="size-3.5" />
                                            <span>{item.label}</span>
                                        </div>
                                        {active && <Check className="size-3 stroke-[3]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right 5 Columns: Real-Time Preview of Customized Node */}
                <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-slate-200 bg-[#FAFCFB] p-6 shadow-xs lg:col-span-5">
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                            <span className="text-xs font-extrabold tracking-wide text-slate-500 uppercase">
                                Live Component Reaction
                            </span>
                            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setSimulatorPerspective('worker')}
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-all ${
                                        simulatorPerspective === 'worker'
                                            ? 'bg-[#0F2F58] text-white shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Worker
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSimulatorPerspective('customer')}
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-all ${
                                        simulatorPerspective === 'customer'
                                            ? 'bg-[#0F2F58] text-white shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Customer
                                </button>
                            </div>
                        </div>

                        <div className="my-6 flex flex-col items-center justify-center gap-4">
                            <CanonicalWorkNode
                                id="live-custom-node"
                                ordinal="02"
                                title={customTitle}
                                dur={customDur}
                                photoUrl={customPhotoUrl}
                                mediaVariant={cardMediaStyle}
                                clearanceMode={customClearance}
                                requiredProofs={customProofs}
                                role={customRole}
                                isSelected={true}
                                size="standard"
                            />
                            <p className="max-w-xs text-center text-xs text-slate-500">
                                {simulatorPerspective === 'worker'
                                    ? 'Worker Perspective: Shows operational execution state and required evidence inputs.'
                                    : 'Customer Perspective: Shows client sign-off gate and verification check.'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-1 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
                        <strong className="font-bold">Standardized Component Contract:</strong>
                        <p className="text-[11px] leading-relaxed">
                            This same component powers Create Service, Create Request, Listing
                            Detail, Orders Execution, and Deal Chains with zero new screens needed.
                        </p>
                    </div>
                </div>
            </div>

            {/* 5. Macro Lifecycle States Showcase (All 5 Runtime States) */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div>
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                        Macro Lifecycle States
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                        The 5 Unified Work Node States in Production Orders
                    </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {/* State 1: Preview / Idle */}
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                        <span className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                            1. Idle Preview
                        </span>
                        <CanonicalWorkNode
                            id="state-idle"
                            ordinal="01"
                            title="Arrival & Initial Check"
                            dur="15m"
                            photoUrl="/photos/req-electrician.jpg"
                            mediaVariant={cardMediaStyle}
                            requiredProofs={['gps_checkin']}
                            status="preview"
                        />
                        <p className="text-[10px] text-slate-500">
                            Unfocused state on public listings and draft builders.
                        </p>
                    </div>

                    {/* State 2: Selected / Focus */}
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                        <span className="text-[10px] font-bold tracking-wide text-[#0F2F58] uppercase">
                            2. Active Focus
                        </span>
                        <CanonicalWorkNode
                            id="state-focused"
                            ordinal="02"
                            title="Deep Chemical Wash"
                            dur="45m"
                            photoUrl="/photos/ac-clean.jpg"
                            mediaVariant={cardMediaStyle}
                            requiredProofs={['photo_proof']}
                            isSelected={true}
                        />
                        <p className="text-[10px] text-slate-500">
                            Currently selected in studio inspector for configuration.
                        </p>
                    </div>

                    {/* State 3: Locked Runtime */}
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                        <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                            3. Locked Runtime
                        </span>
                        <CanonicalWorkNode
                            id="state-locked"
                            ordinal="03"
                            title="Recommissioning Test"
                            dur="20m"
                            photoUrl="/photos/ac-clean.jpg"
                            mediaVariant={cardMediaStyle}
                            requiredProofs={['metric_reading']}
                            status="locked"
                        />
                        <p className="text-[10px] text-slate-500">
                            Waiting for predecessor milestone to complete first.
                        </p>
                    </div>

                    {/* State 4: In Progress / Active */}
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                        <span className="text-[10px] font-bold tracking-wide text-sky-700 uppercase">
                            4. In Progress (Live)
                        </span>
                        <CanonicalWorkNode
                            id="state-progress"
                            ordinal="02"
                            title="Chemical Foam Flush"
                            dur="30m"
                            photoUrl="/photos/ac-clean.jpg"
                            mediaVariant={cardMediaStyle}
                            requiredProofs={['photo_proof']}
                            status="in_progress"
                        />
                        <p className="text-[10px] text-slate-500">
                            Provider active on step with live pulsing indicator.
                        </p>
                    </div>

                    {/* State 5: Completed with Proof */}
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                        <span className="text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
                            5. Completed (Verified)
                        </span>
                        <CanonicalWorkNode
                            id="state-done"
                            ordinal="01"
                            title="Disassembly & Masking"
                            dur="15m"
                            photoUrl="/photos/greeting.jpg"
                            mediaVariant={cardMediaStyle}
                            requiredProofs={['photo_proof']}
                            status="completed"
                        />
                        <p className="text-[10px] text-slate-500">
                            Evidence submitted and verified by customer/gatekeeper.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
