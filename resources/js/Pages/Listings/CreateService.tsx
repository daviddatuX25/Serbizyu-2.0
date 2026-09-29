import React, { useEffect, useState, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import {
    ArrowLeft,
    ArrowRight,
    Wrench,
    Plus,
    Trash2,
    ShieldCheck,
    Sliders,
    Sparkles,
    Check,
    Eye,
    Video,
    X,
} from 'lucide-react';
import { FieldGuide } from '../../components/ui/FieldGuide';
import {
    SERVICE_FIELD_GUIDANCE,
    SERVICE_GUIDED_STEPS,
    type BuilderMode,
} from '../../lib/builderGuidance';
import TagudinLocationPicker, { type StructuredGeography } from '../../components/listings/TagudinLocationPicker';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';
import { CreatorPostModal } from '../../components/marketplace/CreatorPostModal';
import { QuickDealScanModal } from '../../components/marketplace/QuickDealScanModal';
import {
    WorkPipelineCanvas,
    WorkNodeCustomizerModal,
    WorkCatalogModal,
    DealChainCarousel,
    DealChainCatalogModal,
    DealChainCustomizerModal,
    type WorkStage,
    type WorkTemplate,
    type DealChainCombination,
    type DealChainTemplate,
    type SlotType,
} from '../../components/mobile';
import { SlotListingPickerModal } from '../../components/marketplace/SlotListingPickerModal';
import type { SlotCandidateListing } from '../../marketplace/types';
import type { ListingMedia, ListingRecord, SliceSession } from '../../types';
import {
    CategoryVisualFallback,
    ListingMediaPicker,
    defaultMediaForCategory,
} from '../../components/listings/ListingMediaPicker';
import {
    clearPendingListingDraft,
    readPendingListingDraft,
    savePendingListingDraft,
} from '../../lib/pendingListingDraft';

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

interface ServiceBuilderDraft {
    version: 1;
    step: number;
    title: string;
    category: string;
    description: string;
    inclusions: string[];
    newInclusion: string;
    selectedTemplateId: string;
    selectedSetVersion?: number;
    stages: WorkStage[];
    builderMode?: BuilderMode | 'advanced' | 'simple';
    previewTab: 'card' | 'timeline';
    pricingMode: 'fixed' | 'range' | 'packages';
    fixedPrice: string;
    rangeMin: string;
    rangeMax: string;
    packageTiers: PackageTierForm[];
    addons: AddonForm[];
    combinations: DealChainCombination[];
    activeComboIndex: number;
    media?: ListingMedia;
    geography?: StructuredGeography;
}

interface DealChainOptionGroups {
    recommended: DealChainTemplate[];
    other_recipes: DealChainTemplate[];
}

interface PartnerListingOption {
    id: string;
    listingId?: string;
    role: string;
    name: string;
    providerName: string;
    barangay: string;
    price: number;
    feeMinor: number;
    rating: string;
    badge?: string;
    sub: string;
    coverThumbnailUrl?: string;
}

interface CreateServiceProps {
    session?: SliceSession | null;
    workCatalog?: unknown[];
    workOptions?: WorkOptionGroups;
    dealChainCatalog?: DealChainTemplate[];
    dealChainOptions?: DealChainOptionGroups;
    partnerListings?: PartnerListingOption[];
    editingDraft?: ListingRecord | null;
}
function isServiceBuilderDraft(value: unknown): value is ServiceBuilderDraft {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const draft = value as Partial<ServiceBuilderDraft>;

    return (
        draft.version === 1 &&
        typeof draft.step === 'number' &&
        draft.step >= 1 &&
        draft.step <= 7 &&
        typeof draft.title === 'string' &&
        typeof draft.category === 'string' &&
        typeof draft.description === 'string' &&
        Array.isArray(draft.inclusions) &&
        typeof draft.newInclusion === 'string' &&
        typeof draft.selectedTemplateId === 'string' &&
        Array.isArray(draft.stages) &&
        (draft.builderMode === undefined || draft.builderMode === 'guided' || draft.builderMode === 'standard' || draft.builderMode === 'advanced' || draft.builderMode === 'simple') &&
        (draft.previewTab === 'card' || draft.previewTab === 'timeline') &&
        (draft.pricingMode === 'fixed' || draft.pricingMode === 'range' || draft.pricingMode === 'packages') &&
        typeof draft.fixedPrice === 'string' &&
        typeof draft.rangeMin === 'string' &&
        typeof draft.rangeMax === 'string' &&
        Array.isArray(draft.packageTiers) &&
        Array.isArray(draft.addons) &&
        Array.isArray(draft.combinations) &&
        typeof draft.activeComboIndex === 'number'
    );
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

function toWorkTemplate(option: WorkSetOption): WorkTemplate {
    const categoryCodes = option.category_codes ?? [];
    const steps = option.steps ?? [];
    return {
        id: option.set_code || option.option_id || 'custom-template',
        category: categoryCodes[0] || '',
        title: option.title,
        shape: option.work_shape,
        categoryCodes,
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

const EMPTY_WORK_TEMPLATE: WorkTemplate = {
    id: '',
    category: '',
    title: '',
    shape: '',
    sla: '',
    flowType: 'linear',
    description: '',
    stages: [],
};

export default function CreateService({
    session,
    workOptions,
    dealChainOptions,
    partnerListings = [],
    editingDraft = null,
}: CreateServiceProps) {
    const allWorkTemplates = useMemo(
        () => [...(workOptions?.recommended ?? []), ...(workOptions?.other_archetypes ?? [])].map(toWorkTemplate),
        [workOptions],
    );
    const allDealChainRecipes = useMemo(
        () => [
            ...(dealChainOptions?.recommended ?? []),
            ...(dealChainOptions?.other_recipes ?? []),
        ],
        [dealChainOptions],
    );
    const slotCandidateListings = useMemo<SlotCandidateListing[]>(() => {
        if (!Array.isArray(partnerListings) || partnerListings.length === 0) {
            return [];
        }
        return partnerListings.map((item) => {
            const roleUpper = (item.role || 'store').toUpperCase();
            const mappedRole: SlotCandidateListing['role'] =
                roleUpper === 'DELIVERY' || roleUpper === 'COURIER'
                    ? 'COURIER'
                    : roleUpper === 'AUDIT' || roleUpper === 'AUDITOR'
                      ? 'AUDIT'
                      : roleUpper === 'LABOR' || roleUpper === 'TECHNICIAN'
                        ? 'LABOR'
                        : 'STORE';
            return {
                id: item.id,
                title: item.name,
                provider_name: item.providerName,
                area: item.barangay || 'Tagudin Centro',
                price_minor: item.feeMinor,
                sla_text: item.sub || 'Verified Tagudin partner listing',
                photo_url: item.coverThumbnailUrl,
                rating: parseFloat(item.rating || '4.9') || 4.9,
                role: mappedRole,
            };
        });
    }, [partnerListings]);
    const [step, setStep] = useState<number>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [creatorOpen, setCreatorOpen] = useState(false);
    const [quickDealOpen, setQuickDealOpen] = useState(false);

    // Step 1: Trade Identity & Scope
    const [title, setTitle] = useState(editingDraft?.title ?? '');
    const [category, setCategory] = useState(
        editingDraft?.category_code || editingDraft?.categoryCode || '',
    );
    const [description, setDescription] = useState(editingDraft?.description ?? '');
    const [media, setMedia] = useState<ListingMedia>(
        editingDraft?.media ??
            defaultMediaForCategory(
                editingDraft?.category_code || editingDraft?.categoryCode || 'repairs',
            ),
    );
    const [inclusions, setInclusions] = useState<string[]>(
        editingDraft?.inclusions && Array.isArray(editingDraft.inclusions) && editingDraft.inclusions.length > 0
            ? editingDraft.inclusions
            : [],
    );
    const [newInclusion, setNewInclusion] = useState('');
    // Work Pipeline Template & Canvas state
    const draftStages = editingDraft?.milestone_stages && Array.isArray(editingDraft.milestone_stages) && editingDraft.milestone_stages.length > 0
        ? (editingDraft.milestone_stages as unknown as WorkStage[])
        : (editingDraft?.milestoneStages && Array.isArray(editingDraft.milestoneStages) && editingDraft.milestoneStages.length > 0
            ? (editingDraft.milestoneStages as unknown as WorkStage[])
            : null);
    const initialTemplate =
        (editingDraft?.work_catalog_code
            ? allWorkTemplates.find((template) => template.id === editingDraft.work_catalog_code)
            : null) ??
        allWorkTemplates.find((template) => template.categoryCodes?.includes(category)) ??
        EMPTY_WORK_TEMPLATE;
    const [selectedTemplate, setSelectedTemplate] = useState<WorkTemplate>(initialTemplate);
    const [stages, setStages] = useState<WorkStage[]>(draftStages ?? initialTemplate.stages);
    const [workModalOpen, setWorkModalOpen] = useState(false);
    const [customizerModalOpen, setCustomizerModalOpen] = useState(false);
    const [previewTab, setPreviewTab] = useState<'card' | 'timeline'>('card');
    const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
    const [geography, setGeography] = useState<StructuredGeography | null>(
        (editingDraft?.geography as unknown as StructuredGeography) ?? null,
    );
    const [builderMode, setBuilderMode] = useState<BuilderMode>('guided');

    const suggestedWorkTemplates = useMemo(
        () => allWorkTemplates.filter((template) => template.categoryCodes?.includes(category)),
        [allWorkTemplates, category],
    );

    const isCustomizedFromTemplate = useMemo(() => {
        if (stages.length !== selectedTemplate.stages.length) return true;
        return stages.some((stage, index) => {
            const original = selectedTemplate.stages[index];
            if (!original) return true;
            return (
                JSON.stringify(Object.entries(stage).sort(([left], [right]) => left.localeCompare(right))) !==
                JSON.stringify(Object.entries(original).sort(([left], [right]) => left.localeCompare(right)))
            );
        });
    }, [stages, selectedTemplate]);

    const [pricingMode, setPricingMode] = useState<'fixed' | 'range' | 'packages'>(
        (editingDraft?.pricing_mode as any) || (editingDraft?.pricingMode as any) || 'packages',
    );
    const [fixedPrice, setFixedPrice] = useState(
        editingDraft?.price_amount_minor ? String(Math.round(editingDraft.price_amount_minor / 100)) : '',
    );
    const [rangeMin, setRangeMin] = useState('');
    const [rangeMax, setRangeMax] = useState('');
    const [packageTiers, setPackageTiers] = useState<PackageTierForm[]>(
        editingDraft?.package_tiers && Array.isArray(editingDraft.package_tiers) && editingDraft.package_tiers.length > 0
            ? (editingDraft.package_tiers as unknown as PackageTierForm[])
            : (editingDraft?.packageTiers && Array.isArray(editingDraft.packageTiers) && editingDraft.packageTiers.length > 0
                ? (editingDraft.packageTiers as unknown as PackageTierForm[])
                : [
                    {
                        id: 'tier-1',
                        title: '',
                        price: 0,
                        sub: '',
                        inclusions: [],
                    },
                ]),
    );

    const [addons, setAddons] = useState<AddonForm[]>(
        editingDraft?.addons && Array.isArray(editingDraft.addons) && editingDraft.addons.length > 0
            ? (editingDraft.addons as unknown as AddonForm[])
            : [
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
            ],
    );

    // Step 3: Deal Chain Combinations
    const [combinations, setCombinations] = useState<DealChainCombination[]>(
        editingDraft?.deal_chain_combinations && Array.isArray(editingDraft.deal_chain_combinations) && editingDraft.deal_chain_combinations.length > 0
            ? (editingDraft.deal_chain_combinations as unknown as DealChainCombination[])
            : [
        {
            id: 'combo-1',
            title: 'All-In Parts, Courier & Labor',
            icon: 'Wrench',
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
            icon: 'Truck',
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
    const [attachChainModalOpen, setAttachChainModalOpen] = useState(false);
    const [dealChainStudioOpen, setDealChainStudioOpen] = useState(false);
    const [customizingComboId, setCustomizingComboId] = useState<string | null>(null);
    const [slotPickerTarget, setSlotPickerTarget] = useState<{
        comboId: string;
        slotType: SlotType;
        onPickedOverride?: (partner: {
            id: string;
            title: string;
            providerName: string;
            priceMinor: number;
            photoUrl?: string;
            isOpenSlot?: boolean;
        }) => void;
    } | null>(null);
    const isAuthenticated = session?.authenticated === true || session?.isAuthenticated === true;
    const [draftRestored, setDraftRestored] = useState(false);

    useEffect(() => {
        if (editingDraft?.id) {
            return;
        }
        const pendingDraft = readPendingListingDraft('service');
        if (!isServiceBuilderDraft(pendingDraft)) return;

        const template = allWorkTemplates.find(
            (candidate) =>
                candidate.id === pendingDraft.selectedTemplateId &&
                (pendingDraft.selectedSetVersion === undefined ||
                    (candidate.setVersion ?? 1) === pendingDraft.selectedSetVersion),
        );
        if (!template) return;

        setStep(pendingDraft.step);
        if (pendingDraft.builderMode === 'standard' || pendingDraft.builderMode === 'advanced') {
            setBuilderMode('standard');
        } else if (pendingDraft.builderMode === 'guided') {
            setBuilderMode('guided');
        }
        setTitle(pendingDraft.title);
        setCategory(pendingDraft.category);
        setDescription(pendingDraft.description);
        setInclusions(pendingDraft.inclusions);
        setNewInclusion(pendingDraft.newInclusion);
        setSelectedTemplate(template);
        setStages(pendingDraft.stages);
        setPreviewTab(pendingDraft.previewTab);
        setPricingMode(pendingDraft.pricingMode);
        setFixedPrice(pendingDraft.fixedPrice);
        setRangeMin(pendingDraft.rangeMin);
        setRangeMax(pendingDraft.rangeMax);
        setPackageTiers(pendingDraft.packageTiers);
        setAddons(pendingDraft.addons);
        setCombinations(pendingDraft.combinations);
        if (pendingDraft.media) {
            setMedia(pendingDraft.media);
        }
        setActiveComboIndex(
            Math.min(
                Math.max(0, pendingDraft.activeComboIndex),
                Math.max(0, pendingDraft.combinations.length - 1),
            ),
        );
        setDraftRestored(true);
    }, []);
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
                id: `tier-${Date.now()}-${count}`,
                title: '',
                price: 0,
                sub: '',
                inclusions: [],
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

    // Deal Chain Slot Swap & Combo Handlers
    const handleSwapSlot = (candidate: SlotCandidateListing) => {
        if (!slotPickerTarget) return;
        if (slotPickerTarget.onPickedOverride) {
            slotPickerTarget.onPickedOverride({
                id: candidate.id,
                title: candidate.title,
                providerName: candidate.provider_name,
                priceMinor: candidate.price_minor,
                photoUrl: candidate.photo_url,
                isOpenSlot: false,
            });
            setSlotPickerTarget(null);
            return;
        }
        const shortName =
            candidate.provider_name.includes('Danny Express')
                ? 'Danny Exp'
                : candidate.provider_name.includes('Centro Eco')
                  ? 'Centro Eco'
                  : candidate.provider_name.includes('Tagudin Hardware')
                    ? 'Hardware'
                    : candidate.provider_name.includes('Kuya Ben')
                      ? 'Kuya Ben'
                      : candidate.provider_name.slice(0, 12);
        const priceStr = `₱${Math.round(candidate.price_minor / 100)}`;

        setCombinations((prev) =>
            prev.map((combo) => {
                if (combo.id !== slotPickerTarget.comboId) return combo;
                return {
                    ...combo,
                    isCustom: true,
                    basedOnTitle: combo.basedOnTitle || combo.title,
                    nodes: combo.nodes.map((n) => {
                        if (n.type !== slotPickerTarget.slotType) return n;
                        return {
                            ...n,
                            title: shortName,
                            sub: priceStr,
                            listingId: candidate.id,
                            feeMinor: candidate.price_minor,
                            coverThumbnailUrl: candidate.photo_url,
                        };
                    }),
                    slots: combo.slots.map((s) => {
                        if (s.type !== slotPickerTarget.slotType) return s;
                        return {
                            ...s,
                            name: candidate.title || candidate.provider_name,
                            meta: `₱${(candidate.price_minor / 100).toFixed(2)} · ${candidate.sla_text}`,
                            listingId: candidate.id,
                            feeMinor: candidate.price_minor,
                            coverThumbnailUrl: candidate.photo_url,
                            isOpenSlot: false,
                        };
                    }),
                };
            }),
        );
        setSlotPickerTarget(null);
    };

    const handleSelectOpenSlot = () => {
        if (!slotPickerTarget) return;
        if (slotPickerTarget.onPickedOverride) {
            slotPickerTarget.onPickedOverride({
                id: 'open-slot',
                title: 'Open Role Slot',
                providerName: 'Buyer selects at checkout',
                priceMinor: 0,
                isOpenSlot: true,
            });
            setSlotPickerTarget(null);
            return;
        }
        setCombinations((prev) =>
            prev.map((combo) => {
                if (combo.id !== slotPickerTarget.comboId) return combo;
                return {
                    ...combo,
                    isCustom: true,
                    basedOnTitle: combo.basedOnTitle || combo.title,
                    nodes: combo.nodes.map((n) =>
                        n.type === slotPickerTarget.slotType
                            ? { ...n, title: 'Open Slot', sub: 'Buyer picks', listingId: undefined }
                            : n,
                    ),
                    slots: combo.slots.map((s) =>
                        s.type === slotPickerTarget.slotType
                            ? {
                                  ...s,
                                  name: `Open ${s.role} Slot`,
                                  meta: 'Buyer selects partner at checkout',
                                  listingId: undefined,
                                  isOpenSlot: true,
                              }
                            : s,
                    ),
                };
            }),
        );
        setSlotPickerTarget(null);
    };

    const handleToggleComboDefault = (comboId: string) => {
        setCombinations((prev) =>
            prev.map((c) => ({
                ...c,
                isDefault: c.id === comboId,
            })),
        );
    };

    const handleRemoveCombo = (comboId: string) => {
        setCombinations((prev) => {
            const next = prev.filter((c) => c.id !== comboId);
            if (next.length > 0 && !next.some((c) => c.isDefault)) {
                next[0] = { ...next[0], isDefault: true };
            }
            return next;
        });
        setActiveComboIndex((prev) => Math.max(0, prev - 1));
    };

    const handleSelectDealChainRecipe = (recipe: DealChainTemplate) => {
        const primaryPesos = Math.round(effectivePriceMinor / 100);
        const newNodes: DealChainCombination['nodes'] = recipe.nodes.map((node) => {
            const isPrimary =
                node.key === 'labor' ||
                node.key === 'primary' ||
                node.title.toLowerCase().includes('primary');
            const isStore = node.type === 'store';
            const isCourier = node.type === 'delivery';
            const isAudit = node.type === 'audit';
            return {
                id: `node-${node.key}`,
                role: node.role.toUpperCase(),
                title: isPrimary ? 'Your Service' : node.title,
                sub: isPrimary
                    ? `₱${primaryPesos}`
                    : node.priceMinor
                      ? `₱${Math.round(node.priceMinor / 100)}`
                      : isStore
                        ? '₱180'
                        : isCourier
                          ? '₱35'
                          : isAudit
                            ? '₱150'
                            : 'Partner',
                type: node.type,
                bg: isStore || isAudit ? '#FEF3C7' : isCourier ? '#E0F2FE' : '#ECFDF5',
                color: isStore || isAudit ? '#B45309' : isCourier ? '#0284C7' : '#059669',
                listingId: node.listingId ?? undefined,
                feeMinor: node.priceMinor ?? undefined,
                coverThumbnailUrl: node.image ?? undefined,
                isPrimary,
            };
        });

        const newSlots: DealChainCombination['slots'] = recipe.nodes
            .filter(
                (node) =>
                    node.key !== 'labor' &&
                    node.key !== 'primary' &&
                    !node.title.toLowerCase().includes('primary'),
            )
            .map((node) => {
                const slotType: SlotType =
                    node.type === 'store'
                        ? 'store'
                        : node.type === 'delivery'
                          ? 'delivery'
                          : node.type === 'audit'
                            ? 'audit'
                            : 'installation';
                const defaultFee =
                    node.priceMinor ??
                    (slotType === 'store' ? 18000 : slotType === 'delivery' ? 3500 : 15000);
                return {
                    id: `slot-${node.key}`,
                    type: slotType,
                    role: `${node.role} Partner`,
                    name: node.providerName || node.title,
                    meta: `₱${(defaultFee / 100).toFixed(2)} partner fee`,
                    listingId: node.listingId ?? undefined,
                    feeMinor: defaultFee,
                    coverThumbnailUrl:
                        node.image ??
                        (slotType === 'store'
                            ? '/photos/ac-capacitor.jpg'
                            : slotType === 'delivery'
                              ? '/photos/courier.jpg'
                              : '/photos/req-electrician.jpg'),
                };
            });

        const newCombo: DealChainCombination = {
            id: `combo-${recipe.recipeId}-${Date.now()}`,
            title: recipe.title,
            icon: recipe.pattern === 'delivery' ? 'Truck' : recipe.pattern === 'audit' ? 'ShieldCheck' : 'Wrench',
            isDefault: combinations.length === 0,
            recipeId: recipe.recipeId,
            catalogVersion: recipe.catalogVersion || 1,
            isCustom: false,
            basedOnTitle: recipe.title,
            description: recipe.desc,
            nodes: newNodes,
            slots: newSlots,
        };
        setCombinations((prev) => [...prev, newCombo]);
        setActiveComboIndex(combinations.length);
        setAttachChainModalOpen(false);
    };
    // Derived effective base price in centavos
    const effectivePriceMinor =
        pricingMode === 'packages'
            ? Math.round((packageTiers[0]?.price || 0) * 100)
            : Math.round(parseFloat(fixedPrice || '0') * 100);

    const currentBuilderDraft = (): ServiceBuilderDraft => ({
        version: 1,
        step,
        title,
        category,
        description,
        inclusions,
        newInclusion,
        selectedTemplateId: selectedTemplate.id,
        selectedSetVersion: selectedTemplate.setVersion ?? 1,
        builderMode,
        stages,
        previewTab,
        pricingMode,
        fixedPrice,
        rangeMin,
        rangeMax,
        packageTiers,
        addons,
        combinations,
        activeComboIndex,
        media,
        geography: geography || undefined,
    });

    const redirectGuestToSignIn = (): void => {
        const saved = savePendingListingDraft('service', currentBuilderDraft());
        if (!saved) {
            setFormErrors({
                form: 'Sign in is required to save this draft. Keep this page open and retry after enabling session storage.',
            });
            return;
        }

        router.visit('/auth/sign-in?return_to=%2Flistings%2Fcreate%2Fservice');
    };

    // Form Submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (allWorkTemplates.length === 0 || !selectedTemplate.id) {
            setFormErrors({ work_catalog_code: 'No compatible published work set is available for this service.' });
            return;
        }
        if (!isAuthenticated) {
            redirectGuestToSignIn();
            return;
        }
        setIsSubmitting(true);

        const effectiveDescription =
            description.trim().length >= 10
                ? description.trim()
                : `${title.trim()} — Professional ${category} service in Tagudin, Ilocos Sur. Governed under ${selectedTemplate.title} with photo milestone evidence.`;


        const payload: Record<string, FormDataConvertible> = {
            title: title.trim(),
            description: effectiveDescription,
            category_code: category,
            listing_type: 'service',
            work_catalog_code: selectedTemplate.id,
            work_set_version: selectedTemplate.setVersion ?? 1,
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
            media: media as unknown as FormDataConvertible,
            deal_chain_combinations: combinations as unknown as FormDataConvertible,
            deal_chain_specification: {
                based_on_recipe_code:
                    combinations.find((c) => c.isDefault)?.recipeId ??
                    combinations[0]?.recipeId ??
                    'turnkey_parts',
                based_on_catalog_version:
                    combinations.find((c) => c.isDefault)?.catalogVersion ??
                    combinations[0]?.catalogVersion ??
                    1,
                is_custom_variation: combinations.some((c) => c.isCustom),
                combination_count: combinations.length,
            } as unknown as FormDataConvertible,
            geography: (geography || {
                area_code: 'Tagudin',
            }) as unknown as FormDataConvertible,
        };

        if (editingDraft?.id) {
            router.patch(
                `/listings/${editingDraft.id}`,
                {
                    ...payload,
                    expected_version:
                        editingDraft.expected_version ??
                        editingDraft.expectedVersion ??
                        editingDraft.version ??
                        1,
                },
                {
                    onError: (errs) => {
                        setIsSubmitting(false);
                        setFormErrors(errs);
                    },
                    onSuccess: () => {
                        clearPendingListingDraft('service');
                        router.visit(`/my-listings/${editingDraft.id}`);
                    },
                },
            );
            return;
        }

        router.post('/listings', payload, {
            onError: (errs) => {
                setIsSubmitting(false);
                if (typeof errs.form === 'string' && /sign in/i.test(errs.form)) {
                    redirectGuestToSignIn();
                    return;
                }
                setFormErrors(errs);
                if (errs.title || errs.category_code || errs.description) {
                    setStep(1);
                } else if (errs.price_amount_minor || errs.pricing_mode) {
                    setStep(2);
                }
            },
            onSuccess: () => {
                clearPendingListingDraft('service');
                setDraftRestored(false);
            },
        });
    };

    const renderCustomerLiveTwin = () => (
        <div className="space-y-4">
            {/* Header & Mode Switcher */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                    <div>
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0F2F58] uppercase tracking-wider">
                            <Eye className="size-3.5 text-emerald-600" />
                            <span>Live Listing Preview</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                            How your listing looks to customers
                        </p>
                    </div>
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
                        <span>Marketplace Card</span>
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
                        <span>Work Steps ({stages.length})</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: Marketplace Card Preview */}
            {previewTab === 'card' && (
                <div className="space-y-3.5">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                        <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                            {media.cover_thumbnail_url ? (
                                <img
                                    src={media.cover_thumbnail_url}
                                    alt={title || 'Trade Service'}
                                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                />
                            ) : (
                                <CategoryVisualFallback
                                    categoryCode={category}
                                    title={title || 'Service Offering'}
                                />
                            )}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                <span className="rounded-full bg-[#0F2F58]/90 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur uppercase">
                                    Service Offering
                                </span>
                                {media.has_video && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur uppercase">
                                        <Video className="size-3 text-[#FFC72C]" />
                                        <span>Video</span>
                                    </span>
                                )}
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
                                {title.trim() || 'Untitled Service'}
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
                                {selectedTemplate.sla && <span className="text-[11px] font-bold text-slate-500">{selectedTemplate.sla} target</span>}
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
                                        {stage.dur && <span className="font-semibold text-slate-600">{stage.dur} target estimate</span>}
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

    if (allWorkTemplates.length === 0) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] p-6">
                <main className="mx-auto mt-16 max-w-xl rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
                    <h1 className="text-lg font-extrabold text-slate-900">No compatible work set is available</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        A published work set compatible with service listings is required before you can create or save this draft.
                    </p>
                    <Link href="/browse" className="mt-5 inline-flex rounded-xl bg-[#0F2F58] px-4 py-2.5 text-sm font-bold text-white">Return to Browse</Link>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 pb-16">
            <DesktopGlobalNav activeRoute="create_listing" />

            <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:py-6 space-y-6">
                {/* Top Studio Control Bar */}
                {/* Compact 1-Row Sticky Header */}
                <header
                    data-testid="builder-header"
                    className="sticky top-0 z-30 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-2.5 shadow-xs backdrop-blur-md"
                >
                    {/* Left: Change Type + Title + Step indicator */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Link
                            href="/listings/create"
                            className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 cursor-pointer"
                            title="Change Type"
                        >
                            <ArrowLeft className="size-4" />
                        </Link>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-extrabold text-[#0F2F58] shrink-0">
                                    Service Listing
                                </span>
                                {builderMode === 'guided' ? (
                                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900">
                                        Step {step} of 7 · {SERVICE_GUIDED_STEPS[step - 1]?.shortTitle}
                                    </span>
                                ) : (
                                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                        Standard Form
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Mode Switcher */}
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

                    {/* Mobile Preview Button in Top Header */}
                    <button
                        type="button"
                        onClick={() => setMobilePreviewOpen(true)}
                        className="sm:hidden flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 cursor-pointer shrink-0"
                        title="Preview Live Customer View"
                    >
                        <Eye className="size-3.5 text-emerald-600" />
                        <span>Preview</span>
                    </button>
                </header>

                {/* Guided Mode Slim Progress Bar */}
                {builderMode === 'guided' && (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200/70 -mt-3">
                        <div
                            className="h-full bg-[#0F2F58] transition-all duration-300 ease-out"
                            style={{ width: `${(step / 7) * 100}%` }}
                        />
                    </div>
                )}

                {/* Responsive 2-Column Grid */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
                    {/* LEFT COLUMN: Form Studio (Cols 1-7) */}
                    <main className="rounded-2xl border border-slate-200/80 bg-white p-5 lg:col-span-7 lg:p-7 shadow-xs space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                        {(builderMode === 'standard' || step === 1) && (
                            <div className="space-y-4">
                                {builderMode === 'guided' ? (
                                    <div>
                                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                                            {SERVICE_GUIDED_STEPS[0].guidedTitle}
                                        </h2>
                                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                            {SERVICE_GUIDED_STEPS[0].guidedDescription}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                                            Trade Scope &amp; Craft
                                        </h2>
                                    </div>
                                )}

                                {formErrors.title && (
                                    <p className="text-xs font-bold text-red-600">{formErrors.title}</p>
                                )}

                                {/* Service Title */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-700">
                                            Service Title
                                        </label>
                                        {builderMode === 'standard' && (
                                            <FieldGuide
                                                guidance={SERVICE_FIELD_GUIDANCE.title.guidance}
                                                mode="standard"
                                            />
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        data-testid="service-title-input"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={builderMode === 'guided' ? 'e.g. Inverter Split AC Deep Clean, Bread Catering, or Pipe Repair' : ''}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                    />
                                </div>

                                {/* Trade Category */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="trade-category" className="text-xs font-bold text-slate-700">
                                            Trade Category
                                        </label>
                                        {builderMode === 'standard' && (
                                            <FieldGuide
                                                guidance={SERVICE_FIELD_GUIDANCE.category.guidance}
                                                mode="standard"
                                            />
                                        )}
                                    </div>
                                    <select
                                        id="trade-category"
                                        value={category}
                                        onChange={(e) => {
                                            const nextCategory = e.target.value;
                                            setCategory(nextCategory);
                                            setMedia((prev) => {
                                                if (!prev.cover_thumbnail_url?.startsWith('/photos/')) {
                                                    return prev;
                                                }
                                                const nextDefault = defaultMediaForCategory(nextCategory);
                                                const existingVideos = prev.items.filter(
                                                    (item) => item.kind === 'video',
                                                );
                                                return {
                                                    ...nextDefault,
                                                    has_video: existingVideos.length > 0,
                                                    items: [...nextDefault.items, ...existingVideos],
                                                };
                                            });
                                            const firstMatch = allWorkTemplates.find((template) =>
                                                template.categoryCodes?.includes(nextCategory),
                                            );
                                            setSelectedTemplate(firstMatch ?? EMPTY_WORK_TEMPLATE);
                                            setStages(firstMatch?.stages ?? []);
                                        }}
                                        className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                    >
                                        <option value="" disabled>Select trade category...</option>
                                        <option value="repairs">Repairs &amp; Appliance Care</option>
                                        <option value="home-cleaning">Cleaning &amp; Home Help</option>
                                        <option value="courier">Courier &amp; Delivery</option>
                                        <option value="print-assist">Document &amp; Print Assistance</option>
                                        <option value="local-services">Errands &amp; General Local Services</option>
                                        <option value="greeting-cards">Handmade Cards &amp; Crafts</option>
                                    </select>
                                </div>

                                {/* Detailed Description */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="service-description" className="text-xs font-bold text-slate-700">
                                            Detailed Description
                                        </label>
                                        {builderMode === 'standard' && (
                                            <FieldGuide
                                                guidance={SERVICE_FIELD_GUIDANCE.description.guidance}
                                                mode="standard"
                                            />
                                        )}
                                    </div>
                                    <textarea
                                        id="service-description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder={builderMode === 'guided' ? 'Mention trade certifications, experience, or what clients should prepare before arrival...' : ''}
                                        className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] p-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                    />
                                </div>

                                {builderMode === 'guided' && (
                                    <button
                                        type="button"
                                        disabled={!title.trim()}
                                        onClick={() => setStep(2)}
                                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] py-3 text-xs font-bold text-slate-950 shadow-xs transition-colors hover:bg-[#e6b327] disabled:opacity-50"
                                    >
                                        <span>Continue to Visual Proof</span>
                                        <ArrowRight className="size-3.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* STEP 2: Visual Proof & Media */}
                        {(builderMode === 'standard' || step === 2) && (
                            <div className={`space-y-4 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}>
                                {builderMode === 'guided' ? (
                                    <div>
                                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                                            {SERVICE_GUIDED_STEPS[1].guidedTitle}
                                        </h2>
                                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                            {SERVICE_GUIDED_STEPS[1].guidedDescription}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                            Media Attachments
                                        </label>
                                        <FieldGuide
                                            guidance={SERVICE_FIELD_GUIDANCE.media.guidance}
                                            mode="standard"
                                        />
                                    </div>
                                )}

                                <ListingMediaPicker
                                    media={media}
                                    categoryCode={category}
                                    listingType="service"
                                    onChange={setMedia}
                                />

                                {builderMode === 'guided' && (
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
                                            Continue to Work Plan
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 3: Work Execution Plan */}
                        {(builderMode === 'standard' || step === 3) && (
                            <section className={`space-y-3.5 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}>
                                {builderMode === 'guided' ? (
                                    <div>
                                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                                            {SERVICE_GUIDED_STEPS[2].guidedTitle}
                                        </h2>
                                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                            {SERVICE_GUIDED_STEPS[2].guidedDescription}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                            Work Execution Plan
                                        </h3>
                                        <FieldGuide
                                            guidance={SERVICE_FIELD_GUIDANCE.workPlan.guidance}
                                            mode="standard"
                                        />
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700">Choose Reusable Work Workflow</span>
                                    <button
                                        type="button"
                                        onClick={() => setWorkModalOpen(true)}
                                        className="rounded-lg border border-[#0F2F58] px-3 py-1.5 text-xs font-bold text-[#0F2F58] hover:bg-[#EBF2FA]"
                                    >
                                        Browse All Compatible Sets
                                    </button>
                                </div>

                                    {suggestedWorkTemplates.length === 0 ? (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                            <p className="text-sm font-bold text-amber-950">
                                                No category-specific work sets for {category === 'courier' ? 'Courier & Delivery' : category} yet
                                            </p>
                                            <p className="mt-1 text-xs text-amber-900">
                                                Browse compatible service work sets to choose a workflow for this listing.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setWorkModalOpen(true)}
                                                className="mt-3 rounded-lg bg-[#0F2F58] px-4 py-2 text-xs font-bold text-white hover:bg-[#153e74]"
                                            >
                                                Browse All Compatible Service Work Sets
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                            {suggestedWorkTemplates.map((tmpl) => {
                                                const isSelected = selectedTemplate.id === tmpl.id;
                                                return (
                                                    <button
                                                        key={tmpl.id}
                                                        type="button"
                                                        onClick={() => handleSelectTemplate(tmpl)}
                                                        className={`rounded-xl border p-3 text-left transition-all ${
                                                            isSelected
                                                                ? 'border-[#0F2F58] bg-[#EBF2FA]/60 ring-2 ring-[#0F2F58]/20'
                                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span className="text-xs font-extrabold text-slate-900">{tmpl.title}</span>
                                                            {tmpl.sla && (
                                                                <span className="shrink-0 text-[10px] font-semibold text-slate-500">
                                                                    {tmpl.sla} target
                                                                 </span>
                                                            )}
                                                        </div>
                                                        <p className="mt-1 text-[10.5px] text-slate-500">{tmpl.description}</p>
                                                        <div className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                                                            {tmpl.stages.length} steps
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {selectedTemplate.id && (
                                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-[#FAFCFB] p-3.5 shadow-2xs">
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
                                                            <span
                                                                className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${
                                                                    isCustomizedFromTemplate
                                                                        ? 'border border-amber-300 bg-amber-100 text-amber-900'
                                                                        : 'bg-emerald-100 text-emerald-800'
                                                                }`}
                                                            >
                                                                {isCustomizedFromTemplate ? 'Custom for this listing' : 'Published Work Set'}
                                                            </span>
                                                            {isCustomizedFromTemplate && (
                                                                <span className="text-[10px] text-slate-500">
                                                                    Based on {selectedTemplate.title}
                                                                    {selectedTemplate.setVersion ? ` v${selectedTemplate.setVersion}` : ''}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] text-slate-500">{stages.length} steps</span>
                                                            {selectedTemplate.sla && (
                                                                <span className="text-[10px] font-semibold text-slate-500">
                                                                    · {selectedTemplate.sla} target
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomizerModalOpen(true)}
                                                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#0F2F58] px-3.5 py-2 text-xs font-extrabold text-white shadow-2xs hover:bg-[#153e74]"
                                                >
                                                    <Sliders className="size-3.5 text-[#FFC72C]" />
                                                    <span>Customize Work Steps ({stages.length})</span>
                                                </button>
                                            </div>

                                            {/* Visual Pipeline Canvas */}
                                            <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-2.5">
                                                <WorkPipelineCanvas
                                                    stages={stages}
                                                    flowType={selectedTemplate.flowType}
                                                    onStageClick={() => setCustomizerModalOpen(true)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                {builderMode === 'guided' && (
                                    <div className="flex gap-2.5 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!selectedTemplate.id}
                                            onClick={() => setStep(4)}
                                            className="flex-1 cursor-pointer rounded-xl bg-[#FFC72C] py-3 text-xs font-bold text-slate-950 shadow-xs hover:bg-[#e6b327] disabled:opacity-50"
                                        >
                                            Continue to Deliverables
                                        </button>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* STEP 4: Deliverables Checklist */}
                        {(builderMode === 'standard' || step === 4) && (
                            <div className={`space-y-3 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}>
                                {builderMode === 'guided' ? (
                                    <div>
                                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                                            {SERVICE_GUIDED_STEPS[3].guidedTitle}
                                        </h2>
                                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                            {SERVICE_GUIDED_STEPS[3].guidedDescription}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                            Deliverables Checklist ({inclusions.length})
                                        </label>
                                        <FieldGuide
                                            guidance={SERVICE_FIELD_GUIDANCE.inclusions.guidance}
                                            mode="standard"
                                        />
                                    </div>
                                )}

                                    {inclusions.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                                            <p className="text-xs font-semibold text-slate-500">
                                                No deliverables added yet.
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-slate-400">
                                                Add what you physically perform for clients (e.g. Site Inspection, Labor, Parts Cleaning, or Handover).
                                            </p>
                                        </div>
                                    ) : (
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
                                    )}

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
                                            placeholder="Add a deliverable (e.g. Free inspection, Labor included)..."
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
                                {builderMode === 'guided' && (
                                    <div className="flex gap-2.5 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setStep(3)}
                                            className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStep(5)}
                                            className="flex-1 cursor-pointer rounded-xl bg-[#FFC72C] py-3 text-xs font-bold text-slate-950 shadow-xs hover:bg-[#e6b327]"
                                        >
                                            Continue to Base Location
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 5: Service Base & Dispatch Location */}
                        {(builderMode === 'standard' || step === 5) && (
                            <div className={`space-y-4 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}>
                                {builderMode === 'guided' ? (
                                    <div>
                                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                                            {SERVICE_GUIDED_STEPS[4].guidedTitle}
                                        </h2>
                                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                            {SERVICE_GUIDED_STEPS[4].guidedDescription}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                            Service Base &amp; Dispatch Location
                                        </span>
                                        <FieldGuide
                                            guidance={SERVICE_FIELD_GUIDANCE.geography.guidance}
                                            mode="standard"
                                        />
                                    </div>
                                )}

                                <TagudinLocationPicker
                                    value={geography}
                                    initialAddress="Tagudin Centro, Poblacion"
                                    locationLabel={builderMode === 'guided' ? 'Service Base Barangay' : 'Service Base & Dispatch Location'}
                                    addressPlaceholder="e.g. Master Tech Workshop, Rizal, Tagudin"
                                    onChange={setGeography}
                                />


                                {builderMode === 'guided' && (
                                    <div className="flex gap-2.5 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setStep(4)}
                                            className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStep(6)}
                                            className="flex-1 cursor-pointer rounded-xl bg-[#FFC72C] py-3 text-xs font-bold text-slate-950 shadow-xs hover:bg-[#e6b327]"
                                        >
                                            Continue to Pricing
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                    {/* STEP 6: Pricing & Rates */}
                    {(builderMode === 'standard' || step === 6) && (
                        <div className={`space-y-4 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}>
                            {builderMode === 'guided' ? (
                                <div>
                                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                                        {SERVICE_GUIDED_STEPS[5].guidedTitle}
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                        {SERVICE_GUIDED_STEPS[5].guidedDescription}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                        Pricing Model &amp; Rates
                                    </label>
                                    <FieldGuide
                                        guidance={SERVICE_FIELD_GUIDANCE.pricing.guidance}
                                        mode="standard"
                                    />
                                </div>
                            )}

                                {/* Pricing Mode Switcher */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-700">
                                            {builderMode === 'guided'
                                                ? SERVICE_FIELD_GUIDANCE.pricing.guidedLabel
                                                : SERVICE_FIELD_GUIDANCE.pricing.advancedLabel}
                                        </label>
                                        <FieldGuide
                                            guidance={SERVICE_FIELD_GUIDANCE.pricing.guidance}
                                            mode={builderMode}
                                        />
                                    </div>
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
                                        placeholder="e.g. 450"
                                        min="0"
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
                                            placeholder="e.g. 350"
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
                                            placeholder="e.g. 700"
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
                                                        placeholder="Tier name (e.g. Basic, Standard, Full Day)..."
                                                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-extrabold text-slate-900 outline-none focus:border-[#0F2F58]"
                                                    />
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        <span className="text-xs font-bold text-slate-500">
                                                            ₱
                                                        </span>
                                                        <input
                                                            type="number"
                                                            value={tier.price === 0 ? '' : tier.price}
                                                            onChange={(e) =>
                                                                updateTier(
                                                                    idx,
                                                                    'price',
                                                                    e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                                                                )
                                                            }
                                                            placeholder="0.00"
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
                                                    placeholder="Tier scope or inclusions (e.g. 2 hours labor, photo sign-off)..."
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

                            {builderMode === 'guided' && (
                                <div className="flex gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep(5)}
                                        className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        disabled={pricingMode === 'fixed' && !fixedPrice}
                                        onClick={() => setStep(7)}
                                        className="flex-1 cursor-pointer rounded-xl bg-[#FFC72C] py-3 text-xs font-bold text-slate-950 shadow-xs hover:bg-[#e6b327] disabled:opacity-50"
                                    >
                                        Continue to Partners
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 7: Partner Extensions & Review */}
                    {(builderMode === 'standard' || step === 7) && (
                        <div className={`space-y-4 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}>
                            {builderMode === 'guided' ? (
                                <div>
                                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                                        {SERVICE_GUIDED_STEPS[6].guidedTitle}
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                        {SERVICE_GUIDED_STEPS[6].guidedDescription}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                        Partnered Deal Chains &amp; Summary
                                    </label>
                                    <FieldGuide
                                        guidance={SERVICE_FIELD_GUIDANCE.dealChain.guidance}
                                        mode="standard"
                                    />
                                </div>
                            )}
                            {!isAuthenticated && (
                                <div
                                    data-testid="guest-save-notice"
                                    role="status"
                                    className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-xs text-blue-950"
                                >
                                    Sign in is required to save. Your work will be restored when you return.
                                </div>
                            )}

                            {draftRestored && (
                                <div
                                    data-testid="draft-restored-notice"
                                    role="status"
                                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-semibold text-emerald-950"
                                >
                                    {isAuthenticated
                                        ? 'Draft restored. Select Save Private Draft to create it.'
                                        : 'Draft restored. Sign in to save it.'}
                                </div>
                            )}

                            {formErrors.form && (
                                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-semibold text-red-800">
                                    {formErrors.form}
                                </div>
                            )}

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
                                    onToggleDefault={handleToggleComboDefault}
                                    onRemoveCombo={handleRemoveCombo}
                                    onAddComboClick={() => setAttachChainModalOpen(true)}
                                    onCustomizeComboClick={(comboId) => {
                                        setCustomizingComboId(comboId);
                                        setDealChainStudioOpen(true);
                                    }}
                                />
                            </div>

                            {/* Summary Review Card */}
                            <div className="space-y-3 rounded-2xl border border-slate-200 bg-[#FAFCFB] p-4 shadow-xs">
                                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                                    <span className="rounded-full bg-[#EBF2FA] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F2F58] uppercase">
                                        {category}
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

                            {builderMode === 'guided' ? (
                                <div className="flex gap-2.5 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep(6)}
                                        className="cursor-pointer rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !title.trim()}
                                        className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0F2F58] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#153e74] disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Saving listing...' : isAuthenticated ? 'Publish Service Listing' : 'Sign in to Publish'}
                                    </button>
                                </div>
                            ) : (
                                <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-md">
                                    <div>
                                        <span className="text-xs font-extrabold text-[#0F2F58]">Standard All-in-One Form</span>
                                        <p className="text-[11px] text-slate-500">All sections visible · Ready to save</p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !title.trim() || !selectedTemplate.id}
                                        className="cursor-pointer rounded-xl bg-[#0F2F58] px-6 py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#153e74] disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Saving draft...' : isAuthenticated ? 'Save Private Draft' : 'Sign in to Save Draft'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    </form>
                        {/* Bottom Mode Switcher for Mobile & Desktop */}
                        {/* Bottom Mode Switcher for Mobile only */}
                        <div className="sm:hidden flex justify-center border-t border-slate-100 pt-3 pb-1">
                            <button
                                type="button"
                                data-testid="bottom-mode-switcher-btn"
                                onClick={() => setBuilderMode((m) => (m === 'guided' ? 'standard' : 'guided'))}
                                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                            >
                                <span>⚡</span>
                                <span>
                                    {builderMode === 'guided'
                                        ? 'Switch to all-in-one standard form'
                                        : 'Switch to step-by-step guided mode'}
                                </span>
                            </button>
                        </div>
                    </main>

                    {/* RIGHT COLUMN: Customer Live Twin (Cols 8-12, Sticky on Desktop) */}
                    <aside className="sticky top-20 hidden space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-5 lg:block">
                        {renderCustomerLiveTwin()}
                    </aside>
                </div>


                {/* Mobile Customer Twin Modal Sheet */}
                {mobilePreviewOpen && (
                    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/60 backdrop-blur-xs lg:hidden">
                        <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <span className="font-extrabold text-[#0F2F58] text-sm">Live Listing Preview</span>
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

                <CreatorPostModal open={creatorOpen} onClose={() => setCreatorOpen(false)} />
                <QuickDealScanModal open={quickDealOpen} onClose={() => setQuickDealOpen(false)} />

                {/* Work Catalog Modal */}
                <WorkCatalogModal
                    open={workModalOpen}
                    onClose={() => setWorkModalOpen(false)}
                    templates={allWorkTemplates}
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
                    candidates={slotCandidateListings.length > 0 ? slotCandidateListings : undefined}
                    onSelectCandidate={handleSwapSlot}
                    onSelectOpenSlot={handleSelectOpenSlot}
                />

                {/* Deal Chain Catalog Modal */}
                <DealChainCatalogModal
                    open={attachChainModalOpen}
                    onClose={() => setAttachChainModalOpen(false)}
                    categoryCode={category}
                    recommended={(dealChainOptions?.recommended ?? []).filter(
                        (r) =>
                            r.applicableCategories.includes(category) ||
                            r.applicableCategories.length === 0,
                    )}
                    otherRecipes={allDealChainRecipes}
                    onSelectRecipe={handleSelectDealChainRecipe}
                    onBuildCustom={() => {
                        setCustomizingComboId(null);
                        setDealChainStudioOpen(true);
                    }}
                />

                {/* Deal Chain Customizer Studio Modal */}
                <DealChainCustomizerModal
                    open={dealChainStudioOpen}
                    onClose={() => {
                        setDealChainStudioOpen(false);
                        setCustomizingComboId(null);
                    }}
                    combination={
                        customizingComboId
                            ? combinations.find((c) => c.id === customizingComboId) ?? null
                            : null
                    }
                    primaryListingTitle={title}
                    primaryListingPricePesos={Math.round(effectivePriceMinor / 100)}
                    primaryListingType="service"
                    onSave={(updatedCombo) => {
                        setCombinations((prev) => {
                            const exists = prev.some((c) => c.id === updatedCombo.id);
                            if (exists) {
                                return prev.map((c) =>
                                    c.id === updatedCombo.id ? updatedCombo : c,
                                );
                            }
                            const next = [...prev, updatedCombo];
                            setActiveComboIndex(next.length - 1);
                            return next;
                        });
                    }}
                    onPickPartnerForSlot={(slotType, onPicked) => {
                        setSlotPickerTarget({
                            comboId: customizingComboId || 'studio-new',
                            slotType,
                            onPickedOverride: onPicked,
                        });
                    }}
                />
            </div>
        </div>
    );
}
