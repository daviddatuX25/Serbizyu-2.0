import React, { useEffect, useState, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import {
    ArrowLeft,
    ArrowRight,
    Eye,
    Package,
    Plus,
    ShieldCheck,
    Sliders,
    Sparkles,
    Star,
    Store,
    Trash2,
    Truck,
    Video,
    Wrench,
    X,
} from 'lucide-react';
import { FieldGuide } from '../../components/ui/FieldGuide';
import {
    PRODUCT_FIELD_GUIDANCE,
    PRODUCT_GUIDED_STEPS,
    type BuilderMode,
} from '../../lib/builderGuidance';
import TagudinLocationPicker, { type StructuredGeography } from '../../components/listings/TagudinLocationPicker';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';
import { CreatorPostModal } from '../../components/marketplace/CreatorPostModal';
import { QuickDealScanModal } from '../../components/marketplace/QuickDealScanModal';
import GlovoWaveModal from '../../components/mobile/GlovoWaveModal';
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

interface ProductVariantForm {
    id: string;
    name: string;
    price: number;
    stock: number;
    isDefault: boolean;
}

export interface PartnerSlot {
    id: string;
    roleType: 'COURIER' | 'LABOR';
    slotLabel: string;
    providerName: string;
    fee: number;
    feeMinor: number;
    rating: number;
    slaText?: string;
    photoUrl?: string;
}

export interface PartnerCombo {
    id: string;
    title: string;
    icon: string;
    description: string;
    isDefault: boolean;
    slots: PartnerSlot[];
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

interface CreateProductProps {
    session?: SliceSession | null;
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
    'repairs': {
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
        (draft.builderMode === undefined || draft.builderMode === 'guided' || draft.builderMode === 'standard' || draft.builderMode === 'advanced') &&
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
    return c === 'repairs' || c.includes('appliance') || c.includes('hardware') || c.includes('machin') || c.includes('install');
}

export function defaultCombosForCategory(categoryCode: string): PartnerCombo[] {
    const deliveryCombo: PartnerCombo = {
        id: 'combo-delivery',
        title: 'Doorstep Delivery',
        icon: 'Truck',
        description: 'On-demand motorcycle delivery straight to customer door in Tagudin.',
        isDefault: false,
        slots: [
            {
                id: '0198a3b1-7c40-7abc-8def-5234567890b9',
                roleType: 'COURIER',
                slotLabel: 'Doorstep Courier Runner',
                providerName: 'Danny Express Motorcycle Pool',
                fee: 35,
                feeMinor: 3500,
                rating: 4.9,
                slaText: 'On-demand ~20 mins transit',
                photoUrl: '/photos/courier.jpg',
            },
        ],
    };

    if (isInstallationApplicable(categoryCode)) {
        const installCombo: PartnerCombo = {
            id: 'combo-installation',
            title: 'Delivery + Installation Labor',
            icon: 'Wrench',
            description: 'Courier transit combined with on-site certified technician labor.',
            isDefault: false,
            slots: [
                {
                    id: '0198a3b1-7c40-7abc-8def-5234567890b9',
                    roleType: 'COURIER',
                    slotLabel: 'Doorstep Courier Runner',
                    providerName: 'Danny Express Motorcycle Pool',
                    fee: 35,
                    feeMinor: 3500,
                    rating: 4.9,
                    slaText: 'On-demand ~20 mins transit',
                    photoUrl: '/photos/courier.jpg',
                },
                {
                    id: '0198a3b1-7c40-7abc-8def-5234567890bb',
                    roleType: 'LABOR',
                    slotLabel: 'Technician Labor Partner',
                    providerName: 'Kuya Ben Aircon Services',
                    fee: 250,
                    feeMinor: 25000,
                    rating: 4.9,
                    slaText: 'Certified technician installation',
                    photoUrl: '/photos/ac-clean.jpg',
                },
            ],
        };
        return [deliveryCombo, installCombo];
    }

    return [deliveryCombo];
}

const PRESET_RECIPES = [
    {
        key: 'doorstep_delivery',
        title: 'Doorstep Delivery',
        icon: 'Truck',
        description: 'Tagudin motorcycle courier dispatch straight to recipient door',
        applicableCategories: ['local-food', 'repairs', 'crafts', 'clothing', 'print-assist', 'local-services', 'general'],
        slots: [
            {
                id: '0198a3b1-7c40-7abc-8def-5234567890b9',
                roleType: 'COURIER' as const,
                slotLabel: 'Doorstep Courier Runner',
                providerName: 'Danny Express Motorcycle Pool',
                fee: 35,
                feeMinor: 3500,
                rating: 4.9,
                slaText: 'On-demand ~20 mins transit',
                photoUrl: '/photos/courier.jpg',
            },
        ],
    },
    {
        key: 'delivery_install',
        title: 'Delivery + Installation Labor',
        icon: 'Wrench',
        description: 'Courier transit + certified trade technician installation combo',
        applicableCategories: ['repairs', 'hardware', 'appliances'],
        slots: [
            {
                id: '0198a3b1-7c40-7abc-8def-5234567890b9',
                roleType: 'COURIER' as const,
                slotLabel: 'Doorstep Courier Runner',
                providerName: 'Danny Express Motorcycle Pool',
                fee: 35,
                feeMinor: 3500,
                rating: 4.9,
                slaText: 'On-demand ~20 mins transit',
                photoUrl: '/photos/courier.jpg',
            },
            {
                id: '0198a3b1-7c40-7abc-8def-5234567890bb',
                roleType: 'LABOR' as const,
                slotLabel: 'Technician Labor Partner',
                providerName: 'Kuya Ben Aircon Services',
                fee: 250,
                feeMinor: 25000,
                rating: 4.9,
                slaText: 'Certified technician installation',
                photoUrl: '/photos/ac-clean.jpg',
            },
        ],
    },
    {
        key: 'tool_rental',
        title: 'Tool Rental Kit + Courier Delivery',
        icon: 'Wrench',
        description: 'Tagudin tool depot rental and motorcycle courier delivery',
        applicableCategories: ['repairs', 'hardware'],
        slots: [
            {
                id: 'can_cour_bicycle',
                roleType: 'COURIER' as const,
                slotLabel: 'Courier Transit Runner',
                providerName: 'Centro Eco Courier',
                fee: 25,
                feeMinor: 2500,
                rating: 4.8,
                slaText: 'Eco transit ~15 mins',
                photoUrl: '/photos/courier.jpg',
            },
            {
                id: '0198a3b1-7c40-7abc-8def-5234567890b8',
                roleType: 'LABOR' as const,
                slotLabel: 'Tool Prep Specialist',
                providerName: 'Kuya Ben Aircon Services',
                fee: 95,
                feeMinor: 9500,
                rating: 4.9,
                slaText: 'Tool deployment prep',
                photoUrl: '/photos/ac-clean.jpg',
            },
        ],
    },
    {
        key: 'hauling',
        title: 'Delivery + Eco-Scrap Removal',
        icon: 'Package',
        description: 'Doorstep delivery combined with old scrap disposal & material reclaim',
        applicableCategories: ['repairs', 'hardware', 'general'],
        slots: [
            {
                id: '0198a3b1-7c40-7abc-8def-5234567890b9',
                roleType: 'COURIER' as const,
                slotLabel: 'Doorstep Courier Runner',
                providerName: 'Danny Express Motorcycle Pool',
                fee: 35,
                feeMinor: 3500,
                rating: 4.9,
                slaText: 'On-demand ~20 mins transit',
                photoUrl: '/photos/courier.jpg',
            },
            {
                id: '0198a3b1-7c40-7abc-8def-5234567890b2',
                roleType: 'LABOR' as const,
                slotLabel: 'Recycle Reclamation Partner',
                providerName: 'Ate Elena Garment Repairs',
                fee: 45,
                feeMinor: 4500,
                rating: 4.8,
                slaText: 'Material reclaim and safe disposal',
                photoUrl: '/photos/ac-clean.jpg',
            },
        ],
    },
];

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
export default function CreateProduct({
    session,
    partnerListings = [],
    editingDraft = null,
}: CreateProductProps) {
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
    const [variants, setVariants] = useState<ProductVariantForm[]>(
        editingDraft?.variants && Array.isArray(editingDraft.variants) && editingDraft.variants.length > 0
            ? (editingDraft.variants as unknown as ProductVariantForm[])
            : [
                {
                    id: 'var-1',
                    name: '',
                    price: 0,
                    stock: 0,
                    isDefault: true,
                },
            ],
    );
    // Step 3: Swappable Deal Chain Fulfillment
    const [combos, setCombos] = useState<PartnerCombo[]>(() => {
        if (
            editingDraft?.deal_chain_combinations &&
            Array.isArray(editingDraft.deal_chain_combinations) &&
            editingDraft.deal_chain_combinations.length > 0
        ) {
            return editingDraft.deal_chain_combinations as unknown as PartnerCombo[];
        }
        return defaultCombosForCategory(
            editingDraft?.category_code || editingDraft?.categoryCode || '',
        );
    });
    const [selectedFulfillment, setSelectedFulfillment] = useState<'pickup' | string>(
        (editingDraft?.deal_chain_specification as any)?.selected_combo_id || 'pickup',
    );
    const [currentComboIdx, setCurrentComboIdx] = useState(0);
    const [attachModalOpen, setAttachModalOpen] = useState(false);

    // Slot Picker Modal State
    const [slotPickerState, setSlotPickerState] = useState<{
        open: boolean;
        role: string;
        comboId: string;
        slotIndex: number;
        currentListingId?: string;
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
        setCombos(pendingDraft.combos);
        setSelectedFulfillment(
            pendingDraft.selectedFulfillment === 'pickup' ||
                pendingDraft.combos.some((combo) => combo.id === pendingDraft.selectedFulfillment)
                ? pendingDraft.selectedFulfillment
                : 'pickup',
        );
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
    const openSlotPicker = (comboId: string, slotIndex: number, role: 'COURIER' | 'LABOR', currentId?: string) => {
        setSlotPickerState({
            open: true,
            role,
            comboId,
            slotIndex,
            currentListingId: currentId,
        });
    };

    const handleCandidateSelected = (candidate: SlotCandidateListing) => {
        setCombos((prevCombos) =>
            prevCombos.map((c) => {
                if (c.id !== slotPickerState.comboId) return c;
                return {
                    ...c,
                    slots: c.slots.map((slot, sIdx) => {
                        if (sIdx !== slotPickerState.slotIndex) return slot;
                        return {
                            ...slot,
                            id: candidate.id,
                            providerName: candidate.provider_name,
                            fee: candidate.price_minor / 100,
                            feeMinor: candidate.price_minor,
                            rating: candidate.rating ?? 5.0,
                            slaText: candidate.sla_text,
                            photoUrl: candidate.photo_url,
                        };
                    }),
                };
            })
        );
    };


    const handleRemoveCombo = (comboId: string) => {
        setCombos((prev) => prev.filter((c) => c.id !== comboId));
        if (selectedFulfillment === comboId) {
            setSelectedFulfillment('pickup');
        }
        setCurrentComboIdx((prev) => Math.max(0, prev - 1));
    };

    const handleAddPresetRecipe = (presetKey: string) => {
        const preset = PRESET_RECIPES.find((p) => p.key === presetKey);
        if (!preset) return;

        const newCombo: PartnerCombo = {
            id: `combo-${preset.key}-${Date.now()}`,
            title: preset.title,
            icon: preset.icon,
            description: preset.description,
            isDefault: combos.length === 0,
            slots: preset.slots.map((s) => ({ ...s })),
        };

        setCombos((prev) => [...prev, newCombo]);
        setCurrentComboIdx(combos.length);
        setSelectedFulfillment(newCombo.id);
        setAttachModalOpen(false);
    };

    const getShortPartnerName = (fullName: string) => {
        if (fullName.includes('Danny Express')) return 'Danny Exp';
        if (fullName.includes('Kuya Ben')) return 'Kuya Ben';
        if (fullName.includes('Centro Eco')) return 'Centro Eco';
        if (fullName.includes('Ate Elena')) return 'Ate Elena';
        if (fullName.length > 13) return fullName.slice(0, 12) + '…';
        return fullName;
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
                title: 'Free Counter Pickup · Tagudin Public Market',
                badge: 'Free',
                icon: <Store className="size-3.5 text-emerald-600" />,
                description: `Collect at ${stallLocation || 'Tagudin Public Market'} directly`,
                totalFee: 0,
                activeCombo: undefined as PartnerCombo | undefined,
            };
        }

        const totalFee = activeCombo.slots.reduce((sum, s) => sum + s.fee, 0);
        const feeFormatted = `+₱${totalFee.toFixed(2)}`;

        // Combo 1: Doorstep Delivery
        if (activeCombo.id === 'combo-delivery' || activeCombo.title.toLowerCase().includes('doorstep')) {
            const courierSlot = activeCombo.slots.find((s) => s.roleType === 'COURIER') || activeCombo.slots[0];
            const partnerName = courierSlot
                ? (courierSlot.providerName.includes('Danny Express')
                    ? 'Danny Express'
                    : courierSlot.providerName)
                : 'Courier';
            return {
                title: `${feeFormatted} ${partnerName} Delivery`,
                badge: feeFormatted,
                icon: <Truck className="size-3.5 text-indigo-600" />,
                description: courierSlot ? `${courierSlot.providerName} · Rating ${courierSlot.rating.toFixed(1)}` : 'Courier delivery',
                totalFee,
                activeCombo,
            };
        }

        // Combo 2: Delivery + Installation Labor
        if (activeCombo.id === 'combo-installation' || activeCombo.title.toLowerCase().includes('install')) {
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
            icon: <Truck className="size-3.5 text-indigo-600" />,
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

        const addons =
            selectedFulfillment === 'pickup' || !activeCombo
                ? []
                : activeCombo.slots.map((s) => ({
                      id: `addon-${s.roleType.toLowerCase()}-${s.id}`,
                      code: s.roleType === 'COURIER' ? 'courier_delivery' : 'product_install',
                      title: `${s.providerName} (${s.slotLabel})`,
                      description: s.slaText || `${s.slotLabel} local fulfillment agreement.`,
                      price_amount_minor: s.feeMinor,
                      currency: 'PHP',
                      partner_role: s.roleType.toLowerCase(),
                      partner_fixture_keys: [s.id],
                      status: 'available',
                      settlement_mode: 'independent_provider_agreement',
                  }));

        const milestoneStages =
            selectedFulfillment === 'pickup' || !activeCombo
                ? [
                      {
                          id: 'order_confirmed',
                          title: 'Order Placed & Inventory Committed',
                          description: `Merchant acknowledges availability at ${stallLocation}.`,
                          step: 1,
                      },
                      {
                          id: 'counter_handoff',
                          title: 'Counter Collection',
                          description: `Buyer and merchant confirm item handoff at ${stallLocation}.`,
                          step: 2,
                      },
                  ]
                : [
                      {
                          id: 'order_confirmed',
                          title: 'Order Placed & Inventory Committed',
                          description: `Merchant commits inventory at ${stallLocation}.`,
                          step: 1,
                      },
                      ...(activeCombo.slots.some((s) => s.roleType === 'COURIER')
                          ? [
                                {
                                    id: 'courier_dispatch',
                                    title: 'Packaged & Courier Dispatch',
                                    description: `Handoff to ${activeCombo.slots.find((s) => s.roleType === 'COURIER')?.providerName || 'courier'}.`,
                                    step: 2,
                                },
                                {
                                    id: 'delivery_proof',
                                    title: 'Doorstep Arrival & Handoff Confirmation',
                                    description: 'Courier and recipient confirm handoff at destination.',
                                    step: 3,
                                },
                            ]
                          : []),
                      ...(activeCombo.slots.some((s) => s.roleType === 'LABOR')
                          ? [
                                {
                                    id: 'technician_install',
                                    title: 'On-Site Installation Labor',
                                    description: `Certified technician service by ${activeCombo.slots.find((s) => s.roleType === 'LABOR')?.providerName || 'labor partner'}.`,
                                    step: 4,
                                },
                            ]
                          : []),
                  ];

        const payload: Record<string, FormDataConvertible> = {
            title: title.trim(),
            description: effectiveDescription,
            category_code: category,
            listing_type: 'product',
            work_shape: 'A4',
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
            addons,
            milestone_stages: milestoneStages,
            media: media as unknown as FormDataConvertible,
            deal_chain_combinations: combos as unknown as FormDataConvertible,
            deal_chain_specification: {
                based_on_recipe_code: selectedFulfillment === 'pickup' ? 'direct' : selectedFulfillment,
                based_on_catalog_version: 1,
                is_custom_variation: selectedFulfillment !== 'pickup',
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

    const renderCustomerLiveTwin = () => (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                    <div>
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0F2F58] uppercase tracking-wider">
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
                        <span className="rounded-full bg-[#0F2F58]/90 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur uppercase">
                            Product / Goods
                        </span>
                        <span className="rounded-full bg-amber-600/90 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur uppercase">
                            Physical Item
                        </span>
                        {media.has_video && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur uppercase">
                                <Video className="size-3 text-[#FFC72C]" />
                                <span>Video</span>
                            </span>
                        )}
                    </div>
                    <div className="absolute top-2.5 right-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10.5px] font-extrabold text-slate-900 shadow-2xs backdrop-blur">
                        5.0 (New)
                    </div>
                </div>

                <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1">
                            <Store className="size-3 text-slate-400" />
                            <span className="truncate max-w-[170px]" title={stallLocation}>
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
                                {variants.length > 1 ? 'Starting from' : 'Unit Price'}
                            </span>
                            <div className="font-mono text-base font-extrabold text-[#0F2F58]">
                                ₱{(defaultVariant ? defaultVariant.price : 0).toLocaleString('en-PH', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
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
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <span>Available Variants ({variants.length})</span>
                                <span>Stock: {variants.reduce((acc, v) => acc + (v.stock || 0), 0)}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {variants.map((v) => (
                                    <span
                                        key={v.id}
                                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                                            v.isDefault
                                                ? 'bg-[#EBF2FA] text-[#0F2F58] border-[#0F2F58]/30 font-bold'
                                                : 'bg-slate-50 text-slate-700 border-slate-200/60'
                                        }`}
                                    >
                                        <span>{v.name.trim() || 'Unnamed Variant'}</span>
                                        {v.price > 0 && <span className="font-mono text-slate-500">· ₱{v.price}</span>}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Fulfillment Display in Live Twin */}
                    <div className="border-t border-slate-100 pt-2 text-[10.5px] space-y-1.5">
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
                                        {s.roleType === 'COURIER' ? <Truck className="size-3.5 text-indigo-600" /> : <Wrench className="size-3.5 text-amber-600" />}
                                        <span className="font-bold text-slate-900">{s.providerName}</span>
                                        <span className="font-mono font-bold text-emerald-700">+₱{s.fee.toFixed(2)}</span>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="size-3.5 text-amber-700" />
                    <span>Counter Verification Protected</span>
                </div>
                <p className="text-[10.5px] leading-relaxed text-amber-800">
                    Shoppers collect at {stallLocation || categoryMeta.defaultLocation} or have local couriers relay with photo intake receipt.
                </p>
            </div>
        </div>
    );


    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 pb-16">
            <DesktopGlobalNav activeRoute="create_listing" />

            <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:py-6 space-y-6">
                {/* Top Header Control Bar */}
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
                                    Product Listing
                                </span>
                                {builderMode === 'guided' ? (
                                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                                        Step {step} of 5 · {PRODUCT_GUIDED_STEPS[step - 1]?.shortTitle}
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
                        <Eye className="size-3.5 text-amber-600" />
                        <span>Preview</span>
                    </button>
                </header>

                {/* Guided Mode Slim Progress Bar */}
                {builderMode === 'guided' && (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200/70 -mt-3">
                        <div
                            className="h-full bg-amber-500 transition-all duration-300 ease-out"
                            style={{ width: `${(step / 5) * 100}%` }}
                        />
                    </div>
                )}

                {/* Responsive 2-Column Grid */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
                    {/* LEFT COLUMN: Product Form Studio (Cols 1-7) */}
                    <main className="rounded-2xl border border-slate-200/80 bg-white p-5 lg:col-span-7 lg:p-7 shadow-xs space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                        {/* STEP 1: Product Name & Category */}
                        {(builderMode === 'standard' || step === 1) && (
                            <div className="space-y-4">
                                {builderMode === 'guided' ? (
                                    <div>
                                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                                            {PRODUCT_GUIDED_STEPS[0].guidedTitle}
                                        </h2>
                                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                            {PRODUCT_GUIDED_STEPS[0].guidedDescription}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                                            Product Identity &amp; Aisle
                                        </h2>
                                    </div>
                                )}

                                {formErrors.title && (
                                    <p className="text-xs font-bold text-red-600">{formErrors.title}</p>
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
                                        placeholder={builderMode === 'guided' ? categoryMeta.titlePlaceholder : ''}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                    />
                                </div>

                                {/* Category */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="product-category" className="text-xs font-bold text-slate-700">
                                            Product Category
                                        </label>
                                        {builderMode === 'standard' && (
                                            <FieldGuide
                                                guidance={PRODUCT_FIELD_GUIDANCE.category.guidance}
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
                                            const nextMeta = PRODUCT_CATEGORY_META[nextCategory] || DEFAULT_PRODUCT_CATEGORY_META;
                                            if (
                                                !stallLocation ||
                                                Object.values(PRODUCT_CATEGORY_META).some((m) => m.defaultLocation === stallLocation)
                                            ) {
                                                setStallLocation(nextMeta.defaultLocation);
                                            }
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

                                            if (!isInstallationApplicable(nextCategory)) {
                                                setCombos((prev) => {
                                                    const filtered = prev.filter((c) => !c.slots.some((s) => s.roleType === 'LABOR'));
                                                    return filtered.length > 0 ? filtered : defaultCombosForCategory(nextCategory);
                                                });
                                                if (selectedFulfillment === 'combo-installation') {
                                                    setSelectedFulfillment('pickup');
                                                }
                                            }
                                        }}
                                        className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                    >
                                        <option value="" disabled>Select product category...</option>
                                        <option value="local-food">Local Food &amp; Bakery</option>
                                        <option value="repairs">
                                            Hardware &amp; AC Replacement Parts
                                        </option>
                                        <option value="greeting-cards">
                                            Handmade Cards &amp; Crafts
                                        </option>
                                        <option value="print-assist">
                                            Document &amp; Print Supplies
                                        </option>
                                        <option value="local-services">General Municipal Goods</option>
                                    </select>
                                </div>

                                {/* Detailed Description */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="product-description" className="text-xs font-bold text-slate-700">
                                            Detailed Description
                                        </label>
                                        {builderMode === 'standard' && (
                                            <FieldGuide
                                                guidance={PRODUCT_FIELD_GUIDANCE.description.guidance}
                                                mode="standard"
                                            />
                                        )}
                                    </div>
                                    <textarea
                                        id="product-description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder={builderMode === 'guided' ? 'Specify compatibility, dimensions, ingredients, or brand origin in Tagudin...' : ''}
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
                            <div className={`space-y-4 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}>
                                {builderMode === 'guided' ? (
                                    <div>
                                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                                            {PRODUCT_GUIDED_STEPS[1].guidedTitle}
                                        </h2>
                                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                            {PRODUCT_GUIDED_STEPS[1].guidedDescription}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
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
                                            className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
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
                            <div className={`space-y-4 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}>
                                {builderMode === 'guided' ? (
                                    <div>
                                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                                            {PRODUCT_GUIDED_STEPS[2].guidedTitle}
                                        </h2>
                                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                            {PRODUCT_GUIDED_STEPS[2].guidedDescription}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
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
                                    initialAddress={stallLocation || categoryMeta.defaultLocation}
                                    locationLabel={builderMode === 'guided' ? 'Shop / Stall Pickup Location' : categoryMeta.locationLabel}
                                    addressPlaceholder={categoryMeta.locationPlaceholder}
                                    onChange={(newGeo) => {
                                        setGeography(newGeo);
                                        setStallLocation(newGeo.stall_location || newGeo.address_line_1);
                                    }}
                                />


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
                            <div className={`space-y-4 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}>
                                {builderMode === 'guided' ? (
                                    <div>
                                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                                            {PRODUCT_GUIDED_STEPS[3].guidedTitle}
                                        </h2>
                                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                            {PRODUCT_GUIDED_STEPS[3].guidedDescription}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
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
                                                guidance={PRODUCT_FIELD_GUIDANCE.pricing.guidance}
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
                                                                onClick={() => setDefaultVariant(idx)}
                                                                className="cursor-pointer rounded-full border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                                                            >
                                                                Make Default
                                                            </button>
                                                        )}
                                                        {variants.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeVariant(idx)}
                                                                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
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
                                                            updateVariant(idx, 'name', e.target.value)
                                                        }
                                                        placeholder="e.g. Regular, Small, 500g, Pack of 6..."
                                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 shadow-2xs outline-none transition-all placeholder:text-slate-400 focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
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
                                                                value={v.price === 0 ? '' : v.price}
                                                                onChange={(e) =>
                                                                     updateVariant(
                                                                        idx,
                                                                        'price',
                                                                        e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                                                                    )
                                                                }
                                                                placeholder="0.00"
                                                                step="0.01"
                                                                min="0"
                                                                className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-7 font-mono text-xs font-extrabold text-[#0F2F58] shadow-2xs outline-none transition-all placeholder:text-slate-400 focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
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
                                                                value={v.stock === 0 ? '' : v.stock}
                                                                onChange={(e) =>
                                                                    updateVariant(
                                                                        idx,
                                                                        'stock',
                                                                        e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0,
                                                                    )
                                                                }
                                                                min="0"
                                                                placeholder="0"
                                                                className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-12 pl-3 font-mono text-xs font-bold text-slate-800 shadow-2xs outline-none transition-all placeholder:text-slate-400 focus:border-[#0F2F58] focus:ring-1 focus:ring-[#0F2F58]"
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
                                            Continue to Fulfillment
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 5: Fulfillment & Review */}
                        {(builderMode === 'standard' || step === 5) && (
                            <div className={`space-y-4 ${builderMode === 'standard' ? 'border-t border-slate-200/80 pt-5' : ''}`}>
                                {builderMode === 'guided' ? (
                                    <div>
                                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                                            {PRODUCT_GUIDED_STEPS[4].guidedTitle}
                                        </h2>
                                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                            {PRODUCT_GUIDED_STEPS[4].guidedDescription}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                            Fulfillment &amp; Partner Extensions
                                        </label>
                                        <FieldGuide
                                            guidance={PRODUCT_FIELD_GUIDANCE.fulfillment.guidance}
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

                                {/* Baseline Counter Pickup Card */}
                                <div
                                    onClick={() => setSelectedFulfillment('pickup')}
                                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                                        selectedFulfillment === 'pickup'
                                            ? 'border-[#0F2F58] bg-[#F0F5FA] ring-2 ring-[#0F2F58]/20 shadow-xs'
                                            : 'border-slate-200 bg-[#FAFCFB] hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                                                <Store className="size-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xs font-extrabold text-[#0F2F58]">
                                                        Baseline: Counter Pickup at Stall
                                                    </h3>
                                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-extrabold text-emerald-800">
                                                        Always Active · Free
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-[11px] text-slate-600">
                                                    Direct counter collection at <span className="font-semibold text-slate-900">{stallLocation}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFulfillment('pickup');
                                            }}
                                            className={`cursor-pointer rounded-full px-3 py-1 text-[10px] font-extrabold transition-all ${
                                                selectedFulfillment === 'pickup'
                                                    ? 'bg-emerald-700 text-white shadow-xs'
                                                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            {selectedFulfillment === 'pickup' ? '✓ Active Default' : 'Switch to Pickup Only'}
                                        </button>
                                    </div>
                                </div>

                                {/* Partnered Options Section Divider */}
                                <div className="border-t border-slate-200 pt-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                                    Partnered Options
                                                </span>
                                                <span className="rounded-full bg-[#0F2F58] px-2 py-0.5 text-[9px] font-extrabold text-white tracking-wider">
                                                    DEAL CHAIN
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-[11px] text-slate-500">
                                                Customer-selectable delivery &amp; install combinations with local partners
                                            </p>
                                        </div>
                                        {combos.length > 0 && (
                                            <span className="text-[11px] font-bold text-slate-500">
                                                {combos.length} {combos.length === 1 ? 'Combo' : 'Combos'} Available
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* All Available Partner Combos List */}
                                <div className="space-y-3">
                                    {combos.map((c, idx) => {
                                        const isSelected = selectedFulfillment === c.id;

                                        return (
                                            <div
                                                key={c.id}
                                                className={`rounded-2xl border p-4 transition-all ${
                                                    isSelected
                                                        ? 'border-[#0F2F58] bg-[#FAFCFB] ring-2 ring-[#0F2F58]/20 shadow-xs'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                {/* Combo Header */}
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#EBF2FA] text-[#0F2F58]">
                                                            {renderComboIcon(c.icon, 'size-4')}
                                                        </span>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-sm font-extrabold text-[#0F2F58]">
                                                                    {c.title}
                                                                </h3>
                                                                <span className="rounded-full bg-[#0F2F58] px-2 py-0.5 text-[9px] font-extrabold text-white">
                                                                    DEAL CHAIN
                                                                </span>
                                                            </div>
                                                            <p className="text-[10.5px] text-slate-500">
                                                                {c.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedFulfillment(isSelected ? 'pickup' : c.id);
                                                                setCurrentComboIdx(idx);
                                                            }}
                                                            className={`cursor-pointer rounded-full px-3 py-1 text-[10px] font-extrabold transition-all ${
                                                                isSelected
                                                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                                                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            {isSelected ? '✓ Active Selection' : 'Select as Active'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveCombo(c.id)}
                                                            className="cursor-pointer p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                                            title="Remove this partnered option"
                                                            aria-label="Remove option"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* When this combo is selected: Expand the Deal Chain Pipeline and Slot details */}
                                                {isSelected ? (
                                                    <>
                                                        {/* Compact DAG Canvas View */}
                                                        <div className="my-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 overflow-x-auto [scrollbar-width:none]">
                                                            <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                                                                Deal Chain Pipeline View
                                                            </div>
                                                            <div className="flex items-center gap-2 min-w-max">
                                                                {/* Product Node */}
                                                                <div className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 shadow-2xs min-w-[105px]">
                                                                    <div className="flex items-center justify-between gap-1">
                                                                        <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[8px] font-extrabold text-amber-900 uppercase">
                                                                            Product
                                                                        </span>
                                                                        <span className="font-mono text-[9px] font-bold text-amber-900">
                                                                            ₱{defaultVariant?.price.toFixed(0) || '180'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="truncate text-xs font-extrabold text-amber-950">
                                                                        {title.trim() ? (title.length > 12 ? title.slice(0, 11) + '…' : title) : '35uF Cap'}
                                                                    </div>
                                                                </div>

                                                                {/* Pipeline Connectors & Slot Nodes */}
                                                                {c.slots.map((s, sIdx) => {
                                                                    const isCourier = s.roleType === 'COURIER';
                                                                    const nodeBg = isCourier
                                                                        ? 'bg-[#E0F2FE]/70 border-sky-200 text-sky-900'
                                                                        : 'bg-[#DCFCE7]/70 border-emerald-200 text-emerald-900';
                                                                    const badgeBg = isCourier
                                                                        ? 'bg-[#0284C7] text-white'
                                                                        : 'bg-[#16A34A] text-white';

                                                                    return (
                                                                        <React.Fragment key={s.id || sIdx}>
                                                                            <div className="flex shrink-0 items-center text-slate-300">
                                                                                <svg width="20" height="12" viewBox="0 0 20 12" fill="none" className="shrink-0">
                                                                                    <line x1="0" y1="6" x2="16" y2="6" stroke="#10B981" strokeWidth="2" strokeDasharray="3 2" />
                                                                                    <path d="M14 2L19 6L14 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                                </svg>
                                                                            </div>

                                                                            <div className={`flex flex-col gap-1 rounded-xl border px-3 py-2 shadow-2xs min-w-[115px] ${nodeBg}`}>
                                                                                <div className="flex items-center justify-between gap-1">
                                                                                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase ${badgeBg}`}>
                                                                                        {s.roleType}
                                                                                    </span>
                                                                                    <span className="font-mono text-[9px] font-bold">
                                                                                        +₱{s.fee.toFixed(0)}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="truncate text-xs font-extrabold">
                                                                                    {getShortPartnerName(s.providerName)}
                                                                                </div>
                                                                            </div>
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Slot Binding Selectors */}
                                                        <div className="space-y-2">
                                                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                                                Attached Partner Slots ({c.slots.length})
                                                            </div>
                                                            {c.slots.map((s, sIdx) => (
                                                                <div
                                                                    key={s.id || sIdx}
                                                                    onClick={() => openSlotPicker(c.id, sIdx, s.roleType, s.id)}
                                                                    className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs transition-all hover:border-[#0F2F58]/50 hover:bg-slate-50/50"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                                                                            s.roleType === 'COURIER' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                                                                        }`}>
                                                                            {s.roleType === 'COURIER' ? <Truck className="size-4.5" /> : <Wrench className="size-4.5" />}
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">
                                                                                {s.slotLabel}
                                                                            </div>
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <span className="text-xs font-extrabold text-[#0F2F58]">
                                                                                    {s.providerName}
                                                                                </span>
                                                                                <span className="flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 border border-amber-200/50">
                                                                                    <Star className="size-2.5 fill-amber-400 stroke-amber-500" />
                                                                                    <span>{s.rating.toFixed(1)}</span>
                                                                                </span>
                                                                                <span className="font-mono text-xs font-bold text-emerald-700">
                                                                                    +₱{s.fee.toFixed(2)} {s.roleType === 'COURIER' ? 'route fee' : 'labor'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openSlotPicker(c.id, sIdx, s.roleType, s.id);
                                                                        }}
                                                                        className="cursor-pointer shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-[#0F2F58] shadow-2xs hover:bg-[#EBF2FA] hover:border-[#0F2F58]/30 transition-all"
                                                                    >
                                                                        Change Partner ▾
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                                                        <span>Click "Select as Active" to offer this delivery relay to customers.</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Attach Additional Presets Button */}
                                    <button
                                        type="button"
                                        onClick={() => setAttachModalOpen(true)}
                                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-[#FAFCFB] p-4 text-xs font-bold text-[#0F2F58] hover:border-[#0F2F58] hover:bg-[#F0F5FA] transition-all"
                                    >
                                        <Plus className="size-4" />
                                        <span>Attach Another Partnered Preset / Deal Chain</span>
                                    </button>
                                </div>

                                {/* Attach Delivery / Service Extension Button */}
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setAttachModalOpen(true)}
                                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-2.5 text-xs font-bold text-[#0F2F58] hover:border-[#0F2F58] hover:bg-[#FAFCFB] transition-all shadow-2xs"
                                    >
                                        <Plus className="size-3.5" />
                                        <span>Attach Delivery / Service Extension</span>
                                        <span className="rounded-full bg-[#0F2F58] px-2 py-0.5 text-[9px] font-extrabold text-white">
                                            DEAL CHAIN
                                        </span>
                                    </button>
                                </div>

                                {/* Summary Preview Card */}
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
                                            {description || 'Direct Tagudin product listing.'}
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
                                    <div className="rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs space-y-1">
                                        <div className="flex items-center justify-between text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                                            <span>Active Fulfillment</span>
                                            <span className="font-mono text-emerald-700 font-bold">{activeFulfillmentInfo.badge}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 font-bold text-[#0F2F58]">
                                            {activeFulfillmentInfo.icon}
                                            <span>{activeFulfillmentInfo.title}</span>
                                        </div>
                                        <p className="text-[10.5px] text-slate-500">{activeFulfillmentInfo.description}</p>
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
                                            {isSubmitting ? 'Saving listing...' : isAuthenticated ? 'Publish Product Listing' : 'Sign in to Publish'}
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
                                            disabled={isSubmitting || !title.trim()}
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

                    {/* RIGHT COLUMN: Customer Live Twin Product Preview (Cols 8-12, Sticky on Desktop) */}
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

                {/* Slot Listing Picker Modal for Swappable Deal Chain Partners */}
                <SlotListingPickerModal
                    open={slotPickerState.open}
                    onClose={() => setSlotPickerState((prev) => ({ ...prev, open: false }))}
                    role={slotPickerState.role}
                    currentListingId={slotPickerState.currentListingId}
                    candidates={slotCandidateListings.length > 0 ? slotCandidateListings : undefined}
                    onSelectCandidate={handleCandidateSelected}
                />

                {/* Attach Partnered Deal Chain Extension Modal */}
                <GlovoWaveModal
                    open={attachModalOpen}
                    onClose={() => setAttachModalOpen(false)}
                    title="Attach Partnered Deal Chain Combo"
                    subtitle="Verified Tagudin fulfillment presets & trade partner networks"
                >
                    <div className="flex flex-col gap-3 py-1 font-['Plus_Jakarta_Sans',sans-serif]">
                        <p className="text-xs text-slate-500">
                            Select a verified municipal deal chain combo to attach to this product listing:
                        </p>
                        <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                            {PRESET_RECIPES.filter((r) => {
                                if (!category) return true;
                                if (r.applicableCategories.includes(category)) return true;
                                if (isInstallationApplicable(category) && r.applicableCategories.includes('repairs')) return true;
                                return false;
                            }).map((recipe) => (
                                <div
                                    key={recipe.key}
                                    onClick={() => handleAddPresetRecipe(recipe.key)}
                                    className="flex cursor-pointer items-start justify-between rounded-2xl border border-slate-200 bg-white p-3.5 transition-all hover:border-[#0F2F58] hover:bg-[#F0F5FA]/50 active:scale-[0.99] shadow-2xs"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#0F2F58]">
                                            {renderComboIcon(recipe.icon, 'size-5')}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="text-xs font-extrabold text-[#0F2F58]">
                                                    {recipe.title}
                                                </h4>
                                                <span className="rounded-full bg-[#0F2F58] px-1.5 py-0.2 text-[8px] font-extrabold text-white">
                                                    DEAL CHAIN
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-[11px] text-slate-500">
                                                {recipe.description}
                                            </p>
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                {recipe.slots.map((s, sIdx) => (
                                                    <span
                                                        key={sIdx}
                                                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                                                    >
                                                        <span className="font-bold text-[#0F2F58]">{s.slotLabel}:</span>
                                                        <span>{s.providerName}</span>
                                                        <span className="font-mono text-emerald-700 font-bold">+₱{s.fee.toFixed(2)}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddPresetRecipe(recipe.key);
                                        }}
                                        className="cursor-pointer shrink-0 rounded-xl bg-[#FFC72C] px-3 py-1.5 text-xs font-bold text-slate-950 shadow-2xs hover:bg-[#F2BA18]"
                                    >
                                        + Attach
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </GlovoWaveModal>
            </div>
        </div>
    );
}
