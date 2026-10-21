import { useState, useEffect } from 'react';
import {
    ShoppingBag,
    X,
    Plus,
    Minus,
    Trash2,
    ArrowRight,
    ArrowLeft,
    Link as LinkIcon,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { BundleChainModal } from './BundleChainModal';
import type { DealChainRecipeDefinition } from '@/marketplace/dealChainRecipes';
import type {
    BasketItem,
    PublishedDealChainRecipeId,
    SlotCandidateListing,
} from '@/marketplace/types';
import { SlotListingPickerModal } from './SlotListingPickerModal';
interface PicksDrawerProps {
    open: boolean;
    onClose: () => void;
    items: BasketItem[];
    recipes?: DealChainRecipeDefinition[];
    onUpdateQuantity: (id: string, delta: number) => void;
    onRemoveItem: (id: string) => void;
    onCheckout: () => void;
    onAttachDealChain?: (itemId: string, recipeId: PublishedDealChainRecipeId | null) => void;
    onSwapSlotCandidate?: (
        itemId: string,
        nodeIndex: number,
        candidate: SlotCandidateListing,
    ) => void;
}

export function PicksDrawer({
    open,
    onClose,
    items,
    recipes,
    onUpdateQuantity,
    onRemoveItem,
    onCheckout,
    onAttachDealChain,
    onSwapSlotCandidate,
}: PicksDrawerProps) {
    const [chainModalItem, setChainModalItem] = useState<BasketItem | null>(null);
    const [expandedSlotItemIds, setExpandedSlotItemIds] = useState<string[]>([]);
    const [slotPickerTarget, setSlotPickerTarget] = useState<{
        itemId: string;
        nodeIndex: number;
        role: string;
        currentListingId?: string;
    } | null>(null);
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
    const hasDealChain = itemsWithDealChain.length > 0;
    const isSingleProduct = items.length === 1 && items[0].listing_type === 'product';
    const isSingleService = items.length === 1 && items[0].listing_type !== 'product';

    let ctaLabel = 'Confirm Bookings & Orders';
    if (hasDealChain) {
        ctaLabel = 'Review Coordinated Chain';
    } else if (isSingleService) {
        ctaLabel = `Confirm Booking · ₱${subtotal.toFixed(2)}`;
    } else if (isSingleProduct) {
        ctaLabel = `Confirm Order · ₱${subtotal.toFixed(2)}`;
    } else {
        ctaLabel = `Confirm Order & Bookings · ₱${subtotal.toFixed(2)}`;
    }
    return (
        <div
            className="fixed inset-0 z-50 overflow-hidden"
            style={{ overscrollBehavior: 'contain' }}
        >
            {/* Backdrop (visible on desktop) */}
            <div
                className="fixed inset-0 hidden bg-slate-900/40 backdrop-blur-xs transition-opacity lg:block"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Container: 100% Full-screen on mobile, slide-over drawer on desktop */}
            <div className="fixed inset-0 z-50 flex w-full lg:inset-y-0 lg:right-0 lg:left-auto lg:max-w-lg">
                <div className="flex h-full w-full flex-col justify-between overscroll-contain bg-white font-['Plus_Jakarta_Sans',sans-serif] shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-6">
                        <div className="flex items-center gap-2.5">
                            {/* Mobile Back Arrow */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex size-8 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 lg:hidden"
                                aria-label="Back to marketplace"
                            >
                                <ArrowLeft className="size-5" />
                            </button>

                            <div className="flex size-9 items-center justify-center rounded-xl bg-[#EBF2FA] text-[#0F2F58]">
                                <ShoppingBag className="size-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-extrabold text-[#0F2F58] sm:text-base">
                                    Citizen Picks
                                </h2>
                                <p className="text-[11px] text-slate-500">
                                    {totalCount} {totalCount === 1 ? 'item' : 'items'} staged for
                                    review
                                </p>
                            </div>
                        </div>

                        {/* Desktop Close Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="hidden size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:flex"
                            aria-label="Close drawer"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                    <ShoppingBag className="size-7" />
                                </div>
                                <h3 className="mt-4 text-sm font-extrabold text-[#0F2F58]">
                                    Your Picks tray is empty
                                </h3>
                                <p className="mt-1 max-w-xs text-xs text-slate-500">
                                    Browse verified Tagudin offerings and tap "+ Book" or add items
                                    to stage services and goods.
                                </p>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mt-5 cursor-pointer rounded-full bg-[#0F2F58] px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#153e74]"
                                >
                                    Explore Marketplace
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Staged Picks Items List */}
                                <div className="flex flex-col gap-3">
                                    <div className="text-xs font-extrabold tracking-wider text-slate-500 uppercase">
                                        Staged Services &amp; Products
                                    </div>
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-[#FAFCFB] p-3.5 shadow-xs"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex-1">
                                                    <h4 className="line-clamp-1 text-xs font-extrabold text-slate-900">
                                                        {item.title}
                                                    </h4>
                                                    <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] font-medium text-slate-500">
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
                                                            onClick={() =>
                                                                onUpdateQuantity(item.id, -1)
                                                            }
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
                                                            onClick={() =>
                                                                onUpdateQuantity(item.id, 1)
                                                            }
                                                            className="flex size-6 cursor-pointer items-center justify-center text-slate-600 hover:text-slate-900"
                                                            aria-label="Increase quantity"
                                                        >
                                                            <Plus className="size-3" />
                                                        </button>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => onRemoveItem(item.id)}
                                                        className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
                                                            <span className="py-0.2 rounded-full bg-[#EBF2FA] px-1.5 text-[9px] font-extrabold text-[#0F2F58]">
                                                                {item.dealChain.nodes.length}{' '}
                                                                Planned
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setExpandedSlotItemIds(
                                                                        (prev) =>
                                                                            prev.includes(item.id)
                                                                                ? prev.filter(
                                                                                      (id) =>
                                                                                          id !==
                                                                                          item.id,
                                                                                  )
                                                                                : [
                                                                                      ...prev,
                                                                                      item.id,
                                                                                  ],
                                                                    );
                                                                }}
                                                                className="flex cursor-pointer items-center gap-0.5 text-xs font-extrabold text-[#0F2F58] hover:underline"
                                                            >
                                                                <span>
                                                                    {expandedSlotItemIds.includes(
                                                                        item.id,
                                                                    )
                                                                        ? 'Hide Slots'
                                                                        : 'Slots'}
                                                                </span>
                                                                {expandedSlotItemIds.includes(
                                                                    item.id,
                                                                ) ? (
                                                                    <ChevronUp className="size-3.5" />
                                                                ) : (
                                                                    <ChevronDown className="size-3.5" />
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    onAttachDealChain?.(
                                                                        item.id,
                                                                        null,
                                                                    )
                                                                }
                                                                className="cursor-pointer text-[10px] font-bold text-slate-400 hover:text-red-600"
                                                            >
                                                                Unlink
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Compact Node-Wire Pipeline */}
                                                    <div className="flex [scrollbar-width:none] items-center gap-1 overflow-x-auto py-1">
                                                        {item.dealChain.nodes.map((node, nIdx) => (
                                                            <div
                                                                key={nIdx}
                                                                className="flex shrink-0 items-center gap-1"
                                                            >
                                                                <div className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[9px] font-extrabold text-slate-800 shadow-2xs">
                                                                    <span className="py-0.2 rounded-xs bg-amber-100 px-1 text-[7.5px] font-bold text-amber-800 uppercase">
                                                                        {node.role}
                                                                    </span>
                                                                    <span>{node.title}</span>
                                                                </div>
                                                                {nIdx <
                                                                    item.dealChain!.nodes.length -
                                                                        1 && (
                                                                    <div className="flex items-center px-0.5 text-[10px] font-bold text-slate-400">
                                                                        <span>→</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Detailed Slots Breakdown (Toggleable) */}
                                                    {expandedSlotItemIds.includes(item.id) && (
                                                        <div className="mt-1 flex flex-col gap-1.5 border-t border-slate-200 pt-2">
                                                            {item.dealChain.nodes.map(
                                                                (node, nIdx) => (
                                                                    <div
                                                                        key={nIdx}
                                                                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-2xs"
                                                                    >
                                                                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                                                            <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-2xs">
                                                                                <img
                                                                                    src={
                                                                                        node.image ||
                                                                                        (node.type === 'store'
                                                                                            ? '/photos/ac-capacitor.jpg'
                                                                                            : node.type === 'delivery'
                                                                                              ? '/photos/courier.jpg'
                                                                                              : node.type === 'audit'
                                                                                                ? '/photos/req-electrician.jpg'
                                                                                                : '/photos/ac-clean.jpg')
                                                                                    }
                                                                                    alt={node.title}
                                                                                    className="size-full object-cover"
                                                                                    onError={(e) => {
                                                                                        e.currentTarget.onerror = null;
                                                                                        e.currentTarget.src = '/photos/ac-clean.jpg';
                                                                                    }}
                                                                                />
                                                                                <span className="absolute bottom-0 inset-x-0 bg-[#0F2F58]/80 text-[7px] font-extrabold text-white text-center uppercase py-0.2">
                                                                                    {node.role}
                                                                                </span>
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="flex items-baseline gap-1.5">
                                                                                    <span className="shrink-0 text-[9px] font-extrabold text-slate-400 uppercase">
                                                                                        Slot #{nIdx + 1}
                                                                                    </span>
                                                                                    <h4 className="text-[11.5px] font-extrabold text-slate-900 line-clamp-1 leading-tight">
                                                                                        {node.title}
                                                                                    </h4>
                                                                                </div>
                                                                                <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                                                                    {node.providerName ? `${node.providerName} · ` : ''}{node.sub}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="ml-2 flex shrink-0 items-center gap-2">
                                                                            <span className="font-mono text-xs font-extrabold text-[#0F2F58]">
                                                                                {node.priceMinor
                                                                                    ? `₱${(node.priceMinor / 100).toFixed(2)}`
                                                                                    : 'Planned'}
                                                                            </span>
                                                                            {node.type !== 'labor' && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        setSlotPickerTarget({
                                                                                            itemId: item.id,
                                                                                            nodeIndex: nIdx,
                                                                                            role: node.role,
                                                                                            currentListingId: node.listingId,
                                                                                        })
                                                                                    }
                                                                                    className="cursor-pointer rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold text-[#0F2F58] hover:bg-[#EBF2FA] transition-colors"
                                                                                >
                                                                                    Change ▾
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )}
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
                                                        <span>+ Attach Deal Chain Partner...</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                            </>
                        )}
                    </div>

                    {/* Footer: Plan CTA */}
                    {items.length > 0 && (
                        <div className="space-y-3 border-t border-slate-200 bg-white p-4 sm:p-6">
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between font-medium text-slate-600">
                                    <span>
                                        Picks subtotal ({totalCount}{' '}
                                        {totalCount === 1 ? 'item' : 'items'}):
                                    </span>
                                    <span className="font-mono font-bold text-slate-800">
                                        ₱{subtotal.toFixed(2)}
                                    </span>
                                </div>
                                {!hasDealChain ? (
                                    <>
                                        <div className="flex justify-between font-medium text-slate-600">
                                            <span>Platform commission:</span>
                                            <span className="font-bold text-emerald-700">
                                                ₱0.00 (Zero platform fee)
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-extrabold text-[#0F2F58]">
                                            <span>Total to pay upon completion:</span>
                                            <span className="font-mono text-base">
                                                ₱{subtotal.toFixed(2)}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between font-medium text-slate-600">
                                            <span>Provider pricing:</span>
                                            <span className="font-bold text-amber-700">
                                                Confirmed after agreement
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-extrabold text-[#0F2F58]">
                                            <span>Displayed planning estimate:</span>
                                            <span className="font-mono text-base">
                                                ₱{subtotal.toFixed(2)}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={onCheckout}
                                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#FFC72C] text-xs font-extrabold tracking-wide text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-98"
                            >
                                <span>{ctaLabel}</span>
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
                recipes={recipes}
                onSelectRecipe={(itemId, recipeId) => {
                    onAttachDealChain?.(itemId, recipeId);
                }}
            />

            {/* Slot Listing Picker Modal */}
            <SlotListingPickerModal
                open={Boolean(slotPickerTarget)}
                onClose={() => setSlotPickerTarget(null)}
                role={slotPickerTarget?.role || 'STORE'}
                currentListingId={slotPickerTarget?.currentListingId}
                onSelectCandidate={(candidate) => {
                    if (slotPickerTarget && onSwapSlotCandidate) {
                        onSwapSlotCandidate(
                            slotPickerTarget.itemId,
                            slotPickerTarget.nodeIndex,
                            candidate,
                        );
                    }
                    setSlotPickerTarget(null);
                }}
            />
        </div>
    );
}
