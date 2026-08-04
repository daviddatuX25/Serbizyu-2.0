import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import type { ListingRecord } from '../../types';
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
    const title = listing.title?.trim() || (variant === 'preview' ? 'Your listing title' : 'Untitled listing');
    const description =
        listing.description?.trim() ||
        (variant === 'preview' ? 'Your description will appear here after you add it.' : 'No description yet.');
    const area = field(listing, 'area', 'locality') || 'Tagudin';
    const listingType = field(listing, 'listingType', 'listing_type') || 'service';
    const category = field(listing, 'categoryCode', 'category_code') || 'local-services';
    const provider = ownerName(listing);
    const showOwnerChrome = variant === 'owner' || variant === 'preview';

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
            <div className="sz-listing-card-top">
                <div>
                    <p className="sz-eyebrow">
                        {listingType} · {area}
                    </p>
                    <h3 className="sz-section-title">{title}</h3>
                </div>
                {showOwnerChrome || status !== 'active' ? (
                    <ListingStatusBadge status={status} version={showOwnerChrome ? (listing.version ?? 1) : null} />
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
            </div>
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
