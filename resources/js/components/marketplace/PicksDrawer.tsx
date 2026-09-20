import { useState, useEffect } from 'react';
import {
    ShoppingBag,
    X,
    Plus,
    Minus,
    Trash2,
    ShieldCheck,
    ArrowRight,
    ArrowLeft,
    Package,
    Truck,
    Wrench,
    Link as LinkIcon,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { BundleChainModal } from './BundleChainModal';
import type { BasketItem } from '@/marketplace/types';

interface PicksDrawerProps {
    open: boolean;
    onClose: () => void;
    items: BasketItem[];
    onUpdateQuantity: (id: string, delta: number) => void;
    onRemoveItem: (id: string) => void;
    onCheckout: () => void;
    onAttachDealChain?: (
        itemId: string,
        recipeId: 'turnkey_parts' | 'courier_delivery' | 'safety_audit' | null,
    ) => void;
}

export function PicksDrawer({
    open,
    onClose,
    items,
    onUpdateQuantity,
    onRemoveItem,
    onCheckout,
    onAttachDealChain,
}: PicksDrawerProps) {
    const [chainModalItem, setChainModalItem] = useState<BasketItem | null>(null);
    const [expandedSlotItemIds, setExpandedSlotItemIds] = useState<string[]>([]);

    useEffect(() => {
        if (!open) return;
        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;

        // Prevent layout shift when scrollbar disappears
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemsWithDealChain = items.filter((item) => Boolean(item.dealChain));
    return (
        <div className="fixed inset-0 z-50 overflow-hidden" style={{ overscrollBehavior: 'contain' }}>
            {/* Backdrop (visible on desktop) */}
            <div
                className="hidden lg:block fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Container: 100% Full-screen on mobile, slide-over drawer on desktop */}
            <div className="fixed inset-0 lg:inset-y-0 lg:left-auto lg:right-0 flex w-full lg:max-w-lg z-50">
                <div className="w-full h-full bg-white shadow-2xl flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif] overscroll-contain">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-6">
                        <div className="flex items-center gap-2.5">
                            {/* Mobile Back Arrow */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex size-8 lg:hidden items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
                                aria-label="Back to marketplace"
                            >
                                <ArrowLeft className="size-5" />
                            </button>

                            <div className="flex size-9 items-center justify-center rounded-xl bg-[#EBF2FA] text-[#0F2F58]">
                                <ShoppingBag className="size-5" />
                            </div>
                            <div>
                                <h2 className="text-sm sm:text-base font-extrabold text-[#0F2F58]">
                                    Citizen Picks
                                </h2>
                                <p className="text-[11px] text-slate-500">
                                    {totalCount} {totalCount === 1 ? 'item' : 'items'} staged for escrow
                                </p>
                            </div>
                        </div>

                        {/* Desktop Close Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="hidden lg:flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            aria-label="Close drawer"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 space-y-5">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                    <ShoppingBag className="size-7" />
                                </div>
                                <h3 className="mt-4 text-sm font-extrabold text-[#0F2F58]">
                                    Your Picks tray is empty
                                </h3>
                                <p className="mt-1 max-w-xs text-xs text-slate-500">
                                    Browse verified Tagudin offerings and tap "+ Book" or add items to stage services and goods.
                                </p>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mt-5 rounded-full bg-[#0F2F58] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#153e74] transition-colors cursor-pointer"
                                >
                                    Explore Marketplace
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Staged Picks Items List */}
                                <div className="flex flex-col gap-3">
                                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                                        Staged Services &amp; Products
                                    </div>
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-[#FAFCFB] p-3.5 shadow-xs"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex-1">
                                                    <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1">
                                                        {item.title}
                                                    </h4>
                                                    <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium">
                                                        <span>Verified Tagudin offering</span>
                                                    </div>
                                                    <div className="mt-1 font-mono text-xs font-extrabold text-[#0F2F58]">
                                                        ₱{item.price.toFixed(2)}
                                                    </div>
                                                </div>

                                                {/* Quantity & Remove controls */}
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => onUpdateQuantity(item.id, -1)}
                                                            className="flex size-6 cursor-pointer items-center justify-center text-slate-600 hover:text-slate-900"
                                                            aria-label="Decrease quantity"
                                                        >
                                                            <Minus className="size-3" />
                                                        </button>
                                                        <span className="w-6 text-center text-xs font-bold text-slate-800">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => onUpdateQuantity(item.id, 1)}
                                                            className="flex size-6 cursor-pointer items-center justify-center text-slate-600 hover:text-slate-900"
                                                            aria-label="Increase quantity"
                                                        >
                                                            <Plus className="size-3" />
                                                        </button>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => onRemoveItem(item.id)}
                                                        className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                        aria-label="Remove item"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Deal Chain Button & Attached Node Pipeline */}
                                            {/* Deal Chain Container Card */}
                                            {item.dealChain ? (
                                                <div className="mt-1 flex flex-col gap-2 rounded-xl border border-[#0F2F58]/20 bg-[#F0F4F8] p-3">
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <div className="flex items-center gap-1.5 font-extrabold text-[#0F2F58]">
                                                            <LinkIcon className="size-3.5" />
                                                            <span>{item.dealChain.title}</span>
                                                            <span className="rounded-full bg-[#EBF2FA] px-1.5 py-0.2 text-[9px] font-extrabold text-[#0F2F58]">
                                                                {item.dealChain.nodes.length} Bound
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setExpandedSlotItemIds((prev) =>
                                                                        prev.includes(item.id)
                                                                            ? prev.filter((id) => id !== item.id)
                                                                            : [...prev, item.id],
                                                                    );
                                                                }}
                                                                className="flex items-center gap-0.5 text-xs font-extrabold text-[#0F2F58] hover:underline cursor-pointer"
                                                            >
                                                                <span>{expandedSlotItemIds.includes(item.id) ? 'Hide Slots' : 'Slots'}</span>
                                                                {expandedSlotItemIds.includes(item.id) ? (
                                                                    <ChevronUp className="size-3.5" />
                                                                ) : (
                                                                    <ChevronDown className="size-3.5" />
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => onAttachDealChain?.(item.id, null)}
                                                                className="text-slate-400 hover:text-red-600 font-bold cursor-pointer text-[10px]"
                                                            >
                                                                Unlink
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Compact Node-Wire Pipeline */}
                                                    <div className="flex items-center gap-1 overflow-x-auto py-1 [scrollbar-width:none]">
                                                        {item.dealChain.nodes.map((node, nIdx) => (
                                                            <div key={nIdx} className="flex items-center gap-1 shrink-0">
                                                                <div className="flex items-center gap-1 rounded bg-white px-2 py-1 text-[9px] font-extrabold text-slate-800 border border-slate-200 shadow-2xs">
                                                                    <span className="text-[7.5px] uppercase font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded-xs">
                                                                        {node.role}
                                                                    </span>
                                                                    <span>{node.title}</span>
                                                                </div>
                                                                {nIdx < item.dealChain!.nodes.length - 1 && (
                                                                    <div className="flex items-center text-slate-400 text-[10px] px-0.5 font-bold">
                                                                        <span>→</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Detailed Slots Breakdown (Toggleable) */}
                                                    {expandedSlotItemIds.includes(item.id) && (
                                                        <div className="mt-1 flex flex-col gap-1.5 border-t border-slate-200 pt-2">
                                                            {item.dealChain.nodes.map((node, nIdx) => (
                                                                <div
                                                                    key={nIdx}
                                                                    className="flex items-center justify-between rounded-lg bg-white p-2 border border-slate-200 text-xs"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                                            Slot #{nIdx + 1}
                                                                        </span>
                                                                        <span className="font-extrabold text-slate-900">{node.title}</span>
                                                                        <span className="text-[10px] text-slate-500">({node.sub})</span>
                                                                    </div>
                                                                    <span className="font-mono text-xs font-bold text-[#0F2F58]">
                                                                        Bound
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-1 flex items-center justify-between">
                                                    <button
                                                        type="button"
                                                        onClick={() => setChainModalItem(item)}
                                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-[#0F2F58] bg-[#F0F4F8] px-3 py-1.5 text-[11px] font-bold text-[#0F2F58] transition-colors hover:bg-[#E2E8F0]"
                                                    >
                                                        <LinkIcon className="size-3" />
                                                        <span>+ Attach Deal Chain Partner (Parts / Courier)...</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Itemized Deal Chain Child Orders: ONLY shown when deal chains are attached */}
                                {itemsWithDealChain.length > 0 && (
                                    <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                                Attached Deal Chain Child Orders
                                            </div>
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9.5px] font-extrabold text-amber-800 uppercase">
                                                Non-Cascading
                                            </span>
                                        </div>

                                        {itemsWithDealChain.flatMap((item) =>
                                            item.dealChain!.nodes.map((node, nodeIdx) => (
                                                <div
                                                    key={`${item.id}-${nodeIdx}`}
                                                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 text-xs"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex size-6 items-center justify-center rounded-md bg-blue-50 text-[#0F2F58]">
                                                            {node.role.toLowerCase().includes('store') && <Package className="size-3.5" />}
                                                            {node.role.toLowerCase().includes('courier') && <Truck className="size-3.5" />}
                                                            {node.role.toLowerCase().includes('labor') && <Wrench className="size-3.5" />}
                                                            {!node.role.toLowerCase().includes('store') &&
                                                             !node.role.toLowerCase().includes('courier') &&
                                                             !node.role.toLowerCase().includes('labor') && (
                                                                <Package className="size-3.5" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                                Slot #{nodeIdx + 1} · {node.role}
                                                            </span>
                                                            <div className="font-extrabold text-slate-900">
                                                                {node.title}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500">
                                                                {item.title} ({node.sub})
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}

                                        {/* Soundness Shield Box */}
                                        <div className="mt-1 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-[11px] text-blue-950">
                                            <ShieldCheck className="size-4.5 shrink-0 text-[#0F2F58] mt-0.5" />
                                            <div>
                                                <strong>Non-Cascading Settlement Protection:</strong> Each child order is held in its own independent escrow line. If courier transit encounters delays, the store&apos;s inventory and technician labor remain financially isolated and protected.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer: Subtotal & Escrow CTA */}
                    {items.length > 0 && (
                        <div className="border-t border-slate-200 bg-white p-4 sm:p-6 space-y-3">
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between text-slate-600 font-medium">
                                    <span>Picks subtotal ({totalCount} units):</span>
                                    <span className="font-mono font-bold text-slate-800">₱{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 font-medium">
                                    <span>Tiwala Community Assurance fee:</span>
                                    <span className="font-mono font-bold text-emerald-700">₱0.00 (Launch Promo)</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-extrabold text-[#0F2F58]">
                                    <span>Total Escrow Authorization:</span>
                                    <span className="font-mono text-base">₱{subtotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onCheckout}
                                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] text-xs font-extrabold tracking-wide text-white shadow-md transition-all hover:bg-[#153e74] active:scale-98"
                            >
                                <span>Proceed to Escrow Checkout · ₱{subtotal.toFixed(2)}</span>
                                <ArrowRight className="size-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bundle & Chain Services Modal */}
            <BundleChainModal
                open={Boolean(chainModalItem)}
                onClose={() => setChainModalItem(null)}
                item={chainModalItem}
                onSelectRecipe={(itemId, recipeId) => {
                    onAttachDealChain?.(itemId, recipeId);
                }}
            />
        </div>
    );
}
