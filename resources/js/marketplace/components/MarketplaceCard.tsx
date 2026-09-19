import React from 'react';
import { Plus } from 'lucide-react';
import type { ListingRecord } from '@/types';

interface MarketplaceCardProps {
    listing: ListingRecord;
    onSelect: (listing: ListingRecord) => void;
    onAddToCart: (listing: ListingRecord) => void;
}

const CATEGORY_IMAGES: Record<string, string> = {
    'repairs': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&auto=format&fit=crop&q=80',
    'home-cleaning': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=80',
    'courier': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&auto=format&fit=crop&q=80',
    'greeting-cards': 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=300&auto=format&fit=crop&q=80',
    'local-food': 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=300&auto=format&fit=crop&q=80',
    'default': 'https://images.unsplash.com/photo-1581092918056-0c4c5acdfb82?w=300&auto=format&fit=crop&q=80',
};

export const MarketplaceCard: React.FC<MarketplaceCardProps> = ({
    listing,
    onSelect,
    onAddToCart,
}) => {
    const categoryKey = (listing.category_code || listing.categoryCode || 'default').toLowerCase();
    const photoUrl = CATEGORY_IMAGES[categoryKey] || CATEGORY_IMAGES['default'];

    // Convert minor price (e.g. 45000) to formatted peso string
    const rawMinor = listing.price_amount_minor;
    const priceDisplay = rawMinor ? `₱${(rawMinor / 100).toFixed(2)}` : '₱80.00';

    return (
        <article
            onClick={() => onSelect(listing)}
            className="flex cursor-pointer gap-3 rounded-2xl border border-black/3 bg-white p-3.5 shadow-[0_4px_14px_rgba(0,0,0,0.05)] transition-all active:scale-[0.985] hover:shadow-[0_6px_20px_rgba(0,0,0,0.07)]"
        >
            {/* Left 65% Text Column */}
            <div className="flex flex-1 flex-col justify-between">
                <div>
                    <h3 className="line-clamp-2 text-[14px] font-extrabold leading-tight text-[#18181B]">
                        {listing.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#52525B]">
                        {listing.description || 'Verified local service in Tagudin, Ilocos Sur.'}
                    </p>
                </div>

                <div className="mt-2 flex items-center justify-between">
                    <span className="text-[14px] font-extrabold text-[#18181B]">{priceDisplay}</span>
                    <span className="text-[11px] font-semibold text-[#0F2F58]">
                        {listing.area || 'Tagudin'}
                    </span>
                </div>
            </div>

            {/* Right 35% Square Thumbnail Column with Overlaid FAB */}
            <div className="relative size-23.5 shrink-0 overflow-hidden rounded-xl bg-[#E5E7EB]">
                <img
                    src={photoUrl}
                    alt={listing.title}
                    className="size-full object-cover"
                    loading="lazy"
                />
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(listing);
                    }}
                    className="absolute right-1.5 bottom-1.5 flex size-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#FFC244] text-[#18181B] shadow-md transition-transform active:scale-90 hover:scale-105"
                    aria-label={`Add ${listing.title}`}
                >
                    <Plus className="size-4 stroke-[2.5]" />
                </button>
            </div>
        </article>
    );
};
