import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { DenialState, ListingRecord } from '../../types';
import { useRegisterShellDrawerActions } from '../ProductShell';
import { Button, Notice } from '../ui';
import './listing-detail.css';

const PIN_STORAGE_KEY = 'serbizyu.browse.pins';
const STEP_DESC_SHORT = 90;

type WorkflowStep = {
    title: string;
    description: string;
};

type SampleReview = {
    id: string;
    name: string;
    initials: string;
    stars: number;
    body: string;
};

type CategoryMeta = {
    label: string;
    icon: string;
    barangayPreview: string;
    workShapePreview: string;
    /** Provider-authored step titles + short descriptions (preview until Work template projects). */
    workflowSteps: WorkflowStep[];
    previewPhotos: string[];
};

const CATEGORY_META: Record<string, CategoryMeta> = {
    'greeting-cards': {
        label: 'Greeting cards',
        icon: '✎',
        barangayPreview: 'Tagudin Centro',
        workShapePreview: 'A1 Linear project',
        workflowSteps: [
            {
                title: 'Share your occasion brief',
                description:
                    'Tell us the names, date, tone, and any must-have wording. Photos of inspiration help.',
            },
            {
                title: 'Approve soft proof',
                description: 'One revision is included. We lock the layout after you approve the soft proof.',
            },
            {
                title: 'Pickup at Centro',
                description:
                    'Meet at a public Tagudin Centro point after soft proof. Printing is arranged separately when needed.',
            },
        ],
        previewPhotos: [
            'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=78',
            'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=78',
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=78',
        ],
    },
    repairs: {
        label: 'Repairs',
        icon: '🔧',
        barangayPreview: 'Barangay Pudoc West',
        workShapePreview: 'A3 Appointment',
        workflowSteps: [
            {
                title: 'Describe the repair',
                description: 'What failed, where it sits, and any photos of the issue.',
            },
            {
                title: 'Walk-in or scheduled slot',
                description: 'Confirm a time or bring the item to the shop window.',
            },
            {
                title: 'Done & hand-back',
                description: 'Confirm the fix in person before you leave.',
            },
        ],
        previewPhotos: [
            'https://images.unsplash.com/photo-1581092918056-0c4c5acdfb82?auto=format&fit=crop&w=1200&q=78',
            'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=78',
        ],
    },
    'local-services': {
        label: 'Local services',
        icon: '◎',
        barangayPreview: 'Tagudin Public Market',
        workShapePreview: 'A4 Handoff',
        workflowSteps: [
            {
                title: 'Send the request',
                description: 'Scope, timing, and where you want to meet.',
            },
            {
                title: 'Meet in public',
                description: 'Agree a public Tagudin point for the hand-off.',
            },
            {
                title: 'Complete hand-off',
                description: 'Confirm receipt before you part ways.',
            },
        ],
        previewPhotos: [
            'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=78',
            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=78',
        ],
    },
    'print-assist': {
        label: 'Print assist',
        icon: '▦',
        barangayPreview: 'Tagudin Centro',
        workShapePreview: 'A1 Linear project',
        workflowSteps: [
            {
                title: 'Upload or drop the file',
                description: 'PDF or clear photo of the layout you need printed.',
            },
            {
                title: 'Confirm soft proof',
                description: 'Check size, color, and paper choice before the press run.',
            },
            {
                title: 'Collect print',
                description: 'Pickup at Centro when ready — usually same day for small jobs.',
            },
        ],
        previewPhotos: [
            'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=78',
            'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=78',
        ],
    },
    'local-food': {
        label: 'Local food',
        icon: '◉',
        barangayPreview: 'Tagudin Market stall',
        workShapePreview: 'A4 Handoff',
        workflowSteps: [
            {
                title: 'Reserve your order',
                description: 'Portion, spice level, and pickup window.',
            },
            {
                title: 'Ready notice',
                description: 'We ping when the parcel is packed.',
            },
            {
                title: 'Pickup at stall',
                description: 'Collect at the market stall — keep the order name handy.',
            },
        ],
        previewPhotos: [
            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=78',
            'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=78',
        ],
    },
    'local-help': {
        label: 'Local help',
        icon: '＋',
        barangayPreview: 'Tagudin Centro',
        workShapePreview: 'A3 Appointment',
        workflowSteps: [
            {
                title: 'Describe the help needed',
                description: 'What you need done, when, and any tools already on site.',
            },
            {
                title: 'Confirm the meet',
                description: 'Lock time and a public or agreed safe place.',
            },
            {
                title: 'Finish & confirm',
                description: 'Both sides confirm the work is done before you leave.',
            },
        ],
        previewPhotos: [
            'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=78',
            'https://images.unsplash.com/photo-1581092918056-0c4c5acdfb82?auto=format&fit=crop&w=1200&q=78',
        ],
    },
};

