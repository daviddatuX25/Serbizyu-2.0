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

// Workflow Steps & Deal Chain Extensions
type WorkflowStep = {
    title: string;
    description: string;
};

type DealChainSlot = {
    id: string;
    title: string;
    desc: string;
    price: number;
    icon: 'package' | 'truck';
};

type CategoryWorkflow = {
    shapeLabel: string;
    steps: WorkflowStep[];
    dealChainSlots: DealChainSlot[];
};

const CATEGORY_WORKFLOWS: Record<string, CategoryWorkflow> = {
    repairs: {
        shapeLabel: 'A3 Appointment · On-Site Service',
        steps: [
            { title: 'Breaker isolation & coil status triage', description: 'Stage 1 · Breaker lockout photo gate' },
            { title: 'Chemical foam wash & pressure rinse', description: 'Stage 2 · Foam coverage photo gate' },
            { title: 'Cold compressor run & amp verification', description: 'Stage 3 · Amperage reading photo gate' },
            { title: 'Delta temperature drop test (ΔT ≥ 12°C)', description: 'Stage 4 · Probe delta photo + Citizen OTP sign-off' },
        ],
        dealChainSlots: [
            { id: 'parts', title: 'Tagudin Hardware Parts', desc: 'Coil cleaning foam & replacement pipe seal', price: 180, icon: 'package' },
            { id: 'courier', title: 'Danny Express Courier', desc: 'Parts pick-up & direct delivery to site', price: 80, icon: 'truck' },
        ],
    },
    'local-food': {
        shapeLabel: 'A4 Handoff · Fresh Food Prep',
        steps: [
            { title: 'Morning batch baking & clay oven steaming', description: 'Stage 1 · Kitchen batch preparation gate' },
            { title: 'Fresh packaging in wilted banana leaves', description: 'Stage 2 · Fresh seal packaging gate' },
            { title: 'Warm insulated tray handoff at Tagudin Market', description: 'Stage 3 · Stall pickup or courier dispatch' },
        ],
        dealChainSlots: [
            { id: 'courier', title: 'Danny Express Direct Delivery', desc: 'Warm delivery directly to your home in Tagudin', price: 80, icon: 'truck' },
            { id: 'gift', title: 'Fiesta Gift Box & Ribbon', desc: 'Festive packaging for family occasions', price: 50, icon: 'package' },
        ],
    },
    'print-assist': {
        shapeLabel: 'A1 Linear Project · Soft-Copy Production',
        steps: [
            { title: 'File upload & document resolution audit', description: 'Stage 1 · Soft proof PDF inspection' },
            { title: 'High-resolution scan & laser print calibration', description: 'Stage 2 · Sample check & color match' },
            { title: 'Soft-copy email delivery or paper batch handoff', description: 'Stage 3 · Final package handoff' },
        ],
        dealChainSlots: [
            { id: 'usb', title: 'USB Flash Drive Soft-Copy Backup', desc: 'Encrypted drive with soft copies included', price: 150, icon: 'package' },
            { id: 'courier', title: 'Danny Express Courier', desc: 'Direct delivery of printed documents', price: 80, icon: 'truck' },
        ],
    },
    'greeting-cards': {
        shapeLabel: 'A1 Linear Project · Hand-Crafted Art',
        steps: [
            { title: 'Occasion brief & custom calligraphy names', description: 'Stage 1 · Design draft review' },
            { title: 'Hand-drawing on textured specialty paper', description: 'Stage 2 · Photo progress gate' },
            { title: 'Final envelope wax sealing & handoff', description: 'Stage 3 · Final handoff' },
        ],
        dealChainSlots: [
            { id: 'box', title: 'Ribbon Keepsake Gift Box', desc: 'Custom presentation box with wax seal', price: 60, icon: 'package' },
            { id: 'courier', title: 'Danny Express Courier', desc: 'Hand-delivered to your recipient', price: 80, icon: 'truck' },
        ],
    },
    courier: {
        shapeLabel: 'A2 Dispatch · Express Transport',
        steps: [
            { title: 'Item pickup at sender location', description: 'Stage 1 · Sender item photo gate' },
            { title: 'Secure transit across Tagudin routes', description: 'Stage 2 · GPS check-in' },
            { title: 'Recipient handover & signature', description: 'Stage 3 · Recipient sign-off photo gate' },
        ],
        dealChainSlots: [
            { id: 'return', title: 'Return Trip Errand', desc: 'Immediate back-trip delivery in Centro', price: 50, icon: 'truck' },
        ],
    },
    default: {
        shapeLabel: 'A4 Handoff · Verified Local Task',
        steps: [
            { title: 'Task briefing & on-site scope alignment', description: 'Stage 1 · Initial scope review' },
            { title: 'Task execution according to standards', description: 'Stage 2 · In-progress photo gate' },
            { title: 'Citizen inspection & OTP sign-off', description: 'Stage 3 · Completion verification' },
        ],
        dealChainSlots: [
            { id: 'parts', title: 'Procured Materials Budget', desc: 'Hardware supplies from local merchants', price: 180, icon: 'package' },
            { id: 'courier', title: 'Danny Express Courier', desc: 'Direct runner support in Tagudin', price: 80, icon: 'truck' },
        ],
    },
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
        packageTag: 'Standard Full Package',
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
        packageTag: 'Express Delivery',
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

function getWorkflow(categoryCode?: string | null): CategoryWorkflow {
    const code = (categoryCode || 'default').toLowerCase();
    return CATEGORY_WORKFLOWS[code] || CATEGORY_WORKFLOWS.default;
}

function formatPrice(minor?: number | null): string {
    if (typeof minor === 'number' && Number.isFinite(minor)) {
        return `₱${(minor / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return '₱80.00';
}

function getPriceNumber(minor?: number | null): number {
    return typeof minor === 'number' && Number.isFinite(minor) ? minor / 100 : 80;
}

export default function ListingDetail(props: HomeProps) {
    const listing = props.activeListingDetail;

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
    const workflow = getWorkflow(listing?.category_code || listing?.categoryCode);
    const basePrice = getPriceNumber(listing?.price_amount_minor);

    // Calculate slots total
    const slotsTotal = workflow.dealChainSlots
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
                b.id === listing.id ? { ...b, quantity: b.quantity + quantity, price: finalUnitPrice } : b,
            );
        } else {
            updated = [
                ...basket,
                {
                    id: listing.id,
                    title: listing.title,
                    price: finalUnitPrice,
                    quantity,
                },
            ];
        }

        saveBasket(updated);
        setPicksOpen(true);
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
                    {/* LEFT COLUMN (58% on Desktop): Media, Work Pipeline, Profile & Reviews */}
                    <div className="flex flex-col gap-6 lg:col-span-7">
                        {/* Hero Image Container */}
                        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs">
                            <img
                                src={photoUrl}
                                alt={listing.title}
                                className="size-full object-cover"
                            />
                            {/* Badges on Image */}
                            <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                                <span
                                    className={`rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide uppercase shadow-sm ${
                                        isService ? 'bg-[#0F2F58] text-white' : 'bg-emerald-700 text-white'
                                    }`}
                                >
                                    {isService ? 'Service · Labor' : 'Product · Local Goods'}
                                </span>
                                <span className="flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-extrabold text-amber-800 shadow-sm backdrop-blur-xs">
                                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                                    <span>4.9</span>
                                    <span className="text-slate-500 font-medium">(128 reviews)</span>
                                </span>
                            </div>

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

                        {/* Title & Description Box */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F2F58] leading-tight">
                                {listing.title}
                            </h1>
                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                                <MapPin className="size-3.5 text-slate-400" />
                                <span className="font-semibold">{listing.area || listing.locality || 'Tagudin Centro'}</span>
                                <span>·</span>
                                <span className="text-emerald-700 font-bold">Verified Citizen Provider</span>
                            </div>

                            <p className="mt-4 text-xs sm:text-sm leading-relaxed text-slate-700">
                                {listing.description ||
                                    'Standard verified offering in Tagudin, Ilocos Sur. Backed by municipal escrow protection and photo milestone evidence.'}
                            </p>
                        </div>

                        {/* What's Included & Execution Gates (Dynamically adapted by category/service) */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                        {isService ? "What's Included & Execution Gates" : 'Product Specifications & Prep'}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {isService
                                            ? 'Guaranteed deliverables verified through required milestone photo proofs'
                                            : 'Fresh daily preparation standards verified in Tagudin'}
                                    </p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold text-slate-700">
                                    {workflow.shapeLabel}
                                </span>
                            </div>

                            <div className="mt-4 flex flex-col gap-2.5">
                                {workflow.steps.map((step, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs"
                                    >
                                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                            ✓
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{step.title}</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                {step.description}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Provider Profile Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                                <div className="flex size-11 items-center justify-center rounded-full bg-[#0F2F58] text-white font-extrabold text-sm">
                                    {(listing.owner_name || listing.ownerName || 'P').charAt(0)}
                                </div>
                                <div>
                                    <div className="text-sm font-extrabold text-slate-900">
                                        {listing.owner_name || listing.ownerName || 'Tagudin Verified Provider'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        4.9 ★ · 67 completed citizen orders in Tagudin
                                    </div>
                                </div>
                            </div>

                            <a
                                href="https://maps.google.com"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-[#0F2F58] hover:bg-slate-100 transition-colors"
                            >
                                <MapPin className="size-3.5" />
                                <span>Visit Stall</span>
                            </a>
                        </div>

                        {/* =========================================================================
                            VERIFIED CUSTOMER REVIEWS SECTION (Matches docs/design-kit/listing-detail.html)
                            ========================================================================= */}
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

                    {/* RIGHT COLUMN (42% on Desktop): Sticky Purchase / Escrow Card */}
                    <div className="lg:col-span-5 sticky top-24">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md flex flex-col gap-5">
                            {/* Price Header */}
                            <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        {isService ? 'Starting Labor Rate' : 'Product Unit Price'}
                                    </div>
                                    <div className="mt-1 font-mono text-2xl font-extrabold text-[#0F2F58]">
                                        {formatPrice(listing.price_amount_minor)}
                                    </div>
                                </div>
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-800 border border-emerald-200">
                                    {isService ? 'Fixed Rate SLA' : 'Fresh Daily Supply'}
                                </span>
                            </div>

                            {/* Quantity Stepper */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                    {isService ? 'Service Units / Quantity' : 'Quantity / Trays'}
                                </label>
                                <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-[#FAFCFB] p-2">
                                    <span className="text-xs font-semibold text-slate-700 pl-2">Quantity</span>
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

                            {/* Partner Deal Chain Extensions (Dynamic per category) */}
                            {workflow.dealChainSlots.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                            Partner Deal Chain Extensions
                                        </label>
                                        <span className="text-[10px] font-bold text-emerald-700">Optional Add-ons</span>
                                    </div>
                                    <div className="mt-2 flex flex-col gap-2">
                                        {workflow.dealChainSlots.map((slot) => {
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

                            {/* Escrow Total Breakdown */}
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Labor &amp; Items Subtotal:</span>
                                    <span className="font-mono font-bold text-slate-800">₱{calculatedTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Tiwala Community Protection:</span>
                                    <span className="font-mono font-bold text-emerald-700">₱0.00 (Free Launch)</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-[#0F2F58]">
                                    <span>Total Escrow Amount:</span>
                                    <span className="font-mono text-base">₱{calculatedTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Primary Action Button */}
                            <div className="flex flex-col gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={handleAddToPicks}
                                    className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] text-xs font-extrabold tracking-wide text-white shadow-md transition-all hover:bg-[#153e74] active:scale-98"
                                >
                                    <ShoppingBag className="size-4" />
                                    <span>Add to Citizen Picks (₱{calculatedTotal.toFixed(2)})</span>
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

            {/* Mobile Bottom Booking Dock (Fixed at bottom for mobile screens) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total</div>
                        <div className="font-mono text-lg font-extrabold text-[#0F2F58]">
                            ₱{calculatedTotal.toFixed(2)}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleAddToPicks}
                        className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] text-xs font-extrabold text-white shadow-md active:bg-[#0a2240]"
                    >
                        <ShoppingBag className="size-4" />
                        <span>Add to Picks</span>
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
