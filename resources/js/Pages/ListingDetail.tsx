import { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Star,
    MapPin,
    ShieldCheck,
    Heart,
    Plus,
    Minus,
    ShoppingBag,
    Truck,
    Package,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Camera,
    MessageSquare,
    ArrowRight,
    Check,
} from 'lucide-react';
import type { HomeProps } from '../types';
import { DesktopGlobalNav } from '../components/layout/DesktopGlobalNav';
import { PicksDrawer } from '../components/marketplace/PicksDrawer';
import type { BasketItem } from '../marketplace/types';

// Category Images
const CATEGORY_IMAGES: Record<string, string> = {
    repairs: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=900&auto=format&fit=crop&q=80',
    'home-cleaning': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&auto=format&fit=crop&q=80',
    courier: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&auto=format&fit=crop&q=80',
    'local-food': 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&auto=format&fit=crop&q=80',
    'print-assist': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=900&auto=format&fit=crop&q=80',
    'greeting-cards': 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=900&auto=format&fit=crop&q=80',
    'local-services': 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=900&auto=format&fit=crop&q=80',
    default: 'https://images.unsplash.com/photo-1581092918056-0c4c5acdfb82?w=900&auto=format&fit=crop&q=80',
};

// Package Tier Presets
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
            sub: 'Save ₱250 bundle',
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
            sub: 'Save ₱450 package',
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

// Deal Chain Slots
type DealChainSlot = {
    id: string;
    title: string;
    desc: string;
    price: number;
    icon: 'package' | 'truck';
};

const CATEGORY_SLOTS: Record<string, DealChainSlot[]> = {
    repairs: [
        { id: 'parts', title: 'Tagudin Hardware Parts', desc: 'Coil cleaning foam & replacement pipe seal', price: 180, icon: 'package' },
        { id: 'courier', title: 'Danny Express Courier', desc: 'Parts pick-up & direct delivery to site', price: 80, icon: 'truck' },
    ],
    'local-food': [
        { id: 'courier', title: 'Danny Express Direct Delivery', desc: 'Warm delivery directly to your home in Tagudin', price: 80, icon: 'truck' },
        { id: 'gift', title: 'Fiesta Gift Box & Ribbon', desc: 'Festive packaging for family occasions', price: 50, icon: 'package' },
    ],
    'print-assist': [
        { id: 'usb', title: 'USB Flash Drive Soft-Copy Backup', desc: 'Encrypted drive with soft copies included', price: 150, icon: 'package' },
        { id: 'courier', title: 'Danny Express Courier', desc: 'Direct delivery of printed documents', price: 80, icon: 'truck' },
    ],
    default: [
        { id: 'parts', title: 'Procured Materials Budget', desc: 'Hardware supplies from local merchants', price: 180, icon: 'package' },
        { id: 'courier', title: 'Danny Express Courier', desc: 'Direct runner support in Tagudin', price: 80, icon: 'truck' },
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
        packageTag: 'Express Service',
        quote: 'Maayos kausap at maaasahan sa mga biglaang takbo sa centro.',
    },
];

