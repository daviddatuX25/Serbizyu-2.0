import type { ListingRecord } from '../../types';
import { Notice } from '../ui';
import { ListingCard } from './ListingCard';

export function ListingPreview({
    listing,
    visibilityNote,
}: {
    listing: ListingRecord;
    visibilityNote?: string;
}) {
    const status = listing.status ?? listing.state ?? 'draft';
    const note =
        visibilityNote ??
        (status === 'pending_review'
            ? 'Pending review is still private.'
            : status === 'active'
              ? 'This is how the listing appears when active.'
              : 'This preview is local and not public.');

    return (
        <div className="sz-listing-preview" aria-label="Buyer preview">
            <p className="sz-eyebrow">Buyer preview</p>
            <ListingCard listing={listing} variant="preview" />
            <Notice tone="neutral" title="Visibility">
                {note}
            </Notice>
        </div>
    );
}
