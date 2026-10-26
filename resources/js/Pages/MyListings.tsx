import { useMemo, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    BarChart3,
    Clock,
    Eye,
    FileText,
    MapPin,
    PauseCircle,
    Plus,
    Search,
    Send,
    Sliders,
    Star,
    Store,
    TrendingUp,
    Video,
    Wrench,
} from 'lucide-react';
import { DesktopGlobalNav } from '../components/layout/DesktopGlobalNav';
import { FunnelAnalytics } from '../components/admin/FunnelAnalytics';
import { CategoryVisualFallback } from '../components/listings/ListingMediaPicker';
import {
    ListingStatusBadge,
    normalizeListingStatus,
} from '../components/listings/ListingStatusBadge';
import { ModernOnboarding } from '../components/onboarding/ModernOnboarding';
import { BottomNavBar, type NavTabId } from '../marketplace/components/BottomNavBar';
import { CreatorPostModal } from '../components/marketplace/CreatorPostModal';
import { QuickDealScanModal } from '../components/marketplace/QuickDealScanModal';
import type { HomeProps, ListingRecord } from '../types';

type EnrichedListing = ListingRecord & {
    telemetry?: {
        impressions: number;
        views: number;
        inquiries: number;
        orders: number;
        ctr_pct: string;
        cvr_pct: string;
    };
    review_summary?: {
        rating: number;
        reviews_count: number;
        rating_label: string;
    };
};

function resolveListingTelemetry(listing: EnrichedListing) {
    const telemetry = listing.telemetry;
    const review = listing.review_summary;

    if (telemetry) {
        return {
            impressions: telemetry.impressions,
            views: telemetry.views,
            inquiries: telemetry.inquiries,
            orders: telemetry.orders,
            ctrPct: telemetry.ctr_pct,
            cvrPct: telemetry.cvr_pct,
            rating: review && review.reviews_count > 0 ? review.rating.toFixed(1) : 'New',
            reviewsCount: review?.reviews_count ?? 0,
        };
    }

    return {
        impressions: 0,
        views: 0,
        inquiries: 0,
        orders: 0,
        ctrPct: '0.0',
        cvrPct: '0.0',
        rating: 'New',
        reviewsCount: 0,
    };
}

