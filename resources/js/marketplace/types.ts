import type { ListingRecord, SliceSession } from '@/types';

export type MarketplaceCategory = {
    code: string;
    label: string;
    icon?: string;
};

export type BasketItem = {
    id: string;
    title: string;
    price: number;
    quantity: number;
    notes?: string;
};

export type MarketplaceBrowseProps = {
    listings?: ListingRecord[];
    publicListings?: ListingRecord[];
    categories?: MarketplaceCategory[];
    session?: SliceSession | null;
    currentArea?: string;
    onItemSelect?: (listing: ListingRecord) => void;
    onAddToCart?: (listing: ListingRecord) => void;
};
