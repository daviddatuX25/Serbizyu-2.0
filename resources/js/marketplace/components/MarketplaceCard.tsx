import React from 'react';
import { Star, MapPin } from 'lucide-react';
import type { ListingRecord } from '@/types';
import { formatListingLocation } from '@/lib/philippineAddresses';
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

export const MarketplaceCard: React.FC<MarketplaceCardProps> = ({ listing, onSelect }) => {
    const categoryKey = (listing.category_code || listing.categoryCode || 'default').toLowerCase();
    const photoUrl = CATEGORY_IMAGES[categoryKey] || CATEGORY_IMAGES['default'];

    const rawMinor = listing.price_amount_minor;
    const priceDisplay = typeof rawMinor === 'number' && Number.isFinite(rawMinor)
        ? `₱${(rawMinor / 100).toFixed(2)}`
        : 'Price unavailable';
    const rating = listing.rating_summary?.reviews_count && typeof listing.rating_summary.rating === 'number'
        ? listing.rating_summary.rating.toFixed(1)
        : null;
    const locationText = formatListingLocation(listing);
    return (
        <article
            onClick={() => onSelect(listing)}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_5.875rem] items-start gap-3 rounded-2xl border border-black/3 bg-white p-3.5 shadow-[0_4px_14px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.07)] active:scale-[0.985]"
        >
            <div className="flex min-w-0 flex-col gap-2">
                <div>
                    <h3 className="line-clamp-2 break-words [overflow-wrap:anywhere] text-[14px] leading-tight font-extrabold text-[#18181B]">
                        {listing.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 break-words [overflow-wrap:anywhere] text-[11px] leading-relaxed text-[#52525B]">
                        {listing.description || 'Verified local service in Tagudin, Ilocos Sur.'}
                    </p>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 break-words [overflow-wrap:anywhere] text-[14px] font-extrabold text-[#18181B]">
                        {priceDisplay}
                    </span>
                    {rating === null ? (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-600">
                            No reviews
                        </span>
                    ) : (
                        <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-800">
                            <Star className="size-3 fill-amber-500 text-amber-500" />
                            <span>{rating}</span>
                        </span>
                    )}
                </div>
                <div className="flex min-w-0 items-start gap-1 text-[11px] font-semibold text-[#0F2F58]" title={locationText}>
                    <MapPin className="mt-0.5 size-3 shrink-0 text-[#0F2F58]/70" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{locationText}</span>
                </div>
            </div>

            <div className="relative size-23.5 min-w-0 shrink-0 overflow-hidden rounded-xl bg-[#E5E7EB]">
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
