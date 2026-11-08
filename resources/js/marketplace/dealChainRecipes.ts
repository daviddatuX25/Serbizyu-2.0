import type { AttachedDealChain, PublishedDealChainRecipeId } from './types';
import type { DealChainCombination, PartnerSlot, SlotType } from '../components/mobile/types';

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
const PHYSICAL_PRODUCT_DELIVERY_CATEGORIES = [
    'local-food',
    'crafts',
    'print-assist',
    'repairs',
    'greeting-cards',
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
                isPrimary: false,
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
                isPrimary: false,
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
                isPrimary: true,
                image: '/photos/ac-clean.jpg',
            },
        ],
        dependencies: [
            { id: 'edge-part-courier', predecessorId: 'node-part', successorId: 'node-courier', conditionCode: 'part_ready', dependencyType: 'blocks', status: 'active' },
            { id: 'edge-courier-labor', predecessorId: 'node-courier', successorId: 'node-labor', conditionCode: 'delivery_signed', dependencyType: 'blocks', status: 'active' },
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
        applicableCategories: PHYSICAL_PRODUCT_DELIVERY_CATEGORIES,
        applicableListingTypes: ['product'],
        applicableWorkShapes: ['A4'],
        nodes: [
            {
                key: 'store',
                role: 'Store',
                title: 'Counter Pickup',
                sub: 'Tagudin Source',
                type: 'store',
                isPrimary: false,
                image: '/photos/ac-capacitor.jpg',
            },
            {
                key: 'courier',
                role: 'Rider',
                title: 'Danny Express',
                sub: 'Fast point-to-point courier',
                type: 'delivery',
                isPrimary: false,
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
                isPrimary: true,
                image: '/photos/ac-clean.jpg',
            },
        ],
        dependencies: [
            { id: 'edge-store-courier', predecessorId: 'node-store', successorId: 'node-courier', conditionCode: 'part_ready', dependencyType: 'blocks', status: 'active' },
            { id: 'edge-courier-primary', predecessorId: 'node-courier', successorId: 'node-primary', conditionCode: 'delivery_signed', dependencyType: 'blocks', status: 'active' },
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
                isPrimary: true,
                image: '/photos/ac-clean.jpg',
            },
            {
                key: 'audit',
                role: 'Audit',
                title: 'Safety Inspection',
                sub: 'Master Electrician',
                type: 'audit',
                isPrimary: false,
                listingId: '0198a3b1-7c40-7abc-8def-5234567890bc',
                providerName: 'Safety Check (Master Electrician)',
                image: '/photos/req-electrician.jpg',
                priceMinor: 15000,
            },
        ],
        dependencies: [
            { id: 'edge-primary-audit', predecessorId: 'node-primary', successorId: 'node-audit', conditionCode: 'work_completed', dependencyType: 'blocks', status: 'active' },
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
                isPrimary: true,
                image: '/photos/ac-capacitor.jpg',
            },
            {
                key: 'courier',
                role: 'Rider',
                title: 'Danny Express',
                sub: 'Courier Transport Runner',
                type: 'delivery',
                isPrimary: false,
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
                isPrimary: false,
                listingId: '0198a3b1-7c40-7abc-8def-5234567890bb',
                providerName: 'Kuya Ben Aircon Services',
                image: '/photos/ac-clean.jpg',
                priceMinor: 25000,
            },
        ],
        dependencies: [
            { id: 'edge-primary-courier', predecessorId: 'node-primary', successorId: 'node-courier', conditionCode: 'part_ready', dependencyType: 'blocks', status: 'active' },
            { id: 'edge-courier-installation', predecessorId: 'node-courier', successorId: 'node-installation', conditionCode: 'delivery_signed', dependencyType: 'blocks', status: 'active' },
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
                isPrimary: true,
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
                isPrimary: false,
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b9',
                providerName: 'Danny Express Motorcycle Pool',
                image: '/photos/courier.jpg',
                priceMinor: 4500,
            },
        ],
        dependencies: [
            { id: 'edge-primary-courier', predecessorId: 'node-primary', successorId: 'node-courier', conditionCode: 'part_ready', dependencyType: 'blocks', status: 'active' },
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
                isPrimary: true,
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
                isPrimary: false,
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b9',
                providerName: 'Danny Express Motorcycle Pool',
                image: '/photos/courier.jpg',
                priceMinor: 3500,
            },
        ],
        dependencies: [
            { id: 'edge-primary-courier', predecessorId: 'node-primary', successorId: 'node-courier', conditionCode: 'work_completed', dependencyType: 'blocks', status: 'active' },
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
                isPrimary: true,
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
                isPrimary: false,
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b9',
                providerName: 'Danny Express Motorcycle Pool',
                image: '/photos/courier.jpg',
                priceMinor: 3500,
            },
        ],
        dependencies: [
            { id: 'edge-primary-courier', predecessorId: 'node-primary', successorId: 'node-courier', conditionCode: 'part_ready', dependencyType: 'blocks', status: 'active' },
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
                isPrimary: false,
                image: '/photos/ac-clean.jpg',
                priceMinor: 3000,
            },
            {
                key: 'courier',
                role: 'Rider',
                title: 'Danny Express',
                sub: 'Two-way garment transit',
                type: 'delivery',
                isPrimary: false,
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
                isPrimary: true,
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b2',
                providerName: 'Ate Elena Garment Repairs',
                image: '/photos/ac-clean.jpg',
                priceMinor: 12000,
            },
        ],
        dependencies: [
            { id: 'edge-part-courier', predecessorId: 'node-part', successorId: 'node-courier', conditionCode: 'part_ready', dependencyType: 'blocks', status: 'active' },
            { id: 'edge-courier-labor', predecessorId: 'node-courier', successorId: 'node-labor', conditionCode: 'delivery_signed', dependencyType: 'blocks', status: 'active' },
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
                isPrimary: false,
                image: '/photos/bibingka.jpg',
                priceMinor: 8000,
            },
            {
                key: 'courier',
                role: 'Hauler',
                title: 'Kuya Jun Tricycle',
                sub: 'Bulky cargo transport',
                type: 'delivery',
                isPrimary: false,
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
                isPrimary: true,
                listingId: '0198a3b1-7c40-7abc-8def-5234567890b3',
                providerName: 'Tagudin Errand Runner',
                image: '/photos/req-electrician.jpg',
                priceMinor: 15000,
            },
        ],
        dependencies: [
            { id: 'edge-store-courier', predecessorId: 'node-store', successorId: 'node-courier', conditionCode: 'part_ready', dependencyType: 'blocks', status: 'active' },
            { id: 'edge-courier-primary', predecessorId: 'node-courier', successorId: 'node-primary', conditionCode: 'delivery_signed', dependencyType: 'blocks', status: 'active' },
        ],
    },
};
export const DEAL_CHAIN_RECIPES: Record<PublishedDealChainRecipeId, AttachedDealChain> =
    CANONICAL_DEAL_CHAIN_RECIPES;

