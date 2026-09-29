import { useEffect, useState, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Star,
    MapPin,
    ShieldCheck,
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
import type { HomeProps, ListingAddonRecord, PartnerCandidateRecord } from '../types';
import { DesktopGlobalNav } from '../components/layout/DesktopGlobalNav';
import { PicksDrawer } from '../components/marketplace/PicksDrawer';
import { PartnerSelectionDrawer } from '../components/marketplace/PartnerSelectionDrawer';
import { DealChainCheckoutModal } from '../components/marketplace/DealChainCheckoutModal';
import { indexDealChainRecipes } from '../marketplace/dealChainRecipes';
import type { DealChainRecipeDefinition } from '../marketplace/dealChainRecipes';
import type {
    BasketItem,
    PublishedDealChainRecipeId,
    SlotCandidateListing,
} from '../marketplace/types';
// Category Images
const CATEGORY_IMAGES: Record<string, string> = {
    repairs: '/photos/ac-clean.jpg',
    'home-cleaning': '/photos/req-electrician.jpg',
    courier: '/photos/courier.jpg',
    'local-food': '/photos/bibingka.jpg',
    'print-assist': '/photos/greeting.jpg',
    'greeting-cards': '/photos/greeting.jpg',
    'local-services': '/photos/ac-clean.jpg',
    default: '/photos/ac-clean.jpg',
};
const DEFAULT_SERVICE_ADDONS: ListingAddonRecord[] = [
    {
        id: 'addon-rush-priority',
        code: 'rush_priority',
        title: 'Fast Clean (Same-Day / Rush Priority)',
        description: 'Priority scheduling request for the independent provider agreement.',
        price_amount_minor: 10000,
        currency: 'PHP',
        partner_role: 'technician',
        partner_fixture_keys: [],
        status: 'available',
        settlement_mode: 'independent_provider_agreement',
    },
    {
        id: 'addon-chemical-flush',
        code: 'chemical_flush',
        title: 'Anti-Bacterial Chemical Flush (Deep Ozone Clean)',
        description: 'Additional diagnostic and cleaning scope proposed for provider acceptance.',
        price_amount_minor: 15000,
        currency: 'PHP',
        partner_role: 'technician',
        partner_fixture_keys: [],
        status: 'available',
        settlement_mode: 'independent_provider_agreement',
    },
];

export type PackageTier = {
    id: string;
    title: string;
    price: number;
    origPrice?: number;
    sub: string;
    inclusions: string[];
};

const CATEGORY_PACKAGES: Record<string, PackageTier[]> = {
    repairs: [
        {
            id: 'pkg-1',
            title: '1 Unit Standard',
            price: 450,
            origPrice: 550,
            sub: 'Deep coil & drain clean',
            inclusions: [
                'On-site breaker isolation & diagnostic status check',
                'Evaporator coil alkaline chemical foam disinfection',
                'Blower fan wheel disassembly and grease flush',
                'Dual-probe delta temperature test (ΔT ≥ 12°C)',
            ],
        },
        {
            id: 'pkg-2',
            title: '2 Units Dual Split',
            price: 850,
            origPrice: 1100,
            sub: 'Save ₱50 bundle',
            inclusions: [
                'Complete service on two indoor units',
                'Outdoor condensing unit pressure flush & fin inspection',
                'Freon operating pressure calibration test',
                'Full photographic milestone sign-off',
            ],
        },
        {
            id: 'pkg-3',
            title: '3 Units Full Home',
            price: 1200,
            origPrice: 1650,
            sub: 'Save ₱150 package',
            inclusions: [
                'Complete service on three indoor units + outdoor units',
                'Anti-bacterial ozone air duct sanitization',
                'Priority same-day completion guarantee',
                'Customer OTP handover & digital service warranty',
            ],
        },
    ],
    'local-food': [
        {
            id: 'pkg-food-1',
            title: 'Solo Snack Box',
            price: 80,
            origPrice: 95,
            sub: '2 pcs warm bibingka',
            inclusions: [
                'Fresh morning batch steaming in clay oven',
                'Wrapped in organic wilted banana leaves',
                'Includes signature coconut latik dip cup',
            ],
        },
        {
            id: 'pkg-food-2',
            title: 'Family Fiesta Tray',
            price: 180,
            origPrice: 220,
            sub: '6 pcs sharing tray',
            inclusions: [
                'Six freshly baked banana-leaf bibingka cakes',
                'Generous toasted coconut shreds & salted egg toppings',
                'Insulated thermal box keeping warm for 2 hours',
            ],
        },
        {
            id: 'pkg-food-3',
            title: 'Party Jumbo Crate',
            price: 350,
            origPrice: 420,
            sub: '12 pcs party set',
            inclusions: [
                'Twelve specialty bibingka cakes',
                'Custom greeting ribbon & festive tag',
                'Bulk condiment jars & biodegradable serving ware',
            ],
        },
    ],
    'print-assist': [
        {
            id: 'pkg-print-1',
            title: 'Single Document Proof',
            price: 80,
            origPrice: 100,
            sub: 'Soft proof + 1 copy',
            inclusions: [
                'Resolution & color calibration check',
                'Digital PDF soft-copy export',
                'Initial print sample inspection',
            ],
        },
        {
            id: 'pkg-print-2',
            title: 'Standard Batch (10)',
            price: 250,
            origPrice: 320,
            sub: '10 high-grade copies',
            inclusions: [
                'Full layout optimization and soft-proof email',
                'High-speed digital color laser reproduction',
                'Protective moisture-sealed envelope packaging',
            ],
        },
        {
            id: 'pkg-print-3',
            title: 'Commercial Bulk (50+)',
            price: 850,
            origPrice: 1100,
            sub: 'Commercial package',
            inclusions: [
                'Complete multi-page booklet or flyer batch',
                'Precision guillotine trimming & folding',
                'Direct courier handoff in Tagudin',
            ],
        },
    ],
    default: [
        {
            id: 'pkg-def-1',
            title: 'Standard Scope',
            price: 120,
            origPrice: 150,
            sub: 'Base verified task',
            inclusions: [
                'Initial task briefing & scope alignment',
                'Standard execution by verified Tagudin citizen',
                'Photo proof and milestone completion verification',
            ],
        },
        {
            id: 'pkg-def-2',
            title: 'Extended Package',
            price: 240,
            origPrice: 300,
            sub: 'Double capacity scope',
            inclusions: [
                'Complete task execution with extra care',
                'Quality review guarantee & assistance',
                'Direct courier or transport inclusion',
            ],
        },
    ],
};

// Partner Candidate Definition for Substitution
export type PartnerCandidate = {
    id: string;
    role: 'courier' | 'technician' | 'store' | 'auditor';
    name: string;
    sub: string;
    fee: number;
    category: string;
    icon: 'truck' | 'labor' | 'store' | 'audit';
    image?: string;
};

export function getPartnerImage(candidate?: PartnerCandidate | null): string {
    if (!candidate) return '/photos/ac-clean.jpg';
    if (candidate.image) return candidate.image;
    if (candidate.role === 'store') return '/photos/ac-capacitor.jpg';
    if (candidate.role === 'courier') return '/photos/courier.jpg';
    if (candidate.role === 'technician') return '/photos/ac-clean.jpg';
    if (candidate.role === 'auditor') return '/photos/req-electrician.jpg';
    return '/photos/ac-clean.jpg';
}
export const PARTNER_CATALOG: Record<
    'courier' | 'technician' | 'store' | 'auditor',
    PartnerCandidate[]
> = {
    courier: [
        {
            id: 'c-1',
            role: 'courier',
            name: 'Danny Express Motorcycle Pool',
            sub: 'Fast 15–25m · Insulated box · Centro & all barangays',
            fee: 35,
            category: 'motorcycle',
            icon: 'truck',
        },
        {
            id: 'c-2',
            role: 'courier',
            name: 'Kuya Danny Tricycle Cargo',
            sub: 'Heavy / Bulky cargo sidecar · All Tagudin',
            fee: 60,
            category: 'tricycle',
            icon: 'truck',
        },
        {
            id: 'c-3',
            role: 'courier',
            name: 'Barangay Centro Bicycle Runner',
            sub: 'Local Poblacion Centro eco delivery',
            fee: 25,
            category: 'bicycle',
            icon: 'truck',
        },
    ],
    technician: [
        {
            id: 't-1',
            role: 'technician',
            name: 'Kuya Ben Aircon Services',
            sub: 'Certified AC & Refrigeration Technician',
            fee: 250,
            category: 'hvac',
            icon: 'labor',
        },
        {
            id: 't-2',
            role: 'technician',
            name: 'Mark Electrical & HVAC Services',
            sub: 'Licensed Master Electrician · Power isolation',
            fee: 280,
            category: 'electrician',
            icon: 'labor',
        },
        {
            id: 't-3',
            role: 'technician',
            name: 'Tagudin Trade Repair Guild',
            sub: 'Multi-trade contractor team',
            fee: 220,
            category: 'guild',
            icon: 'labor',
        },
    ],
    store: [
        {
            id: 's-1',
            role: 'store',
            name: 'Tagudin Hardware & Supply Depot',
            sub: 'Direct counter lane · Genuine parts guarantee',
            fee: 180,
            category: 'depot',
            icon: 'store',
        },
        {
            id: 's-2',
            role: 'store',
            name: 'Centro Electrical & Aircon Depot',
            sub: 'Original OEM capacitors and chemical foam',
            fee: 195,
            category: 'oem',
            icon: 'store',
        },
    ],
    auditor: [
        {
            id: 'a-1',
            role: 'auditor',
            name: 'Safety Check (Master Electrician)',
            sub: 'Safety certificate & thermal load inspection',
            fee: 150,
            category: 'electrician',
            icon: 'audit',
        },
        {
            id: 'a-2',
            role: 'auditor',
            name: 'Tagudin Safety & Electrical Audit Guild',
            sub: 'Complete municipal electrical audit certificate',
            fee: 160,
            category: 'guild',
            icon: 'audit',
        },
    ],
};

// Verified Customer Reviews
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

const SAMPLE_REVIEWS: ReviewItem[] = [
    {
        id: 'rev-1',
        author: 'Maria S.',
        barangay: 'Barangay Centro',
        timeAgo: '3 days ago',
        stars: 5,
        packageTag: '2 Units Dual Split',
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
        hasPhoto: true,
    },
    {
        id: 'rev-3',
        author: 'Ate Elena',
        barangay: 'Barangay Rizal',
        timeAgo: '2 weeks ago',
        stars: 5,
        packageTag: '1 Unit Standard + Condenser',
        quote: 'Mabilis mag-troubleshoot si Kuya Ben. Pinalitan capacitor at nilinis coil.',
        hasPhoto: false,
    },
    {
        id: 'rev-4',
        author: 'Mang Jose',
        barangay: 'Pudoc West',
        timeAgo: '3 weeks ago',
        stars: 4,
        packageTag: 'Express Service',
        quote: 'Maayos kausap at maaasahan sa mga biglaang takbo sa centro.',
        hasPhoto: false,
    },
];

const REVIEW_PHOTOS = [
    {
        label: 'Chemical coil disinfection',
        url: '/photos/ac-clean.jpg',
    },
    {
        label: 'Capacitor replacement',
        url: '/photos/ac-capacitor.jpg',
    },
    {
        label: 'Electrical circuit test',
        url: '/photos/req-electrician.jpg',
    },
    {
        label: 'Finished service handoff',
        url: '/photos/ac-clean.jpg',
    },
];

function getCategoryPhoto(categoryCode?: string | null): string {
    const code = (categoryCode || 'default').toLowerCase();
    return CATEGORY_IMAGES[code] || CATEGORY_IMAGES.default;
}

function getCategoryPackages(categoryCode?: string | null): PackageTier[] {
    const code = (categoryCode || 'default').toLowerCase();
    return CATEGORY_PACKAGES[code] || CATEGORY_PACKAGES.default;
}
function partnerCatalogFromRecords(
    records?: PartnerCandidateRecord[],
): Record<PartnerCandidate['role'], PartnerCandidate[]> {
    if (!records || records.length === 0) {
        return PARTNER_CATALOG;
    }

    const catalog: Record<PartnerCandidate['role'], PartnerCandidate[]> = {
        courier: [],
        technician: [],
        store: [],
        auditor: [],
    };

    records.forEach((record) => {
        catalog[record.role].push({
            id: record.id,
            role: record.role,
            name: record.name,
            sub: record.sub,
            fee: record.fee_amount_minor / 100,
            category: record.category,
            icon: record.icon,
        });
    });

    (Object.keys(catalog) as PartnerCandidate['role'][]).forEach((role) => {
        if (catalog[role].length === 0) {
            catalog[role] = PARTNER_CATALOG[role];
        }
    });

    return catalog;
}

export default function ListingDetail(props: HomeProps) {
    const listing = props.activeListingDetail;
    const dealChainRecipes = useMemo(
        () =>
            indexDealChainRecipes(
                props.dealChainCatalog as DealChainRecipeDefinition[] | undefined,
            ),
        [props.dealChainCatalog],
    );
    const partnerCatalog = useMemo(
        () => partnerCatalogFromRecords(listing?.partner_candidates),
        [listing?.partner_candidates],
    );
    const isService = (listing?.listing_type || listing?.listingType) !== 'product';
    const addonPrices = useMemo(
        () =>
            Object.fromEntries(
                (listing?.addons ?? []).map((addon) => [
                    addon.code,
                    addon.price_amount_minor / 100,
                ]),
            ) as Record<string, number>,
        [listing?.addons],
    );

    // Direct service addons (excluding partner fulfillment scope relays)
    const directAddons = useMemo(() => {
        const raw =
            listing?.addons !== undefined
                ? (listing.addons ?? [])
                : isService
                  ? DEFAULT_SERVICE_ADDONS
                  : [];
        return raw.filter((addon) => {
            const role = addon.partner_role?.toLowerCase();
            const code = addon.code?.toLowerCase();
            return (
                role !== 'store' &&
                role !== 'courier' &&
                role !== 'auditor' &&
                code !== 'turnkey_parts' &&
                code !== 'safety_audit' &&
                code !== 'courier_delivery' &&
                code !== 'product_install'
            );
        });
    }, [listing?.addons, isService]);

    const [selectedAddonCodes, setSelectedAddonCodes] = useState<string[]>([]);

    const toggleAddon = (code: string) => {
        setSelectedAddonCodes((prev) =>
            prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
        );
    };

    // Available packages for this listing (prioritizing server-projected listing.package_tiers)
    const packages = useMemo<PackageTier[]>(() => {
        if (listing?.package_tiers && listing.package_tiers.length > 0) {
            return listing.package_tiers.map((t) => ({
                id: t.id,
                title: t.title,
                price: t.price,
                origPrice: t.orig_price ?? t.origPrice,
                sub: t.sub,
                inclusions: t.inclusions,
            }));
        }
        return getCategoryPackages(listing?.category_code || listing?.categoryCode);
    }, [listing?.package_tiers, listing?.category_code, listing?.categoryCode]);

    // Selected package tier state
    const [selectedPackageIndex, setSelectedPackageIndex] = useState(0);
    const activePackage = packages[selectedPackageIndex] ||
        packages[0] || {
            id: 'pkg-default',
            title: 'Standard Package',
            price: 450,
            sub: 'Base scope',
            inclusions: ['Standard verified task execution'],
        };

    const [serviceScope, setServiceScope] = useState<'direct' | 'turnkey' | 'audit'>('direct');
    const [productScope, setProductScope] = useState<'pickup' | 'delivery' | 'installation'>(
        'pickup',
    );

    // Server-projected milestone stages (with truthful fallback based on listing work_shape)
    // Server-projected milestone stages (service execution pipeline)
    const milestoneStages = useMemo(() => {
        const raw = listing?.milestone_stages || listing?.milestoneStages;
        if (Array.isArray(raw) && raw.length > 0) {
            return raw.map((s, idx) => ({
                id: s.id || `stage-${idx + 1}`,
                step: idx + 1,
                title: s.title || s.label || s.id?.replace(/_/g, ' ') || `Step ${idx + 1}`,
                description:
                    s.description ||
                    s.sub ||
                    (idx === 0
                        ? 'Scope confirmed & provider agreement established'
                        : idx === 1
                          ? 'Active work execution & on-site delivery'
                          : 'Final milestone inspection & photographic handoff'),
            }));
        }
        if (isService) {
            return [
                {
                    id: 'scope_confirmed',
                    step: 1,
                    title: 'Scope Confirmed & Provider Agreement',
                    description: 'Bilateral agreement confirmed between citizen and verified Tagudin provider.',
                },
                {
                    id: 'execution_gate',
                    step: 2,
                    title: 'On-Site Execution & Labor Delivery',
                    description: 'Active service execution following municipal quality standards.',
                },
                {
                    id: 'handoff_proof',
                    step: 3,
                    title: 'Photo Milestone Evidence & Sign-Off',
                    description: 'Photo proof required before bilateral escrow release.',
                },
            ];
        }
        // Canonical Product Handoff Protocol (A4)
        if (productScope === 'pickup') {
            return [
                {
                    id: 'sourcing_prep',
                    step: 1,
                    title: 'Sourcing & Package Preparation',
                    description: 'Merchant verifies stock count, item condition, and prepares package.',
                },
                {
                    id: 'counter_handoff',
                    step: 2,
                    title: 'Counter Collection & Verification',
                    description: 'Buyer inspects item at stall counter and signs receipt slip or QR.',
                },
                {
                    id: 'condition_close',
                    step: 3,
                    title: 'Condition Close-Out & Release',
                    description: 'Dual confirmation records successful handoff before final escrow release.',
                },
            ];
        }
        return [
            {
                id: 'store_prep',
                step: 1,
                title: 'Store Sourcing & Dispatch Packaging',
                description: 'Merchant commits inventory and prepares package for courier pickup.',
            },
            {
                id: 'courier_relay',
                step: 2,
                title: 'Courier Custody & Transit Relay',
                description: 'Independently contracted courier verifies package condition and transports.',
            },
            {
                id: 'doorstep_proof',
                step: 3,
                title: 'Doorstep Arrival & Photo Confirmation',
                description: 'Photographed proof of delivery and recipient confirmation at destination.',
            },
        ];
    }, [listing?.milestone_stages, listing?.milestoneStages, isService, productScope]);


    // Selected active partners in each slot
    const [currentCourier, setCurrentCourier] = useState<PartnerCandidate>(
        () => partnerCatalog.courier[0] ?? PARTNER_CATALOG.courier[0],
    );
    const [currentTech, setCurrentTech] = useState<PartnerCandidate>(
        () => partnerCatalog.technician[0] ?? PARTNER_CATALOG.technician[0],
    );
    const [currentStore, setCurrentStore] = useState<PartnerCandidate>(
        () => partnerCatalog.store[0] ?? PARTNER_CATALOG.store[0],
    );
    const [currentAudit, setCurrentAudit] = useState<PartnerCandidate>(
        () => partnerCatalog.auditor[0] ?? PARTNER_CATALOG.auditor[0],
    );
    useEffect(() => {
        setCurrentCourier(partnerCatalog.courier[0] ?? PARTNER_CATALOG.courier[0]);
        setCurrentTech(partnerCatalog.technician[0] ?? PARTNER_CATALOG.technician[0]);
        setCurrentStore(partnerCatalog.store[0] ?? PARTNER_CATALOG.store[0]);
        setCurrentAudit(partnerCatalog.auditor[0] ?? PARTNER_CATALOG.auditor[0]);
    }, [partnerCatalog]);

    // Partner Substitution Modal State
    // Partner Substitution Drawer State
    const [subModalRole, setSubModalRole] = useState<
        'courier' | 'technician' | 'store' | 'auditor' | null
    >(null);
    // Collapsible Customizer Option Toggles (Fast Clean & Chemical Flush)
    const [customizerOpen, setCustomizerOpen] = useState(false);
    const [pipelineExpanded, setPipelineExpanded] = useState(false);
    // Contextual Deal Chain Slot URL param (?chain_slot=)
    const [chainSlotContext, setChainSlotContext] = useState<string | null>(null);

    // Picks / Basket state
    const [basket, setBasket] = useState<BasketItem[]>([]);
    const [picksOpen, setPicksOpen] = useState(false);
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [quantity, setQuantity] = useState(1);
    // Reviews expansion & filter state
    const [reviewsExpanded, setReviewsExpanded] = useState(false);
    const [reviewFilter, setReviewFilter] = useState<'all' | '5' | '4' | 'photos'>('all');
    const [reviewPage, setReviewPage] = useState(1);

    // Read query parameters and localStorage on mount & synchronize live
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const slot = params.get('chain_slot');
            if (slot) {
                setChainSlotContext(slot);
            }
        }

        const syncBasket = () => {
            try {
                const storedBasket = localStorage.getItem('serbizyu.picks');
                if (storedBasket) {
                    setBasket(JSON.parse(storedBasket));
                } else {
                    setBasket([]);
                }
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
    }, [listing?.id]);

    const saveBasket = (newBasket: BasketItem[]) => {
        setBasket(newBasket);
        try {
            localStorage.setItem('serbizyu.picks', JSON.stringify(newBasket));
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

    // Calculate Partner Scope Add-on Price
    const scopeAddonFee = useMemo(() => {
        if (isService) {
            if (serviceScope === 'turnkey') {
                return addonPrices.turnkey_parts ?? currentStore.fee + currentCourier.fee;
            }
            if (serviceScope === 'audit') {
                return addonPrices.safety_audit ?? currentAudit.fee;
            }
            return 0;
        }
        if (productScope === 'delivery') {
            return addonPrices.courier_delivery ?? currentCourier.fee;
        }
        if (productScope === 'installation') {
            return addonPrices.product_install ?? currentCourier.fee + currentTech.fee;
        }
        return 0;
    }, [
        addonPrices,
        isService,
        serviceScope,
        productScope,
        currentStore.fee,
        currentCourier.fee,
        currentAudit.fee,
        currentTech.fee,
    ]);

    // Customizer speed & enhancement fees derived from dynamically selected addons
    const customizerFee = useMemo(() => {
        return directAddons
            .filter(
                (addon) =>
                    selectedAddonCodes.includes(addon.code) ||
                    selectedAddonCodes.includes(addon.id),
            )
            .reduce((sum, addon) => sum + addon.price_amount_minor / 100, 0);
    }, [directAddons, selectedAddonCodes]);
    // Final Unit Price & Total Calculation
    const unitPrice = (activePackage?.price || 450) + scopeAddonFee + customizerFee;
    const calculatedTotal = unitPrice * quantity;

    // Direct Booking action (Separate from Add to Picks!)
    const handleDirectAction = () => {
        if (chainSlotContext) {
            alert(
                `Staged into Deal Chain Slot [${chainSlotContext}] for ₱${calculatedTotal.toFixed(2)}`,
            );
            return;
        }
        const startUrl =
            props.booking?.start_url || (listing ? `/listings/${listing.id}/book` : '/browse');
        router.visit(startUrl);
    };

    // Secondary Add to Picks action (mutates local storage and opens drawer)
    const handleAddToPicks = () => {
        if (!listing) return;

        const existing = basket.find((b) => b.id === listing.id);
        const listingContext = {
            category_code: listing.category_code ?? listing.categoryCode ?? null,
            listing_type: listing.listing_type ?? listing.listingType ?? null,
            work_shape: listing.work_shape ?? listing.workShape ?? null,
        };
        const selectedAddonTitles = directAddons
            .filter(
                (a) =>
                    selectedAddonCodes.includes(a.code) ||
                    selectedAddonCodes.includes(a.id),
            )
            .map((a) => a.title);
        const packageLabel = activePackage.title;
        const addonLabel =
            selectedAddonTitles.length > 0 ? ` + ${selectedAddonTitles.join(', ')}` : '';
        const itemTitle = `${listing.title} (${packageLabel}${addonLabel})`;

        let updated: BasketItem[];
        if (existing) {
            updated = basket.map((b) =>
                b.id === listing.id
                    ? {
                          ...b,
                          ...listingContext,
                          quantity: b.quantity + quantity,
                          price: unitPrice,
                          title: itemTitle,
                      }
                    : b,
            );
        } else {
            updated = [
                ...basket,
                {
                    id: listing.id,
                    title: itemTitle,
                    price: unitPrice,
                    quantity,
                    ...listingContext,
                },
            ];
        }

        saveBasket(updated);
        setPicksOpen(true);
    };
    const handleAttachDealChain = (itemId: string, recipeId: PublishedDealChainRecipeId | null) => {
        const recipe = recipeId ? dealChainRecipes[recipeId] : null;
        const updated = basket.map((item) => {
            if (item.id !== itemId) return item;
            const currentAddon = item.dealChain?.extraFee || 0;
            const newAddon = recipe?.extraFee || 0;
            const newPrice = item.price - currentAddon + newAddon;
            return {
                ...item,
                price: newPrice,
                dealChain: recipe || undefined,
            };
        });
        saveBasket(updated);
    };
    const handleSwapSlotCandidate = (
        itemId: string,
        nodeIndex: number,
        candidate: SlotCandidateListing,
    ) => {
        const next = basket.map((item) => {
            if (item.id !== itemId || !item.dealChain) return item;
            const updatedNodes = [...item.dealChain.nodes];
            const oldNode = updatedNodes[nodeIndex];
            const oldPrice = oldNode.priceMinor ?? (oldNode.type === 'store' ? 18000 : 8000);
            const newPrice = candidate.price_minor;
            const priceDiff = (newPrice - oldPrice) / 100;

            updatedNodes[nodeIndex] = {
                ...oldNode,
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
                    nodes: updatedNodes,
                },
            };
        });
        saveBasket(next);
    };

    const handleAuthorizeDealChain = () => {
        setCheckoutModalOpen(false);
        router.post(
            '/deal-chains/authorize',
            {
                items: basket.map((b) => ({
                    id: b.id,
                    quantity: b.quantity,
                    deal_chain: b.dealChain?.recipeId || null,
                    slot_overrides: b.dealChain?.nodes
                        ? Object.fromEntries(
                              b.dealChain.nodes
                                  .filter((n) => n.listingId)
                                  .map((n) => [
                                      n.type,
                                      {
                                          listing_id: n.listingId,
                                          provider_user_id: n.providerId,
                                          price_minor: n.priceMinor,
                                      },
                                  ]),
                          )
                        : null,
                })),
            },
            {
                onSuccess: () => {
                    saveBasket([]);
                },
            },
        );
    };
    const handleSelectCandidate = (candidate: PartnerCandidate) => {
        if (candidate.role === 'courier') setCurrentCourier(candidate);
        if (candidate.role === 'technician') setCurrentTech(candidate);
        if (candidate.role === 'store') setCurrentStore(candidate);
        if (candidate.role === 'auditor') setCurrentAudit(candidate);
        setSubModalRole(null);
    };
    const ratingSummary = listing?.rating_summary;
    const incomingReviews = listing?.reviews as ReviewItem[] | undefined;
    const hasIncomingReviews = Array.isArray(incomingReviews);
    const reviewsList = hasIncomingReviews ? incomingReviews : SAMPLE_REVIEWS;
    const reviewsCount = ratingSummary?.reviews_count ?? (hasIncomingReviews ? incomingReviews.length : 128);
    const avgRating = ratingSummary?.rating ?? 4.9;
    const satisfactionPct = ratingSummary?.satisfaction_pct ?? 98;

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
    const photoUrl = getCategoryPhoto(listing?.category_code || listing?.categoryCode);

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
                onPicksClick={() => setPicksOpen(true)}
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
                            <img
                                src={photoUrl}
                                alt={listing.title}
                                className="size-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/photos/ac-clean.jpg';
                                }}
                            />
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
                            {/* Promo / Category Badge */}
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-[#EBF2FA] px-3 py-0.5 text-[11px] font-extrabold tracking-wide text-[#0F2F58] uppercase">
                                    {isService ? 'Verified Service' : 'Verified Local Product'}
                                </span>
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-800">
                                    -18% Tagudin Launch Promo
                                </span>
                            </div>

                            {/* Main Title */}
                            <h1 className="text-xl leading-tight font-extrabold text-[#0F2F58] sm:text-2xl">
                                {listing.title}
                            </h1>

                            {/* Price Line (Big Price + Strikethrough + Unit Label) */}
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
                                    {isService ? '/ service unit' : '/ item package'}
                                </span>
                            </div>

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
                                {listing.description ||
                                    'Standard verified offering in Tagudin, Ilocos Sur. Backed by municipal escrow protection and photo milestone evidence.'}
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
                                        Choose Package Tier
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Select service scope or batch size
                                    </p>
                                </div>
                                <span className="text-[11px] font-bold text-[#0F2F58]">
                                    {packages.length} Tiers Available
                                </span>
                            </div>

                            {/* Horizontal 1-Row Scrollable Package Cards Rail */}
                            <div className="flex gap-2.5 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1">
                                {packages.map((pkg, idx) => {
                                    const isSelected = selectedPackageIndex === idx;
                                    return (
                                        <button
                                            key={pkg.id}
                                            type="button"
                                            onClick={() => setSelectedPackageIndex(idx)}
                                            className={`flex shrink-0 w-[210px] sm:w-[230px] cursor-pointer flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                                                isSelected
                                                    ? 'border-[#0F2F58] bg-[#EBF2FA] shadow-xs ring-1 ring-[#0F2F58]/25'
                                                    : 'border-slate-200 bg-[#FAFCFB] hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex w-full items-center justify-between gap-1">
                                                <span
                                                    className={`text-xs font-extrabold truncate ${isSelected ? 'text-[#0F2F58]' : 'text-slate-900'}`}
                                                >
                                                    {pkg.title}
                                                </span>
                                                {isSelected && (
                                                    <Check className="size-3.5 text-[#0F2F58] shrink-0" />
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

                            {/* Inclusions Checklist for Selected Tier */}
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

                            {/* Collapsible Options Customizer Link */}
                            {directAddons.length > 0 && (
                                <div className="mt-4 border-t border-slate-100 pt-3">
                                    <div className="flex flex-col items-center">
                                        <button
                                            type="button"
                                            onClick={() => setCustomizerOpen((prev) => !prev)}
                                            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#0F2F58] hover:underline"
                                        >
                                            <span>Customize service speed &amp; add-ons ({directAddons.length} available)</span>
                                            {customizerOpen ? (
                                                <ChevronUp className="size-3.5" />
                                            ) : (
                                                <ChevronDown className="size-3.5" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Collapsible Options Panel (Dynamic from listing.addons) */}
                                    {customizerOpen && (
                                        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                            {directAddons.map((addon) => {
                                                const identifier = addon.code || addon.id;
                                                const isSelected = selectedAddonCodes.includes(identifier);
                                                const price = (addon.price_amount_minor / 100).toFixed(2);

                                                return (
                                                    <label
                                                        key={identifier}
                                                        className={`flex cursor-pointer items-start justify-between rounded-lg border p-2.5 transition-colors ${
                                                            isSelected
                                                                 ? 'border-[#0F2F58] bg-[#EBF2FA]'
                                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-2.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleAddon(identifier)}
                                                                className="mt-0.5 size-4 rounded accent-[#0F2F58]"
                                                            />
                                                            <div>
                                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                                                    <Sparkles className="size-3.5 text-[#0F2F58]" />
                                                                    <span>{addon.title}</span>
                                                                </div>
                                                                {addon.description && (
                                                                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                                                                        {addon.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="font-mono text-xs font-extrabold text-[#0F2F58] shrink-0 ml-3">
                                                            +₱{price}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 3b. Work Execution Pipeline (Compact by default, clickable to view details) */}
                        {milestoneStages.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-sm font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                            {isService ? 'Work Execution Pipeline' : 'Fulfillment & Handoff Protocol'}
                                        </h2>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {isService
                                                ? `${milestoneStages.length} verified craft milestones tracked by T4 Work engine`
                                                : `${milestoneStages.length} custody & dispatch gates protected by verified handoff`}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPipelineExpanded((prev) => !prev)}
                                        className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-[#0F2F58] hover:bg-slate-200 transition-colors"
                                    >
                                        <span>{pipelineExpanded ? 'Collapse' : 'Details'}</span>
                                        <ChevronDown className={`size-3.5 transition-transform duration-200 ${pipelineExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>

                                {/* Compact Stepper Row (Always visible summary) */}
                                <div
                                    onClick={() => setPipelineExpanded((prev) => !prev)}
                                    className="mt-3.5 flex cursor-pointer items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-100 bg-[#F8FAFC] p-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-colors hover:border-slate-200"
                                    title="Click to view stage details"
                                >
                                    {milestoneStages.map((stage, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 shrink-0">
                                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs">
                                                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0F2F58]/10 text-[10px] font-extrabold text-[#0F2F58]">
                                                    {stage.step || idx + 1}
                                                </div>
                                                <span className="text-[11px] font-extrabold text-slate-800 whitespace-nowrap">
                                                    {stage.title}
                                                </span>
                                            </div>
                                            {idx < milestoneStages.length - 1 && (
                                                <span className="text-slate-300 font-bold text-xs px-0.5">→</span>
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
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 4. Deal Chain Fulfillment Scope Presets & Custom Partner Substitution */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                            <div className="mb-3 flex items-baseline justify-between">
                                <div>
                                    <h2 className="text-sm font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                        Select Fulfillment Scope
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Partner other verified Tagudin listings
                                    </p>
                                </div>
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                    Deal Chain
                                </span>
                            </div>

                            {/* Scope Presets Carousel */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {isService ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setServiceScope('direct')}
                                            className={`flex cursor-pointer flex-col rounded-xl border p-3.5 text-left transition-all ${
                                                serviceScope === 'direct'
                                                    ? 'border-[#0F2F58] bg-[#EBF2FA] shadow-xs'
                                                    : 'border-slate-200 bg-[#FAFCFB] hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex w-full items-center justify-between">
                                                <span className="text-xs font-extrabold text-[#0F2F58]">
                                                    Labor Only
                                                </span>
                                                {serviceScope === 'direct' && (
                                                    <Check className="size-3.5 text-[#0F2F58]" />
                                                )}
                                            </div>
                                            <div className="mt-1 font-mono text-sm font-extrabold text-emerald-700">
                                                Included
                                            </div>
                                            <div className="mt-0.5 text-[10px] text-slate-500">
                                                Direct provider service
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setServiceScope('turnkey')}
                                            className={`flex cursor-pointer flex-col rounded-xl border p-3.5 text-left transition-all ${
                                                serviceScope === 'turnkey'
                                                    ? 'border-[#0F2F58] bg-[#EBF2FA] shadow-xs'
                                                    : 'border-slate-200 bg-[#FAFCFB] hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex w-full items-center justify-between">
                                                <span className="text-xs font-extrabold text-[#0F2F58]">
                                                    Turnkey Parts
                                                </span>
                                                {serviceScope === 'turnkey' && (
                                                    <Check className="size-3.5 text-[#0F2F58]" />
                                                )}
                                            </div>
                                            <div className="mt-1 font-mono text-sm font-extrabold text-[#0F2F58]">
                                                +₱
                                                {(
                                                    addonPrices.turnkey_parts ??
                                                    currentStore.fee + currentCourier.fee
                                                ).toFixed(2)}
                                            </div>
                                            <div className="mt-0.5 text-[10px] text-slate-500">
                                                Store + Courier delivery
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setServiceScope('audit')}
                                            className={`flex cursor-pointer flex-col rounded-xl border p-3.5 text-left transition-all ${
                                                serviceScope === 'audit'
                                                    ? 'border-[#0F2F58] bg-[#EBF2FA] shadow-xs'
                                                    : 'border-slate-200 bg-[#FAFCFB] hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex w-full items-center justify-between">
                                                <span className="text-xs font-extrabold text-[#0F2F58]">
                                                    Safety Audit
                                                </span>
                                                {serviceScope === 'audit' && (
                                                    <Check className="size-3.5 text-[#0F2F58]" />
                                                )}
                                            </div>
                                            <div className="mt-1 font-mono text-sm font-extrabold text-[#0F2F58]">
                                                +₱
                                                {(
                                                    addonPrices.safety_audit ?? currentAudit.fee
                                                ).toFixed(2)}
                                            </div>
                                            <div className="mt-0.5 text-[10px] text-slate-500">
                                                Municipal safety certificate
                                            </div>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setProductScope('pickup')}
                                            className={`flex cursor-pointer flex-col rounded-xl border p-3.5 text-left transition-all ${
                                                productScope === 'pickup'
                                                    ? 'border-[#0F2F58] bg-[#EBF2FA] shadow-xs'
                                                    : 'border-slate-200 bg-[#FAFCFB] hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex w-full items-center justify-between">
                                                <span className="text-xs font-extrabold text-[#0F2F58]">
                                                    In-Store Pickup
                                                </span>
                                                {productScope === 'pickup' && (
                                                    <Check className="size-3.5 text-[#0F2F58]" />
                                                )}
                                            </div>
                                            <div className="mt-1 font-mono text-sm font-extrabold text-emerald-700">
                                                Free
                                            </div>
                                            <div className="mt-0.5 text-[10px] text-slate-500">
                                                Ready at stall counter
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setProductScope('delivery')}
                                            className={`flex cursor-pointer flex-col rounded-xl border p-3.5 text-left transition-all ${
                                                productScope === 'delivery'
                                                    ? 'border-[#0F2F58] bg-[#EBF2FA] shadow-xs'
                                                    : 'border-slate-200 bg-[#FAFCFB] hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex w-full items-center justify-between">
                                                <span className="text-xs font-extrabold text-[#0F2F58]">
                                                    Doorstep Delivery
                                                </span>
                                                {productScope === 'delivery' && (
                                                    <Check className="size-3.5 text-[#0F2F58]" />
                                                )}
                                            </div>
                                            <div className="mt-1 font-mono text-sm font-extrabold text-[#0F2F58]">
                                                +₱
                                                {(
                                                    addonPrices.courier_delivery ??
                                                    currentCourier.fee
                                                ).toFixed(2)}
                                            </div>
                                            <div className="mt-0.5 text-[10px] text-slate-500">
                                                {currentCourier.name.split(' ')[0]}
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setProductScope('installation')}
                                            className={`flex cursor-pointer flex-col rounded-xl border p-3.5 text-left transition-all ${
                                                productScope === 'installation'
                                                    ? 'border-[#0F2F58] bg-[#EBF2FA] shadow-xs'
                                                    : 'border-slate-200 bg-[#FAFCFB] hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex w-full items-center justify-between">
                                                <span className="text-xs font-extrabold text-[#0F2F58]">
                                                    Installation Labor
                                                </span>
                                                {productScope === 'installation' && (
                                                    <Check className="size-3.5 text-[#0F2F58]" />
                                                )}
                                            </div>
                                            <div className="mt-1 font-mono text-sm font-extrabold text-[#0F2F58]">
                                                +₱
                                                {(
                                                    addonPrices.product_install ??
                                                    currentCourier.fee + currentTech.fee
                                                ).toFixed(2)}
                                            </div>
                                            <div className="mt-0.5 text-[10px] text-slate-500">
                                                Rider + Certified Tech
                                            </div>
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Connected Deal Chain Flow & Live Pipeline Diagram (Visible when chain active) */}
                            {((isService && serviceScope !== 'direct') ||
                                (!isService && productScope !== 'pickup')) && (
                                <div className="mt-4 border-t border-slate-100 pt-4">
                                    <div className="mb-2.5 flex items-center justify-between">
                                        <span className="text-xs font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                            Connected Deal Chain Flow
                                        </span>
                                        <span className="text-[11px] font-bold text-emerald-700">
                                            Multi-Party Pipeline
                                        </span>
                                    </div>

                                    {/* Horizontal Animated Deal Chain Pipeline */}
                                    <div className="flex [scrollbar-width:none] items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        {/* Node 1 */}
                                        <div className="flex min-w-[95px] flex-col items-center rounded-xl border border-slate-200 bg-white p-2 text-center shadow-xs">
                                            <div className="relative mb-1 size-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-2xs">
                                                <img
                                                    src={getPartnerImage(currentStore)}
                                                    alt={currentStore.name}
                                                    className="size-full object-cover"
                                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/photos/ac-capacitor.jpg'; }}
                                                />
                                                <span className="absolute bottom-0 right-0 rounded-tl bg-amber-500 px-1 text-[7px] font-extrabold text-white">
                                                    STORE
                                                </span>
                                            </div>
                                            <div className="w-full truncate text-[10px] font-extrabold text-slate-800">
                                                {isService
                                                    ? currentStore.name.split(' ')[0]
                                                    : 'Tagudin Stall'}
                                            </div>
                                            <div className="text-[8.5px] font-bold text-[#0F2F58]">
                                                {isService
                                                    ? `₱${currentStore.fee.toFixed(0)}`
                                                    : 'Ready'}
                                            </div>
                                        </div>

                                        {/* Wire 1 */}
                                        <div className="flex flex-col items-center justify-center px-1">
                                            <svg
                                                className="h-3 w-6 text-[#0F2F58]"
                                                viewBox="0 0 28 12"
                                            >
                                                <line
                                                    x1="0"
                                                    y1="6"
                                                    x2="28"
                                                    y2="6"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeDasharray="4 4"
                                                />
                                            </svg>
                                            <span className="text-[8px] font-bold text-emerald-700 uppercase">
                                                Transit
                                            </span>
                                        </div>

                                        {/* Node 2 */}
                                        <div className="flex min-w-[95px] flex-col items-center rounded-xl border border-slate-200 bg-white p-2 text-center shadow-xs">
                                            <div className="relative mb-1 size-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-2xs">
                                                <img
                                                    src={getPartnerImage(currentCourier)}
                                                    alt={currentCourier.name}
                                                    className="size-full object-cover"
                                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/photos/courier.jpg'; }}
                                                />
                                                <span className="absolute bottom-0 right-0 rounded-tl bg-sky-500 px-1 text-[7px] font-extrabold text-white">
                                                    RIDER
                                                </span>
                                            </div>
                                            <div className="w-full truncate text-[10px] font-extrabold text-slate-800">
                                                {currentCourier.name.split(' ')[0]}
                                            </div>
                                            <div className="text-[8.5px] font-bold text-[#0F2F58]">
                                                ₱{currentCourier.fee.toFixed(0)}
                                            </div>
                                        </div>

                                        {/* Wire 2 */}
                                        <div className="flex flex-col items-center justify-center px-1">
                                            <svg
                                                className="h-3 w-6 text-[#0F2F58]"
                                                viewBox="0 0 28 12"
                                            >
                                                <line
                                                    x1="0"
                                                    y1="6"
                                                    x2="28"
                                                    y2="6"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeDasharray="4 4"
                                                />
                                            </svg>
                                            <span className="text-[8px] font-bold text-emerald-700 uppercase">
                                                On-Site
                                            </span>
                                        </div>

                                        {/* Node 3 */}
                                        <div className="flex min-w-[95px] flex-col items-center rounded-xl border border-slate-200 bg-white p-2 text-center shadow-xs">
                                            <div className="relative mb-1 size-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-2xs">
                                                <img
                                                    src={isService ? '/photos/ac-clean.jpg' : getPartnerImage(currentTech)}
                                                    alt={isService ? 'Labor' : 'Customer'}
                                                    className="size-full object-cover"
                                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/photos/ac-clean.jpg'; }}
                                                />
                                                <span className="absolute bottom-0 right-0 rounded-tl bg-emerald-600 px-1 text-[7px] font-extrabold text-white">
                                                    {isService ? 'LABOR' : 'DEST'}
                                                </span>
                                            </div>
                                            <div className="w-full truncate text-[10px] font-extrabold text-slate-800">
                                                {isService
                                                    ? 'Kuya Ben'
                                                    : productScope === 'installation'
                                                      ? currentTech.name.split(' ')[0]
                                                      : 'You'}
                                            </div>
                                            <div className="text-[8.5px] font-bold text-[#0F2F58]">
                                                {isService
                                                    ? `₱${activePackage.price.toFixed(0)}`
                                                    : 'Delivered'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Partner Custom Slot Banners with [Change ▾] buttons */}
                                    <div className="mt-3 flex flex-col gap-2">
                                        {/* Store Slot Banner (Turnkey mode) */}
                                        {isService && serviceScope === 'turnkey' && (
                                            <div className="flex items-center justify-between rounded-xl border border-[#0F2F58]/20 bg-[#F8FAFD] p-3 shadow-xs">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                                                        <img
                                                            src={getPartnerImage(currentStore)}
                                                            alt={currentStore.name}
                                                            className="size-full object-cover"
                                                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/photos/ac-capacitor.jpg'; }}
                                                        />
                                                        <span className="absolute bottom-0 inset-x-0 bg-amber-600/90 text-[7.5px] font-extrabold text-white text-center uppercase py-0.2">
                                                            Store
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-extrabold text-slate-900 truncate">
                                                            {currentStore.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 line-clamp-1">
                                                            {currentStore.sub}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubModalRole('store')}
                                                    className="shrink-0 cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[10.5px] font-extrabold text-[#0F2F58] shadow-xs hover:bg-[#EBF2FA] ml-2"
                                                >
                                                    Change Store ▾
                                                </button>
                                            </div>
                                        )}

                                        {/* Courier Slot Banner */}
                                        {((isService && serviceScope === 'turnkey') ||
                                            (!isService && productScope !== 'pickup')) && (
                                            <div className="flex items-center justify-between rounded-xl border border-[#0F2F58]/20 bg-[#F8FAFD] p-3 shadow-xs">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                                                        <img
                                                            src={getPartnerImage(currentCourier)}
                                                            alt={currentCourier.name}
                                                            className="size-full object-cover"
                                                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/photos/courier.jpg'; }}
                                                        />
                                                        <span className="absolute bottom-0 inset-x-0 bg-sky-600/90 text-[7.5px] font-extrabold text-white text-center uppercase py-0.2">
                                                            Courier
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-extrabold text-slate-900 truncate">
                                                            {currentCourier.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 line-clamp-1">
                                                            {currentCourier.sub}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubModalRole('courier')}
                                                    className="shrink-0 cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[10.5px] font-extrabold text-[#0F2F58] shadow-xs hover:bg-[#EBF2FA] ml-2"
                                                >
                                                    Change Courier ▾
                                                </button>
                                            </div>
                                        )}

                                        {/* Technician Slot Banner (Product installation mode) */}
                                        {!isService && productScope === 'installation' && (
                                            <div className="flex items-center justify-between rounded-xl border border-[#0F2F58]/20 bg-[#F8FAFD] p-3 shadow-xs">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                                                        <img
                                                            src={getPartnerImage(currentTech)}
                                                            alt={currentTech.name}
                                                            className="size-full object-cover"
                                                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/photos/ac-clean.jpg'; }}
                                                        />
                                                        <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-[7.5px] font-extrabold text-white text-center uppercase py-0.2">
                                                            Labor
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-extrabold text-slate-900 truncate">
                                                            {currentTech.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 line-clamp-1">
                                                            {currentTech.sub}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubModalRole('technician')}
                                                    className="shrink-0 cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[10.5px] font-extrabold text-[#0F2F58] shadow-xs hover:bg-[#EBF2FA] ml-2"
                                                >
                                                    Change Technician ▾
                                                </button>
                                            </div>
                                        )}

                                        {/* Safety Auditor Slot Banner (Service audit mode) */}
                                        {isService && serviceScope === 'audit' && (
                                            <div className="flex items-center justify-between rounded-xl border border-[#0F2F58]/20 bg-[#F8FAFD] p-3 shadow-xs">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                                                        <img
                                                            src={getPartnerImage(currentAudit)}
                                                            alt={currentAudit.name}
                                                            className="size-full object-cover"
                                                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/photos/req-electrician.jpg'; }}
                                                        />
                                                        <span className="absolute bottom-0 inset-x-0 bg-purple-600/90 text-[7.5px] font-extrabold text-white text-center uppercase py-0.2">
                                                            Audit
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-xs font-extrabold text-slate-900 truncate">
                                                            {currentAudit.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 line-clamp-1">
                                                            {currentAudit.sub}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubModalRole('auditor')}
                                                    className="shrink-0 cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[10.5px] font-extrabold text-[#0F2F58] shadow-xs hover:bg-[#EBF2FA] ml-2"
                                                >
                                                    Change Auditor ▾
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

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
                            {/* Job Photos Rail from Tagudin Homes */}
                            <div>
                                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500">
                                    <Camera className="size-3.5" />
                                    <span>Job photos from Tagudin homes &amp; stalls (18)</span>
                                </div>
                                <div className="flex [scrollbar-width:none] gap-2.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                                    {REVIEW_PHOTOS.map((ph, i) => (
                                        <div
                                            key={i}
                                            className="group relative size-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                                            title={ph.label}
                                            onClick={() => alert(`Photo proof: ${ph.label}`)}
                                        >
                                            <img
                                                src={ph.url}
                                                alt={ph.label}
                                                className="size-full object-cover transition-transform duration-200 group-hover:scale-108"
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = '/photos/ac-clean.jpg';
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

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
                            ) : (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-[#FAFCFB] p-6 text-center">
                                    <p className="text-xs font-bold text-slate-600">No verified reviews yet</p>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        Customer reviews appear after verified orders are completed.
                                    </p>
                                </div>
                            )}

                            {/* Interactive Toggle for Extended Reviews Panel */}
                            <div className="flex flex-col items-center">
                                <button
                                    type="button"
                                    onClick={() => setReviewsExpanded((prev) => !prev)}
                                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#0F2F58] hover:underline"
                                >
                                    <span>
                                        {reviewsExpanded
                                            ? 'Hide reviews'
                                            : '+ View more reviews (127 more)'}
                                    </span>
                                    {reviewsExpanded ? (
                                        <ChevronUp className="size-3.5" />
                                    ) : (
                                        <ChevronDown className="size-3.5" />
                                    )}
                                </button>
                            </div>

                            {/* Collapsible Extended Reviews Panel */}
                            {reviewsExpanded && (
                                <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
                                    {/* Rating Filter Chips */}
                                    <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto">
                                        {[
                                            { id: 'all', label: 'All (128)' },
                                            { id: '5', label: '★ 5 Stars (120)' },
                                            { id: '4', label: '★ 4 Stars (6)' },
                                            { id: 'photos', label: 'With Photos (18)' },
                                        ].map((rf) => (
                                            <button
                                                key={rf.id}
                                                type="button"
                                                onClick={() => setReviewFilter(rf.id as any)}
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

                                    {/* Filtered Review List (Excludes featured review by identity) */}
                                    <div className="flex flex-col gap-2.5">
                                        {filteredExtendedReviews.map((rev) => (
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

                                    {/* Reviews Pagination Bar */}
                                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                                        <span>Page {reviewPage} of 6</span>
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
                                                onClick={() => setReviewPage((p) => p + 1)}
                                                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                            >
                                                Next ›
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* RIGHT COLUMN (42% on Desktop): Sticky Purchase / Escrow Card with DUAL CTAs */}
                    <div className="sticky top-24 hidden lg:col-span-5 lg:block">
                        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
                            {/* Selected Package Header */}
                            <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <div className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                                        Selected: {activePackage.title}
                                    </div>
                                    <div className="mt-1 font-mono text-2xl font-extrabold text-[#0F2F58]">
                                        ₱{unitPrice.toFixed(2)}
                                    </div>
                                </div>
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-800">
                                    Fixed Rate SLA
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
                                            onClick={() => setQuantity((q) => q + 1)}
                                            className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                            aria-label="Increase quantity"
                                        >
                                            <Plus className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Escrow Total Breakdown */}
                            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Base Package ({activePackage.title}):</span>
                                    <span className="font-mono font-bold text-slate-800">
                                        ₱{(activePackage.price * quantity).toFixed(2)}
                                    </span>
                                </div>
                                {scopeAddonFee > 0 && (
                                    <div className="flex justify-between text-slate-600">
                                        <span>Deal Chain Partner Extension:</span>
                                        <span className="font-mono font-bold text-slate-800">
                                            +₱{(scopeAddonFee * quantity).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                {customizerFee > 0 && (
                                    <div className="flex justify-between text-slate-600">
                                        <span>Customizer Enhancements:</span>
                                        <span className="font-mono font-bold text-slate-800">
                                            +₱{(customizerFee * quantity).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between text-slate-600">
                                    <span>Tiwala Community Assurance:</span>
                                    <span className="font-mono font-bold text-emerald-700">
                                        ₱0.00 (Launch Promo)
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-[#0F2F58]">
                                    <span>Total Escrow Amount:</span>
                                    <span className="font-mono text-base">
                                        ₱{calculatedTotal.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* DUAL CTAs: Direct Booking vs Add to Picks */}
                            <div className="flex flex-col gap-2.5 pt-1">
                                {/* 1. Primary Direct Action CTA */}
                                <button
                                    type="button"
                                    onClick={handleDirectAction}
                                    className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] text-xs font-extrabold tracking-wide text-white shadow-md transition-all hover:bg-[#153e74] active:scale-98"
                                >
                                    <span>
                                        {chainSlotContext
                                            ? `Add to Chain Slot · ₱${calculatedTotal.toFixed(2)}`
                                            : `${isService ? 'Book Service Now' : 'Buy Product Now'} · ₱${calculatedTotal.toFixed(2)}`}
                                    </span>
                                    <ArrowRight className="size-4" />
                                </button>

                                {/* 2. Secondary Add to Picks CTA */}
                                <button
                                    type="button"
                                    onClick={handleAddToPicks}
                                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-slate-100 text-xs font-bold text-slate-800 shadow-2xs transition-all hover:bg-slate-200 active:scale-98"
                                >
                                    <Plus className="size-4 text-[#0F2F58] stroke-[2.5]" />
                                    <span className="font-extrabold text-[#0F2F58]">Add to Citizen Picks</span>
                                </button>
                            </div>

                            {/* Trust Guarantee Badge */}
                            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-[11px] text-emerald-900">
                                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                                <span>
                                    <strong>Tiwala Escrow Protection:</strong> Funds release to the
                                    provider only after you review and approve the final milestone
                                    photos.
                                </span>
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
                            onClick={() => setQuantity((q) => q + 1)}
                            className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-white text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-90"
                            aria-label="Increase quantity"
                        >
                            <Plus className="size-3 stroke-[2.5]" />
                        </button>
                    </div>

                    {/* Primary Direct Action Button */}
                    <button
                        type="button"
                        onClick={handleDirectAction}
                        className="flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#0F2F58] px-3 text-xs font-extrabold text-white shadow-md active:bg-[#0a2240]"
                    >
                        <span className="truncate">
                            {chainSlotContext
                                ? `Add to Slot · ₱${calculatedTotal.toFixed(2)}`
                                : `${isService ? 'Book Service' : 'Buy Now'} · ₱${calculatedTotal.toFixed(2)}`}
                        </span>
                        <ArrowRight className="size-3.5 shrink-0" />
                    </button>

                    {/* Secondary Add to Picks Button */}
                    <button
                        type="button"
                        onClick={handleAddToPicks}
                        className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-800 shadow-2xs transition-all hover:bg-slate-200 active:scale-95"
                        title="Add to Citizen Picks"
                        aria-label="Add to Citizen Picks"
                    >
                        <Plus className="size-4 text-[#0F2F58] stroke-[2.5]" />
                        <span className="text-[11px] font-extrabold text-[#0F2F58] whitespace-nowrap">Picks</span>
                    </button>
                </div>
            </div>

            {/* Partner Selection Right-Side Drawer */}
            <PartnerSelectionDrawer
                open={Boolean(subModalRole)}
                onClose={() => setSubModalRole(null)}
                role={subModalRole}
                candidates={subModalRole ? partnerCatalog[subModalRole] : []}
                currentSelectedId={
                    subModalRole === 'store'
                        ? currentStore.id
                        : subModalRole === 'courier'
                          ? currentCourier.id
                          : subModalRole === 'technician'
                            ? currentTech.id
                            : currentAudit.id
                }
                onSelect={handleSelectCandidate}
            />

            {/* Citizen Picks Drawer */}
            <PicksDrawer
                open={picksOpen}
                onClose={() => setPicksOpen(false)}
                items={basket}
                recipes={Object.values(dealChainRecipes)}
                onUpdateQuantity={(id, delta) => {
                    const next = basket
                        .map((item) =>
                            item.id === id ? { ...item, quantity: item.quantity + delta } : item,
                        )
                        .filter((item) => item.quantity > 0);
                    saveBasket(next);
                }}
                onRemoveItem={(id) => {
                    const next = basket.filter((item) => item.id !== id);
                    saveBasket(next);
                }}
                onCheckout={() => {
                    setPicksOpen(false);
                    const itemsWithDealChain = basket.filter((item) => Boolean(item.dealChain));
                    if (itemsWithDealChain.length > 0) {
                        setCheckoutModalOpen(true);
                    } else if (basket.length > 0) {
                        router.visit(`/listings/${basket[0].id}/book`);
                    }
                }}
                onAttachDealChain={handleAttachDealChain}
                onSwapSlotCandidate={handleSwapSlotCandidate}
            />

            {/* Dedicated Deal Chain Checkout Modal */}
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
