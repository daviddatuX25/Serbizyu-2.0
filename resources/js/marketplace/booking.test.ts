import { afterEach, describe, expect, it } from 'vitest';
import { listingBookingUrl, readPicksBasket } from './booking';

describe('Picks booking boundary', () => {
    afterEach(() => window.localStorage.clear());

    it('migrates the known legacy UUID basket key to listing_id and retains selected terms', () => {
        const listingId = '0198a3b1-7c40-7abc-8def-5234567890bb';
        window.localStorage.setItem('serbizyu.picks', JSON.stringify([{
            id: listingId,
            title: 'Blue capacitor',
            price: 184,
            quantity: 2,
            listing_type: 'product',
            variant_id: 'variant-blue',
            package_id: null,
            listing_version_id: '0198a3b1-7c40-7abc-8def-6234567890bb',
        }]));

        const [item] = readPicksBasket(window.localStorage);

        expect(item).toMatchObject({
            id: listingId,
            listing_id: listingId,
            variant_id: 'variant-blue',
            package_id: null,
            quantity: 2,
            listing_version_id: '0198a3b1-7c40-7abc-8def-6234567890bb',
        });
        expect(window.localStorage.getItem('serbizyu.picks.schema')).toBe('2');
        expect(JSON.parse(window.localStorage.getItem('serbizyu.picks') ?? '[]')[0].listing_id).toBe(listingId);

        const url = listingBookingUrl(item, 'http://localhost');
        expect(url).toContain(`/listings/${listingId}/book`);
        expect(url).toContain('variant_id=variant-blue');
        expect(url).toContain('quantity=2');
        expect(url).toContain('listing_version_id=0198a3b1-7c40-7abc-8def-6234567890bb');
    });

    it('does not invent a listing id from a composite display key', () => {
        window.localStorage.setItem('serbizyu.picks', JSON.stringify([{
            id: 'listing-1:variant-blue:',
            title: 'Blue capacitor',
            price: 184,
            quantity: 1,
            variant_id: 'variant-blue',
        }]));

        const [item] = readPicksBasket(window.localStorage);

        expect(item.listing_id).toBeUndefined();
        expect(listingBookingUrl(item, 'http://localhost')).toBeNull();
        expect(JSON.parse(window.localStorage.getItem('serbizyu.picks') ?? '[]')[0].listing_id).toBeUndefined();
    });
});
