import type { AttachedDealChain, PublishedDealChainRecipeId } from './types';

export interface DealChainRecipeDefinition extends AttachedDealChain {
    recipeId: PublishedDealChainRecipeId;
    pattern: 'repair' | 'delivery' | 'audit' | 'multi';
    patternCapsule: string[];
    rating: string;
    bookedCount: string;
    desc: string;
    applicableCategories: string[];
    applicableListingTypes?: string[];
    applicableWorkShapes?: string[];
}

const REPAIR_CATEGORIES = ['repairs', 'local-services'];
const DELIVERY_CATEGORIES = [
    'local-food',
    'crafts',
    'print-assist',
    'repairs',
    'home-help',
    'local-services',
    'courier',
];

export const CANONICAL_DEAL_CHAIN_RECIPES: Record<
    PublishedDealChainRecipeId,
    DealChainRecipeDefinition
> = {
    turnkey_parts: {
        recipeId: 'turnkey_parts',
        pattern: 'repair',
        patternCapsule: ['STORE', 'COURIER', 'LABOR'],
        title: 'All-In Parts, Courier & Labor',
        extraFee: 215,
        rating: '4.9',
        bookedCount: '84 booked in Tagudin',
        desc: 'Genuine parts sourced from Tagudin Hardware + Danny Express motorcycle courier + certified on-site technician.',
        applicableCategories: REPAIR_CATEGORIES,
        applicableListingTypes: ['service'],
        nodes: [
            {
                key: 'part',
                role: 'Part',
                title: '35uF AC Run Cap.',
                sub: 'Tagudin Hardware Depot',
                type: 'store',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890ba',
                providerName: 'Tagudin Hardware Depot',
                image: '/photos/ac-capacitor.jpg',
                priceMinor: 18000,
            },
            {
                key: 'courier',
                role: 'Rider',
                title: 'Danny Express',
                sub: 'On-demand ~20 mins transit',
                type: 'delivery',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b9',
                providerName: 'Danny Express Motorcycle Pool',
                image: '/photos/courier.jpg',
                priceMinor: 3500,
            },
            {
                key: 'labor',
                role: 'Labor',
                title: 'Primary Listing',
                sub: 'Verified Technician',
                type: 'labor',
                image: '/photos/ac-clean.jpg',
            },
        ],
    },
    courier_delivery: {
        recipeId: 'courier_delivery',
        pattern: 'delivery',
        patternCapsule: ['STORE', 'COURIER'],
        title: 'Doorstep Courier Transit',
        extraFee: 35,
        rating: '4.8',
        bookedCount: '31 booked in Tagudin',
        desc: 'Danny Express motorcycle courier collects your items or tools and provides same-day delivery.',
        applicableCategories: DELIVERY_CATEGORIES,
        nodes: [
            {
                key: 'store',
                role: 'Store',
                title: 'Counter Pickup',
                sub: 'Tagudin Source',
                type: 'store',
                image: '/photos/ac-capacitor.jpg',
            },
            {
                key: 'courier',
                role: 'Rider',
                title: 'Danny Express',
                sub: 'Fast point-to-point courier',
                type: 'delivery',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b9',
                providerName: 'Danny Express Motorcycle Pool',
                image: '/photos/courier.jpg',
                priceMinor: 3500,
            },
            {
                key: 'primary',
                role: 'Destination',
                title: 'Primary Listing',
                sub: 'Customer Doorstep',
                type: 'labor',
                image: '/photos/ac-clean.jpg',
            },
        ],
    },
    safety_audit: {
        recipeId: 'safety_audit',
        pattern: 'audit',
        patternCapsule: ['LABOR', 'AUDIT'],
        title: 'Labor + Safety & Quality Certification',
        extraFee: 65,
        rating: '4.9',
        bookedCount: '19 booked in Tagudin',
        desc: 'Master electrician electrical load safety certification and barangay safety compliance audit.',
        applicableCategories: REPAIR_CATEGORIES,
        applicableListingTypes: ['service'],
        nodes: [
            {
                key: 'primary',
                role: 'Labor',
                title: 'Primary Listing',
                sub: 'Certified Labor Provider',
                type: 'labor',
                image: '/photos/ac-clean.jpg',
            },
            {
                key: 'audit',
                role: 'Audit',
                title: 'Safety Inspection',
                sub: 'Master Electrician',
                type: 'audit',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890bc',
                providerName: 'Safety Check (Master Electrician)',
                image: '/photos/req-electrician.jpg',
                priceMinor: 15000,
            },
        ],
    },
    product_install: {
        recipeId: 'product_install',
        pattern: 'multi',
        patternCapsule: ['STORE', 'COURIER', 'LABOR'],
        title: 'Product Delivery + Installation',
        extraFee: 285,
        rating: '4.9',
        bookedCount: '52 booked in Tagudin',
        desc: 'The selected product is handed to a courier and followed by a separate installation agreement.',
        applicableCategories: REPAIR_CATEGORIES,
        applicableListingTypes: ['product'],
        nodes: [
            {
                key: 'primary',
                role: 'Product',
                title: 'Primary Listing',
                sub: 'Stall Counter Ready',
                type: 'store',
                image: '/photos/ac-capacitor.jpg',
            },
            {
                key: 'courier',
                role: 'Rider',
                title: 'Danny Express',
                sub: 'Courier Transport Runner',
                type: 'delivery',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b9',
                providerName: 'Danny Express Motorcycle Pool',
                image: '/photos/courier.jpg',
                priceMinor: 3500,
            },
            {
                key: 'installation',
                role: 'Labor',
                title: 'Installation Provider',
                sub: 'Kuya Ben AC Services',
                type: 'labor',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890bb',
                providerName: 'Kuya Ben Aircon Services',
                image: '/photos/ac-clean.jpg',
                priceMinor: 25000,
            },
        ],
    },
    food_beverage_relay: {
        recipeId: 'food_beverage_relay',
        pattern: 'delivery',
        patternCapsule: ['STORE', 'COURIER'],
        title: 'Oven-Fresh Bibingka + Local Drink + Thermal Courier',
        extraFee: 110,
        rating: '4.9',
        bookedCount: '38 booked in Tagudin',
        desc: 'Fresh morning bibingka paired with local beverage and rapid insulated thermal courier delivery across Tagudin.',
        applicableCategories: ['local-food'],
        applicableListingTypes: ['product'],
        applicableWorkShapes: ['A4'],
        nodes: [
            {
                key: 'primary',
                role: 'Bakery',
                title: 'Primary Listing',
                sub: 'Stall counter ready',
                type: 'store',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b5',
                providerName: 'Tagudin Morning Bakery',
                image: '/photos/bibingka.jpg',
                priceMinor: 18000,
            },
            {
                key: 'courier',
                role: 'Rider',
                title: 'Danny Express Thermal',
                sub: 'Insulated hot delivery',
                type: 'delivery',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b9',
                providerName: 'Danny Express Motorcycle Pool',
                image: '/photos/courier.jpg',
                priceMinor: 4500,
            },
        ],
    },
    craft_gift_relay: {
        recipeId: 'craft_gift_relay',
        pattern: 'delivery',
        patternCapsule: ['STORE', 'COURIER'],
        title: 'Custom Card + Gift Box & Ribbon + Courier Padala',
        extraFee: 80,
        rating: '4.9',
        bookedCount: '26 booked in Tagudin',
        desc: 'Hand-drawn greeting card packaged with a custom gift box and dispatched via direct motorcycle padala.',
        applicableCategories: ['greeting-cards', 'crafts'],
        applicableListingTypes: ['service', 'product'],
        applicableWorkShapes: ['A1', 'A4'],
        nodes: [
            {
                key: 'primary',
                role: 'Artist',
                title: 'Primary Listing',
                sub: 'Custom layout & artwork',
                type: 'labor',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b1',
                providerName: 'Tagudin Craft Studio',
                image: '/photos/greeting.jpg',
                priceMinor: 8000,
            },
            {
                key: 'courier',
                role: 'Rider',
                title: 'Danny Express',
                sub: 'Gift-safe padala transit',
                type: 'delivery',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b9',
                providerName: 'Danny Express Motorcycle Pool',
                image: '/photos/courier.jpg',
                priceMinor: 3500,
            },
        ],
    },
    print_courier_relay: {
        recipeId: 'print_courier_relay',
        pattern: 'delivery',
        patternCapsule: ['STORE', 'COURIER'],
        title: 'Print Production + Lamination + Office Courier',
        extraFee: 85,
        rating: '4.8',
        bookedCount: '44 booked in Tagudin',
        desc: 'Small-batch flyer printing with hot thermal lamination and direct doorstep office dispatch in Tagudin.',
        applicableCategories: ['print-assist'],
        applicableListingTypes: ['service'],
        applicableWorkShapes: ['A1'],
        nodes: [
            {
                key: 'primary',
                role: 'Print',
                title: 'Primary Listing',
                sub: 'Press production ready',
                type: 'store',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b4',
                providerName: 'Tagudin Quick Print',
                image: '/photos/greeting.jpg',
                priceMinor: 20000,
            },
            {
                key: 'courier',
                role: 'Rider',
                title: 'Danny Express',
                sub: 'Bundled print dispatch',
                type: 'delivery',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b9',
                providerName: 'Danny Express Motorcycle Pool',
                image: '/photos/courier.jpg',
                priceMinor: 3500,
            },
        ],
    },
    garment_relay: {
        recipeId: 'garment_relay',
        pattern: 'repair',
        patternCapsule: ['STORE', 'COURIER', 'LABOR'],
        title: 'Garment Alteration + Replacement Buttons + Return Courier',
        extraFee: 75,
        rating: '4.9',
        bookedCount: '61 booked in Tagudin',
        desc: 'Same-day hem and button alteration paired with a matching replacement button set and two-way courier return.',
        applicableCategories: ['repairs'],
        applicableListingTypes: ['service'],
        applicableWorkShapes: ['A1', 'A3'],
        nodes: [
            {
                key: 'part',
                role: 'Haberdashery',
                title: 'Button Pack',
                sub: 'Centro Haberdashery',
                type: 'store',
                image: '/photos/ac-clean.jpg',
                priceMinor: 3000,
            },
            {
                key: 'courier',
                role: 'Rider',
                title: 'Danny Express',
                sub: 'Two-way garment transit',
                type: 'delivery',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b9',
                providerName: 'Danny Express Motorcycle Pool',
                image: '/photos/courier.jpg',
                priceMinor: 4500,
            },
            {
                key: 'labor',
                role: 'Tailor',
                title: 'Primary Listing',
                sub: 'Garment hem alteration',
                type: 'labor',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b2',
                providerName: 'Ate Elena Garment Repairs',
                image: '/photos/ac-clean.jpg',
                priceMinor: 12000,
            },
        ],
    },
    market_hauling_relay: {
        recipeId: 'market_hauling_relay',
        pattern: 'multi',
        patternCapsule: ['STORE', 'COURIER', 'LABOR'],
        title: 'Market Errand Run + Fresh Produce + Tricycle Hauling',
        extraFee: 140,
        rating: '4.8',
        bookedCount: '33 booked in Tagudin',
        desc: 'Market errand assistance combined with bulk produce procurement and Kuya Jun heavy tricycle hauling.',
        applicableCategories: ['local-services'],
        applicableListingTypes: ['service'],
        applicableWorkShapes: ['A1', 'A9'],
        nodes: [
            {
                key: 'store',
                role: 'Produce',
                title: 'Market Crate',
                sub: 'Wet market stall',
                type: 'store',
                image: '/photos/bibingka.jpg',
                priceMinor: 8000,
            },
            {
                key: 'courier',
                role: 'Hauler',
                title: 'Kuya Jun Tricycle',
                sub: 'Bulky cargo transport',
                type: 'delivery',
                providerName: 'Kuya Jun Tricycle Delivery',
                image: '/photos/courier.jpg',
                priceMinor: 6000,
            },
            {
                key: 'primary',
                role: 'Runner',
                title: 'Primary Listing',
                sub: 'Errand procurement runner',
                type: 'labor',
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b3',
                providerName: 'Tagudin Errand Runner',
                image: '/photos/req-electrician.jpg',
                priceMinor: 15000,
            },
        ],
    },
};

