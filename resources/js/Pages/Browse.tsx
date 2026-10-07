import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    ArrowUpDown,
    Bell,
    Check,
    ChevronDown,
    Clock,
    Grid,
    Heart,
    List,
    MapPin,
    RotateCcw,
    Search,
    ShieldCheck,
    ShoppingBag,
    SlidersHorizontal,
    Star,
    Sparkles,
    Video,
    X,
} from 'lucide-react';
import {
    DEFAULT_TAGUDIN_COORDINATES,
    TAGUDIN_BARANGAYS_43,
    calculateDistanceKm,
    formatListingLocation,
    resolveListingCoordinates,
} from '../lib/philippineAddresses';
import type { HomeProps, ListingRecord } from '../types';
import { DesktopGlobalNav } from '../components/layout/DesktopGlobalNav';
import { MarketplaceCard } from '../marketplace/components/MarketplaceCard';
import { BottomNavBar, type NavTabId } from '../marketplace/components/BottomNavBar';
import type {
    BasketItem,
    MarketplaceCategory,
    PublishedDealChainRecipeId,
    SlotCandidateListing,
} from '../marketplace/types';
import { PicksDrawer } from '../components/marketplace/PicksDrawer';
import { DealChainCheckoutModal } from '../components/marketplace/DealChainCheckoutModal';
import { indexDealChainRecipes } from '../marketplace/dealChainRecipes';
import type { DealChainRecipeDefinition } from '../marketplace/dealChainRecipes';
import GlovoWaveModal from '../components/mobile/GlovoWaveModal';
import { CreatorPostModal } from '../components/marketplace/CreatorPostModal';
import { QuickDealScanModal } from '../components/marketplace/QuickDealScanModal';

// Curated Category Definitions
const MARKETPLACE_CATEGORIES: (MarketplaceCategory & { icon: string; description: string })[] = [
    {
        code: 'all',
        label: 'All Services & Goods',
        icon: '🏷️',
        description: 'Complete Tagudin marketplace offerings',
    },
    {
        code: 'repairs',
        label: 'Repairs & AC',
        icon: '🔧',
        description: 'Aircon cleaning, electrical, plumbing & appliance care',
    },
    {
        code: 'home-cleaning',
        label: 'Cleaning & Help',
        icon: '🧹',
        description: 'House cleaning, laundry, errand runs',
    },
    {
        code: 'courier',
        label: 'Courier & Padala',
        icon: '📦',
        description: 'Same-day parcel pickup & delivery in Tagudin',
    },
    {
        code: 'local-food',
        label: 'Local Food & Bakery',
        icon: '🍞',
        description: 'Bibingka, fresh pastries, native kakanin',
    },
    {
        code: 'print-assist',
        label: 'Print & Soft-Copy',
        icon: '🖨️',
        description: 'Document printing, photocopy, scanning',
    },
    {
        code: 'greeting-cards',
        label: 'Cards & Crafts',
        icon: '🎨',
        description: 'Handmade crafts, personalized cards & gifts',
    },
];

// Curated Category Images for High-Craft Visuals
const CATEGORY_IMAGES: Record<string, string> = {
    repairs: '/photos/ac-clean.jpg',
    'home-cleaning': '/photos/req-electrician.jpg',
    courier: '/photos/courier.jpg',
    'local-food': '/photos/bibingka.jpg',
    'print-assist': '/photos/greeting.jpg',
    'greeting-cards': '/photos/greeting.jpg',
    'local-services': '/photos/ac-clean.jpg',
    default: '/photos/ac-clean.jpg',
};

function getCategoryPhoto(categoryCode?: string | null): string {
    const code = (categoryCode || 'default').toLowerCase();
    return CATEGORY_IMAGES[code] || CATEGORY_IMAGES.default;
}