export function indexDealChainRecipes(
    recipes?: DealChainRecipeDefinition[],
): Record<PublishedDealChainRecipeId, DealChainRecipeDefinition> {
    if (!recipes || recipes.length === 0) {
        return {} as Record<PublishedDealChainRecipeId, DealChainRecipeDefinition>;
    }

    return Object.fromEntries(recipes.map((recipe) => [recipe.recipeId, recipe])) as Record<
        PublishedDealChainRecipeId,
        DealChainRecipeDefinition
    >;
}

export const NON_PHYSICAL_PRODUCT_CATEGORIES = ['home-help', 'local-services'];

/** Checks whether a recipe is compatible with the given category, listing type, and work shape. */
export function isRecipeCompatible(
    recipe: Pick<
        DealChainRecipeDefinition,
        'applicableCategories' | 'applicableListingTypes' | 'applicableWorkShapes'
    > & { recipeId: string },
    categoryCode?: string | null,
    listingType?: string | null,
    workShape?: string | null,
): boolean {
    const category = categoryCode?.trim().toLowerCase();
    const normalizedType = listingType?.trim().toLowerCase();
    const normalizedShape = workShape?.trim().toUpperCase();

    // Courier delivery domain truth: strictly physical product handoff (product + A4)
    if (recipe.recipeId === 'courier_delivery') {
        if (normalizedType && normalizedType !== 'product') {
            return false;
        }
        if (normalizedShape && normalizedShape !== 'A4') {
            return false;
        }
        if (
            category &&
            category !== 'all' &&
            (NON_PHYSICAL_PRODUCT_CATEGORIES.includes(category) || (normalizedType === 'service' && category === 'repairs'))
        ) {
            return false;
        }
    }

    // Listing type filtering
    if (normalizedType && recipe.applicableListingTypes && recipe.applicableListingTypes.length > 0) {
        if (!recipe.applicableListingTypes.some((t) => t.toLowerCase() === normalizedType)) {
            return false;
        }
    }

    // Work shape filtering
    if (normalizedShape && recipe.applicableWorkShapes && recipe.applicableWorkShapes.length > 0) {
        if (!recipe.applicableWorkShapes.some((s) => s.toUpperCase() === normalizedShape)) {
            return false;
        }
    }

    // Category filtering
    if (category && category !== 'all' && recipe.applicableCategories && recipe.applicableCategories.length > 0) {
        if (!recipe.applicableCategories.some((c) => c.toLowerCase() === category)) {
            return false;
        }
    }

    return true;
}

