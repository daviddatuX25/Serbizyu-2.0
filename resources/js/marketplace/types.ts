import type { ListingRecord, SliceSession } from '@/types';

export type MarketplaceCategory = {
    code: string;
    label: string;
    icon?: string;
};

export type DealChainNode = {
    key: string;
    id?: string;
    role: string;
    title: string;
    sub: string;
    type: 'store' | 'delivery' | 'labor' | 'audit' | 'recycle';
    listingId?: string;
    providerId?: string;
    priceMinor?: number;
    image?: string;
    providerName?: string;
};

export interface SlotCandidateListing {
    id: string;
    title: string;
    provider_name: string;
    provider_user_id?: string;
    area: string;
    price_minor: number;
    priceMinor?: number;
    sla_text: string;
    photo_url?: string;
    rating?: number;
    role: 'STORE' | 'COURIER' | 'LABOR' | 'AUDIT' | 'RECYCLE';
}

export type DealChainRecipeId =
    | 'turnkey_parts'
    | 'courier_delivery'
    | 'safety_audit'
    | 'product_install'
    | 'food_beverage_relay'
    | 'craft_gift_relay'
    | 'print_courier_relay'
    | 'garment_relay'
    | 'market_hauling_relay'
    | 'direct';
export type PublishedDealChainRecipeId = Exclude<DealChainRecipeId, 'direct'>;

export type AttachedDealChain = {
    recipeId: DealChainRecipeId;
    title: string;
    extraFee: number;
    nodes: DealChainNode[];
};

export type BasketItem = {
    id: string;
    title: string;
    price: number;
    quantity: number;
    listing_id?: string;
    listing_version_id?: string | null;
    variant_id?: string | null;
    package_id?: string | null;
    addon_ids?: string[];
    addon_titles?: string[];
    deal_chain_combination_id?: string | null;
    deal_chain_title?: string | null;
    variant_available?: number | null;
    category_code?: string | null;
    listing_type?: string | null;
    work_shape?: string | null;
    image?: string | null;
    providerName?: string | null;
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
