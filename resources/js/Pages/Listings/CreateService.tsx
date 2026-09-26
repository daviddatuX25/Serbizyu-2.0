import React, { useState, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import {
    ArrowLeft,
    ArrowRight,
    Package,
    Wrench,
    Plus,
    Trash2,
    ShieldCheck,
    Sparkles,
    Sliders,
    Check,
    Clock,
    Eye,
    X,
} from 'lucide-react';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';
import { BottomNavBar, type NavTabId } from '../../marketplace/components/BottomNavBar';
import { CreatorPostModal } from '../../components/marketplace/CreatorPostModal';
import { QuickDealScanModal } from '../../components/marketplace/QuickDealScanModal';
import {
    WorkPipelineCanvas,
    WorkNodeCustomizerModal,
    WorkCatalogModal,
    DealChainCarousel,
    type WorkStage,
    type WorkTemplate,
    type DealChainCombination,
    type SlotType,
} from '../../components/mobile';
import { SlotListingPickerModal } from '../../components/marketplace/SlotListingPickerModal';
import type { SlotCandidateListing } from '../../marketplace/types';

interface PackageTierForm {
    id: string;
    title: string;
    price: number;
    sub: string;
    inclusions: string[];
}

interface AddonForm {
    id: string;
    code: string;
    title: string;
    description: string;
    price_amount_minor: number;
    partner_role: 'technician' | 'store' | 'courier' | 'auditor';
    isDefault?: boolean;
}

const TAGUDIN_WORK_TEMPLATES: WorkTemplate[] = [
    {
        id: 'tmpl-a1-inverter',
        category: 'appliance',
        title: 'Standard Inverter Deep Clean & Checkup',
        shape: 'A1 Linear',
        sla: '75m SLA',
        flowType: 'linear',
        description:
            'Standard 4-stage chemical foam wash, blower fan removal, and delta temp drop test.',
        stages: [
            {
                id: 's1',
                num: '1',
                title: 'Intake Triage & Breaker Lockout',
                dur: '15m',
                desc: 'Isolate main breaker, inspect coil status, and customer intake interview.',
                evidence: 'Breaker lock-out photo gate',
                color: '#0D715F',
                bg: '#E8F7F1',
            },
            {
                id: 's2',
                num: '2',
                title: 'Coil Foaming & Pressure Flush',
                dur: '25m',
                desc: 'Apply specialized alkaline chemical foam on evaporator fins and pressure flush drain line.',
                evidence: 'Chemical foam coverage photo gate',
                color: '#0F766E',
                bg: '#CCFBF1',
            },
            {
                id: 's3',
                num: '3',
                title: 'Cold Run & Amperage Test',
                dur: '20m',
                desc: 'Restore power and verify compressor startup, amp draw, and fan cycle.',
                evidence: 'Amperage reading photo gate',
                color: '#B45309',
                bg: '#FEF3C7',
            },
            {
                id: 's4',
                num: '4',
                title: 'Delta Temp Test & OTP Sign-off',
                dur: '15m',
                desc: 'Verify dual-probe temperature drop (ΔT ≥ 12°C) and customer digital sign-off.',
                evidence: 'Temperature delta photo & OTP sign-off',
                color: '#0D715F',
                bg: '#E8F7F1',
            },
        ],
    },
    {
        id: 'tmpl-a3-turnkey',
        category: 'electrical',
        title: 'Turnkey Electrical Diagnostic & Parts Replacement',
        shape: 'A3 Turnkey',
        sla: '90m SLA',
        flowType: 'linear',
        description:
            'Multi-stage diagnostic with hardware part sourcing gate and on-site terminal replacement.',
        stages: [
            {
                id: 't1',
                num: '1',
                title: 'Circuit Fault Triage',
                dur: '20m',
                desc: 'Measure voltage drop and test continuity with multimeter.',
                evidence: 'Multimeter reading photo',
                color: '#0D715F',
                bg: '#E8F7F1',
            },
            {
                id: 't2',
                num: '2',
                title: 'Hardware Part Sourcing Gate',
                dur: '30m',
                desc: 'Verify replacement part stock commitment at Tagudin Hardware Depot.',
                evidence: 'Part serial number photo',
                color: '#B45309',
                bg: '#FEF3C7',
            },
            {
                id: 't3',
                num: '3',
                title: 'Terminal Installation & Load Test',
                dur: '25m',
                desc: 'Crimp lugs, torque terminals, and run 15-minute load test.',
                evidence: 'Installed terminal torque photo',
                color: '#0F766E',
                bg: '#CCFBF1',
            },
            {
                id: 't4',
                num: '4',
                title: 'Safety Audit Sign-Off',
                dur: '15m',
                desc: 'Master electrician sign-off and municipal safety certificate issuance.',
                evidence: 'Safety certificate photo',
                color: '#0D715F',
                bg: '#E8F7F1',
            },
        ],
    },
    {
        id: 'tmpl-a1-plumbing',
        category: 'plumbing',
        title: 'Emergency Pipe Leak & Joint Repair',
        shape: 'A1 Linear',
        sla: '60m SLA',
        flowType: 'linear',
        description: 'Waterline isolation, pressure fitting, and 24-hour leak check guarantee.',
        stages: [
            {
                id: 'p1',
                num: '1',
                title: 'Main Valve Shutoff & Pressure Release',
                dur: '10m',
                desc: 'Isolate municipal water meter and drain line pressure.',
                evidence: 'Shutoff valve photo',
                color: '#0D715F',
                bg: '#E8F7F1',
            },
            {
                id: 'p2',
                num: '2',
                title: 'Pipe Cutting & Solvent Weld Joint',
                dur: '30m',
                desc: 'Cut compromised section and solvent weld replacement PVC fitting.',
                evidence: 'Fitted joint photo',
                color: '#0F766E',
                bg: '#CCFBF1',
            },
            {
                id: 'p3',
                num: '3',
                title: 'Pressure Test & Flow Restoration',
                dur: '20m',
                desc: 'Restore main pressure and verify zero weeping at 40 PSI.',
                evidence: 'Dry joint inspection photo',
                color: '#0D715F',
                bg: '#E8F7F1',
            },
        ],
    },
    {
        id: 'tmpl-a1-cleaning',
        category: 'carpentry',
        title: 'Deep Residential Cleaning & Disinfection',
        shape: 'A1 Linear',
        sla: '120m SLA',
        flowType: 'linear',
        description: 'Room-by-room deep dust removal, tile sanitization, and trash clearing.',
        stages: [
            {
                id: 'c1',
                num: '1',
                title: 'Intake Inspection & Room Triage',
                dur: '15m',
                desc: 'Walkthrough with homeowner to tag priority areas and fragile items.',
                evidence: 'Pre-service condition photo',
                color: '#0D715F',
                bg: '#E8F7F1',
            },
            {
                id: 'c2',
                num: '2',
                title: 'Deep Surface Cleaning & Degreasing',
                dur: '60m',
                desc: 'Floor mopping, window wiping, kitchen counter degreasing, and vacuuming.',
                evidence: 'Degreased surface photo',
                color: '#0F766E',
                bg: '#CCFBF1',
            },
            {
                id: 'c3',
                num: '3',
                title: 'Antimicrobial Spray & Room Turnover',
                dur: '45m',
                desc: 'Final surface sanitization and waste bag disposal.',
                evidence: 'Clean turnover photo',
                color: '#0D715F',
                bg: '#E8F7F1',
            },
        ],
    },
];

export default function CreateService() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [creatorOpen, setCreatorOpen] = useState(false);
    const [quickDealOpen, setQuickDealOpen] = useState(false);

    // Step 1: Trade Identity & Scope
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('repairs');
    const [description, setDescription] = useState('');
    const [inclusions, setInclusions] = useState<string[]>([
        'Evaporator coil chemical foam wash & disinfection',
        'Blower fan wheel disassembly & grease flush',
        'High-pressure drain line unblocking',
    ]);
    const [newInclusion, setNewInclusion] = useState('');

    // Work Pipeline Template & Canvas state
    const [selectedTemplate, setSelectedTemplate] = useState<WorkTemplate>(
        TAGUDIN_WORK_TEMPLATES[0],
    );
    const [stages, setStages] = useState<WorkStage[]>(TAGUDIN_WORK_TEMPLATES[0].stages);
    const [workModalOpen, setWorkModalOpen] = useState(false);
    const [customizerModalOpen, setCustomizerModalOpen] = useState(false);
    const [builderMode, setBuilderMode] = useState<'simple' | 'advanced'>('simple');
    const [previewTab, setPreviewTab] = useState<'card' | 'timeline'>('card');
    const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

    const isCustomizedFromTemplate = useMemo(() => {
        if (stages.length !== selectedTemplate.stages.length) return true;
        return stages.some((s, idx) => {
            const orig = selectedTemplate.stages[idx];
            return !orig || orig.id !== s.id || orig.title !== s.title;
        });
    }, [stages, selectedTemplate]);

    const [pricingMode, setPricingMode] = useState<'fixed' | 'range' | 'packages'>('packages');
    const [fixedPrice, setFixedPrice] = useState('450');
    const [rangeMin, setRangeMin] = useState('350');
    const [rangeMax, setRangeMax] = useState('700');

    const [packageTiers, setPackageTiers] = useState<PackageTierForm[]>([
        {
            id: 'tier-1',
            title: '1 Unit Standard',
            price: 450,
            sub: 'Deep coil & drain clean',
            inclusions: ['Complete inspection & labor', 'Photo sign-off'],
        },
        {
            id: 'tier-2',
            title: '2 Units Dual Split',
            price: 850,
            sub: 'Dual room package · Save ₱50',
            inclusions: ['Two unit full service', 'Outdoor unit check', 'Photo sign-off'],
        },
        {
            id: 'tier-3',
            title: '3 Units Full Home',
            price: 1200,
            sub: 'Whole home cleaning · Save ₱150',
            inclusions: ['Three units full service', 'Priority scheduling', 'Photo sign-off'],
        },
    ]);

    const [addons, setAddons] = useState<AddonForm[]>([
        {
            id: 'addon-1',
            code: 'rush_priority',
            title: 'Fast Clean (Same-Day / Rush Priority)',
            description: 'Priority scheduling request for same-day completion.',
            price_amount_minor: 10000,
            partner_role: 'technician',
            isDefault: false,
        },
        {
            id: 'addon-2',
            code: 'chemical_flush',
            title: 'Anti-Bacterial Chemical Flush',
            description: 'Deep antimicrobial foaming wash & sanitize.',
            price_amount_minor: 15000,
            partner_role: 'technician',
            isDefault: true,
        },
    ]);

    // Step 3: Deal Chain Combinations
    const [combinations, setCombinations] = useState<DealChainCombination[]>([
        {
            id: 'combo-1',
            title: 'All-In Parts, Courier & Labor',
            icon: '🔧',
            isDefault: true,
            nodes: [
                {
                    role: 'STORE',
                    title: '35uF Cap',
                    sub: '₱180',
                    type: 'store',
                    bg: '#FEF3C7',
                    color: '#B45309',
                },
                {
                    role: 'COURIER',
                    title: 'Danny Exp',
                    sub: '₱35',
                    type: 'delivery',
                    bg: '#E0F2FE',
                    color: '#0284C7',
                },
                {
                    role: 'LABOR',
                    title: 'Your Service',
                    sub: '₱450',
                    type: 'labor',
                    bg: '#ECFDF5',
                    color: '#059669',
                },
            ],
            slots: [
                {
                    type: 'store',
                    role: 'Hardware Part Supplier',
                    name: 'Tagudin Hardware Depot',
                    meta: '₱180.00 counter pickup',
                },
                {
                    type: 'delivery',
                    role: 'Doorstep Courier Runner',
                    name: 'Danny Express Motorcycle Pool',
                    meta: '₱35.00 route fee',
                },
            ],
        },
        {
            id: 'combo-2',
            title: 'Doorstep Courier Transit Only',
            icon: '🛵',
            isDefault: false,
            nodes: [
                {
                    role: 'STORE',
                    title: 'Pickup',
                    sub: 'Counter',
                    type: 'store',
                    bg: '#FEF3C7',
                    color: '#B45309',
                },
                {
                    role: 'COURIER',
                    title: 'Danny Exp',
                    sub: '₱35',
                    type: 'delivery',
                    bg: '#E0F2FE',
                    color: '#0284C7',
                },
                {
                    role: 'LABOR',
                    title: 'Your Service',
                    sub: '₱450',
                    type: 'labor',
                    bg: '#ECFDF5',
                    color: '#059669',
                },
            ],
            slots: [
                {
                    type: 'delivery',
                    role: 'Doorstep Courier Runner',
                    name: 'Danny Express Motorcycle Pool',
                    meta: '₱35.00 route fee',
                },
            ],
        },
    ]);

    const [activeComboIndex, setActiveComboIndex] = useState(0);
    const [slotPickerTarget, setSlotPickerTarget] = useState<{
        comboId: string;
        slotType: SlotType;
    } | null>(null);

    // Inclusions
    const addInclusion = () => {
        if (!newInclusion.trim()) return;
        setInclusions((prev) => [...prev, newInclusion.trim()]);
        setNewInclusion('');
    };

    const removeInclusion = (index: number) => {
        setInclusions((prev) => prev.filter((_, i) => i !== index));
    };

    // Template selection
    const handleSelectTemplate = (tmpl: WorkTemplate) => {
        setSelectedTemplate(tmpl);
        setStages(tmpl.stages);
        setWorkModalOpen(false);
    };

    // Package Tier Handlers
    const addTier = () => {
        const count = packageTiers.length + 1;
        setPackageTiers((prev) => [
            ...prev,
            {
                id: `tier-${count}`,
                title: `${count} Units Bundle`,
                price: count * 400,
                sub: `Extended volume tier · Save ₱${count * 50}`,
                inclusions: ['Multi-unit execution', 'Priority scheduling'],
            },
        ]);
    };

    const removeTier = (index: number) => {
        if (packageTiers.length <= 1) return;
        setPackageTiers((prev) => prev.filter((_, i) => i !== index));
    };

    const updateTier = (index: number, field: keyof PackageTierForm, value: unknown) => {
        setPackageTiers((prev) =>
            prev.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier)),
        );
    };

    // Addon Handlers
    const addAddon = () => {
        const count = addons.length + 1;
        setAddons((prev) => [
            ...prev,
            {
                id: `addon-${count}`,
                code: `addon_extra_${count}`,
                title: 'Extended Service Guarantee',
                description: 'Additional verification and follow-up support.',
                price_amount_minor: 8000,
                partner_role: 'technician',
                isDefault: false,
            },
        ]);
    };

    const removeAddon = (index: number) => {
        setAddons((prev) => prev.filter((_, i) => i !== index));
    };

    const updateAddon = (index: number, field: keyof AddonForm, value: unknown) => {
        setAddons((prev) =>
            prev.map((addon, i) => (i === index ? { ...addon, [field]: value } : addon)),
        );
    };

    // Deal Chain Slot Swap Handler
    const handleSwapSlot = (candidate: SlotCandidateListing) => {
        if (!slotPickerTarget) return;
        setCombinations((prev) =>
            prev.map((combo) => {
                if (combo.id !== slotPickerTarget.comboId) return combo;
                return {
                    ...combo,
                    slots: combo.slots.map((s) => {
                        if (s.type !== slotPickerTarget.slotType) return s;
                        return {
                            ...s,
                            name: candidate.provider_name,
                            meta: `₱${(candidate.price_minor / 100).toFixed(2)} · ${candidate.sla_text}`,
                        };
                    }),
                };
            }),
        );
        setSlotPickerTarget(null);
    };

    // Derived effective base price in centavos
    const effectivePriceMinor =
        pricingMode === 'packages'
            ? Math.round((packageTiers[0]?.price || 450) * 100)
            : Math.round(parseFloat(fixedPrice || '450') * 100);

    // Form Submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormErrors({});

        const effectiveDescription =
            description.trim().length >= 10
                ? description.trim()
                : `${title.trim()} — Professional ${category} service in Tagudin, Ilocos Sur. Governed under ${selectedTemplate.title} with photo milestone evidence.`;

        const workShapeCode = selectedTemplate.shape.startsWith('A3')
            ? 'A3'
            : selectedTemplate.shape.startsWith('A9')
              ? 'A9'
              : 'A1';

        const payload: Record<string, FormDataConvertible> = {
            title: title.trim(),
            description: effectiveDescription,
            category_code: category,
            listing_type: 'service',
            work_shape: workShapeCode,
            work_catalog_code: selectedTemplate.id,
            price_amount_minor: effectivePriceMinor,
            pricing_mode: pricingMode,
            inclusions,
            package_tiers: packageTiers.map((tier) => ({
                id: tier.id,
                title: tier.title,
                price: tier.price,
                sub: tier.sub,
                inclusions: tier.inclusions,
            })),
            addons: addons.map((a) => ({
                id: a.id,
                code: a.code,
                title: a.title,
                description: a.description,
                price_amount_minor: a.price_amount_minor,
                currency: 'PHP',
                partner_role: a.partner_role,
                status: 'available',
                settlement_mode: 'independent_provider_agreement',
            })),
            milestone_stages: stages.map((s, idx) => ({
                id: s.id,
                title: s.title,
                description: s.desc,
                step: idx + 1,
                dur: s.dur,
                evidence: s.evidence,
            })),
        };

        router.post('/listings', payload, {
            onError: (errs) => {
                setFormErrors(errs);
                setIsSubmitting(false);
                if (errs.title || errs.category_code || errs.description) {
                    setStep(1);
                } else if (errs.price_amount_minor || errs.pricing_mode) {
                    setStep(2);
                }
            },
        });
    };

    const categoryPhoto = useMemo(() => {
        switch (category) {
            case 'courier':
                return '/photos/courier.jpg';
            case 'greeting-cards':
                return '/photos/greeting.jpg';
            case 'food':
            case 'bakery':
                return '/photos/bibingka.jpg';
            case 'repairs':
            case 'home-cleaning':
            case 'local-services':
            case 'print-assist':
            default:
                return '/photos/ac-clean.jpg';
        }
    }, [category]);

    const renderCustomerLiveTwin = () => (
        <div className="space-y-4">
            {/* Header & Mode Switcher */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0F2F58] uppercase tracking-wider">
                        <Eye className="size-3.5 text-emerald-600" />
                        <span>Customer Live Twin</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                        Real-time preview of citizen experience
                    </p>
                </div>
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                    <button
                        type="button"
                        onClick={() => setPreviewTab('card')}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                            previewTab === 'card'
                                ? 'bg-white text-[#0F2F58] shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <span>🏷️ Card</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreviewTab('timeline')}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                            previewTab === 'timeline'
                                ? 'bg-white text-[#0F2F58] shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <span>⏱️ Order Gates ({stages.length})</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: Marketplace Card Preview */}
            {previewTab === 'card' && (
                <div className="space-y-3.5">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                        <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                            <img
                                src={categoryPhoto}
                                alt={title || 'Trade Service'}
                                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                <span className="rounded-full bg-[#0F2F58]/90 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur uppercase">
                                    Service Offering
                                </span>
                                <span className="rounded-full bg-emerald-700/90 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur uppercase">
                                    {selectedTemplate.shape}
                                </span>
                            </div>
                            <div className="absolute top-2.5 right-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10.5px] font-extrabold text-slate-900 shadow-2xs backdrop-blur">
                                ★ 5.0 (New)
                            </div>
                        </div>

                        <div className="p-4 space-y-2.5">
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>Tagudin Centro · Municipal Verified</span>
                                <span className="font-semibold text-emerald-700">0% Platform Fee</span>
                            </div>

                            <h3 className="line-clamp-2 text-sm font-extrabold text-[#0F2F58]">
                                {title.trim() || 'Inverter Split AC Deep Clean & Checkup'}
                            </h3>

                            <div className="flex items-baseline justify-between border-t border-slate-100 pt-2.5">
                                <div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                                        {pricingMode === 'packages' ? 'Starting at' : 'Agreed Rate'}
                                    </span>
                                    <div className="font-mono text-base font-extrabold text-[#0F2F58]">
                                        ₱{(effectivePriceMinor / 100).toLocaleString('en-PH', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </div>
                                </div>
                                <span className="text-[11px] font-bold text-slate-500">
                                    {selectedTemplate.sla} SLA
                                </span>
                            </div>

                            {inclusions.length > 0 && (
                                <div className="space-y-1.5 border-t border-slate-100 pt-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Included Deliverables
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {inclusions.slice(0, 3).map((inc, i) => (
                                            <span
                                                key={i}
                                                className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200/60"
                                            >
                                                <Check className="size-2.5 text-emerald-600" />
                                                <span className="truncate max-w-[140px]">{inc}</span>
                                            </span>
                                        ))}
                                        {inclusions.length > 3 && (
                                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                                                +{inclusions.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-[11px] text-emerald-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                            <ShieldCheck className="size-3.5 text-emerald-700" />
                            <span>Tagudin Public Escrow Guarantee</span>
                        </div>
                        <p className="text-[10.5px] leading-relaxed text-emerald-800/90">
                            Buyers see 0% municipal fees and guaranteed fund protection until milestone completion.
                        </p>
                    </div>
                </div>
            )}

            {/* TAB 2: Order Execution Gates Timeline Preview */}
            {previewTab === 'timeline' && (
                <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="font-extrabold text-[#0F2F58] uppercase text-[10.5px]">
                                Governed Work Contract
                            </span>
                            <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                                {selectedTemplate.shape} Archetype
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Buyers track execution live on `/orders` through these verified gates:
                        </p>
                    </div>

                    <div className="space-y-2">
                        {stages.map((stage, idx) => {
                            const isFirst = idx === 0;
                            const isLast = idx === stages.length - 1;
                            const gateLabel = isFirst
                                ? 'Intake / Arrival Gate'
                                : isLast
                                  ? 'Final Sign-off Gate'
                                  : 'Execution Proof Gate';
                            const badgeStyle = isFirst
                                ? 'bg-sky-100 text-sky-900 border-sky-200'
                                : isLast
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                  : 'bg-indigo-100 text-indigo-900 border-indigo-200';

                            return (
                                <div
                                    key={stage.id || idx}
                                    className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs space-y-1.5 transition-all hover:border-[#0F2F58]/30"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex size-5 items-center justify-center rounded-full bg-[#0F2F58] text-[10px] font-bold text-white">
                                                {idx + 1}
                                            </div>
                                            <span className="text-xs font-extrabold text-slate-900">
                                                {stage.title}
                                            </span>
                                        </div>
                                        <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${badgeStyle}`}>
                                            {gateLabel}
                                        </span>
                                    </div>

                                    <p className="text-[11px] text-slate-500 line-clamp-2 pl-7">
                                        {stage.desc || 'Operational milestone task.'}
                                    </p>

                                    <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 pl-7 text-[10px] text-slate-400">
                                        <div className="flex items-center gap-1 font-semibold text-slate-600">
                                            <Clock className="size-3 text-slate-400" />
                                            <span>{stage.dur}</span>
                                        </div>
                                        <span className="font-semibold text-emerald-700">
                                            📷 {stage.evidence || 'Photo verified'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-900 space-y-1">
                        <span className="font-bold">🔒 Escrow Release Mechanism</span>
                        <p className="text-[10.5px] leading-relaxed text-amber-800">
                            Customer payment is deposited in escrow upon order creation and safely released upon completion of Gate {stages.length}.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 pb-16">
            <DesktopGlobalNav activeRoute="create_listing" />

            <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:py-6 space-y-6">
                {/* Top Studio Control Bar */}
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
                                    Create Marketplace Listing
                                </h1>
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900 uppercase">
                                    Step {step} of 3
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Publish verified trade offerings and governed service contracts in Tagudin.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Listing Type Switcher */}
                        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
                            <Link
                                href="/listings/create/service"
                                className="flex items-center gap-1.5 rounded-lg bg-[#0F2F58] px-3 py-1.5 text-xs font-extrabold text-white shadow-xs"
                            >
                                <Wrench className="size-3.5" />
                                <span>Service</span>
                            </Link>
                            <Link
                                href="/listings/create/product"
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:text-slate-900"
                            >
                                <Package className="size-3.5" />
                                <span>Product</span>
                            </Link>
                        </div>

                        {/* Builder Mode Switcher: Simple vs Advanced */}
                        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
                            <button
                                type="button"
                                onClick={() => setBuilderMode('simple')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                    builderMode === 'simple'
                                        ? 'bg-white text-[#0F2F58] shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Sparkles className="size-3.5 text-amber-500" />
                                <span>Simple Mode</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setBuilderMode('advanced')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                    builderMode === 'advanced'
                                        ? 'bg-[#0F2F58] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Sliders className="size-3.5" />
                                <span>Advanced Studio</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Stepper Progress Bar */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white px-5 py-3 shadow-2xs">
                    <div className="flex items-center gap-2">
                        <div className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                            step >= 1 ? 'bg-[#0F2F58] text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                            1
                        </div>
                        <span className={`text-xs font-bold ${step === 1 ? 'text-[#0F2F58]' : 'text-slate-600'}`}>
                            Trade Scope &amp; Archetype
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
                            Rates &amp; Options
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
                            Chains &amp; Launch
                        </span>
                    </div>
                </div>

                {/* Responsive 2-Column Grid */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
                    {/* LEFT COLUMN: Form Studio (Cols 1-7) */}
                    <main className="rounded-2xl border border-slate-200/80 bg-white p-5 lg:col-span-7 lg:p-7 shadow-xs space-y-6">
                        {step === 1 && (
                            <div className="space-y-5">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-900 uppercase">
                                            <Wrench className="size-3 text-emerald-700" />
                                            <span>Labor &amp; Service Offering</span>
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-500">
                                            {builderMode === 'simple' ? '⚡ Simple Fast Mode' : '🛠️ Advanced Studio'}
                                        </span>
                                    </div>
                                    <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                                        Trade Identity &amp; Scope
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Define your trade title, category, and deliverables in Tagudin.
                                    </p>
                                </div>

                                {formErrors.title && (
                                    <p className="text-xs font-bold text-red-600">{formErrors.title}</p>
                                )}

                                {/* Service Title */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        Service Title
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Inverter Split AC Deep Clean & Checkup"
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                    />
                                </div>

                                {/* Trade Category */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        Trade Category
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                    >
                                        <option value="repairs">Repairs &amp; Appliance Care</option>
                                        <option value="home-cleaning">Cleaning &amp; Home Help</option>
                                        <option value="courier">Courier &amp; Delivery</option>
                                        <option value="print-assist">Document &amp; Print Assistance</option>
                                        <option value="local-services">Errands &amp; General Local Services</option>
                                        <option value="greeting-cards">Handmade Cards &amp; Crafts</option>
                                    </select>
                                </div>

                                {/* =========================================================================
                                    SIMPLE MODE: Archetype Selector Cards (Fast 2-minute setup)
                                   ========================================================================= */}
                                {builderMode === 'simple' && (
                                    <div className="space-y-3 border-t border-slate-100 pt-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-extrabold text-[#0F2F58] uppercase tracking-wider">
                                                    Select Work Archetype
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    Standard governed execution pattern for this trade
                                                </div>
                                            </div>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                                                4 Official Archetypes
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                            {TAGUDIN_WORK_TEMPLATES.map((tmpl) => {
                                                const isSelected = selectedTemplate.id === tmpl.id;
                                                return (
                                                    <button
                                                        key={tmpl.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTemplate(tmpl);
                                                            setStages(tmpl.stages);
                                                        }}
                                                        className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                                                            isSelected
                                                                ? 'border-[#0F2F58] bg-[#EBF2FA]/60 ring-2 ring-[#0F2F58]/20 shadow-2xs'
                                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="rounded-md bg-[#0F2F58] px-2 py-0.5 text-[9.5px] font-extrabold text-white uppercase">
                                                                    {tmpl.shape}
                                                                </span>
                                                                <span className="font-mono text-[10px] font-semibold text-slate-500">
                                                                    {tmpl.sla}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs font-extrabold text-slate-900 pt-0.5">
                                                                {tmpl.title}
                                                            </div>
                                                            <div className="text-[10.5px] text-slate-500 line-clamp-2">
                                                                {tmpl.description}
                                                            </div>
                                                        </div>

                                                        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                                                            <span>{tmpl.stages.length} Verified Gates</span>
                                                            {isSelected && (
                                                                <span className="flex items-center gap-1 font-bold text-emerald-700">
                                                                    <Check className="size-3" /> Selected
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Invitation to Advanced Studio */}
                                        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs">
                                            <div className="space-y-0.5">
                                                <span className="font-extrabold text-indigo-950">
                                                    Want to customize individual gates or evidence photos?
                                                </span>
                                                <p className="text-[11px] text-indigo-900/80">
                                                    Advanced Studio gives you full node editing and customer approval toggles.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setBuilderMode('advanced')}
                                                className="shrink-0 cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700"
                                            >
                                                Switch to Studio ➔
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* =========================================================================
                                    ADVANCED MODE: Full Visual Canvas & Stage Milestones
                                   ========================================================================= */}
                                {builderMode === 'advanced' && (
                                    <div className="space-y-3.5 border-t border-slate-100 pt-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-extrabold text-[#0F2F58] uppercase tracking-wider">
                                                    Work Execution Pipeline (Studio)
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    Interactive node canvas and milestone evidence configuration
                                                </div>
                                            </div>
                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-800 uppercase">
                                                Work Catalog
                                            </span>
                                        </div>

                                        {/* Active Template Status Card */}
                                        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-[#FAFCFB] p-3 shadow-2xs">
                                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                                                    <Wrench className="size-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-xs font-extrabold text-[#0F2F58]">
                                                        {selectedTemplate.title}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 pt-0.5">
                                                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[9px] font-extrabold uppercase ${
                                                            isCustomizedFromTemplate
                                                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                                                : 'bg-emerald-100 text-emerald-800'
                                                        }`}>
                                                            {isCustomizedFromTemplate ? '⚡ Custom Variation' : '🏛️ Official Archetype'}
                                                        </span>
                                                        <span className="font-mono text-[10px] text-slate-500">
                                                            {selectedTemplate.shape} · {stages.length} Stages · {selectedTemplate.sla}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setWorkModalOpen(true)}
                                                className="ml-2 shrink-0 cursor-pointer rounded-full border border-emerald-300 bg-white px-3 py-1 text-[10.5px] font-extrabold text-emerald-800 shadow-2xs transition-colors hover:bg-emerald-50"
                                            >
                                                Change ▾
                                            </button>
                                        </div>

                                        {/* Visual Work Pipeline Canvas Summary & Studio Trigger */}
                                        <div className="space-y-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 shadow-2xs">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10.5px] font-extrabold uppercase text-[#0F2F58]">
                                                        Verified Work Execution DAG
                                                    </span>
                                                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-extrabold text-emerald-800">
                                                        {stages.length} Verified Gates
                                                    </span>
                                                </div>
                                                <span className="font-mono text-[10px] font-bold text-slate-500">
                                                    {stages.reduce((acc, s) => acc + (parseInt(s.dur, 10) || 0), 0)}m Total SLA
                                                </span>
                                            </div>

                                            <div className="overflow-x-auto py-1">
                                                <WorkPipelineCanvas
                                                    stages={stages}
                                                    flowType={selectedTemplate.flowType}
                                                    onStageClick={() => setCustomizerModalOpen(true)}
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setCustomizerModalOpen(true)}
                                                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-extrabold text-[#0F2F58] shadow-2xs transition-all hover:border-[#0F2F58] hover:bg-slate-50 hover:shadow-xs min-h-[44px]"
                                            >
                                                <span>🛠️ Customize Workflow in Studio</span>
                                                <span className="text-[11px] font-medium text-slate-400">
                                                    ({stages.length} nodes · Inspect &amp; Refine)
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Inclusions / Deliverables Checklist */}
                                <div className="space-y-2 border-t border-slate-100 pt-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-700">
                                            Included In Standard Service ({inclusions.length})
                                        </label>
                                        <span className="text-[10px] font-semibold text-slate-500">
                                            Checklist for customer
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        {inclusions.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-[#FAFCFB] p-2.5 text-xs font-semibold text-slate-800"
                                            >
                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                    <span className="font-extrabold text-emerald-700">✓</span>
                                                    <span className="truncate">{item}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeInclusion(idx)}
                                                    className="cursor-pointer p-1 text-slate-400 hover:text-red-600"
                                                    aria-label="Remove inclusion"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <input
                                            type="text"
                                            value={newInclusion}
                                            onChange={(e) => setNewInclusion(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addInclusion();
                                                }
                                            }}
                                            placeholder="Add inclusion (e.g. Free drain line flush)..."
                                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58]"
                                        />
                                        <button
                                            type="button"
                                            onClick={addInclusion}
                                            className="flex cursor-pointer items-center justify-center rounded-xl bg-[#EBF2FA] px-3.5 py-2 text-xs font-bold text-[#0F2F58] hover:bg-[#d8e6f7]"
                                        >
                                            <Plus className="mr-1 size-3.5" /> Add
                                        </button>
                                    </div>
                                </div>

                                {/* Detailed Description */}
                                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                                    <label className="text-xs font-bold text-slate-700">
                                        Detailed Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Explain your trade experience, equipment used, and municipal service standards..."
                                        className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] p-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                    />
                                </div>

                                <button
                                    type="button"
                                    disabled={!title.trim()}
                                    onClick={() => setStep(2)}
                                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] py-3 text-xs font-bold text-slate-950 shadow-xs transition-colors hover:bg-[#e6b327] disabled:opacity-50"
                                >
                                    <span>Continue to Rates &amp; Options</span>
                                    <ArrowRight className="size-3.5" />
                                </button>
                            </div>
                        )}

                    {step === 2 && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900">
                                    Rates &amp; Options
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Set standard base pricing and optional customer add-ons.
                                </p>
                            </div>

                            {/* Pricing Mode Switcher */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Pricing Mode
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPricingMode('fixed')}
                                        className={`rounded-xl border py-2 text-center text-xs font-bold transition-all ${
                                            pricingMode === 'fixed'
                                                ? 'border-[#0F2F58] bg-[#EBF2FA] text-[#0F2F58]'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        Fixed Rate
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPricingMode('range')}
                                        className={`rounded-xl border py-2 text-center text-xs font-bold transition-all ${
                                            pricingMode === 'range'
                                                ? 'border-[#0F2F58] bg-[#EBF2FA] text-[#0F2F58]'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        Price Range
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPricingMode('packages')}
                                        className={`rounded-xl border py-2 text-center text-xs font-bold transition-all ${
                                            pricingMode === 'packages'
                                                ? 'border-[#0F2F58] bg-[#EBF2FA] text-[#0F2F58]'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        Package Tiers
                                    </button>
                                </div>
                            </div>

                            {/* Pricing Inputs */}
                            {pricingMode === 'fixed' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        Standard Rate (PHP)
                                    </label>
                                    <input
                                        type="number"
                                        value={fixedPrice}
                                        onChange={(e) => setFixedPrice(e.target.value)}
                                        min="50"
                                        className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 font-mono text-sm font-extrabold text-slate-900 outline-none focus:border-[#0F2F58]"
                                    />
                                </div>
                            )}

                            {pricingMode === 'range' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">
                                            Min Rate (₱)
                                        </label>
                                        <input
                                            type="number"
                                            value={rangeMin}
                                            onChange={(e) => setRangeMin(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 font-mono text-sm font-extrabold text-slate-900 outline-none focus:border-[#0F2F58]"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">
                                            Max Rate (₱)
                                        </label>
                                        <input
                                            type="number"
                                            value={rangeMax}
                                            onChange={(e) => setRangeMax(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 font-mono text-sm font-extrabold text-slate-900 outline-none focus:border-[#0F2F58]"
                                        />
                                    </div>
                                </div>
                            )}

                            {pricingMode === 'packages' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-700">
                                            Package Tiers ({packageTiers.length})
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addTier}
                                            className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-extrabold text-[#0F2F58] hover:underline"
                                        >
                                            <Plus className="size-3" /> Add Tier
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-2.5">
                                        {packageTiers.map((tier, idx) => (
                                            <div
                                                key={tier.id || idx}
                                                className="space-y-2 rounded-xl border border-slate-200 bg-[#FAFCFB] p-3 shadow-2xs"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <input
                                                        type="text"
                                                        value={tier.title}
                                                        onChange={(e) =>
                                                            updateTier(idx, 'title', e.target.value)
                                                        }
                                                        placeholder="Tier name..."
                                                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-extrabold text-slate-900 outline-none focus:border-[#0F2F58]"
                                                    />
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        <span className="text-xs font-bold text-slate-500">
                                                            ₱
                                                        </span>
                                                        <input
                                                            type="number"
                                                            value={tier.price}
                                                            onChange={(e) =>
                                                                updateTier(
                                                                    idx,
                                                                    'price',
                                                                    parseFloat(e.target.value) || 0,
                                                                )
                                                            }
                                                            className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right font-mono text-xs font-extrabold text-[#0F2F58] outline-none focus:border-[#0F2F58]"
                                                        />
                                                    </div>
                                                    {packageTiers.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTier(idx)}
                                                            className="cursor-pointer p-1 text-slate-400 hover:text-red-600"
                                                            aria-label="Remove tier"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={tier.sub}
                                                    onChange={(e) =>
                                                        updateTier(idx, 'sub', e.target.value)
                                                    }
                                                    placeholder="Tier scope or inclusions..."
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 outline-none focus:border-[#0F2F58]"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Optional Customer Add-ons */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700">
                                        Optional Customer Add-ons ({addons.length})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addAddon}
                                        className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-extrabold text-[#0F2F58] hover:underline"
                                    >
                                        <Plus className="size-3" /> Add Add-on
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2.5">
                                    {addons.map((addon, idx) => (
                                        <div
                                            key={addon.id || idx}
                                            className="space-y-2 rounded-xl border border-slate-200 bg-[#FAFCFB] p-3 shadow-2xs"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <input
                                                    type="text"
                                                    value={addon.title}
                                                    onChange={(e) =>
                                                        updateAddon(idx, 'title', e.target.value)
                                                    }
                                                    placeholder="Add-on title..."
                                                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-[#0F2F58]"
                                                />
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <span className="text-[10.5px] font-extrabold text-emerald-700">
                                                        +₱
                                                    </span>
                                                    <input
                                                        type="number"
                                                        value={addon.price_amount_minor / 100}
                                                        onChange={(e) =>
                                                            updateAddon(
                                                                idx,
                                                                'price_amount_minor',
                                                                Math.round(
                                                                    (parseFloat(e.target.value) ||
                                                                        0) * 100,
                                                                ),
                                                            )
                                                        }
                                                        className="w-18 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right font-mono text-xs font-extrabold text-[#0F2F58] outline-none focus:border-[#0F2F58]"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAddon(idx)}
                                                    className="cursor-pointer p-1 text-slate-400 hover:text-red-600"
                                                    aria-label="Remove addon"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={addon.description}
                                                onChange={(e) =>
                                                    updateAddon(idx, 'description', e.target.value)
                                                }
                                                placeholder="Add-on scope description..."
                                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 outline-none focus:border-[#0F2F58]"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="flex-1 cursor-pointer rounded-xl bg-[#FFC72C] py-3 text-xs font-bold text-slate-950 shadow-xs hover:bg-[#e6b327]"
                                >
                                    Continue to Partnered Chains
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900">
                                    Partnered Deal Chains
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Explore partner combinations before saving. Partner selections
                                    are not persisted in the current draft contract.
                                </p>
                            </div>

                            {/* Section 3: Partnered Options & Deal Chain Carousel matching listing-service-editor.html:2010-2058 */}
                            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                    <div>
                                        <div className="text-[11px] font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                            Partnered Options
                                        </div>
                                        <div className="text-[9.5px] text-slate-500">
                                            Customer-selectable Deal Chain combinations
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-[#0F2F58] px-2 py-0.5 text-[9px] font-extrabold text-white uppercase">
                                        Deal Chain
                                    </span>
                                </div>

                                <DealChainCarousel
                                    combinations={combinations}
                                    activeIndex={activeComboIndex}
                                    onIndexChange={setActiveComboIndex}
                                    onSlotChangeClick={(comboId, slotType) =>
                                        setSlotPickerTarget({ comboId, slotType })
                                    }
                                />
                            </div>

                            {/* Summary Review Card */}
                            <div className="space-y-3 rounded-2xl border border-slate-200 bg-[#FAFCFB] p-4 shadow-xs">
                                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                                    <span className="rounded-full bg-[#EBF2FA] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F2F58] uppercase">
                                        {selectedTemplate.shape} · {category}
                                    </span>
                                    <span className="font-mono text-base font-extrabold text-[#0F2F58]">
                                        ₱{(effectivePriceMinor / 100).toFixed(2)}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-900">
                                        {title}
                                    </h3>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                        {description || 'Governed Tagudin trade service offering.'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-amber-800">
                                    <ShieldCheck className="size-4 shrink-0 text-amber-700" />
                                    <span>
                                        Saved as a private draft; review submission is a separate
                                        step.
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 cursor-pointer rounded-xl bg-[#0F2F58] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#153e74] disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving draft...' : 'Save Private Draft'}
                                </button>
                            </div>
                        </form>
                    )}
                    </main>

                    {/* RIGHT COLUMN: Customer Live Twin (Cols 8-12, Sticky on Desktop) */}
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
                        <Eye className="size-4 text-emerald-400" />
                        <span>Live Twin Preview</span>
                    </button>
                </div>

                {/* Mobile Customer Twin Modal Sheet */}
                {mobilePreviewOpen && (
                    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/60 backdrop-blur-xs lg:hidden">
                        <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <span className="font-extrabold text-[#0F2F58] text-sm">Customer Live Twin</span>
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

                {/* Work Catalog Modal */}
                <WorkCatalogModal
                    open={workModalOpen}
                    onClose={() => setWorkModalOpen(false)}
                    templates={TAGUDIN_WORK_TEMPLATES}
                    activeTemplateId={selectedTemplate.id}
                    onSelect={handleSelectTemplate}
                    onBuildCustom={() => {
                        setWorkModalOpen(false);
                        setCustomizerModalOpen(true);
                    }}
                />

                {/* Work Node Customizer Modal */}
                <WorkNodeCustomizerModal
                    open={customizerModalOpen}
                    onClose={() => setCustomizerModalOpen(false)}
                    stages={stages}
                    flowType={selectedTemplate.flowType}
                    onSave={(updatedStages) => {
                        setStages(updatedStages);
                    }}
                    onResetToTemplate={() => {
                        setStages(selectedTemplate.stages);
                    }}
                />

                {/* Deal Chain Slot Picker Modal */}
                <SlotListingPickerModal
                    open={Boolean(slotPickerTarget)}
                    onClose={() => setSlotPickerTarget(null)}
                    role={slotPickerTarget?.slotType || 'store'}
                    onSelectCandidate={handleSwapSlot}
                />
            </div>
        </div>
    );
}
