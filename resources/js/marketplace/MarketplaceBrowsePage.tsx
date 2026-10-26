import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import type { ListingRecord } from '@/types';
import type { BasketItem, MarketplaceBrowseProps, MarketplaceCategory } from './types';
import { MarketplaceHeader } from './components/MarketplaceHeader';
import { CategoryTabs } from './components/CategoryTabs';
import { FeeThresholdTracker } from './components/FeeThresholdTracker';
import { FilterChipBar, type FilterOption } from './components/FilterChipBar';
import { MarketplaceCard } from './components/MarketplaceCard';
import { StickyBasketBar } from './components/StickyBasketBar';
import { BottomNavBar, type NavTabId } from './components/BottomNavBar';

const DEFAULT_CATEGORIES: MarketplaceCategory[] = [
    { code: 'all', label: 'All Services' },
    { code: 'repairs', label: 'Repairs & AC' },
    { code: 'home-cleaning', label: 'Home Cleaning' },
    { code: 'courier', label: 'Courier & Padala' },
    { code: 'greeting-cards', label: 'Greeting Cards' },
    { code: 'local-food', label: 'Local Food' },
];

const FILTER_OPTIONS: FilterOption[] = [
    { id: 'top_rated', label: 'Top Rated (4.8+)', hasStarIcon: true },
    { id: 'available_today', label: 'Available Today' },
    { id: 'verified_pro', label: 'Police Cleared Pro' },
    { id: 'under_500', label: 'Under ₱500' },
];

export const MarketplaceBrowsePage: React.FC<MarketplaceBrowseProps> = ({
    publicListings = [],
    listings = [],
    categories = DEFAULT_CATEGORIES,
    currentArea = 'Tagudin Town Center',
    onItemSelect,
    onAddToCart,
}) => {
    const rawListings = publicListings.length > 0 ? publicListings : listings;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [activeFilterIds, setActiveFilterIds] = useState<string[]>(['top_rated']);
    const [activeTab, setActiveTab] = useState<NavTabId>('explore');
    const [basket, setBasket] = useState<BasketItem[]>([]);

    const toggleFilter = (filterId: string) => {
        setActiveFilterIds((prev) =>
            prev.includes(filterId) ? prev.filter((id) => id !== filterId) : [...prev, filterId],
        );
    };

    const handleAddToCart = (item: ListingRecord) => {
        const isProduct = (item.listing_type || item.listingType) === 'product';
        const needsSellerSelection =
            isProduct || (item.package_tiers?.length ?? item.packageTiers?.length ?? 0) > 0;
        const rawMinor = item.price_amount_minor;

        if (needsSellerSelection || typeof rawMinor !== 'number' || rawMinor <= 0) {
            router.visit(`/listings/${item.id}`);
            return;
        }

        const price = rawMinor / 100;
        const listingContext = {
            listing_id: item.id,
            listing_version_id: item.listing_version_id ?? null,
            variant_id: null,
            package_id: null,
            deal_chain_combination_id: null,
            category_code: item.category_code ?? item.categoryCode ?? null,
            listing_type: item.listing_type ?? item.listingType ?? null,
            work_shape: item.work_shape ?? item.workShape ?? null,
        };

        setBasket((prev) => {
            const existing = prev.find((basketItem) => basketItem.id === item.id);
            if (existing) {
                return prev.map((basketItem) =>
                    basketItem.id === item.id
                        ? { ...basketItem, ...listingContext, quantity: basketItem.quantity + 1 }
                        : basketItem,
                );
            }
            return [...prev, {
                id: item.id,
                title: item.title,
                price,
                quantity: 1,
                ...listingContext,
            }];
        });

        onAddToCart?.(item);
    };

    const basketCount = useMemo(
        () => basket.reduce((sum, item) => sum + item.quantity, 0),
        [basket],
    );

    const basketTotal = useMemo(
        () => basket.reduce((sum, item) => sum + item.price * item.quantity, 0),
        [basket],
    );

    const filteredListings = useMemo(() => {
        return rawListings.filter((item) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = item.title.toLowerCase().includes(q);
                const matchDesc = (item.description || '').toLowerCase().includes(q);
                if (!matchTitle && !matchDesc) {
                    return false;
                }
            }

            if (selectedCategory !== 'all') {
                const cat = (item.category_code || item.categoryCode || '').toLowerCase();
                if (cat !== selectedCategory.toLowerCase()) {
                    return false;
                }
            }

            return true;
        });
    }, [rawListings, searchQuery, selectedCategory]);

    return (
        <div className="flex min-h-screen flex-col items-center bg-[#F8F9FA] pb-[90px] font-['Plus_Jakarta_Sans',sans-serif]">
            <div className="flex min-h-screen w-full max-w-[680px] flex-col bg-white shadow-[0_0_40px_rgba(0,0,0,0.06)]">
                {/* Top Location & Search Header */}
                <MarketplaceHeader
                    areaName={currentArea}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />

                {/* Horizontal Category Pill Tabs (Glovo Exact Pattern) */}
                <CategoryTabs
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                />

                {/* Spend Threshold Fee Tracker */}
                <FeeThresholdTracker
                    currentTotal={basketTotal}
                    thresholdAmount={500}
                    savingsAmount={45}
                />

                {/* Quick Filter Chips */}
                <FilterChipBar
                    options={FILTER_OPTIONS}
                    activeFilterIds={activeFilterIds}
                    onToggleFilter={toggleFilter}
                />

                {/* Feed Zone */}
                <main className="flex flex-1 flex-col gap-3.5 bg-[#F8F9FA] p-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[16px] font-extrabold text-[#18181B]">
                            Services in {currentArea}
                        </h2>
                        <span className="text-[12px] font-bold text-[#0F2F58]">
                            {filteredListings.length} available
                        </span>
                    </div>

                    {filteredListings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E4E4E7] bg-white p-8 text-center">
                            <p className="text-[14px] font-bold text-[#18181B]">
                                No services found
                            </p>
                            <p className="mt-1 text-[12px] text-[#71717A]">
                                Try clearing search keywords or switching category filters.
                            </p>
                        </div>
                    ) : (
                        filteredListings.map((listing) => (
                            <MarketplaceCard
                                key={listing.id}
                                listing={listing}
                                onSelect={(l) => onItemSelect?.(l)}
                                onAddToCart={handleAddToCart}
                            />
                        ))
                    )}
                </main>

                {/* Floating Bottom Pill CTA */}
                <StickyBasketBar
                    count={basketCount}
                    totalAmount={basketTotal}
                    onViewBasket={() => {
                        // Hook up to Checkout / Basket drawer
                    }}
                />

                {/* 5-Tab Thumb-Zone Bottom Navigation */}
                <BottomNavBar
                    activeTab={activeTab}
                    ordersCount={basketCount}
                    onTabSelect={(tab) => {
                        if (tab === 'invitations') router.visit('/deal-invitations');
                        else setActiveTab(tab);
                    }}
                />
            </div>
        </div>
    );
};

export default MarketplaceBrowsePage;
