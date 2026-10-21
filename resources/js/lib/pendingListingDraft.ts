export type ListingBuilderKind = 'product' | 'service';

const STORAGE_KEY_BY_KIND: Record<ListingBuilderKind, string> = {
    product: 'serbizyu.pending-listing.product.v1',
    service: 'serbizyu.pending-listing.service.v1',
};

interface PendingDraftEnvelope {
    version: 1;
    draft: unknown;
}

function isPendingDraftEnvelope(value: unknown): value is PendingDraftEnvelope {
    return (
        typeof value === 'object' &&
        value !== null &&
        'version' in value &&
        value.version === 1 &&
        'draft' in value
    );
}

export function savePendingListingDraft(kind: ListingBuilderKind, draft: unknown): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        window.sessionStorage.setItem(
            STORAGE_KEY_BY_KIND[kind],
            JSON.stringify({ version: 1, draft } satisfies PendingDraftEnvelope),
        );

        return true;
    } catch {
        return false;
    }
}

export function readPendingListingDraft(kind: ListingBuilderKind): unknown | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const stored = window.sessionStorage.getItem(STORAGE_KEY_BY_KIND[kind]);
        if (stored === null) {
            return null;
        }

        const parsed: unknown = JSON.parse(stored);
        if (!isPendingDraftEnvelope(parsed)) {
            window.sessionStorage.removeItem(STORAGE_KEY_BY_KIND[kind]);
            return null;
        }

        return parsed.draft;
    } catch {
        return null;
    }
}

export function clearPendingListingDraft(kind: ListingBuilderKind): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.sessionStorage.removeItem(STORAGE_KEY_BY_KIND[kind]);
    } catch {
        // Restricted storage does not prevent the listing form from rendering.
    }
}
