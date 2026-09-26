import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import {
    ArrowLeft,
    ArrowRight,
    Package,
    Plus,
    Trash2,
    Truck,
    Wrench,
    ShieldCheck,
} from 'lucide-react';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';
import { BottomNavBar, type NavTabId } from '../../marketplace/components/BottomNavBar';
import { CreatorPostModal } from '../../components/marketplace/CreatorPostModal';
import { QuickDealScanModal } from '../../components/marketplace/QuickDealScanModal';

interface ProductVariantForm {
    id: string;
    name: string;
    price: number;
    stock: number;
    isDefault: boolean;
}

export default function CreateProduct() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [creatorOpen, setCreatorOpen] = useState(false);
    const [quickDealOpen, setQuickDealOpen] = useState(false);

    // Step 1: Product Identity
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('repairs');
    const [description, setDescription] = useState('');
    const [pickupSla, setPickupSla] = useState('15');

    // Step 2: Variations & Pricing
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

    // Step 3: Fulfillment & Partner Delivery
    const [deliveryMode, setDeliveryMode] = useState<'pickup' | 'courier' | 'install'>('courier');

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

    // Form Submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormErrors({});

        const effectiveDescription =
            description.trim().length >= 10
                ? description.trim()
                : `${title.trim()} — Genuine Tagudin ${category} product listing. Available for counter pickup and partnered courier delivery.`;

        const payload: Record<string, FormDataConvertible> = {
            title: title.trim(),
            description: effectiveDescription,
            category_code: category,
            listing_type: 'product',
            work_shape: 'A4',
            price_amount_minor: defaultPriceMinor,
            currency: 'PHP',
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
                    `Ready in ~${pickupSla} minutes at counter`,
                ],
            })),
            addons:
                deliveryMode === 'pickup'
                    ? []
                    : [
                          {
                              id: 'addon-courier-delivery',
                              code: 'courier_delivery',
                              title: 'Doorstep courier transit',
                              description:
                                  'Independent courier agreement for source pickup and recipient handoff.',
                              price_amount_minor: 3500,
                              currency: 'PHP',
                              partner_role: 'courier',
                              partner_fixture_keys: ['active-tagudin-courier-01'],
                              status: 'available',
                              settlement_mode: 'independent_provider_agreement',
                          },
                          ...(deliveryMode === 'install'
                              ? [
                                    {
                                        id: 'addon-product-install',
                                        code: 'product_install',
                                        title: 'Delivery plus installation labor',
                                        description:
                                            'Courier transit followed by certified on-site technician installation.',
                                        price_amount_minor: 28500,
                                        currency: 'PHP',
                                        partner_role: 'technician',
                                        partner_fixture_keys: [
                                            'active-tagudin-courier-01',
                                            'active-tagudin-ac-install-01',
                                        ],
                                        status: 'available',
                                        settlement_mode: 'independent_provider_agreement',
                                    },
                                ]
                              : []),
                      ],
            milestone_stages:
                deliveryMode === 'pickup'
                    ? [
                          {
                              id: 'order_confirmed',
                              title: 'Order Placed & Inventory Committed',
                              description:
                                  'Merchant acknowledges availability at the Tagudin counter.',
                              step: 1,
                          },
                          {
                              id: 'counter_handoff',
                              title: 'Counter Collection',
                              description:
                                  'Buyer and merchant confirm the item handoff at the counter.',
                              step: 2,
                          },
                      ]
                    : [
                          {
                              id: 'order_confirmed',
                              title: 'Order Placed & Inventory Committed',
                              description:
                                  'Merchant acknowledges availability at the Tagudin counter.',
                              step: 1,
                          },
                          {
                              id: 'courier_dispatch',
                              title: 'Packaged & Courier Dispatch',
                              description:
                                  'The selected courier receives the package at the source handoff.',
                              step: 2,
                          },
                          {
                              id: 'delivery_proof',
                              title: 'Doorstep Arrival & Handoff Confirmation',
                              description:
                                  'Courier and recipient confirm delivery at the destination.',
                              step: 3,
                          },
                      ],
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

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
            <DesktopGlobalNav activeRoute="create_listing" />

            <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col bg-white pb-[90px] lg:pb-8 shadow-xs lg:my-8 lg:min-h-[auto] lg:rounded-2xl lg:border lg:border-slate-200">
                {/* Header */}
                <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur lg:rounded-t-2xl">
                    <Link
                        href="/browse"
                        className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div className="text-center">
                        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            Step {step} of 3
                        </span>
                        <h1 className="text-xs font-extrabold text-[#0F2F58]">
                            Create Marketplace Listing
                        </h1>
                    </div>
                    <div className="size-9" />
                </header>

                {/* Listing Type Switcher: Service vs Product */}
                <div className="grid grid-cols-2 gap-1.5 border-b border-slate-200/80 bg-slate-50 px-4 py-2.5">
                    <Link
                        href="/listings/create/service"
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                        <Wrench className="size-3.5" />
                        <span>Service Offering</span>
                    </Link>
                    <Link
                        href="/listings/create/product"
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0F2F58] py-2 text-xs font-extrabold text-white shadow-xs"
                    >
                        <Package className="size-3.5" />
                        <span>Product / Goods</span>
                    </Link>
                </div>

                {/* Stepper Progress Indicator */}
                <div className="flex items-center justify-center gap-1.5 border-b border-slate-100 bg-[#FAFCFB] py-2.5">
                    <div
                        className={`h-1.5 rounded-full transition-all ${step === 1 ? 'w-8 bg-[#0F2F58]' : 'w-2 bg-slate-300'}`}
                    />
                    <div
                        className={`h-1.5 rounded-full transition-all ${step === 2 ? 'w-8 bg-[#0F2F58]' : 'w-2 bg-slate-300'}`}
                    />
                    <div
                        className={`h-1.5 rounded-full transition-all ${step === 3 ? 'w-8 bg-[#0F2F58]' : 'w-2 bg-slate-300'}`}
                    />
                </div>

                {/* Step Form Container */}
                <main className="flex-1 space-y-5 p-5">
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

                            {/* Counter Pickup SLA */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Counter Ready Turnaround
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={pickupSla}
                                        onChange={(e) => setPickupSla(e.target.value)}
                                        min="5"
                                        step="5"
                                        className="w-24 rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2.5 font-mono text-sm font-extrabold text-slate-900 outline-none focus:border-[#0F2F58]"
                                    />
                                    <span className="text-xs font-semibold text-slate-600">
                                        minutes to pack at store counter
                                    </span>
                                </div>
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
                                                            ★ Default
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
                                    Fulfillment &amp; Draft Review
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Choose supported fulfillment, then save a private draft.
                                </p>
                            </div>

                            {/* Fulfillment Mode Choice */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Supported Delivery &amp; Partner Rails
                                </label>
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDeliveryMode('pickup')}
                                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                                            deliveryMode === 'pickup'
                                                ? 'border-[#0F2F58] bg-[#EBF2FA]'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Package className="size-4 text-[#0F2F58]" />
                                            <div>
                                                <div className="text-xs font-extrabold text-slate-900">
                                                    Counter Pickup Only
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    Customer collects item at Tagudin stall
                                                </div>
                                            </div>
                                        </div>
                                        <span className="font-mono text-xs font-extrabold text-emerald-700">
                                            Free
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setDeliveryMode('courier')}
                                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                                            deliveryMode === 'courier'
                                                ? 'border-[#0F2F58] bg-[#EBF2FA]'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Truck className="size-4 text-[#0F2F58]" />
                                            <div>
                                                <div className="text-xs font-extrabold text-slate-900">
                                                    Pickup + Doorstep Courier
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    Motorcycle delivery across Tagudin barangays
                                                </div>
                                            </div>
                                        </div>
                                        <span className="font-mono text-xs font-extrabold text-[#0F2F58]">
                                            +₱35.00
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setDeliveryMode('install')}
                                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                                            deliveryMode === 'install'
                                                ? 'border-[#0F2F58] bg-[#EBF2FA]'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Wrench className="size-4 text-[#0F2F58]" />
                                            <div>
                                                <div className="text-xs font-extrabold text-slate-900">
                                                    Delivery + Installation Labor (Deal Chain)
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    Courier handoff followed by certified technician
                                                    install
                                                </div>
                                            </div>
                                        </div>
                                        <span className="font-mono text-xs font-extrabold text-[#0F2F58]">
                                            +₱285.00
                                        </span>
                                    </button>
                                </div>
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
                                        {title}
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
            </div>
        </div>
    );
}
