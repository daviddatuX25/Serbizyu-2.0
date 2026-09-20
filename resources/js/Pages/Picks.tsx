import { useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    ShoppingBag,
    ArrowLeft,
    X,
    Plus,
    Minus,
    Trash2,
    ShieldCheck,
    ArrowRight,
    Package,
    Truck,
    Wrench,
    Link as LinkIcon,
} from 'lucide-react';
import type { HomeProps } from '../types';
import { DesktopGlobalNav } from '../components/layout/DesktopGlobalNav';
import { DealChainCheckoutModal } from '../components/marketplace/DealChainCheckoutModal';
import { DEAL_CHAIN_RECIPES } from '../marketplace/dealChainRecipes';
import type { BasketItem } from '../marketplace/types';

export default function Picks(props: HomeProps) {
    const [basket, setBasket] = useState<BasketItem[]>([]);
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [activeRecipePickerId, setActiveRecipePickerId] = useState<string | null>(null);
    useEffect(() => {
        try {
            const stored = localStorage.getItem('serbizyu.picks');
            if (stored) {
                setBasket(JSON.parse(stored));
            }
        } catch {
            // ignore
        }
    }, []);

    const saveBasket = (newBasket: BasketItem[]) => {
        setBasket(newBasket);
        try {
            localStorage.setItem('serbizyu.picks', JSON.stringify(newBasket));
        } catch {
            // ignore
        }
    };

    const updateQuantity = (id: string, delta: number) => {
        const next = basket
            .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
            .filter((item) => item.quantity > 0);
        saveBasket(next);
    };

    const removeItem = (id: string) => {
        const next = basket.filter((item) => item.id !== id);
        saveBasket(next);
    };

    const handleAttachDealChain = (
        itemId: string,
        recipeId: 'turnkey_parts' | 'courier_delivery' | 'safety_audit' | null,
    ) => {
        const recipe = recipeId ? DEAL_CHAIN_RECIPES[recipeId] : null;
        const next = basket.map((item) => {
            if (item.id !== itemId) return item;
            const currentAddon = item.dealChain?.extraFee || 0;
            const newAddon = recipe?.extraFee || 0;
            const newPrice = item.price - currentAddon + newAddon;
            return {
                ...item,
                price: newPrice,
                dealChain: recipe || undefined,
            };
        });
        saveBasket(next);
    };

    const totalCount = basket.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = basket.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleAuthorizeDealChain = (paymentMethod: 'cash' | 'gcash' | 'escrow') => {
        setCheckoutModalOpen(false);
        // Post to backend order formation / deal chain checkout endpoint
        router.post('/deal-chains/authorize', {
            payment_method: paymentMethod,
            items: basket.map((b) => ({
                id: b.id,
                title: b.title,
                price: b.price,
                quantity: b.quantity,
                deal_chain: b.dealChain?.recipeId || null,
            })),
            total_amount: subtotal,
        }, {
            onError: () => {
                // Fallback to order tracking or first item booking
                if (basket.length > 0) {
                    router.visit(`/listings/${basket[0].id}/book`);
                }
            },
            onSuccess: () => {
                saveBasket([]);
            },
        });
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
            <DesktopGlobalNav
                activeRoute="browse"
                picksCount={totalCount}
                actingContext={{
                    actorUserId: props.session?.userId || 'usr_guest',
                    ownerUserId: 'usr_guest',
                    ownerName: props.session?.displayName || 'Tagudin Resident',
                    consentGrantId: 'cg_public',
                    isActingOnBehalf: false,
                }}
            />

            {/* Mobile Header */}
            <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
                <Link
                    href="/browse"
                    className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-700"
                    aria-label="Back to browse"
                >
                    <ArrowLeft className="size-4" />
                </Link>
                <div className="flex items-center gap-1.5 font-extrabold text-[#0F2F58] text-sm">
                    <ShoppingBag className="size-4" />
                    <span>Citizen Picks ({totalCount})</span>
                </div>
                <button
                    type="button"
                    onClick={() => saveBasket([])}
                    className="text-xs font-bold text-slate-500 hover:text-red-600 cursor-pointer"
                >
                    Clear
                </button>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
                {/* Desktop Breadcrumbs */}
                <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
                    <Link href="/browse" className="hover:text-[#0F2F58] flex items-center gap-1">
                        <ArrowLeft className="size-3.5" />
                        <span>Back to active listings</span>
                    </Link>
                    <span>/</span>
                    <span className="text-slate-900 font-bold">Citizen Picks &amp; Deal Chain Tray</span>
                </div>

                {basket.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center shadow-xs">
                        <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <ShoppingBag className="size-8" />
                        </div>
                        <h2 className="mt-4 text-base font-extrabold text-[#0F2F58]">Your Picks Tray is Empty</h2>
                        <p className="mt-1 max-w-sm text-xs text-slate-500">
                            Explore verified Tagudin marketplace listings, attach partner deal chains, and stage items in your tray.
                        </p>
                        <Link
                            href="/browse"
                            className="mt-6 rounded-full bg-[#0F2F58] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#153e74]"
                        >
                            Explore Marketplace
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* LEFT COLUMN (60%): Staged Items with Deal Chain Buttons & Breakdown */}
                        <div className="flex flex-col gap-6 lg:col-span-7">
                            {/* Staged Items Card */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                        Staged Offerings ({totalCount})
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => saveBasket([])}
                                        className="text-xs font-bold text-slate-400 hover:text-red-600 cursor-pointer"
                                    >
                                        Clear all picks
                                    </button>
                                </div>

                                <div className="flex flex-col gap-3.5">
                                    {basket.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-[#FAFCFB] p-4 shadow-xs"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-extrabold text-slate-900">{item.title}</h3>
                                                    <div className="text-xs text-slate-500 mt-0.5">Verified Tagudin offering</div>
                                                    <div className="mt-1 font-mono text-sm font-extrabold text-[#0F2F58]">
                                                        ₱{item.price.toFixed(2)}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuantity(item.id, -1)}
                                                            className="flex size-7 cursor-pointer items-center justify-center text-slate-600 hover:text-slate-900"
                                                            aria-label="Decrease quantity"
                                                        >
                                                            <Minus className="size-3.5" />
                                                        </button>
                                                        <span className="w-7 text-center text-xs font-bold text-slate-800">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuantity(item.id, 1)}
                                                            className="flex size-7 cursor-pointer items-center justify-center text-slate-600 hover:text-slate-900"
                                                            aria-label="Increase quantity"
                                                        >
                                                            <Plus className="size-3.5" />
                                                        </button>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.id)}
                                                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                        aria-label="Remove item"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Deal Chain Button & Visual Pipeline */}
                                            {item.dealChain ? (
                                                <div className="mt-1 flex flex-col gap-1.5 rounded-lg border border-[#0F2F58]/20 bg-[#F0F4F8] p-2.5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-extrabold text-[#0F2F58] flex items-center gap-1.5">
                                                            <LinkIcon className="size-3.5" />
                                                            <span>
                                                                {item.dealChain.title} (+₱{item.dealChain.extraFee.toFixed(2)})
                                                            </span>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAttachDealChain(item.id, null)}
                                                            className="text-slate-400 hover:text-red-600 font-bold cursor-pointer text-xs"
                                                        >
                                                            Detach
                                                        </button>
                                                    </div>
                                                    {/* Connected Nodes */}
                                                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                                                        {item.dealChain.nodes.map((node, nIdx) => (
                                                            <div key={nIdx} className="flex items-center gap-1.5 shrink-0">
                                                                <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-extrabold text-slate-800 border border-slate-200 shadow-xs">
                                                                    {node.role}: {node.title}
                                                                </span>
                                                                {nIdx < item.dealChain!.nodes.length - 1 && (
                                                                    <span className="text-slate-400 text-xs">→</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-1 flex flex-col gap-1.5">
                                                    {activeRecipePickerId === item.id ? (
                                                        <div className="flex flex-col gap-2 rounded-xl border border-[#0F2F58]/30 bg-[#F8FAFD] p-3.5 shadow-xs">
                                                            <div className="flex items-center justify-between text-xs font-extrabold text-[#0F2F58]">
                                                                <span>Select Deal Chain Partner</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveRecipePickerId(null)}
                                                                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                                                    aria-label="Cancel"
                                                                >
                                                                    <X className="size-4" />
                                                                </button>
                                                            </div>

                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleAttachDealChain(item.id, 'turnkey_parts');
                                                                        setActiveRecipePickerId(null);
                                                                    }}
                                                                    className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 text-left transition-colors hover:border-[#0F2F58] hover:bg-[#EBF2FA]"
                                                                >
                                                                    <div>
                                                                        <div className="text-xs font-extrabold text-slate-900">
                                                                            🔗 Turnkey Sourced Parts
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-500">
                                                                            Hardware Depot + Courier + Labor
                                                                        </div>
                                                                    </div>
                                                                    <span className="font-mono text-xs font-bold text-[#0F2F58]">
                                                                        +₱215.00
                                                                    </span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleAttachDealChain(item.id, 'courier_delivery');
                                                                        setActiveRecipePickerId(null);
                                                                    }}
                                                                    className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 text-left transition-colors hover:border-[#0F2F58] hover:bg-[#EBF2FA]"
                                                                >
                                                                    <div>
                                                                        <div className="text-xs font-extrabold text-slate-900">
                                                                            🚚 Doorstep Courier Transit
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-500">
                                                                            Danny Express Motorcycle Pool
                                                                        </div>
                                                                    </div>
                                                                    <span className="font-mono text-xs font-bold text-[#0F2F58]">
                                                                        +₱35.00
                                                                    </span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleAttachDealChain(item.id, 'safety_audit');
                                                                        setActiveRecipePickerId(null);
                                                                    }}
                                                                    className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 text-left transition-colors hover:border-[#0F2F58] hover:bg-[#EBF2FA]"
                                                                >
                                                                    <div>
                                                                        <div className="text-xs font-extrabold text-slate-900">
                                                                            🛡️ Quality & Safety Inspection
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-500">
                                                                            Barangay Safety & Code Audit
                                                                        </div>
                                                                    </div>
                                                                    <span className="font-mono text-xs font-bold text-[#0F2F58]">
                                                                        +₱65.00
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between">
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveRecipePickerId(item.id)}
                                                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-[#0F2F58] bg-[#F0F4F8] px-3 py-1.5 text-xs font-bold text-[#0F2F58] transition-colors hover:bg-[#E2E8F0]"
                                                            >
                                                                <LinkIcon className="size-3.5" />
                                                                <span>+ Attach Deal Chain Partner (Parts / Courier)...</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Itemized Deal Chain Child Orders Breakdown: ONLY shown when deal chains are attached */}
                            {basket.filter((item) => Boolean(item.dealChain)).length > 0 && (
                                <>
                                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col gap-3">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <div>
                                                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                                    Attached Deal Chain Child Orders
                                                </h2>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Multi-party line items under independent settlement
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 uppercase">
                                                Non-Cascading
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-2.5">
                                            {basket
                                                .filter((item) => Boolean(item.dealChain))
                                                .flatMap((item) =>
                                                    item.dealChain!.nodes.map((node, nodeIdx) => (
                                                        <div
                                                            key={`${item.id}-${nodeIdx}`}
                                                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs"
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-[#0F2F58]">
                                                                    {node.role.toLowerCase().includes('store') && <Package className="size-4" />}
                                                                    {node.role.toLowerCase().includes('courier') && <Truck className="size-4" />}
                                                                    {node.role.toLowerCase().includes('labor') && <Wrench className="size-4" />}
                                                                    {!node.role.toLowerCase().includes('store') &&
                                                                     !node.role.toLowerCase().includes('courier') &&
                                                                     !node.role.toLowerCase().includes('labor') && (
                                                                        <Package className="size-4" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <span className="text-[9.5px] font-bold text-slate-400 uppercase">
                                                                        Slot #{nodeIdx + 1} · {node.role}
                                                                    </span>
                                                                    <div className="font-extrabold text-slate-900">
                                                                        {node.title}
                                                                    </div>
                                                                    <div className="text-[10.5px] text-slate-500">
                                                                        {item.title} ({node.sub})
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                        </div>
                                    </div>

                                    {/* Soundness Shield Box */}
                                    <div className="flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-950">
                                        <ShieldCheck className="size-5 shrink-0 text-[#0F2F58] mt-0.5" />
                                        <div>
                                            <strong>Non-Cascading Settlement Protection:</strong> Each child order is held in its own independent escrow line. If courier transit encounters delays, the store&apos;s inventory and technician labor remain financially isolated and protected.
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* RIGHT COLUMN (40%): Sticky Checkout Card */}
                        <div className="lg:col-span-5 sticky top-24">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md flex flex-col gap-5">
                                <div className="border-b border-slate-100 pb-4">
                                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        Escrow Order Summary
                                    </div>
                                    <div className="mt-1 font-mono text-2xl font-extrabold text-[#0F2F58]">
                                        ₱{subtotal.toFixed(2)}
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between text-slate-600">
                                        <span>Picks Subtotal ({totalCount} items):</span>
                                        <span className="font-mono font-bold text-slate-800">₱{subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>Tiwala Community Assurance:</span>
                                        <span className="font-mono font-bold text-emerald-700">₱0.00 (Launch Promo)</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-200 pt-2.5 text-sm font-extrabold text-[#0F2F58]">
                                        <span>Total Escrow Authorization:</span>
                                        <span className="font-mono text-base">₱{subtotal.toFixed(2)}</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setCheckoutModalOpen(true)}
                                    className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] text-xs font-extrabold tracking-wide text-white shadow-md transition-all hover:bg-[#153e74] active:scale-98"
                                >
                                    <span>Proceed to Escrow Checkout</span>
                                    <ArrowRight className="size-4" />
                                </button>

                                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-[11px] text-emerald-900">
                                    <ShieldCheck className="size-4 shrink-0 text-emerald-700 mt-0.5" />
                                    <span>
                                        <strong>Tiwala Escrow Protection:</strong> Funds release to providers only after you verify and sign off on completion photos.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Dedicated Deal Chain Checkout Modal (Payment Selection & Authorization) */}
            <DealChainCheckoutModal
                open={checkoutModalOpen}
                onClose={() => setCheckoutModalOpen(false)}
                items={basket}
                totalAmount={subtotal}
                onAuthorize={handleAuthorizeDealChain}
            />
        </div>
    );
}
