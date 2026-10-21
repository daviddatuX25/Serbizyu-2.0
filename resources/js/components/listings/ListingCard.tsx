import { Link } from '@inertiajs/react';
import { Video } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ListingRecord } from '../../types';
import { CategoryVisualFallback } from './ListingMediaPicker';
import { ListingStatusBadge, normalizeListingStatus } from './ListingStatusBadge';
export type ListingCardVariant = 'public' | 'owner' | 'preview';

function field(listing: ListingRecord, ...keys: Array<keyof ListingRecord | string>): string {
    for (const key of keys) {
        const value = (listing as Record<string, unknown>)[key as string];
        if (typeof value === 'string' && value.trim() !== '') {
            return value.trim();
        }
    }

    return '';
}

function ownerName(listing: ListingRecord): string {
    return (
        field(listing, 'ownerName', 'owner_name') ||
        listing.owner?.displayName ||
        listing.owner?.display_name ||
        ''
    );
}

export function ListingCard({
    listing,
    variant = 'public',
    href,
    footer,
    className = '',
}: {
    listing: ListingRecord;
    variant?: ListingCardVariant;
    href?: string | null;
    footer?: ReactNode;
    className?: string;
}) {
    const status = normalizeListingStatus(listing.status ?? listing.state);
    const title =
        listing.title?.trim() ||
        (variant === 'preview' ? 'Your listing title' : 'Untitled listing');
    const description =
        listing.description?.trim() ||
        (variant === 'preview'
            ? 'Your description will appear here after you add it.'
            : 'No description yet.');
    const area = field(listing, 'area', 'locality') || 'Tagudin';
    const listingType = field(listing, 'listingType', 'listing_type') || 'service';
    const category = field(listing, 'categoryCode', 'category_code') || 'local-services';
    const provider = ownerName(listing);
    const showOwnerChrome = variant === 'owner' || variant === 'preview';
    const coverThumb = listing.cover_thumbnail_url ?? listing.media?.cover_thumbnail_url ?? null;
    const hasVideo = Boolean(listing.has_video ?? listing.media?.has_video);
    const priceMinor = listing.price_amount_minor;
    const stagesCount =
        (listing.milestone_stages ?? listing.milestoneStages ?? []).length;
    const dealChainCount = (listing.deal_chain_combinations ?? []).length;
    const builderHref =
        listing.id && status === 'draft'
            ? `/listings/create/${listingType === 'product' ? 'product' : 'service'}?edit=${listing.id}`
            : null;

    const noteParts = [
        provider && variant === 'public' ? provider : null,
        area,
        listingType,
        variant === 'public' ? 'Active locally' : null,
        variant === 'preview' ? 'Preview only' : null,
        variant === 'owner' && status === 'pending_review' ? 'Not public yet' : null,
        variant === 'owner' && status === 'draft' ? 'Private draft' : null,
    ].filter(Boolean);

    const body = (
        <>
            {coverThumb ? (
                <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <img
                        src={coverThumb}
                        alt={title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                    <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-[#0F2F58]/90 px-2.5 py-0.5 text-[9.5px] font-extrabold text-white uppercase backdrop-blur-xs">
                            {listingType}
                        </span>
                        {hasVideo && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2 py-0.5 text-[9.5px] font-extrabold text-white uppercase backdrop-blur-xs">
                                <Video className="size-2.5 text-[#FFC72C]" />
                                <span>Video</span>
                            </span>
                        )}
                    </div>
                    {typeof priceMinor === 'number' && priceMinor > 0 && (
                        <div className="absolute right-2 bottom-2 rounded-lg bg-white/95 px-2 py-0.5 font-mono text-xs font-extrabold text-[#0F2F58] shadow-xs">
                            ₱{(priceMinor / 100).toFixed(2)}
                        </div>
                    )}
                </div>
            ) : showOwnerChrome ? (
                <div className="relative mb-3 h-28 w-full overflow-hidden rounded-xl border border-slate-200">
                    <CategoryVisualFallback categoryCode={category} title={title} />
                </div>
            ) : null}
            <div className="sz-listing-card-top">
                <div>
                    <p className="sz-eyebrow">
                        {listingType} · {area}
                    </p>
                    <h3 className="sz-section-title">{title}</h3>
                </div>
                {showOwnerChrome || status !== 'active' ? (
                    <ListingStatusBadge
                        status={status}
                        version={showOwnerChrome ? (listing.version ?? 1) : null}
                    />
                ) : null}
            </div>
            <p className="sz-copy sz-listing-card-copy">{description}</p>
            <p className="sz-auth-note" style={{ margin: 0 }}>
                {noteParts.join(' · ')}
            </p>
            <div className="sz-listing-card-meta">
                <span>{category}</span>
                {showOwnerChrome ? <span>{listingType}</span> : null}
                {showOwnerChrome ? <span>{area}</span> : null}
                {stagesCount > 0 ? <span>{stagesCount} work steps</span> : null}
                {dealChainCount > 0 ? <span>{dealChainCount} deal chains</span> : null}
            </div>
            {variant === 'owner' && builderHref && !href ? (
                <div className="mt-2 pt-2 border-t border-slate-100">
                    <Link
                        href={builderHref}
                        className="text-xs font-extrabold text-[#0F2F58] hover:underline"
                    >
                        Edit in Studio Builder ↗
                    </Link>
                </div>
            ) : null}
            {footer}
        </>
    );
    const classes = `sz-listing-card sz-listing-card-${variant} ${className}`.trim();

    if (href) {
        return (
            <Link href={href} className={classes} aria-label={`Open listing ${title}`}>
                {body}
            </Link>
        );
    }

    return (
        <article className={classes} aria-label={title}>
            {body}
        </article>
    );
}

export function ListingCardGrid({ children }: { children: ReactNode }) {
    return <div className="sz-listing-grid">{children}</div>;
}
