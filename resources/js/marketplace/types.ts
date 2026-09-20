import type { ListingRecord, SliceSession } from '@/types';

export type MarketplaceCategory = {
    code: string;
    label: string;
    icon?: string;
};

export type DealChainNode = {
    role: string;
    title: string;
    sub: string;
    type: 'store' | 'delivery' | 'labor' | 'audit';
};

export type AttachedDealChain = {
    recipeId: 'turnkey_parts' | 'courier_delivery' | 'safety_audit' | 'direct';
    title: string;
    extraFee: number;
    nodes: DealChainNode[];
};

export type BasketItem = {
    id: string;
    title: string;
    price: number;
    quantity: number;
    notes?: string;
    dealChain?: AttachedDealChain;
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
