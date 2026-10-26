import type { BasketItem } from './types';

const PICKS_STORAGE_SCHEMA_VERSION = '2';
const LEGACY_LISTING_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readPicksBasket(storage: Storage): BasketItem[] {
    const serialized = storage.getItem('serbizyu.picks');
    if (!serialized) return [];

    const decoded: unknown = JSON.parse(serialized);
    if (!Array.isArray(decoded)) return [];
    const entries = decoded.filter((entry): entry is BasketItem =>
        typeof entry === 'object' && entry !== null && 'id' in entry && typeof entry.id === 'string',
    );

    if (storage.getItem('serbizyu.picks.schema') === PICKS_STORAGE_SCHEMA_VERSION) {
        return entries;
    }

    const migrated = entries.map((entry) => {
        if (typeof entry.listing_id === 'string' || !LEGACY_LISTING_UUID.test(entry.id)) {
            return entry;
        }

        return { ...entry, listing_id: entry.id };
    });
    savePicksBasket(storage, migrated);

    return migrated;
}

export function savePicksBasket(storage: Storage, items: BasketItem[]): void {
    storage.setItem('serbizyu.picks', JSON.stringify(items));
    storage.setItem('serbizyu.picks.schema', PICKS_STORAGE_SCHEMA_VERSION);
}

/** Resolve a Picks item to a booking endpoint without interpreting its display key as a listing id. */
export function listingBookingUrl(item: BasketItem, origin: string): string | null {
    if (!item.listing_id) return null;

    if (item.listing_type === 'product' && !item.variant_id && !item.package_id) {
        return `/listings/${encodeURIComponent(item.listing_id)}`;
    }

    const url = new URL(`/listings/${encodeURIComponent(item.listing_id)}/book`, origin);
    if (item.variant_id) url.searchParams.set('variant_id', item.variant_id);
    if (item.package_id) url.searchParams.set('package_id', item.package_id);
    url.searchParams.set('quantity', String(item.quantity));
    if (item.listing_version_id) url.searchParams.set('listing_version_id', item.listing_version_id);
    for (const addonId of item.addon_ids ?? []) {
        url.searchParams.append('addon_ids[]', addonId);
    }
    if (item.deal_chain_combination_id) {
        url.searchParams.set('deal_chain_combination_id', item.deal_chain_combination_id);
    }

    return `${url.pathname}${url.search}`;
}