const SAMPLE_REVIEWS: SampleReview[] = [
    {
        id: 'r1',
        name: 'Ana M.',
        initials: 'A',
        stars: 5,
        body: 'Beautiful work, Maria! The details on the wedding invites were perfect.',
    },
    {
        id: 'r2',
        name: 'Carlos R.',
        initials: 'C',
        stars: 5,
        body: 'Highly recommend. Fast turnaround and lovely packaging.',
    },
    {
        id: 'r3',
        name: 'Elena S.',
        initials: 'E',
        stars: 4,
        body: 'Great quality paper. Will definitely order again.',
    },
    {
        id: 'r4',
        name: 'Jun R.',
        initials: 'J',
        stars: 5,
        body: 'One soft-proof round was enough. Clear steps from brief to pickup.',
    },
];

function field(listing: ListingRecord, ...keys: string[]): string {
    for (const key of keys) {
        const value = (listing as Record<string, unknown>)[key];
        if (typeof value === 'string' && value.trim() !== '') {
            return value.trim();
        }
    }
    return '';
}

function categoryCode(listing: ListingRecord): string {
    return field(listing, 'categoryCode', 'category_code') || 'local-services';
}

function categoryMeta(listing: ListingRecord): CategoryMeta {
    const code = categoryCode(listing);
    return (
        CATEGORY_META[code] ?? {
            label: code.replace(/-/g, ' '),
            icon: '◎',
            barangayPreview: 'Tagudin',
            workShapePreview: 'A1 Linear project',
            workflowSteps: [
                {
                    title: 'Send request',
                    description: 'Share what you need in plain words.',
                },
                {
                    title: 'Confirm details',
                    description: 'Agree timing and place before work starts.',
                },
                {
                    title: 'Complete',
                    description: 'Confirm the work or hand-off is done.',
                },
            ],
            previewPhotos: CATEGORY_META['local-services'].previewPhotos,
        }
    );
}

function listingType(listing: ListingRecord): string {
    return field(listing, 'listingType', 'listing_type') || 'service';
}

function isOfferListing(listing: ListingRecord): boolean {
    const type = listingType(listing).toLowerCase();
    return !type.includes('request');
}

function isProductListing(listing: ListingRecord): boolean {
    return listingType(listing).toLowerCase().includes('product');
}

function area(listing: ListingRecord): string {
    return field(listing, 'area', 'locality') || 'Tagudin';
}

function ownerLabel(listing: ListingRecord): string {
    return (
        field(listing, 'ownerName', 'owner_name') ||
        listing.owner?.displayName ||
        listing.owner?.display_name ||
        'Local provider'
    );
}

function placeLabel(listing: ListingRecord, barangayPreview: string): string {
    const live = field(listing, 'area', 'locality');
    if (live && live.toLowerCase() !== 'tagudin') {
        return live;
    }
    return barangayPreview || live || 'Tagudin';
}

type MapsTarget = {
    label: string;
    /** Prefer projected coordinates when the server supplies them. */
    lat?: number | null;
    lng?: number | null;
    /** Free-text fallback (place name + locality). */
    query?: string | null;
};

/**
 * Scalable Maps deep-link: coords when available, otherwise search query.
 * Swap the host later for Apple Maps / in-app webview without changing callers.
 */