export default function MyListings(props: HomeProps) {
    const [creatorOpen, setCreatorOpen] = useState(false);
    const [quickDealOpen, setQuickDealOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending_review' | 'draft'>(
        'all',
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedInsightListingId, setSelectedInsightListingId] = useState<string>('all');
    const [submittingId, setSubmittingId] = useState<string | null>(null);

    const session = props.session;
    const readiness = props.readiness;
    const myListings = props.myListings ?? [];
    const isProvider = Boolean(
        readiness?.provider_intent || readiness?.ready || myListings.length > 0,
    );

    const activeCount = myListings.filter(
        (l) => normalizeListingStatus(l.status ?? l.state) === 'active',
    ).length;
    const pendingCount = myListings.filter(
        (l) => normalizeListingStatus(l.status ?? l.state) === 'pending_review',
    ).length;
    const draftCount = myListings.filter(
        (l) => normalizeListingStatus(l.status ?? l.state) === 'draft',
    ).length;

    const listingsWithMetrics = useMemo(
        () =>
            myListings.map((listing) => ({
                listing,
                metrics: resolveListingTelemetry(listing as EnrichedListing),
            })),
        [myListings],
    );

    const filteredListings = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return listingsWithMetrics.filter(({ listing }) => {
            const st = normalizeListingStatus(listing.status ?? listing.state);
            if (statusFilter !== 'all' && st !== statusFilter) {
                return false;
            }
            if (!q) return true;
            return (
                (listing.title || '').toLowerCase().includes(q) ||
                (listing.description || '').toLowerCase().includes(q) ||
                (listing.category_code || listing.categoryCode || '').toLowerCase().includes(q)
            );
        });
    }, [listingsWithMetrics, statusFilter, searchQuery]);

    const activeInsightMetrics = useMemo(() => {
        const scoped =
            selectedInsightListingId === 'all'
                ? listingsWithMetrics
                : listingsWithMetrics.filter(
                      ({ listing }) => listing.id === selectedInsightListingId,
                  );

        const totals = scoped.reduce(
            (acc, item) => ({
                impressions: acc.impressions + item.metrics.impressions,
                views: acc.views + item.metrics.views,
                inquiries: acc.inquiries + item.metrics.inquiries,
                orders: acc.orders + item.metrics.orders,
            }),
            { impressions: 0, views: 0, inquiries: 0, orders: 0 },
        );

        const impressions = totals.impressions;
        const views = totals.views;
        const inquiries = totals.inquiries;
        const orders = totals.orders;
        const cvr = views > 0 ? ((orders / views) * 100).toFixed(1) : '—';
        const ctr = impressions > 0 ? ((views / impressions) * 100).toFixed(1) : '—';

        return {
            impressions,
            views,
            inquiries,
            orders,
            cvr,
            ctr,
        };
    }, [listingsWithMetrics, selectedInsightListingId]);

    const handleSubmitDraft = (listing: ListingRecord) => {
        if (!listing.id || submittingId) return;
        const version = listing.version ?? listing.expectedVersion ?? listing.expected_version ?? 1;
        setSubmittingId(listing.id);
        router.post(
            `/listings/${listing.id}/submit`,
            {
                expected_version: version,
                idempotency_key: `my-listings-submit-${listing.id}-v${version}`,
            },
            {
                preserveScroll: true,
                onFinish: () => setSubmittingId(null),
            },
        );
    };
    const handleLifecycleAction = (
        listing: ListingRecord,
        action: 'pause' | 'resume' | 'archive',
    ) => {
        if (!listing.id || submittingId) return;
        const version = listing.version ?? listing.expectedVersion ?? listing.expected_version ?? 1;
        setSubmittingId(listing.id);
        router.post(
            `/listings/${listing.id}/${action}`,
            { expected_version: version },
            {
                preserveScroll: true,
                onFinish: () => setSubmittingId(null),
            },
        );
    };


    return (
        <div className="flex min-h-screen flex-col bg-[#F8FAFC] pb-20 font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
            {/* Desktop Navigation */}
            <DesktopGlobalNav activeRoute="listings" session={session} readiness={readiness} />

            {/* Mobile Header */}
            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-3 lg:hidden">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0F2F58] text-xs font-bold text-white">
                        S
                    </div>
                    <span className="text-sm font-extrabold text-[#0F2F58]">My Listings</span>
                <Link href="/stock" className="text-xs font-bold text-[#0F2F58] hover:underline">
                    Stock ledger
                </Link>
                </div>
                <Link href="/browse" className="text-xs font-bold text-[#0F2F58] hover:underline">
                    Browse Marketplace →
                </Link>
            </div>

            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
                {isProvider ? (
                    <div className="space-y-6">
                        {/* 1. Provider Studio Header & Builder Launchers */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                                <div>
                                    <h1 className="text-xl font-extrabold tracking-tight text-[#0F2F58] sm:text-2xl">
                                        My Listings &amp; Insights
                                    </h1>
                                    <p className="mt-1 max-w-2xl text-xs text-slate-500 sm:text-sm">
                                        Inspect how neighbors see your listings, track
                                        search-to-order conversion, and launch the Service or
                                        Product Studio Builder.
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                        href="/listings/create/service"
                                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0F2F58] px-3.5 py-2.5 text-xs font-extrabold text-white shadow-xs transition-all hover:bg-[#153e74]"
                                    >
                                        <Wrench className="size-3.5 text-[#FFC72C]" />
                                        <span>Service Builder</span>
                                    </Link>
                                    <Link
                                        href="/listings/create/product"
                                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#0F2F58]/30 bg-[#EBF2FA] px-3.5 py-2.5 text-xs font-extrabold text-[#0F2F58] transition-all hover:bg-[#dbe8f6]"
                                    >
                                        <Store className="size-3.5" />
                                        <span>Product Builder</span>
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => setCreatorOpen(true)}
                                        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#FFC72C] px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18]"
                                    >
                                        <Plus className="size-4" />
                                        <span>Create Listing</span>
                                    </button>
                                </div>
                            </div>

                            {/* 4-Column Portfolio Summary Strip */}
                            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-4">
                                <div className="rounded-xl border border-slate-200/80 bg-[#FAFCFB] p-3.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                        <span>Active on Market</span>
                                        <Store className="size-3.5 text-emerald-600" />
                                    </div>
                                    <div className="mt-1 font-mono text-xl font-extrabold text-[#0F2F58]">
                                        {activeCount}
                                    </div>
                                    <div className="mt-0.5 text-[10px] font-semibold text-emerald-700">
                                        Visible on /browse
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200/80 bg-[#FAFCFB] p-3.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                        <span>Under Review</span>
                                        <Clock className="size-3.5 text-amber-600" />
                                    </div>
                                    <div className="mt-1 font-mono text-xl font-extrabold text-[#0F2F58]">
                                        {pendingCount}
                                    </div>
                                    <div className="mt-0.5 text-[10px] font-semibold text-amber-700">
                                        Awaiting approval
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200/80 bg-[#FAFCFB] p-3.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                        <span>Private Drafts</span>
                                        <FileText className="size-3.5 text-slate-500" />
                                    </div>
                                    <div className="mt-1 font-mono text-xl font-extrabold text-[#0F2F58]">
                                        {draftCount}
                                    </div>
                                    <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                                        Editable in Builder
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200/80 bg-[#FAFCFB] p-3.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                        <span>Catalog CTR</span>
                                        <TrendingUp className="size-3.5 text-emerald-600" />
                                    </div>
                                    <div className="mt-1 font-mono text-xl font-extrabold text-emerald-700">
                                        {activeInsightMetrics.ctr === '—' ? '—' : `${activeInsightMetrics.ctr}%`}
                                    </div>
                                    <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                                        {activeInsightMetrics.views} detail views
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Portfolio & Per-Listing Insights Section (Inspired by Admin/Listings) */}
                        <section
                            data-testid="my-listings-insights"
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
                        >
                            <div className="mb-4 flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                        <BarChart3 className="size-4 text-emerald-600" />
                                        <span>Listing Discovery &amp; Conversion Insights</span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Compare search impressions, detail page views, deal-chain
                                        engagements, and confirmed orders across your offerings.
                                    </p>
                                </div>

                                {/* Scope Selector: All Listings vs Specific Listing */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-slate-500">
                                        Inspect:
                                    </span>
                                    <select
                                        aria-label="Select listing for insights"
                                        value={selectedInsightListingId}
                                        onChange={(e) =>
                                            setSelectedInsightListingId(e.target.value)
                                        }
                                        className="rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-1.5 text-xs font-extrabold text-[#0F2F58] outline-none focus:border-[#0F2F58]"
                                    >
                                        <option value="all">
                                            All My Listings ({myListings.length})
                                        </option>
                                        {myListings.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.title} (v{item.version ?? 1})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {activeInsightMetrics.impressions > 0 ||
                            activeInsightMetrics.views > 0 ||
                            activeInsightMetrics.inquiries > 0 ||
                            activeInsightMetrics.orders > 0 ? (
                                <FunnelAnalytics
                                    title={
                                        selectedInsightListingId === 'all'
                                            ? 'Portfolio Discovery & Conversion Funnel (30d)'
                                            : 'Selected Listing Conversion Funnel (30d)'
                                    }
                                    description="Resident search impressions through bilateral order confirmation in Tagudin"
                                    steps={[
                                        {
                                            id: 'impressions',
                                            label: 'Search Impressions (Browse & Category)',
                                            value: activeInsightMetrics.impressions,
                                            color: 'bg-[#0F2F58]',
                                            subtext:
                                                'Times your listing card appeared in Tagudin marketplace discovery',
                                        },
                                        {
                                            id: 'views',
                                            label: 'Listing Detail Views',
                                            value: activeInsightMetrics.views,
                                            color: 'bg-sky-600',
                                            subtext:
                                                'Neighbors who opened your full listing, packages, and reviews',
                                        },
                                        {
                                            id: 'inquiries',
                                            label: 'High-Intent Engagements (Deal Chain & Chat)',
                                            value: activeInsightMetrics.inquiries,
                                            color: 'bg-amber-500',
                                            subtext:
                                                'Package tier selected, partner extension toggled, or inquiry started',
                                        },
                                        {
                                            id: 'orders',
                                            label: 'Confirmed Orders',
                                            value: activeInsightMetrics.orders,
                                            color: 'bg-emerald-600',
                                            subtext: 'Completed bookings and direct counter handoffs',
                                        },
                                    ]}
                                    conversionBadgeText={
                                        activeInsightMetrics.cvr === '—'
                                            ? '— View-to-Order CVR'
                                            : `${activeInsightMetrics.cvr}% View-to-Order CVR`
                                    }
                                />
                            ) : (
                                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs font-semibold text-slate-500">
                                    No discovery or order activity has been recorded for this period.
                                </p>
                            )}
                        </section>

                        {/* 3. Listings Inventory Grid (Same Visual Language as Browse.tsx) */}
                        <section className="space-y-4">
                            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
                                {/* Status Filter Pills */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {[
                                        { key: 'all', label: `All (${myListings.length})` },
                                        { key: 'active', label: `Active (${activeCount})` },
                                        {
                                            key: 'pending_review',
                                            label: `Under Review (${pendingCount})`,
                                        },
                                        { key: 'draft', label: `Drafts (${draftCount})` },
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() =>
                                                setStatusFilter(tab.key as typeof statusFilter)
                                            }
                                            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                                                statusFilter === tab.key
                                                    ? 'bg-[#0F2F58] text-white shadow-2xs'
                                                    : 'border border-slate-200 bg-[#FAFCFB] text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Search Input */}
                                <div className="relative w-full sm:w-72">
                                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search your listings..."
                                        className="h-9 w-full rounded-full border border-slate-200 bg-[#FAFCFB] pr-3.5 pl-9 text-xs font-semibold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                    />
                                </div>
                            </div>

                            {filteredListings.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                                    <h2 className="text-base font-extrabold text-[#0F2F58]">
                                        No matching listings yet
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Launch the Service or Product Studio Builder to create your
                                        offering with photos, Work Set steps, and Deal Chains.
                                    </p>
                                    <div className="mt-4 flex justify-center gap-2.5">
                                        <Link
                                            href="/listings/create/service"
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F2F58] px-4 py-2.5 text-xs font-extrabold text-white"
                                        >
                                            <Wrench className="size-3.5 text-[#FFC72C]" />
                                            <span>Create Service Listing</span>
                                        </Link>
                                        <Link
                                            href="/listings/create/product"
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-[#0F2F58]"
                                        >
                                            <Store className="size-3.5" />
                                            <span>Create Product Listing</span>
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    {filteredListings.map(({ listing, metrics }) => {
                                        const status = normalizeListingStatus(
                                            listing.status ?? listing.state,
                                        );
                                        const isProduct =
                                            (
                                                listing.listing_type ||
                                                listing.listingType ||
                                                'service'
                                            ).toLowerCase() === 'product';
                                        const categoryCode =
                                            listing.category_code ||
                                            listing.categoryCode ||
                                            'repairs';
                                        const coverThumb =
                                            listing.cover_thumbnail_url ??
                                            listing.media?.cover_thumbnail_url ??
                                            null;
                                        const hasVideo = Boolean(
                                            listing.has_video ?? listing.media?.has_video,
                                        );
                                        const priceMinor = listing.price_amount_minor;
                                        const priceDisplay =
                                            typeof priceMinor === 'number'
                                                ? `₱${(priceMinor / 100).toLocaleString('en-PH', {
                                                      minimumFractionDigits: 2,
                                                      maximumFractionDigits: 2,
                                                  })}`
                                                : 'Price not set';
                                        const stagesCount = (
                                            listing.milestone_stages ??
                                            listing.milestoneStages ??
                                            []
                                        ).length;
                                        const dealChainCount = (
                                            listing.deal_chain_combinations ?? []
                                        ).length;
                                        const editHref = `/listings/create/${
                                            isProduct ? 'product' : 'service'
                                        }?edit=${listing.id}`;
                                        const previewHref = `/my-listings/${listing.id}`;

                                        return (
                                            <article
                                                key={listing.id}
                                                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
                                            >
                                                {/* Cover Thumbnail or Category SVG Icon (16:10 matching Browse.tsx) */}
                                                <Link
                                                    href={previewHref}
                                                    className="relative block aspect-[16/10] w-full overflow-hidden bg-slate-100"
                                                >
                                                    {coverThumb ? (
                                                        <img
                                                            src={coverThumb}
                                                            alt={listing.title}
                                                            className="size-full object-cover transition-transform duration-300 group-hover:scale-103"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <CategoryVisualFallback
                                                            categoryCode={categoryCode}
                                                            title={listing.title}
                                                        />
                                                    )}

                                                    {/* Top Left Badges */}
                                                    <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5">
                                                        <span
                                                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase shadow-xs ${
                                                                isProduct
                                                                    ? 'bg-emerald-700 text-white'
                                                                    : 'bg-[#0F2F58] text-white'
                                                            }`}
                                                        >
                                                            {isProduct ? 'Product' : 'Service'}
                                                        </span>
                                                        {hasVideo && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs backdrop-blur-xs">
                                                                <Video className="size-3 text-[#FFC72C]" />
                                                                <span>Video</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Top Right Status Badge */}
                                                    <div className="absolute top-2.5 right-2.5">
                                                        <ListingStatusBadge
                                                            status={status}
                                                            version={listing.version ?? 1}
                                                        />
                                                    </div>

                                                    {/* Bottom Price Overlay */}
                                                    <div className="absolute right-2.5 bottom-2.5 rounded-xl bg-white/95 px-2.5 py-1 font-mono text-xs font-extrabold text-[#0F2F58] shadow-xs backdrop-blur-xs">
                                                        {priceDisplay}
                                                    </div>
                                                </Link>

                                                {/* Card Content Body */}
                                                <div className="flex flex-1 flex-col justify-between p-4">
                                                    <div>
                                                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                                                            <span className="font-bold tracking-wider text-slate-400 uppercase">
                                                                {categoryCode}
                                                            </span>
                                                            <span className="flex items-center gap-1 font-bold text-amber-700">
                                                                <Star className="size-3 fill-amber-400 text-amber-500" />
                                                                <span>{metrics.rating}</span>
                                                                {metrics.reviewsCount > 0 && (
                                                                    <span className="text-slate-400">
                                                                        ({metrics.reviewsCount})
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>

                                                        <Link href={previewHref}>
                                                            <h3 className="mt-1 line-clamp-1 text-sm font-extrabold text-[#0F2F58] group-hover:text-blue-900">
                                                                {listing.title ||
                                                                    'Untitled Listing'}
                                                            </h3>
                                                        </Link>
                                                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                                                            {listing.description ||
                                                                'Governed Tagudin marketplace offering.'}
                                                        </p>

                                                        {/* Structure Chips (Steps, Deal Chains, Area) */}
                                                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold text-slate-600">
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5">
                                                                <MapPin className="size-3 text-slate-400" />
                                                                {listing.area || 'Tagudin'}
                                                            </span>
                                                            {stagesCount > 0 && (
                                                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">
                                                                    {stagesCount} Work Steps
                                                                </span>
                                                            )}
                                                            {dealChainCount > 0 && (
                                                                <span className="rounded-md bg-[#EBF2FA] px-2 py-0.5 font-bold text-[#0F2F58]">
                                                                    {dealChainCount} Deal Chains
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Mini Telemetry Strip */}
                                                        <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl border border-slate-100 bg-[#FAFCFB] p-2 text-center">
                                                            <div>
                                                                <div className="text-[9px] font-bold text-slate-400 uppercase">
                                                                    Views
                                                                </div>
                                                                <div className="font-mono text-xs font-extrabold text-slate-800">
                                                                    {metrics.views}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[9px] font-bold text-slate-400 uppercase">
                                                                    CTR
                                                                </div>
                                                                <div className="font-mono text-xs font-extrabold text-emerald-700">
                                                                    {metrics.impressions > 0 ? `${metrics.ctrPct}%` : '—'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-[9px] font-bold text-slate-400 uppercase">
                                                                    Orders
                                                                </div>
                                                                <div className="font-mono text-xs font-extrabold text-[#0F2F58]">
                                                                    {metrics.orders}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Owner Actions Footer */}
                                                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                                        <Link
                                                            href={previewHref}
                                                            className="inline-flex flex-1 basis-32 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-[#0F2F58] hover:border-[#0F2F58] hover:bg-[#F0F5FA]"
                                                        >
                                                            <Eye className="size-3.5" />
                                                            <span>Customer View &amp; Manage</span>
                                                        </Link>

                                                        {(status === 'draft' || status === 'rejected') && (
                                                            <Link
                                                                href={editHref}
                                                                aria-label={`${status === 'rejected' ? 'Revise' : 'Edit'} ${listing.title} in Builder`}
                                                                className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#0F2F58]/30 bg-[#EBF2FA] px-2.5 py-2 text-xs font-extrabold text-[#0F2F58] hover:bg-[#dbe8f6]"
                                                            >
                                                                <Sliders className="size-3.5" />
                                                                <span>{status === 'rejected' ? 'Revise' : 'Edit'}</span>
                                                            </Link>
                                                        )}
                                                        {status === 'draft' && (
                                                            <button
                                                                type="button"
                                                                disabled={submittingId === listing.id}
                                                                onClick={() => handleSubmitDraft(listing)}
                                                                className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl bg-[#0F2F58] px-2.5 py-2 text-xs font-extrabold text-white hover:bg-[#153e74] disabled:opacity-50"
                                                            >
                                                                <Send className="size-3" />
                                                                <span>Submit</span>
                                                            </button>
                                                        )}
                                                        {status === 'active' && (
                                                            <button
                                                                type="button"
                                                                disabled={submittingId === listing.id}
                                                                onClick={() => handleLifecycleAction(listing, 'pause')}
                                                                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                                                            >
                                                                <PauseCircle className="size-3.5" />
                                                                Pause
                                                            </button>
                                                        )}
                                                        {status === 'paused' && (
                                                            <button
                                                                type="button"
                                                                disabled={submittingId === listing.id}
                                                                onClick={() => handleLifecycleAction(listing, 'resume')}
                                                                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                                                            >
                                                                Resume
                                                            </button>
                                                        )}
                                                        {status !== 'archived' && (
                                                            <button
                                                                type="button"
                                                                disabled={submittingId === listing.id}
                                                                onClick={() => handleLifecycleAction(listing, 'archive')}
                                                                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                                                            >
                                                                Archive
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                ) : (
                    /* Non-Provider Buyer View: Modern Touch-First Onboarding */
                    <div className="mx-auto my-4 max-w-xl px-4 sm:my-8">
                        <ModernOnboarding
                            initialDisplayName={
                                readiness?.display_name || session?.display_name || ''
                            }
                            initialAreaCode={readiness?.area_code || 'Tagudin Centro'}
                        />
                    </div>
                )}
            </main>

            <BottomNavBar
                activeTab="profile"
                onTabSelect={(tab: NavTabId) => {
                    if (tab === 'explore') router.visit('/browse');
                    if (tab === 'post') setCreatorOpen(true);
                    if (tab === 'quick_deal') setQuickDealOpen(true);
                    if (tab === 'orders') router.visit('/orders');
                    if (tab === 'invitations') router.visit('/deal-invitations');
                    if (tab === 'profile') router.visit('/my-listings');
                }}
                onQuickDealClick={() => setQuickDealOpen(true)}
            />

            <CreatorPostModal open={creatorOpen} onClose={() => setCreatorOpen(false)} />
            <QuickDealScanModal open={quickDealOpen} onClose={() => setQuickDealOpen(false)} />
        </div>
    );
}
