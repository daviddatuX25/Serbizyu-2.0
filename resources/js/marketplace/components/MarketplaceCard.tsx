import React from 'react';
import { Star } from 'lucide-react';
import type { ListingRecord } from '@/types';
interface MarketplaceCardProps {
    listing: ListingRecord;
    onSelect: (listing: ListingRecord) => void;
    onAddToCart?: (listing: ListingRecord) => void;
}

const CATEGORY_IMAGES: Record<string, string> = {
    repairs: '/photos/ac-clean.jpg',
    'home-cleaning': '/photos/req-electrician.jpg',
    courier: '/photos/courier.jpg',
    'greeting-cards': '/photos/greeting.jpg',
    'local-food': '/photos/bibingka.jpg',
    'print-assist': '/photos/greeting.jpg',
    default: '/photos/ac-clean.jpg',
};

export const MarketplaceCard: React.FC<MarketplaceCardProps> = ({
    listing,
    onSelect,
}) => {
    const categoryKey = (listing.category_code || listing.categoryCode || 'default').toLowerCase();
    const photoUrl = CATEGORY_IMAGES[categoryKey] || CATEGORY_IMAGES['default'];

    // Convert minor price (e.g. 45000) to formatted peso string
    const rawMinor = listing.price_amount_minor;
    const priceDisplay = rawMinor ? `₱${(rawMinor / 100).toFixed(2)}` : '₱80.00';

    return (
        <article
            onClick={() => onSelect(listing)}
            className="flex cursor-pointer gap-3 rounded-2xl border border-black/3 bg-white p-3.5 shadow-[0_4px_14px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.07)] active:scale-[0.985]"
        >
            {/* Left 65% Text Column */}
            <div className="flex flex-1 flex-col justify-between">
                <div>
                    <h3 className="line-clamp-2 text-[14px] leading-tight font-extrabold text-[#18181B]">
                        {listing.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#52525B]">
                        {listing.description || 'Verified local service in Tagudin, Ilocos Sur.'}
                    </p>
                </div>

                <div className="mt-2 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[14px] font-extrabold text-[#18181B]">
                            {priceDisplay}
                        </span>
                        <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-800">
                            <Star className="size-3 fill-amber-500 text-amber-500" />
                            <span>4.9</span>
                        </span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#0F2F58]">
                        {listing.area || 'Tagudin'}
                    </span>
                </div>
            </div>

            {/* Right 35% Square Thumbnail Column */}
            <div className="relative size-23.5 shrink-0 overflow-hidden rounded-xl bg-[#E5E7EB]">
                <img
                    src={photoUrl}
                    alt={listing.title}
                    className="size-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/photos/ac-clean.jpg';
                    }}
                />
            </div>
        </article>
    );
};