const REVIEW_PHOTOS = [
    { label: 'Chemical coil disinfection', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80' },
    { label: 'Blower wheel degreased', url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=300&auto=format&fit=crop&q=80' },
    { label: 'High pressure rinse', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&auto=format&fit=crop&q=80' },
    { label: 'Finished installation', url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=300&auto=format&fit=crop&q=80' },
];

function getCategoryPhoto(categoryCode?: string | null): string {
    const code = (categoryCode || 'default').toLowerCase();
    return CATEGORY_IMAGES[code] || CATEGORY_IMAGES.default;
}

function getCategoryPackages(categoryCode?: string | null): PackageTier[] {
    const code = (categoryCode || 'default').toLowerCase();
    return CATEGORY_PACKAGES[code] || CATEGORY_PACKAGES.default;
}

function getCategorySlots(categoryCode?: string | null): DealChainSlot[] {
    const code = (categoryCode || 'default').toLowerCase();
    return CATEGORY_SLOTS[code] || CATEGORY_SLOTS.default;
}

export default function ListingDetail(props: HomeProps) {
    const listing = props.activeListingDetail;

    // Available packages for this category
    const packages = getCategoryPackages(listing?.category_code || listing?.categoryCode);
    const slots = getCategorySlots(listing?.category_code || listing?.categoryCode);

    // Selected package tier state
    const [selectedPackageIndex, setSelectedPackageIndex] = useState(0);
    const activePackage = packages[selectedPackageIndex] || packages[0];

    // Picks / Basket state
    const [basket, setBasket] = useState<BasketItem[]>([]);
    const [picksOpen, setPicksOpen] = useState(false);
    const [isPinned, setIsPinned] = useState(false);

    // Purchase customization state
    const [quantity, setQuantity] = useState(1);
    const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);

    // Reviews expansion & filter state
    const [reviewsExpanded, setReviewsExpanded] = useState(false);
    const [reviewFilter, setReviewFilter] = useState<'all' | '5' | '4' | 'photos'>('all');

    // Synchronize pins & basket with localStorage
    useEffect(() => {
        try {
            const storedBasket = localStorage.getItem('serbizyu.picks');
            if (storedBasket) {
                setBasket(JSON.parse(storedBasket));
            }
            if (listing?.id) {
                const storedPins = localStorage.getItem('serbizyu.browse.pins');
                if (storedPins) {
                    const parsedPins: string[] = JSON.parse(storedPins);
                    setIsPinned(parsedPins.includes(listing.id));
                }
            }
        } catch {
            // ignore
        }
    }, [listing?.id]);

    const saveBasket = (newBasket: BasketItem[]) => {
        setBasket(newBasket);
        try {
            localStorage.setItem('serbizyu.picks', JSON.stringify(newBasket));
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

    const toggleSlot = (slotId: string) => {
        setSelectedSlotIds((prev) =>
            prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId],
        );
    };

    const isService = (listing?.listing_type || listing?.listingType) !== 'product';
    const photoUrl = getCategoryPhoto(listing?.category_code || listing?.categoryCode);

    // Dynamic price calculation based on selected package + add-ons
    const basePrice = activePackage?.price || 450;
    const slotsTotal = slots
        .filter((slot) => selectedSlotIds.includes(slot.id))
        .reduce((sum, slot) => sum + slot.price, 0);

    const calculatedTotal = (basePrice + slotsTotal) * quantity;

    const handleAddToPicks = () => {
        if (!listing) return;
        const finalUnitPrice = basePrice + slotsTotal;

        const existing = basket.find((b) => b.id === listing.id);
        let updated: BasketItem[];
        if (existing) {
            updated = basket.map((b) =>
                b.id === listing.id
                    ? {
                          ...b,
                          quantity: b.quantity + quantity,
                          price: finalUnitPrice,
                          title: `${listing.title} (${activePackage.title})`,
                      }
                    : b,
            );
        } else {
            updated = [
                ...basket,
                {
                    id: listing.id,
                    title: `${listing.title} (${activePackage.title})`,
                    price: finalUnitPrice,
                    quantity,
                },
            ];
        }

        saveBasket(updated);
        setPicksOpen(true);
    };

    const handleDirectAction = () => {
        handleAddToPicks();
        alert(`Proceeding directly to Escrow Authorization for ${activePackage.title} totaling ₱${calculatedTotal.toFixed(2)}`);
    };

    // Filter reviews
    const filteredReviews = SAMPLE_REVIEWS.filter((rev) => {
        if (reviewFilter === '5') return rev.stars === 5;
        if (reviewFilter === '4') return rev.stars === 4;
        return true;
    });

    if (!listing) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                <DesktopGlobalNav activeRoute="browse" />
                <main className="mx-auto max-w-3xl px-6 py-16 text-center">
                    <div className="flex size-14 mx-auto items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <AlertCircle className="size-7" />
                    </div>
                    <h1 className="mt-4 text-xl font-extrabold text-[#0F2F58]">Listing Unavailable</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        This service or product offering is not currently available for public viewing.
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
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Desktop Global Navigation */}
            <DesktopGlobalNav
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
                {/* Breadcrumbs (Desktop) */}
                <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
                    <Link href="/browse" className="hover:text-[#0F2F58] flex items-center gap-1">
                        <ArrowLeft className="size-3.5" />
                        <span>Back to active listings</span>
                    </Link>
                    <span>/</span>
                    <span className="capitalize">{listing.category_code?.replace(/-/g, ' ') || 'Local service'}</span>
                    <span>/</span>
                    <span className="text-slate-900 font-bold line-clamp-1">{listing.title}</span>
                </div>

                {/* 2-Column Product / Service Detail Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT COLUMN (58% on Desktop): Media, Hierarchy, Packages, Milestones & Reviews */}
                    <div className="flex flex-col gap-5 lg:col-span-7">
                        {/* 1. Hero Image Container (Clean, without messy text overlays) */}
                        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs">
                            <img
                                src={photoUrl}
                                alt={listing.title}
                                className="size-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={togglePin}
                                className={`hidden lg:flex absolute top-3.5 right-3.5 size-9 items-center justify-center rounded-full bg-white/95 shadow-sm transition-transform active:scale-90 hover:scale-105 cursor-pointer backdrop-blur-xs ${
                                    isPinned ? 'text-red-500' : 'text-slate-600 hover:text-red-500'
                                }`}
                                aria-label="Pin listing"
                            >
                                <Heart className={`size-4.5 ${isPinned ? 'fill-red-500' : ''}`} />
                            </button>
                        </div>

                        {/* 2. Main Title, Price Line & Rating Row Card (Exact Mock Hierarchy) */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col gap-3">
                            {/* Promo / Category Badge */}
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-[#EBF2FA] px-3 py-0.5 text-[11px] font-extrabold tracking-wide uppercase text-[#0F2F58]">
                                    {isService ? 'Verified Service' : 'Verified Local Product'}
                                </span>
                                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-800 border border-amber-200">
                                    -18% Tagudin Launch Promo
                                </span>
                            </div>

                            {/* Main Title */}
                            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F2F58] leading-tight">
                                {listing.title}
                            </h1>

                            {/* Price Line (Big Price + Strikethrough + Unit Label) */}
                            <div className="flex items-baseline gap-2.5 pt-0.5">
                                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#0F2F58]">
                                    ₱{activePackage.price.toFixed(2)}
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
                                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-extrabold text-amber-800 border border-amber-200">
                                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                                    <span>4.9</span>
                                </span>
                                <span className="text-xs text-slate-500 font-medium">(128 reviews)</span>
                                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                                    98% satisfaction
                                </span>
                            </div>

                            {/* Description */}
                            <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
                                {listing.description ||
                                    'Standard verified offering in Tagudin, Ilocos Sur. Backed by municipal escrow protection and photo milestone evidence.'}
                            </p>

                            {/* Provider Box with Chat Button */}
                            <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-[#FAFCFB] p-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-full bg-[#0F2F58] text-white font-extrabold text-sm">
                                        {(listing.owner_name || listing.ownerName || 'P').charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                                            {listing.owner_name || listing.ownerName || 'Kuya Ben Refrigeration'}
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                            <MapPin className="size-3 text-slate-400" />
                                            <span>{listing.area || 'Tagudin Centro'} · Verified Citizen Provider</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => alert(`Chat opened with ${listing.owner_name || 'provider'}`)}
                                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 transition-colors"
                                >
                                    <MessageSquare className="size-3.5" />
                                    <span>Chat</span>
                                </button>
                            </div>
                        </div>

                        {/* 3. Package Presets Carousel (Choice of Package Tiers) */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                            <div className="flex items-baseline justify-between mb-3">
                                <div>
                                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                        Choose Package Tier
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Select service scope or batch size</p>
                                </div>
                                <span className="text-[11px] font-bold text-[#0F2F58]">
                                    {packages.length} Tiers Available
                                </span>
                            </div>

                            {/* Horizontal Preset Cards Carousel */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {packages.map((pkg, idx) => {
                                    const isSelected = selectedPackageIndex === idx;
                                    return (
                                        <button
                                            key={pkg.id}
                                            type="button"
                                            onClick={() => setSelectedPackageIndex(idx)}
                                            className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'border-[#0F2F58] bg-[#EBF2FA] shadow-xs'
                                                    : 'border-slate-200 bg-[#FAFCFB] hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className={`text-xs font-extrabold ${isSelected ? 'text-[#0F2F58]' : 'text-slate-900'}`}>
                                                    {pkg.title}
                                                </span>
                                                {isSelected && <Check className="size-3.5 text-[#0F2F58]" />}
                                            </div>
                                            <div className="mt-1 font-mono text-sm font-extrabold text-[#0F2F58]">
                                                ₱{pkg.price.toFixed(2)}
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">
                                                {pkg.sub}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Active Inclusions Checklist for Selected Tier */}
                            <div className="mt-4 border-t border-slate-100 pt-3">
                                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                                    Included in {activePackage.title}:
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {activePackage.inclusions.map((inc, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                                            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-[9px]">
                                                ✓
                                            </span>
                                            <span>{inc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 4. Partner Deal Chain Extensions */}
                        {slots.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div>
                                        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                            Partner Deal Chain Extensions
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Attach multi-party logistics and hardware suppliers
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                        Multi-Slot
                                    </span>
                                </div>

                                <div className="mt-4 flex flex-col gap-2.5">
                                    {slots.map((slot) => {
                                        const isSelected = selectedSlotIds.includes(slot.id);
                                        return (
                                            <label
                                                key={slot.id}
                                                className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'border-[#0F2F58] bg-[#EBF2FA]'
                                                        : 'border-slate-200 bg-[#FAFCFB] hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSlot(slot.id)}
                                                        className="size-4 accent-[#0F2F58] rounded"
                                                    />
                                                    <div>
                                                        <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                                                            {slot.icon === 'truck' ? (
                                                                <Truck className="size-3.5 text-blue-700" />
                                                            ) : (
                                                                <Package className="size-3.5 text-amber-700" />
                                                            )}
                                                            <span>{slot.title}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500">{slot.desc}</div>
                                                    </div>
                                                </div>
                                                <span className="font-mono text-xs font-extrabold text-slate-900">
                                                    +₱{slot.price.toFixed(2)}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 5. Verified Customer Reviews Section (Matching Design Kit Screen 07) */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col gap-4">
                            {/* Review Top Summary */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                        Customer Reviews
                                    </h2>
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                                        98% Satisfaction
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-extrabold text-amber-800">
                                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                                    <span>4.9 (128 reviews)</span>
                                </div>
                            </div>

                            {/* Job Photos Rail from Tagudin Homes */}
                            <div>
                                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500 mb-2">
                                    <Camera className="size-3.5" />
                                    <span>Job photos from Tagudin homes &amp; stalls (18)</span>
                                </div>
                                <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    {REVIEW_PHOTOS.map((ph, i) => (
                                        <div
                                            key={i}
                                            className="group relative size-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 cursor-pointer"
                                            title={ph.label}
                                            onClick={() => alert(`Photo proof: ${ph.label}`)}
                                        >
                                            <img
                                                src={ph.url}
                                                alt={ph.label}
                                                className="size-full object-cover transition-transform duration-200 group-hover:scale-108"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Featured Single Review Card (Always Visible) */}
                            <div className="rounded-xl border border-slate-200 bg-[#FAFCFB] p-4">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-extrabold text-slate-900">
                                        {SAMPLE_REVIEWS[0].author} · {SAMPLE_REVIEWS[0].barangay}
                                    </span>
                                    <span className="text-[11px] text-slate-400">{SAMPLE_REVIEWS[0].timeAgo}</span>
                                </div>
                                <div className="mt-1.5 flex items-center justify-between">
                                    <div className="flex items-center gap-0.5 text-amber-500">
                                        {[...Array(SAMPLE_REVIEWS[0].stars)].map((_, i) => (
                                            <Star key={i} className="size-3 fill-amber-500" />
                                        ))}
                                    </div>
                                    <span className="rounded-md bg-[#EBF2FA] px-2 py-0.5 text-[10px] font-extrabold text-[#0F2F58]">
                                        {SAMPLE_REVIEWS[0].packageTag}
                                    </span>
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-slate-700">
                                    "{SAMPLE_REVIEWS[0].quote}"
                                </p>
                            </div>

                            {/* Interactive Toggle for Extended Reviews Panel */}
                            <div className="flex flex-col items-center">
                                <button
                                    type="button"
                                    onClick={() => setReviewsExpanded((prev) => !prev)}
                                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#0F2F58] hover:underline"
                                >
                                    <span>{reviewsExpanded ? 'Hide reviews' : `+ View more reviews (${SAMPLE_REVIEWS.length - 1} more)`}</span>
                                    {reviewsExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                </button>
                            </div>

                            {/* Collapsible Extended Reviews Panel */}
                            {reviewsExpanded && (
                                <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
                                    {/* Rating Filter Chips */}
                                    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
                                        {[
                                            { id: 'all', label: `All (${SAMPLE_REVIEWS.length})` },
                                            { id: '5', label: '★ 5 Stars' },
                                            { id: '4', label: '★ 4 Stars' },
                                        ].map((rf) => (
                                            <button
                                                key={rf.id}
                                                type="button"
                                                onClick={() => setReviewFilter(rf.id as any)}
                                                className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                                                    reviewFilter === rf.id
                                                        ? 'bg-[#0F2F58] text-white shadow-xs'
                                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                {rf.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Filtered Review List */}
                                    <div className="flex flex-col gap-2.5">
                                        {filteredReviews.slice(1).map((rev) => (
                                            <div
                                                key={rev.id}
                                                className="rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-extrabold text-slate-900">
                                                        {rev.author} · {rev.barangay}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">{rev.timeAgo}</span>
                                                </div>
                                                <div className="mt-1 flex items-center justify-between">
                                                    <div className="flex items-center gap-0.5 text-amber-500">
                                                        {[...Array(rev.stars)].map((_, i) => (
                                                            <Star key={i} className="size-2.5 fill-amber-500" />
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500">
                                                        {rev.packageTag}
                                                    </span>
                                                </div>
                                                <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                                                    "{rev.quote}"
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* RIGHT COLUMN (42% on Desktop): Sticky Purchase / Escrow Card with DUAL CTAs */}
                    <div className="lg:col-span-5 sticky top-24">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md flex flex-col gap-5">
                            {/* Selected Package Header */}
                            <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        Selected: {activePackage.title}
                                    </div>
                                    <div className="mt-1 font-mono text-2xl font-extrabold text-[#0F2F58]">
                                        ₱{activePackage.price.toFixed(2)}
                                    </div>
                                </div>
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-800 border border-emerald-200">
                                    Fixed Rate SLA
                                </span>
                            </div>

                            {/* Quantity Stepper */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Quantity
                                </label>
                                <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-[#FAFCFB] p-2">
                                    <span className="text-xs font-semibold text-slate-700 pl-2">Batch / Units</span>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                            className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                                            aria-label="Decrease quantity"
                                        >
                                            <Minus className="size-3.5" />
                                        </button>
                                        <span className="w-6 text-center font-mono font-extrabold text-sm text-slate-900">
                                            {quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setQuantity((q) => q + 1)}
                                            className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                                            aria-label="Increase quantity"
                                        >
                                            <Plus className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Escrow Total Breakdown */}
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Base Package ({activePackage.title}):</span>
                                    <span className="font-mono font-bold text-slate-800">₱{(basePrice * quantity).toFixed(2)}</span>
                                </div>
                                {slotsTotal > 0 && (
                                    <div className="flex justify-between text-slate-600">
                                        <span>Deal Chain Extensions:</span>
                                        <span className="font-mono font-bold text-slate-800">+₱{(slotsTotal * quantity).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-slate-600">
                                    <span>Tiwala Community Assurance:</span>
                                    <span className="font-mono font-bold text-emerald-700">₱0.00 (Launch Promo)</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-[#0F2F58]">
                                    <span>Total Escrow Amount:</span>
                                    <span className="font-mono text-base">₱{calculatedTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* DUAL CTAs: Direct Action + Add to Picks */}
                            <div className="flex flex-col gap-2.5 pt-1">
                                {/* 1. Primary Direct Action CTA */}
                                <button
                                    type="button"
                                    onClick={handleDirectAction}
                                    className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] text-xs font-extrabold tracking-wide text-white shadow-md transition-all hover:bg-[#153e74] active:scale-98"
                                >
                                    <span>{isService ? 'Book Service Now' : 'Buy Product Now'} · ₱{calculatedTotal.toFixed(2)}</span>
                                    <ArrowRight className="size-4" />
                                </button>

                                {/* 2. Secondary Add to Picks CTA */}
                                <button
                                    type="button"
                                    onClick={handleAddToPicks}
                                    className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-300 bg-white text-xs font-bold text-[#0F2F58] shadow-xs transition-colors hover:bg-slate-50"
                                >
                                    <ShoppingBag className="size-4" />
                                    <span>+ Add to Citizen Picks</span>
                                </button>
                            </div>

                            {/* Trust Guarantee Badge */}
                            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-[11px] text-emerald-900">
                                <ShieldCheck className="size-4 shrink-0 text-emerald-700 mt-0.5" />
                                <span>
                                    <strong>Tiwala Escrow Protection:</strong> Funds release to the provider only after you review and approve the final milestone photos.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Booking Dock (Dual CTA matching mock) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
                <div className="flex items-center gap-2.5">
                    {/* Primary Direct Action Button (~75% width) */}
                    <button
                        type="button"
                        onClick={handleDirectAction}
                        className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] text-xs font-extrabold text-white shadow-md active:bg-[#0a2240]"
                    >
                        <span>{isService ? 'Book Service' : 'Buy Now'} · ₱{calculatedTotal.toFixed(2)}</span>
                        <ArrowRight className="size-4" />
                    </button>

                    {/* Secondary Add to Picks Button (~25% width) */}
                    <button
                        type="button"
                        onClick={handleAddToPicks}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 text-xs font-bold text-[#0F2F58] shadow-xs active:bg-slate-100"
                        title="Add to Citizen Picks"
                        aria-label="Add to Citizen Picks"
                    >
                        <ShoppingBag className="size-4" />
                        <span className="hidden sm:inline">Picks</span>
                    </button>
                </div>
            </div>

            {/* Citizen Picks Drawer */}
            <PicksDrawer
                open={picksOpen}
                onClose={() => setPicksOpen(false)}
                items={basket}
                onUpdateQuantity={(id, delta) => {
                    const next = basket
                        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
                        .filter((item) => item.quantity > 0);
                    saveBasket(next);
                }}
                onRemoveItem={(id) => {
                    const next = basket.filter((item) => item.id !== id);
                    saveBasket(next);
                }}
                onCheckout={() => {
                    alert(`Proceeding to Escrow Authorization for ${basket.length} picks totaling ₱${calculatedTotal.toFixed(2)}`);
                }}
            />
        </div>
    );
}