export const DEAL_CHAIN_RECIPES: Record<PublishedDealChainRecipeId, AttachedDealChain> =
    CANONICAL_DEAL_CHAIN_RECIPES;

export function indexDealChainRecipes(
    recipes?: DealChainRecipeDefinition[],
): Record<PublishedDealChainRecipeId, DealChainRecipeDefinition> {
    if (!recipes || recipes.length === 0) {
        return CANONICAL_DEAL_CHAIN_RECIPES;
    }

    return Object.fromEntries(recipes.map((recipe) => [recipe.recipeId, recipe])) as Record<
        PublishedDealChainRecipeId,
        DealChainRecipeDefinition
    >;
}

/** Returns only recipes compatible with the listing context. */
export function getRecipesForCategory(
    categoryCode?: string | null,
    listingType?: string | null,
    workShape?: string | null,
    recipes?: DealChainRecipeDefinition[],
): DealChainRecipeDefinition[] {
    const list =
        recipes && recipes.length > 0 ? recipes : Object.values(CANONICAL_DEAL_CHAIN_RECIPES);
    const category = categoryCode?.trim().toLowerCase();

    if (!category || category === 'all') {
        return list;
    }

    return list.filter((recipe) => {
        if (!recipe.applicableCategories.some((value) => value.toLowerCase() === category)) {
            return false;
        }

        const normalizedListingType = listingType?.trim().toLowerCase();
        if (
            normalizedListingType &&
            recipe.applicableListingTypes &&
            !recipe.applicableListingTypes.some(
                (value) => value.toLowerCase() === normalizedListingType,
            )
        ) {
            return false;
        }

        const normalizedWorkShape = workShape?.trim().toLowerCase();
        return !(
            normalizedWorkShape &&
            recipe.applicableWorkShapes &&
            !recipe.applicableWorkShapes.some(
                (value) => value.toLowerCase() === normalizedWorkShape,
            )
        );
    });
}
