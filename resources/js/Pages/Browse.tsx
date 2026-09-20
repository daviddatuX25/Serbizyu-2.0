import { useEffect, useMemo, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    Search,
    SlidersHorizontal,
    Star,
    MapPin,
    X,
    ChevronDown,
    Plus,
    Heart,
    Grid,
    List,
    RotateCcw,
    ShieldCheck,
    Clock,
    ArrowUpDown,
} from 'lucide-react';
import type { HomeProps, ListingRecord } from '../types';
import { DesktopGlobalNav } from '../components/layout/DesktopGlobalNav';
import { CategoryTabs } from '../marketplace/components/CategoryTabs';
import { FilterChipBar, type FilterOption } from '../marketplace/components/FilterChipBar';
import { FeeThresholdTracker } from '../marketplace/components/FeeThresholdTracker';
import { MarketplaceCard } from '../marketplace/components/MarketplaceCard';
import { StickyBasketBar } from '../marketplace/components/StickyBasketBar';
import { BottomNavBar, type NavTabId } from '../marketplace/components/BottomNavBar';
import type { BasketItem, MarketplaceCategory } from '../marketplace/types';
import { PicksDrawer } from '../components/marketplace/PicksDrawer';
import GlovoWaveModal from '../components/mobile/GlovoWaveModal';

// Curated Category Definitions
const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
    { code: 'all', label: 'All Services & Goods' },
    { code: 'repairs', label: 'Repairs & AC' },
    { code: 'home-cleaning', label: 'Cleaning & Help' },
    { code: 'courier', label: 'Courier & Padala' },
    { code: 'local-food', label: 'Local Food & Bakery' },
    { code: 'print-assist', label: 'Print & Soft-Copy' },
    { code: 'greeting-cards', label: 'Cards & Crafts' },
];

// Curated Category Images for High-Craft Visuals
const CATEGORY_IMAGES: Record<string, string> = {
    repairs: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80',
    'home-cleaning': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
    courier: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80',
    'local-food': 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
    'print-assist': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop&q=80',
    'greeting-cards': 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=600&auto=format&fit=crop&q=80',
    'local-services': 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&auto=format&fit=crop&q=80',
    default: 'https://images.unsplash.com/photo-1581092918056-0c4c5acdfb82?w=600&auto=format&fit=crop&q=80',
};

