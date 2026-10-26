import { useEffect, useState, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Star,
    MapPin,
    Heart,
    Plus,
    Minus,
    ShoppingBag,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Camera,
    MessageSquare,
    ArrowRight,
    Check,
    Sparkles,
} from 'lucide-react';
import type { HomeProps, ListingRecord } from '../types';
import { DesktopGlobalNav } from '../components/layout/DesktopGlobalNav';
import { PicksDrawer } from '../components/marketplace/PicksDrawer';
import { listingBookingUrl, readPicksBasket, savePicksBasket } from '../marketplace/booking';
import { DealChainCheckoutModal } from '../components/marketplace/DealChainCheckoutModal';
import type { BasketItem, PublishedDealChainRecipeId, SlotCandidateListing } from '../marketplace/types';
import { indexDealChainRecipes } from '../marketplace/dealChainRecipes';
import type { DealChainRecipeDefinition } from '../marketplace/dealChainRecipes';
export type PackageTier = {
    id: string;
    title: string;
    price: number;
    origPrice?: number;
    sub: string;
    inclusions: string[];
    variantId?: string;
    available?: number | null;
    availabilityStatus?: string | null;
    kind: 'variant' | 'package' | 'base';
    isDefault?: boolean;
};


type DealChainCombination = {
    id: string;
    title: string;
    isDefault: boolean;
    nodes: Array<Record<string, unknown>>;
};

function listingDealChainCombinations(listing?: ListingRecord | null): DealChainCombination[] {
    return (listing?.deal_chain_combinations ?? []).flatMap((raw) => {
        if (typeof raw.id !== 'string' || typeof raw.title !== 'string') return [];
        return [{
            id: raw.id,
            title: raw.title,
            isDefault: raw.isDefault === true || raw.is_default === true,
            nodes: Array.isArray(raw.nodes)
                ? raw.nodes.filter((node): node is Record<string, unknown> => typeof node === 'object' && node !== null && !Array.isArray(node))
                : [],
        }];
    });
}
type ReviewItem = {
    id: string;
    author: string;
    barangay: string;
    timeAgo: string;
    stars: number;
    packageTag: string;
    quote: string;
    hasPhoto?: boolean;
};

type ReviewFilter = 'all' | '5' | '4' | 'photos';

const REVIEW_PAGE_SIZE = 5;

const SAMPLE_REVIEWS: ReviewItem[] = [
    {
        id: 'rev-1',
        author: 'Maria S.',
        barangay: 'Barangay Centro',
        timeAgo: '3 days ago',
        stars: 5,
        packageTag: 'Standard Full Package',
        quote: 'Very thorough clean. Blower fan wheel was removed and washed with alkaline chemical foam. Malamig na ulit aircon namin!',
        hasPhoto: true,
    },
    {
        id: 'rev-2',
        author: 'Ramil D.',
        barangay: 'Barangay Bio',
        timeAgo: '1 week ago',
        stars: 5,
        packageTag: '1 Unit Standard',
        quote: 'Arrived right on time in Centro. Clean workmanship, walang kalat sa kwarto.',
    },
    {
        id: 'rev-3',
        author: 'Ate Elena',
        barangay: 'Barangay Rizal',
        timeAgo: '2 weeks ago',
        stars: 5,
        packageTag: '1 Unit Standard + Condenser',
        quote: 'Mabilis mag-troubleshoot si Kuya Ben. Pinalitan capacitor at nilinis coil.',
    },
    {
        id: 'rev-4',
        author: 'Mang Jose',
        barangay: 'Pudoc West',
        timeAgo: '3 weeks ago',
        stars: 4,
        packageTag: 'Express Delivery',
        quote: 'Maayos kausap at maaasahan sa mga biglaang takbo sa centro.',
    },
];

const REVIEW_PHOTOS = [
    {
        label: 'Chemical coil disinfection',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80',
        author: 'Kuya Ben AC',
    },
    {
        label: 'Blower wheel degreased',
        url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=300&auto=format&fit=crop&q=80',
        author: 'Kuya Ben AC',
    },
    {
        label: 'High pressure rinse',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&auto=format&fit=crop&q=80',
        author: 'Kuya Ben AC',
    },
    {
        label: 'Finished installation',
        url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=300&auto=format&fit=crop&q=80',
        author: 'Kuya Ben AC',
    },
];



