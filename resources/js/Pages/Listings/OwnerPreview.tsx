import { Head, Link, router } from '@inertiajs/react';
import {
    Archive,
    ArrowLeft,
    BarChart3,
    Camera,
    Check,
    CheckCircle2,
    Link2,
    MapPin,
    MessageSquare,
    Pause,
    Play,
    Send,
    ShieldAlert,
    ShieldCheck,
    Sliders,
    Star,
    Video,
    Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { FunnelAnalytics } from '@/components/admin/FunnelAnalytics';
import { DesktopGlobalNav } from '@/components/layout/DesktopGlobalNav';
import { CategoryVisualFallback } from '@/components/listings/ListingMediaPicker';
import {
    ListingStatusBadge,
    listingStatusLabel,
    normalizeListingStatus,
} from '@/components/listings/ListingStatusBadge';
import { Notice } from '@/components/ui';
import type { ListingRecord } from '@/types';
export type OwnerReviewItem = {
    id: string;
    author: string;
    barangay: string;
    timeAgo?: string;
    time_ago?: string;
    created_at?: string;
    stars: number;
    packageTag?: string;
    package_tag?: string;
    quote: string;
    attribute_chips?: string[];
    hasPhoto?: boolean;
    has_photo?: boolean;
    photoUrl?: string | null;
    photo_url?: string | null;
    verified?: boolean;
};

export type ListingRatingSummary = {
    rating: number;
    bayesian_rating: number;
    reviews_count: number;
    verified_count: number;
    distribution?: Record<number, number>;
    satisfaction_pct?: number;
};

export type ListingTelemetryData = {
    impressions: number;
    views: number;
    inquiries: number;
    orders: number;
    gross_amount_minor?: number;
    ctr_pct: string;
    cvr_pct: string;
    is_projected: boolean;
};

type OwnerPreviewProps = {
    listing: ListingRecord;
    reviews?: OwnerReviewItem[];
    reviewSummary?: ListingRatingSummary | null;
    telemetry?: ListingTelemetryData;
    notice?: string | null;
    errors?: Record<string, string>;
    correlationId?: string | null;
};

export default function OwnerPreview({
    listing,
    reviews = [],
    reviewSummary,
    telemetry,
    notice = null,
    errors = {},
    correlationId = null,
}: OwnerPreviewProps) {
    const [submitting, setSubmitting] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedPackageIndex, setSelectedPackageIndex] = useState(0);
    const [reviewFilter, setReviewFilter] = useState<'all' | 'five_star' | 'with_photos'>('all');
    const status = normalizeListingStatus(listing.status ?? listing.state);
    const canSubmit = status === 'draft';
    const version = listing.version ?? listing.expectedVersion ?? listing.expected_version ?? 1;
    const milestones = listing.milestone_stages ?? listing.milestoneStages ?? [];
    const rawPackages = listing.package_tiers ?? listing.packageTiers ?? [];
    const addons = listing.addons ?? [];
    const listingType = (listing.listing_type || listing.listingType || 'service').toLowerCase();
    const categoryCode = listing.category_code || listing.categoryCode || 'repairs';
    const editBuilderHref = `/listings/create/${
        listingType === 'product' ? 'product' : 'service'
    }?edit=${listing.id}`;

    const mediaItems = listing.media?.items ?? [];
    const coverPhotoUrl =
        listing.cover_thumbnail_url ??
        listing.media?.cover_thumbnail_url ??
        mediaItems.find((m) => m.kind === 'photo')?.url ??
        null;
    const hasVideo = Boolean(
        listing.has_video ??
            listing.media?.has_video ??
            mediaItems.some((m) => m.kind === 'video'),
    );

    const workSpec = (listing.work_specification ?? null) as {
        based_on_set_code?: string;
        based_on_set_version?: number;
        is_custom_variation?: boolean;
    } | null;

    const dealChains = (listing.deal_chain_combinations ?? []) as Array<{
        id?: string;
        title?: string;
        recipeId?: string;
        catalogVersion?: number;
        isCustom?: boolean;
        basedOnTitle?: string;
        nodes?: Array<{ role?: string; title?: string; sub?: string; bg?: string; color?: string }>;
        slots?: Array<{ role?: string; name?: string; meta?: string; coverThumbnailUrl?: string }>;
    }>;

    const basePricePesos =
        typeof listing.price_amount_minor === 'number' && listing.price_amount_minor > 0
            ? listing.price_amount_minor / 100
            : Number(rawPackages[0]?.price ?? 450);

    const packages = useMemo(() => {
        if (rawPackages.length > 0) {
            return rawPackages;
        }
        return [
            {
                id: 'pkg-default-1',
                title: listingType === 'product' ? 'Standard Unit' : 'Standard Service Scope',
                price: basePricePesos,
                sub: 'Verified Tagudin offering',
                inclusions: [
                    'Direct scope confirmation before start',
                    'Verified milestone completion evidence',
                ],
            },
        ];
    }, [rawPackages, listingType, basePricePesos]);

    const activePackage = packages[selectedPackageIndex] ?? packages[0];

    const summary = reviewSummary ?? listing.rating_summary;
    const totalReviews = summary?.reviews_count ?? reviews.length;
    const avgRating = summary?.rating ?? (totalReviews > 0 ? 5.0 : 0.0);

    const filteredReviews = useMemo(() => {
        return reviews.filter((rev) => {
            if (reviewFilter === 'five_star') return rev.stars === 5;
            if (reviewFilter === 'with_photos') return Boolean(rev.hasPhoto ?? rev.has_photo);
            return true;
        });
    }, [reviews, reviewFilter]);

    const funnelMetrics = useMemo(() => {
        if (telemetry) {
            return {
                impressions: telemetry.impressions,
                views: telemetry.views,
                inquiries: telemetry.inquiries,
                orders: telemetry.orders,
                cvr: telemetry.cvr_pct,
                ctr: telemetry.ctr_pct,
                isProjected: telemetry.is_projected,
            };
        }
        if (status === 'draft') {
            return {
                impressions: 640,
                views: 156,
                inquiries: 38,
                orders: 12,
                cvr: '7.7',
                ctr: '24.4',
                isProjected: true,
            };
        }
        return {
            impressions: 0,
            views: 0,
            inquiries: 0,
            orders: 0,
            cvr: '0.0',
            ctr: '0.0',
            isProjected: false,
        };
    }, [telemetry, status]);

    const handlePause = () => {
        if (actionLoading) return;
        setActionLoading(true);
        router.post(
            `/listings/${listing.id}/pause`,
            { expected_version: version },
            {
                preserveScroll: true,
                onFinish: () => setActionLoading(false),
            },
        );
    };

    const handleResume = () => {
        if (actionLoading) return;
        setActionLoading(true);
        router.post(
            `/listings/${listing.id}/resume`,
            { expected_version: version },
            {
                preserveScroll: true,
                onFinish: () => setActionLoading(false),
            },
        );
    };

    const handleArchive = () => {
        if (actionLoading) return;
        if (!window.confirm('Are you sure you want to archive this listing? It will no longer be visible or bookable.')) return;
        setActionLoading(true);
        router.post(
            `/listings/${listing.id}/archive`,
            { expected_version: version },
            {
                onFinish: () => setActionLoading(false),
            },
        );
    };

    const submitForReview = () => {
        if (!canSubmit || submitting) return;

        setSubmitting(true);
        router.post(
            `/listings/${listing.id}/submit`,
            {
                expected_version: version,
                idempotency_key: `owner-preview-${listing.id}-v${version}`,
            },
            {
                preserveScroll: true,
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 pb-16">
            <Head title={`${listing.title} · Customer View & Manage`} />
            <DesktopGlobalNav activeRoute="listings" />

            <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
                {/* Top Owner Studio Control Bar */}
                <div className="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href="/my-listings"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-1.5 text-xs font-extrabold text-[#0F2F58] hover:border-[#0F2F58]"
                        >
                            <ArrowLeft className="size-3.5" />
                            <span>My Listings</span>
                        </Link>
                        <ListingStatusBadge status={status} version={version} />
                    </div>

                    {canSubmit && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={editBuilderHref}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F2F58] bg-[#EBF2FA] px-3.5 py-2 text-xs font-extrabold text-[#0F2F58] hover:bg-[#dbe8f6]"
                            >
                                <Sliders className="size-3.5" />
                                <span>Edit in Studio Builder</span>
                            </Link>
                            <button
                                type="button"
                                onClick={submitForReview}
                                disabled={submitting}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0F2F58] px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#153e74] disabled:opacity-50"
                            >
                                <Send className="size-3.5" />
                                <span>{submitting ? 'Submitting…' : 'Submit for review'}</span>
                            </button>
                        </div>
                    )}
                </div>

                {notice ? (
                    <div className="mb-5">
                        <Notice tone="success">{notice}</Notice>
                    </div>
                ) : null}
                {errors.form ? (
                    <div className="mb-5">
                        <Notice tone="danger">{errors.form}</Notice>
                    </div>
                ) : null}

                {/* 12-Column Layout Matching ListingDetail.tsx */}
                <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                    {/* LEFT 7 COLUMNS: Customer View Twin + All Sections + Reviews */}
                    <div className="space-y-6 lg:col-span-7">
                        {/* 1. Hero Media & Gallery Card */}
                        <section
                            data-testid="owner-preview-media-gallery"
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
                        >
                            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                                {coverPhotoUrl ? (
                                    <img
                                        src={coverPhotoUrl}
                                        alt={listing.title}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <CategoryVisualFallback
                                        categoryCode={categoryCode}
                                        title={listing.title}
                                    />
                                )}

                                <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#0F2F58]/90 px-3 py-1 text-[10px] font-extrabold text-white uppercase backdrop-blur-xs">
                                        <Camera className="size-3 text-[#FFC72C]" />
                                        <span>{coverPhotoUrl ? 'Cover' : 'Category Icon'}</span>
                                    </span>
                                    {hasVideo && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-1 text-[10px] font-extrabold text-white uppercase backdrop-blur-xs">
                                            <Video className="size-3 text-[#FFC72C]" />
                                            <span>Video</span>
                                        </span>
                                    )}
                                </div>

                                <div className="absolute right-3 bottom-3 rounded-xl bg-white/95 px-3 py-1.5 font-mono text-sm font-extrabold text-[#0F2F58] shadow-sm">
                                    ₱{basePricePesos.toFixed(2)}
                                </div>
                            </div>

                            {mediaItems.length > 1 && (
                                <div className="flex gap-2.5 overflow-x-auto border-t border-slate-100 bg-[#FAFCFB] p-3">
                                    {mediaItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-3"
                                        >
                                            <img
                                                src={
                                                    item.thumbnail_url ||
                                                    item.url ||
                                                    coverPhotoUrl ||
                                                    '/photos/ac-clean.jpg'
                                                }
                                                alt={item.caption || item.kind}
                                                className="size-10 rounded-lg object-cover"
                                            />
                                            <div className="text-[10px] font-extrabold text-[#0F2F58] uppercase">
                                                {item.kind === 'video'
                                                    ? 'Video'
                                                    : item.is_cover
                                                      ? 'Cover'
                                                      : 'Photo'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* 2. Customer Header & Identity Card (Matching ListingDetail.tsx) */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-[#EBF2FA] px-3 py-1 text-[10px] font-extrabold text-[#0F2F58] uppercase">
                                        {categoryCode}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                                        <Star className="size-3.5 fill-amber-400 text-amber-500" />
                                        <span>{totalReviews > 0 ? avgRating.toFixed(1) : 'New'}</span>
                                        <span className="text-slate-400">
                                            ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                                        </span>
                                    </span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                                    <MapPin className="size-3.5 text-slate-400" />
                                    <span>{listing.area || 'Tagudin Centro'}</span>
                                </span>
                            </div>

                            <h1 className="mt-2.5 text-xl font-extrabold tracking-tight text-[#0F2F58] sm:text-2xl">
                                {listing.title || 'Untitled Listing'}
                            </h1>
                            <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                                {listing.description ||
                                    'Verified Tagudin marketplace offering with milestone gates.'}
                            </p>

                            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-[#FAFCFB] p-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-full bg-[#0F2F58] text-xs font-extrabold text-white">
                                        {(listing.title || 'S').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-extrabold text-slate-900">
                                                {listing.owner_name ||
                                                    listing.ownerName ||
                                                    'Your Provider Profile'}
                                            </span>
                                            <ShieldCheck className="size-3.5 text-emerald-600" />
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            Review the saved listing as neighbors see it on
                                            /listings/{listing.id}
                                        </div>
                                    </div>
                                </div>
                                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 uppercase">
                                    0% Platform Fee
                                </span>
                            </div>
                        </section>

                        {/* 3. Interactive Package Tiers & Inclusions (Matching ListingDetail.tsx) */}
                        {packages.length > 0 && (
                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="mb-3 flex items-baseline justify-between">
                                    <div>
                                        <h2 className="text-sm font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                            Saved packages
                                        </h2>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Interactive customer tier selector preview
                                        </p>
                                    </div>
                                    <span className="text-[11px] font-bold text-[#0F2F58]">
                                        {packages.length}{' '}
                                        {packages.length === 1 ? 'Tier' : 'Tiers'}
                                    </span>
                                </div>

                                <div className="flex gap-2.5 overflow-x-auto pb-1.5 [scrollbar-width:none]">
                                    {packages.map((pkg, idx) => {
                                        const isSelected = selectedPackageIndex === idx;
                                        return (
                                            <button
                                                key={pkg.id || idx}
                                                type="button"
                                                onClick={() => setSelectedPackageIndex(idx)}
                                                className={`flex w-[210px] shrink-0 cursor-pointer flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                                                    isSelected
                                                        ? 'border-[#0F2F58] bg-[#EBF2FA] ring-1 ring-[#0F2F58]/25 shadow-xs'
                                                        : 'border-slate-200 bg-[#FAFCFB] hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex w-full items-center justify-between gap-1">
                                                    <span className="truncate text-xs font-extrabold text-[#0F2F58]">
                                                        {pkg.title}
                                                    </span>
                                                    {isSelected && (
                                                        <Check className="size-3.5 shrink-0 text-[#0F2F58]" />
                                                    )}
                                                </div>
                                                <div className="mt-1 font-mono text-sm font-extrabold text-[#0F2F58]">
                                                    ₱{Number(pkg.price).toFixed(2)}
                                                </div>
                                                <div className="mt-0.5 line-clamp-1 text-[10.5px] text-slate-500">
                                                    {pkg.sub}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {Array.isArray(activePackage?.inclusions) &&
                                    activePackage.inclusions.length > 0 && (
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

                                {addons.length > 0 && (
                                    <div className="mt-4 border-t border-slate-100 pt-3">
                                        <div className="mb-2 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                                            Optional Customer Add-ons ({addons.length})
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {addons.map((addon, idx) => (
                                                <div
                                                    key={addon.id || idx}
                                                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-2 text-xs"
                                                >
                                                    <span className="font-bold text-slate-800">
                                                        {addon.title}
                                                    </span>
                                                    <span className="font-mono font-extrabold text-emerald-700">
                                                        +₱
                                                        {(addon.price_amount_minor / 100).toFixed(
                                                            2,
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* 4. Saved Work Execution Stages */}
                        {milestones.length > 0 && (
                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Wrench className="size-4 text-[#0F2F58]" />
                                        <h2 className="text-sm font-extrabold text-[#0F2F58]">
                                            Saved work stages ({milestones.length})
                                        </h2>
                                    </div>
                                    {workSpec && (
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                                                    workSpec.is_custom_variation
                                                        ? 'bg-amber-100 text-amber-900'
                                                        : 'bg-emerald-100 text-emerald-800'
                                                }`}
                                            >
                                                {workSpec.is_custom_variation
                                                    ? 'Custom for this listing'
                                                    : 'Published Work Set'}
                                            </span>
                                            {workSpec.based_on_set_code && (
                                                <span className="text-[11px] font-semibold text-slate-500">
                                                    {workSpec.based_on_set_code} v
                                                    {workSpec.based_on_set_version ?? 1}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <ol className="mt-3.5 space-y-2">
                                    {milestones.map((stage, index) => (
                                        <li
                                            key={
                                                stage.id ?? `${index}-${stage.title ?? stage.label}`
                                            }
                                            className="flex gap-3 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3"
                                        >
                                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0F2F58] text-[10px] font-extrabold text-white">
                                                {index + 1}
                                            </span>
                                            <div>
                                                <p className="text-xs font-extrabold text-slate-900">
                                                    {stage.title ??
                                                        stage.label ??
                                                        `Stage ${index + 1}`}
                                                </p>
                                                {(stage.description ?? stage.sub) ? (
                                                    <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                                                        {stage.description ?? stage.sub}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        )}

                        {/* 5. Saved Partnered Deal Chains */}
                        {dealChains.length > 0 && (
                            <section
                                data-testid="owner-preview-deal-chains"
                                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Link2 className="size-4 text-[#0F2F58]" />
                                        <h2 className="text-sm font-extrabold text-[#0F2F58]">
                                            Saved Partnered Deal Chains ({dealChains.length})
                                        </h2>
                                    </div>
                                    <span className="rounded-full bg-[#0F2F58] px-2.5 py-0.5 text-[9.5px] font-extrabold text-white uppercase">
                                        Deal Chain
                                    </span>
                                </div>
                                <div className="mt-3.5 space-y-3">
                                    {dealChains.map((chain, cIdx) => (
                                        <div
                                            key={chain.id || cIdx}
                                            className="rounded-xl border border-slate-200 bg-[#FAFCFB] p-3.5"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-extrabold text-[#0F2F58]">
                                                        {chain.title || `Deal Chain #${cIdx + 1}`}
                                                    </span>
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                                                            chain.isCustom
                                                                ? 'bg-amber-100 text-amber-900'
                                                                : 'bg-emerald-100 text-emerald-800'
                                                        }`}
                                                    >
                                                        {chain.isCustom
                                                            ? 'Custom for this listing'
                                                            : 'Deal Chain Set'}
                                                    </span>
                                                </div>
                                                {chain.basedOnTitle && (
                                                    <span className="text-[10.5px] text-slate-500">
                                                        Based on {chain.basedOnTitle} v
                                                        {chain.catalogVersion ?? 1}
                                                    </span>
                                                )}
                                            </div>
                                            {Array.isArray(chain.nodes) &&
                                                chain.nodes.length > 0 && (
                                                    <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                                        {chain.nodes.map((node, nIdx) => (
                                                            <div
                                                                key={nIdx}
                                                                className="flex shrink-0 items-center gap-1.5"
                                                            >
                                                                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-[#0F2F58]">
                                                                    {node.role}: {node.title}{' '}
                                                                    {node.sub
                                                                        ? `(${node.sub})`
                                                                        : ''}
                                                                </span>
                                                                {nIdx <
                                                                    (chain.nodes?.length ?? 0) -
                                                                        1 && (
                                                                    <span className="text-xs font-bold text-emerald-600">
                                                                        →
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 6. Verified Customer Reviews & Job Photos (Matching ListingDetail.tsx) */}
                        <section
                            data-testid="owner-preview-reviews"
                            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <MessageSquare className="size-4 text-[#0F2F58]" />
                                        <h2 className="text-sm font-extrabold text-[#0F2F58] uppercase">
                                            Customer Reviews &amp; Job Photos
                                        </h2>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Verified feedback and milestone completion photos from
                                        Tagudin orders
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-800">
                                    <Star className="size-4 fill-amber-400 text-amber-500" />
                                    <span>
                                        {totalReviews > 0
                                            ? `${avgRating.toFixed(1)} · ${totalReviews} Verified`
                                            : 'New Listing · 0 Verified'}
                                    </span>
                                </div>
                            </div>

                            {/* Review Filter Pills */}
                            {reviews.length > 0 && (
                                <div className="mt-3.5 flex flex-wrap gap-1.5">
                                    {[
                                        {
                                            key: 'all',
                                            label: `All Reviews (${reviews.length})`,
                                        },
                                        { key: 'five_star', label: '★ 5 Stars' },
                                        { key: 'with_photos', label: 'With Job Photos' },
                                    ].map((pill) => (
                                        <button
                                            key={pill.key}
                                            type="button"
                                            onClick={() =>
                                                setReviewFilter(pill.key as typeof reviewFilter)
                                            }
                                            className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-extrabold transition-all ${
                                                reviewFilter === pill.key
                                                    ? 'bg-[#0F2F58] text-white'
                                                    : 'border border-slate-200 bg-[#FAFCFB] text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            {pill.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Review Cards or Zero State */}
                            {reviews.length === 0 ? (
                                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-[#FAFCFB] p-8 text-center">
                                    <MessageSquare className="mx-auto size-6 text-slate-300" />
                                    <h3 className="mt-2 text-xs font-extrabold text-slate-700">
                                        No verified customer reviews yet
                                    </h3>
                                    <p className="mx-auto mt-1 max-w-sm text-[11px] text-slate-500">
                                        Customer feedback and verified milestone photos appear here
                                        once Tagudin orders are completed and unblinded.
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {filteredReviews.map((review) => {
                                        const authorName = review.author || 'Resident Customer';
                                        const timeAgoText = review.time_ago || review.timeAgo || 'Recently';
                                        const packageLabel = review.package_tag || review.packageTag || 'Verified Order';
                                        const photoSrc = review.photo_url || review.photoUrl;
                                        const hasPhoto = Boolean(review.has_photo || review.hasPhoto || photoSrc);

                                        return (
                                            <div
                                                key={review.id}
                                                className="rounded-xl border border-slate-200/80 bg-[#FAFCFB] p-4"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex size-7 items-center justify-center rounded-full bg-[#0F2F58] text-[10px] font-extrabold text-white">
                                                            {authorName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-extrabold text-slate-900">
                                                                {authorName} · {review.barangay || 'Tagudin'}
                                                            </div>
                                                            <div className="text-[10px] font-semibold text-slate-400">
                                                                {packageLabel} · {timeAgoText}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
                                                        {'★'.repeat(Math.max(1, Math.min(5, review.stars)))}
                                                    </div>
                                                </div>
                                                <p className="mt-2 text-xs leading-relaxed text-slate-700">
                                                    &ldquo;{review.quote}&rdquo;
                                                </p>
                                                {Array.isArray(review.attribute_chips) &&
                                                    review.attribute_chips.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {review.attribute_chips.map((chip, ci) => (
                                                                <span
                                                                    key={ci}
                                                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-semibold text-slate-600"
                                                                >
                                                                    #{chip}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                {hasPhoto && photoSrc && (
                                                    <div className="mt-2.5 flex items-center gap-2">
                                                        <img
                                                            src={photoSrc}
                                                            alt="Verified job photo"
                                                            className="size-14 rounded-lg border border-slate-200 object-cover"
                                                        />
                                                        <span className="text-[10.5px] font-bold text-emerald-700">
                                                            ✓ Verified Milestone Photo
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* RIGHT 5 COLUMNS: Sticky Owner Control & Funnel Insights Sidebar */}
                    <aside className="space-y-5 lg:sticky lg:top-20 lg:col-span-5">
                        {/* Owner Control & Lifecycle Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                            {status === 'draft' ? (
                                <>
                                    <div className="flex items-start gap-2.5">
                                        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
                                        <div>
                                            <h2 className="text-sm font-extrabold text-[#0F2F58]">
                                                Private draft · Ready to Manage
                                            </h2>
                                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                                Edit any section in the Studio Builder or submit
                                                this version to the review queue to publish on
                                                /browse.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-2">
                                        <Link
                                            href={editBuilderHref}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#0F2F58] bg-[#EBF2FA] px-4 py-2.5 text-xs font-extrabold text-[#0F2F58] hover:bg-[#dbe8f6]"
                                        >
                                            <Sliders className="size-3.5" />
                                            <span>Edit in Studio Builder</span>
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={submitForReview}
                                            disabled={submitting}
                                            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0F2F58] px-4 py-3 text-xs font-extrabold text-white hover:bg-[#153e74] disabled:opacity-50"
                                        >
                                            <Send className="size-4" />
                                            <span>
                                                {submitting ? 'Submitting…' : 'Submit for review'}
                                            </span>
                                        </button>
                                    </div>
                                </>
                            ) : status === 'active' ? (
                                <>
                                    <div className="flex items-start gap-2.5">
                                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                                        <div>
                                            <h2 className="text-sm font-extrabold text-[#0F2F58]">
                                                Active Marketplace Listing
                                            </h2>
                                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                                Live and discoverable on /browse. You can pause
                                                accepting new orders or archive this listing.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-2">
                                        <button
                                            type="button"
                                            onClick={handlePause}
                                            disabled={actionLoading}
                                            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-extrabold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                                        >
                                            <Pause className="size-3.5" />
                                            <span>{actionLoading ? 'Updating…' : 'Pause Listing'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleArchive}
                                            disabled={actionLoading}
                                            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#FAFCFB] px-4 py-2 text-xs font-extrabold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                        >
                                            <Archive className="size-3.5" />
                                            <span>Archive Listing</span>
                                        </button>
                                    </div>
                                </>
                            ) : status === 'paused' ? (
                                <>
                                    <div className="flex items-start gap-2.5">
                                        <Pause className="mt-0.5 size-5 shrink-0 text-amber-600" />
                                        <div>
                                            <h2 className="text-sm font-extrabold text-[#0F2F58]">
                                                Listing Paused
                                            </h2>
                                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                                Hidden from public browse. Existing orders remain active.
                                                Resume when ready to accept customers.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-2">
                                        <button
                                            type="button"
                                            onClick={handleResume}
                                            disabled={actionLoading}
                                            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            <Play className="size-3.5" />
                                            <span>{actionLoading ? 'Updating…' : 'Resume Listing'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleArchive}
                                            disabled={actionLoading}
                                            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#FAFCFB] px-4 py-2 text-xs font-extrabold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                        >
                                            <Archive className="size-3.5" />
                                            <span>Archive Listing</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-start gap-2.5">
                                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-sky-600" />
                                    <div>
                                        <h2 className="text-sm font-extrabold text-[#0F2F58]">
                                            {status === 'pending_review'
                                                ? 'Submitted for review'
                                                : `Listing ${listingStatusLabel(status)}`}
                                        </h2>
                                        <p className="mt-1 text-xs leading-5 text-slate-600">
                                            {status === 'pending_review'
                                                ? 'This version remains private until approved for public discovery.'
                                                : `Authoritative server status: ${status}.`}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-slate-500">Version</dt>
                                    <dd className="font-mono font-bold text-slate-900">
                                        v{version}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-slate-500">Visibility</dt>
                                    <dd className="font-bold text-slate-900">
                                        {listing.public ? 'Public on /browse' : 'Owner only'}
                                    </dd>
                                </div>
                                {listing.capacity_summary ? (
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-slate-500">Availability</dt>
                                        <dd className="text-right font-bold text-slate-900">
                                            {listing.capacity_summary}
                                        </dd>
                                    </div>
                                ) : null}
                                {correlationId ? (
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-slate-500">Reference</dt>
                                        <dd className="max-w-40 truncate font-mono text-[10px] text-slate-600">
                                            {correlationId}
                                        </dd>
                                    </div>
                                ) : null}
                            </dl>
                        </div>

                        {/* Per-Listing Discovery & Conversion Funnel Card */}
                        <div
                            data-testid="owner-preview-funnel"
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                    <BarChart3 className="size-4 text-emerald-600" />
                                    <span>Listing Insights &amp; Funnel</span>
                                </div>
                                {funnelMetrics.isProjected && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-bold text-slate-600">
                                        Category Benchmark
                                    </span>
                                )}
                            </div>

                            <FunnelAnalytics
                                title="Discovery & Conversion Funnel"
                                description="30-day search impressions through confirmed orders"
                                steps={[
                                    {
                                        id: 's1',
                                        label: 'Search Impressions',
                                        value: funnelMetrics.impressions,
                                        color: 'bg-[#0F2F58]',
                                        subtext: 'Browse & category feed appearances',
                                    },
                                    {
                                        id: 's2',
                                        label: 'Detail Page Views',
                                        value: funnelMetrics.views,
                                        color: 'bg-sky-600',
                                        subtext: 'Tapped card to inspect packages & media',
                                    },
                                    {
                                        id: 's3',
                                        label: 'High-Intent Engagements',
                                        value: funnelMetrics.inquiries,
                                        color: 'bg-amber-500',
                                        subtext: 'Deal Chain selected or inquiry started',
                                    },
                                    {
                                        id: 's4',
                                        label: 'Confirmed Orders',
                                        value: funnelMetrics.orders,
                                        color: 'bg-emerald-600',
                                        subtext: 'Completed Tagudin bookings',
                                    },
                                ]}
                                conversionBadgeText={`${funnelMetrics.cvr}% View-to-Order CVR`}
                            />
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}
