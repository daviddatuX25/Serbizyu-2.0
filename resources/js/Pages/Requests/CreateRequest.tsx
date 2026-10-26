import React, { useState, useEffect, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Sparkles,
    Sliders,
    Calendar,
    Clock,
    ShieldCheck,
    Eye,
    X,
    MapPin,
    Lock,
    Unlock,
    Users,
    CheckCircle2,
    Plus,
    Trash2,
    AlertCircle,
    Check,
    Wrench,
} from 'lucide-react';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';
import { BottomNavBar, type NavTabId } from '../../marketplace/components/BottomNavBar';
import { FieldGuide } from '../../components/ui/FieldGuide';
import {
    REQUEST_GUIDED_STEPS,
    REQUEST_FIELD_GUIDANCE,
    type BuilderMode,
} from '../../lib/builderGuidance';
import {
    savePendingRequestDraft,
    readPendingRequestDraft,
    clearPendingRequestDraft,
    type RequestBuilderDraft,
} from '../../lib/pendingRequestDraft';
import { TAGUDIN_BARANGAYS_43 } from '../../lib/philippineAddresses';
import {
    WorkPipelineCanvas,
    WorkNodeCustomizerModal,
    WorkCatalogModal,
    type WorkStage,
    type WorkTemplate,
} from '../../components/mobile';

interface CategoryOption {
    id: string;
    code: string;
    name: string;
}

interface WorkSetOption {
    option_id: string;
    set_code: string;
    catalog_code: string;
    set_version: number;
    work_shape: string;
    category_codes: string[];
    listing_types: string[];
    title: string;
    summary: string;
    target_duration_label?: string;
    steps: Array<{
        id: string;
        title: string;
        description: string;
        duration_label?: string | null;
        evidence_type?: string;
        evidence_description?: string;
    }>;
}

interface WorkOptionGroups {
    recommended: WorkSetOption[];
    other_archetypes: WorkSetOption[];
}

interface CreateRequestProps {
    session?: {
        authenticated?: boolean;
        isAuthenticated?: boolean;
        user_id?: string;
    } | null;
    readiness?: unknown;
    correlationId?: string;
    errors?: Record<string, string>;
    categories?: CategoryOption[];
    workOptions?: WorkOptionGroups;
    workCatalog?: unknown;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
    { id: 'cat-repairs', code: 'repairs', name: 'Repairs & Appliance Care' },
    { id: 'cat-electrical', code: 'electrical', name: 'Electrical & Power' },
    { id: 'cat-plumbing', code: 'plumbing', name: 'Home Plumbing & Water' },
    { id: 'cat-carpentry', code: 'carpentry', name: 'Carpentry & Construction' },
    { id: 'cat-home-cleaning', code: 'home-cleaning', name: 'Cleaning & Home Help' },
    { id: 'cat-courier', code: 'courier', name: 'Errands & Courier Delivery' },
    { id: 'cat-creative', code: 'creative', name: 'Creative & Tailoring' },
    { id: 'cat-local-food', code: 'local-food', name: 'Local Food & Cookery' },
];

const CATEGORY_TASK_SUGGESTIONS: Record<string, string[]> = {
    'local-food': [
        'Prepare fresh food order per recipe specifications',
        'Package securely in clean food-grade containers',
    ],
    food: [
        'Prepare fresh food order per recipe specifications',
        'Package securely in clean food-grade containers',
    ],
    repairs: [
        'Inspect unit and diagnose root cause',
        'Replace or repair defective component',
    ],
    electrical: [
        'Inspect circuit line and verify voltage safety',
        'Secure loose terminals and replace faulty component',
    ],
    plumbing: [
        'Locate leak point and isolate water flow',
        'Replace worn valve or pipe joint and pressure test',
    ],
    'home-cleaning': [
        'Deep clean specified rooms and surfaces',
        'Sanitize fixtures and dispose waste properly',
    ],
    courier: [
        'Pick up parcel from designated location',
        'Safely transport and deliver to receiver before deadline',
    ],
    carpentry: [
        'Inspect structural frame or wood fitting',
        'Cut, assemble, and secure wood elements per dimensions',
    ],
    creative: [
        'Review design specifications and sample materials',
        'Produce custom craft or tailoring item per approved pattern',
    ],
};