function getPriceDisplay(listing: ListingRecord): string {
    const rawMinor = listing.price_amount_minor;
    if (typeof rawMinor === 'number' && Number.isFinite(rawMinor)) {
        return `₱${(rawMinor / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return '₱80.00';
}
type PriceRange = 'all' | 'under_150' | '150_300' | '300_plus';
type SortOption = 'recommended' | 'nearest' | 'price_asc' | 'price_desc' | 'rating';

function getPriceRaw(listing: ListingRecord): number {
    const rawMinor = listing.price_amount_minor;
    return typeof rawMinor === 'number' && Number.isFinite(rawMinor) ? rawMinor / 100 : 80;
}
export default function Browse(props: HomeProps) {
    const rawListings: ListingRecord[] = useMemo(() => {
        if (Array.isArray(props.publicListings)) return props.publicListings;
        if (Array.isArray(props.listings)) return props.listings;
        return [];
    }, [props.publicListings, props.listings]);
    const dealChainRecipes = useMemo(
        () =>
            indexDealChainRecipes(
                props.dealChainCatalog as DealChainRecipeDefinition[] | undefined,
            ),
        [props.dealChainCatalog],
    );

    // Search and Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'service' | 'product'>(
        'all',
    );
    const [selectedBarangay, setSelectedBarangay] = useState<string>('all');
    const [priceRangeFilter, setPriceRangeFilter] = useState<PriceRange>('all');
    const [topRatedOnly, setTopRatedOnly] = useState(false);
    const [verifiedProOnly, setVerifiedProOnly] = useState(false);
    const [availableTodayOnly, setAvailableTodayOnly] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('recommended');
    const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
    const [marketplaceTab, setMarketplaceTab] = useState<'listings' | 'requests'>('listings');
    const communityRequests = useMemo(
        () => props.communityRequests || [],
        [props.communityRequests],
    );
    type ActiveMobileModal = 'category' | 'type' | 'location' | 'price' | 'trust' | 'sort' | null;
    const [activeMobileModal, setActiveMobileModal] = useState<ActiveMobileModal>(null);
    const [searchFocused, setSearchFocused] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [picksOpen, setPicksOpen] = useState(false);
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [creatorOpen, setCreatorOpen] = useState(false);
    const [quickDealOpen, setQuickDealOpen] = useState(false);
    const [basket, setBasket] = useState<BasketItem[]>([]);
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);
    const [mobileActiveTab, setMobileActiveTab] = useState<NavTabId>('explore');
    const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

    const authenticated = Boolean(
        props.session?.authenticated ?? props.session?.isAuthenticated ?? props.session?.userId,
    );

    const userDisplayName =
        props.readiness?.displayName ??
        props.readiness?.display_name ??
        props.session?.displayName ??
        props.session?.display_name ??
        props.session?.phone ??
        'Citizen';

    const userInitial = userDisplayName ? userDisplayName.charAt(0).toUpperCase() : 'U';

    // Load pins and picks from localStorage on mount & synchronize across tabs and navigations
    useEffect(() => {
        try {
            const stored = localStorage.getItem('serbizyu.browse.pins');
            if (stored) {
                setPinnedIds(JSON.parse(stored));
            }
        } catch {
            // ignore
        }

        const syncPicks = () => {
            try {
                const storedPicks = localStorage.getItem('serbizyu.picks');
                if (storedPicks) {
                    setBasket(JSON.parse(storedPicks));
                } else {
                    setBasket([]);
                }
            } catch {
                // ignore
            }
        };

        syncPicks();
        window.addEventListener('storage', syncPicks);
        window.addEventListener('serbizyu:picks-updated', syncPicks);

        return () => {
            window.removeEventListener('storage', syncPicks);
            window.removeEventListener('serbizyu:picks-updated', syncPicks);
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

    const togglePin = (id: string) => {
        setPinnedIds((prev) => {
            const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
            try {
                localStorage.setItem('serbizyu.browse.pins', JSON.stringify(next));
            } catch {
                // ignore
            }
            return next;
        });
    };

    const basketTotal = useMemo(() => {
        return basket.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [basket]);
    const handleAttachDealChain = (itemId: string, recipeId: PublishedDealChainRecipeId | null) => {
        const recipe = recipeId ? dealChainRecipes[recipeId] : null;
        const updated = basket.map((item) => {
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
        saveBasket(updated);
    };
    const handleSwapSlotCandidate = (
        itemId: string,
        nodeIndex: number,
        candidate: SlotCandidateListing,
    ) => {
        setBasket((prev) => {
            const next = prev.map((item) => {
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
            return next;
        });
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

    const resetAllFilters = () => {
        setSearchQuery('');
        setSelectedCategory('all');
        setListingTypeFilter('all');
        setSelectedBarangay('all');
        setPriceRangeFilter('all');
        setTopRatedOnly(false);
        setVerifiedProOnly(false);
        setAvailableTodayOnly(false);
    };

    const hasActiveFilters =
        searchQuery.trim() !== '' ||
        selectedCategory !== 'all' ||
        listingTypeFilter !== 'all' ||
        selectedBarangay !== 'all' ||
        priceRangeFilter !== 'all' ||
        topRatedOnly ||
        verifiedProOnly ||
        availableTodayOnly;

    // Barangay Options & Counts
    const barangayOptions = useMemo(() => {
        const counts: Record<string, number> = {};
        rawListings.forEach((item) => {
            const geo = item.geography as Record<string, unknown> | null | undefined;
            const bName =
                (typeof geo?.barangay_name === 'string' && geo.barangay_name.trim()) ||
                TAGUDIN_BARANGAYS_43.find((b) =>
                    [item.area, item.locality, item.stall_location]
                        .filter(Boolean)
                        .some((field) =>
                            String(field).toLowerCase().includes(b.name.toLowerCase()),
                        ),
                )?.name ||
                null;
            if (bName) {
                counts[bName] = (counts[bName] || 0) + 1;
            }
        });

        return TAGUDIN_BARANGAYS_43.map((b) => ({
            name: b.name,
            code: b.code,
            count: counts[b.name] || 0,
        })).sort((a, b) => {
            if (a.count > 0 && b.count === 0) return -1;
            if (b.count > 0 && a.count === 0) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [rawListings]);

    // Filter and Sort Pipeline
    const filteredListings = useMemo(() => {
        return rawListings
            .map((item) => {
                const coords = resolveListingCoordinates(item);
                const distance_km = coords
                    ? calculateDistanceKm(
                          DEFAULT_TAGUDIN_COORDINATES.lat,
                          DEFAULT_TAGUDIN_COORDINATES.lng,
                          coords.lat,
                          coords.lng,
                      )
                    : null;
                return {
                    ...item,
                    distance_km,
                };
            })
            .filter((item) => {
                // 1. Search Query Match
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const titleMatch = item.title.toLowerCase().includes(q);
                    const descMatch = (item.description || '').toLowerCase().includes(q);
                    const areaMatch = (item.area || item.locality || '').toLowerCase().includes(q);
                    const stallMatch = (item.stall_location || '').toLowerCase().includes(q);
                    const geo = item.geography as Record<string, unknown> | null | undefined;
                    const bMatch = (typeof geo?.barangay_name === 'string' ? geo.barangay_name : '')
                        .toLowerCase()
                        .includes(q);
                    const catMatch = (item.category_code || item.categoryCode || '')
                        .toLowerCase()
                        .includes(q);
                    if (
                        !titleMatch &&
                        !descMatch &&
                        !areaMatch &&
                        !stallMatch &&
                        !bMatch &&
                        !catMatch
                    ) {
                        return false;
                    }
                }

                // 2. Category Match
                if (selectedCategory !== 'all') {
                    const cat = (item.category_code || item.categoryCode || '').toLowerCase();
                    if (cat !== selectedCategory.toLowerCase()) {
                        return false;
                    }
                }

                // 3. Listing Type Match (service vs product)
                if (listingTypeFilter !== 'all') {
                    const type = (item.listing_type || item.listingType || 'service').toLowerCase();
                    if (type !== listingTypeFilter) {
                        return false;
                    }
                }

                // 4. Barangay Location Match
                if (selectedBarangay !== 'all') {
                    const target = selectedBarangay.toLowerCase();
                    const geo = item.geography as Record<string, unknown> | null | undefined;
                    const bName = (
                        typeof geo?.barangay_name === 'string' ? geo.barangay_name : ''
                    ).toLowerCase();
                    const stall = (item.stall_location || '').toLowerCase();
                    const area = (item.area || item.locality || '').toLowerCase();
                    if (
                        !bName.includes(target) &&
                        !stall.includes(target) &&
                        !area.includes(target)
                    ) {
                        return false;
                    }
                }

                // 5. Price Budget Match
                if (priceRangeFilter !== 'all') {
                    const price = getPriceRaw(item);
                    if (priceRangeFilter === 'under_150' && price > 150) return false;
                    if (priceRangeFilter === '150_300' && (price < 150 || price > 300))
                        return false;
                    if (priceRangeFilter === '300_plus' && price < 300) return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'nearest') {
                    const distA = a.distance_km ?? 999;
                    const distB = b.distance_km ?? 999;
                    return distA - distB;
                }
                if (sortBy === 'price_asc') {
                    return getPriceRaw(a) - getPriceRaw(b);
                }
                if (sortBy === 'price_desc') {
                    return getPriceRaw(b) - getPriceRaw(a);
                }
                if (sortBy === 'rating') {
                    return b.title.localeCompare(a.title);
                }
                return 0; // recommended / default ordering
            });
    }, [
        rawListings,
        searchQuery,
        selectedCategory,
        listingTypeFilter,
        selectedBarangay,
        priceRangeFilter,
        sortBy,
    ]);

    const filteredRequests = useMemo(() => {
        return communityRequests.filter((req) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const titleMatch = req.title.toLowerCase().includes(q);
                const descMatch = (req.description || '').toLowerCase().includes(q);
                const areaMatch = (req.area || '').toLowerCase().includes(q);
                if (!titleMatch && !descMatch && !areaMatch) {
                    return false;
                }
            }
            if (selectedBarangay !== 'all') {
                const target = selectedBarangay.toLowerCase();
                const area = (req.area || '').toLowerCase();
                const b = (
                    ((req as Record<string, unknown>).barangay as string) || ''
                ).toLowerCase();
                if (!area.includes(target) && !b.includes(target)) {
                    return false;
                }
            }
            return true;
        });
    }, [communityRequests, searchQuery, selectedBarangay]);

    // Category Counts Map
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: rawListings.length };
        rawListings.forEach((item) => {
            const code = (item.category_code || item.categoryCode || 'other').toLowerCase();
            counts[code] = (counts[code] || 0) + 1;
        });
        return counts;
    }, [rawListings]);

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
            {/* =========================================================================
                DESKTOP SHELL (Visible on Desktop lg:, Hidden on Mobile)
                ========================================================================= */}
            <div className="hidden lg:block">
                {/* 1. Global Navigation Bar */}
                <DesktopGlobalNav
                    session={props.session}
                    readiness={props.readiness}
                    activeRoute="browse"
                    picksCount={basket.reduce((sum, item) => sum + item.quantity, 0)}
                    onPicksClick={() => setPicksOpen((prev) => !prev)}
                    actingContext={{
                        actorUserId: props.session?.userId || 'usr_guest',
                        ownerUserId: 'usr_guest',
                        ownerName: props.session?.displayName || 'Tagudin Resident',
                        consentGrantId: 'cg_public',
                        isActingOnBehalf: false,
                    }}
                />

                {/* 2. Main Discovery 2-Column Layout */}
                <main className="mx-auto max-w-7xl px-6 py-8">
                    <div className="grid grid-cols-12 items-start gap-8">
                        {/* =========================================================================
                            LEFT COLUMN (270px width): INDEPENDENTLY SCROLLABLE INLINE FILTER CONTROLS
                            ========================================================================= */}
                        <aside className="sticky top-20 col-span-3 max-h-[calc(100vh-6rem)] [scrollbar-width:thin] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="size-4 text-[#0F2F58]" />
                                    <span className="text-sm font-extrabold text-[#0F2F58]">
                                        Filters
                                    </span>
                                </div>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={resetAllFilters}
                                        className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900"
                                    >
                                        <RotateCcw className="size-3" />
                                        <span>Reset</span>
                                    </button>
                                )}
                            </div>

                            {/* Search Input in Sidebar */}
                            <div className="relative mt-3">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search services or goods..."
                                    className="h-9 w-full rounded-lg border border-slate-300 bg-[#FAFCFB] pr-8 pl-9 text-xs font-semibold text-slate-900 transition-colors outline-none focus:border-[#0F2F58] focus:bg-white"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Section 1: Categories */}
                            <div className="mt-4 border-b border-slate-100 pb-4">
                                <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                                    Category
                                </label>
                                <div className="mt-2.5 flex flex-col gap-1">
                                    {MARKETPLACE_CATEGORIES.map((cat) => {
                                        const isSelected = selectedCategory === cat.code;
                                        const count = categoryCounts[cat.code] || 0;
                                        return (
                                            <button
                                                key={cat.code}
                                                type="button"
                                                onClick={() => setSelectedCategory(cat.code)}
                                                className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors ${
                                                    isSelected
                                                        ? 'bg-[#0F2F58] font-bold text-white'
                                                        : 'text-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                <span>{cat.label}</span>
                                                <span
                                                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                                                        isSelected
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-slate-100 text-slate-500'
                                                    }`}
                                                >
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section: Barangay / Location */}
                            <div className="mt-4 border-b border-slate-100 pb-4">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                                        <MapPin className="size-3 text-[#0F2F58]" />
                                        Barangay
                                    </label>
                                    {selectedBarangay !== 'all' && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedBarangay('all')}
                                            className="cursor-pointer text-[10px] font-bold text-amber-700 hover:underline"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <div className="mt-2">
                                    <select
                                        aria-label="Filter by Barangay"
                                        value={selectedBarangay}
                                        onChange={(e) => setSelectedBarangay(e.target.value)}
                                        className="w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0F2F58] focus:bg-white"
                                    >
                                        <option value="all">
                                            All Tagudin ({rawListings.length})
                                        </option>
                                        {barangayOptions.map((b) => (
                                            <option key={b.code} value={b.name}>
                                                {b.name} {b.count > 0 ? `(${b.count})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Section 2: Fulfillment / Listing Type */}
                            <div className="mt-4 border-b border-slate-100 pb-4">
                                <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                                    Listing Type
                                </label>
                                <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                                    {(['all', 'service', 'product'] as const).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setListingTypeFilter(t)}
                                            className={`cursor-pointer rounded-md py-1 text-[11px] font-bold capitalize transition-all ${
                                                listingTypeFilter === t
                                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section 3: Price Budget */}
                            <div className="mt-4 border-b border-slate-100 pb-4">
                                <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                                    Price Range
                                </label>
                                <div className="mt-2 flex flex-col gap-1.5">
                                    {[
                                        { id: 'all', label: 'All prices' },
                                        { id: 'under_150', label: 'Under ₱150' },
                                        { id: '150_300', label: '₱150 – ₱300' },
                                        { id: '300_plus', label: '₱300 & above' },
                                    ].map((opt) => (
                                        <label
                                            key={opt.id}
                                            className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
                                        >
                                            <input
                                                type="radio"
                                                name="priceFilter"
                                                checked={priceRangeFilter === opt.id}
                                                onChange={() =>
                                                    setPriceRangeFilter(opt.id as PriceRange)
                                                }
                                                className="size-3.5 accent-[#0F2F58]"
                                            />
                                            <span>{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Section 4: Trust & Assurance */}
                            <div className="mt-4">
                                <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                                    Trust &amp; Assurance
                                </label>
                                <div className="mt-2.5 flex flex-col gap-2">
                                    <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900">
                                        <input
                                            type="checkbox"
                                            checked={topRatedOnly}
                                            onChange={(e) => setTopRatedOnly(e.target.checked)}
                                            className="size-3.5 rounded accent-[#0F2F58]"
                                        />
                                        <span className="flex items-center gap-1">
                                            <Star className="size-3 fill-amber-500 text-amber-500" />
                                            Top Rated (4.8+)
                                        </span>
                                    </label>

                                    <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900">
                                        <input
                                            type="checkbox"
                                            checked={verifiedProOnly}
                                            onChange={(e) => setVerifiedProOnly(e.target.checked)}
                                            className="size-3.5 rounded accent-[#0F2F58]"
                                        />
                                        <span className="flex items-center gap-1">
                                            <ShieldCheck className="size-3.5 text-emerald-600" />
                                            Police Cleared Pro
                                        </span>
                                    </label>

                                    <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900">
                                        <input
                                            type="checkbox"
                                            checked={availableTodayOnly}
                                            onChange={(e) =>
                                                setAvailableTodayOnly(e.target.checked)
                                            }
                                            className="size-3.5 rounded accent-[#0F2F58]"
                                        />
                                        <span className="flex items-center gap-1">
                                            <Clock className="size-3.5 text-blue-600" />
                                            Available Today
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </aside>

                        {/* =========================================================================
                            RIGHT COLUMN: LISTINGS GRID & SORT CONTROLS
                            ========================================================================= */}
                        <section className="col-span-9 flex flex-col gap-6">
                            {/* Control Bar: Mode Tabs, Sort, Layout */}
                            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    {/* Marketplace Mode Switcher */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setMarketplaceTab('listings')}
                                            className={`flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                                                marketplaceTab === 'listings'
                                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            <span>🏷️ Services &amp; Goods</span>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                    marketplaceTab === 'listings'
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-slate-200 text-slate-700'
                                                }`}
                                            >
                                                {filteredListings.length}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setMarketplaceTab('requests')}
                                            className={`flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                                                marketplaceTab === 'requests'
                                                    ? 'bg-[#0D715F] text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            <span>📢 Requests</span>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                    marketplaceTab === 'requests'
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-slate-200 text-slate-700'
                                                }`}
                                            >
                                                {filteredRequests.length}
                                            </span>
                                        </button>
                                    </div>

                                    {/* Sort & Layout Controls */}
                                    <div className="flex items-center gap-3">
                                        {/* Sort By Dropdown */}
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                            <ArrowUpDown className="size-3.5 text-slate-400" />
                                            <span>Sort:</span>
                                            <select
                                                aria-label="Sort marketplace offerings"
                                                value={sortBy}
                                                onChange={(e) =>
                                                    setSortBy(e.target.value as SortOption)
                                                }
                                                className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:border-[#0F2F58]"
                                            >
                                                <option value="recommended">Recommended</option>
                                                <option value="nearest">Nearest</option>
                                                <option value="price_asc">
                                                    Price: Low to High
                                                </option>
                                                <option value="price_desc">
                                                    Price: High to Low
                                                </option>
                                                <option value="rating">Highest Rated</option>
                                            </select>
                                        </div>

                                        {/* View Segment (Grid vs List) */}
                                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setLayoutMode('grid')}
                                                className={`cursor-pointer rounded-md p-1.5 transition-colors ${
                                                    layoutMode === 'grid'
                                                        ? 'bg-white text-[#0F2F58] shadow-xs'
                                                        : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                                aria-label="Grid view"
                                            >
                                                <Grid className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLayoutMode('list')}
                                                className={`cursor-pointer rounded-md p-1.5 transition-colors ${
                                                    layoutMode === 'list'
                                                        ? 'bg-white text-[#0F2F58] shadow-xs'
                                                        : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                                aria-label="List view"
                                            >
                                                <List className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Active Filter Badges */}
                                {hasActiveFilters && (
                                    <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
                                        <span className="text-[11px] font-bold text-slate-400">
                                            Active filters:
                                        </span>
                                        {selectedCategory !== 'all' && (
                                            <span className="flex items-center gap-1 rounded-full bg-[#EBF2FA] px-2.5 py-0.5 text-[11px] font-bold text-[#0F2F58]">
                                                {
                                                    MARKETPLACE_CATEGORIES.find(
                                                        (c) => c.code === selectedCategory,
                                                    )?.label
                                                }
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedCategory('all')}
                                                    className="cursor-pointer hover:text-red-600"
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </span>
                                        )}
                                        {listingTypeFilter !== 'all' && (
                                            <span className="flex items-center gap-1 rounded-full bg-[#EBF2FA] px-2.5 py-0.5 text-[11px] font-bold text-[#0F2F58] capitalize">
                                                {listingTypeFilter}
                                                <button
                                                    type="button"
                                                    onClick={() => setListingTypeFilter('all')}
                                                    className="cursor-pointer hover:text-red-600"
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </span>
                                        )}
                                        {selectedBarangay !== 'all' && (
                                            <span className="flex items-center gap-1 rounded-full bg-[#EBF2FA] px-2.5 py-0.5 text-[11px] font-bold text-[#0F2F58]">
                                                <MapPin className="size-3" />
                                                Brgy. {selectedBarangay}
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedBarangay('all')}
                                                    className="cursor-pointer hover:text-red-600"
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </span>
                                        )}
                                        {priceRangeFilter !== 'all' && (
                                            <span className="flex items-center gap-1 rounded-full bg-[#EBF2FA] px-2.5 py-0.5 text-[11px] font-bold text-[#0F2F58]">
                                                {priceRangeFilter.replace('_', ' ')}
                                                <button
                                                    type="button"
                                                    onClick={() => setPriceRangeFilter('all')}
                                                    className="cursor-pointer hover:text-red-600"
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </span>
                                        )}
                                        {searchQuery && (
                                            <span className="flex items-center gap-1 rounded-full bg-[#EBF2FA] px-2.5 py-0.5 text-[11px] font-bold text-[#0F2F58]">
                                                &quot;{searchQuery}&quot;
                                                <button
                                                    type="button"
                                                    onClick={() => setSearchQuery('')}
                                                    className="cursor-pointer hover:text-red-600"
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* COMMUNITY REQUESTS BOARD VIEW */}
                            {marketplaceTab === 'requests' ? (
                                filteredRequests.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                                        <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                            <Search className="size-6" />
                                        </div>
                                        <h3 className="mt-3 text-sm font-extrabold text-[#0F2F58]">
                                            No active citizen requests right now
                                        </h3>
                                        <p className="mt-1 max-w-sm text-xs text-slate-500">
                                            Be the first citizen in Tagudin to post a job request or
                                            repair need!
                                        </p>
                                        <Link
                                            href="/requests/create"
                                            className="mt-4 rounded-full bg-[#0D715F] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0a574a]"
                                        >
                                            Post a Request
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {filteredRequests.map((req) => (
                                            <article
                                                key={req.id}
                                                onClick={() => router.visit(`/requests/${req.id}`)}
                                                className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-[#0D715F] hover:shadow-md"
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-[#0D715F]">
                                                            <Sparkles className="size-3" />
                                                            <span>Open Tender</span>
                                                        </span>
                                                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 capitalize">
                                                            ⏱️ {req.urgency}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-sm leading-snug font-extrabold text-[#0F2F58] transition-colors group-hover:text-[#0D715F]">
                                                        {req.title}
                                                    </h3>

                                                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                                                        &ldquo;{req.description}&rdquo;
                                                    </p>

                                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                                        <MapPin className="size-3 text-slate-400" />
                                                        <span>
                                                            {((req as Record<string, unknown>)
                                                                .barangay as string) || req.area}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                                                    <div>
                                                        <span className="text-sm font-extrabold text-[#0D715F]">
                                                            {req.budget_amount_minor
                                                                ? `₱${(req.budget_amount_minor / 100).toFixed(2)}`
                                                                : 'Open Budget'}
                                                        </span>
                                                        <span className="block text-[10px] font-medium text-slate-400">
                                                            Estimated Budget
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                                                            {req.quotes_count}{' '}
                                                            {req.quotes_count === 1
                                                                ? 'Bid'
                                                                : 'Bids'}
                                                        </span>
                                                        <span className="rounded-xl bg-[#0D715F] px-3 py-1.5 text-xs font-bold text-white transition-colors group-hover:bg-[#0a574a]">
                                                            Quote →
                                                        </span>
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )
                            ) : filteredListings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                                    <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                        <Search className="size-6" />
                                    </div>
                                    <h3 className="mt-3 text-sm font-extrabold text-[#0F2F58]">
                                        No matching listings found
                                    </h3>
                                    <p className="mt-1 max-w-sm text-xs text-slate-500">
                                        Try adjusting your search query, choosing a different
                                        category, or resetting active filters.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={resetAllFilters}
                                        className="mt-4 cursor-pointer rounded-full bg-[#0F2F58] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#153e74]"
                                    >
                                        Reset All Filters
                                    </button>
                                </div>
                            ) : layoutMode === 'grid' ? (
                                /* Impeccable Card Grid */
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    {filteredListings.map((listing) => {
                                        const isPinned = pinnedIds.includes(listing.id);
                                        const photoUrl =
                                            listing.cover_thumbnail_url ||
                                            getCategoryPhoto(
                                                listing.category_code || listing.categoryCode,
                                            );
                                        const priceDisplay = getPriceDisplay(listing);
                                        const isService =
                                            (listing.listing_type || listing.listingType) !==
                                            'product';

                                        return (
                                            <article
                                                key={listing.id}
                                                onClick={() =>
                                                    router.visit(`/listings/${listing.id}`)
                                                }
                                                className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
                                            >
                                                {/* Cover Photo with Badges */}
                                                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                                                    <img
                                                        src={photoUrl}
                                                        alt={listing.title}
                                                        className="size-full object-cover transition-transform duration-300 group-hover:scale-103"
                                                        loading="lazy"
                                                    />
                                                    {/* Top Badges */}
                                                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                                        <span
                                                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase shadow-xs ${
                                                                isService
                                                                    ? 'bg-[#0F2F58] text-white'
                                                                    : 'bg-emerald-700 text-white'
                                                            }`}
                                                        >
                                                            {isService ? 'Service' : 'Product'}
                                                        </span>
                                                        {listing.has_video && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs backdrop-blur-xs">
                                                                <Video className="size-3 text-[#FFC72C]" />
                                                                <span>Video</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Heart Pin Button */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePin(listing.id);
                                                        }}
                                                        className={`absolute top-2.5 right-2.5 flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/90 shadow-xs backdrop-blur-xs transition-transform hover:scale-105 active:scale-90 ${
                                                            isPinned
                                                                ? 'text-red-500'
                                                                : 'text-slate-600 hover:text-red-500'
                                                        }`}
                                                        aria-label={
                                                            isPinned
                                                                ? 'Unpin listing'
                                                                : 'Pin listing'
                                                        }
                                                    >
                                                        <Heart
                                                            className={`size-4 ${isPinned ? 'fill-red-500' : ''}`}
                                                        />
                                                    </button>
                                                </div>

                                                {/* Card Content Body */}
                                                <div className="flex flex-1 flex-col justify-between p-4">
                                                    <div>
                                                        <h3 className="line-clamp-1 text-sm font-extrabold text-[#0F2F58] group-hover:text-blue-900">
                                                            {listing.title}
                                                        </h3>
                                                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                                                            {listing.description ||
                                                                'Verified local marketplace offering in Tagudin, Ilocos Sur.'}
                                                        </p>

                                                        {/* Provider & Area Tag */}
                                                        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                                            <div className="flex size-4.5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                                                                {listing.title.charAt(0)}
                                                            </div>
                                                            <span className="font-semibold text-slate-700">
                                                                {listing.owner_name ||
                                                                    listing.ownerName ||
                                                                    'Tagudin Provider'}
                                                            </span>
                                                            <span>·</span>
                                                            <span
                                                                className="flex items-center gap-0.5 truncate text-slate-500"
                                                                title={formatListingLocation(
                                                                    listing,
                                                                )}
                                                            >
                                                                <MapPin className="size-3 shrink-0 text-slate-400" />
                                                                <span className="truncate">
                                                                    {formatListingLocation(listing)}
                                                                </span>
                                                                {typeof listing.distance_km ===
                                                                    'number' && (
                                                                    <span className="shrink-0 text-[10px] font-bold text-emerald-700">
                                                                        ·{' '}
                                                                        {listing.distance_km < 0.1
                                                                            ? '<100m'
                                                                            : `${listing.distance_km.toFixed(1)}km`}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Pricing & Detail Row */}
                                                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                                                        <div>
                                                            <div className="text-[9.5px] font-bold tracking-wider text-slate-400 uppercase">
                                                                Starting at
                                                            </div>
                                                            <div className="font-mono text-base font-extrabold text-[#0F2F58]">
                                                                {priceDisplay}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                                                            <Star className="size-3.5 fill-amber-500 text-amber-500" />
                                                            <span>4.9</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* Compact List View */
                                <div className="flex flex-col gap-3">
                                    {filteredListings.map((listing) => {
                                        const isPinned = pinnedIds.includes(listing.id);
                                        const photoUrl =
                                            listing.cover_thumbnail_url ||
                                            getCategoryPhoto(
                                                listing.category_code || listing.categoryCode,
                                            );
                                        const priceDisplay = getPriceDisplay(listing);

                                        return (
                                            <article
                                                key={listing.id}
                                                onClick={() =>
                                                    router.visit(`/listings/${listing.id}`)
                                                }
                                                className="group flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:shadow-md"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={photoUrl}
                                                        alt={listing.title}
                                                        className="size-18 rounded-xl object-cover"
                                                        loading="lazy"
                                                    />
                                                    <div>
                                                        <h3 className="text-sm font-extrabold text-[#0F2F58] group-hover:text-blue-900">
                                                            {listing.title}
                                                        </h3>
                                                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                                                            {listing.description ||
                                                                'Verified local service'}
                                                        </p>
                                                        <div className="mt-1.5 flex items-center gap-2 text-[11px] font-medium text-slate-600">
                                                            <span className="flex items-center gap-0.5 font-bold text-amber-700">
                                                                <Star className="size-3 fill-amber-500 text-amber-500" />
                                                                4.9
                                                            </span>
                                                            <span className="flex items-center gap-0.5 text-slate-500">
                                                                <MapPin className="size-3 text-slate-400" />
                                                                <span>
                                                                    {formatListingLocation(listing)}
                                                                </span>
                                                                {typeof listing.distance_km ===
                                                                    'number' && (
                                                                    <span className="text-[10px] font-bold text-emerald-700">
                                                                        ·{' '}
                                                                        {listing.distance_km < 0.1
                                                                            ? '<100m'
                                                                            : `${listing.distance_km.toFixed(1)}km`}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePin(listing.id);
                                                        }}
                                                        className={`flex size-8 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white ${
                                                            isPinned
                                                                ? 'text-red-500'
                                                                : 'text-slate-400 hover:text-red-500'
                                                        }`}
                                                        aria-label="Pin listing"
                                                    >
                                                        <Heart
                                                            className={`size-4 ${isPinned ? 'fill-red-500' : ''}`}
                                                        />
                                                    </button>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <div className="font-mono text-base font-extrabold text-[#0F2F58]">
                                                                {priceDisplay}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                Fixed rate
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                                                            <Star className="size-3.5 fill-amber-500 text-amber-500" />
                                                            <span>4.9</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                </main>
            </div>

            {/* =========================================================================
                MOBILE PHONE SHELL (Visible on Mobile, Hidden on Desktop lg:hidden)
                Strictly follows docs/design-kit/browse-mobile.html
                ========================================================================= */}
            <div className="flex min-h-screen flex-col items-center bg-[#F8F9FA] pb-[90px] lg:hidden">
                <div className="flex min-h-screen w-full flex-col bg-white shadow-xs">
                    {/* Tier 1: Sticky Topbar with Logo, Search, Picks, and Notifications */}
                    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
                        <div className="flex w-full items-center gap-2 transition-all">
                            {/* Brand Logo (on far left before search bar) */}
                            <a
                                href="/"
                                className="flex shrink-0 items-center"
                                aria-label="Serbizyu Home"
                            >
                                <div className="flex size-9 items-center justify-center rounded-xl bg-[#0F2F58] font-bold text-white shadow-xs">
                                    <svg
                                        width="17"
                                        height="17"
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
                            </a>

                            {/* Search Input (flexible width, expands on click to occupy right space) */}
                            <div className="relative min-w-0 flex-1 transition-all">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onFocus={() => setSearchFocused(true)}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search services & goods..."
                                    className="h-10 w-full rounded-full border border-slate-200 bg-[#F4F4F5] pr-8 pl-9 text-xs font-semibold text-slate-900 transition-all outline-none placeholder:text-slate-400 focus:border-[#0F2F58] focus:bg-white focus:ring-2 focus:ring-[#0F2F58]/10"
                                />
                                {searchQuery ? (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                ) : null}
                            </div>

                            {/* When NOT focused: Show Picks and Notifications (Notification replaces profile icon) */}
                            {!searchFocused ? (
                                <div className="flex shrink-0 items-center gap-1.5 transition-all">
                                    {/* My Picks / Cart Button with Yellow Badge */}
                                    <button
                                        type="button"
                                        onClick={() => setPicksOpen(true)}
                                        className="relative flex size-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50"
                                        aria-label="My Picks"
                                        title="My Picks"
                                    >
                                        <ShoppingBag className="size-4 text-[#0F2F58]" />
                                        {basket.length > 0 && (
                                            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#FFC244] text-[9.5px] font-extrabold text-[#0F2F58] shadow-xs">
                                                {basket.reduce(
                                                    (sum, item) => sum + item.quantity,
                                                    0,
                                                )}
                                            </span>
                                        )}
                                    </button>

                                    {/* Notification Bell Icon (replaces profile icon) */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            alert(
                                                'Tagudin Updates & Notifications: 0 pending alerts in Centro.',
                                            )
                                        }
                                        className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50"
                                        aria-label="Notifications"
                                        title="Notifications"
                                    >
                                        <Bell className="size-4 text-[#0F2F58]" />
                                    </button>
                                </div>
                            ) : (
                                /* When focused: Show Cancel to collapse and restore icons */
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchFocused(false);
                                        if (searchInputRef.current) searchInputRef.current.blur();
                                    }}
                                    className="shrink-0 cursor-pointer px-1 text-xs font-bold text-[#0F2F58] transition-all hover:underline"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </header>
                    {/* Marketplace Segment Switcher: Services vs Citizen Requests */}
                    <div className="flex items-center gap-1.5 border-b border-slate-200/80 bg-white px-3 py-2">
                        <button
                            type="button"
                            onClick={() => setMarketplaceTab('listings')}
                            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition-all ${
                                marketplaceTab === 'listings'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <span>🏷️ Services</span>
                            <span
                                className={`py-0.2 rounded-full px-1.5 text-[10px] font-bold ${
                                    marketplaceTab === 'listings'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-200 text-slate-700'
                                }`}
                            >
                                {filteredListings.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMarketplaceTab('requests')}
                            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition-all ${
                                marketplaceTab === 'requests'
                                    ? 'bg-[#0D715F] text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <span>📢 Requests</span>
                            <span
                                className={`py-0.2 rounded-full px-1.5 text-[10px] font-bold ${
                                    marketplaceTab === 'requests'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-200 text-slate-700'
                                }`}
                            >
                                {filteredRequests.length}
                            </span>
                        </button>
                    </div>

                    {/* Tier 2: The Single Sleek Sieve Bar */}
                    <div
                        className="flex [scrollbar-width:none] items-center gap-2 overflow-x-auto border-b border-slate-200/80 bg-white px-3.5 py-2 [&::-webkit-scrollbar]:hidden"
                        aria-label="Marketplace Sieves"
                    >
                        <button
                            type="button"
                            onClick={() => setActiveMobileModal('category')}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shadow-2xs transition-all active:scale-95 ${
                                selectedCategory !== 'all'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            <span>🗂️</span>
                            <span>
                                {selectedCategory !== 'all'
                                    ? MARKETPLACE_CATEGORIES.find(
                                          (c) => c.code === selectedCategory,
                                      )?.label || 'Category'
                                    : 'All Categories'}
                            </span>
                            <ChevronDown className="size-3 opacity-70" />
                        </button>

                        {/* 2. Offering Type (Services vs Products) */}
                        <button
                            type="button"
                            onClick={() => setActiveMobileModal('type')}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shadow-2xs transition-all active:scale-95 ${
                                listingTypeFilter !== 'all'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            <span>🏷️</span>
                            <span>
                                {listingTypeFilter === 'all'
                                    ? 'All Types'
                                    : listingTypeFilter === 'service'
                                      ? 'Services'
                                      : 'Products'}
                            </span>
                            <ChevronDown className="size-3 opacity-70" />
                        </button>

                        {/* Location / Barangay */}
                        <button
                            type="button"
                            onClick={() => setActiveMobileModal('location')}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shadow-2xs transition-all active:scale-95 ${
                                selectedBarangay !== 'all'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            <MapPin className="size-3" />
                            <span>
                                {selectedBarangay !== 'all'
                                    ? `Brgy. ${selectedBarangay}`
                                    : 'All Barangays'}
                            </span>
                            <ChevronDown className="size-3 opacity-70" />
                        </button>

                        {/* 3. Budget / Price Range */}
                        <button
                            type="button"
                            onClick={() => setActiveMobileModal('price')}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shadow-2xs transition-all active:scale-95 ${
                                priceRangeFilter !== 'all'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            <span className="font-mono">₱</span>
                            <span>
                                {priceRangeFilter === 'all'
                                    ? 'Any Price'
                                    : priceRangeFilter === 'under_150'
                                      ? 'Under ₱150'
                                      : priceRangeFilter === '150_300'
                                        ? '₱150–₱300'
                                        : '₱300+'}
                            </span>
                            <ChevronDown className="size-3 opacity-70" />
                        </button>

                        {/* 4. Trust & Badges */}
                        <button
                            type="button"
                            onClick={() => setActiveMobileModal('trust')}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shadow-2xs transition-all active:scale-95 ${
                                topRatedOnly || verifiedProOnly
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            <Star
                                className={`size-3.5 ${topRatedOnly || verifiedProOnly ? 'fill-[#FFC244] stroke-[#FFC244]' : 'fill-[#FFC244] stroke-[#D97706]'}`}
                            />
                            <span>
                                {topRatedOnly
                                    ? 'Top Rated'
                                    : verifiedProOnly
                                      ? 'Verified Pro'
                                      : 'Trust Badges'}
                            </span>
                            <ChevronDown className="size-3 opacity-70" />
                        </button>

                        {/* 5. Fast Toggle: Available Today */}
                        <button
                            type="button"
                            onClick={() => setAvailableTodayOnly(!availableTodayOnly)}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shadow-2xs transition-all active:scale-95 ${
                                availableTodayOnly
                                    ? 'bg-[#10B981] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            <span>⚡ Available Today</span>
                        </button>

                        {/* 6. Sort Option */}
                        <button
                            type="button"
                            onClick={() => setActiveMobileModal('sort')}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shadow-2xs transition-all active:scale-95 ${
                                sortBy !== 'recommended'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            <ArrowUpDown className="size-3.5" />
                            <span>
                                {sortBy === 'recommended'
                                    ? 'Sort'
                                    : sortBy === 'nearest'
                                      ? '📍 Nearest'
                                      : sortBy === 'price_asc'
                                        ? '₱ Low→High'
                                        : sortBy === 'price_desc'
                                          ? '₱ High→Low'
                                          : 'Rating'}
                            </span>
                            <ChevronDown className="size-3 opacity-70" />
                        </button>
                    </div>

                    {/* Mobile Results Feed */}
                    <div className="flex flex-col gap-3 p-4">
                        {marketplaceTab === 'requests' ? (
                            filteredRequests.length === 0 ? (
                                <div className="space-y-2 rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                                    <p className="font-bold text-[#0F2F58]">
                                        No open requests right now.
                                    </p>
                                    <Link
                                        href="/requests/create"
                                        className="inline-block rounded-full bg-[#0D715F] px-4 py-1.5 text-xs font-bold text-white shadow-xs"
                                    >
                                        Post a Request
                                    </Link>
                                </div>
                            ) : (
                                filteredRequests.map((req) => (
                                    <article
                                        key={req.id}
                                        onClick={() => router.visit(`/requests/${req.id}`)}
                                        className="cursor-pointer space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all active:scale-[0.99]"
                                    >
                                        <div className="flex items-center justify-between gap-1 text-[11px]">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-bold text-[#0D715F]">
                                                <Sparkles className="size-3" />
                                                <span>Open Tender</span>
                                            </span>
                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700 capitalize">
                                                ⏱️ {req.urgency}
                                            </span>
                                        </div>

                                        <h3 className="text-sm leading-snug font-extrabold text-[#0F2F58]">
                                            {req.title}
                                        </h3>

                                        <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                                            &ldquo;{req.description}&rdquo;
                                        </p>

                                        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                                            <div>
                                                <span className="text-sm font-black text-[#0D715F]">
                                                    {req.budget_amount_minor
                                                        ? `₱${(req.budget_amount_minor / 100).toFixed(2)}`
                                                        : 'Open Budget'}
                                                </span>
                                                <span className="block text-[10px] font-medium text-slate-400">
                                                    {((req as Record<string, unknown>)
                                                        .barangay as string) || req.area}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                                    {req.quotes_count}{' '}
                                                    {req.quotes_count === 1 ? 'Bid' : 'Bids'}
                                                </span>
                                                <span className="rounded-lg bg-[#0D715F] px-2.5 py-1 text-xs font-bold text-white">
                                                    Quote →
                                                </span>
                                            </div>
                                        </div>
                                    </article>
                                ))
                            )
                        ) : (
                            <>
                                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                    <span>{filteredListings.length} results in Tagudin</span>
                                    {hasActiveFilters && (
                                        <button
                                            type="button"
                                            onClick={resetAllFilters}
                                            className="cursor-pointer text-[#0F2F58] underline"
                                        >
                                            Clear filters
                                        </button>
                                    )}
                                </div>

                                {filteredListings.length === 0 ? (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                                        No listings match your search.
                                    </div>
                                ) : (
                                    filteredListings.map((item) => (
                                        <MarketplaceCard
                                            key={item.id}
                                            listing={item}
                                            distanceKm={item.distance_km}
                                            onSelect={(selected) =>
                                                router.visit(`/listings/${selected.id}`)
                                            }
                                        />
                                    ))
                                )}
                            </>
                        )}
                    </div>
                    {/* Bottom Navigation Bar */}
                    <BottomNavBar
                        activeTab={mobileActiveTab}
                        ordersCount={basket.reduce((sum, item) => sum + item.quantity, 0)}
                        onTabSelect={(tab: NavTabId) => {
                            setMobileActiveTab(tab);
                            if (tab === 'explore') {
                                setSearchQuery('');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                            if (tab === 'post') setCreatorOpen(true);
                            if (tab === 'quick_deal') setQuickDealOpen(true);
                            if (tab === 'orders') router.visit('/orders');
                            if (tab === 'profile') setProfileDrawerOpen(true);
                        }}
                        onQuickDealClick={() => setQuickDealOpen(true)}
                    />
                </div>
            </div>

            {/* Mobile Profile / Account Glovo Wave Modal */}
            <GlovoWaveModal
                open={profileDrawerOpen}
                onClose={() => {
                    setProfileDrawerOpen(false);
                    setMobileActiveTab('explore');
                }}
                title={
                    authenticated
                        ? props.readiness?.displayName || props.session?.displayName || 'My Account'
                        : 'Welcome to Serbizyu'
                }
                subtitle={
                    authenticated ? 'Tagudin Citizen Account' : 'Tagudin neighborhood marketplace'
                }
                bottomSlot={
                    authenticated ? (
                        <button
                            type="button"
                            onClick={() => {
                                setProfileDrawerOpen(false);
                                router.post('/auth/logout', {}, { preserveScroll: false });
                            }}
                            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 text-xs font-extrabold text-rose-700 transition-colors hover:bg-rose-100"
                        >
                            <span>Log Out</span>
                        </button>
                    ) : (
                        <div className="flex w-full flex-col gap-2">
                            <Link
                                href="/auth/sign-in"
                                className="flex h-11 w-full items-center justify-center rounded-full bg-[#0F2F58] text-xs font-extrabold text-white shadow-md transition-colors hover:bg-[#153e74]"
                            >
                                Sign In to Your Account
                            </Link>
                            <Link
                                href="/auth/register"
                                className="flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50"
                            >
                                Create an Account
                            </Link>
                        </div>
                    )
                }
            >
                {authenticated ? (
                    <div className="flex flex-col gap-3 py-2">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-full bg-[#0F2F58] text-sm font-extrabold text-white shadow-xs">
                                    {userInitial}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-extrabold text-slate-900">
                                        {userDisplayName}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {props.session?.phone || 'Mobile Verified'}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                <ShieldCheck className="size-3.5" />
                                <span>
                                    {props.readiness?.ready
                                        ? 'Verified Provider · Ready'
                                        : 'Level 1: Phone Verified'}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <a
                                href="/my-listings"
                                className="flex items-center justify-between rounded-xl p-3 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-100"
                            >
                                <span>📦 My Listings & Services</span>
                                <span className="text-slate-400">→</span>
                            </a>
                            <a
                                href="/orders"
                                className="flex items-center justify-between rounded-xl p-3 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-100"
                            >
                                <span>🛍️ My Orders & Milestones</span>
                                <span className="text-slate-400">→</span>
                            </a>
                            <a
                                href="/requests/create"
                                className="flex items-center justify-between rounded-xl p-3 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-100"
                            >
                                <span>✍️ Post a Request</span>
                                <span className="text-slate-400">→</span>
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 py-2">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs">
                            <div className="text-sm font-extrabold text-[#0F2F58]">
                                Why sign in to Serbizyu?
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                Tagudin&apos;s community marketplace links you directly to trusted
                                local neighbors for aircon repairs, cleaning, delicacies, and custom
                                errands.
                            </p>
                            <ul className="mt-3 flex flex-col gap-2 text-xs text-slate-600">
                                <li className="flex items-center gap-2">
                                    <span className="font-bold text-emerald-600">✓</span>
                                    <span>Track and coordinate multi-service deal chains</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="font-bold text-emerald-600">✓</span>
                                    <span>Book verified police/barangay cleared pros</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="font-bold text-emerald-600">✓</span>
                                    <span>Create and manage your own service listings</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </GlovoWaveModal>

            {/* Mobile Category Glovo Wave Modal */}
            <GlovoWaveModal
                open={activeMobileModal === 'category'}
                onClose={() => setActiveMobileModal(null)}
                title="Browse Categories"
                subtitle="Select a trade or service category in Tagudin"
                bottomSlot={
                    <button
                        type="button"
                        onClick={() => setActiveMobileModal(null)}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98]"
                    >
                        <span>Show {filteredListings.length} Results</span>
                        <span>→</span>
                    </button>
                }
            >
                <div className="flex flex-col gap-2 p-1">
                    {MARKETPLACE_CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.code;
                        const count =
                            cat.code === 'all' ? rawListings.length : categoryCounts[cat.code] || 0;

                        return (
                            <div
                                key={cat.code}
                                onClick={() => setSelectedCategory(cat.code)}
                                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                                    isSelected
                                        ? 'border-[#0F2F58] bg-[#EBF2FA] text-slate-950 shadow-2xs'
                                        : 'border-slate-100 bg-[#FAFCFB] text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="shrink-0 text-xl">{cat.icon}</span>
                                    <div className="min-w-0">
                                        <div className="truncate text-xs font-bold text-slate-900">
                                            {cat.label}
                                        </div>
                                        <div className="mt-0.5 truncate text-[11px] text-slate-500">
                                            {cat.description}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                                        {count}
                                    </span>
                                    <div
                                        className={`flex size-5 items-center justify-center rounded-full border-2 transition-colors ${
                                            isSelected
                                                ? 'border-[#0F2F58] bg-[#0F2F58] text-white'
                                                : 'border-slate-300 bg-white'
                                        }`}
                                    >
                                        {isSelected && <Check className="size-3 stroke-[3]" />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </GlovoWaveModal>

            {/* Mobile Listing Type Glovo Wave Modal */}
            <GlovoWaveModal
                open={activeMobileModal === 'type'}
                onClose={() => setActiveMobileModal(null)}
                title="Offering Types"
                subtitle="Filter between services or physical products"
                bottomSlot={
                    <button
                        type="button"
                        onClick={() => setActiveMobileModal(null)}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98]"
                    >
                        <span>Apply Type Filter</span>
                        <span>→</span>
                    </button>
                }
            >
                <div className="flex flex-col gap-2 p-1">
                    {[
                        {
                            id: 'all',
                            title: 'All Offerings',
                            desc: 'Browse both labor services and local goods',
                            icon: '🏷️',
                        },
                        {
                            id: 'service',
                            title: 'Services & Labor',
                            desc: 'Aircon repair, plumbing, cleaning, custom errands',
                            icon: '🔧',
                        },
                        {
                            id: 'product',
                            title: 'Products & Food',
                            desc: 'Fresh food, hardware parts, crafts & materials',
                            icon: '📦',
                        },
                    ].map((t) => {
                        const isSelected = listingTypeFilter === t.id;
                        return (
                            <div
                                key={t.id}
                                onClick={() =>
                                    setListingTypeFilter(t.id as 'all' | 'service' | 'product')
                                }
                                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                                    isSelected
                                        ? 'border-[#0F2F58] bg-[#EBF2FA] text-slate-950'
                                        : 'border-slate-100 bg-[#FAFCFB] text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{t.icon}</span>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900">
                                            {t.title}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-slate-500">
                                            {t.desc}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className={`flex size-5 items-center justify-center rounded-full border-2 ${
                                        isSelected
                                            ? 'border-[#0F2F58] bg-[#0F2F58] text-white'
                                            : 'border-slate-300'
                                    }`}
                                >
                                    {isSelected && <Check className="size-3 stroke-[3]" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </GlovoWaveModal>

            {/* Mobile Budget & Price Glovo Wave Modal */}
            <GlovoWaveModal
                open={activeMobileModal === 'price'}
                onClose={() => setActiveMobileModal(null)}
                title="Price & Budget"
                subtitle="Filter by community pricing tiers"
                bottomSlot={
                    <button
                        type="button"
                        onClick={() => setActiveMobileModal(null)}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98]"
                    >
                        <span>Apply Budget</span>
                        <span>→</span>
                    </button>
                }
            >
                <div className="flex flex-col gap-2 p-1">
                    {[
                        {
                            id: 'all',
                            title: 'Any Budget',
                            desc: 'Show all price levels in Tagudin',
                        },
                        {
                            id: 'under_150',
                            title: 'Budget Friendly (Under ₱150)',
                            desc: 'Errand runs, simple button fix, snack orders',
                        },
                        {
                            id: '150_300',
                            title: 'Standard (₱150 – ₱300)',
                            desc: 'Haircut, deep fan clean, document scanning',
                        },
                        {
                            id: '300_plus',
                            title: 'Major Projects (₱300+)',
                            desc: 'Split AC deep clean, plumbing overhaul, carpentry',
                        },
                    ].map((p) => {
                        const isSelected = priceRangeFilter === p.id;
                        return (
                            <div
                                key={p.id}
                                onClick={() => setPriceRangeFilter(p.id as PriceRange)}
                                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                                    isSelected
                                        ? 'border-[#0F2F58] bg-[#EBF2FA] text-slate-950'
                                        : 'border-slate-100 bg-[#FAFCFB] text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                <div>
                                    <div className="text-xs font-bold text-slate-900">
                                        {p.title}
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-slate-500">
                                        {p.desc}
                                    </div>
                                </div>
                                <div
                                    className={`flex size-5 items-center justify-center rounded-full border-2 ${
                                        isSelected
                                            ? 'border-[#0F2F58] bg-[#0F2F58] text-white'
                                            : 'border-slate-300'
                                    }`}
                                >
                                    {isSelected && <Check className="size-3 stroke-[3]" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </GlovoWaveModal>

            {/* Mobile Trust & Badges Glovo Wave Modal */}
            <GlovoWaveModal
                open={activeMobileModal === 'trust'}
                onClose={() => setActiveMobileModal(null)}
                title="Trust & Verification"
                subtitle="Filter by community credentials"
                bottomSlot={
                    <button
                        type="button"
                        onClick={() => setActiveMobileModal(null)}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98]"
                    >
                        <span>Apply Trust Filters</span>
                        <span>→</span>
                    </button>
                }
            >
                <div className="flex flex-col gap-2.5 p-1">
                    <div
                        onClick={() => setTopRatedOnly(!topRatedOnly)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                            topRatedOnly
                                ? 'border-[#0F2F58] bg-[#EBF2FA]'
                                : 'border-slate-100 bg-[#FAFCFB]'
                        }`}
                    >
                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                <Star className="size-3.5 fill-[#FFC244] stroke-[#FFC244]" />
                                <span>Top Rated (4.8+ Stars)</span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                                Providers with consistent 5-star community reviews in Tagudin
                            </div>
                        </div>
                        <div
                            className={`flex size-5 items-center justify-center rounded-md border-2 ${
                                topRatedOnly
                                    ? 'border-[#0F2F58] bg-[#0F2F58] text-white'
                                    : 'border-slate-300'
                            }`}
                        >
                            {topRatedOnly && <Check className="size-3 stroke-[3]" />}
                        </div>
                    </div>

                    <div
                        onClick={() => setVerifiedProOnly(!verifiedProOnly)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                            verifiedProOnly
                                ? 'border-[#0F2F58] bg-[#EBF2FA]'
                                : 'border-slate-100 bg-[#FAFCFB]'
                        }`}
                    >
                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                <ShieldCheck className="size-3.5 text-emerald-600" />
                                <span>Police Cleared &amp; Certified Pro</span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                                Background checked tradespeople with credentials on file
                            </div>
                        </div>
                        <div
                            className={`flex size-5 items-center justify-center rounded-md border-2 ${
                                verifiedProOnly
                                    ? 'border-[#0F2F58] bg-[#0F2F58] text-white'
                                    : 'border-slate-300'
                            }`}
                        >
                            {verifiedProOnly && <Check className="size-3 stroke-[3]" />}
                        </div>
                    </div>
                </div>
            </GlovoWaveModal>

            {/* Mobile Location / Barangay Glovo Wave Modal */}
            <GlovoWaveModal
                open={activeMobileModal === 'location'}
                onClose={() => setActiveMobileModal(null)}
                title="Select Barangay"
                subtitle="Filter offerings in Tagudin by neighborhood"
                bottomSlot={
                    <button
                        type="button"
                        onClick={() => setActiveMobileModal(null)}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0F2F58] px-4 py-3 text-sm font-bold text-white shadow-xs transition-all hover:bg-[#163e70] active:scale-[0.98]"
                    >
                        <span>Done</span>
                    </button>
                }
            >
                <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto p-1">
                    <div
                        onClick={() => {
                            setSelectedBarangay('all');
                            setActiveMobileModal(null);
                        }}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                            selectedBarangay === 'all'
                                ? 'border-[#0F2F58] bg-[#EBF2FA] font-bold text-slate-950'
                                : 'border-slate-100 bg-[#FAFCFB] text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <MapPin className="size-4 text-[#0F2F58]" />
                            <span className="text-xs font-bold">All Tagudin Barangays</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                            {rawListings.length}
                        </span>
                    </div>

                    {barangayOptions.map((b) => {
                        const isSelected = selectedBarangay === b.name;
                        return (
                            <div
                                key={b.code}
                                onClick={() => {
                                    setSelectedBarangay(b.name);
                                    setActiveMobileModal(null);
                                }}
                                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                                    isSelected
                                        ? 'border-[#0F2F58] bg-[#EBF2FA] font-bold text-slate-950'
                                        : 'border-slate-100 bg-[#FAFCFB] text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <MapPin className="size-3.5 text-slate-400" />
                                    <span className="text-xs">Brgy. {b.name}</span>
                                </div>
                                {b.count > 0 ? (
                                    <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                        {b.count}
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-slate-400">0</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </GlovoWaveModal>
            {/* Mobile Sort Glovo Wave Modal */}
            <GlovoWaveModal
                open={activeMobileModal === 'sort'}
                onClose={() => setActiveMobileModal(null)}
                title="Sort Offers"
                subtitle="Choose your preferred listing order"
                bottomSlot={
                    <button
                        type="button"
                        onClick={() => setActiveMobileModal(null)}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98]"
                    >
                        <span>Apply Sorting</span>
                        <span>→</span>
                    </button>
                }
            >
                <div className="flex flex-col gap-2 p-1">
                    {[
                        {
                            id: 'recommended',
                            title: 'Recommended',
                            desc: 'Balanced by proximity in Tagudin & activity',
                        },
                        {
                            id: 'nearest',
                            title: 'Nearest to You',
                            desc: 'Closest distance in Tagudin first',
                        },
                        {
                            id: 'rating',
                            title: 'Highest Customer Rating',
                            desc: 'Ranked by neighbor satisfaction',
                        },
                        {
                            id: 'price_asc',
                            title: 'Price: Low to High',
                            desc: 'Budget-first sorting',
                        },
                        {
                            id: 'price_desc',
                            title: 'Price: High to Low',
                            desc: 'Comprehensive & major project packages first',
                        },
                    ].map((s) => {
                        const isSelected = sortBy === s.id;
                        return (
                            <div
                                key={s.id}
                                onClick={() => setSortBy(s.id as SortOption)}
                                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                                    isSelected
                                        ? 'border-[#0F2F58] bg-[#EBF2FA] text-slate-950'
                                        : 'border-slate-100 bg-[#FAFCFB] text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                <div>
                                    <div className="text-xs font-bold text-slate-900">
                                        {s.title}
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-slate-500">
                                        {s.desc}
                                    </div>
                                </div>
                                <div
                                    className={`flex size-5 items-center justify-center rounded-full border-2 ${
                                        isSelected
                                            ? 'border-[#0F2F58] bg-[#0F2F58] text-white'
                                            : 'border-slate-300'
                                    }`}
                                >
                                    {isSelected && <Check className="size-3 stroke-[3]" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </GlovoWaveModal>

            {/* Citizen Picks Drawer */}
            <PicksDrawer
                open={picksOpen}
                onClose={() => setPicksOpen(false)}
                items={basket}
                recipes={Object.values(dealChainRecipes)}
                onUpdateQuantity={(id, delta) => {
                    const next = basket
                        .map((item) =>
                            item.id === id ? { ...item, quantity: item.quantity + delta } : item,
                        )
                        .filter((item) => item.quantity > 0);
                    saveBasket(next);
                }}
                onRemoveItem={(id) => {
                    const next = basket.filter((item) => item.id !== id);
                    saveBasket(next);
                }}
                onCheckout={() => {
                    setPicksOpen(false);
                    const itemsWithDealChain = basket.filter((item) => Boolean(item.dealChain));
                    if (itemsWithDealChain.length > 0) {
                        setCheckoutModalOpen(true);
                    } else if (basket.length > 0) {
                        // Direct ordinary booking -> forms order proposal
                        router.visit(`/listings/${basket[0].id}/book`);
                    }
                }}
                onAttachDealChain={handleAttachDealChain}
                onSwapSlotCandidate={handleSwapSlotCandidate}
            />

            {/* Dedicated Deal Chain Checkout Modal (Zero Dummy Alerts) */}
            <DealChainCheckoutModal
                open={checkoutModalOpen}
                onClose={() => setCheckoutModalOpen(false)}
                items={basket}
                totalAmount={basketTotal}
                onAuthorize={handleAuthorizeDealChain}
            />

            {/* Creator Post Drawer Modal */}
            <CreatorPostModal open={creatorOpen} onClose={() => setCreatorOpen(false)} />

            {/* Quick Deal Scanner Modal */}
            <QuickDealScanModal
                open={quickDealOpen}
                onClose={() => setQuickDealOpen(false)}
                userPhone={props.session?.phone || '+63 917 123 4567'}
                userName={userDisplayName}
            />
        </div>
    );
}