function mapsDirectionsUrl(target: MapsTarget): string {
    if (
        typeof target.lat === 'number' &&
        Number.isFinite(target.lat) &&
        typeof target.lng === 'number' &&
        Number.isFinite(target.lng)
    ) {
        return `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}`;
    }

    const query = (target.query?.trim() || target.label).trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function readCoord(listing: ListingRecord, ...keys: string[]): number | null {
    const record = listing as Record<string, unknown>;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string' && value.trim() !== '') {
            const n = Number(value);
            if (Number.isFinite(n)) {
                return n;
            }
        }
    }
    return null;
}

function listingMapsTarget(listing: ListingRecord, place: string): MapsTarget {
    const lat = readCoord(listing, 'latitude', 'lat');
    const lng = readCoord(listing, 'longitude', 'lng');
    const locality = field(listing, 'area', 'locality') || 'Tagudin, Ilocos Sur';

    return {
        label: place,
        lat,
        lng,
        query: `${place}, ${locality}`,
    };
}

function hashId(id: string): number {
    let h = 0;
    for (const ch of id) {
        h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    }
    return h;
}

function previewRating(listing: ListingRecord): number {
    return 4.2 + hashId(listing.id) % 70 / 100;
}

function previewOrders(listing: ListingRecord): number {
    return 8 + (hashId(listing.id) % 40);
}

/**
 * Account-wide provider signals — deliberately distinct from this listing's own
 * rating/orders. Preview values until aggregated provider stats project from the
 * server.
 */
function providerRating(listing: ListingRecord): number {
    return 4.5 + (hashId(`${listing.id}-provider`) % 45) / 100;
}

function providerOrders(listing: ListingRecord): number {
    return 60 + (hashId(`${listing.id}-provider-orders`) % 900);
}

function providerListings(listing: ListingRecord): number {
    return 3 + (hashId(`${listing.id}-provider-listings`) % 12);
}

function previewMeters(listing: ListingRecord): number {
    return 120 + (hashId(listing.id) % 1800);
}

function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${meters} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
}