const DEFAULT_WORK_TEMPLATES_BY_CATEGORY: Record<string, WorkTemplate> = {
    'local-food': {
        id: 'food-prep-dispatch',
        category: 'local-food',
        categoryCodes: ['local-food', 'food'],
        title: 'Food Preparation, Packaging & Safe Dispatch',
        shape: 'A4',
        sla: '35m',
        flowType: 'linear',
        description: 'Sanitary preparation, food-grade packaging, and dispatch handoff.',
        stages: [
            {
                id: 'stage-food-1',
                num: '01',
                title: 'Ingredient Prep & Sanitary Cook',
                dur: '15m',
                desc: 'Inspect ingredients and prepare food order in sanitary workspace.',
                evidence: 'Preparation verification photo',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
            {
                id: 'stage-food-2',
                num: '02',
                title: 'Food-Grade Sealed Packaging',
                dur: '10m',
                desc: 'Package hot/fresh items in sealed food containers with labels.',
                evidence: 'Packaged items photo',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
            {
                id: 'stage-food-3',
                num: '03',
                title: 'Customer Handoff / Courier Dispatch',
                dur: '10m',
                desc: 'Confirm order receipt and hand off to buyer or runner.',
                evidence: 'Handoff confirmation sign-off',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
        ],
    },
    repairs: {
        id: 'repair-diagnosis-test',
        category: 'repairs',
        categoryCodes: ['repairs'],
        title: 'Problem Diagnosis, Part Replacement & Load Test',
        shape: 'A1',
        sla: '45m',
        flowType: 'linear',
        description: 'Triage inspection, core repair, and operational test.',
        stages: [
            {
                id: 'stage-rep-1',
                num: '01',
                title: 'Problem Diagnosis & Inspection',
                dur: '15m',
                desc: 'Inspect defect, assess required fittings and safety isolation.',
                evidence: 'Inspection photo required before work starts',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
            {
                id: 'stage-rep-2',
                num: '02',
                title: 'Core Repair & Replacement',
                dur: '20m',
                desc: 'Replace damaged component, solder/tighten joints, and verify secure fit.',
                evidence: 'Photo of replaced part & working connection',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
            {
                id: 'stage-rep-3',
                num: '03',
                title: 'Operational Test & Sign-off',
                dur: '10m',
                desc: 'Perform full load test with customer sign-off.',
                evidence: 'Digital sign-off & completion photo',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
        ],
    },
    electrical: {
        id: 'electrical-triage-wiring',
        category: 'electrical',
        categoryCodes: ['electrical'],
        title: 'Circuit Triage, Wiring & Load Verification',
        shape: 'A1',
        sla: '40m',
        flowType: 'linear',
        description: 'Safety isolation, terminal wiring, and breaker load test.',
        stages: [
            {
                id: 'stage-elec-1',
                num: '01',
                title: 'Circuit Diagnosis & Safety Lock-Out',
                dur: '15m',
                desc: 'Verify voltage, isolate circuit, and inspect terminals.',
                evidence: 'Meter terminal reading photo',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
            {
                id: 'stage-elec-2',
                num: '02',
                title: 'Terminal Wiring & Component Replacement',
                dur: '15m',
                desc: 'Secure wiring, replace breaker/switch, and verify torque.',
                evidence: 'Installed wiring photo',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
            {
                id: 'stage-elec-3',
                num: '03',
                title: 'Load Test & Final Sign-off',
                dur: '10m',
                desc: 'Power on circuit under test load and verify steady current.',
                evidence: 'Load sign-off photo',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
        ],
    },
    plumbing: {
        id: 'plumbing-leak-triage',
        category: 'plumbing',
        categoryCodes: ['plumbing'],
        title: 'Leak Isolation, Valve Repair & Pressure Test',
        shape: 'A1',
        sla: '45m',
        flowType: 'linear',
        description: 'Water shutoff, fitting repair, and pressure sign-off.',
        stages: [
            {
                id: 'stage-plumb-1',
                num: '01',
                title: 'Leak Point Diagnosis & Isolation',
                dur: '15m',
                desc: 'Isolate main valve, inspect thread wear and joint seals.',
                evidence: 'Leak inspection photo',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
            {
                id: 'stage-plumb-2',
                num: '02',
                title: 'Valve Replacement & Fitting Solder',
                dur: '20m',
                desc: 'Install replacement valve and tighten joints.',
                evidence: 'Replacement joint photo',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
            {
                id: 'stage-plumb-3',
                num: '03',
                title: 'Pressure Test & Citizen Sign-off',
                dur: '10m',
                desc: 'Turn on main water with all taps open, verify zero leakage.',
                evidence: 'Pressure test sign-off photo',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
        ],
    },
    'home-cleaning': {
        id: 'cleaning-sanitation-inspection',
        category: 'home-cleaning',
        categoryCodes: ['home-cleaning'],
        title: 'Area Assessment, Deep Sanitation & Quality Inspection',
        shape: 'A1',
        sla: '60m',
        flowType: 'linear',
        description: 'Room assessment, surface disinfection, and walkthrough sign-off.',
        stages: [
            {
                id: 'stage-clean-1',
                num: '01',
                title: 'Area Assessment & Pre-clean Inspection',
                dur: '10m',
                desc: 'Survey high-priority zones, set cleaning tools and safe supplies.',
                evidence: 'Initial area condition photo',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
            {
                id: 'stage-clean-2',
                num: '02',
                title: 'Deep Sanitation & Surface Disinfection',
                dur: '40m',
                desc: 'Scrub, wipe, and disinfect target rooms and fixtures.',
                evidence: 'Cleaned surface verification photo',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
            {
                id: 'stage-clean-3',
                num: '03',
                title: 'Final Walkthrough & Sign-off',
                dur: '10m',
                desc: 'Review completed area with homeowner and dispose waste.',
                evidence: 'Completion walkthrough sign-off',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
        ],
    },
    courier: {
        id: 'courier-pickup-transit-dropoff',
        category: 'courier',
        categoryCodes: ['courier'],
        title: 'Pickup Verification, Secure Transit & Citizen Handshake',
        shape: 'A1',
        sla: '30m',
        flowType: 'linear',
        description: 'Parcel verification, transport relay, and arrival confirmation.',
        stages: [
            {
                id: 'stage-cour-1',
                num: '01',
                title: 'Pickup Verification & Package Check',
                dur: '10m',
                desc: 'Verify parcel condition, weight, and delivery address.',
                evidence: 'Parcel pickup photo',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
            {
                id: 'stage-cour-2',
                num: '02',
                title: 'Protected Motorcycle Transit',
                dur: '15m',
                desc: 'Direct transport along Tagudin barangay route.',
                evidence: 'En-route transit status',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
            {
                id: 'stage-cour-3',
                num: '03',
                title: 'Receiver Handoff & Digital Sign-off',
                dur: '5m',
                desc: 'Deliver parcel to designated recipient with confirmation.',
                evidence: 'Recipient handoff photo',
                color: '#0F2F58',
                bg: '#EBF2FA',
            },
        ],
    },
};

function toWorkTemplate(option: WorkSetOption): WorkTemplate {
    const categoryCodes = option.category_codes ?? [];
    const steps = option.steps ?? [];
    return {
        id: option.set_code || option.option_id || 'custom-template',
        category: categoryCodes[0] || '',
        categoryCodes,
        title: option.title,
        shape: option.work_shape,
        catalogCode: option.catalog_code,
        setVersion: option.set_version,
        sla: option.target_duration_label || '',
        flowType: 'linear',
        description: option.summary,
        stages: steps.map((step, index) => ({
            id: step.id || `step-${index + 1}`,
            num: String(index + 1).padStart(2, '0'),
            title: step.title,
            dur: step.duration_label || '',
            desc: step.description,
            evidence: step.evidence_description || step.evidence_type || 'Work evidence',
            evidenceType: step.evidence_type,
            color: '#0F2F58',
            bg: '#EBF2FA',
        })),
    };
}

export default function CreateRequest({
    session,
    correlationId: _correlationId,
    errors = {},
    categories = DEFAULT_CATEGORIES,
    workOptions,
}: CreateRequestProps) {
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [builderMode, setBuilderMode] = useState<BuilderMode>('guided');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>(errors);
    const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

    // Step 1: Need & Category
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState(categories[0]?.code ?? 'repairs');
    const [description, setDescription] = useState('');

    // Step 2: Scope & Governed Pipeline
    const [requirements, setRequirements] = useState<string[]>([]);
    const [newRequirementText, setNewRequirementText] = useState('');
    const [attachPipeline, setAttachPipeline] = useState(false);

    // Work Pipeline State with WorkCatalog Parity
    const allWorkTemplates = useMemo(() => {
        const fromOptions = [
            ...(workOptions?.recommended ?? []).map(toWorkTemplate),
            ...(workOptions?.other_archetypes ?? []).map(toWorkTemplate),
        ];
        const defaults = Object.values(DEFAULT_WORK_TEMPLATES_BY_CATEGORY);
        const existingIds = new Set(fromOptions.map((t) => t.id));
        return [...fromOptions, ...defaults.filter((t) => !existingIds.has(t.id))];
    }, [workOptions]);

    const initialTemplate = useMemo(() => {
        return (
            allWorkTemplates.find((t) => t.categoryCodes?.includes(category) || t.category === category) ??
            allWorkTemplates[0] ??
            DEFAULT_WORK_TEMPLATES_BY_CATEGORY['repairs']
        );
    }, [allWorkTemplates, category]);

    const [selectedTemplate, setSelectedTemplate] = useState<WorkTemplate>(initialTemplate);
    const [stages, setStages] = useState<WorkStage[]>(initialTemplate.stages);
    const [workModalOpen, setWorkModalOpen] = useState(false);
    const [customizerModalOpen, setCustomizerModalOpen] = useState(false);

    // Step 3: Schedule & Location
    const [urgency, setUrgency] = useState<'today' | 'this_week' | 'flexible' | 'specific'>('today');
    const [scheduledDate, setScheduledDate] = useState('2026-10-01');
    const [scheduledTimeWindow, setScheduledTimeWindow] = useState('Morning (8am - 12pm)');
    const [area, setArea] = useState('Tagudin Centro');
    const [addressHidden, setAddressHidden] = useState(true);

    // Step 4: Budget & Tender Rules
    const [budgetMode, setBudgetMode] = useState<'estimate' | 'exact' | 'undisclosed'>('exact');
    const [budget, setBudget] = useState('500');
    const [tenderMode, setTenderMode] = useState<'open_tender' | 'sealed_tender' | 'direct_invite'>('open_tender');
    const [paymentLane, setPaymentLane] = useState<'external_cash' | 'bilateral_escrow'>('external_cash');

    // Step 5: Fulfillment & Review
    const [preferredFulfillment, setPreferredFulfillment] = useState<'direct' | 'courier' | 'all'>('direct');

    const isAuthenticated = session?.authenticated === true || session?.isAuthenticated === true;

    // Handle Category Change Adaptively
    const handleCategoryChange = (newCat: string) => {
        setCategory(newCat);
        const match =
            allWorkTemplates.find((t) => t.categoryCodes?.includes(newCat) || t.category === newCat) ??
            DEFAULT_WORK_TEMPLATES_BY_CATEGORY[newCat] ??
            DEFAULT_WORK_TEMPLATES_BY_CATEGORY['repairs'];
        setSelectedTemplate(match);
        setStages(match.stages);
    };

    const handleSelectTemplate = (template: WorkTemplate) => {
        setSelectedTemplate(template);
        setStages(template.stages);
        setWorkModalOpen(false);
    };

    // Restore draft from sessionStorage on initial mount
    useEffect(() => {
        const saved = readPendingRequestDraft();
        if (!saved) return;

        if (saved.step >= 1 && saved.step <= 5) {
            setStep(saved.step as 1 | 2 | 3 | 4 | 5);
        }
        if (saved.builderMode === 'standard' || saved.builderMode === 'guided') {
            setBuilderMode(saved.builderMode);
        }
        if (saved.title) setTitle(saved.title);
        if (saved.category) {
            handleCategoryChange(saved.category);
        }
        if (saved.description) setDescription(saved.description);
        if (Array.isArray(saved.requirements) && saved.requirements.length > 0) {
            setRequirements(saved.requirements);
        }
        setAttachPipeline(Boolean(saved.attachPipeline));
        if (Array.isArray(saved.pipelineStages) && saved.pipelineStages.length > 0) {
            setStages(saved.pipelineStages.map(({ step: savedStep, dur, ...stage }) => ({
                ...stage,
                color: stage.color ?? '#0F2F58',
                bg: stage.bg ?? '#EBF2FA',
                num: String(savedStep),
                dur: String(dur),
            })));
        }
        if (saved.urgency) setUrgency(saved.urgency);
        if (saved.scheduledDate) setScheduledDate(saved.scheduledDate);
        if (saved.scheduledTimeWindow) setScheduledTimeWindow(saved.scheduledTimeWindow);
        if (saved.area) setArea(saved.area);
        setAddressHidden(saved.addressHidden !== false);
        if (saved.budgetMode) setBudgetMode(saved.budgetMode);
        if (saved.budgetAmount !== undefined) setBudget(String(saved.budgetAmount));
        if (saved.tenderMode) setTenderMode(saved.tenderMode);
        if (saved.paymentLane) setPaymentLane(saved.paymentLane);
        if (saved.preferredFulfillment) setPreferredFulfillment(saved.preferredFulfillment);
    }, []);

    // Current draft object builder
    const currentDraft = (): RequestBuilderDraft => ({
        version: 1,
        step,
        builderMode,
        title,
        category,
        description,
        requirements,
        attachPipeline,
        pipelineStages: stages.map((s, idx) => ({
            ...s,
            step: idx + 1,
            dur: parseInt(s.dur, 10) || 15,
        })),
        urgency,
        scheduledDate,
        scheduledTimeWindow,
        area,
        addressHidden,
        budgetMode,
        budgetAmount: parseFloat(budget) || 0,
        tenderMode,
        paymentLane,
        preferredFulfillment,
    });

    // Auto-save draft to sessionStorage
    useEffect(() => {
        savePendingRequestDraft(currentDraft());
    }, [
        step,
        builderMode,
        title,
        category,
        description,
        requirements,
        attachPipeline,
        stages,
        urgency,
        scheduledDate,
        scheduledTimeWindow,
        area,
        addressHidden,
        budgetMode,
        budget,
        tenderMode,
        paymentLane,
        preferredFulfillment,
    ]);

    // Requirements list handlers
    const addRequirement = () => {
        const trimmed = newRequirementText.trim();
        if (!trimmed) return;
        setRequirements((prev) => [...prev, trimmed]);
        setNewRequirementText('');
    };

    const removeRequirement = (index: number) => {
        setRequirements((prev) => prev.filter((_, i) => i !== index));
    };

    // Validation per step
    const canContinueStep1 = title.trim().length >= 3;
    const canContinueStep2 = true; // Scope tasks are optional; citizens can post with summary or attach pipeline
    const canContinueStep3 = Boolean(area);
    const canContinueStep4 = budgetMode === 'undisclosed' || parseFloat(budget) > 0;

    const handleNextStep = () => {
        if (step === 1 && !canContinueStep1) {
            setFormErrors({ title: 'Please provide a clear title with at least 3 characters.' });
            return;
        }
        setFormErrors({});
        setStep((prev) => Math.min(5, prev + 1) as 1 | 2 | 3 | 4 | 5);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrevStep = () => {
        setFormErrors({});
        setStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4 | 5);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors({});

        if (!title.trim() || title.trim().length < 3) {
            setFormErrors({ title: 'Request title must be at least 3 characters.' });
            setStep(1);
            return;
        }

        const effectiveDescription =
            description.trim().length >= 10
                ? description.trim()
                : `${title.trim()} — Citizen request for ${category} in ${area}. ${requirements.join('; ')}`;

        const parsedBudget = budgetMode === 'undisclosed' ? null : parseFloat(budget) || null;

        const payload = {
            title: title.trim(),
            description: effectiveDescription,
            category_code: category,
            budget_amount: parsedBudget,
            budget_mode: budgetMode,
            urgency,
            scheduled_date: urgency === 'specific' ? scheduledDate : null,
            time_window: urgency === 'specific' ? scheduledTimeWindow : null,
            area,
            hide_exact_address: addressHidden,
            tender_mode: tenderMode,
            payment_lane: paymentLane,
            preferred_fulfillment: preferredFulfillment,
            requirements,
            attach_pipeline: attachPipeline,
            pipeline: attachPipeline
                ? {
                      template: selectedTemplate.title,
                      work_shape: selectedTemplate.shape,
                      catalog_code: selectedTemplate.id,
                      target_sla: selectedTemplate.sla,
                      stages: stages.map(({ checklistItems, metricRequirements, ...stage }) => ({
                          ...stage,
                          ...(Array.isArray(checklistItems) ? { checklist_items: checklistItems } : {}),
                          ...(Array.isArray(metricRequirements) ? { metric_requirements: metricRequirements } : {}),
                      })),
                  }
                : null,
        };

        if (!isAuthenticated) {
            savePendingRequestDraft(currentDraft());
            router.visit(`/auth/sign-in?return_to=${encodeURIComponent('/requests/create')}`);
            return;
        }

        setIsSubmitting(true);
        router.post('/requests', payload as unknown as Parameters<typeof router.post>[1], {
            onError: (errs) => {
                setFormErrors(errs);
                setIsSubmitting(false);
                if (errs.title || errs.category_code || errs.description) {
                    setStep(1);
                } else if (errs.budget_amount || errs.budget_mode) {
                    setStep(4);
                }
            },
            onSuccess: () => {
                clearPendingRequestDraft();
                setIsSubmitting(false);
            },
        });
    };

    const categoryName = categories.find((c) => c.code === category)?.name || category;

    // Live Twin Preview Card
    const renderLiveTwin = () => (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Citizen Request Preview
                    </span>
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                            tenderMode === 'sealed_tender'
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : tenderMode === 'direct_invite'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                    >
                        {tenderMode === 'sealed_tender' ? (
                            <>
                                <Lock className="size-3" />
                                <span>Sealed Bidding</span>
                            </>
                        ) : tenderMode === 'direct_invite' ? (
                            <>
                                <Users className="size-3" />
                                <span>Direct Invite</span>
                            </>
                        ) : (
                            <>
                                <Unlock className="size-3" />
                                <span>Open Tender</span>
                            </>
                        )}
                    </span>
                </div>

                <div className="mt-4 space-y-3">
                    <h3 className="text-base font-extrabold text-[#0F2F58] leading-snug">
                        {title.trim() || 'Untitled Request'}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#EBF2FA] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F2F58] uppercase">
                            {categoryName}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                            <MapPin className="size-3 text-slate-400" />
                            <span>{area}</span>
                            {addressHidden && <span className="text-[9px] text-slate-400 font-semibold">(Coarse)</span>}
                        </span>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-700 leading-relaxed">
                        {description.trim() || 'No detailed task condition entered yet.'}
                    </div>

                    {requirements.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                                Required Tasks ({requirements.length})
                            </span>
                            <ul className="space-y-1 text-xs text-slate-600">
                                {requirements.slice(0, 3).map((r, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                        <span className="line-clamp-1">{r}</span>
                                    </li>
                                ))}
                                {requirements.length > 3 && (
                                    <li className="text-[10px] font-bold text-slate-500 italic pl-5">
                                        + {requirements.length - 3} more items
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {attachPipeline && (
                        <div className="rounded-xl border border-teal-200/80 bg-teal-50/60 p-2.5 text-xs text-teal-950 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="size-4 text-teal-600 shrink-0" />
                                <span className="font-extrabold truncate max-w-[170px]">{selectedTemplate.title}</span>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-teal-800 shrink-0">
                                {stages.length} Gates · {selectedTemplate.sla || 'Standard'}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                            <Clock className="size-3.5 text-slate-400" />
                            <span className="capitalize">{urgency === 'specific' ? `${scheduledDate}` : urgency.replace('_', ' ')}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                {budgetMode === 'undisclosed' ? 'Tender Budget' : budgetMode === 'estimate' ? 'Estimated Guide' : 'Exact Budget'}
                            </span>
                            <span className="font-mono text-base font-extrabold text-[#0F2F58]">
                                {budgetMode === 'undisclosed' ? 'Undisclosed' : `₱${parseFloat(budget || '0').toFixed(2)}`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 pb-20">
            <DesktopGlobalNav />

            <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8 space-y-5">
                {/* STICKY TOP BUILDER HEADER */}
                <header className="sticky top-0 z-30 flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3 shadow-xs backdrop-blur-md">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link
                            href="/browse"
                            className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                            title="Back to Browse"
                        >
                            <ArrowLeft className="size-4" />
                        </Link>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-extrabold text-[#0F2F58] sm:text-base truncate">
                                    Custom Request Builder
                                </h1>
                                {builderMode === 'guided' ? (
                                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-900">
                                        Step {step} of 5 · {REQUEST_GUIDED_STEPS[step - 1]?.shortTitle}
                                    </span>
                                ) : (
                                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                        Standard Form
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mode Switcher */}
                    <div className="flex items-center gap-2">
                        <div
                            className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200/70 bg-slate-100 p-0.5"
                            data-testid="builder-mode-switcher"
                        >
                            <button
                                type="button"
                                onClick={() => setBuilderMode('guided')}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
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
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                                    builderMode === 'standard'
                                        ? 'bg-[#0F2F58] text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Sliders className="size-3" />
                                <span>Standard</span>
                            </button>
                        </div>

                        {/* Mobile Preview Button */}
                        <button
                            type="button"
                            onClick={() => setMobilePreviewOpen(true)}
                            className="lg:hidden flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 cursor-pointer shrink-0"
                            title="Preview Citizen View"
                        >
                            <Eye className="size-3.5 text-blue-600" />
                            <span>Preview</span>
                        </button>
                    </div>
                </header>

                {/* Guided Mode Progress Bar */}
                {builderMode === 'guided' && (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200/70 -mt-2">
                        <div
                            className="h-full bg-blue-600 transition-all duration-300 ease-out"
                            style={{ width: `${(step / 5) * 100}%` }}
                        />
                    </div>
                )}

                {/* Main 2-Column Layout */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
                    {/* LEFT COLUMN: Request Form (7 Cols) */}
                    <main className="rounded-2xl border border-slate-200/80 bg-white p-5 lg:col-span-7 lg:p-7 shadow-xs space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* STEP 1: Need & Category */}
                            {(builderMode === 'standard' || step === 1) && (
                                <section className="space-y-4">
                                    {builderMode === 'guided' ? (
                                        <div className="space-y-1">
                                            <h2 className="text-lg font-extrabold text-[#0F2F58]">
                                                {REQUEST_GUIDED_STEPS[0].guidedTitle}
                                            </h2>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                {REQUEST_GUIDED_STEPS[0].guidedDescription}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                                                1. {REQUEST_GUIDED_STEPS[0].standardTitle}
                                            </h2>
                                        </div>
                                    )}

                                    {/* Request Title */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label htmlFor="req-title" className="text-xs font-bold text-slate-700">
                                                Request Summary / Title <span className="text-red-500">*</span>
                                            </label>
                                            <FieldGuide guidance={REQUEST_FIELD_GUIDANCE.title.guidance} mode={builderMode} />
                                        </div>
                                        <input
                                            id="req-title"
                                            data-testid="request-title-input"
                                            type="text"
                                            required
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder={REQUEST_FIELD_GUIDANCE.title.placeholder}
                                            maxLength={120}
                                            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                                        />
                                        <div className="flex justify-between text-[11px] text-slate-400">
                                            <span>Be specific about the issue and location</span>
                                            <span>{title.length}/120</span>
                                        </div>
                                        {formErrors.title && (
                                            <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                                                <AlertCircle className="size-3.5" />
                                                {formErrors.title}
                                            </p>
                                        )}
                                    </div>

                                    {/* Category Selector */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label htmlFor="req-category" className="text-xs font-bold text-slate-700">
                                                Trade Category
                                            </label>
                                            <FieldGuide guidance={REQUEST_FIELD_GUIDANCE.category.guidance} mode={builderMode} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map((c) => (
                                                <button
                                                    key={c.code}
                                                    type="button"
                                                    onClick={() => handleCategoryChange(c.code)}
                                                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                                        category === c.code
                                                            ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label htmlFor="req-description" className="text-xs font-bold text-slate-700">
                                                Problem Details & Conditions
                                            </label>
                                            <FieldGuide guidance={REQUEST_FIELD_GUIDANCE.description.guidance} mode={builderMode} />
                                        </div>
                                        <textarea
                                            id="req-description"
                                            data-testid="request-description-input"
                                            rows={3}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder={REQUEST_FIELD_GUIDANCE.description.placeholder}
                                            className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                                        />
                                        <span className="text-[11px] text-slate-400">
                                            Minimum 10 characters. Describe symptoms or materials you already have.
                                        </span>
                                    </div>

                                    {builderMode === 'guided' && (
                                        <div className="flex justify-end pt-3">
                                            <button
                                                type="button"
                                                onClick={handleNextStep}
                                                disabled={!canContinueStep1}
                                                className="flex items-center gap-1.5 rounded-xl bg-[#0F2F58] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1a447c] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                                            >
                                                <span>Continue to Scope</span>
                                                <ArrowRight className="size-4" />
                                            </button>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* STEP 2: Scope & Governed Pipeline */}
                            {(builderMode === 'standard' || step === 2) && (
                                <section className="space-y-4 pt-4 border-t border-slate-100">
                                    {builderMode === 'guided' ? (
                                        <div className="space-y-1">
                                            <h2 className="text-lg font-extrabold text-[#0F2F58]">
                                                {REQUEST_GUIDED_STEPS[1].guidedTitle}
                                            </h2>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                {REQUEST_GUIDED_STEPS[1].guidedDescription}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                                                2. {REQUEST_GUIDED_STEPS[1].standardTitle}
                                            </h2>
                                        </div>
                                    )}

                                    {/* Scope Checklist */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 block">
                                                Scope Checklist (Deliverables)
                                            </label>
                                            {requirements.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setRequirements([])}
                                                    className="text-[11px] font-semibold text-slate-400 hover:text-red-600 cursor-pointer"
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>

                                        {requirements.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3.5 text-center space-y-2">
                                                <p className="text-[11px] text-slate-500 font-medium">
                                                    No specific tasks added yet. Add custom tasks below or load suggested deliverables for {categoryName}.
                                                </p>
                                                {CATEGORY_TASK_SUGGESTIONS[category] && (
                                                    <button
                                                        type="button"
                                                        data-testid="load-suggested-tasks-btn"
                                                        onClick={() => setRequirements([...CATEGORY_TASK_SUGGESTIONS[category]])}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900 hover:bg-blue-100 transition-colors cursor-pointer"
                                                    >
                                                        <Sparkles className="size-3.5 text-amber-500" />
                                                        <span>Load Suggested Tasks for {categoryName}</span>
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {requirements.map((req, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-800"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-extrabold text-blue-900">
                                                                {idx + 1}
                                                            </span>
                                                            <span className="truncate">{req}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeRequirement(idx)}
                                                            className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                                                            title="Remove task"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-1">
                                            <input
                                                type="text"
                                                value={newRequirementText}
                                                onChange={(e) => setNewRequirementText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addRequirement();
                                                    }
                                                }}
                                                placeholder={`Add task for ${categoryName}...`}
                                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden"
                                            />
                                            <button
                                                type="button"
                                                data-testid="add-requirement-btn"
                                                onClick={addRequirement}
                                                className="flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-900 hover:bg-blue-100 cursor-pointer"
                                            >
                                                <Plus className="size-3.5" />
                                                <span>Add</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Governed Pipeline Toggle & Full-Fledged Nominal Interface */}
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <label
                                                        htmlFor="pipeline-toggle"
                                                        className="text-xs font-extrabold text-[#0F2F58] cursor-pointer"
                                                    >
                                                        Attach Governed Work Pipeline
                                                    </label>
                                                    <FieldGuide guidance={REQUEST_FIELD_GUIDANCE.pipeline.guidance} mode={builderMode} />
                                                </div>
                                                <p className="text-[11px] text-slate-500">
                                                    Standard catalog template with milestone SLAs and photographic evidence gates.
                                                </p>
                                            </div>
                                            <input
                                                id="pipeline-toggle"
                                                data-testid="attach-pipeline-toggle"
                                                type="checkbox"
                                                checked={attachPipeline}
                                                onChange={(e) => setAttachPipeline(e.target.checked)}
                                                className="size-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </div>

                                        {attachPipeline && (
                                            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs pt-3">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EBF2FA] text-[#0F2F58]">
                                                            <Wrench className="size-4" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-xs font-extrabold text-[#0F2F58]">
                                                                {selectedTemplate.title}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800">
                                                                    Shape: {selectedTemplate.shape}
                                                                </span>
                                                                <span className="text-[10px] text-slate-500">{stages.length} steps</span>
                                                                {selectedTemplate.sla && (
                                                                    <span className="text-[10px] font-semibold text-slate-500">
                                                                        · {selectedTemplate.sla} target SLA
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            data-testid="browse-work-templates-btn"
                                                            onClick={() => setWorkModalOpen(true)}
                                                            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
                                                        >
                                                            <span>Browse Work Sets ▾</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            data-testid="customize-work-stages-btn"
                                                            onClick={() => setCustomizerModalOpen(true)}
                                                            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#0F2F58] px-3 py-1.5 text-xs font-extrabold text-white shadow-2xs hover:bg-[#153e74]"
                                                        >
                                                            <Sliders className="size-3 text-[#FFC72C]" />
                                                            <span>Customize Steps ({stages.length})</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Visual Pipeline Canvas */}
                                                <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5">
                                                    <WorkPipelineCanvas
                                                        stages={stages}
                                                        flowType={selectedTemplate.flowType || 'linear'}
                                                        onStageClick={() => setCustomizerModalOpen(true)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {builderMode === 'guided' && (
                                        <div className="flex justify-between pt-3">
                                            <button
                                                type="button"
                                                onClick={handlePrevStep}
                                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                            >
                                                <ArrowLeft className="size-4" />
                                                <span>Back</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleNextStep}
                                                disabled={!canContinueStep2}
                                                className="flex items-center gap-1.5 rounded-xl bg-[#0F2F58] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1a447c] active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                <span>Continue to Schedule</span>
                                                <ArrowRight className="size-4" />
                                            </button>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* STEP 3: Schedule & Location */}
                            {(builderMode === 'standard' || step === 3) && (
                                <section className="space-y-4 pt-4 border-t border-slate-100">
                                    {builderMode === 'guided' ? (
                                        <div className="space-y-1">
                                            <h2 className="text-lg font-extrabold text-[#0F2F58]">
                                                {REQUEST_GUIDED_STEPS[2].guidedTitle}
                                            </h2>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                {REQUEST_GUIDED_STEPS[2].guidedDescription}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                                                3. {REQUEST_GUIDED_STEPS[2].standardTitle}
                                            </h2>
                                        </div>
                                    )}

                                    {/* Timing Selection */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700">
                                                Urgency &amp; Timing
                                            </label>
                                            <FieldGuide guidance={REQUEST_FIELD_GUIDANCE.timing.guidance} mode={builderMode} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'today', label: 'Urgent (Today)' },
                                                { id: 'this_week', label: 'Flexible This Week' },
                                                { id: 'specific', label: 'Specific Date' },
                                            ].map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setUrgency(opt.id as typeof urgency)}
                                                    className={`rounded-xl border p-2.5 text-xs font-bold transition-all text-center cursor-pointer ${
                                                        urgency === opt.id
                                                            ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>

                                        {urgency === 'specific' && (
                                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="size-4 text-blue-600" />
                                                    <input
                                                        type="date"
                                                        data-testid="schedule-date-input"
                                                        value={scheduledDate}
                                                        onChange={(e) => setScheduledDate(e.target.value)}
                                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    {['Morning (8am - 12pm)', 'Afternoon (1pm - 5pm)', 'Anytime that day'].map((win) => (
                                                        <button
                                                            key={win}
                                                            type="button"
                                                            onClick={() => setScheduledTimeWindow(win)}
                                                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                                                                scheduledTimeWindow === win
                                                                    ? 'border-blue-600 bg-blue-100/70 text-blue-900'
                                                                    : 'border-slate-200 bg-white text-slate-600'
                                                            }`}
                                                        >
                                                            {win}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Location / Barangay */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label htmlFor="req-area" className="text-xs font-bold text-slate-700">
                                                Barangay / Location
                                            </label>
                                            <FieldGuide guidance={REQUEST_FIELD_GUIDANCE.location.guidance} mode={builderMode} />
                                        </div>
                                        <select
                                            id="req-area"
                                            data-testid="barangay-select"
                                            value={area}
                                            onChange={(e) => setArea(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                                        >
                                            <option value="Tagudin Centro">Barangay Tagudin Centro</option>
                                            {TAGUDIN_BARANGAYS_43.map((bg) => (
                                                <option key={bg.code} value={bg.name}>
                                                    Barangay {bg.name}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Privacy Notice */}
                                        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-2.5 text-xs text-blue-950 flex items-center gap-2">
                                            <Lock className="size-3.5 text-blue-600 shrink-0" />
                                            <span className="text-[11px] font-semibold text-blue-900">
                                                Only your barangay is visible during bidding. Street address is released upon award.
                                            </span>
                                        </div>
                                    </div>

                                    {builderMode === 'guided' && (
                                        <div className="flex justify-between pt-3">
                                            <button
                                                type="button"
                                                onClick={handlePrevStep}
                                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                            >
                                                <ArrowLeft className="size-4" />
                                                <span>Back</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleNextStep}
                                                disabled={!canContinueStep3}
                                                className="flex items-center gap-1.5 rounded-xl bg-[#0F2F58] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1a447c] active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                <span>Continue to Budget &amp; Rules</span>
                                                <ArrowRight className="size-4" />
                                            </button>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* STEP 4: Budget & Tender Rules */}
                            {(builderMode === 'standard' || step === 4) && (
                                <section className="space-y-4 pt-4 border-t border-slate-100">
                                    {builderMode === 'guided' ? (
                                        <div className="space-y-1">
                                            <h2 className="text-lg font-extrabold text-[#0F2F58]">
                                                {REQUEST_GUIDED_STEPS[3].guidedTitle}
                                            </h2>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                {REQUEST_GUIDED_STEPS[3].guidedDescription}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                                                4. {REQUEST_GUIDED_STEPS[3].standardTitle}
                                            </h2>
                                        </div>
                                    )}

                                    {/* Budget Mode */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700">
                                                Budget Semantics
                                            </label>
                                            <FieldGuide guidance={REQUEST_FIELD_GUIDANCE.budget.guidance} mode={builderMode} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2" data-testid="budget-mode-switcher">
                                            {[
                                                { id: 'estimate', label: 'Need Estimate' },
                                                { id: 'exact', label: 'Exact Budget' },
                                                { id: 'undisclosed', label: 'Undisclosed' },
                                            ].map((bm) => (
                                                <button
                                                    key={bm.id}
                                                    type="button"
                                                    onClick={() => setBudgetMode(bm.id as typeof budgetMode)}
                                                    className={`rounded-xl border p-2 text-xs font-bold text-center cursor-pointer transition-all ${
                                                        budgetMode === bm.id
                                                            ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {bm.label}
                                                </button>
                                            ))}
                                        </div>

                                        {budgetMode !== 'undisclosed' && (
                                            <div className="relative mt-2">
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 font-mono text-sm font-bold text-slate-400">
                                                    ₱
                                                </span>
                                                <input
                                                    type="number"
                                                    data-testid="budget-amount-input"
                                                    min="50"
                                                    max="500000"
                                                    step="10"
                                                    value={budget}
                                                    onChange={(e) => setBudget(e.target.value)}
                                                    placeholder="500.00"
                                                    className="w-full rounded-xl border border-slate-200 pl-8 pr-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Tender Privacy Mode */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700">
                                                Tender Privacy Mode
                                            </label>
                                            <FieldGuide guidance={REQUEST_FIELD_GUIDANCE.tenderMode.guidance} mode={builderMode} />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" data-testid="tender-mode-switcher">
                                            <button
                                                type="button"
                                                onClick={() => setTenderMode('open_tender')}
                                                className={`rounded-xl border p-3 text-left space-y-1 cursor-pointer transition-all ${
                                                    tenderMode === 'open_tender'
                                                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-1.5 font-extrabold text-xs">
                                                    <Unlock className="size-3.5 text-blue-600" />
                                                    <span>Open Tender</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-tight">
                                                    Public discovery. Providers see that others have bid and propose competitive offers.
                                                </p>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setTenderMode('sealed_tender')}
                                                className={`rounded-xl border p-3 text-left space-y-1 cursor-pointer transition-all ${
                                                    tenderMode === 'sealed_tender'
                                                        ? 'border-purple-600 bg-purple-50/70 text-purple-950 ring-2 ring-purple-500/20'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-1.5 font-extrabold text-xs">
                                                    <Lock className="size-3.5 text-purple-600" />
                                                    <span>Sealed Bidding</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-tight">
                                                    Blind proposals. Competitor quotes remain confidential until close.
                                                </p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Payment Lane */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 block">
                                            Payment Lane
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentLane('external_cash')}
                                                className={`rounded-xl border p-2.5 text-xs font-bold text-center cursor-pointer transition-all ${
                                                    paymentLane === 'external_cash'
                                                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                Cash on Delivery
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentLane('bilateral_escrow')}
                                                className={`rounded-xl border p-2.5 text-xs font-bold text-center cursor-pointer transition-all ${
                                                    paymentLane === 'bilateral_escrow'
                                                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                Bilateral Escrow
                                            </button>
                                        </div>
                                    </div>

                                    {builderMode === 'guided' && (
                                        <div className="flex justify-between pt-3">
                                            <button
                                                type="button"
                                                onClick={handlePrevStep}
                                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                            >
                                                <ArrowLeft className="size-4" />
                                                <span>Back</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleNextStep}
                                                disabled={!canContinueStep4}
                                                className="flex items-center gap-1.5 rounded-xl bg-[#0F2F58] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1a447c] active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                <span>Continue to Review</span>
                                                <ArrowRight className="size-4" />
                                            </button>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* STEP 5: Fulfillment & Review */}
                            {(builderMode === 'standard' || step === 5) && (
                                <section className="space-y-4 pt-4 border-t border-slate-100">
                                    {builderMode === 'guided' ? (
                                        <div className="space-y-1">
                                            <h2 className="text-lg font-extrabold text-[#0F2F58]">
                                                {REQUEST_GUIDED_STEPS[4].guidedTitle}
                                            </h2>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                {REQUEST_GUIDED_STEPS[4].guidedDescription}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                                                5. {REQUEST_GUIDED_STEPS[4].standardTitle}
                                            </h2>
                                        </div>
                                    )}

                                    {/* Sourcing / Fulfillment Choice */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700">
                                                Fulfillment &amp; Sourcing Preference
                                            </label>
                                            <FieldGuide guidance={REQUEST_FIELD_GUIDANCE.fulfillment.guidance} mode={builderMode} />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {[
                                                { id: 'direct', label: 'Direct On-Site' },
                                                { id: 'courier', label: 'Courier Runner' },
                                                { id: 'all', label: 'All Options' },
                                            ].map((f) => (
                                                <button
                                                    key={f.id}
                                                    type="button"
                                                    onClick={() => setPreferredFulfillment(f.id as typeof preferredFulfillment)}
                                                    className={`rounded-xl border p-2.5 text-xs font-bold text-center cursor-pointer transition-all ${
                                                        preferredFulfillment === f.id
                                                            ? 'border-blue-600 bg-blue-50 text-blue-900'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Review Summary Box */}
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                                            Summary Before Posting
                                        </span>
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Title</span>
                                                <span className="font-bold text-slate-800 line-clamp-1">{title || 'Untitled'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Category</span>
                                                <span className="font-bold text-slate-800">{categoryName}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Tender Mode</span>
                                                <span className="font-bold text-slate-800 capitalize">
                                                    {tenderMode.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Budget</span>
                                                <span className="font-bold text-slate-800">
                                                    {budgetMode === 'undisclosed' ? 'Undisclosed' : `₱${budget}`}
                                                </span>
                                            </div>
                                            {attachPipeline && (
                                                <div className="col-span-2 border-t border-slate-200/60 pt-2">
                                                    <span className="text-slate-400 block text-[10px]">Governed Pipeline</span>
                                                    <span className="font-bold text-teal-800">
                                                        {selectedTemplate.title} ({stages.length} stages · {selectedTemplate.sla || 'Standard'})
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        {builderMode === 'guided' && (
                                            <button
                                                type="button"
                                                onClick={handlePrevStep}
                                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                            >
                                                <ArrowLeft className="size-4" />
                                                <span>Back</span>
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            data-testid="submit-request-btn"
                                            disabled={isSubmitting || !title.trim()}
                                            className="ml-auto flex items-center gap-2 rounded-xl bg-[#0F2F58] px-6 py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#1a447c] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                                        >
                                            {isSubmitting ? (
                                                <span>Publishing Request...</span>
                                            ) : (
                                                <>
                                                    <Check className="size-4 text-emerald-400" />
                                                    <span>Publish Request</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </section>
                            )}
                        </form>
                    </main>

                    {/* RIGHT COLUMN: Desktop Live Preview (5 Cols) */}
                    <aside className="hidden lg:block lg:col-span-5 sticky top-20">
                        {renderLiveTwin()}
                    </aside>
                </div>
            </div>

            {/* Mobile Preview Bottom Modal */}
            {mobilePreviewOpen && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs lg:hidden">
                    <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <span className="text-xs font-extrabold uppercase text-[#0F2F58]">
                                Mobile Customer Preview
                            </span>
                            <button
                                type="button"
                                onClick={() => setMobilePreviewOpen(false)}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                        {renderLiveTwin()}
                    </div>
                </div>
            )}

            {/* Work Catalog Modal */}
            <WorkCatalogModal
                open={workModalOpen}
                onClose={() => setWorkModalOpen(false)}
                templates={allWorkTemplates}
                activeTemplateId={selectedTemplate.id}
                onSelect={handleSelectTemplate}
            />

            {/* Work Node Customizer Modal */}
            <WorkNodeCustomizerModal
                open={customizerModalOpen}
                onClose={() => setCustomizerModalOpen(false)}
                stages={stages}
                onSave={(newStages) => setStages(newStages)}
                flowType={selectedTemplate.flowType || 'linear'}
            />

            <BottomNavBar
                activeTab="explore"
                onTabSelect={(tab: NavTabId) => {
                    if (tab === 'explore') router.visit('/browse');
                    else if (tab === 'orders') router.visit('/orders');
                    else if (tab === 'profile') router.visit('/my-listings');
                    else if (tab === 'invitations') router.visit('/deal-invitations');
                }}
            />
        </div>
    );
}