export default function ListingDetail(props: HomeProps) {
    const listing = props.activeListingDetail;
    const dealChainRecipes = useMemo(
        () => indexDealChainRecipes(props.dealChainCatalog as DealChainRecipeDefinition[] | undefined),
        [props.dealChainCatalog],
    );
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const dealChainCombinations = useMemo(() => listingDealChainCombinations(listing), [listing]);
    const [selectedCombinationId, setSelectedCombinationId] = useState<string | null>(null);
    const selectedCombination = dealChainCombinations.find((combination) => combination.id === selectedCombinationId) ?? null;
    const isService = (listing?.listing_type || listing?.listingType) !== 'product';
    const directAddons = useMemo(() => (listing?.addons ?? []).filter((addon) => {
        const role = addon.partner_role?.toLowerCase();
        const code = addon.code?.toLowerCase();
        return addon.status === 'available' &&
            role !== 'store' &&
            role !== 'courier' &&
            role !== 'auditor' &&
            code !== 'turnkey_parts' &&
            code !== 'safety_audit' &&
            code !== 'courier_delivery' &&
            code !== 'product_install';
    }), [listing?.addons]);
    const [selectedAddonCodes, setSelectedAddonCodes] = useState<string[]>([]);
    const toggleAddon = (code: string) => {
        setSelectedAddonCodes((previous) =>
            previous.includes(code) ? previous.filter((item) => item !== code) : [...previous, code],
        );
    };

    // Public offer options are authored by the seller; no category-generated packages.
    const packages = useMemo<PackageTier[]>(() => {
        if (!listing) return [];
        if ((listing.listing_type || listing.listingType) === 'product') {
            return (listing.variants ?? []).flatMap((raw) => {
                const variant = raw as Record<string, unknown>;
                if (typeof variant.id !== 'string') return [];
                const price = typeof variant.price_amount_minor === 'number'
                    ? variant.price_amount_minor / 100
                    : typeof variant.price === 'number' ? variant.price : null;
                if (price === null) return [];
                const availability = typeof variant.availability === 'object' && variant.availability !== null
                    ? variant.availability as Record<string, unknown>
                    : null;
                return [{
                    id: variant.id,
                    variantId: variant.id,
                    title: String(variant.name ?? variant.title ?? variant.id),
                    price,
                    sub: typeof availability?.available === 'number'
                        ? `${availability.available} available`
                        : 'Availability unavailable',
                    inclusions: Array.isArray(variant.inclusions)
                        ? variant.inclusions.filter((item): item is string => typeof item === 'string')
                        : [],
                    available: typeof availability?.available === 'number' ? availability.available : null,
                    availabilityStatus: typeof availability?.availability_status === 'string' ? availability.availability_status : null,
                    isDefault: variant.is_default === true || variant.isDefault === true,
                    kind: 'variant' as const,
                }];
            });
        }
        const tiers = listing.package_tiers ?? listing.packageTiers ?? [];
        if (tiers.length > 0) {
            return tiers.map((tier) => ({
                id: tier.id,
                title: tier.title,
                price: tier.price,
                origPrice: tier.orig_price ?? tier.origPrice,
                sub: tier.sub,
                inclusions: tier.inclusions ?? [],
                isDefault: (tier as unknown as Record<string, unknown>).is_default === true || (tier as unknown as Record<string, unknown>).isDefault === true,
                kind: 'package' as const,
            }));
        }
        if (typeof listing.price_amount_minor === 'number') {
            return [{
                id: listing.id,
                title: listing.title,
                price: listing.price_amount_minor / 100,
                sub: '',
                inclusions: listing.inclusions ?? [],
                kind: 'base',
            }];
        }
        return [];
    }, [listing]);
    const [selectedPackageIndex, setSelectedPackageIndex] = useState(0);
    useEffect(() => {
        const available = (option: PackageTier) =>
            option.kind !== 'variant' ||
            (typeof option.available === 'number' && option.available > 0 && !['out_of_stock', 'paused', 'shortage'].includes(option.availabilityStatus ?? ''));
        const defaultIndex = packages.findIndex((option) => option.isDefault && available(option));
        const availableIndex = packages.findIndex(available);
        setSelectedPackageIndex(defaultIndex >= 0 ? defaultIndex : Math.max(0, availableIndex));
    }, [packages]);
    useEffect(() => setQuantity(1), [selectedPackageIndex, listing?.id]);
    const activePackage = packages[selectedPackageIndex] ?? {
        id: '',
        title: listing?.title ?? '',
        price: 0,
        sub: '',
        inclusions: [],
        kind: 'base' as const,
    };
    const selectedOptionUnavailable =
        (activePackage.kind === 'variant' &&
            (typeof activePackage.available !== 'number' ||
                activePackage.available <= 0 ||
                ['out_of_stock', 'paused', 'shortage'].includes(activePackage.availabilityStatus ?? ''))) ||
        (packages.length === 0 && activePackage.price <= 0);
    const quantityLimit = activePackage.kind === 'variant' && typeof activePackage.available === 'number'
        ? activePackage.available
        : Number.MAX_SAFE_INTEGER;


    // Server-projected milestone stages (with truthful fallback based on listing work_shape)
    // Server-projected milestone stages (service execution pipeline)
    const workSpecificationNodes = useMemo(() => {
        const nodes = listing?.work_specification?.nodes;
        return Array.isArray(nodes)
            ? nodes.filter((node): node is Record<string, unknown> => typeof node === 'object' && node !== null && !Array.isArray(node))
            : [];
    }, [listing?.work_specification]);
    const milestoneStages = useMemo(() => workSpecificationNodes
        .map((node, index) => ({
            id: typeof node.id === 'string' ? node.id : `node-${index + 1}`,
            step: typeof node.ordinal === 'number' ? node.ordinal : index + 1,
            title: typeof node.title === 'string' ? node.title : '',
            description: typeof node.description === 'string' ? node.description : '',
            duration: node.duration_label ?? node.durationLabel ?? node.target_duration_minutes ?? node.target_duration,
            requiredProofs: (Array.isArray(node.required_proofs) ? node.required_proofs : Array.isArray(node.requiredProofs) ? node.requiredProofs : [])
                .map((proof) => typeof proof === 'string' ? proof : String(proof)),
            clearance: node.control_mode ?? node.clearance_mode ?? node.clearanceMode ?? (typeof node.clearance === 'object' && node.clearance !== null ? (node.clearance as Record<string, unknown>).mode : null),
            approval: node.approval_method ?? node.approvalMethod,
        }))
        .sort((a, b) => a.step - b.step), [workSpecificationNodes]);
    const [pipelineExpanded, setPipelineExpanded] = useState(false);
    // Contextual Deal Chain Slot URL param (?chain_slot=)
    const [chainSlotContext, setChainSlotContext] = useState<string | null>(null);

    // Picks / Basket state
    const [basket, setBasket] = useState<BasketItem[]>([]);
    const [picksOpen, setPicksOpen] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [quantity, setQuantity] = useState(1);
    // Reviews expansion & filter state
    const [reviewsExpanded, setReviewsExpanded] = useState(false);
    const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
    const [reviewPage, setReviewPage] = useState(1);

    // Read query parameters and localStorage on mount & synchronize live
    useEffect(() => {
        const defaultCombination = dealChainCombinations.find((combination) => combination.isDefault);
        setSelectedAddonCodes([]);
        setSelectedCombinationId(defaultCombination?.id ?? dealChainCombinations[0]?.id ?? null);
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const slot = params.get('chain_slot');
            if (slot) {
                setChainSlotContext(slot);
            }
        }

        const syncBasket = () => {
            try {
                setBasket(readPicksBasket(localStorage));
            } catch {
                // ignore
            }
        };

        syncBasket();
        window.addEventListener('storage', syncBasket);
        window.addEventListener('serbizyu:picks-updated', syncBasket);

        if (listing?.id) {
            try {
                const storedPins = localStorage.getItem('serbizyu.browse.pins');
                if (storedPins) {
                    const parsedPins: string[] = JSON.parse(storedPins);
                    setIsPinned(parsedPins.includes(listing.id));
                }
            } catch {
                // ignore
            }
        }

        return () => {
            window.removeEventListener('storage', syncBasket);
            window.removeEventListener('serbizyu:picks-updated', syncBasket);
        };
    }, [listing?.id, dealChainCombinations]);

    const saveBasket = (newBasket: BasketItem[]) => {
        setBasket(newBasket);
        try {
            savePicksBasket(localStorage, newBasket);
            window.dispatchEvent(new Event('serbizyu:picks-updated'));
        } catch {
            // ignore
        }
    };
    const togglePin = () => {
        if (!listing?.id) return;
        setIsPinned((prev) => {
            const next = !prev;
            try {
                const storedPins = localStorage.getItem('serbizyu.browse.pins');
                const pins: string[] = storedPins ? JSON.parse(storedPins) : [];
                const updated = next
                    ? [...pins, listing.id]
                    : pins.filter((id) => id !== listing.id);
                localStorage.setItem('serbizyu.browse.pins', JSON.stringify(updated));
            } catch {
                // ignore
            }
            return next;
        });
    };

    const selectedAddons = directAddons.filter((addon) =>
        selectedAddonCodes.includes(addon.code) || selectedAddonCodes.includes(addon.id),
    );
    const addonIds = selectedAddons.map((addon) => addon.id);
    const customizerFee = selectedAddons.reduce((sum, addon) => sum + addon.price_amount_minor / 100, 0);
    const unitPrice = activePackage.price + customizerFee;
    const calculatedTotal = unitPrice * quantity;
    const handleDirectAction = () => {
        if (!listing || selectedOptionUnavailable) return;
        const startUrl = props.booking?.start_url || `/listings/${listing.id}/book`;
        const url = new URL(startUrl, window.location.origin);
        if (activePackage.kind === 'variant') url.searchParams.set('variant_id', activePackage.variantId ?? activePackage.id);
        if (activePackage.kind === 'package') url.searchParams.set('package_id', activePackage.id);
        url.searchParams.set('quantity', String(quantity));
        if (listing.listing_version_id) url.searchParams.set('listing_version_id', listing.listing_version_id);
        addonIds.forEach((id) => url.searchParams.append('addon_ids[]', id));
        if (selectedCombination) url.searchParams.set('deal_chain_combination_id', selectedCombination.id);
        if (chainSlotContext) url.searchParams.set('chain_slot', chainSlotContext);
        router.visit(`${url.pathname}${url.search}`);
    };

    const handleAddToPicks = () => {
        if (!listing || selectedOptionUnavailable) return;
        const variantId = activePackage.kind === 'variant' ? activePackage.variantId ?? activePackage.id : null;
        const packageId = activePackage.kind === 'package' ? activePackage.id : null;
        const itemId = `${listing.id}:${variantId ?? packageId ?? 'base'}:${selectedCombination?.id ?? ''}:${addonIds.join(',')}`;
        const listingContext = {
            listing_id: listing.id,
            listing_version_id: listing.listing_version_id ?? null,
            variant_id: variantId,
            package_id: packageId,
            addon_ids: addonIds,
            addon_titles: selectedAddons.map((addon) => addon.title),
            deal_chain_combination_id: selectedCombination?.id ?? null,
            deal_chain_title: selectedCombination?.title ?? null,
            variant_available: activePackage.kind === 'variant' ? activePackage.available : null,
            category_code: listing.category_code ?? listing.categoryCode ?? null,
            listing_type: listing.listing_type ?? listing.listingType ?? null,
            work_shape: listing.work_shape ?? listing.workShape ?? null,
        };
        const existing = basket.find((item) => item.id === itemId);
        const addonLabel = selectedAddons.length ? ` + ${selectedAddons.map((addon) => addon.title).join(', ')}` : '';
        const title = `${listing.title} · ${activePackage.title}${addonLabel}`;
        const updated = existing
            ? basket.map((item) => item.id === itemId
                ? {
                    ...item,
                    ...listingContext,
                    quantity: Math.min(activePackage.kind === 'variant' ? quantityLimit : Number.MAX_SAFE_INTEGER, item.quantity + quantity),
                    price: unitPrice,
                    title,
                }
                : item)
            : [...basket, {
                id: itemId,
                title,
                price: unitPrice,
                quantity,
                ...listingContext,
            }];
        saveBasket(updated);
        setPicksOpen(true);
    };
    const handleAttachDealChain = (itemId: string, recipeId: PublishedDealChainRecipeId | null) => {
        const recipe = recipeId ? dealChainRecipes[recipeId] : null;
        saveBasket(basket.map((item) => {
            if (item.id !== itemId) return item;
            const priorFee = item.dealChain?.extraFee ?? 0;
            const nextFee = recipe?.extraFee ?? 0;
            return {
                ...item,
                price: item.price - priorFee + nextFee,
                dealChain: recipe || undefined,
            };
        }));
    };

    const handleSwapSlotCandidate = (itemId: string, nodeIndex: number, candidate: SlotCandidateListing) => {
        saveBasket(basket.map((item) => {
            if (item.id !== itemId || !item.dealChain) return item;
            const nodes = [...item.dealChain.nodes];
            const previous = nodes[nodeIndex];
            if (typeof previous.priceMinor !== 'number') return item;
            const priceDiff = (candidate.price_minor - previous.priceMinor) / 100;
            nodes[nodeIndex] = {
                ...previous,
                id: candidate.id,
                title: candidate.title,
                sub: candidate.provider_name,
                listingId: candidate.id,
                providerId: candidate.provider_user_id,
                priceMinor: candidate.price_minor,
            };
            return {
                ...item,
                price: item.price + priceDiff,
                dealChain: {
                    ...item.dealChain,
                    extraFee: Math.max(0, item.dealChain.extraFee + priceDiff),
                    nodes,
                },
            };
        }));
    };

    const handleAuthorizeDealChain = () => {
        setCheckoutModalOpen(false);
        router.post('/deal-chains/authorize', {
            items: basket.map((item) => ({
                id: item.listing_id,
                listing_version_id: item.listing_version_id,
                variant_id: item.variant_id,
                package_id: item.package_id,
                addon_ids: item.addon_ids ?? [],
                deal_chain_combination_id: item.deal_chain_combination_id,
                quantity: item.quantity,
                deal_chain: item.dealChain?.recipeId || null,
                slot_overrides: item.dealChain?.nodes
                    ? Object.fromEntries(item.dealChain.nodes
                        .filter((node) => node.listingId)
                        .map((node) => [node.key, { listing_id: node.listingId }]))
                    : null,
            })),
        }, {
            onSuccess: () => saveBasket([]),
        });
    };
    const ratingSummary = listing?.rating_summary;
    const incomingReviews = listing?.reviews as ReviewItem[] | undefined;
    const reviewsList = incomingReviews !== undefined ? incomingReviews : SAMPLE_REVIEWS;
    const reviewsCount = ratingSummary?.reviews_count ?? reviewsList.length;
    const avgRating = ratingSummary?.rating ?? (reviewsCount > 0 ? 4.9 : 0);
    const satisfactionPct = ratingSummary?.satisfaction_pct ?? (reviewsCount > 0 ? 98 : 0);
    const rawPhotos = listing?.photos as any[] | undefined;
    const listingPhotos = rawPhotos !== undefined ? rawPhotos : REVIEW_PHOTOS;
    const photosCount =
        ratingSummary?.photos_count ?? (reviewsCount > 0 ? listingPhotos.length : 0);
    const ratingDistribution = ratingSummary?.distribution ?? {};

    const featuredReview = reviewsList[0] ?? null;
    const nonFeaturedReviews = useMemo(() => {
        if (!featuredReview) return [];
        return reviewsList.filter((r) => r.id !== featuredReview.id);
    }, [reviewsList, featuredReview]);

    const filteredExtendedReviews = useMemo(() => {
        return nonFeaturedReviews.filter((r) => {
            if (reviewFilter === '5') return r.stars === 5;
            if (reviewFilter === '4') return r.stars === 4;
            if (reviewFilter === 'photos') return Boolean(r.hasPhoto);
            return true;
        });
    }, [nonFeaturedReviews, reviewFilter]);
    const totalPages = Math.ceil(filteredExtendedReviews.length / REVIEW_PAGE_SIZE);
    const paginatedReviews = filteredExtendedReviews.slice(
        (reviewPage - 1) * REVIEW_PAGE_SIZE,
        reviewPage * REVIEW_PAGE_SIZE,
    );
    const hasReviews = reviewsCount > 0;
    const photoUrl = listing?.media?.cover_thumbnail_url ?? listing?.cover_thumbnail_url ?? null;

    if (!listing) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
                <DesktopGlobalNav
                    session={props.session}
                    readiness={props.readiness}
                    activeRoute="browse"
                />
                <main className="mx-auto max-w-3xl px-6 py-16 text-center">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <AlertCircle className="size-7" />
                    </div>
                    <h1 className="mt-4 text-xl font-extrabold text-[#0F2F58]">
                        Listing Unavailable
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        This service or product offering is not currently available for public
                        viewing.
                    </p>
                    <Link
                        href="/browse"
                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0F2F58] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#153e74]"
                    >
                        <ArrowLeft className="size-4" />
                        <span>Back to Marketplace</span>
                    </Link>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
            {/* Desktop Global Navigation */}
            <DesktopGlobalNav
                session={props.session}
                readiness={props.readiness}
                activeRoute="browse"
                picksCount={basket.reduce((sum, item) => sum + item.quantity, 0)}
                onPicksClick={() => setPicksOpen((prev) => !prev)}
                actingContext={{
                    actorUserId: props.session?.userId || 'usr_guest',
                    ownerUserId: 'usr_guest',
                    ownerName: props.session?.displayName || 'Tagudin Resident',
                    consentGrantId: 'cg_public',
                    isActingOnBehalf: false,
                }}
            />

            {/* Mobile Header (Hidden on Desktop) */}
            <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
                <Link
                    href="/browse"
                    className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
                    aria-label="Back to browse"
                >
                    <ArrowLeft className="size-4" />
                </Link>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={togglePin}
                        className={`flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-xs ${
                            isPinned ? 'text-red-500' : 'text-slate-600'
                        }`}
                        aria-label="Wishlist toggle"
                    >
                        <Heart className={`size-4 ${isPinned ? 'fill-red-500' : ''}`} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setPicksOpen(true)}
                        className="relative flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs"
                        aria-label="Picks cart"
                    >
                        <ShoppingBag className="size-4" />
                        {basket.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#0F2F58] text-[9px] font-extrabold text-white">
                                {basket.reduce((sum, item) => sum + item.quantity, 0)}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
                {/* Contextual Deal Chain Slot Indicator (When redirected via ?chain_slot=) */}
                {chainSlotContext && (
                    <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 shadow-xs">
                        <div className="flex items-center gap-2">
                            <Sparkles className="size-4 text-amber-600" />
                            <span>
                                <strong>Filling Deal Chain Slot:</strong>{' '}
                                {chainSlotContext.replace('_', ' ').toUpperCase()} Node
                            </span>
                        </div>
                        <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 uppercase">
                            Chain Slot
                        </span>
                    </div>
                )}

                {/* Breadcrumbs (Desktop) */}
                <div className="mb-6 hidden items-center gap-2 text-xs font-semibold text-slate-500 lg:flex">
                    <Link href="/browse" className="flex items-center gap-1 hover:text-[#0F2F58]">
                        <ArrowLeft className="size-3.5" />
                        <span>Back to active listings</span>
                    </Link>
                    <span>/</span>
                    <span className="capitalize">
                        {listing.category_code?.replace(/-/g, ' ') || 'Local service'}
                    </span>
                    <span>/</span>
                    <span className="line-clamp-1 font-bold text-slate-900">{listing.title}</span>
                </div>

                {/* 2-Column Product / Service Detail Grid */}
                <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                    {/* LEFT COLUMN (58% on Desktop): Media, Hierarchy, Scope Presets, Live Pipeline, & Reviews */}
                    <div className="flex flex-col gap-5 lg:col-span-7">
                        {/* 1. Hero Image Container (Clean, without messy text overlays) */}
                        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs">
                            {photoUrl ? (
                                <img src={photoUrl} alt={listing.title} className="size-full object-cover" />
                            ) : (
                                <div className="flex size-full items-center justify-center text-xs font-semibold text-slate-500">
                                    No listing image
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={togglePin}
                                className={`absolute top-3.5 right-3.5 hidden size-9 cursor-pointer items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur-xs transition-transform hover:scale-105 active:scale-90 lg:flex ${
                                    isPinned ? 'text-red-500' : 'text-slate-600 hover:text-red-500'
                                }`}
                                aria-label="Pin listing"
                            >
                                <Heart className={`size-4.5 ${isPinned ? 'fill-red-500' : ''}`} />
                            </button>
                        </div>

                        {/* 2. Main Title, Price Line & Rating Row Card (Exact Mock Hierarchy) */}
                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                            {/* Category Badge */}
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-[#EBF2FA] px-3 py-0.5 text-[11px] font-extrabold tracking-wide text-[#0F2F58] uppercase">
                                    {isService ? 'Verified Service' : 'Verified Local Product'}
                                </span>
                            </div>

                            {/* Main Title */}
                            <h1 className="text-xl leading-tight font-extrabold text-[#0F2F58] sm:text-2xl">
                                {listing.title}
                            </h1>

                            {/* Price Line (Big Price + Strikethrough + Unit Label) */}
                            {packages.length > 0 ? (
                                <div className="flex items-baseline gap-2.5 pt-0.5">
                                    <span className="font-mono text-2xl font-extrabold text-[#0F2F58] sm:text-3xl">
                                        ₱{unitPrice.toFixed(2)}
                                    </span>
                                    {activePackage.origPrice && (
                                        <span className="font-mono text-sm text-slate-400 line-through">
                                            ₱{activePackage.origPrice.toFixed(2)}
                                        </span>
                                    )}
                                    <span className="text-xs font-semibold text-slate-500">
                                        {isService ? '/ service unit' : '/ item'}
                                    </span>
                                </div>
                            ) : (
                                <p className="text-sm font-semibold text-amber-800">
                                    No seller-authored variants or price are available.
                                </p>
                            )}

                            {/* Rating Row (Directly Below Price, Matching Mock) */}
                            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                                <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                                    <span>{reviewsCount > 0 ? avgRating.toFixed(1) : 'New'}</span>
                                </span>
                                <span className="text-xs font-medium text-slate-500">
                                    ({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})
                                </span>
                                {reviewsCount > 0 && (
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                        {satisfactionPct}% satisfaction
                                    </span>
                                )}
                            </div>
                            {/* Description */}
                            <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">
                                {listing.description ? (
                                    listing.description
                                ) : null}
                            </p>

                            {/* Provider Box with Chat Button */}
                            <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-[#FAFCFB] p-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-full bg-[#0F2F58] text-sm font-extrabold text-white">
                                        {(listing.owner_name || listing.ownerName || 'P').charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-xs font-extrabold text-slate-900 sm:text-sm">
                                            {listing.owner_name ||
                                                listing.ownerName ||
                                                'Kuya Ben Refrigeration'}
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                                            <MapPin className="size-3 text-slate-400" />
                                            <span>
                                                {listing.area || 'Tagudin Centro'} · Verified
                                                Citizen Provider
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        alert(
                                            `Chat opened with ${listing.owner_name || 'provider'}`,
                                        )
                                    }
                                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-xs transition-colors hover:bg-slate-50"
                                >
                                    <MessageSquare className="size-3.5" />
                                    <span>Chat</span>
                                </button>
                            </div>
                        </div>

                        {/* 3. Package Presets & Options Customizer */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                            <div className="mb-3 flex items-baseline justify-between">
                                <div>
                                    <h2 className="text-sm font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                        {isService ? 'Choose service package' : 'Choose product variant'}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {isService ? 'Seller-authored offer and price' : 'Seller variants with current availability'}
                                    </p>
                                </div>
                                <span className="text-[11px] font-bold text-[#0F2F58]">
                                    {packages.length} {isService ? 'Offers' : 'Variants'}
                                </span>
                            </div>

                            {/* Horizontal 1-Row Scrollable Package Cards Rail */}
                            <div className="-mx-1 flex [scrollbar-width:none] gap-2.5 overflow-x-auto px-1 pb-1.5 [&::-webkit-scrollbar]:hidden">
                                {packages.map((pkg, idx) => {
                                    const isSelected = selectedPackageIndex === idx;
                                    return (
                                        <button
                                            key={pkg.id}
                                            type="button"
                                            aria-pressed={isSelected}
                                            disabled={pkg.kind === 'variant' && (typeof pkg.available !== 'number' || pkg.available <= 0 || ['out_of_stock', 'paused', 'shortage'].includes(pkg.availabilityStatus ?? ''))}
                                            onClick={() => { setSelectedPackageIndex(idx); setQuantity(1); }}
                                            className={`flex w-[210px] shrink-0 cursor-pointer flex-col justify-between rounded-xl border p-3 text-left transition-all sm:w-[230px] disabled:cursor-not-allowed disabled:opacity-50 ${
                                                isSelected
                                                    ? 'border-[#0F2F58] bg-[#EBF2FA] shadow-xs ring-1 ring-[#0F2F58]/25'
                                                    : 'border-slate-200 bg-[#FAFCFB] hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex w-full items-center justify-between gap-1">
                                                <span
                                                    className={`truncate text-xs font-extrabold ${isSelected ? 'text-[#0F2F58]' : 'text-slate-900'}`}
                                                >
                                                    {pkg.title}
                                                </span>
                                                {isSelected && (
                                                    <Check className="size-3.5 shrink-0 text-[#0F2F58]" />
                                                )}
                                            </div>
                                            <div className="mt-1 flex items-baseline justify-between gap-1.5">
                                                <span className="font-mono text-sm font-extrabold text-[#0F2F58]">
                                                    ₱{pkg.price.toFixed(2)}
                                                </span>
                                                {pkg.origPrice && (
                                                    <span className="font-mono text-[10px] text-slate-400 line-through">
                                                        ₱{pkg.origPrice.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-0.5 line-clamp-1 text-[10.5px] text-slate-500">
                                                {pkg.sub}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {packages.length === 0 && (
                                <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                    {isService ? 'This listing has no published price.' : 'This listing has no published product variants.'}
                                </p>
                            )}

                            {packages.length > 0 && (
                                <div className="mt-4 border-t border-slate-100 pt-3">
                                <div className="mb-2 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                                    Included in {activePackage.title}:
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {activePackage.inclusions.map((inc, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2 text-xs text-slate-700"
                                        >
                                            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700">
                                                ✓
                                            </span>
                                            <span>{inc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            )}

                            {isService && packages.length > 0 && directAddons.length > 0 && (
                                <fieldset className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3">
                                    <legend className="mb-2 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                                        Seller add-ons
                                    </legend>
                                    {directAddons.map((addon) => {
                                        const identifier = addon.code || addon.id;
                                        const checked = selectedAddonCodes.includes(identifier);
                                        return (
                                            <label key={addon.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                                                <span className="flex items-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleAddon(identifier)}
                                                        className="mt-0.5 size-4 accent-[#0F2F58]"
                                                    />
                                                    <span>
                                                        <span className="block text-xs font-bold text-slate-800">{addon.title}</span>
                                                        {addon.description ? <span className="mt-0.5 block text-[11px] text-slate-500">{addon.description}</span> : null}
                                                    </span>
                                                </span>
                                                <span className="shrink-0 font-mono text-xs font-extrabold text-[#0F2F58]">
                                                    +₱{(addon.price_amount_minor / 100).toFixed(2)}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </fieldset>
                            )}
                        </div>

                        {/* 3b. Work Execution Pipeline (Compact by default, clickable to view details) */}
                        {milestoneStages.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-sm font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                            Work Specification
                                        </h2>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {milestoneStages.length} authored steps with proof and clearance details
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPipelineExpanded((prev) => !prev)}
                                        className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-[#0F2F58] transition-colors hover:bg-slate-200"
                                    >
                                        <span>{pipelineExpanded ? 'Collapse' : 'Details'}</span>
                                        <ChevronDown
                                            className={`size-3.5 transition-transform duration-200 ${pipelineExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                </div>

                                {/* Compact Stepper Row (Always visible summary) */}
                                <div
                                    onClick={() => setPipelineExpanded((prev) => !prev)}
                                    className="mt-3.5 flex cursor-pointer [scrollbar-width:none] items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-100 bg-[#F8FAFC] p-2.5 transition-colors hover:border-slate-200 [&::-webkit-scrollbar]:hidden"
                                    title="Click to view stage details"
                                >
                                    {milestoneStages.map((stage, idx) => (
                                        <div
                                            key={idx}
                                            className="flex shrink-0 items-center gap-1.5"
                                        >
                                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs">
                                                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0F2F58]/10 text-[10px] font-extrabold text-[#0F2F58]">
                                                    {stage.step || idx + 1}
                                                </div>
                                                <span className="text-[11px] font-extrabold whitespace-nowrap text-slate-800">
                                                    {stage.title}
                                                </span>
                                            </div>
                                            {idx < milestoneStages.length - 1 && (
                                                <span className="px-0.5 text-xs font-bold text-slate-300">
                                                    →
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Detailed Breakdown (Rendered when expanded) */}
                                {pipelineExpanded && (
                                    <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
                                        {milestoneStages.map((stage, idx) => (
                                            <div
                                                key={stage.id || idx}
                                                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs"
                                            >
                                                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0F2F58]/10 text-[11px] font-extrabold text-[#0F2F58]">
                                                    {stage.step || idx + 1}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-extrabold text-slate-900 capitalize">
                                                            {stage.title}
                                                        </span>
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-extrabold text-slate-500 uppercase">
                                                            Stage {stage.step || idx + 1}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                                                        {stage.description}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {stage.duration !== null && stage.duration !== undefined && stage.duration !== '' ? (
                                                            <span className="rounded-full bg-[#EBF2FA] px-2 py-1 text-[10px] font-bold text-[#0F2F58]">
                                                                Target duration: {typeof stage.duration === 'number' ? `${stage.duration} min` : String(stage.duration)}
                                                            </span>
                                                        ) : null}
                                                        {stage.requiredProofs.map((proof, proofIndex) => (
                                                            <span key={`${proof}-${proofIndex}`} className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                                                Required proof: {proof.replace(/_/g, ' ')}
                                                            </span>
                                                        ))}
                                                        {stage.clearance ? (
                                                            <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                                                Clearance: {String(stage.clearance).replace(/_/g, ' ')}
                                                            </span>
                                                        ) : null}
                                                        {stage.approval !== null && stage.approval !== undefined && stage.approval !== '' ? (
                                                            <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                                                Approval: {String(stage.approval).replace(/_/g, ' ')}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 4. Deal Chain Fulfillment Scope Presets & Custom Partner Substitution */}
                        {dealChainCombinations.length > 0 && (
                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="mb-3">
                                    <h2 className="text-sm font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                        Saved Deal Chain combinations
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Partner slots saved with this listing.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {dealChainCombinations.map((combination) => (
                                        <button
                                            key={combination.id}
                                            type="button"
                                            aria-pressed={selectedCombinationId === combination.id}
                                            onClick={() => setSelectedCombinationId(combination.id)}
                                            className={`rounded-xl border p-3 text-left ${
                                                selectedCombinationId === combination.id
                                                    ? 'border-[#0F2F58] bg-[#EBF2FA]'
                                                    : 'border-slate-200 bg-white'
                                            }`}
                                        >
                                            <span className="block text-sm font-extrabold text-slate-900">
                                                {combination.title}
                                            </span>
                                            {selectedCombinationId === combination.id && (
                                                <span className="mt-2 flex flex-col gap-1.5">
                                                    {combination.nodes.map((node, index) => (
                                                        <span
                                                            key={String(node.id ?? node.role ?? index)}
                                                            className="flex items-center justify-between gap-3 border-t border-slate-200/70 pt-1.5 text-xs"
                                                        >
                                                            <span className="font-semibold text-slate-700">
                                                                {String(node.title ?? node.role ?? node.type ?? 'Partner slot')}
                                                            </span>
                                                            <span className="text-slate-500">
                                                                {String(node.sub ?? node.partner_name ?? (node.listingId || node.listing_id ? 'Linked listing' : 'Open partner slot'))}
                                                            </span>
                                                        </span>
                                                    ))}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                        {/* 5. Verified Customer Reviews Section (Matching Design Kit Screen 07) */}
                        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                            {/* Review Top Summary */}
                            {/* Review Top Summary (Minimal & Non-Redundant) */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                                <h2 className="text-sm font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                    Customer Reviews
                                </h2>
                                <span className="text-xs font-semibold text-slate-500">
                                    {reviewsCount > 0
                                        ? `${reviewsCount} verified local reviews`
                                        : 'No reviews yet'}
                                </span>
                            </div>
                            {/* Job Photos Rail */}
                            {hasReviews && listingPhotos.length > 0 && (
                                <div>
                                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500">
                                        <Camera className="size-3.5" />
                                        <span>Job photos from verified orders ({photosCount})</span>
                                    </div>
                                    <div className="flex [scrollbar-width:none] gap-2.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                                        {listingPhotos.map((photo, index) => (
                                            <div
                                                key={`${photo.url}-${index}`}
                                                className="group relative size-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                                                title={photo.label}
                                            >
                                                <img
                                                    src={photo.thumbnail_url || photo.url}
                                                    alt={`${photo.label} by ${photo.author}`}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="size-full object-cover transition-transform duration-200 group-hover:scale-108"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Featured Single Review Card (Always Visible if reviews exist) */}
                            {featuredReview ? (
                                <div className="rounded-xl border border-slate-200 bg-[#FAFCFB] p-4">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-extrabold text-slate-900">
                                            {featuredReview.author} · {featuredReview.barangay}
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            {featuredReview.timeAgo}
                                        </span>
                                    </div>
                                    <div className="mt-1.5 flex items-center justify-between">
                                        <div className="flex items-center gap-0.5 text-amber-500">
                                            {[...Array(featuredReview.stars)].map((_, i) => (
                                                <Star key={i} className="size-3 fill-amber-500" />
                                            ))}
                                        </div>
                                        <span className="rounded-md bg-[#EBF2FA] px-2 py-0.5 text-[10px] font-extrabold text-[#0F2F58]">
                                            {featuredReview.packageTag}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs leading-relaxed text-slate-700">
                                        "{featuredReview.quote}"
                                    </p>
                                </div>
                            ) : !hasReviews ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-[#FAFCFB] p-6 text-center">
                                    <p className="text-xs font-bold text-slate-600">
                                        No verified reviews yet
                                    </p>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        Customer reviews and milestone completion photos appear
                                        after verified orders are completed.
                                    </p>
                                </div>
                            ) : null}

                            {/* Interactive Toggle for Extended Reviews Panel */}
                            {hasReviews && (
                                <div className="flex flex-col items-center">
                                    <button
                                        type="button"
                                        onClick={() => setReviewsExpanded((prev) => !prev)}
                                        className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#0F2F58] hover:underline"
                                    >
                                        <span>
                                            {reviewsExpanded
                                                ? 'Hide reviews'
                                                : `+ View more reviews (${Math.max(0, reviewsCount - 1)} more)`}
                                        </span>
                                        {reviewsExpanded ? (
                                            <ChevronUp className="size-3.5" />
                                        ) : (
                                            <ChevronDown className="size-3.5" />
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Collapsible Extended Reviews Panel */}
                            {hasReviews && reviewsExpanded && (
                                <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
                                    <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto">
                                        {[
                                            { id: 'all', label: `All (${reviewsCount})` },
                                            {
                                                id: '5',
                                                label: `★ 5 Stars (${ratingDistribution[5] ?? 0})`,
                                            },
                                            {
                                                id: '4',
                                                label: `★ 4 Stars (${ratingDistribution[4] ?? 0})`,
                                            },
                                            { id: 'photos', label: `With Photos (${photosCount})` },
                                        ].map((rf) => (
                                            <button
                                                key={rf.id}
                                                type="button"
                                                onClick={() => {
                                                    setReviewFilter(rf.id as ReviewFilter);
                                                    setReviewPage(1);
                                                }}
                                                className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                                                    reviewFilter === rf.id
                                                        ? 'bg-[#0F2F58] text-white shadow-xs'
                                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                {rf.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex flex-col gap-2.5">
                                        {paginatedReviews.map((rev) => (
                                            <div
                                                key={rev.id}
                                                className="rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-extrabold text-slate-900">
                                                        {rev.author} · {rev.barangay}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {rev.timeAgo}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex items-center justify-between">
                                                    <div className="flex items-center gap-0.5 text-amber-500">
                                                        {[...Array(rev.stars)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className="size-2.5 fill-amber-500"
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500">
                                                        {rev.packageTag}
                                                    </span>
                                                </div>
                                                <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                                                    "{rev.quote}"
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                                            <span>
                                                Page {reviewPage} of {totalPages}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    disabled={reviewPage <= 1}
                                                    onClick={() =>
                                                        setReviewPage((p) => Math.max(1, p - 1))
                                                    }
                                                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 disabled:opacity-40"
                                                >
                                                    ‹ Prev
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={reviewPage >= totalPages}
                                                    onClick={() =>
                                                        setReviewPage((p) =>
                                                            Math.min(totalPages, p + 1),
                                                        )
                                                    }
                                                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 disabled:opacity-40"
                                                >
                                                    Next ›
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* RIGHT COLUMN: Selected seller option and booking actions */}
                    <div className="sticky top-24 hidden lg:col-span-5 lg:block">
                        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
                            {/* Selected Package Header */}
                            <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <div className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                                        Selected: {activePackage.title}
                                    </div>
                                    {packages.length > 0 ? (
                                        <div className="mt-1 font-mono text-2xl font-extrabold text-[#0F2F58]">
                                            ₱{unitPrice.toFixed(2)}
                                        </div>
                                    ) : (
                                        <div className="mt-1 text-sm font-semibold text-amber-800">
                                            Price unavailable
                                        </div>
                                    )}
                                </div>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-extrabold text-slate-600">
                                    Seller price
                                </span>
                            </div>

                            {/* Quantity Stepper */}
                            <div>
                                <label className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                                    Quantity
                                </label>
                                <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-[#FAFCFB] p-2">
                                    <span className="pl-2 text-xs font-semibold text-slate-700">
                                        Batch / Units
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                            className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                            aria-label="Decrease quantity"
                                        >
                                            <Minus className="size-3.5" />
                                        </button>
                                        <span className="w-6 text-center font-mono text-sm font-extrabold text-slate-900">
                                            {quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setQuantity((q) => Math.min(quantityLimit, q + 1))}
                                            disabled={selectedOptionUnavailable || quantity >= quantityLimit}
                                            className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                                            aria-label="Increase quantity"
                                        >
                                            <Plus className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>{packages.length > 0 ? `${activePackage.title} × ${quantity}` : 'Price unavailable'}</span>
                                    <span className="font-mono font-bold text-slate-800">
                                        {packages.length > 0 ? `₱${calculatedTotal.toFixed(2)}` : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-[#0F2F58]">
                                    <span>Total</span>
                                    <span className="font-mono text-base">{packages.length > 0 ? `₱${calculatedTotal.toFixed(2)}` : 'Unavailable'}</span>
                                </div>
                            </div>

                            {/* DUAL CTAs: Direct Booking vs Add to Picks */}
                            <div className="flex flex-col gap-2.5 pt-1">
                                {/* 1. Primary Direct Action CTA */}
                                <button
                                    type="button"
                                    onClick={handleDirectAction}
                                    disabled={selectedOptionUnavailable}
                                    className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] text-xs font-extrabold tracking-wide text-white shadow-md transition-all hover:bg-[#153e74] active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <span>
                                        {selectedOptionUnavailable
                                            ? 'Unavailable'
                                            : chainSlotContext
                                              ? `Add to Chain Slot · ₱${calculatedTotal.toFixed(2)}`
                                              : `${isService ? 'Book Service Now' : 'Buy Product Now'} · ₱${calculatedTotal.toFixed(2)}`}
                                    </span>
                                    <ArrowRight className="size-4" />
                                </button>

                                {/* 2. Secondary Add to Picks CTA */}
                                <button
                                    type="button"
                                    onClick={handleAddToPicks}
                                    disabled={selectedOptionUnavailable}
                                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-slate-100 text-xs font-bold text-slate-800 shadow-2xs transition-all hover:bg-slate-200 active:scale-98"
                                >
                                    <Plus className="size-4 stroke-[2.5] text-[#0F2F58]" />
                                    <span className="font-extrabold text-[#0F2F58]">
                                        Add to Citizen Picks
                                    </span>
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Booking Dock (Handles Quantity, Booking, and Picks on mobile) */}
            <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
                <div className="flex items-center gap-2">
                    {/* Quantity Stepper (Mobile Bottom Bar) */}
                    <div className="flex h-11 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 shadow-2xs">
                        <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-white text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-90"
                            aria-label="Decrease quantity"
                        >
                            <Minus className="size-3 stroke-[2.5]" />
                        </button>
                        <span className="w-5 text-center font-mono text-xs font-extrabold text-slate-900">
                            {quantity}
                        </span>
                        <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.min(quantityLimit, q + 1))}
                            disabled={selectedOptionUnavailable || quantity >= quantityLimit}
                            className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-white text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-90 disabled:opacity-40"
                            aria-label="Increase quantity"
                        >
                            <Plus className="size-3 stroke-[2.5]" />
                        </button>
                    </div>

                    {/* Primary Direct Action Button */}
                    <button
                        type="button"
                        onClick={handleDirectAction}
                        disabled={selectedOptionUnavailable}
                        className="flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#0F2F58] px-3 text-xs font-extrabold text-white shadow-md active:bg-[#0a2240] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <span className="truncate">
                            {selectedOptionUnavailable
                                ? 'Unavailable'
                                : chainSlotContext
                                  ? `Add to Slot · ₱${calculatedTotal.toFixed(2)}`
                                  : `${isService ? 'Book Service' : 'Buy Now'} · ₱${calculatedTotal.toFixed(2)}`}
                        </span>
                        <ArrowRight className="size-3.5 shrink-0" />
                    </button>

                    {/* Secondary Add to Picks Button */}
                    <button
                        type="button"
                        onClick={handleAddToPicks}
                        disabled={selectedOptionUnavailable}
                        className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-800 shadow-2xs transition-all hover:bg-slate-200 active:scale-95"
                        title="Add to Citizen Picks"
                        aria-label="Add to Citizen Picks"
                    >
                        <Plus className="size-4 stroke-[2.5] text-[#0F2F58]" />
                        <span className="text-[11px] font-extrabold whitespace-nowrap text-[#0F2F58]">
                            Picks
                        </span>
                    </button>
                </div>
            </div>

            <PicksDrawer
                open={picksOpen}
                onClose={() => setPicksOpen(false)}
                items={basket}
                recipes={Object.values(dealChainRecipes)}
                onUpdateQuantity={(id, delta) => {
                    saveBasket(basket.map((item) => item.id === id
                        ? { ...item, quantity: Math.max(1, Math.min(item.variant_available ?? Number.MAX_SAFE_INTEGER, item.quantity + delta)) }
                        : item));
                }}
                onRemoveItem={(id) => saveBasket(basket.filter((item) => item.id !== id))}
                onCheckout={() => {
                    setPicksOpen(false);
                    if (basket.some((item) => Boolean(item.dealChain))) {
                        setCheckoutModalOpen(true);
                        return;
                    }
                    const item = basket[0];
                    if (!item) return;
                    const url = listingBookingUrl(item, window.location.origin);
                    if (url) router.visit(url);
                }}
                onAttachDealChain={handleAttachDealChain}
                onSwapSlotCandidate={handleSwapSlotCandidate}
            />
            <DealChainCheckoutModal
                open={checkoutModalOpen}
                onClose={() => setCheckoutModalOpen(false)}
                items={basket}
                totalAmount={basket.reduce((sum, item) => sum + item.price * item.quantity, 0)}
                onAuthorize={handleAuthorizeDealChain}
            />
        </div>
    );
}