const MOBILE_FILTER_OPTIONS: FilterOption[] = [
    { id: 'top_rated', label: 'Top Rated (4.8+)', hasStarIcon: true },
    { id: 'available_today', label: 'Available Today' },
    { id: 'verified_pro', label: 'Police Cleared Pro' },
    { id: 'under_200', label: 'Under ₱200' },
];

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
type SortOption = 'recommended' | 'price_asc' | 'price_desc' | 'rating';

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

    // Search and Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'service' | 'product'>('all');
    const [priceRangeFilter, setPriceRangeFilter] = useState<PriceRange>('all');
    const [topRatedOnly, setTopRatedOnly] = useState(false);
    const [verifiedProOnly, setVerifiedProOnly] = useState(false);
    const [availableTodayOnly, setAvailableTodayOnly] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('recommended');
    const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

    // Mobile quick filter chips state
    const [mobileFilterIds, setMobileFilterIds] = useState<string[]>(['top_rated']);
    const [picksOpen, setPicksOpen] = useState(false);
    const [mobileCategoryModal, setMobileCategoryModal] = useState<{
        open: boolean;
        category: MarketplaceCategory | null;
    }>({ open: false, category: null });
    // Basket State
    const [basket, setBasket] = useState<BasketItem[]>([]);
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);
    const [mobileActiveTab, setMobileActiveTab] = useState<NavTabId>('explore');

    // Load pins from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('serbizyu.browse.pins');
            if (stored) {
                setPinnedIds(JSON.parse(stored));
            }
        } catch {
            // ignore
        }
    }, []);

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

    const handleAddToCart = (item: ListingRecord) => {
        const price = getPriceRaw(item);
        setBasket((prev) => {
            const existing = prev.find((b) => b.id === item.id);
            if (existing) {
                return prev.map((b) => (b.id === item.id ? { ...b, quantity: b.quantity + 1 } : b));
            }
            return [...prev, { id: item.id, title: item.title, price, quantity: 1 }];
        });
    };

    const basketTotal = useMemo(() => {
        return basket.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [basket]);

    const handleToggleMobileFilter = (filterId: string) => {
        setMobileFilterIds((prev) =>
            prev.includes(filterId) ? prev.filter((id) => id !== filterId) : [...prev, filterId],
        );
        if (filterId === 'top_rated') setTopRatedOnly((v) => !v);
        if (filterId === 'verified_pro') setVerifiedProOnly((v) => !v);
        if (filterId === 'available_today') setAvailableTodayOnly((v) => !v);
        if (filterId === 'under_200') {
            setPriceRangeFilter((prev) => (prev === 'under_150' ? 'all' : 'under_150'));
        }
    };

    const resetAllFilters = () => {
        setSearchQuery('');
        setSelectedCategory('all');
        setListingTypeFilter('all');
        setPriceRangeFilter('all');
        setTopRatedOnly(false);
        setVerifiedProOnly(false);
        setAvailableTodayOnly(false);
        setMobileFilterIds([]);
    };

    const hasActiveFilters =
        searchQuery.trim() !== '' ||
        selectedCategory !== 'all' ||
        listingTypeFilter !== 'all' ||
        priceRangeFilter !== 'all' ||
        topRatedOnly ||
        verifiedProOnly ||
        availableTodayOnly;

    // Filter and Sort Pipeline
    const filteredListings = useMemo(() => {
        return rawListings
            .filter((item) => {
                // 1. Search Query Match
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const titleMatch = item.title.toLowerCase().includes(q);
                    const descMatch = (item.description || '').toLowerCase().includes(q);
                    const areaMatch = (item.area || item.locality || '').toLowerCase().includes(q);
                    const catMatch = (item.category_code || item.categoryCode || '').toLowerCase().includes(q);
                    if (!titleMatch && !descMatch && !areaMatch && !catMatch) {
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

                // 4. Price Budget Match
                if (priceRangeFilter !== 'all') {
                    const price = getPriceRaw(item);
                    if (priceRangeFilter === 'under_150' && price > 150) return false;
                    if (priceRangeFilter === '150_300' && (price < 150 || price > 300)) return false;
                    if (priceRangeFilter === '300_plus' && price < 300) return false;
                }

                return true;
            })
            .sort((a, b) => {
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
        priceRangeFilter,
        sortBy,
    ]);

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
        <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
            {/* =========================================================================
                DESKTOP SHELL (Visible on Desktop lg:, Hidden on Mobile)
                ========================================================================= */}
            <div className="hidden lg:block">
                {/* 1. Global Navigation Bar */}
                <DesktopGlobalNav
                    activeRoute="browse"
                    picksCount={basket.reduce((sum, item) => sum + item.quantity, 0)}
                    onPicksClick={() => setPicksOpen(true)}
                    actingContext={{
                        actorUserId: props.session?.userId || 'usr_guest',
                        ownerUserId: 'usr_guest',
                        ownerName: props.session?.displayName || 'Tagudin Resident',
                        consentGrantId: 'cg_public',
                        isActingOnBehalf: false,
                    }}
                    rightSlot={
                        <Link
                            href="/requests/create"
                            className="flex items-center gap-1.5 rounded-full bg-[#0F2F58] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#153e74] transition-colors shadow-xs"
                        >
                            <span>+ Post Request</span>
                        </Link>
                    }
                />

                {/* 2. Main Discovery 2-Column Layout */}
                <main className="mx-auto max-w-7xl px-6 py-8">
                    <div className="grid grid-cols-12 gap-8 items-start">
                        {/* =========================================================================
                            LEFT COLUMN (270px width): INLINE FILTER CONTROLS (NO MODAL POPUP!)
                            ========================================================================= */}
                        <aside className="col-span-3 sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="size-4 text-[#0F2F58]" />
                                    <span className="text-sm font-extrabold text-[#0F2F58]">Filters</span>
                                </div>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={resetAllFilters}
                                        className="flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900 cursor-pointer"
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
                                    className="h-9 w-full rounded-lg border border-slate-300 bg-[#FAFCFB] pr-8 pl-9 text-xs font-semibold text-slate-900 outline-none transition-colors focus:border-[#0F2F58] focus:bg-white"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Section 1: Categories */}
                            <div className="mt-4 border-b border-slate-100 pb-4">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
                                                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer text-left ${
                                                    isSelected
                                                        ? 'bg-[#0F2F58] text-white font-bold'
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

                            {/* Section 2: Fulfillment / Listing Type */}
                            <div className="mt-4 border-b border-slate-100 pb-4">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Listing Type
                                </label>
                                <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                                    {(['all', 'service', 'product'] as const).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setListingTypeFilter(t)}
                                            className={`rounded-md py-1 text-[11px] font-bold capitalize transition-all cursor-pointer ${
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
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
                                            className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900"
                                        >
                                            <input
                                                type="radio"
                                                name="priceFilter"
                                                checked={priceRangeFilter === opt.id}
                                                onChange={() => setPriceRangeFilter(opt.id as PriceRange)}
                                                className="size-3.5 accent-[#0F2F58]"
                                            />
                                            <span>{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Section 4: Trust & Assurance */}
                            <div className="mt-4">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Trust &amp; Assurance
                                </label>
                                <div className="mt-2.5 flex flex-col gap-2">
                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900">
                                        <input
                                            type="checkbox"
                                            checked={topRatedOnly}
                                            onChange={(e) => setTopRatedOnly(e.target.checked)}
                                            className="size-3.5 accent-[#0F2F58] rounded"
                                        />
                                        <span className="flex items-center gap-1">
                                            <Star className="size-3 fill-amber-500 text-amber-500" />
                                            Top Rated (4.8+)
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900">
                                        <input
                                            type="checkbox"
                                            checked={verifiedProOnly}
                                            onChange={(e) => setVerifiedProOnly(e.target.checked)}
                                            className="size-3.5 accent-[#0F2F58] rounded"
                                        />
                                        <span className="flex items-center gap-1">
                                            <ShieldCheck className="size-3.5 text-emerald-600" />
                                            Police Cleared Pro
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900">
                                        <input
                                            type="checkbox"
                                            checked={availableTodayOnly}
                                            onChange={(e) => setAvailableTodayOnly(e.target.checked)}
                                            className="size-3.5 accent-[#0F2F58] rounded"
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
                            {/* Control Bar: Title, Count, Active Chips, Sort, Layout */}
                            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-lg font-extrabold text-[#0F2F58]">
                                            Verified Services &amp; Local Products
                                        </h1>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Showing {filteredListings.length} active public offerings in Tagudin
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Sort By Dropdown */}
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                            <ArrowUpDown className="size-3.5 text-slate-400" />
                                            <span>Sort:</span>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-[#0F2F58]"
                                            >
                                                <option value="recommended">Recommended</option>
                                                <option value="price_asc">Price: Low to High</option>
                                                <option value="price_desc">Price: High to Low</option>
                                                <option value="rating">Highest Rated</option>
                                            </select>
                                        </div>

                                        {/* View Segment (Grid vs List) */}
                                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setLayoutMode('grid')}
                                                className={`rounded-md p-1.5 cursor-pointer transition-colors ${
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
                                                className={`rounded-md p-1.5 cursor-pointer transition-colors ${
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
                                        <span className="text-[11px] font-bold text-slate-400">Active filters:</span>
                                        {selectedCategory !== 'all' && (
                                            <span className="flex items-center gap-1 rounded-full bg-[#EBF2FA] px-2.5 py-0.5 text-[11px] font-bold text-[#0F2F58]">
                                                {MARKETPLACE_CATEGORIES.find((c) => c.code === selectedCategory)?.label}
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
                                                "{searchQuery}"
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

                            {/* Empty State */}
                            {filteredListings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                                    <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                        <Search className="size-6" />
                                    </div>
                                    <h3 className="mt-3 text-sm font-extrabold text-[#0F2F58]">
                                        No matching listings found
                                    </h3>
                                    <p className="mt-1 max-w-sm text-xs text-slate-500">
                                        Try adjusting your search query, choosing a different category, or resetting active filters.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={resetAllFilters}
                                        className="mt-4 rounded-full bg-[#0F2F58] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#153e74] cursor-pointer"
                                    >
                                        Reset All Filters
                                    </button>
                                </div>
                            ) : layoutMode === 'grid' ? (
                                /* Impeccable Card Grid */
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {filteredListings.map((listing) => {
                                        const isPinned = pinnedIds.includes(listing.id);
                                        const photoUrl = getCategoryPhoto(listing.category_code || listing.categoryCode);
                                        const priceDisplay = getPriceDisplay(listing);
                                        const isService = (listing.listing_type || listing.listingType) !== 'product';

                                        return (
                                            <article
                                                key={listing.id}
                                                onClick={() => router.visit(`/listings/${listing.id}`)}
                                                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all hover:shadow-md hover:border-slate-300 cursor-pointer"
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
                                                        <span className="flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 shadow-xs backdrop-blur-xs">
                                                            <Star className="size-3 fill-amber-500 text-amber-500" />
                                                            <span>4.9</span>
                                                        </span>
                                                    </div>

                                                    {/* Heart Pin Button */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePin(listing.id);
                                                        }}
                                                        className={`absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-full bg-white/90 shadow-xs transition-transform active:scale-90 hover:scale-105 cursor-pointer backdrop-blur-xs ${
                                                            isPinned ? 'text-red-500' : 'text-slate-600 hover:text-red-500'
                                                        }`}
                                                        aria-label={isPinned ? 'Unpin listing' : 'Pin listing'}
                                                    >
                                                        <Heart className={`size-4 ${isPinned ? 'fill-red-500' : ''}`} />
                                                    </button>
                                                </div>

                                                {/* Card Content Body */}
                                                <div className="flex flex-1 flex-col justify-between p-4">
                                                    <div>
                                                        <h3 className="line-clamp-1 text-sm font-extrabold text-[#0F2F58] group-hover:text-blue-900">
                                                            {listing.title}
                                                        </h3>
                                                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                                                            {listing.description || 'Verified local marketplace offering in Tagudin, Ilocos Sur.'}
                                                        </p>

                                                        {/* Provider & Area Tag */}
                                                        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                                            <div className="flex size-4.5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                                                                {listing.title.charAt(0)}
                                                            </div>
                                                            <span className="font-semibold text-slate-700">
                                                                {listing.owner_name || listing.ownerName || 'Tagudin Provider'}
                                                            </span>
                                                            <span>·</span>
                                                            <span className="flex items-center gap-0.5 text-slate-500">
                                                                <MapPin className="size-3 text-slate-400" />
                                                                {listing.area || listing.locality || 'Centro'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Pricing & Booking Row */}
                                                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                                                        <div>
                                                            <div className="text-[9.5px] uppercase font-bold tracking-wider text-slate-400">
                                                                Starting at
                                                            </div>
                                                            <div className="font-mono text-base font-extrabold text-[#0F2F58]">
                                                                {priceDisplay}
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddToCart(listing);
                                                            }}
                                                            className="flex items-center gap-1.5 rounded-full bg-[#0F2F58] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#153e74] active:scale-95 cursor-pointer"
                                                        >
                                                            <Plus className="size-3.5" />
                                                            <span>Book Now</span>
                                                        </button>
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
                                        const photoUrl = getCategoryPhoto(listing.category_code || listing.categoryCode);
                                        const priceDisplay = getPriceDisplay(listing);

                                        return (
                                            <article
                                                key={listing.id}
                                                onClick={() => router.visit(`/listings/${listing.id}`)}
                                                className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:shadow-md cursor-pointer"
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
                                                        <p className="line-clamp-1 mt-0.5 text-xs text-slate-500">
                                                            {listing.description || 'Verified local service'}
                                                        </p>
                                                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                                                            <span className="flex items-center gap-0.5 font-bold text-amber-700">
                                                                <Star className="size-3 fill-amber-500 text-amber-500" />
                                                                4.9
                                                            </span>
                                                            <span>{listing.area || 'Tagudin'}</span>
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
                                                        className={`flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white cursor-pointer ${
                                                            isPinned ? 'text-red-500' : 'text-slate-400 hover:text-red-500'
                                                        }`}
                                                        aria-label="Pin listing"
                                                    >
                                                        <Heart className={`size-4 ${isPinned ? 'fill-red-500' : ''}`} />
                                                    </button>
                                                    <div className="text-right">
                                                        <div className="font-mono text-base font-extrabold text-[#0F2F58]">
                                                            {priceDisplay}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">Fixed rate</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAddToCart(listing);
                                                        }}
                                                        className="flex size-9 items-center justify-center rounded-full bg-[#0F2F58] text-white shadow-xs hover:bg-[#153e74] cursor-pointer"
                                                    >
                                                        <Plus className="size-4" />
                                                    </button>
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
                    {/* Tier 1: Sticky Topbar with Search + Filter Action */}
                    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white px-4 pt-3 pb-2.5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-full bg-[#EBF2FA] text-[#0F2F58]">
                                    <MapPin className="size-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9.5px] font-extrabold tracking-wider text-slate-400 uppercase">
                                        Location
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-extrabold text-slate-900">
                                        Tagudin Centro
                                        <ChevronDown className="size-3 text-slate-500" />
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => alert(`Shortlist contains ${pinnedIds.length} pinned items.`)}
                                    className="relative flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs"
                                    aria-label="Wishlist"
                                >
                                    <Heart className="size-4" />
                                    {pinnedIds.length > 0 && (
                                        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#0F2F58] text-[9px] font-extrabold text-white">
                                            {pinnedIds.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="relative mt-2.5">
                            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search services (e.g. AC cleaning, repair, food)"
                                className="h-10 w-full rounded-full border border-slate-200 bg-[#F4F4F5] pr-10 pl-9.5 text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0F2F58] focus:bg-white"
                            />
                            {searchQuery ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400"
                                >
                                    <X className="size-3.5" />
                                </button>
                            ) : null}
                        </div>
                    </header>

                    {/* Tier 2: Category Tabs Bar */}
                    <CategoryTabs
                        categories={MARKETPLACE_CATEGORIES}
                        selectedCategory={selectedCategory}
                        onSelectCategory={(code) => {
                            setSelectedCategory(code);
                            const cat = MARKETPLACE_CATEGORIES.find((c) => c.code === code);
                            if (cat && code !== 'all') {
                                setMobileCategoryModal({ open: true, category: cat });
                            }
                        }}
                    />

                    {/* Tier 3: Spend Threshold Fee Tracker */}
                    <FeeThresholdTracker currentTotal={basketTotal} thresholdAmount={500} savingsAmount={45} />

                    {/* Tier 4: Quick Filter Chips */}
                    <FilterChipBar
                        options={MOBILE_FILTER_OPTIONS}
                        activeFilterIds={mobileFilterIds}
                        onToggleFilter={handleToggleMobileFilter}
                    />

                    {/* Results Feed */}
                    <div className="flex flex-col gap-3 p-4">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                            <span>{filteredListings.length} results in Tagudin</span>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={resetAllFilters}
                                    className="text-[#0F2F58] underline cursor-pointer"
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
                                    onSelect={(selected) => router.visit(`/listings/${selected.id}`)}
                                    onAddToCart={handleAddToCart}
                                />
                            ))
                        )}
                    </div>

                    {/* Floating Sticky Basket Bar */}
                    <StickyBasketBar
                        count={basket.reduce((sum, item) => sum + item.quantity, 0)}
                        totalAmount={basketTotal}
                        onViewBasket={() => setPicksOpen(true)}
                    />

                    {/* Bottom Navigation Bar */}
                    <BottomNavBar
                        activeTab={mobileActiveTab}
                        onTabSelect={(tab: NavTabId) => {
                            setMobileActiveTab(tab);
                            if (tab === 'explore') router.visit('/');
                            if (tab === 'saved') setPicksOpen(true);
                            if (tab === 'orders') router.visit('/orders');
                            if (tab === 'profile') router.visit('/my-listings');
                        }}
                    />
                </div>
            </div>

            {/* Mobile Category Glovo Wave Modal */}
            <GlovoWaveModal
                open={mobileCategoryModal.open}
                onClose={() => setMobileCategoryModal({ open: false, category: null })}
                title={mobileCategoryModal.category?.label || 'Tagudin Category'}
                subtitle={`Explore verified local providers offering ${mobileCategoryModal.category?.label.toLowerCase() || 'services'}`}
                bottomSlot={
                    <button
                        type="button"
                        onClick={() => setMobileCategoryModal({ open: false, category: null })}
                        className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-[#0F2F58] text-xs font-extrabold text-white shadow-md hover:bg-[#153e74]"
                    >
                        <span>View {categoryCounts[mobileCategoryModal.category?.code || 'all'] || 0} Listings in Tagudin</span>
                    </button>
                }
            >
                <div className="flex flex-col gap-2.5 py-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                        <div className="font-extrabold text-[#0F2F58]">Standard Barangay SLA</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                            Same-day intake &amp; milestone completion verified by photo evidence in Tagudin Centro.
                        </div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
                        <div className="font-extrabold text-emerald-800">Tiwala Escrow Protection</div>
                        <div className="text-[11px] text-emerald-700 mt-0.5">
                            Citizen funds stay protected in municipal escrow until you approve final milestone delivery.
                        </div>
                    </div>
                </div>
            </GlovoWaveModal>

            {/* Citizen Picks Drawer */}
            <PicksDrawer
                open={picksOpen}
                onClose={() => setPicksOpen(false)}
                items={basket}
                onUpdateQuantity={(id, delta) => {
                    setBasket((prev) =>
                        prev
                            .map((item) =>
                                item.id === id ? { ...item, quantity: item.quantity + delta } : item,
                            )
                            .filter((item) => item.quantity > 0),
                    );
                }}
                onRemoveItem={(id) => {
                    setBasket((prev) => prev.filter((item) => item.id !== id));
                }}
                onCheckout={() => {
                    alert(`Proceeding to Escrow Authorization for ${basket.length} picks totaling ₱${basketTotal.toFixed(2)}`);
                }}
            />
        </div>
    );
}
