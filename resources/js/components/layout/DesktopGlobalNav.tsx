import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, LogOut, Package, Plus, ShoppingBag } from 'lucide-react';
import { Link, router, usePage } from '@inertiajs/react';
import type { ActingContextData } from '../mobile/types';
import type { ReadinessState, SliceSession } from '@/types';
import { PicksDrawer } from '../marketplace/PicksDrawer';
import { CreatorPostModal } from '../marketplace/CreatorPostModal';
import { CANONICAL_DEAL_CHAIN_RECIPES } from '@/marketplace/dealChainRecipes';
import type {
    BasketItem,
    PublishedDealChainRecipeId,
    SlotCandidateListing,
} from '@/marketplace/types';

interface DesktopGlobalNavProps {
    session?: SliceSession | null;
    readiness?: ReadinessState | null;
    actingContext?: ActingContextData;
    activeRoute?: string;
    picksCount?: number;
    onPicksClick?: () => void;
    onPostClick?: () => void;
    rightSlot?: ReactNode;
}

export function DesktopGlobalNav({
    session,
    readiness,
    actingContext,
    activeRoute = 'browse',
    picksCount,
    onPicksClick,
    onPostClick,
    rightSlot,
}: DesktopGlobalNavProps) {
    const [creatorModalOpen, setCreatorModalOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);
    const [basket, setBasket] = useState<BasketItem[]>([]);
    // Fallback to Inertia page props if explicit props are not passed
    interface NavInertiaProps extends Record<string, unknown> {
        session?: SliceSession | null;
        readiness?: ReadinessState | null;
        slice?: {
            session?: SliceSession | null;
            readiness?: ReadinessState | null;
        };
    }

    let pageProps: NavInertiaProps = {};
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const page = typeof usePage === 'function' ? usePage<NavInertiaProps>() : null;
        pageProps = page?.props || {};
    } catch {
        pageProps = {};
    }
    const effectiveSession =
        session !== undefined ? session : (pageProps.session ?? pageProps.slice?.session ?? null);

    const effectiveReadiness =
        readiness !== undefined
            ? readiness
            : (pageProps.readiness ?? pageProps.slice?.readiness ?? null);

    const authenticated = Boolean(
        effectiveSession?.authenticated ??
        effectiveSession?.isAuthenticated ??
        effectiveSession?.userId,
    );

    const displayName =
        effectiveReadiness?.displayName ??
        effectiveReadiness?.display_name ??
        effectiveSession?.displayName ??
        effectiveSession?.display_name ??
        effectiveSession?.phone ??
        'Citizen';

    const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

    // Live picks count synchronized via storage and custom events
    const [localPicksCount, setLocalPicksCount] = useState<number>(picksCount ?? 0);

    useEffect(() => {
        const readStoragePicks = () => {
            try {
                const stored = localStorage.getItem('serbizyu.picks');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        setBasket(parsed);
                        if (typeof picksCount !== 'number') {
                            setLocalPicksCount(
                                parsed.reduce(
                                    (sum: number, item: { quantity?: number }) =>
                                        sum + (item.quantity || 1),
                                    0,
                                ),
                            );
                        }
                        return;
                    }
                }
                setBasket([]);
                if (typeof picksCount !== 'number') {
                    setLocalPicksCount(0);
                }
            } catch {
                setBasket([]);
                if (typeof picksCount !== 'number') {
                    setLocalPicksCount(0);
                }
            }
        };

        if (typeof picksCount === 'number') {
            setLocalPicksCount(picksCount);
        } else {
            readStoragePicks();
        }
        window.addEventListener('storage', readStoragePicks);
        window.addEventListener('serbizyu:picks-updated', readStoragePicks);

        return () => {
            window.removeEventListener('storage', readStoragePicks);
            window.removeEventListener('serbizyu:picks-updated', readStoragePicks);
        };
    }, [picksCount]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        setDropdownOpen(false);
        router.post('/auth/logout', {}, { preserveScroll: false });
    };

    const saveBasket = (newBasket: BasketItem[]) => {
        setBasket(newBasket);
        try {
            localStorage.setItem('serbizyu.picks', JSON.stringify(newBasket));
            window.dispatchEvent(new Event('serbizyu:picks-updated'));
        } catch {
            // ignore
        }
    };

    const handleUpdateQuantity = (id: string, delta: number) => {
        const next = basket
            .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
            .filter((item) => item.quantity > 0);
        saveBasket(next);
    };

    const handleRemoveItem = (id: string) => {
        const next = basket.filter((item) => item.id !== id);
        saveBasket(next);
    };

    const handleAttachDealChain = (itemId: string, recipeId: PublishedDealChainRecipeId | null) => {
        const recipe = recipeId ? CANONICAL_DEAL_CHAIN_RECIPES[recipeId] : null;
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

    const handleCheckout = () => {
        setInternalDrawerOpen(false);
        const itemsWithDealChain = basket.filter((item) => Boolean(item.dealChain));
        if (itemsWithDealChain.length > 0) {
            router.visit('/picks');
        } else if (basket.length > 0) {
            router.visit(`/listings/${basket[0].id}/book`);
        }
    };

    const handlePicksToggle = () => {
        if (onPicksClick) {
            onPicksClick();
        } else {
            setInternalDrawerOpen((prev) => !prev);
        }
    };

    const handlePostClick = () => {
        if (onPostClick) {
            onPostClick();
        } else {
            setCreatorModalOpen(true);
        }
    };

    return (
        <>
            <header className="sticky top-0 z-50 hidden h-16 w-full border-b border-slate-200 bg-white/95 backdrop-blur transition-all lg:flex">
                <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-6">
                    {/* Brand & Nav Links */}
                    <div className="flex items-center gap-8">
                        <a href="/" className="text-decoration-none flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F2F58] font-bold text-white shadow-sm">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                >
                                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                    <path d="M2 17l10 5 10-5" />
                                    <path d="M2 12l10 5 10-5" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base font-[var(--sz-font-display)] font-extrabold tracking-tight text-[#0F2F58]">
                                    SERBIZYU
                                </span>
                                <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                                    Tagudin Market
                                </span>
                            </div>
                        </a>

                        {/* Navigation Links */}
                        <nav className="flex items-center gap-1">
                            <a
                                href="/browse"
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                    activeRoute === 'browse'
                                        ? 'bg-[#EBF2FA] text-[#0F2F58]'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                Browse Marketplace
                            </a>
                            <a
                                href="/orders"
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                    activeRoute === 'orders'
                                        ? 'bg-[#EBF2FA] text-[#0F2F58]'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                Orders
                            </a>
                            <a
                                href="/my-listings"
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                    activeRoute === 'listings'
                                        ? 'bg-[#EBF2FA] text-[#0F2F58]'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                My Listings
                            </a>
                        </nav>
                    </div>

                    {/* Right Area: Location + Context + Profile */}
                    <div className="flex items-center gap-3">
                        {/* Picks Cart Button */}
                        {/* Unified Create / Post CTA */}
                        <button
                            type="button"
                            onClick={handlePostClick}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-xs transition-all ${
                                activeRoute === 'requests' || activeRoute === 'create_listing'
                                    ? 'bg-[#0F2F58] text-white ring-2 ring-[#0F2F58]/20'
                                    : 'bg-[#0F2F58] text-white hover:bg-[#184277] active:scale-[0.98]'
                            }`}
                            aria-label="Post request or create listing"
                        >
                            <Plus className="size-3.5 stroke-[2.5]" />
                            <span>Post</span>
                        </button>

                        <button
                            type="button"
                            onClick={handlePicksToggle}
                            className="relative flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-[#0F2F58] shadow-xs transition-colors hover:bg-slate-50"
                            aria-label="View citizen picks"
                        >
                            <ShoppingBag className="size-4 text-[#0F2F58]" />
                            <span>Picks</span>
                            {localPicksCount > 0 && (
                                <span className="flex size-5 items-center justify-center rounded-full bg-[#0F2F58] text-[10px] font-extrabold text-white">
                                    {localPicksCount}
                                </span>
                            )}
                        </button>

                        {/* Acting-for Badge (if active) */}
                        {actingContext?.isActingOnBehalf && (
                            <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#92400E]">
                                <span>👤 Acting for: {actingContext.ownerName}</span>
                                <span className="cursor-pointer text-[10px] underline">
                                    Switch ▾
                                </span>
                            </div>
                        )}

                        {rightSlot}

                        {/* Dynamic Auth Section */}
                        {authenticated ? (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setDropdownOpen((prev) => !prev)}
                                    className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-2.5 transition-all hover:border-slate-300 hover:bg-slate-50"
                                    aria-expanded={dropdownOpen}
                                    aria-label="User account menu"
                                >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F2F58] text-xs font-bold text-white shadow-xs">
                                        {initial}
                                    </div>
                                    <span className="max-w-[120px] truncate text-xs font-bold text-slate-800">
                                        {displayName}
                                    </span>
                                    <ChevronDown className="size-3 text-slate-400" />
                                </button>

                                {/* Dropdown Menu */}
                                {dropdownOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 animate-in rounded-2xl border border-slate-200 bg-white p-2 shadow-xl duration-100 zoom-in-95 fade-in">
                                        <div className="border-b border-slate-100 px-3 py-2">
                                            <p className="truncate text-xs font-bold text-slate-900">
                                                {displayName}
                                            </p>
                                            <p className="mt-0.5 text-[11px] font-medium text-emerald-600">
                                                {effectiveReadiness?.ready
                                                    ? '✓ Verified Provider'
                                                    : '✓ Verified Citizen'}
                                            </p>
                                        </div>

                                        <div className="py-1">
                                            <a
                                                href="/my-listings"
                                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#EBF2FA] hover:text-[#0F2F58]"
                                            >
                                                <Package className="size-3.5 text-slate-400" />
                                                <span>My Listings</span>
                                            </a>
                                            <a
                                                href="/orders"
                                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#EBF2FA] hover:text-[#0F2F58]"
                                            >
                                                <ShoppingBag className="size-3.5 text-slate-400" />
                                                <span>My Orders</span>
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDropdownOpen(false);
                                                    handlePostClick();
                                                }}
                                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#EBF2FA] hover:text-[#0F2F58]"
                                            >
                                                <Plus className="size-3.5 text-slate-400" />
                                                <span>Post or Create</span>
                                            </button>
                                        </div>

                                        <div className="border-t border-slate-100 pt-1">
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                            >
                                                <LogOut className="size-3.5" />
                                                <span>Log Out</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/auth/sign-in"
                                    className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-[#0F2F58] shadow-xs transition-colors hover:bg-slate-50"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="rounded-full bg-[#0F2F58] px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#184277]"
                                >
                                    Join
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {!onPicksClick && (
                <PicksDrawer
                    open={internalDrawerOpen}
                    onClose={() => setInternalDrawerOpen(false)}
                    items={basket}
                    recipes={Object.values(CANONICAL_DEAL_CHAIN_RECIPES)}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onCheckout={handleCheckout}
                    onAttachDealChain={handleAttachDealChain}
                    onSwapSlotCandidate={handleSwapSlotCandidate}
                />
            )}
            {/* Unified Creator Post Modal for Desktop */}
            <CreatorPostModal open={creatorModalOpen} onClose={() => setCreatorModalOpen(false)} />
        </>
    );
}