/** Returns only recipes compatible with the listing context. Never falls back to sample records. */
export function getRecipesForCategory(
    categoryCode?: string | null,
    listingType?: string | null,
    workShape?: string | null,
    recipes?: DealChainRecipeDefinition[],
): DealChainRecipeDefinition[] {
    if (!recipes || recipes.length === 0) {
        return [];
    }

    return recipes.filter((recipe) =>
        isRecipeCompatible(recipe, categoryCode, listingType, workShape),
    );
}

/** Nodes and edges are authoritative; slots are only the builder's editable projection. */
export function savedCombinationSlots(combination: Pick<DealChainCombination, 'planVersion' | 'nodes' | 'dependencies'> & { slots?: PartnerSlot[] }): PartnerSlot[] {
    if (combination.planVersion !== 1) return combination.slots ?? [];
    const tiers = new Map(combination.nodes.map((node) => [node.id, 0]));
    const edges = (combination.dependencies ?? []).filter((edge) => edge.status !== 'removed');
    for (let pass = 0; pass < combination.nodes.length; pass++) {
        for (const edge of edges) {
            tiers.set(edge.successorId, Math.max(tiers.get(edge.successorId) ?? 0, (tiers.get(edge.predecessorId) ?? 0) + 1));
        }
    }
    const slotTypes: Record<string, SlotType> = {
        store: 'store', parts: 'parts', product: 'store', delivery: 'delivery', courier: 'delivery',
        labor: 'installation', service: 'installation', installation: 'installation', diagnostic: 'diagnostic',
        tools: 'tools', audit: 'audit', recycle: 'recycle', hauling: 'recycle',
    };
    return combination.nodes.filter((node) => !node.isPrimary).map((node) => {
        const type = slotTypes[node.type] ?? node.type as SlotType;
        const cached = combination.slots?.find((slot) => slot.id === node.id);
        const cachedType = cached ? slotTypes[cached.type] ?? cached.type : undefined;
        const cacheMatchesNode = Boolean(cached)
            && cachedType === type
            && cached?.listingId === node.listingId
            && cached?.listingVersionId === node.listingVersionId;
        const projection = cacheMatchesNode ? cached : undefined;
        return {
            ...projection,
            id: node.id,
            type,
            role: node.role,
            name: projection?.name ?? node.title,
            meta: projection?.meta ?? node.sub,
            conditionCode: [...new Set(edges.filter((edge) => edge.successorId === node.id).map((edge) => edge.conditionCode))].length === 1
                ? edges.find((edge) => edge.successorId === node.id)?.conditionCode
                : 'all_inputs_ready',
            allowBypass: node.allowBypass,
            listingId: node.listingId,
            listingVersionId: node.listingVersionId ?? null,
            feeMinor: node.feeMinor ?? projection?.feeMinor,
            coverThumbnailUrl: node.coverThumbnailUrl ?? projection?.coverThumbnailUrl,
            assignmentMode: node.assignmentMode ?? (node.isOpenSlot ? 'buyer_choice' : node.listingId ? 'preferred_partner' : 'buyer_choice'),
            isOpenSlot: node.isOpenSlot ?? false,
            tier: typeof node.tier === 'number' ? node.tier : tiers.get(node.id) ?? 0,
        };
    });
}
