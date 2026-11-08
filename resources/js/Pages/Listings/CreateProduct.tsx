import React, { useEffect, useState, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import {
    ArrowLeft,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    Eye,
    Info,
    Package,
    Plus,
    ShieldCheck,
    Sliders,
    Store,
    Trash2,
    Truck,
    Video,
    Wrench,
} from 'lucide-react';
import { FieldGuide } from '../../components/ui/FieldGuide';
import {
    PRODUCT_FIELD_GUIDANCE,
    PRODUCT_GUIDED_STEPS,
    type BuilderMode,
} from '../../lib/builderGuidance';
import BuilderModeToggle from '../../components/listings/BuilderModeToggle';
import { formatProviderShortName } from '../../lib/formatters';
import TagudinLocationPicker, {
    type StructuredGeography,
} from '../../components/listings/TagudinLocationPicker';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';
import { CreatorPostModal } from '../../components/marketplace/CreatorPostModal';
import { QuickDealScanModal } from '../../components/marketplace/QuickDealScanModal';
import {
    DealChainCatalogModal,
    DealChainCustomizerModal,
    GlovoWaveModal,
    type DealChainCombination,
    type DealChainNode,
    type DealChainTemplate,
    type PartnerSlot as DealChainPartnerSlot,
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
import { isRecipeCompatible, savedCombinationSlots } from '../../marketplace/dealChainRecipes';

interface ProductVariantForm {
    id: string;
    name: string;
    price: number;
    stock: number;
    isDefault: boolean;
}

export interface PartnerSlot {
    id: string;
    roleType: 'STORE' | 'COURIER' | 'LABOR' | 'AUDIT' | 'RECYCLE';
    slotLabel: string;
    providerName: string;
    fee?: number | null;
    feeMinor?: number | null;
    rating?: number | null;
    slaText?: string;
    photoUrl?: string;
    listingId?: string;
    listingVersionId?: string | null;
    isOpenSlot?: boolean;
    assignmentMode?: DealChainPartnerSlot['assignmentMode'];
}

export interface PartnerCombo {
    id: string;
    title: string;
    icon: string;
    description: string;
    isDefault: boolean;
    slots: PartnerSlot[];
    recipeId?: string;
    catalogVersion?: number;
    planVersion?: 1;
    isCustom?: boolean;
    basedOnTitle?: string;
    nodes?: DealChainNode[];
    dependencies?: DealChainCombination['dependencies'];
    flowType?: DealChainCombination['flowType'];
}

interface ProductBuilderDraft {
    version: 1;
    step: number;
    title: string;
    category: string;
    description: string;
    stallLocation: string;
    variants: ProductVariantForm[];
    combos: PartnerCombo[];
    selectedFulfillment: string;
    currentComboIdx: number;
    media?: ListingMedia;
    builderMode?: BuilderMode | 'advanced' | 'simple';
    geography?: StructuredGeography;
}

interface PartnerListingOption {
    id: string;
    listingId?: string;
    listingVersionId?: string | null;
    listing_version_id?: string | null;
    role: string;
    name: string;
    providerName: string;
    barangay: string;
    price?: number | null;
    feeMinor?: number | null;
    rating?: string | number | null;
    badge?: string;
    sub: string;
    coverThumbnailUrl?: string;
}

interface DealChainOptionGroups {
    recommended: DealChainTemplate[];
    other_recipes: DealChainTemplate[];
}
export interface WorkStepOption {
    id: string;
    ordinal?: number;
    title: string;
    description: string;
    node_kind?: string;
    evidence_type?: string;
    evidence_description?: string;
    control_mode?: string;
    mandatory?: boolean;
    duration_label?: string | null;
    required_proofs?: string[];
    approval_method?: string;
    handoff_party?: string | null;
    checklist_items?: Array<{ id: string; label: string; required: boolean }>;
    metric_requirements?: Array<{ id: string; name: string; unit: string; required: boolean; target?: number | null; min?: number | null; max?: number | null }>;
}

export interface WorkSetOption {
    catalog_code: string;
    set_code: string;
    set_version: number;
    work_shape: string;
    title: string;
    summary: string;
    steps: WorkStepOption[];
    category_codes?: string[];
    listing_types?: string[];
}

export interface WorkOptionGroups {
    recommended: WorkSetOption[];
    other_archetypes: WorkSetOption[];
}

interface CreateProductProps {
    session?: SliceSession | null;
    workCatalog?: Record<string, unknown>;
    workOptions?: WorkOptionGroups;
    dealChainOptions?: DealChainOptionGroups;
    partnerListings?: PartnerListingOption[];
    editingDraft?: ListingRecord | null;
}
interface ProductCategoryMeta {
    badge: string;
    label: string;
    sectionTitle: string;
    sectionSubtitle: string;
    titlePlaceholder: string;
    locationLabel: string;
    locationPlaceholder: string;
    defaultLocation: string;
    readyLabel: string;
}

const PRODUCT_CATEGORY_META: Record<string, ProductCategoryMeta> = {
    repairs: {
        badge: 'Hardware & Parts',
        label: 'Hardware & Replacement Parts',
        sectionTitle: 'Product Identity & Shop Location',
        sectionSubtitle: 'List genuine spare parts, tools, and replacement components.',
        titlePlaceholder: 'e.g. AC Run Capacitor (35uF 450V)',
        locationLabel: 'Shop / Depot Location',
        locationPlaceholder: 'e.g. Tagudin Hardware Depot, National Highway, Rizal',
        defaultLocation: 'Tagudin Hardware Depot, Rizal',
        readyLabel: 'Depot Pickup Ready',
    },
    'local-food': {
        badge: 'Fresh Food & Delicacies',
        label: 'Local Food & Bakery',
        sectionTitle: 'Product Identity & Stall Location',
        sectionSubtitle: 'List fresh baked goods, delicacies, and local harvests.',
        titlePlaceholder: 'e.g. Fresh Tagudin Bibingka (Box of 6)',
        locationLabel: 'Market Stall / Bakery Location',
        locationPlaceholder: 'e.g. Tagudin Public Market Stall #14, Poblacion',
        defaultLocation: 'Tagudin Public Market Stall #14, Poblacion',
        readyLabel: 'Counter Pickup Ready',
    },
    'greeting-cards': {
        badge: 'Crafts & Handmade',
        label: 'Handmade Cards & Crafts',
        sectionTitle: 'Product Identity & Workshop',
        sectionSubtitle: 'List handcrafted cards, gifts, and artisanal creations.',
        titlePlaceholder: 'e.g. Handcrafted Fiesta Greeting Cards (Set of 5)',
        locationLabel: 'Workshop / Collection Point',
        locationPlaceholder: 'e.g. Artisans Studio, Quirino St., Tagudin',
        defaultLocation: 'Artisans Studio, Quirino St., Tagudin',
        readyLabel: 'Studio Pickup Ready',
    },
    'print-assist': {
        badge: 'Print & Office Goods',
        label: 'Document & Print Supplies',
        sectionTitle: 'Product Identity & Print Center',
        sectionSubtitle: 'List paper reams, office consumables, and print supplies.',
        titlePlaceholder: 'e.g. Premium Letter Paper Ream (500 sheets, 80gsm)',
        locationLabel: 'Print Center / Storefront',
        locationPlaceholder: 'e.g. Tagudin Express Copy & Print, Centro',
        defaultLocation: 'Tagudin Express Copy & Print, Centro',
        readyLabel: 'Storefront Pickup Ready',
    },
    'local-services': {
        badge: 'General Merchandise',
        label: 'General Municipal Goods',
        sectionTitle: 'Product Identity & Dispatch Point',
        sectionSubtitle: 'List packaged goods and retail items in Tagudin.',
        titlePlaceholder: 'e.g. Heavy-Duty Extension Reel (10 meters)',
        locationLabel: 'Store / Dispatch Point',
        locationPlaceholder: 'e.g. Tagudin Commercial Center, Stall #5',
        defaultLocation: 'Tagudin Commercial Center, Stall #5',
        readyLabel: 'Pickup Ready',
    },
};
const DEFAULT_PRODUCT_CATEGORY_META: ProductCategoryMeta = {
    badge: 'Product Listing',
    label: 'Select Category',
    sectionTitle: 'Product Identity & Shop Location',
    sectionSubtitle: 'List products, items, and inventory for Tagudin customers.',
    titlePlaceholder: 'e.g. AC Run Capacitor, Fresh Bibingka, or Custom Craft...',
    locationLabel: 'Shop / Stall Location',
    locationPlaceholder: 'e.g. Stall number, street, or shop location in Tagudin',
    defaultLocation: '',
    readyLabel: 'Pickup Ready',
};

function hydrateProductVariants(value: unknown): ProductVariantForm[] {
    if (!Array.isArray(value) || value.length === 0) return [];

    return value.map((item, index) => {
        const variant = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

        return {
            id: typeof variant.id === 'string' ? variant.id : `variant-${index + 1}`,
            name: typeof variant.name === 'string' ? variant.name : '',
            price: Number(variant.price ?? 0),
            stock: Number(variant.stock ?? 0),
            isDefault: Boolean(variant.isDefault ?? variant.is_default),
        };
    });
}

function isProductBuilderDraft(value: unknown): value is ProductBuilderDraft {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const draft = value as Partial<ProductBuilderDraft>;

    return (
        draft.version === 1 &&
        typeof draft.step === 'number' &&
        draft.step >= 1 &&
        draft.step <= 5 &&
        (draft.builderMode === undefined ||
            draft.builderMode === 'guided' ||
            draft.builderMode === 'standard' ||
            draft.builderMode === 'advanced') &&
        typeof draft.title === 'string' &&
        typeof draft.category === 'string' &&
        typeof draft.description === 'string' &&
        typeof draft.stallLocation === 'string' &&
        Array.isArray(draft.variants) &&
        Array.isArray(draft.combos) &&
        typeof draft.selectedFulfillment === 'string' &&
        typeof draft.currentComboIdx === 'number'
    );
}
export function isInstallationApplicable(categoryCode: string): boolean {
    const c = (categoryCode || '').toLowerCase().trim();
    return (
        c === 'repairs' ||
        c.includes('appliance') ||
        c.includes('hardware') ||
        c.includes('machin') ||
        c.includes('install')
    );
}

function renderComboIcon(iconName: string, className = 'size-4') {
    switch (iconName) {
        case 'Truck':
            return <Truck className={className} />;
        case 'Wrench':
            return <Wrench className={className} />;
        case 'Package':
            return <Package className={className} />;
        case 'ShieldCheck':
            return <ShieldCheck className={className} />;
        default:
            return <Truck className={className} />;
    }
}

function dealChainRole(type: string): PartnerSlot['roleType'] {
    const normalized = type.toLowerCase();
    if (['delivery', 'courier'].includes(normalized)) return 'COURIER';
    if (['store', 'parts', 'product', 'tools'].includes(normalized)) return 'STORE';
    if (['audit', 'auditor'].includes(normalized)) return 'AUDIT';
    if (['hauling', 'recycle'].includes(normalized)) return 'RECYCLE';
    return 'LABOR';
}

function slotTypeForRole(role: PartnerSlot['roleType']): SlotType {
    switch (role) {
        case 'COURIER': return 'delivery';
        case 'STORE': return 'store';
        case 'AUDIT': return 'audit';
        case 'RECYCLE': return 'hauling';
        default: return 'installation';
    }
}

function formatPartnerFee(feeMinor?: number | null, digits = 2): string {
    return typeof feeMinor === 'number' && Number.isFinite(feeMinor)
        ? `₱${(feeMinor / 100).toFixed(digits)}`
        : 'Quote required';
}

function candidateListingVersion(candidate: SlotCandidateListing): string | undefined {
    const versioned = candidate as SlotCandidateListing & {
        listingVersionId?: string | null;
        listing_version_id?: string | null;
    };
    return versioned.listingVersionId ?? versioned.listing_version_id ?? undefined;
}
function normalizePartnerCombo(combo: PartnerCombo): PartnerCombo {
    if (combo.planVersion !== 1) return { ...combo, slots: combo.slots ?? [] };
    const slots = savedCombinationSlots({ planVersion: combo.planVersion, nodes: combo.nodes ?? [], dependencies: combo.dependencies });
    return {
        ...combo,
        slots: slots.map((slot) => {
            const feeMinor = slot.feeMinor;
            return {
                id: slot.id ?? '',
                roleType: dealChainRole(slot.type),
                slotLabel: slot.role,
                providerName: slot.name,
                fee: typeof feeMinor === 'number' ? feeMinor / 100 : undefined,
                feeMinor,
                rating: undefined,
                photoUrl: slot.coverThumbnailUrl,
                listingId: slot.listingId,
                listingVersionId: (slot as typeof slot & { listingVersionId?: string; listing_version_id?: string }).listingVersionId
                    ?? (slot as typeof slot & { listing_version_id?: string }).listing_version_id,
                isOpenSlot: slot.isOpenSlot,
                assignmentMode: slot.assignmentMode,
            };
        }),
    };
}

function toDealChainCombination(combo: PartnerCombo): DealChainCombination {
    const slots: DealChainPartnerSlot[] = combo.slots.map((slot, index) => ({
        id: slot.id || `slot-${index}`,
        type: slotTypeForRole(slot.roleType),
        role: slot.slotLabel,
        name: slot.providerName,
        meta: slot.slaText || (slot.feeMinor == null ? 'Quote required' : `${formatPartnerFee(slot.feeMinor)} partner fee`),
        feeMinor: slot.feeMinor,
        coverThumbnailUrl: slot.photoUrl,
        listingId: slot.listingId,
        listingVersionId: slot.listingVersionId,
        isOpenSlot: slot.isOpenSlot,
        assignmentMode: slot.assignmentMode,
        tier: index,
        conditionCode: slot.roleType === 'COURIER' || slot.roleType === 'STORE'
            ? 'part_ready'
            : 'work_completed',
    }));
    return {
        id: combo.id,
        title: combo.title,
        icon: combo.icon,
        description: combo.description,
        isDefault: combo.isDefault,
        planVersion: combo.planVersion,
        recipeId: combo.recipeId,
        catalogVersion: combo.catalogVersion,
        isCustom: combo.isCustom,
        basedOnTitle: combo.basedOnTitle,
        nodes: combo.nodes?.length
            ? combo.nodes
            : [
                  ...slots
                      .filter((slot) => slot.type === 'delivery' || slot.type === 'store')
                      .map((slot) => ({
                          id: slot.id || '',
                          isPrimary: false,
                          role: slot.role,
                          title: slot.name,
                          sub: slot.meta,
                          type: slot.type,
                          bg: slot.type === 'delivery' ? '#E0F2FE' : '#FEF3C7',
                          color: slot.type === 'delivery' ? '#0284C7' : '#B45309',
                          feeMinor: slot.feeMinor,
                          listingId: slot.listingId,
                          listingVersionId: slot.listingVersionId,
                      })),
                  {
                      id: 'node-primary-anchor',
                      role: 'YOUR PRODUCT',
                      title: 'Your Product',
                      sub: 'Product price',
                      type: 'store',
                      bg: '#ECFDF5',
                      color: '#059669',
                      isPrimary: true,
                  },
                  ...slots
                      .filter((slot) => slot.type !== 'delivery' && slot.type !== 'store')
                      .map((slot) => ({
                          id: slot.id || '',
                          role: slot.role,
                          title: slot.name,
                          sub: slot.meta,
                          type: slot.type,
                          bg: slot.type === 'audit' || slot.type === 'hauling' ? '#F3E8FF' : '#ECFDF5',
                          color: slot.type === 'audit' || slot.type === 'hauling' ? '#7E22CE' : '#059669',
                          feeMinor: slot.feeMinor,
                          listingId: slot.listingId,
                          listingVersionId: slot.listingVersionId,
                      })),
              ],
        slots,
        dependencies: combo.dependencies,
        flowType: combo.flowType,
    };
}

export default function CreateProduct({
    workOptions,
    dealChainOptions,
    session,
    partnerListings = [],
    editingDraft = null,
}: CreateProductProps) {
    const availableWorkSets = useMemo(() => {
        const recommended = workOptions?.recommended ?? [];
        const others = workOptions?.other_archetypes ?? [];
        return [...recommended, ...others];
    }, [workOptions]);

    const defaultWorkSet = useMemo<WorkSetOption>(() => {
        return (
            availableWorkSets.find((s) => s.set_code === 'set-product-market-handoff') ||
            availableWorkSets.find((s) => s.work_shape === 'A4') ||
            availableWorkSets[0] || {
                catalog_code: 'tagudin-product-handoff-a4',
                set_code: 'set-product-market-handoff',
                set_version: 1,
                work_shape: 'A4',
                title: 'Market Product Preparation & Handoff',
                summary:
                    'Prepare package, confirm recipient or courier handoff, and record condition close-out.',
                steps: [
                    {
                        id: 'a4-prepare',
                        ordinal: 1,
                        title: 'Sourcing and package preparation',
                        description:
                            'Verify the product count, condition, packaging, and dispatch details.',
                        node_kind: 'checkin_intake',
                        evidence_type: 'receipt_upload',
                    },
                    {
                        id: 'a4-handoff',
                        ordinal: 2,
                        title: 'Handoff and recipient confirmation',
                        description:
                            'Transfer the product to the recipient or independently contracted courier.',
                        node_kind: 'handoff_ready',
                        evidence_type: 'dual_sign',
                    },
                    {
                        id: 'a4-close',
                        ordinal: 3,
                        title: 'Condition close-out',
                        description:
                            'Record the delivered condition and close the product work instance.',
                        node_kind: 'final_signoff',
                        evidence_type: 'photo_required',
                    },
                ],
            }
        );
    }, [availableWorkSets]);

    const [prepLeadTime, setPrepLeadTime] = useState<'in_stock' | 'same_day' | 'next_day'>(() => {
        const terms = editingDraft?.terms as Record<string, unknown> | undefined;
        const saved = (terms?.prep_lead_time as string) || (editingDraft?.prep_lead_time as string);
        if (saved === 'same_day' || saved === 'next_day') return saved;
        return 'in_stock';
    });
    const slotCandidateListings = useMemo<SlotCandidateListing[]>(() => {
        if (!Array.isArray(partnerListings) || partnerListings.length === 0) {
            return [];
        }
        return partnerListings.map((item) => {
            const mappedRole = dealChainRole(item.role);
            const parsedRating = typeof item.rating === 'number'
                ? item.rating
                : item.rating == null || item.rating.trim() === ''
                  ? undefined
                  : Number(item.rating);
            return {
                id: item.id,
                title: item.name,
                provider_name: item.providerName,
                area: item.barangay || 'Tagudin Centro',
                price_minor: item.feeMinor,
                sla_text: item.sub || 'Verified Tagudin partner listing',
                photo_url: item.coverThumbnailUrl,
                rating: parsedRating != null && Number.isFinite(parsedRating) ? parsedRating : undefined,
                role: mappedRole,
                listingVersionId: item.listingVersionId ?? item.listing_version_id,
                listing_version_id: item.listing_version_id ?? item.listingVersionId,
            };
        });
    }, [partnerListings]);
    const [step, setStep] = useState<number>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [creatorOpen, setCreatorOpen] = useState(false);
    const [quickDealOpen, setQuickDealOpen] = useState(false);

    // Step 1: Product Identity & Stall
    const [title, setTitle] = useState(editingDraft?.title ?? '');
    const [category, setCategory] = useState(
        editingDraft?.category_code || editingDraft?.categoryCode || '',
    );
    const categoryMeta = PRODUCT_CATEGORY_META[category] || DEFAULT_PRODUCT_CATEGORY_META;
    const [description, setDescription] = useState(editingDraft?.description ?? '');
    const [media, setMedia] = useState<ListingMedia>(
        editingDraft?.media ??
            defaultMediaForCategory(
                editingDraft?.category_code || editingDraft?.categoryCode || 'repairs',
            ),
    );
    const [stallLocation, setStallLocation] = useState(
        editingDraft?.stall_location || editingDraft?.stallLocation || '',
    );
    const [geography, setGeography] = useState<StructuredGeography | null>(
        (editingDraft?.geography as unknown as StructuredGeography) ?? null,
    );
    const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
    const [variants, setVariants] = useState<ProductVariantForm[]>(() => {
        const hydrated = hydrateProductVariants(editingDraft?.variants);

        return hydrated.length > 0
            ? hydrated
            : [
                  {
                      id: 'var-1',
                      name: '',
                      price: 0,
                      stock: 0,
                      isDefault: true,
                  },
              ];
    });
    // Step 3: Swappable Deal Chain Fulfillment
    const [combos, setCombos] = useState<PartnerCombo[]>(() => {
        if (
            editingDraft?.deal_chain_combinations &&
            Array.isArray(editingDraft.deal_chain_combinations)
        ) {
            return (editingDraft.deal_chain_combinations as unknown as PartnerCombo[]).map(normalizePartnerCombo);
        }
        return [];
    });
    const [selectedFulfillment, setSelectedFulfillment] = useState<'pickup' | string>(
        ((editingDraft?.deal_chain_specification as Record<string, unknown>)
            ?.selected_combo_id as string) || 'pickup',
    );
    const [currentComboIdx, setCurrentComboIdx] = useState(0);
    const [expandedComboIds, setExpandedComboIds] = useState<Record<string, boolean>>(() => {
        const initialComboId = (editingDraft?.deal_chain_specification as Record<string, unknown>)
            ?.selected_combo_id as string;
        if (initialComboId && initialComboId !== 'pickup') {
            return { [initialComboId]: true };
        }
        return {};
    });
    const [attachModalOpen, setAttachModalOpen] = useState(false);
    const [dealChainStudioOpen, setDealChainStudioOpen] = useState(false);
    const [customizingComboId, setCustomizingComboId] = useState<string | null>(null);
    const studioCombination = useMemo(() => {
        if (!customizingComboId) return null;
        const combo = combos.find((item) => item.id === customizingComboId);
        return combo ? toDealChainCombination(combo) : null;
    }, [combos, customizingComboId]);

    const isComboExpanded = (comboId: string) => {
        return !!expandedComboIds[comboId];
    };

    const toggleComboExpansion = (comboId: string) => {
        setExpandedComboIds((prev) => ({
            ...prev,
            [comboId]: !prev[comboId],
        }));
    };

    // Slot Picker Modal State
    const [slotPickerState, setSlotPickerState] = useState<{
        open: boolean;
        role: string;
        comboId: string;
        slotIndex: number;
        currentListingId?: string;
        onPickedOverride?: (partner: {
            id: string;
            title: string;
            providerName: string;
            priceMinor?: number;
            photoUrl?: string;
            listingVersionId?: string;
            isOpenSlot?: boolean;
        }) => void;
    }>({
        open: false,
        role: 'COURIER',
        comboId: '',
        slotIndex: 0,
        currentListingId: undefined,
    });
    const isAuthenticated = session?.authenticated === true || session?.isAuthenticated === true;
    const [draftRestored, setDraftRestored] = useState(false);
    const [builderMode, setBuilderMode] = useState<BuilderMode>('guided');

    useEffect(() => {
        if (editingDraft?.id) {
            return;
        }
        const pendingDraft = readPendingListingDraft('product');
        if (!isProductBuilderDraft(pendingDraft)) return;

        setStep(pendingDraft.step);
        if (pendingDraft.builderMode === 'standard' || pendingDraft.builderMode === 'advanced') {
            setBuilderMode('standard');
        } else if (pendingDraft.builderMode === 'guided') {
            setBuilderMode('guided');
        }
        setTitle(pendingDraft.title);
        setCategory(pendingDraft.category);
        setDescription(pendingDraft.description);
        setStallLocation(pendingDraft.stallLocation);
        setVariants(pendingDraft.variants);
        setCombos(pendingDraft.combos.map(normalizePartnerCombo));
        setSelectedFulfillment(pendingDraft.selectedFulfillment);
        setCurrentComboIdx(
            Math.min(
                Math.max(0, pendingDraft.currentComboIdx),
                Math.max(0, pendingDraft.combos.length - 1),
            ),
        );
        if (pendingDraft.media) {
            setMedia(pendingDraft.media);
        }
        setDraftRestored(true);
    }, []);

    // Variant Handlers
    const addVariant = () => {
        const count = variants.length + 1;
        setVariants((prev) => [
            ...prev,
            {
                id: `var-${Date.now()}-${count}`,
                name: '',
                price: 0,
                stock: 0,
                isDefault: false,
            },
        ]);
    };

    const removeVariant = (index: number) => {
        if (variants.length <= 1) return;
        setVariants((prev) => {
            const next = prev.filter((_, i) => i !== index);
            if (!next.some((v) => v.isDefault) && next[0]) {
                next[0].isDefault = true;
            }
            return next;
        });
    };

    const updateVariant = (index: number, field: keyof ProductVariantForm, value: unknown) => {
        setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
    };

    const setDefaultVariant = (index: number) => {
        setVariants((prev) => prev.map((v, i) => ({ ...v, isDefault: i === index })));
    };

    const defaultVariant = variants.find((v) => v.isDefault) || variants[0];
    const defaultPriceMinor = Math.round((defaultVariant?.price || 0) * 100);

    // Slot Picker Handlers
    const openSlotPicker = (
        comboId: string,
        slotIndex: number,
        role: PartnerSlot['roleType'],
        currentId?: string,
    ) => {
        setSlotPickerState({ open: true, role, comboId, slotIndex, currentListingId: currentId });
    };

    const handleCandidateSelected = (candidate: SlotCandidateListing) => {
        const sourcePriceMinor = candidate.price_minor ?? candidate.priceMinor;
        const priceMinor = typeof sourcePriceMinor === 'number' && Number.isFinite(sourcePriceMinor)
            ? sourcePriceMinor
            : undefined;
        const listingVersionId = candidateListingVersion(candidate);
        if (slotPickerState.onPickedOverride) {
            slotPickerState.onPickedOverride({
                id: candidate.id,
                title: candidate.title,
                providerName: candidate.provider_name,
                priceMinor,
                photoUrl: candidate.photo_url,
                listingVersionId,
            });
            setSlotPickerState((prev) => ({ ...prev, open: false, onPickedOverride: undefined }));
            return;
        }
        setCombos((prevCombos) =>
            prevCombos.map((c) => {
                if (c.id !== slotPickerState.comboId) return c;
                const selectedSlot = c.slots[slotPickerState.slotIndex];
                const updatedSlot = {
                    ...selectedSlot,
                    id:
                        selectedSlot?.id ||
                        `slot-${slotPickerState.comboId}-${slotPickerState.slotIndex}`,
                    providerName: candidate.title || candidate.provider_name,
                    fee: priceMinor == null ? undefined : priceMinor / 100,
                    feeMinor: priceMinor,
                    rating: typeof candidate.rating === 'number' && Number.isFinite(candidate.rating)
                        ? candidate.rating
                        : undefined,
                    slaText: candidate.sla_text,
                    photoUrl: candidate.photo_url,
                    listingId: candidate.id,
                    listingVersionId,
                    isOpenSlot: false,
                    assignmentMode: 'preferred_partner' as const,
                };
                return {
                    ...c,
                    nodes: c.nodes?.map((node) => node.id === selectedSlot?.id ? {
                        ...node, listingId: candidate.id, listingVersionId, title: candidate.title,
                        feeMinor: priceMinor, coverThumbnailUrl: candidate.photo_url,
                        isOpenSlot: false, assignmentMode: 'preferred_partner',
                    } : node),
                    slots: c.slots.map((slot, sIdx) =>
                        sIdx === slotPickerState.slotIndex ? updatedSlot : slot,
                    ),
                };
            }),
        );
        setSlotPickerState((prev) => ({ ...prev, open: false }));
    };

    const handleRemoveCombo = (comboId: string) => {
        setCombos((prev) => prev.filter((c) => c.id !== comboId));
        if (selectedFulfillment === comboId) {
            setSelectedFulfillment('pickup');
        }
        setCurrentComboIdx((prev) => Math.max(0, prev - 1));
    };

    const handleSelectDealChainRecipe = (recipe: DealChainTemplate) => {
        const primaryPricePesos = Math.round(defaultVariant?.price || 0);
        const nodes: DealChainNode[] = recipe.nodes.map((node) => {
            const isPrimary = node.isPrimary === true;
            const roleType = dealChainRole(node.type);
            const isStore = roleType === 'STORE';
            const isCourier = roleType === 'COURIER';
            const feeMinor = node.priceMinor ?? undefined;
            return {
                id: `node-${node.key}`,
                role: isPrimary ? 'YOUR PRODUCT' : node.role.toUpperCase(),
                title: isPrimary ? title || 'Your Product' : node.title,
                sub: isPrimary
                    ? `₱${primaryPricePesos}`
                    : feeMinor != null
                      ? formatPartnerFee(feeMinor, 0)
                      : 'Quote required',
                type: isPrimary ? 'store' : node.type,
                bg: isStore ? '#FEF3C7' : isCourier ? '#E0F2FE' : '#ECFDF5',
                color: isStore ? '#B45309' : isCourier ? '#0284C7' : '#059669',
                listingId: isPrimary ? undefined : node.listingId ?? undefined,
                listingVersionId: (node as typeof node & { listingVersionId?: string | null }).listingVersionId ?? undefined,
                feeMinor: isPrimary ? undefined : feeMinor,
                coverThumbnailUrl: node.image ?? undefined,
                isPrimary,
                assignmentMode: node.assignmentMode,
                isOpenSlot: !isPrimary && !node.listingId,
            };
        });
        const slots: PartnerSlot[] = recipe.nodes
            .filter((node) => !node.isPrimary)
            .map((node) => {
                const roleType = dealChainRole(node.type);
                const feeMinor = node.priceMinor ?? undefined;
                const hasListing = Boolean(node.listingId);
                return {
                    id: `node-${node.key}`,
                    roleType,
                    slotLabel: node.role,
                    providerName: node.providerName || (hasListing ? node.title : `Open ${node.role} Slot`),
                    fee: feeMinor == null ? undefined : feeMinor / 100,
                    feeMinor,
                    rating: undefined,
                    slaText: node.sub || (hasListing ? undefined : 'Quote required upon request'),
                    photoUrl: node.image ?? undefined,
                    listingId: node.listingId ?? undefined,
                    listingVersionId: (node as typeof node & { listingVersionId?: string | null }).listingVersionId ?? undefined,
                    isOpenSlot: !hasListing,
                    assignmentMode: node.assignmentMode,
                };
            });
        const newCombo: PartnerCombo = {
            id: `combo-${recipe.recipeId}-${Date.now()}`,
            title: recipe.title,
            icon:
                recipe.pattern === 'delivery'
                    ? 'Truck'
                    : recipe.pattern === 'audit'
                      ? 'ShieldCheck'
                      : 'Wrench',
            description: recipe.desc,
            isDefault: combos.length === 0,
            planVersion: 1,
            recipeId: recipe.recipeId,
            catalogVersion: recipe.catalogVersion || 1,
            isCustom: false,
            basedOnTitle: recipe.title,
            nodes,
            slots,
            dependencies: recipe.dependencies?.map((edge) => ({
                ...edge,
                predecessorId: edge.predecessorId.startsWith('node-') ? edge.predecessorId : `node-${edge.predecessorId}`,
                successorId: edge.successorId.startsWith('node-') ? edge.successorId : `node-${edge.successorId}`,
            })) ?? [],
        };
        setCombos((prev) => [...prev, newCombo]);
        setCurrentComboIdx(combos.length);
        setSelectedFulfillment(newCombo.id);
        setAttachModalOpen(false);
    };

    const handleSaveDealChain = (updated: DealChainCombination) => {
        const nextCombo: PartnerCombo = {
            id: updated.id,
            title: updated.title,
            icon: updated.icon,
            description: updated.description || '',
            isDefault: updated.isDefault,
            recipeId: updated.recipeId,
            catalogVersion: updated.catalogVersion,
            planVersion: updated.planVersion,
            isCustom: updated.isCustom,
            basedOnTitle: updated.basedOnTitle,
            nodes: updated.nodes,
            dependencies: updated.dependencies,
            flowType: updated.flowType,
            slots: updated.slots.map((slot, index) => ({
                id: slot.id || `slot-${slot.type}-${index}`,
                roleType: dealChainRole(slot.type),
                slotLabel: slot.role,
                providerName: slot.name,
                fee: typeof slot.feeMinor === 'number' ? slot.feeMinor / 100 : undefined,
                feeMinor: slot.feeMinor,
                rating: undefined,
                slaText: slot.meta,
                photoUrl: slot.coverThumbnailUrl,
                listingId: slot.listingId,
                listingVersionId: (slot as typeof slot & { listingVersionId?: string }).listingVersionId,
                isOpenSlot: slot.isOpenSlot,
                assignmentMode: slot.assignmentMode,
            })),
        };
        const existingCombo = combos.find((combo) => combo.id === updated.id);
        if (existingCombo) {
            setCombos((prev) =>
                prev.map((combo) =>
                    combo.id === updated.id ? { ...nextCombo, isDefault: combo.isDefault } : combo,
                ),
            );
        } else {
            setCombos((prev) => [...prev, { ...nextCombo, isDefault: combos.length === 0 }]);
            setCurrentComboIdx(combos.length);
            setSelectedFulfillment(updated.id);
        }
        setDealChainStudioOpen(false);
        setCustomizingComboId(null);
    };

    const getShortPartnerName = (fullName: string) => {
        return formatProviderShortName(fullName, 14);
    };

    // Active Fulfillment Info for Live Twin & Summary Card
    const activeFulfillmentInfo = useMemo(() => {
        if (selectedFulfillment === 'pickup') {
            return {
                title: 'Free Counter Pickup · Tagudin Public Market',
                badge: 'Free',
                icon: <Store className="size-3.5 text-emerald-600" />,
                description: `Collect at ${stallLocation || 'Tagudin Public Market'} directly`,
                totalFee: 0,
                activeCombo: undefined as PartnerCombo | undefined,
            };
        }

        const activeCombo = combos.find((c) => c.id === selectedFulfillment);
        if (!activeCombo) {
            return {
                title: 'Saved partner option unavailable',
                badge: 'Review selection',
                icon: <Info className="size-3.5 text-amber-600" />,
                description: 'Choose pickup or another available partner option.',
                totalFee: undefined,
                activeCombo: undefined as PartnerCombo | undefined,
            };
        }

        const hasUnknownFee = activeCombo.slots.some((slot) => slot.feeMinor == null);
        const totalFeeMinor = activeCombo.slots.reduce((sum, slot) => sum + (slot.feeMinor ?? 0), 0);
        const totalFee = totalFeeMinor / 100;
        const feeFormatted = hasUnknownFee ? 'Quote required' : `+₱${totalFee.toFixed(2)}`;

        // Combo 1: Doorstep Delivery
        if (
            activeCombo.id === 'combo-delivery' ||
            activeCombo.title.toLowerCase().includes('doorstep')
        ) {
            const courierSlot =
                activeCombo.slots.find((s) => s.roleType === 'COURIER') || activeCombo.slots[0];
            const partnerName = courierSlot
                ? formatProviderShortName(courierSlot.providerName, 16, 'Courier')
                : 'Courier';
            return {
                title: `${feeFormatted} ${partnerName} Delivery`,
                badge: feeFormatted,
                icon: <Truck className="size-3.5 text-indigo-600" />,
                description: courierSlot
                    ? `${courierSlot.providerName}${typeof courierSlot.rating === 'number' ? ` · Rating ${courierSlot.rating.toFixed(1)}` : ''}`
                    : 'Courier delivery',
                totalFee,
                activeCombo,
            };
        }

        // Combo 2: Delivery + Installation Labor
        if (
            activeCombo.id === 'combo-installation' ||
            activeCombo.title.toLowerCase().includes('install')
        ) {
            return {
                title: `${feeFormatted} Doorstep Delivery & Installation`,
                badge: feeFormatted,
                icon: <Wrench className="size-3.5 text-amber-600" />,
                description: activeCombo.slots.map((s) => s.providerName).join(' + '),
                totalFee,
                activeCombo,
            };
        }

        return {
            title: `${feeFormatted} ${activeCombo.title}`,
            badge: feeFormatted,
            icon: activeCombo.slots.some((slot) => slot.roleType === 'AUDIT')
                ? <ShieldCheck className="size-3.5 text-violet-600" />
                : activeCombo.slots.some((slot) => slot.roleType === 'RECYCLE')
                  ? <Package className="size-3.5 text-emerald-600" />
                  : activeCombo.slots.some((slot) => slot.roleType === 'STORE')
                    ? <Store className="size-3.5 text-amber-600" />
                    : <Wrench className="size-3.5 text-amber-600" />,
            description: activeCombo.slots.map((s) => s.providerName).join(' + '),
            totalFee,
            activeCombo,
        };
    }, [selectedFulfillment, combos, stallLocation]);

    const currentBuilderDraft = (): ProductBuilderDraft => ({
        version: 1,
        step,
        title,
        category,
        description,
        stallLocation,
        variants,
        combos,
        selectedFulfillment,
        currentComboIdx,
        media,
        builderMode,
        geography: geography || undefined,
    });
    const redirectGuestToSignIn = (): void => {
        const saved = savePendingListingDraft('product', currentBuilderDraft());
        if (!saved) {
            setFormErrors({
                form: 'Sign in is required to save this draft. Keep this page open and retry after enabling session storage.',
            });
            return;
        }

        router.visit('/auth/sign-in?return_to=%2Flistings%2Fcreate%2Fproduct');
    };

    // Form Submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors({});
        if (!isAuthenticated) {
            redirectGuestToSignIn();
            return;
        }
        setIsSubmitting(true);
        const effectiveDescription =
            description.trim().length >= 10
                ? description.trim()
                : `${title.trim()} — Genuine Tagudin ${category} product listing. Available for counter pickup at ${stallLocation} and partnered deal chain fulfillment.`;

        const activeCombo = combos.find((c) => c.id === selectedFulfillment);

        const directAddons = (editingDraft?.addons ?? []).filter((addon) => {
            const code = addon.code.toLowerCase();
            return !('partner_role' in addon || 'partner_fixture_keys' in addon || 'settlement_mode' in addon)
                && !['courier_delivery', 'turnkey_parts', 'product_install', 'safety_audit', 'market_hauling_relay'].includes(code);
        });

        const savedSetCode = editingDraft?.work_specification?.based_on_set_code;
        const savedWorkCode = editingDraft?.work_catalog_code;
        const workCatalogCode =
            (typeof savedSetCode === 'string' && savedSetCode.startsWith('set-') && savedSetCode) ||
            (typeof savedWorkCode === 'string' && savedWorkCode.startsWith('set-') && savedWorkCode) ||
            defaultWorkSet.set_code;
        const workSetVersion = editingDraft?.work_set_version || defaultWorkSet.set_version;
        const workShape = defaultWorkSet.work_shape || 'A4';

        const milestoneStages = defaultWorkSet.steps.map((step, idx) => ({
            id: step.id,
            ordinal: step.ordinal || idx + 1,
            title: step.title,
            description: step.description,
            step: step.ordinal || idx + 1,
            node_kind: step.node_kind,
            evidence_type: step.evidence_type,
            evidence_description: step.evidence_description,
            control_mode: step.control_mode,
            mandatory: step.mandatory ?? true,
            duration_label: step.duration_label ?? null,
            required_proofs: step.required_proofs ?? [],
            approval_method: step.approval_method,
            handoff_party: step.handoff_party ?? null,
            checklist_items: step.checklist_items ?? [],
            metric_requirements: step.metric_requirements ?? [],
        }));
        const payload: Record<string, FormDataConvertible> = {
            title: title.trim(),
            description: effectiveDescription,
            category_code: category,
            listing_type: 'product',
            work_shape: workShape,
            work_catalog_code: workCatalogCode,
            work_set_version: workSetVersion,
            prep_lead_time: prepLeadTime,
            price_amount_minor: defaultPriceMinor,
            currency: 'PHP',
            stall_location: stallLocation,
            geography: (geography || {
                area_code: 'Tagudin',
                stall_location: stallLocation,
            }) as unknown as FormDataConvertible,
            variants: variants.map((v) => ({
                id: v.id,
                name: v.name,
                price: v.price,
                stock: v.stock,
                is_default: v.isDefault,
            })),
            package_tiers: variants.map((v) => ({
                id: v.id,
                title: v.name,
                price: v.price,
                sub: `${v.stock} units available in stock`,
                inclusions: [
                    v.isDefault ? 'Primary Default Variation' : 'Alternative Spec Variation',
                    `Stall pickup at ${stallLocation || 'Tagudin Public Market'}`,
                ],
            })),
            addons: directAddons,
            milestone_stages: milestoneStages,
            media: media as unknown as FormDataConvertible,
            deal_chain_combinations: combos as unknown as FormDataConvertible,
            deal_chain_specification: {
                selected_combo_id: selectedFulfillment,
                based_on_recipe_code: activeCombo?.recipeId ?? (selectedFulfillment === 'pickup' ? 'direct' : null),
                based_on_catalog_version: activeCombo?.catalogVersion ?? null,
                is_custom_variation: activeCombo?.isCustom ?? false,
                combination_count: combos.length,
            } as unknown as FormDataConvertible,
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
                        clearPendingListingDraft('product');
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
                } else if (errs.price_amount_minor || errs.variants) {
                    setStep(2);
                }
            },
            onSuccess: () => {
                clearPendingListingDraft('product');
                setDraftRestored(false);
            },
        });
    };

    const previewReviewSummary = editingDraft?.rating_summary;
    const previewReviewCount = previewReviewSummary?.reviews_count ?? 0;
    const hasPreviewRating = previewReviewCount > 0
        && typeof previewReviewSummary?.rating === 'number'
        && Number.isFinite(previewReviewSummary.rating);
    const previewRatingLabel = hasPreviewRating && previewReviewSummary
        ? `${previewReviewSummary.rating.toFixed(1)} (${previewReviewCount} reviews)`
        : previewReviewCount > 0
          ? `${previewReviewCount} reviews`
          : 'New · No reviews';

    const renderCustomerLiveTwin = () => (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                    <div>
                        <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-[#0F2F58] uppercase">
                            <Eye className="size-3.5 text-amber-600" />
                            <span>Live Listing Preview</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                            How your product looks to customers
                        </p>
                    </div>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 uppercase">
                    Marketplace Card
                </span>
            </div>

            {/* Product Card Preview */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                    {media.cover_thumbnail_url ? (
                        <img
                            src={media.cover_thumbnail_url}
                            alt={title || 'Marketplace Good'}
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                    ) : (
                        <CategoryVisualFallback
                            categoryCode={category}
                            title={title || 'Marketplace Good'}
                        />
                    )}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="rounded-full bg-[#0F2F58]/90 px-2.5 py-1 text-[10px] font-extrabold text-white uppercase backdrop-blur">
                            Product / Goods
                        </span>
                        <span className="rounded-full bg-amber-600/90 px-2.5 py-1 text-[10px] font-extrabold text-white uppercase backdrop-blur">
                            Physical Item
                        </span>
                        {media.has_video && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-extrabold text-white uppercase backdrop-blur">
                                <Video className="size-3 text-[#FFC72C]" />
                                <span>Video</span>
                            </span>
                        )}
                    </div>
                    <div className="absolute top-2.5 right-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10.5px] font-extrabold text-slate-900 shadow-2xs backdrop-blur">
                        {previewRatingLabel}
                    </div>
                </div>

                <div className="space-y-2.5 p-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1">
                            <Store className="size-3 text-slate-400" />
                            <span className="max-w-[170px] truncate" title={stallLocation}>
                                {stallLocation || 'Tagudin Public Market'}
                            </span>
                        </div>
                        <span className="font-semibold text-emerald-700">0% Platform Fee</span>
                    </div>

                    <h3 className="line-clamp-2 text-sm font-extrabold text-[#0F2F58]">
                        {title.trim() || 'Untitled Product'}
                    </h3>

                    <div className="flex items-baseline justify-between border-t border-slate-100 pt-2.5">
                        <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">
                                {variants.length > 1 ? 'Default variant price' : 'Unit Price'}
                            </span>
                            <div className="font-mono text-base font-extrabold text-[#0F2F58]">
                                ₱
                                {(defaultVariant ? defaultVariant.price : 0).toLocaleString(
                                    'en-PH',
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    },
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            <Store className="size-3 text-slate-400" />
                            <span>{categoryMeta.readyLabel}</span>
                        </div>
                    </div>

                    {/* Variants Chips */}
                    {variants.some((v) => v.name.trim() || v.price > 0) && (
                        <div className="space-y-1.5 border-t border-slate-100 pt-2">
                            <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                <span>Available Variants ({variants.length})</span>
                                <span>
                                    Stock: {variants.reduce((acc, v) => acc + (v.stock || 0), 0)}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {variants.map((v) => (
                                    <span
                                        key={v.id}
                                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                                            v.isDefault
                                                ? 'border-[#0F2F58]/30 bg-[#EBF2FA] font-bold text-[#0F2F58]'
                                                : 'border-slate-200/60 bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <span>{v.name.trim() || 'Unnamed Variant'}</span>
                                        {v.price > 0 && (
                                            <span className="font-mono text-slate-500">
                                                · ₱{v.price}
                                            </span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Fulfillment Display in Live Twin */}
                    <div className="space-y-1.5 border-t border-slate-100 pt-2 text-[10.5px]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                                {activeFulfillmentInfo.icon}
                                <span>{activeFulfillmentInfo.title}</span>
                            </div>
                            <span className="font-bold text-emerald-700">
                                {selectedFulfillment === 'pickup' ? 'Ready in Stall' : 'Deal Chain'}
                            </span>
                        </div>

                        {activeFulfillmentInfo.activeCombo && (
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                {activeFulfillmentInfo.activeCombo.slots.map((s, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-medium text-slate-700"
                                    >
                                        {s.roleType === 'COURIER' ? (
                                            <Truck className="size-3.5 text-indigo-600" />
                                        ) : s.roleType === 'STORE' ? (
                                            <Store className="size-3.5 text-amber-600" />
                                        ) : s.roleType === 'AUDIT' ? (
                                            <ShieldCheck className="size-3.5 text-violet-600" />
                                        ) : s.roleType === 'RECYCLE' ? (
                                            <Package className="size-3.5 text-emerald-600" />
                                        ) : (
                                            <Wrench className="size-3.5 text-amber-600" />
                                        )}
                                        <span className="font-bold text-slate-900">
                                            {s.roleType} · {s.providerName}
                                        </span>
                                        <span className="font-mono font-bold text-emerald-700">
                                            {s.feeMinor == null ? 'Quote required' : `+${formatPartnerFee(s.feeMinor)}`}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <section
                aria-label="Governed A4 handoff preview"
                className="space-y-2 rounded-xl border border-[#D7E1EA] bg-white p-3 text-xs"
            >
                <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#0F2F58]">Governed A4 Handoff</span>
                    <span className="rounded-full bg-[#EBF2FA] px-2 py-0.5 text-[10px] font-bold text-[#0F2F58]">
                        Read only
                    </span>
                </div>
                <ol className="space-y-1.5">
                    {defaultWorkSet.steps.map((workStep, index) => (
                        <li
                            key={workStep.id}
                            className="flex items-start gap-2 text-slate-700"
                        >
                            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#F2F5F8] text-[10px] font-extrabold text-[#0F2F58]">
                                {index + 1}
                            </span>
                            <span>{workStep.title}</span>
                        </li>
                    ))}
                </ol>
            </section>

            <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-900">
                <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="size-3.5 text-amber-700" />
                    <span>Counter Verification Protected</span>
                </div>
                <p className="text-[10.5px] leading-relaxed text-amber-800">
                    Shoppers collect at {stallLocation || categoryMeta.defaultLocation} or have
                    local couriers relay with photo intake receipt.
                </p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-16 font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
            <DesktopGlobalNav activeRoute="create_listing" />

            <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-4 sm:px-6 lg:py-6">
                {/* Top Header Control Bar */}
                {/* Compact 1-Row Sticky Header */}
                <header
                    data-testid="builder-header"
                    className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 rounded-2xl border border-slate-200/80 bg-white/95 px-3.5 py-2.5 shadow-xs backdrop-blur-md sm:flex sm:flex-row sm:items-center sm:gap-3 sm:px-4"
                >
                    {/* Left: Change Type + Title */}
                    <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:gap-2.5">
                        <Link
                            href="/listings/create"
                            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                            title="Change Type"
                        >
                            <ArrowLeft className="size-4" />
                        </Link>
                        <span className="min-w-0 truncate text-xs font-extrabold text-[#0F2F58] sm:text-sm">
                            Product Listing
                        </span>
                    </div>

                    {/* Step indicator pill */}
                    <div className="col-start-1 row-start-2 flex min-w-0 items-center">
                        {builderMode === 'guided' ? (
                            <span className="min-w-0 truncate rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                                Step {step} of 5 · {PRODUCT_GUIDED_STEPS[step - 1]?.shortTitle}
                            </span>
                        ) : (
                            <span className="min-w-0 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                Standard Form
                            </span>
                        )}
                    </div>

                    {/* Mobile Preview Button in Top Header */}
                    <button
                        type="button"
                        onClick={() => setMobilePreviewOpen(true)}
                        className="col-start-2 row-start-1 flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 justify-self-end rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 sm:hidden"
                        title="Preview Live Customer View"
                    >
                        <Eye className="size-3.5 text-amber-600" />
                        <span>Preview</span>
                    </button>

                    <BuilderModeToggle mode={builderMode} onModeChange={setBuilderMode} />
                </header>

                {/* Guided Mode Slim Progress Bar */}
                {builderMode === 'guided' && (
                    <div className="-mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-200/70">
                        <div
                            className="h-full bg-amber-500 transition-all duration-300 ease-out"
                            style={{ width: `${(step / 5) * 100}%` }}
                        />
                    </div>
                )}

                {/* Responsive 2-Column Grid */}
                <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                    {/* LEFT COLUMN: Product Form Studio (Cols 1-7) */}
                    <main className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-7 lg:p-7">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* STEP 1: Product Name & Category */}
                            {(builderMode === 'standard' || step === 1) && (
                                <div className="space-y-4">
                                    {builderMode === 'guided' ? (
                                        <div>
                                            <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
                                                {PRODUCT_GUIDED_STEPS[0].guidedTitle}
                                            </h2>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                                {PRODUCT_GUIDED_STEPS[0].guidedDescription}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h2 className="text-sm font-extrabold tracking-wider text-slate-900 uppercase">
                                                Product Identity &amp; Aisle
                                            </h2>
                                        </div>
                                    )}

                                    {formErrors.title && (
                                        <p className="text-xs font-bold text-red-600">
                                            {formErrors.title}
                                        </p>
                                    )}

                                    {/* Product Title */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700">
                                                Product Name
                                            </label>
                                            {builderMode === 'standard' && (
                                                <FieldGuide
                                                    guidance={PRODUCT_FIELD_GUIDANCE.title.guidance}
                                                    mode="standard"
                                                />
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            data-testid="product-title-input"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder={
                                                builderMode === 'guided'
                                                    ? categoryMeta.titlePlaceholder
                                                    : ''
                                            }
                                            required
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                        />
                                    </div>

                                    {/* Category */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label
                                                htmlFor="product-category"
                                                className="text-xs font-bold text-slate-700"
                                            >
                                                Product Category
                                            </label>
                                            {builderMode === 'standard' && (
                                                <FieldGuide
                                                    guidance={
                                                        PRODUCT_FIELD_GUIDANCE.category.guidance
                                                    }
                                                    mode="standard"
                                                />
                                            )}
                                        </div>
                                        <select
                                            id="product-category"
                                            value={category}
                                            onChange={(e) => {
                                                const nextCategory = e.target.value;
                                                setCategory(nextCategory);
                                                const nextMeta =
                                                    PRODUCT_CATEGORY_META[nextCategory] ||
                                                    DEFAULT_PRODUCT_CATEGORY_META;
                                                if (
                                                    !stallLocation ||
                                                    Object.values(PRODUCT_CATEGORY_META).some(
                                                        (m) => m.defaultLocation === stallLocation,
                                                    )
                                                ) {
                                                    setStallLocation(nextMeta.defaultLocation);
                                                }
                                                setMedia((prev) => {
                                                    if (
                                                        !prev.cover_thumbnail_url?.startsWith(
                                                            '/photos/',
                                                        )
                                                    ) {
                                                        return prev;
                                                    }
                                                    const nextDefault =
                                                        defaultMediaForCategory(nextCategory);
                                                    const existingVideos = prev.items.filter(
                                                        (item) => item.kind === 'video',
                                                    );
                                                    return {
                                                        ...nextDefault,
                                                        has_video: existingVideos.length > 0,
                                                        items: [
                                                            ...nextDefault.items,
                                                            ...existingVideos,
                                                        ],
                                                    };
                                                });

                                                if (!isInstallationApplicable(nextCategory)) {
                                                    setCombos((prev) => {
                                                        const filtered = prev.filter(
                                                            (c) =>
                                                                !c.slots.some(
                                                                    (s) => s.roleType === 'LABOR',
                                                                ),
                                                        );
                                                        return filtered;
                                                    });
                                                    if (
                                                        selectedFulfillment === 'combo-installation'
                                                    ) {
                                                        setSelectedFulfillment('pickup');
                                                    }
                                                }
                                            }}
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                        >
                                            <option value="" disabled>
                                                Select product category...
                                            </option>
                                            <option value="local-food">
                                                Local Food &amp; Bakery
                                            </option>
                                            <option value="repairs">
                                                Hardware &amp; AC Replacement Parts
                                            </option>
                                            <option value="greeting-cards">
                                                Handmade Cards &amp; Crafts
                                            </option>
                                            <option value="print-assist">
                                                Document &amp; Print Supplies
                                            </option>
                                            <option value="local-services">
                                                General Municipal Goods
                                            </option>
                                        </select>
                                    </div>

                                    {/* Detailed Description */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label
                                                htmlFor="product-description"
                                                className="text-xs font-bold text-slate-700"
                                            >
                                                Detailed Description
                                            </label>
                                            {builderMode === 'standard' && (
                                                <FieldGuide
                                                    guidance={
                                                        PRODUCT_FIELD_GUIDANCE.description.guidance
                                                    }
                                                    mode="standard"
                                                />
                                            )}
                                        </div>
                                        <textarea
                                            id="product-description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={3}
                                            placeholder={
                                                builderMode === 'guided'
                                                    ? 'Specify compatibility, dimensions, ingredients, or brand origin in Tagudin...'
                                                    : ''
                                            }
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
                                            <span>Continue to Product Photos</span>
                                            <ArrowRight className="size-3.5" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* STEP 2: Product Photos */}
                            {(builderMode === 'standard' || step === 2) && (
                                <div
                                    className={`space-y-4 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}
                                >
                                    {builderMode === 'guided' ? (
                                        <div>
                                            <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
                                                {PRODUCT_GUIDED_STEPS[1].guidedTitle}
                                            </h2>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                                {PRODUCT_GUIDED_STEPS[1].guidedDescription}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <label className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                                                Product Photos &amp; Proof
                                            </label>
                                            <FieldGuide
                                                guidance={PRODUCT_FIELD_GUIDANCE.media.guidance}
                                                mode="standard"
                                            />
                                        </div>
                                    )}

                                    <ListingMediaPicker
                                        media={media}
                                        categoryCode={category}
                                        listingType="product"
                                        onChange={setMedia}
                                    />

                                    {builderMode === 'guided' && (
                                        <div className="flex gap-2.5 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                className="shrink-0 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:px-5"
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStep(3)}
                                                className="flex-1 cursor-pointer rounded-xl bg-[#FFC72C] py-3 text-xs font-bold text-slate-950 shadow-xs hover:bg-[#e6b327]"
                                            >
                                                Continue to Pickup Point
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 3: Pickup Point */}
                            {(builderMode === 'standard' || step === 3) && (
                                <div
                                    className={`space-y-4 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}
                                >
                                    {builderMode === 'guided' ? (
                                        <div>
                                            <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
                                                {PRODUCT_GUIDED_STEPS[2].guidedTitle}
                                            </h2>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                                {PRODUCT_GUIDED_STEPS[2].guidedDescription}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <span className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                                                Shop &amp; Collection Point
                                            </span>
                                            <FieldGuide
                                                guidance={PRODUCT_FIELD_GUIDANCE.geography.guidance}
                                                mode="standard"
                                            />
                                        </div>
                                    )}

                                    <TagudinLocationPicker
                                        value={geography}
                                        initialAddress={
                                            stallLocation || categoryMeta.defaultLocation
                                        }
                                        locationLabel={
                                            builderMode === 'guided'
                                                ? 'Shop / Stall Pickup Location'
                                                : categoryMeta.locationLabel
                                        }
                                        addressPlaceholder={categoryMeta.locationPlaceholder}
                                        onChange={(newGeo) => {
                                            setGeography(newGeo);
                                            setStallLocation(
                                                newGeo.stall_location || newGeo.address_line_1,
                                            );
                                        }}
                                    />

                                    {builderMode === 'guided' && (
                                        <div className="flex gap-2.5 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setStep(2)}
                                                className="shrink-0 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:px-5"
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStep(4)}
                                                className="flex-1 cursor-pointer rounded-xl bg-[#FFC72C] py-3 text-xs font-bold text-slate-950 shadow-xs hover:bg-[#e6b327]"
                                            >
                                                Continue to Pricing &amp; Stock
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 4: Variations & Pricing */}
                            {(builderMode === 'standard' || step === 4) && (
                                <div
                                    className={`space-y-4 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}
                                >
                                    {builderMode === 'guided' ? (
                                        <div>
                                            <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
                                                {PRODUCT_GUIDED_STEPS[3].guidedTitle}
                                            </h2>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                                {PRODUCT_GUIDED_STEPS[3].guidedDescription}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <label className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                                                Pricing &amp; Inventory Variants
                                            </label>
                                            <FieldGuide
                                                guidance={PRODUCT_FIELD_GUIDANCE.pricing.guidance}
                                                mode="standard"
                                            />
                                        </div>
                                    )}

                                    {/* Variants List */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <label className="text-xs font-bold text-slate-700">
                                                    Product Variations ({variants.length})
                                                </label>
                                                <FieldGuide
                                                    guidance={
                                                        PRODUCT_FIELD_GUIDANCE.pricing.guidance
                                                    }
                                                    mode={builderMode}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addVariant}
                                                className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-extrabold text-[#0F2F58] hover:underline"
                                            >
                                                <Plus className="size-3" /> Add Variation
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-2.5">
                                            {variants.map((v, idx) => (
                                                <div
                                                    key={v.id || idx}
                                                    className={`space-y-3 rounded-2xl border p-4 shadow-2xs transition-all ${
                                                        v.isDefault
                                                            ? 'border-[#0F2F58] bg-[#FAFCFB] ring-1 ring-[#0F2F58]/20'
                                                            : 'border-slate-200 bg-white'
                                                    }`}
                                                >
                                                    {/* Header row with Variant Number & Default / Delete Actions */}
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-extrabold text-slate-900">
                                                            Variant {idx + 1}
                                                        </span>
                                                        <div className="flex shrink-0 items-center gap-1.5">
                                                            {v.isDefault ? (
                                                                <span className="rounded-full bg-[#EBF2FA] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F2F58]">
                                                                    Default Variant
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setDefaultVariant(idx)
                                                                    }
                                                                    className="cursor-pointer rounded-full border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                                                                >
                                                                    Make Default
                                                                </button>
                                                            )}
                                                            {variants.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removeVariant(idx)
                                                                    }
                                                                    className="cursor-pointer rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                                                    aria-label="Remove variant"
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Visible Variation Name Input Field */}
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-bold text-slate-700">
                                                            Variation Title / Option Name
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={v.name}
                                                            onChange={(e) =>
                                                                updateVariant(
                                                                    idx,
                                                                    'name',
                                                                    e.target.value,
                                                                )
                                                            }
                                                            placeholder="e.g. Regular, Small, 500g, Pack of 6..."
                                                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 shadow-2xs transition-all outline-none placeholder:text-slate-400 focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
                                                        />
                                                    </div>

                                                    {/* Price & Stock in clearly labeled visible input boxes */}
                                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                                        <div className="space-y-1">
                                                            <label className="text-[11px] font-bold text-slate-700">
                                                                Unit Price (₱)
                                                            </label>
                                                            <div className="relative flex items-center">
                                                                <span className="pointer-events-none absolute left-3 font-mono text-xs font-bold text-slate-400">
                                                                    ₱
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    value={
                                                                        v.price === 0 ? '' : v.price
                                                                    }
                                                                    onChange={(e) =>
                                                                        updateVariant(
                                                                            idx,
                                                                            'price',
                                                                            e.target.value === ''
                                                                                ? 0
                                                                                : parseFloat(
                                                                                      e.target
                                                                                          .value,
                                                                                  ) || 0,
                                                                        )
                                                                    }
                                                                    placeholder="0.00"
                                                                    step="0.01"
                                                                    min="0"
                                                                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-7 font-mono text-xs font-extrabold text-[#0F2F58] shadow-2xs transition-all outline-none placeholder:text-slate-400 focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[11px] font-bold text-slate-700">
                                                                Stock Quantity
                                                            </label>
                                                            <div className="relative flex items-center">
                                                                <input
                                                                    type="number"
                                                                    value={
                                                                        v.stock === 0 ? '' : v.stock
                                                                    }
                                                                    onChange={(e) =>
                                                                        updateVariant(
                                                                            idx,
                                                                            'stock',
                                                                            e.target.value === ''
                                                                                ? 0
                                                                                : parseInt(
                                                                                      e.target
                                                                                          .value,
                                                                                      10,
                                                                                  ) || 0,
                                                                        )
                                                                    }
                                                                    min="0"
                                                                    placeholder="0"
                                                                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-12 pl-3 font-mono text-xs font-bold text-slate-800 shadow-2xs transition-all outline-none placeholder:text-slate-400 focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
                                                                />
                                                                <span className="pointer-events-none absolute right-3 text-[10px] font-semibold text-slate-400">
                                                                    units
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Order Preparation Lead Time */}
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-slate-800">
                                                            Order Preparation Lead Time
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500">
                                                        How soon is this item ready for customer
                                                        pickup or courier hand-off?
                                                    </p>
                                                </div>
                                                <div className="grid w-full grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:inline-flex sm:w-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPrepLeadTime('in_stock')}
                                                        className={`cursor-pointer rounded-lg px-1.5 py-1 text-center text-[11px] font-bold transition-all sm:px-2.5 sm:text-xs ${
                                                            prepLeadTime === 'in_stock'
                                                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                                                : 'text-slate-600 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        In Stock (Ready)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPrepLeadTime('same_day')}
                                                        className={`cursor-pointer rounded-lg px-1.5 py-1 text-center text-[11px] font-bold transition-all sm:px-2.5 sm:text-xs ${
                                                            prepLeadTime === 'same_day'
                                                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                                                : 'text-slate-600 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        1–2 Hours Prep
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPrepLeadTime('next_day')}
                                                        className={`cursor-pointer rounded-lg px-1.5 py-1 text-center text-[11px] font-bold transition-all sm:px-2.5 sm:text-xs ${
                                                            prepLeadTime === 'next_day'
                                                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                                                : 'text-slate-600 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        1 Day Lead Time
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {builderMode === 'guided' && (
                                        <div className="flex gap-2.5 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setStep(3)}
                                                className="shrink-0 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:px-5"
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStep(5)}
                                                className="flex-1 cursor-pointer rounded-xl bg-[#FFC72C] py-3 text-xs font-bold text-slate-950 shadow-xs hover:bg-[#e6b327]"
                                            >
                                                Continue to Fulfillment
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 5: Fulfillment & Review */}
                            {(builderMode === 'standard' || step === 5) && (
                                <div
                                    className={`space-y-4 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}
                                >
                                    {builderMode === 'guided' ? (
                                        <div>
                                            <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
                                                {PRODUCT_GUIDED_STEPS[4].guidedTitle}
                                            </h2>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                                {PRODUCT_GUIDED_STEPS[4].guidedDescription}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <label className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                                                Fulfillment &amp; Partner Extensions
                                            </label>
                                            <FieldGuide
                                                guidance={
                                                    PRODUCT_FIELD_GUIDANCE.fulfillment.guidance
                                                }
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
                                            Sign in is required to save. Your work will be restored
                                            when you return.
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
                                        <div
                                            role="alert"
                                            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-semibold text-red-800"
                                        >
                                            {formErrors.form}
                                        </div>
                                    )}

                                    {/* Baseline Counter Pickup Card */}
                                    <div
                                        onClick={() => {
                                            setSelectedFulfillment('pickup');
                                            setExpandedComboIds({});
                                        }}
                                        className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                                            selectedFulfillment === 'pickup'
                                                ? 'border-[#0F2F58] bg-[#F0F5FA] shadow-xs ring-2 ring-[#0F2F58]/20'
                                                : 'border-slate-200 bg-[#FAFCFB] hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                                                    <Store className="size-5 text-amber-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-xs font-extrabold text-[#0F2F58]">
                                                            Counter Pickup at Stall
                                                        </h3>
                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-extrabold text-emerald-800">
                                                            Always Active · Free
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                                        <span>Direct in-person pickup</span>
                                                        {stallLocation ? (
                                                            <span
                                                                className="inline-flex cursor-help items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                                                                title={`Collection point: ${stallLocation}`}
                                                            >
                                                                <Info className="size-3 shrink-0 text-slate-400" />
                                                                <span className="max-w-[150px] truncate">
                                                                    {stallLocation}
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400">
                                                                (Stall location)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFulfillment('pickup');
                                                    setExpandedComboIds({});
                                                }}
                                                className={`min-h-11 shrink-0 cursor-pointer self-start rounded-full px-3 py-1 text-[10px] font-extrabold transition-all ${
                                                    selectedFulfillment === 'pickup'
                                                        ? 'bg-emerald-700 text-white shadow-xs'
                                                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                {selectedFulfillment === 'pickup'
                                                    ? '✓ Active Default'
                                                    : 'Switch to Pickup Only'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Partnered Options Section Divider */}
                                    <div className="border-t border-slate-200 pt-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                                        Partnered Options
                                                    </span>
                                                    <span className="rounded-full bg-[#0F2F58] px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-white">
                                                        DEAL CHAIN
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-[11px] text-slate-500">
                                                    Customer-selectable delivery &amp; install
                                                    combinations with local partners
                                                </p>
                                            </div>
                                            {combos.length > 0 && (
                                                <span className="text-[11px] font-bold text-slate-500">
                                                    {combos.length}{' '}
                                                    {combos.length === 1 ? 'Combo' : 'Combos'}{' '}
                                                    Available
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* All Available Partner Combos List */}
                                    <div className="space-y-3">
                                        {combos.map((c, idx) => {
                                            const isSelected = selectedFulfillment === c.id;
                                            const isExpanded = isComboExpanded(c.id);

                                            return (
                                                <div
                                                    key={c.id}
                                                    className={`rounded-2xl border p-3.5 transition-all ${
                                                        isSelected
                                                            ? 'border-[#0F2F58] bg-[#FAFCFB] shadow-xs ring-2 ring-[#0F2F58]/20'
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    {/* Combo Header: Clicking anywhere on header (except buttons) toggles flow expansion without changing active state */}
                                                    <div
                                                        onClick={() => toggleComboExpansion(c.id)}
                                                        className="flex cursor-pointer flex-col gap-2 border-b border-slate-100 pb-2.5 sm:flex-row sm:items-center sm:justify-between"
                                                    >
                                                        <div className="flex min-w-0 items-center gap-2 sm:flex-1">
                                                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#EBF2FA] text-[#0F2F58]">
                                                                {renderComboIcon(
                                                                    c.icon,
                                                                    'size-3.5',
                                                                )}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <h3 className="truncate text-xs font-extrabold text-[#0F2F58]">
                                                                        {c.title}
                                                                    </h3>
                                                                    {isSelected && (
                                                                        <span className="py-0.2 shrink-0 rounded-full bg-emerald-100 px-2 text-[8.5px] font-extrabold text-emerald-800">
                                                                            Active
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="truncate text-[10.5px] text-slate-500">
                                                                    {c.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="ml-0 flex w-full shrink-0 flex-wrap items-center justify-start gap-1.5 sm:ml-2 sm:w-auto sm:justify-end">
                                                            {/* Touchpoint 1: View / Explore Deal Chain Flow */}
                                                            <button
                                                                type="button"
                                                                data-testid={`toggle-flow-${c.id}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleComboExpansion(c.id);
                                                                }}
                                                                className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                                                                    isExpanded
                                                                        ? 'border-[#0F2F58]/30 bg-[#EBF2FA] text-[#0F2F58]'
                                                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                                }`}
                                                                aria-expanded={isExpanded}
                                                                title={
                                                                    isExpanded
                                                                        ? 'Hide Deal Chain Flow'
                                                                        : 'Explore Deal Chain Flow'
                                                                }
                                                            >
                                                                <Eye className="size-3 text-[#0F2F58]" />
                                                                <span>
                                                                    {isExpanded
                                                                        ? 'Hide Flow'
                                                                        : 'View Flow'}
                                                                </span>
                                                                {isExpanded ? (
                                                                    <ChevronUp className="size-3 text-slate-400" />
                                                                ) : (
                                                                    <ChevronDown className="size-3 text-slate-400" />
                                                                )}
                                                            </button>

                                                            {/* Touchpoint 2: Select as Active for listing */}
                                                            <button
                                                                type="button"
                                                                data-testid={`toggle-active-${c.id}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (isSelected) {
                                                                        setSelectedFulfillment(
                                                                            'pickup',
                                                                        );
                                                                        setExpandedComboIds({});
                                                                    } else {
                                                                        setSelectedFulfillment(
                                                                            c.id,
                                                                        );
                                                                        setCurrentComboIdx(idx);
                                                                        setExpandedComboIds(
                                                                            (prev) => ({
                                                                                ...prev,
                                                                                [c.id]: true,
                                                                            }),
                                                                        );
                                                                    }
                                                                }}
                                                                className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-extrabold transition-all ${
                                                                    isSelected
                                                                        ? 'bg-[#0F2F58] text-white shadow-2xs hover:bg-[#163e72]'
                                                                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                                                                }`}
                                                            >
                                                                {isSelected
                                                                    ? '✓ Active Selection'
                                                                    : 'Select as Active'}
                                                            </button>

                                                            {/* Remove Option */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveCombo(c.id);
                                                                }}
                                                                className="cursor-pointer p-1 text-slate-400 transition-colors hover:text-red-500"
                                                                title="Remove this partnered option"
                                                                aria-label="Remove option"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* When flow is expanded: Show the Deal Chain Pipeline and Slot details regardless of active state */}
                                                    {isExpanded ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                data-testid={`customize-deal-chain-${c.id}`}
                                                                onClick={() => {
                                                                    setCustomizingComboId(c.id);
                                                                    setDealChainStudioOpen(true);
                                                                }}
                                                                className="mb-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#0F2F58] hover:border-[#0F2F58]/40 hover:bg-slate-50"
                                                            >
                                                                <Sliders className="size-3" />
                                                                Customize Deal Chain Nodes (
                                                                {c.slots.length + 1})
                                                            </button>
                                                            {/* Compact DAG Canvas View */}
                                                            {/* Compact Tactile Pipeline Canvas View */}
                                                            <div className="my-2 [scrollbar-width:none] overflow-x-auto rounded-xl border border-slate-200 bg-[#F8FAFC] p-2.5">
                                                                <div className="mb-2 flex items-center justify-between">
                                                                    <span className="text-[9.5px] font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                                                        Deal Chain Pipeline View
                                                                    </span>
                                                                    <span className="text-[9.5px] font-bold text-slate-400">
                                                                        {c.slots.length + 1} Relay
                                                                        Stages
                                                                    </span>
                                                                </div>
                                                                <div className="flex min-w-max items-center gap-2">
                                                                    {/* Stage 1: Product Node (Your Listing) */}
                                                                    <div className="flex min-w-[155px] items-center gap-2.5 rounded-xl border border-amber-300 bg-white p-2 shadow-2xs">
                                                                        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-amber-200 bg-amber-50">
                                                                            {media.items?.[0]
                                                                                ?.url ||
                                                                            media.cover_thumbnail_url ? (
                                                                                <img
                                                                                    src={
                                                                                        media
                                                                                            .items?.[0]
                                                                                            ?.url ||
                                                                                        media.cover_thumbnail_url ||
                                                                                        ''
                                                                                    }
                                                                                    alt={
                                                                                        title ||
                                                                                        'Product'
                                                                                    }
                                                                                    className="h-full w-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <Store className="size-4 text-amber-600" />
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="py-0.2 rounded border border-amber-300 bg-amber-100 px-1.5 text-[8px] font-extrabold text-amber-900 uppercase">
                                                                                    Product
                                                                                </span>
                                                                                <span className="font-mono text-[9.5px] font-bold text-amber-950">
                                                                                    ₱
                                                                                    {defaultVariant?.price.toFixed(
                                                                                        0,
                                                                                    ) || '0'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="mt-0.5 max-w-[110px] truncate text-xs font-extrabold text-slate-900">
                                                                                {title.trim()
                                                                                    ? title
                                                                                    : 'Your Product'}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Pipeline Connectors & Slot Nodes */}
                                                                    {c.slots.map((s, sIdx) => {
                                                                        const isCourier = s.roleType === 'COURIER';
                                                                        const isStore = s.roleType === 'STORE';
                                                                        const isAudit = s.roleType === 'AUDIT';
                                                                        const isRecycle = s.roleType === 'RECYCLE';

                                                                        const meta = isCourier
                                                                            ? {
                                                                                  label: 'Courier',
                                                                                  border: 'border-sky-300',
                                                                                  badge: 'bg-sky-100 border-sky-300 text-sky-900',
                                                                                  icon: <Truck className="size-4 text-sky-600" />,
                                                                                  accent: 'bg-sky-50',
                                                                              }
                                                                            : isStore
                                                                              ? {
                                                                                    label: 'Store',
                                                                                    border: 'border-amber-300',
                                                                                    badge: 'bg-amber-100 border-amber-300 text-amber-900',
                                                                                    icon: <Store className="size-4 text-amber-600" />,
                                                                                    accent: 'bg-amber-50',
                                                                                }
                                                                              : isAudit
                                                                                ? {
                                                                                      label: 'Audit',
                                                                                      border: 'border-violet-300',
                                                                                      badge: 'bg-violet-100 border-violet-300 text-violet-900',
                                                                                      icon: <ShieldCheck className="size-4 text-violet-600" />,
                                                                                      accent: 'bg-violet-50',
                                                                                  }
                                                                                : isRecycle
                                                                                  ? {
                                                                                        label: 'Recycle',
                                                                                        border: 'border-emerald-300',
                                                                                        badge: 'bg-emerald-100 border-emerald-300 text-emerald-900',
                                                                                        icon: <Package className="size-4 text-emerald-600" />,
                                                                                        accent: 'bg-emerald-50',
                                                                                    }
                                                                                  : {
                                                                                        label: 'Labor',
                                                                                        border: 'border-emerald-300',
                                                                                        badge: 'bg-emerald-100 border-emerald-300 text-emerald-900',
                                                                                        icon: <Wrench className="size-4 text-emerald-600" />,
                                                                                        accent: 'bg-emerald-50',
                                                                                    };

                                                                        return (
                                                                            <React.Fragment
                                                                                key={s.id || sIdx}
                                                                            >
                                                                                <div className="flex flex-col items-center px-0.5 text-xs font-bold text-slate-400">
                                                                                    ➔
                                                                                </div>

                                                                                <div
                                                                                    className={`flex items-center gap-2.5 rounded-xl border ${meta.border} min-w-[160px] bg-white p-2 shadow-2xs`}
                                                                                >
                                                                                    <div
                                                                                        className={`flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ${meta.accent} border border-slate-200/80`}
                                                                                    >
                                                                                        {meta.icon}
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <div className="flex items-center gap-1">
                                                                                            <span
                                                                                                className={`py-0.2 rounded border px-1.5 text-[8px] font-extrabold uppercase ${meta.badge}`}
                                                                                            >
                                                                                                {
                                                                                                    meta.label
                                                                                                }
                                                                                            </span>
                                                                                            <span className="font-mono text-[9.5px] font-bold text-slate-700">
                                                                                                {formatPartnerFee(s.feeMinor, 0)}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="mt-0.5 max-w-[110px] truncate text-xs font-extrabold text-slate-900">
                                                                                            {getShortPartnerName(
                                                                                                s.providerName,
                                                                                            ) ||
                                                                                                `Open ${meta.label}`}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </React.Fragment>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* Slot Binding Selectors: Single-line compact row matching design kit */}
                                                            <div className="space-y-1 pt-0.5">
                                                                <div className="text-[9.5px] font-bold tracking-wider text-slate-400 uppercase">
                                                                    Attached Partner Slots (
                                                                    {c.slots.length})
                                                                </div>
                                                                {c.slots.map((s, sIdx) => (
                                                                    <div
                                                                        key={s.id || sIdx}
                                                                        onClick={() =>
                                                                            openSlotPicker(
                                                                                c.id,
                                                                                sIdx,
                                                                                s.roleType,
                                                                                s.listingId,
                                                                            )
                                                                        }
                                                                        className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-2xs transition-all hover:border-[#0F2F58]/50"
                                                                    >
                                                                        <div className="flex min-w-0 items-center gap-2">
                                                                            <span
                                                                                className={`rounded px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase ${
                                                                                    s.roleType === 'COURIER'
                                                                                        ? 'bg-sky-100 text-sky-800'
                                                                                        : s.roleType === 'STORE'
                                                                                          ? 'bg-amber-100 text-amber-800'
                                                                                          : s.roleType === 'AUDIT'
                                                                                            ? 'bg-violet-100 text-violet-800'
                                                                                            : s.roleType === 'RECYCLE'
                                                                                              ? 'bg-emerald-100 text-emerald-800'
                                                                                              : 'bg-emerald-100 text-emerald-800'
                                                                                }`}
                                                                            >
                                                                                {s.roleType}
                                                                            </span>
                                                                            <span className="truncate font-extrabold text-[#0F2F58]">
                                                                                {s.providerName}
                                                                            </span>
                                                                            <span className="shrink-0 font-mono text-[11px] font-bold text-emerald-700">
                                                                                {formatPartnerFee(s.feeMinor)}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openSlotPicker(
                                                                                    c.id,
                                                                                    sIdx,
                                                                                    s.roleType,
                                                                                    s.listingId,
                                                                                );
                                                                            }}
                                                                            className="shrink-0 cursor-pointer text-[10.5px] font-bold text-[#0F2F58] hover:underline"
                                                                        >
                                                                            Change ▾
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="pt-2 text-[11px] text-slate-500">
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="size-1.5 rounded-full bg-slate-300" />
                                                                <span>
                                                                    Includes{' '}
                                                                    {c.slots
                                                                        .map((s) => s.roleType)
                                                                        .join(' + ')}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Dedicated Single Attach Delivery / Service Extension Button (Deduplicated) */}
                                        <button
                                            type="button"
                                            onClick={() => setAttachModalOpen(true)}
                                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-[#FAFCFB] py-3 text-xs font-bold text-[#0F2F58] transition-all hover:border-[#0F2F58] hover:bg-[#F0F5FA]"
                                        >
                                            <Plus className="size-3.5" />
                                            <span>
                                                Attach Delivery / Service Extension · DEAL CHAIN
                                            </span>
                                        </button>
                                    </div>

                                    {/* Summary Preview Card */}
                                    {builderMode === 'guided' && (
                                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <span className="rounded-full bg-[#EBF2FA] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F2F58] uppercase">
                                                    Shape A4 Product · {category}
                                                </span>
                                                <span className="font-mono text-base font-extrabold text-[#0F2F58]">
                                                    ₱{defaultVariant?.price.toFixed(2)}
                                                </span>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-extrabold text-slate-900">
                                                    {title || 'Untitled Product'}
                                                </h3>
                                                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                                    {description ||
                                                        'Direct Tagudin product listing.'}
                                                </p>
                                            </div>

                                            <div className="space-y-1 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs">
                                                <div className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                                                    Active Variants ({variants.length})
                                                </div>
                                                {variants.map((v, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex justify-between text-slate-700"
                                                    >
                                                        <span>
                                                            {v.name} ({v.stock} in stock)
                                                        </span>
                                                        <span className="font-mono font-bold text-[#0F2F58]">
                                                            ₱{v.price.toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Primary Fulfillment in Summary */}
                                            <div className="space-y-1 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs">
                                                <div className="flex items-center justify-between text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                                                    <span>Active Fulfillment</span>
                                                    <span className="font-mono font-bold text-emerald-700">
                                                        {activeFulfillmentInfo.badge}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 font-bold text-[#0F2F58]">
                                                    {activeFulfillmentInfo.icon}
                                                    <span>{activeFulfillmentInfo.title}</span>
                                                </div>
                                                <p className="text-[10.5px] text-slate-500">
                                                    {activeFulfillmentInfo.description}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-amber-800">
                                                <ShieldCheck className="size-4 shrink-0 text-amber-700" />
                                                <span>
                                                    Saved as a private draft; review submission is a
                                                    separate step.
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {builderMode === 'guided' ? (
                                        <div className="flex gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setStep(4)}
                                                className="cursor-pointer rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0F2F58] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#153e74] disabled:opacity-50"
                                            >
                                                {isSubmitting
                                                    ? 'Saving listing...'
                                                    : isAuthenticated
                                                      ? 'Save Private Draft'
                                                      : 'Sign in to Save Draft'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-4">
                                            <div>
                                                <span className="text-xs font-extrabold text-[#0F2F58]">
                                                    Standard All-in-One Form
                                                </span>
                                                <p className="text-[11px] text-slate-500">
                                                    All sections visible · Ready to save
                                                </p>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting || !title.trim()}
                                                className="w-full cursor-pointer rounded-xl bg-[#0F2F58] px-6 py-3 text-center text-xs font-extrabold text-white shadow-md hover:bg-[#153e74] disabled:opacity-50 sm:w-auto"
                                            >
                                                {isSubmitting
                                                    ? 'Saving draft...'
                                                    : isAuthenticated
                                                      ? 'Save Private Draft'
                                                      : 'Sign in to Save Draft'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>
                        {/* Bottom Mode Switcher for Mobile & Desktop */}
                        {/* Bottom Mode Switcher for Mobile only */}
                        <div className="flex justify-center border-t border-slate-100 pt-3 pb-1 sm:hidden">
                            <button
                                type="button"
                                data-testid="bottom-mode-switcher-btn"
                                onClick={() =>
                                    setBuilderMode((m) => (m === 'guided' ? 'standard' : 'guided'))
                                }
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
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

                    {/* RIGHT COLUMN: Customer Live Twin Product Preview (Cols 8-12, Sticky on Desktop) */}
                    <aside className="sticky top-20 hidden space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-5 lg:block">
                        {renderCustomerLiveTwin()}
                    </aside>
                </div>

                <GlovoWaveModal
                    open={mobilePreviewOpen}
                    onClose={() => setMobilePreviewOpen(false)}
                    title="Customer Preview"
                    subtitle="How your product looks to customers"
                >
                    {renderCustomerLiveTwin()}
                </GlovoWaveModal>

                <CreatorPostModal open={creatorOpen} onClose={() => setCreatorOpen(false)} />
                <QuickDealScanModal open={quickDealOpen} onClose={() => setQuickDealOpen(false)} />

                {/* Slot Listing Picker Modal for Swappable Deal Chain Partners */}
                <SlotListingPickerModal
                    open={slotPickerState.open}
                    onClose={() =>
                        setSlotPickerState((prev) => ({
                            ...prev,
                            open: false,
                            onPickedOverride: undefined,
                        }))
                    }
                    role={slotPickerState.role}
                    currentListingId={slotPickerState.currentListingId}
                    candidates={
                        slotCandidateListings.length > 0 ? slotCandidateListings : undefined
                    }
                    onSelectCandidate={handleCandidateSelected}
                    onSelectOpenSlot={() => {
                        const openSlot = {
                            id: 'open-slot',
                            title: 'Open Partner Slot',
                            providerName: 'Buyer selects at checkout',
                            priceMinor: undefined,
                            isOpenSlot: true,
                        };
                        if (slotPickerState.onPickedOverride) {
                            slotPickerState.onPickedOverride(openSlot);
                        } else {
                            setCombos((prev) =>
                                prev.map((combo) => {
                                    if (combo.id !== slotPickerState.comboId) return combo;
                                    return {
                                        ...combo,
                                        nodes: combo.nodes?.map((node) => node.id === combo.slots[slotPickerState.slotIndex]?.id ? {
                                            ...node, listingId: undefined, listingVersionId: undefined, feeMinor: undefined, isOpenSlot: true, assignmentMode: 'buyer_choice',
                                        } : node),
                                        slots: combo.slots.map((slot, index) =>
                                            index === slotPickerState.slotIndex
                                                ? {
                                                      ...slot,
                                                      providerName: openSlot.providerName,
                                                      fee: undefined,
                                                      feeMinor: undefined,
                                                      listingId: undefined,
                                                      listingVersionId: undefined,
                                                      rating: undefined,
                                                      isOpenSlot: true,
                                                      assignmentMode: 'buyer_choice',
                                                  }
                                                : slot,
                                        ),
                                    };
                                }),
                            );
                        }
                        setSlotPickerState((prev) => ({
                            ...prev,
                            open: false,
                            onPickedOverride: undefined,
                        }));
                    }}
                />
                <DealChainCatalogModal
                    open={attachModalOpen}
                    onClose={() => setAttachModalOpen(false)}
                    categoryCode={category}
                    listingType="product"
                    workShape={defaultWorkSet?.work_shape || 'A4'}
                    recommended={(dealChainOptions?.recommended ?? []).filter(
                        (recipe) =>
                            isRecipeCompatible(
                                recipe,
                                category,
                                'product',
                                defaultWorkSet?.work_shape || 'A4',
                            ),
                    )}
                    otherRecipes={[...(dealChainOptions?.recommended ?? []), ...(dealChainOptions?.other_recipes ?? [])]
                        .filter(
                            (recipe) =>
                                isRecipeCompatible(
                                    recipe,
                                    null,
                                    'product',
                                    defaultWorkSet?.work_shape || 'A4',
                                ) &&
                                !((dealChainOptions?.recommended ?? []).some(
                                    (rec) => rec.recipeId === recipe.recipeId && isRecipeCompatible(rec, category, 'product', defaultWorkSet?.work_shape || 'A4'),
                                )),
                        )}
                    onSelectRecipe={handleSelectDealChainRecipe}
                    onBuildCustom={() => {
                        setCustomizingComboId(null);
                        setAttachModalOpen(false);
                        setDealChainStudioOpen(true);
                    }}
                />
                <DealChainCustomizerModal
                    open={dealChainStudioOpen}
                    onClose={() => {
                        setDealChainStudioOpen(false);
                        setCustomizingComboId(null);
                    }}
                    combination={studioCombination}
                    primaryListingTitle={title || 'Untitled Product'}
                    primaryListingPricePesos={Math.round(defaultVariant?.price || 0)}
                    primaryListingType="product"
                    primaryListingCategoryCode={category}
                    onSave={handleSaveDealChain}
                    onPickPartnerForSlot={(slotType: SlotType, onPicked) => {
                        setSlotPickerState({
                            open: true,
                            role: slotType,
                            comboId: customizingComboId || 'studio-new',
                            slotIndex: -1,
                            currentListingId: undefined,
                            onPickedOverride: onPicked,
                        });
                    }}
                />
            </div>
        </div>
    );
}
