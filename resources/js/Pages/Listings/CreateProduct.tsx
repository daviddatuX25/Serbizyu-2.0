import React, { useState, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import {
    ArrowLeft,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Eye,
    Package,
    Plus,
    ShieldCheck,
    Star,
    Store,
    Trash2,
    Truck,
    Wrench,
    X,
} from 'lucide-react';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';
import { BottomNavBar, type NavTabId } from '../../marketplace/components/BottomNavBar';
import { CreatorPostModal } from '../../components/marketplace/CreatorPostModal';
import { QuickDealScanModal } from '../../components/marketplace/QuickDealScanModal';
import GlovoWaveModal from '../../components/mobile/GlovoWaveModal';
import { SlotListingPickerModal } from '../../components/marketplace/SlotListingPickerModal';
import type { SlotCandidateListing } from '../../marketplace/types';

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

const DEFAULT_COMBOS: PartnerCombo[] = [
    {
        id: 'combo-delivery',
        title: 'Doorstep Delivery',
        icon: 'Truck',
        description: 'On-demand motorcycle delivery straight to customer door in Tagudin.',
        isDefault: true,
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
    },
    {
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
    },
];

const PRESET_RECIPES = [
    {
        key: 'doorstep_delivery',
        title: 'Doorstep Delivery',
        icon: 'Truck',
        description: 'Tagudin motorcycle courier dispatch straight to recipient door',
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
export default function CreateProduct() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [creatorOpen, setCreatorOpen] = useState(false);
    const [quickDealOpen, setQuickDealOpen] = useState(false);

    // Step 1: Product Identity & Stall
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('repairs');
    const [description, setDescription] = useState('');
    const [stallLocation, setStallLocation] = useState('Tagudin Public Market Stall #12');
    const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
    const [variants, setVariants] = useState<ProductVariantForm[]>([
        {
            id: 'var-1',
            name: '35uF Standard Inverter',
            price: 180,
            stock: 24,
            isDefault: true,
        },
        {
            id: 'var-2',
            name: '45uF Heavy-Duty Dual',
            price: 220,
            stock: 12,
            isDefault: false,
        },
    ]);

    // Step 3: Swappable Deal Chain Fulfillment
    const [combos, setCombos] = useState<PartnerCombo[]>(DEFAULT_COMBOS);
    const [selectedFulfillment, setSelectedFulfillment] = useState<'pickup' | string>('combo-delivery');
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

    // Variant Handlers
    const addVariant = () => {
        const count = variants.length + 1;
        setVariants((prev) => [
            ...prev,
            {
                id: `var-${count}`,
                name: `${count * 15}uF Turbo Heavy-Duty`,
                price: 180 + count * 40,
                stock: 10,
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
    const defaultPriceMinor = Math.round((defaultVariant?.price || 180) * 100);

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

    const toggleComboDefault = (comboId: string) => {
        setCombos((prev) =>
            prev.map((c) => ({
                ...c,
                isDefault: c.id === comboId,
            }))
        );
        setSelectedFulfillment(comboId);
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

    // Form Submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormErrors({});

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
        };

        router.post('/listings', payload, {
            onError: (errs) => {
                setFormErrors(errs);
                setIsSubmitting(false);
                if (errs.title || errs.category_code || errs.description) {
                    setStep(1);
                } else if (errs.price_amount_minor || errs.variants) {
                    setStep(2);
                }
            },
        });
    };

    const categoryPhoto = useMemo(() => {
        switch (category) {
            case 'repairs':
            case 'appliance':
                return '/photos/ac-capacitor.jpg';
            case 'food':
            case 'bakery':
                return '/photos/bibingka.jpg';
            case 'crafts':
            case 'greeting-cards':
                return '/photos/greeting.jpg';
            case 'hardware':
                return '/photos/req-cement.jpg';
            default:
                return '/photos/ac-capacitor.jpg';
        }
    }, [category]);

    const renderCustomerLiveTwin = () => (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0F2F58] uppercase tracking-wider">
                        <Eye className="size-3.5 text-amber-600" />
                        <span>Customer Live Twin</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                        Real-time preview of citizen product view
                    </p>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 uppercase">
                    Marketplace Card
                </span>
            </div>

            {/* Product Card Preview */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                    <img
                        src={categoryPhoto}
                        alt={title || 'Marketplace Good'}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="rounded-full bg-[#0F2F58]/90 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur uppercase">
                            Product / Goods
                        </span>
                        <span className="rounded-full bg-amber-600/90 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur uppercase">
                            Physical Item
                        </span>
                    </div>
                    <div className="absolute top-2.5 right-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10.5px] font-extrabold text-slate-900 shadow-2xs backdrop-blur">
                        5.0 (New Stall)
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
                        {title.trim() || 'AC Run Capacitor (35uF 450V)'}
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
                            <span>Stall Collection Ready</span>
                        </div>
                    </div>

                    {/* Variants Chips */}
                    {variants.length > 0 && (
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
                                        <span>{v.name}</span>
                                        <span className="font-mono text-slate-500">· ₱{v.price}</span>
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
                    Shoppers pick up at {stallLocation || 'Tagudin Public Market stall'} or have local couriers relay with photo intake receipt.
                </p>
            </div>
        </div>
    );

    const currentCombo = combos[currentComboIdx] || combos[0];

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 pb-16">
            <DesktopGlobalNav activeRoute="create_listing" />

            <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:py-6 space-y-6">
                {/* Top Header Control Bar */}
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
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 uppercase">
                                    Step {step} of 3
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                List physical parts, fresh delicacies, and crafts for Tagudin citizens.
                            </p>
                        </div>
                    </div>

                    {/* Listing Type Switcher */}
                    <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
                        <Link
                            href="/listings/create/service"
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:text-slate-900"
                        >
                            <Wrench className="size-3.5" />
                            <span>Service</span>
                        </Link>
                        <Link
                            href="/listings/create/product"
                            className="flex items-center gap-1.5 rounded-lg bg-[#0F2F58] px-3 py-1.5 text-xs font-extrabold text-white shadow-xs"
                        >
                            <Package className="size-3.5" />
                            <span>Product</span>
                        </Link>
                    </div>
                </header>

                {/* Stepper Progress Bar */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white px-5 py-3 shadow-2xs">
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex cursor-pointer items-center gap-2 text-left transition-opacity hover:opacity-80"
                    >
                        <div className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                            step >= 1 ? 'bg-[#0F2F58] text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                            1
                        </div>
                        <span className={`text-xs font-bold ${step === 1 ? 'text-[#0F2F58]' : 'text-slate-600'}`}>
                            Product Identity &amp; Stall
                        </span>
                    </button>
                    <div className="h-0.5 w-12 bg-slate-200 sm:w-24" />
                    <button
                        type="button"
                        disabled={!title.trim()}
                        onClick={() => setStep(2)}
                        className="flex cursor-pointer items-center gap-2 text-left transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <div className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                            step >= 2 ? 'bg-[#0F2F58] text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                            2
                        </div>
                        <span className={`text-xs font-bold ${step === 2 ? 'text-[#0F2F58]' : 'text-slate-600'}`}>
                            Variations &amp; Pricing
                        </span>
                    </button>
                    <div className="h-0.5 w-12 bg-slate-200 sm:w-24" />
                    <button
                        type="button"
                        disabled={!title.trim()}
                        onClick={() => setStep(3)}
                        className="flex cursor-pointer items-center gap-2 text-left transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <div className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                            step >= 3 ? 'bg-[#0F2F58] text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                            3
                        </div>
                        <span className={`text-xs font-bold ${step === 3 ? 'text-[#0F2F58]' : 'text-slate-600'}`}>
                            Fulfillment &amp; Launch
                        </span>
                    </button>
                </div>

                {/* Responsive 2-Column Grid */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
                    {/* LEFT COLUMN: Product Form Studio (Cols 1-7) */}
                    <main className="rounded-2xl border border-slate-200/80 bg-white p-5 lg:col-span-7 lg:p-7 shadow-xs space-y-6">
                        {step === 1 && (
                            <div className="space-y-4">
                                <div>
                                    <span className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900">
                                        <Package className="size-3 text-amber-700" />
                                        <span>Physical Goods &amp; Delicacies</span>
                                    </span>
                                    <h2 className="text-lg font-extrabold text-slate-900">
                                        Product Identity &amp; Stall
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        List fresh delicacies, hardware replacement parts, or crafts.
                                    </p>
                                </div>

                                {formErrors.title && (
                                    <p className="text-xs font-bold text-red-600">{formErrors.title}</p>
                                )}

                                {/* Product Title */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        Product Title
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. AC Run Capacitor (35uF 450V)"
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                    />
                                </div>

                                {/* Category */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                    >
                                        <option value="repairs">
                                            Hardware &amp; AC Replacement Parts
                                        </option>
                                        <option value="local-food">Local Food &amp; Bakery</option>
                                        <option value="greeting-cards">
                                            Handmade Cards &amp; Crafts
                                        </option>
                                        <option value="print-assist">
                                            Document &amp; Print Supplies
                                        </option>
                                        <option value="local-services">General Municipal Goods</option>
                                    </select>
                                </div>

                                {/* Stall Pickup & Location */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        Stall Pickup &amp; Location
                                    </label>
                                    <div className="relative">
                                        <Store className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={stallLocation}
                                            onChange={(e) => setStallLocation(e.target.value)}
                                            placeholder="e.g. Tagudin Public Market, Stall #12 · Cashier Lane 2"
                                            className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] pr-3.5 pl-9 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Physical collection point for walk-in shoppers and courier dispatch pickup.
                                    </p>
                                </div>

                                {/* Description */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Specify compatibility, dimensions, ingredients, or brand origin in Tagudin..."
                                        className="w-full rounded-xl border border-slate-200 bg-[#FAFCFB] p-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                    />
                                </div>

                                <button
                                    type="button"
                                    disabled={!title.trim()}
                                    onClick={() => setStep(2)}
                                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] py-3 text-xs font-bold text-slate-950 shadow-xs transition-colors hover:bg-[#e6b327] disabled:opacity-50"
                                >
                                    <span>Continue to Variations &amp; Pricing</span>
                                    <ArrowRight className="size-3.5" />
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-900">
                                        Variations &amp; Stock
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Manage individual product specs, prices, and available stock
                                        units.
                                    </p>
                                </div>

                                {/* Variants List */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-700">
                                            Product Variations ({variants.length})
                                        </label>
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
                                                className={`space-y-2.5 rounded-xl border p-3.5 shadow-2xs transition-all ${
                                                    v.isDefault
                                                        ? 'border-[#0F2F58] bg-[#FAFCFB] ring-1 ring-[#0F2F58]/20'
                                                        : 'border-slate-200 bg-white'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <input
                                                        type="text"
                                                        value={v.name}
                                                        onChange={(e) =>
                                                            updateVariant(idx, 'name', e.target.value)
                                                        }
                                                        placeholder="Variation name..."
                                                        className="flex-1 border-b border-slate-200 bg-transparent pb-1 text-xs font-extrabold text-slate-900 outline-none focus:border-[#0F2F58]"
                                                    />
                                                    <div className="flex shrink-0 items-center gap-1.5">
                                                        {v.isDefault ? (
                                                            <span className="rounded-full bg-[#EBF2FA] px-2 py-0.5 text-[9px] font-extrabold text-[#0F2F58]">
                                                                Default Variant
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setDefaultVariant(idx)}
                                                                className="cursor-pointer rounded-full border border-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-600 hover:bg-slate-100"
                                                            >
                                                                Make Default
                                                            </button>
                                                        )}
                                                        {variants.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeVariant(idx)}
                                                                className="cursor-pointer p-1 text-slate-400 hover:text-red-600"
                                                                aria-label="Remove variant"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-3 pt-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-bold text-slate-500">
                                                            ₱
                                                        </span>
                                                        <input
                                                            type="number"
                                                            value={v.price}
                                                            onChange={(e) =>
                                                                updateVariant(
                                                                    idx,
                                                                    'price',
                                                                    parseFloat(e.target.value) || 0,
                                                                )
                                                            }
                                                            className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-right font-mono text-xs font-extrabold text-[#0F2F58] outline-none focus:border-[#0F2F58]"
                                                        />
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="number"
                                                            value={v.stock}
                                                            onChange={(e) =>
                                                                updateVariant(
                                                                    idx,
                                                                    'stock',
                                                                    parseInt(e.target.value, 10) || 0,
                                                                )
                                                            }
                                                            min="0"
                                                            className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-right font-mono text-xs font-bold text-slate-800 outline-none focus:border-[#0F2F58]"
                                                        />
                                                        <span className="text-[10px] font-semibold text-slate-500">
                                                            units in stock
                                                        </span>
                                                    </div>
                                                </div>
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
                                        Review Draft
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-900">
                                        Fulfillment &amp; Partner Extensions (Deal Chain)
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Pre-package partner delivery, installation labor, or counter collection at your stall.
                                    </p>
                                </div>

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
                                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            {selectedFulfillment === 'pickup' ? 'Active Selection' : 'Select as Active'}
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

                                {/* Combos Deck Tabs Switcher */}
                                {combos.length > 0 && (
                                    <div className="flex gap-2 pb-1 overflow-x-auto [scrollbar-width:none]">
                                        {combos.map((c, idx) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => {
                                                    setCurrentComboIdx(idx);
                                                    setSelectedFulfillment(c.id);
                                                }}
                                                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                                                    currentComboIdx === idx
                                                        ? 'bg-[#0F2F58] text-white shadow-xs'
                                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                {renderComboIcon(c.icon, 'size-3.5')}
                                                <span>{c.title}</span>
                                                {selectedFulfillment === c.id && (
                                                    <span className="rounded-full bg-emerald-500 px-1 py-0.2 text-[8px] font-bold text-white">
                                                        Active
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Partner Combos Carousel Deck */}
                                {combos.length > 0 && currentCombo ? (
                                    <div className="space-y-3">
                                        <div
                                            className={`rounded-2xl border p-4 transition-all ${
                                                selectedFulfillment === currentCombo.id
                                                    ? 'border-[#0F2F58] bg-[#FAFCFB] ring-2 ring-[#0F2F58]/20 shadow-xs'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            {/* Combo Header */}
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#EBF2FA] text-[#0F2F58]">
                                                        {renderComboIcon(currentCombo.icon, 'size-4')}
                                                    </span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-sm font-extrabold text-[#0F2F58]">
                                                                {currentCombo.title}
                                                            </h3>
                                                            <span className="rounded-full bg-[#0F2F58] px-2 py-0.5 text-[9px] font-extrabold text-white">
                                                                DEAL CHAIN
                                                            </span>
                                                        </div>
                                                        <p className="text-[10.5px] text-slate-500">
                                                            {currentCombo.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleComboDefault(currentCombo.id)}
                                                        className={`cursor-pointer rounded-full px-3 py-1 text-[10px] font-extrabold transition-all ${
                                                            selectedFulfillment === currentCombo.id
                                                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                                                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {selectedFulfillment === currentCombo.id ? 'Active Selection' : 'Select as Active'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveCombo(currentCombo.id)}
                                                        className="cursor-pointer p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                                        title="Remove this partnered option"
                                                        aria-label="Remove option"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                            </div>

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
                                                    {currentCombo.slots.map((s, sIdx) => {
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
                                                    Attached Partner Slots ({currentCombo.slots.length})
                                                </div>
                                                {currentCombo.slots.map((s, sIdx) => (
                                                    <div
                                                        key={s.id || sIdx}
                                                        onClick={() => openSlotPicker(currentCombo.id, sIdx, s.roleType, s.id)}
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
                                                                openSlotPicker(currentCombo.id, sIdx, s.roleType, s.id);
                                                            }}
                                                            className="cursor-pointer shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-[#0F2F58] shadow-2xs hover:bg-[#EBF2FA] hover:border-[#0F2F58]/30 transition-all"
                                                        >
                                                            Change Partner ▾
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Carousel Pagination & Navigation Controls */}
                                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border border-slate-200/60">
                                            <button
                                                type="button"
                                                disabled={currentComboIdx === 0}
                                                onClick={() => {
                                                    const nextIdx = Math.max(0, currentComboIdx - 1);
                                                    setCurrentComboIdx(nextIdx);
                                                    if (combos[nextIdx]) setSelectedFulfillment(combos[nextIdx].id);
                                                }}
                                                className="flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-[#0F2F58] shadow-2xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <ChevronLeft className="size-3.5" />
                                                <span>Prev</span>
                                            </button>

                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    {combos.map((_, dIdx) => (
                                                        <button
                                                            key={dIdx}
                                                            type="button"
                                                            onClick={() => {
                                                                setCurrentComboIdx(dIdx);
                                                                if (combos[dIdx]) setSelectedFulfillment(combos[dIdx].id);
                                                            }}
                                                            className={`h-1.5 cursor-pointer rounded-full transition-all ${
                                                                dIdx === currentComboIdx
                                                                    ? 'w-5 bg-[#0F2F58]'
                                                                    : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                                                            }`}
                                                            aria-label={`Go to option ${dIdx + 1}`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="font-mono text-[10.5px] font-bold text-slate-500">
                                                    Option {currentComboIdx + 1} of {combos.length}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={currentComboIdx >= combos.length - 1}
                                                onClick={() => {
                                                    const nextIdx = Math.min(combos.length - 1, currentComboIdx + 1);
                                                    setCurrentComboIdx(nextIdx);
                                                    if (combos[nextIdx]) setSelectedFulfillment(combos[nextIdx].id);
                                                }}
                                                className="flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-[#0F2F58] shadow-2xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <span>Next</span>
                                                <ChevronRight className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-[#FAFCFB] p-6 text-center">
                                        <div className="text-xs font-extrabold text-[#0F2F58]">
                                            No Partnered Options Attached
                                        </div>
                                        <div className="mt-1 text-[11px] text-slate-500">
                                            This product will be counter-pickup only at {stallLocation}.
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAttachModalOpen(true)}
                                            className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0F2F58] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#153e74]"
                                        >
                                            <Plus className="size-3.5" />
                                            <span>Attach a Combination</span>
                                        </button>
                                    </div>
                                )}

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
                                            {title || 'AC Run Capacitor (35uF 450V)'}
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

                    {/* RIGHT COLUMN: Customer Live Twin Product Preview (Cols 8-12, Sticky on Desktop) */}
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
                        <Eye className="size-4 text-amber-400" />
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

                {/* Slot Listing Picker Modal for Swappable Deal Chain Partners */}
                <SlotListingPickerModal
                    open={slotPickerState.open}
                    onClose={() => setSlotPickerState((prev) => ({ ...prev, open: false }))}
                    role={slotPickerState.role}
                    currentListingId={slotPickerState.currentListingId}
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
                            {PRESET_RECIPES.map((recipe) => (
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
