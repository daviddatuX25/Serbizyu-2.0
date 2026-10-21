import { useEffect, useMemo, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    ShoppingBag,
    ArrowLeft,
    Plus,
    Minus,
    Trash2,
    ArrowRight,
    Link as LinkIcon,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import type { HomeProps } from '../types';
import { DesktopGlobalNav } from '../components/layout/DesktopGlobalNav';
import { DealChainCheckoutModal } from '../components/marketplace/DealChainCheckoutModal';
import { BundleChainModal } from '../components/marketplace/BundleChainModal';
import { SlotListingPickerModal } from '../components/marketplace/SlotListingPickerModal';
import { indexDealChainRecipes } from '../marketplace/dealChainRecipes';
import type { DealChainRecipeDefinition } from '../marketplace/dealChainRecipes';
import type {
    BasketItem,
    PublishedDealChainRecipeId,
    SlotCandidateListing,
} from '../marketplace/types';

export default function Picks(props: HomeProps) {
    const dealChainRecipes = useMemo(
        () =>
            indexDealChainRecipes(
                props.dealChainCatalog as DealChainRecipeDefinition[] | undefined,
            ),
        [props.dealChainCatalog],
    );
    const [basket, setBasket] = useState<BasketItem[]>([]);
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [slotPickerTarget, setSlotPickerTarget] = useState<{
        itemId: string;
        nodeIndex: number;
        role: string;
        currentListingId?: string;
    } | null>(null);
    const [chainModalItem, setChainModalItem] = useState<BasketItem | null>(null);
    const [expandedSlotItemIds, setExpandedSlotItemIds] = useState<string[]>([]);
    useEffect(() => {
        const syncBasket = () => {
            try {
                const stored = localStorage.getItem('serbizyu.picks');
                if (stored) {
                    setBasket(JSON.parse(stored));
                } else {
                    setBasket([]);
                }
            } catch {
                // ignore
            }
        };

        syncBasket();
        window.addEventListener('storage', syncBasket);
        window.addEventListener('serbizyu:picks-updated', syncBasket);

        return () => {
            window.removeEventListener('storage', syncBasket);
            window.removeEventListener('serbizyu:picks-updated', syncBasket);
        };
    }, []);

    const saveBasket = (newBasket: BasketItem[]) => {
        setBasket(newBasket);
        try {
            localStorage.setItem('serbizyu.picks', JSON.stringify(newBasket));
            window.dispatchEvent(new Event('serbizyu:picks-updated'));
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

    const handleAttachDealChain = (itemId: string, recipeId: PublishedDealChainRecipeId | null) => {
        const recipe = recipeId ? dealChainRecipes[recipeId] : null;
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
    const itemsWithDealChain = basket.filter((item) => Boolean(item.dealChain));
    const hasDealChain = itemsWithDealChain.length > 0;
    const isSingleProduct = basket.length === 1 && basket[0].listing_type === 'product';
    const isSingleService = basket.length === 1 && basket[0].listing_type !== 'product';

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

    const handleProceedToCheckout = () => {
        if (hasDealChain) {
            setCheckoutModalOpen(true);
        } else if (basket.length > 0) {
            // Direct ordinary booking -> forms order proposal
            router.visit(`/listings/${basket[0].id}/book`);
        }
    };

    const handleSwapSlotCandidate = (
        itemId: string,
        nodeIndex: number,
        candidate: SlotCandidateListing,
    ) => {
        const next = basket.map((item) => {
            if (item.id !== itemId || !item.dealChain) return item;
            const updatedNodes = [...item.dealChain.nodes];
            const oldNode = updatedNodes[nodeIndex];
            const oldPrice = oldNode.priceMinor ?? (oldNode.type === 'store' ? 18000 : 8000);
            const newPrice = candidate.price_minor;
            const priceDiff = (newPrice - oldPrice) / 100;

            updatedNodes[nodeIndex] = {
                ...oldNode,
                id: candidate.id,
                title: candidate.title,
                sub: candidate.provider_name,
                listingId: candidate.id,
                providerId: candidate.provider_user_id,
                priceMinor: candidate.price_minor,
            };

            return {
                ...item,
                price: item.price + priceDiff,
                dealChain: {
                    ...item.dealChain,
                    extraFee: Math.max(0, item.dealChain.extraFee + priceDiff),
                    nodes: updatedNodes,
                },
            };
        });
        saveBasket(next);
    };

    const handleAuthorizeDealChain = () => {
        setCheckoutModalOpen(false);
        router.post(
            '/deal-chains/authorize',
            {
                items: basket.map((b) => ({
                    id: b.id,
                    quantity: b.quantity,
                    deal_chain: b.dealChain?.recipeId || null,
                    slot_overrides: b.dealChain?.nodes
                        ? Object.fromEntries(
                              b.dealChain.nodes
                                  .filter((n) => n.listingId)
                                  .map((n) => [
                                      n.type,
                                      {
                                          listing_id: n.listingId,
                                          provider_user_id: n.providerId,
                                          price_minor: n.priceMinor,
                                      },
                                  ]),
                          )
                        : null,
                })),
            },
            {
                onSuccess: () => {
                    saveBasket([]);
                },
            },
        );
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
            <DesktopGlobalNav
                session={props.session}
                readiness={props.readiness}
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
                <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#0F2F58]">
                    <ShoppingBag className="size-4" />
                    <span>Citizen Picks ({totalCount})</span>
                </div>
                <button
                    type="button"
                    onClick={() => saveBasket([])}
                    className="cursor-pointer text-xs font-bold text-slate-500 hover:text-red-600"
                >
                    Clear
                </button>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
                {/* Desktop Breadcrumbs */}
                <div className="mb-6 hidden items-center gap-2 text-xs font-semibold text-slate-500 lg:flex">
                    <Link href="/browse" className="flex items-center gap-1 hover:text-[#0F2F58]">
                        <ArrowLeft className="size-3.5" />
                        <span>Back to active listings</span>
                    </Link>
                    <span>/</span>
                    <span className="font-bold text-slate-900">
                        Citizen Picks &amp; Deal Chain Tray
                    </span>
                </div>

                {basket.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center shadow-xs">
                        <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <ShoppingBag className="size-8" />
                        </div>
                        <h2 className="mt-4 text-base font-extrabold text-[#0F2F58]">
                            Your Picks Tray is Empty
                        </h2>
                        <p className="mt-1 max-w-sm text-xs text-slate-500">
                            Explore verified Tagudin marketplace listings, attach partner deal
                            chains, and stage items in your tray.
                        </p>
                        <Link
                            href="/browse"
                            className="mt-6 rounded-full bg-[#0F2F58] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#153e74]"
                        >
                            Explore Marketplace
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                        {/* LEFT COLUMN (60%): Staged Items with Deal Chain Buttons & Breakdown */}
                        <div className="flex flex-col gap-6 lg:col-span-7">
                            {/* Staged Items Card */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                                    <h2 className="text-sm font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                        Staged Offerings ({totalCount})
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => saveBasket([])}
                                        className="cursor-pointer text-xs font-bold text-slate-400 hover:text-red-600"
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
                                                    <h3 className="text-sm font-extrabold text-slate-900">
                                                        {item.title}
                                                    </h3>
                                                    <div className="mt-0.5 text-xs text-slate-500">
                                                        Verified Tagudin offering
                                                    </div>
                                                    <div className="mt-1 font-mono text-sm font-extrabold text-[#0F2F58]">
                                                        ₱{item.price.toFixed(2)}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateQuantity(item.id, -1)
                                                            }
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
                                                            onClick={() =>
                                                                updateQuantity(item.id, 1)
                                                            }
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
                                                <div className="mt-1 flex flex-col gap-2 rounded-xl border border-[#0F2F58]/20 bg-[#F0F4F8] p-3">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 font-extrabold text-[#0F2F58]">
                                                            <LinkIcon className="size-3.5" />
                                                            <span>{item.dealChain.title}</span>
                                                            <span className="rounded-full bg-[#EBF2FA] px-2 py-0.5 text-[10px] font-extrabold text-[#0F2F58]">
                                                                {item.dealChain.nodes.length} Bound
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
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
                                                                className="flex cursor-pointer items-center gap-1 text-xs font-extrabold text-[#0F2F58] hover:underline"
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
                                                                    handleAttachDealChain(
                                                                        item.id,
                                                                        null,
                                                                    )
                                                                }
                                                                className="cursor-pointer text-xs font-bold text-slate-400 hover:text-red-600"
                                                            >
                                                                Unlink
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Compact Node-Wire Pipeline */}
                                                    <div className="flex [scrollbar-width:none] items-center gap-1.5 overflow-x-auto py-1">
                                                        {item.dealChain.nodes.map((node, nIdx) => (
                                                            <div
                                                                key={nIdx}
                                                                className="flex shrink-0 items-center gap-1.5"
                                                            >
                                                                <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-extrabold text-slate-800 shadow-xs">
                                                                    <span className="py-0.2 rounded-xs bg-amber-100 px-1 text-[8px] font-bold text-amber-800 uppercase">
                                                                        {node.role}
                                                                    </span>
                                                                    <span>{node.title}</span>
                                                                </div>
                                                                {nIdx <
                                                                    item.dealChain!.nodes.length -
                                                                        1 && (
                                                                    <div className="flex items-center px-0.5 text-xs font-bold text-slate-400">
                                                                        <span>→</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Detailed Slots Breakdown (Toggleable) */}
                                                    {expandedSlotItemIds.includes(item.id) && (
                                                        <div className="mt-1 flex flex-col gap-1.5 border-t border-slate-200 pt-2.5">
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
                                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-[#0F2F58] bg-[#F0F4F8] px-3 py-1.5 text-xs font-bold text-[#0F2F58] transition-colors hover:bg-[#E2E8F0]"
                                                    >
                                                        <LinkIcon className="size-3.5" />
                                                        <span>+ Attach Deal Chain Partner...</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN (40%): Sticky Checkout Card */}
                        <div className="sticky top-24 lg:col-span-5">
                            <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
                                <div className="border-b border-slate-100 pb-4">
                                    <div className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                                        Deal Chain Plan Summary
                                    </div>
                                    <div className="mt-1 font-mono text-2xl font-extrabold text-[#0F2F58]">
                                        ₱{subtotal.toFixed(2)}
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between font-medium text-slate-600">
                                        <span>
                                            Picks Subtotal ({totalCount}{' '}
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
                                    onClick={handleProceedToCheckout}
                                    className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#FFC72C] text-xs font-extrabold tracking-wide text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-98"
                                >
                                    <span>{ctaLabel}</span>
                                    <ArrowRight className="size-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bundle & Chain Services Modal */}
            <BundleChainModal
                open={Boolean(chainModalItem)}
                onClose={() => setChainModalItem(null)}
                item={chainModalItem}
                recipes={Object.values(dealChainRecipes)}
                onSelectRecipe={(itemId, recipeId) => {
                    handleAttachDealChain(itemId, recipeId);
                }}
            />

            {/* Deal Chain planning modal */}
            <DealChainCheckoutModal
                open={checkoutModalOpen}
                onClose={() => setCheckoutModalOpen(false)}
                items={basket}
                totalAmount={subtotal}
                onAuthorize={handleAuthorizeDealChain}
            />

            {/* Slot Listing Picker Modal */}
            <SlotListingPickerModal
                open={Boolean(slotPickerTarget)}
                onClose={() => setSlotPickerTarget(null)}
                role={slotPickerTarget?.role || 'STORE'}
                currentListingId={slotPickerTarget?.currentListingId}
                onSelectCandidate={(candidate) => {
                    if (slotPickerTarget) {
                        handleSwapSlotCandidate(
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