function formatMoney(minor: number, currency: string): string {
    if (currency === 'PHP') {
        return `₱${(minor / 100).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
    }
    return `${(minor / 100).toFixed(2)} ${currency}`;
}

function formatPrice(listing: ListingRecord): string | null {
    const minor = listing.price_amount_minor;
    if (typeof minor !== 'number' || !Number.isFinite(minor)) {
        return null;
    }
    const currency = (listing.currency ?? 'PHP').toUpperCase();
    const high = (listing as Record<string, unknown>).price_amount_minor_high;
    if (typeof high === 'number' && Number.isFinite(high) && high > minor) {
        return `${formatMoney(minor, currency)}–${formatMoney(high, currency)}`;
    }
    return formatMoney(minor, currency);
}

function capacityLine(listing: ListingRecord): string | null {
    const value = listing.capacity_summary;
    if (typeof value !== 'string' || value.trim() === '') {
        return null;
    }
    return value.trim();
}

function loadPins(): Set<string> {
    try {
        const raw = window.localStorage.getItem(PIN_STORAGE_KEY);
        if (!raw) {
            return new Set();
        }
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
            return new Set();
        }
        return new Set(parsed.filter((id): id is string => typeof id === 'string'));
    } catch {
        return new Set();
    }
}

function persistPins(pins: Set<string>): void {
    try {
        window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify([...pins]));
    } catch {
        // Ignore quota / private mode.
    }
}

function starLabel(stars: number): string {
    return '★'.repeat(Math.max(0, Math.min(5, stars))) + '☆'.repeat(Math.max(0, 5 - stars));
}

function ProtectedAttempt({ listingId }: { listingId: string }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [correlationId, setCorrelationId] = useState<string | null>(null);

    return (
        <div className="ldv-seam">
            <strong>Protected owner action</strong>
            <p>This intentional test path should deny a public viewer without exposing protected fields.</p>
            <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                    setBusy(true);
                    setError(null);
                    setCorrelationId(null);
                    router.post(
                        `/listings/${listingId}/protected-edit-attempt`,
                        {},
                        {
                            preserveScroll: true,
                            onError: (errors) => {
                                const bag = errors as Record<string, unknown>;
                                const messages = Object.entries(bag).flatMap(([key, value]) => {
                                    if (key === 'correlation_id' || key === 'correlationId') {
                                        return [];
                                    }
                                    return [String(Array.isArray(value) ? value[0] ?? '' : value ?? '')].filter(Boolean);
                                });
                                setError(messages.join(' ') || 'That action is not available without permission.');
                                const raw = bag.correlation_id ?? bag.correlationId;
                                setCorrelationId(Array.isArray(raw) ? String(raw[0] ?? '') : raw ? String(raw) : null);
                            },
                            onFinish: () => setBusy(false),
                        },
                    );
                }}
            >
                Try protected action
            </Button>
            {error ? <p className="ldv-seam-error">{error}</p> : null}
            {correlationId ? (
                <p className="ldv-ref">
                    Reference: <code>{correlationId}</code>
                </p>
            ) : null}
        </div>
    );
}

function WorkflowSteps({ steps }: { steps: WorkflowStep[] }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <ol className="ldv-steps">
            {steps.map((step, index) => {
                const long = step.description.length > STEP_DESC_SHORT;
                const open = openIndex === index;
                const shown =
                    long && !open ? `${step.description.slice(0, STEP_DESC_SHORT).trimEnd()}…` : step.description;

                return (
                    <li key={`${step.title}-${index}`}>
                        <span className="ldv-step-dot">{index + 1}</span>
                        <div className="ldv-step-label">
                            <strong>{step.title}</strong>
                            {long ? (
                                <button
                                    type="button"
                                    className="ldv-step-desc is-expandable"
                                    aria-expanded={open}
                                    onClick={() => setOpenIndex(open ? null : index)}
                                >
                                    {shown}
                                    <span className="ldv-step-more">{open ? 'Show less' : 'Read more'}</span>
                                </button>
                            ) : (
                                <span className="ldv-step-desc">{step.description}</span>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

function ReviewSuite({ reviews }: { reviews: SampleReview[] }) {
    const [active, setActive] = useState(0);
    const stripRef = useRef<HTMLDivElement>(null);
    const touchX = useRef<number | null>(null);

    useEffect(() => {
        if (reviews.length < 2) {
            return;
        }
        const reduce =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            return;
        }
        const timer = window.setInterval(() => {
            setActive((prev) => (prev + 1) % reviews.length);
        }, 3800);
        return () => window.clearInterval(timer);
    }, [reviews.length]);

    useEffect(() => {
        const strip = stripRef.current;
        if (!strip) {
            return;
        }
        const chip = strip.querySelector<HTMLElement>(`[data-review-index="${active}"]`);
        if (!chip) {
            return;
        }
        const reduce =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const left = chip.offsetLeft - (strip.clientWidth - chip.clientWidth) / 2;
        const nextLeft = Math.max(0, left);
        if (typeof strip.scrollTo === 'function') {
            strip.scrollTo({
                left: nextLeft,
                behavior: reduce ? 'auto' : 'smooth',
            });
        } else {
            strip.scrollLeft = nextLeft;
        }
    }, [active]);

    const go = (delta: number) => {
        setActive((prev) => (prev + delta + reviews.length) % reviews.length);
    };

    const order = [0, 1, 2].map((offset) => reviews[(active + offset) % reviews.length]).filter(Boolean);

    return (
        <div className="ldv-review-suite">
            <div
                className="ldv-review-stack"
                aria-live="polite"
                onTouchStart={(event) => {
                    touchX.current = event.changedTouches[0]?.clientX ?? null;
                }}
                onTouchEnd={(event) => {
                    const start = touchX.current;
                    touchX.current = null;
                    const end = event.changedTouches[0]?.clientX;
                    if (start == null || end == null) {
                        return;
                    }
                    const dx = end - start;
                    if (Math.abs(dx) < 36) {
                        return;
                    }
                    go(dx < 0 ? 1 : -1);
                }}
            >
                {order.map((review, depth) => (
                    <article
                        key={`${review.id}-${depth}`}
                        className={`ldv-review-card depth-${depth}${depth === 0 ? ' is-front' : ''}`}
                        aria-hidden={depth !== 0}
                    >
                        <div className="ldv-review-stars" aria-label={`${review.stars} of 5 stars`}>
                            {starLabel(review.stars)}
                        </div>
                        <p>“{review.body}”</p>
                        <footer>
                            <span className="ldv-mini-ava" aria-hidden="true">
                                {review.initials}
                            </span>
                            <span>{review.name}</span>
                        </footer>
                    </article>
                ))}
            </div>

            <div
                ref={stripRef}
                className="ldv-review-strip"
                role="list"
                aria-label="All sample reviews"
            >
                {/* Duplicate once for smoother wrap feel while auto-advancing */}
                {[...reviews, ...reviews].map((review, index) => {
                    const realIndex = index % reviews.length;
                    return (
                        <button
                            key={`${review.id}-strip-${index}`}
                            type="button"
                            role="listitem"
                            data-review-index={index < reviews.length ? realIndex : undefined}
                            className={`ldv-review-chip${realIndex === active && index < reviews.length ? ' is-on' : ''}`}
                            aria-pressed={realIndex === active && index < reviews.length}
                            onClick={() => setActive(realIndex)}
                        >
                            <span className="ldv-mini-ava" aria-hidden="true">
                                {review.initials}
                            </span>
                            <span className="ldv-review-chip-meta">
                                <strong>{review.name}</strong>
                                <span>{starLabel(review.stars)}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function ListingDetailView({
    listing,
    denial = null,
    correlationId = null,
    booking = null,
}: {
    listing: ListingRecord | null | undefined;
    denial?: DenialState | null;
    correlationId?: string | null;
    booking?: {
        direct_booking_enabled?: boolean;
        can_propose?: boolean;
        requires_auth?: boolean;
        is_owner?: boolean;
        start_url?: string;
    } | null;
}) {
    const [pins, setPins] = useState<Set<string>>(() => new Set());
    const [photoIndex, setPhotoIndex] = useState(0);
    const [actionNote, setActionNote] = useState<string | null>(null);
    const railRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setPins(loadPins());
    }, []);

    useEffect(() => {
        persistPins(pins);
    }, [pins]);

    useEffect(() => {
        setPhotoIndex(0);
        setActionNote(null);
    }, [listing?.id]);

    useEffect(() => {
        const rail = railRef.current;
        if (!rail) {
            return;
        }
        const width = Math.round(rail.getBoundingClientRect().width) || rail.clientWidth || 1;
        const left = photoIndex * width;
        if (typeof rail.scrollTo === 'function') {
            rail.scrollTo({ left, behavior: 'smooth' });
        } else {
            rail.scrollLeft = left;
        }
    }, [photoIndex, listing?.id]);

    const pinned = listing ? pins.has(listing.id) : false;
    const offer = listing ? isOfferListing(listing) : false;
    const primaryCta = listing && isProductListing(listing) ? 'Buy' : 'Book';

    const togglePin = () => {
        if (!listing) {
            return;
        }
        setPins((prev) => {
            const next = new Set(prev);
            if (next.has(listing.id)) {
                next.delete(listing.id);
            } else {
                next.add(listing.id);
            }
            return next;
        });
    };

    useRegisterShellDrawerActions(
        listing ? (
            <div className="sz-switch-actions" role="group" aria-label="Listing actions">
                <button
                    type="button"
                    className={`sz-switch-act sz-switch-act-pin${pinned ? ' is-on' : ''}`}
                    aria-pressed={pinned}
                    aria-label={pinned ? 'Saved to your pins' : 'Pin this listing'}
                    onClick={togglePin}
                >
                    <svg className="ldv-ico" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 17v5M9 3h6l-1 7h3l-5 6-5-6h3L9 3z" />
                    </svg>
                    <span>{pinned ? 'Pinned' : 'Pin'}</span>
                </button>
                <button
                    type="button"
                    className="sz-switch-act sz-switch-act-msg"
                    onClick={() =>
                        setActionNote(
                            'Message opens when the unified inbox is live for this offer — same conversation across in-app, SMS, and Messenger.',
                        )
                    }
                >
                    Message
                </button>
                {offer ? (
                    <button
                        type="button"
                        className="sz-switch-act sz-switch-act-buy"
                        onClick={() => {
                            if (booking?.direct_booking_enabled && booking.start_url) {
                                if (booking.is_owner) {
                                    setActionNote('You cannot book your own listing.');
                                    return;
                                }
                                router.visit(booking.start_url);
                                return;
                            }
                            setActionNote(
                                `${primaryCta} opens when Direct Booking / purchase is capability-true for this ${isProductListing(listing) ? 'product' : 'service'} offer.`,
                            );
                        }}
                    >
                        {primaryCta}
                    </button>
                ) : null}
            </div>
        ) : null,
        [listing?.id, pinned, offer, primaryCta, booking],
    );

    if (!listing) {
        return (
            <div className="ldv">
                <Link href="/browse" className="ldv-back">
                    ← Back to active listings
                </Link>
                <Notice tone="warning" title="Listing unavailable">
                    This listing is not available for public viewing.
                </Notice>
                <div className="ldv-actions">
                    <Link href="/browse" className="sz-btn sz-btn-primary">
                        Back to browse
                    </Link>
                </div>
            </div>
        );
    }

    const meta = categoryMeta(listing);
    const photos = meta.previewPhotos;
    const rating = previewRating(listing);
    const orders = previewOrders(listing);
    const acctRating = providerRating(listing);
    const acctOrders = providerOrders(listing);
    const acctListings = providerListings(listing);
    const meters = previewMeters(listing);
    const steps = meta.workflowSteps;
    const denialRef = denial?.correlationId ?? denial?.correlation_id ?? correlationId;
    const owner = ownerLabel(listing);
    const place = placeLabel(listing, meta.barangayPreview);
    const mapsTarget = listingMapsTarget(listing, place);
    const liveArea = field(listing, 'area', 'locality');
    const placeIsProjected = Boolean(liveArea && liveArea.toLowerCase() !== 'tagudin');
    const listedPrice = formatPrice(listing);
    const capacity = capacityLine(listing);

    return (
        <div className="ldv">
            <Link href="/browse" className="ldv-back">
                ← Back to active listings
            </Link>

            <div className="ldv-grid">
                <div className="ldv-media" data-media-stage title="Preview media until listing photos project">
                    <div
                        ref={railRef}
                        className="ldv-media-rail"
                        data-media-rail
                        tabIndex={0}
                        role="region"
                        aria-label={`Photos for ${listing.title}`}
                        onScroll={(event) => {
                            const rail = event.currentTarget;
                            const width = Math.round(rail.getBoundingClientRect().width) || rail.clientWidth || 1;
                            const next = Math.max(0, Math.min(photos.length - 1, Math.round(rail.scrollLeft / width)));
                            if (next !== photoIndex) {
                                setPhotoIndex(next);
                            }
                        }}
                    >
                        {photos.map((src, index) => (
                            <div className="ldv-media-slide" key={`${listing.id}-photo-${index}`}>
                                <img
                                    src={src}
                                    alt={index === 0 ? listing.title : ''}
                                    aria-hidden={index === 0 ? undefined : true}
                                    loading={index === 0 ? 'eager' : 'lazy'}
                                    decoding="async"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="ldv-media-chips" aria-label="Listing category">
                        <span className="ldv-pill ldv-pill-icon">
                            <span aria-hidden="true">{meta.icon}</span>
                            {meta.label}
                        </span>
                    </div>
                    {photos.length > 1 ? (
                        <div className="ldv-dots-pill" role="tablist" aria-label="Listing photos">
                            {photos.map((_, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className={index === photoIndex ? 'is-on' : undefined}
                                    aria-label={`Show photo ${index + 1} of ${photos.length}`}
                                    aria-selected={index === photoIndex}
                                    onClick={() => setPhotoIndex(index)}
                                />
                            ))}
                        </div>
                    ) : null}
                </div>

                <div className="ldv-copy">
                    <p className="ldv-eyebrow">
                        {listingType(listing)} · {area(listing)}
                    </p>
                    <h1 className="ldv-title">{listing.title}</h1>
                    <p className="ldv-punch">{listing.description?.trim() || 'No description yet.'}</p>

                    <div className="ldv-provider" title="Provider account totals — preview until aggregated stats project from backend">
                        <div className="ldv-ava" aria-hidden="true">
                            {owner.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="ldv-provider-copy">
                            <strong>{owner}</strong>
                            <span>Local provider · Tagudin pilot</span>
                        </div>
                        <dl className="ldv-provider-totals" aria-label="Provider account totals across all listings">
                            <div>
                                <dt>Provider rating</dt>
                                <dd>
                                    {acctRating.toFixed(1)} <span aria-hidden="true">★</span>
                                </dd>
                            </div>
                            <div>
                                <dt>Orders served</dt>
                                <dd>{acctOrders.toLocaleString('en-PH')}</dd>
                            </div>
                            <div>
                                <dt>Active listings</dt>
                                <dd>{acctListings}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="ldv-badges" aria-label="Listing badges">
                        <span className="ldv-badge">{meta.workShapePreview}</span>
                        <span className="ldv-badge ldv-badge-soft">{meta.label}</span>
                        <span className="ldv-badge ldv-badge-soft">New Provider</span>
                        <span className="ldv-badge ldv-badge-soft">Local safety</span>
                        <span
                            className="ldv-badge ldv-badge-ghost"
                            title="Public badges derive from performed verification — not invented here"
                        >
                            Verified provider · later
                        </span>
                    </div>

                    <div className="ldv-place" title="Preview until geo projects from backend">
                        <svg className="ldv-place-ico" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                            <circle cx="12" cy="10" r="2.6" />
                        </svg>
                        <div className="ldv-place-copy">
                            <strong>{place}</strong>
                            <span>
                                {formatDistance(meters)} away · {placeIsProjected ? 'listed area' : 'agreed public point'}
                            </span>
                        </div>
                        <span className="ldv-place-listing" title="This listing's own reviews (separate from provider totals)">
                            {rating.toFixed(1)} ★ · {orders} orders here
                        </span>
                        <a
                            className="ldv-visit"
                            href={mapsDirectionsUrl(mapsTarget)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Visit us — open ${place} in Google Maps`}
                        >
                            Visit us
                        </a>
                    </div>

                    {listedPrice || capacity ? (
                        <div className="ldv-offer" aria-label="Listing offer facts">
                            {listedPrice ? (
                                <div className="ldv-price">
                                    <strong>{listedPrice}</strong>
                                    <small>Listed amount</small>
                                </div>
                            ) : null}
                            {capacity ? (
                                <div className="ldv-avail">
                                    <strong>{capacity}</strong>
                                    <small>Availability</small>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {actionNote ? (
                        <p className="ldv-action-note" role="status">
                            {actionNote}
                        </p>
                    ) : null}
                </div>
            </div>

            <div className="ldv-lower">
                <section className="ldv-section" aria-labelledby="ldv-how-title">
                    <div className="ldv-section-head">
                        <h2 id="ldv-how-title">How this works</h2>
                        <span className="ldv-shape">{meta.workShapePreview}</span>
                    </div>
                    <p className="ldv-section-lede">
                        Provider workflow titles and short descriptions — preview until the Work template projects from
                        the server.
                    </p>
                    <WorkflowSteps steps={steps} />
                </section>

                <section className="ldv-section ldv-section-reviews" aria-labelledby="ldv-reviews-title">
                    <div className="ldv-section-head">
                        <h2 id="ldv-reviews-title">Reviews</h2>
                        <span className="ldv-shape">Sample</span>
                    </div>
                    <p className="ldv-section-lede">
                        Sample suite for layout. Live reviews need completed-work eligibility on the server.
                    </p>
                    <ReviewSuite reviews={SAMPLE_REVIEWS} />
                </section>
            </div>

            <div className="ldv-footer">
                <ProtectedAttempt listingId={listing.id} />

                {denial ? (
                    <section className="ldv-notice" role="alert">
                        <strong>Needs attention</strong>
                        <p>{denial.message}</p>
                        <p>
                            {denial.recovery ?? 'Return to browse or refresh for the latest server state.'}
                        </p>
                        {denialRef ? (
                            <p className="ldv-ref">
                                Reference: <code>{denialRef}</code>
                            </p>
                        ) : null}
                    </section>
                ) : null}

                <p className="ldv-preview-note">
                    Photos, scores, distance, workflow copy, and reviews are UI preview until projected from the server.
                    Buy / Message live in the shell switching drawer for offer listings and stay gated until those capabilities are live.
                </p>
            </div>
        </div>
    );
}

export default ListingDetailView;
