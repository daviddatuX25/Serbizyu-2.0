import { Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { ListingRecord } from '../../types';
import './browse-plp.css';

type ViewMode = 'cards' | 'list';
type SortMode = 'Newest first' | 'Title A–Z' | 'Title Z–A';
type TypeFilter = 'all' | 'service' | 'product';

type CategoryMeta = {
    label: string;
    /** UI-preview place/barangay until locality is projected from backend. */
    barangayPreview: string;
    /** UI-preview fulfillment archetype steps — not live order workflow yet. */
    fulfillmentPreview: string;
    /** Preview media frames until listing photos project from backend. */
    previewPhotos: string[];
};

const CATEGORY_META: Record<string, CategoryMeta> = {
    'greeting-cards': {
        label: 'Greeting cards',
        barangayPreview: 'Tagudin Centro',
        fulfillmentPreview: 'Request · Soft proof · Pickup',
        previewPhotos: ['https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=78', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=78', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=78'],
    },
    repairs: {
        label: 'Repairs',
        barangayPreview: 'Barangay Pudoc West',
        fulfillmentPreview: 'Request · Walk-in · Done',
        previewPhotos: ['https://images.unsplash.com/photo-1581092918056-0c4c5acdfb82?auto=format&fit=crop&w=900&q=78', 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=78'],
    },
    'local-services': {
        label: 'Local services',
        barangayPreview: 'Tagudin Public Market',
        fulfillmentPreview: 'Request · Meet · Hand-off',
        previewPhotos: ['https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=78', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=78', 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=78'],
    },
    'print-assist': {
        label: 'Print assist',
        barangayPreview: 'Tagudin Centro',
        fulfillmentPreview: 'Request · Soft proof · Print',
        previewPhotos: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=78', 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=78'],
    },
    'local-food': {
        label: 'Local food',
        barangayPreview: 'Tagudin Market stall',
        fulfillmentPreview: 'Reserve · Ready · Pickup',
        previewPhotos: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=78', 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=78', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=78'],
    },
    'local-help': {
        label: 'Local help',
        barangayPreview: 'Tagudin Centro',
        fulfillmentPreview: 'Request · Confirm · Meet',
        previewPhotos: ['https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=78', 'https://images.unsplash.com/photo-1581092918056-0c4c5acdfb82?auto=format&fit=crop&w=900&q=78', 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=78'],
    },
};

function categoryMeta(code: string): CategoryMeta {
    return (
        CATEGORY_META[code] ?? {
            label: code.replace(/-/g, ' '),
            barangayPreview: 'Tagudin',
            fulfillmentPreview: 'Request · Confirm · Complete',
            previewPhotos: [
                'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=78',
                'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=78',
            ],
        }
    );
}

type RecSet = { kicker: string; items: string[] };

const PIN_STORAGE_KEY = 'serbizyu.browse.pins';
const LOGO_SRC = '/brand/serbizyu-logo-long.png';
/** Dwell window before hover-expand; pointer must stay within STEADY_PX of the dwell anchor. */
const CARD_DWELL_MS = 1300;
/** Max displacement from the current dwell anchor before the dwell timer resets (px). */
const CARD_DWELL_STEADY_PX = 6;

const REC_SETS: RecSet[] = [
    {
        kicker: 'Top searches today',
        items: ['local help', 'Tagudin service', 'home repair', 'market errand', 'greeting card'],
    },
    {
        kicker: 'Active nearby',
        items: ['Centro walk-in', 'same-day help', 'pickup today', 'print assist'],
    },
    {
        kicker: 'Nearest to you right now',
        items: ['Tagudin Centro', 'market pickup', 'local service', 'soft-copy scan'],
    },
    {
        kicker: 'You might want',
        items: ['weekend help', 'greeting card layout', 'flyer assist', 'household fix'],
    },
];

const Ico = {
    filter: (
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
    ),
    sort: (
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 6v12M8 18l-3-3M8 18l3-3M16 18V6M16 6l-3 3M16 6l3 3" />
        </svg>
    ),
    cards: (
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" />
        </svg>
    ),
    list: (
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
        </svg>
    ),
    pin: (
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 17v5M9 3h6l-1 7h3l-5 6-5-6h3L9 3z" />
        </svg>
    ),
    open: (
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
        </svg>
    ),
    star: (
        <svg className="ico ico-star" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 3.6 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 18.5l.9-5.4L4.2 9.3l5.4-.8z" />
        </svg>
    ),
    pinMap: (
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
            <circle cx="12" cy="11" r="2.2" />
        </svg>
    ),
    person: (
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5.5 19.2c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5" />
        </svg>
    ),
    check: (
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m8.5 12 2.4 2.4 4.6-4.8" />
            <circle cx="12" cy="12" r="8.5" />
        </svg>
    ),
    menu: (
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
    ),
    close: (
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
        </svg>
    ),
};

function field(listing: ListingRecord, ...keys: Array<keyof ListingRecord | string>): string {
    for (const key of keys) {
        const value = (listing as Record<string, unknown>)[key as string];
        if (typeof value === 'string' && value.trim() !== '') {
            return value.trim();
        }
    }
    return '';
}

function listingType(listing: ListingRecord): string {
    return field(listing, 'listingType', 'listing_type') || 'service';
}

function listingArea(listing: ListingRecord): string {
    return field(listing, 'area', 'locality') || 'Tagudin';
}

function listingCategory(listing: ListingRecord): string {
    return field(listing, 'categoryCode', 'category_code') || 'local-services';
}

function listingCategoryLabel(listing: ListingRecord): string {
    return categoryMeta(listingCategory(listing)).label;
}

function listingBarangay(listing: ListingRecord): string {
    return categoryMeta(listingCategory(listing)).barangayPreview;
}

function listingFulfillmentPreview(listing: ListingRecord): string {
    return categoryMeta(listingCategory(listing)).fulfillmentPreview;
}

function ownerLabel(listing: ListingRecord): string {
    return (
        field(listing, 'ownerName', 'owner_name') ||
        listing.owner?.displayName ||
        listing.owner?.display_name ||
        ''
    );
}

function initial(listing: ListingRecord): string {
    const title = listing.title?.trim() || 'S';
    return title.charAt(0).toUpperCase();
}

/** Category + barangay for compact contexts (list/pin). */
function subtitle(listing: ListingRecord): string {
    return `${listingCategoryLabel(listing)} · ${listingBarangay(listing)}`;
}

function punchline(listing: ListingRecord): string {
    const raw = listing.description?.trim() || '';
    if (!raw) {
        return listingFulfillmentPreview(listing);
    }
    const first = raw.split(/(?<=[.!?])\s+/)[0] ?? raw;
    return first.length > 110 ? `${first.slice(0, 107).trim()}…` : first;
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

function detailLine(listing: ListingRecord): string {
    const parts = [
        listingCategoryLabel(listing),
        listingType(listing),
        listingBarangay(listing),
        listingFulfillmentPreview(listing),
        ownerLabel(listing) || null,
    ].filter(Boolean);
    return parts.join(' · ');
}

function hashSeed(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

/** Preview score until completed-work ratings project from backend. */
function previewRating(listing: ListingRecord): number {
    const seed = hashSeed(listing.id);
    return Math.round((3.3 + (seed % 17) / 10) * 10) / 10;
}

/** Preview order volume until fulfillment counts project from backend. */
function previewOrders(listing: ListingRecord): number {
    return 8 + (hashSeed(`${listing.id}:orders`) % 220);
}

/** Preview distance until buyer geo + listing place project from backend. */
function previewDistanceMeters(listing: ListingRecord): number {
    return 120 + (hashSeed(`${listing.id}:distance`) % 2800);
}

function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${meters} m`;
    }
    const km = meters / 1000;
    return `${km >= 10 ? km.toFixed(0) : km.toFixed(1)} km`;
}

function formatOrders(count: number): string {
    return `${count.toLocaleString('en-PH')} ${count === 1 ? 'order' : 'orders'}`;
}

function listingPreviewPhotos(listing: ListingRecord): string[] {
    return categoryMeta(listingCategory(listing)).previewPhotos;
}

function TwinMeta({ listing }: { listing: ListingRecord }) {
    const rating = previewRating(listing);
    const orders = previewOrders(listing);
    const meters = previewDistanceMeters(listing);
    const place = listingBarangay(listing);

    return (
        <div className="twin-meta" title="Preview until ratings, orders, and geo project from backend">
            <span className="meta-rating">
                <span className="star-ico" aria-hidden="true">
                    {Ico.star}
                </span>
                <strong className="score">{rating.toFixed(1)}</strong>
                <span className="meta-sub">{formatOrders(orders)}</span>
            </span>
            <span className="meta-place">
                <span className="place-ico" aria-hidden="true">
                    {Ico.pinMap}
                </span>
                <strong className="place">{place}</strong>
                <span className="meta-sub">{formatDistance(meters)}</span>
            </span>
        </div>
    );
}

function MediaRail({
    listing,
    pinned,
    onTogglePin,
}: {
    listing: ListingRecord;
    pinned: boolean;
    onTogglePin: () => void;
}) {
    const stageRef = useRef<HTMLDivElement>(null);
    const railRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef(0);
    const expandedRef = useRef(false);
    const snapRef = useRef<(index: number, behavior?: ScrollBehavior) => void>(() => {});
    const photos = listingPreviewPhotos(listing);
    const [active, setActive] = useState(0);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        activeRef.current = active;
    }, [active]);

    useEffect(() => {
        expandedRef.current = expanded;
    }, [expanded]);

    useEffect(() => {
        const stage = stageRef.current;
        const card = stage?.closest('.dwell-card');
        if (!card) {
            return;
        }
        const syncExpanded = () => {
            const next = card.classList.contains('is-expanded');
            setExpanded(next);
        };
        syncExpanded();
        const mo = new MutationObserver(syncExpanded);
        mo.observe(card, { attributes: true, attributeFilter: ['class'] });
        return () => mo.disconnect();
    }, []);

    useEffect(() => {
        const rail = railRef.current;
        if (!rail) {
            return;
        }

        const snapTo = (index: number, behavior: ScrollBehavior = 'auto') => {
            const width = Math.round(rail.getBoundingClientRect().width) || rail.clientWidth || 1;
            const clamped = Math.max(0, Math.min(photos.length - 1, index));
            const left = clamped * width;
            if (typeof rail.scrollTo === 'function') {
                rail.scrollTo({ left, behavior });
            } else {
                rail.scrollLeft = left;
            }
            activeRef.current = clamped;
            setActive(clamped);
        };
        snapRef.current = snapTo;

        let frame = 0;
        const onScroll = () => {
            window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(() => {
                const width = Math.round(rail.getBoundingClientRect().width) || rail.clientWidth || 1;
                const index = Math.round(rail.scrollLeft / width);
                const next = Math.max(0, Math.min(photos.length - 1, index));
                activeRef.current = next;
                setActive(next);
            });
        };

        const onResize = () => {
            window.requestAnimationFrame(() => {
                snapTo(activeRef.current, 'auto');
                window.requestAnimationFrame(() => snapTo(activeRef.current, 'auto'));
            });
        };

        rail.addEventListener('scroll', onScroll, { passive: true });
        const ro =
            typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
        ro?.observe(rail);
        onResize();

        return () => {
            window.cancelAnimationFrame(frame);
            rail.removeEventListener('scroll', onScroll);
            ro?.disconnect();
        };
    }, [photos.length]);

    /** Expanded: auto-advance photos (video play later when media schema exists). Collapsed: reset to first. */
    useEffect(() => {
        const reduceMotion = matchesMedia('(prefers-reduced-motion: reduce)', false);
        if (!expanded) {
            snapRef.current(0, 'auto');
            return;
        }
        if (reduceMotion || photos.length < 2) {
            return;
        }
        const timer = window.setInterval(() => {
            const next = (activeRef.current + 1) % photos.length;
            snapRef.current(next, 'smooth');
        }, 3000);
        return () => window.clearInterval(timer);
    }, [expanded, photos.length]);

    const goTo = (index: number) => {
        snapRef.current(
            index,
            matchesMedia('(prefers-reduced-motion: reduce)', false) ? 'auto' : 'smooth',
        );
    };

    const forceExpand = () => {
        const card = stageRef.current?.closest('.dwell-card');
        if (!card) {
            return;
        }
        card.dispatchEvent(new CustomEvent('serbizyu:force-expand', { bubbles: false }));
    };

    const forceCollapse = () => {
        const card = stageRef.current?.closest('.dwell-card');
        if (!card) {
            return;
        }
        card.dispatchEvent(new CustomEvent('serbizyu:force-collapse', { bubbles: false }));
    };

    const toggleExpand = () => {
        const card = stageRef.current?.closest('.dwell-card');
        if (!card) {
            return;
        }
        if (card.classList.contains('is-expanded')) {
            forceCollapse();
        } else {
            forceExpand();
        }
    };

    const pointerOrigin = useRef<{ x: number; y: number } | null>(null);

    return (
        <div
            ref={stageRef}
            className="ph media-stage"
            data-media-stage
            title="Preview media until listing photos project"
        >
            <div
                ref={railRef}
                className="media-rail"
                data-media-rail
                tabIndex={0}
                role="region"
                aria-label={`Photos for ${listing.title}`}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    pointerOrigin.current = { x: e.clientX, y: e.clientY };
                }}
                onPointerUp={(e) => {
                    e.stopPropagation();
                    const origin = pointerOrigin.current;
                    pointerOrigin.current = null;
                    if (!origin) {
                        return;
                    }
                    const dx = Math.abs(e.clientX - origin.x);
                    const dy = Math.abs(e.clientY - origin.y);
                    // Treat as a tap (not a swipe) to toggle expand.
                    if (dx < 10 && dy < 10) {
                        toggleExpand();
                    }
                }}
                onPointerCancel={() => {
                    pointerOrigin.current = null;
                }}
                onKeyDown={(e) => e.stopPropagation()}
            >
                {photos.map((src, index) => (
                    <div className="media-slide" key={`${listing.id}-${index}`}>
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
            <span className="tag tag-category">{listingCategoryLabel(listing)}</span>
            <button
                type="button"
                className={`pin-btn${pinned ? ' is-on' : ''}`}
                aria-pressed={pinned}
                aria-label={pinned ? 'Unpin listing' : 'Pin listing'}
                onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin();
                }}
            >
                {Ico.pin}
            </button>
            {expanded && photos.length > 1 ? (
                <div className="media-dots" data-media-dots role="group" aria-label="Listing photos">
                    {photos.map((_, index) => (
                        <button
                            key={`${listing.id}-dot-${index}`}
                            type="button"
                            className={`media-dot${index === active ? ' is-on' : ''}`}
                            aria-label={`Show photo ${index + 1} of ${photos.length}`}
                            aria-current={index === active ? 'true' : undefined}
                            onClick={(e) => {
                                e.stopPropagation();
                                forceExpand();
                                goTo(index);
                            }}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function CardBody({ listing }: { listing: ListingRecord }) {
    const name = ownerLabel(listing) || 'Local provider';

    return (
        <div className="bd split-copy">
            <div className="split-offer">
                <h3>{listing.title}</h3>
                <p className="punchline">{punchline(listing)}</p>
                <p className="owner-copy">By {name}</p>
            </div>
            <TwinMeta listing={listing} />
            <div className="row">
                <span className="meta-line">{formatPrice(listing) ?? '—'}</span>
                <span className="open-hint" aria-hidden="true">
                    {Ico.open}
                </span>
            </div>
        </div>
    );
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
        // Ignore quota / private mode failures — pins stay in-session.
    }
}

function matchesMedia(query: string, fallback = true): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return fallback;
    }
    return window.matchMedia(query).matches;
}

function useIsDesktop(): boolean {
    const [desktop, setDesktop] = useState(() => matchesMedia('(min-width: 960px)', true));

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') {
            return;
        }
        const mq = window.matchMedia('(min-width: 960px)');
        const onChange = () => setDesktop(mq.matches);
        onChange();
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return desktop;
}

export function BrowsePlp({ listings }: { listings: ListingRecord[] }) {
    const rootRef = useRef<HTMLElement>(null);
    const desktop = useIsDesktop();
    const [search, setSearch] = useState('');
    const [view, setView] = useState<ViewMode>('cards');
    const [sort, setSort] = useState<SortMode>('Newest first');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [tagudinOnly, setTagudinOnly] = useState(true);
    const [navOpen, setNavOpen] = useState(false);
    const [stuck, setStuck] = useState(false);
    const [compact, setCompact] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);
    const [pinOpen, setPinOpen] = useState(false);
    const [pins, setPins] = useState<Set<string>>(() => new Set());
    const [recIndex, setRecIndex] = useState(0);
    const [recPaused, setRecPaused] = useState(false);
    const [activeRec, setActiveRec] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const hoverTimersRef = useRef<Map<string, number>>(new Map());
    const hoverAnchorRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    useEffect(() => {
        setPins(loadPins());
    }, []);

    useEffect(() => {
        persistPins(pins);
    }, [pins]);

    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            setStuck(y > 8);
            setCompact(y > 48);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (!sortOpen) {
            return;
        }
        const close = () => setSortOpen(false);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [sortOpen]);

    useEffect(() => {
        if (recPaused) {
            return;
        }
        const reduce = matchesMedia('(prefers-reduced-motion: reduce)', false);
        if (reduce) {
            return;
        }
        const timer = window.setInterval(() => {
            setRecIndex((i) => (i + 1) % REC_SETS.length);
        }, 11000);
        return () => window.clearInterval(timer);
    }, [recPaused]);

    const categoryOptions = useMemo(() => {
        const map = new Map<string, string>();
        for (const listing of listings) {
            const code = listingCategory(listing);
            map.set(code, listingCategoryLabel(listing));
        }
        return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    }, [listings]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let rows = [...listings];

        if (tagudinOnly) {
            rows = rows.filter((l) => listingArea(l).toLowerCase().includes('tagudin'));
        }
        if (typeFilter !== 'all') {
            rows = rows.filter((l) => listingType(l).toLowerCase() === typeFilter);
        }
        if (categoryFilter !== 'all') {
            rows = rows.filter((l) => listingCategory(l) === categoryFilter);
        }
        if (q) {
            rows = rows.filter((l) => {
                const hay = [
                    l.title,
                    l.description,
                    listingType(l),
                    listingArea(l),
                    listingCategory(l),
                    listingCategoryLabel(l),
                    listingBarangay(l),
                    ownerLabel(l),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return hay.includes(q);
            });
        }

        if (sort === 'Title A–Z') {
            rows.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sort === 'Title Z–A') {
            rows.sort((a, b) => b.title.localeCompare(a.title));
        }
        if (sort === 'Newest first') {
            rows = [...rows].reverse();
        }

        return rows;
    }, [listings, search, sort, typeFilter, categoryFilter, tagudinOnly]);

    /** 2-col: if the expanded card is the right cell, lead with it so the left neighbor drops below. */
    const gridListings = useMemo(() => {
        if (view !== 'cards' || !expandedId) {
            return filtered;
        }
        const index = filtered.findIndex((listing) => listing.id === expandedId);
        if (index < 1 || index % 2 !== 1) {
            return filtered;
        }
        const next = [...filtered];
        const [right] = next.splice(index, 1);
        next.splice(index - 1, 0, right);
        return next;
    }, [filtered, expandedId, view]);

    useEffect(() => {
        if (expandedId && !filtered.some((listing) => listing.id === expandedId)) {
            setExpandedId(null);
        }
    }, [filtered, expandedId]);

    const pinnedListings = listings.filter((l) => pins.has(l.id));
    const recSet = REC_SETS[recIndex];

    /**
     * Dwell expand:
     * - Fine pointer (desktop/mouse): steady hover 1.3s expands (1-col and 2-col).
     * - Single-column touch: scroll settle 1.3s + ≥58% full-card intersection.
     * - 2-col (≥900px): no IO expand; expanded card spans full row; stays open until
     *   click outside that listing (or onto another listing).
     */
    useEffect(() => {
        const root = rootRef.current;
        if (!root || typeof IntersectionObserver === 'undefined') {
            return;
        }

        const SCROLL_SETTLE_MS = 1300;
        const CARD_INTERSECT_MIN = 0.58;
        const hoverMq =
            typeof window.matchMedia === 'function' ? window.matchMedia('(hover: hover)') : null;
        const multiColMq =
            typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 900px)') : null;
        const reduceMotion = matchesMedia('(prefers-reduced-motion: reduce)', false);
        const cards = [...root.querySelectorAll<HTMLElement>('.ptile.dwell-card')];
        const timers = new WeakMap<HTMLElement, { hover?: number; collapse?: number }>();
        let scrollSettled = true;
        let scrollSettleTimer = 0;
        const ratios = new WeakMap<HTMLElement, number>();

        // Prefer hover media, but fall back when the UA lies (hover:none on desktop).
        const canHoverExpand = () => {
            if (reduceMotion) {
                return false;
            }
            if (hoverMq?.matches) {
                return true;
            }
            // Wide layout + fine pointer OR any mouseenter path available.
            return matchesMedia('(pointer: fine)', false) || matchesMedia('(min-width: 900px)', false);
        };
        const multiCol = () => multiColMq?.matches ?? false;
        /** IO/scroll expand is single-column touch only. */
        const allowIoExpand = () => !canHoverExpand() && !multiCol() && !reduceMotion;
        /** 2-col: keep expanded until explicit click-away (not mouseleave). */
        const stickyExpand = () => multiCol();

        const cardId = (card: HTMLElement) => card.dataset.id ?? null;

        const collapseNow = (card: HTMLElement) => {
            const state = timers.get(card) ?? {};
            window.clearTimeout(state.hover);
            window.clearTimeout(state.collapse);
            timers.set(card, state);
            const id = cardId(card);
            if (id) {
                setExpandedId((current) => (current === id ? null : current));
            }
        };

        const collapseAll = () => {
            cards.forEach((card) => {
                const state = timers.get(card) ?? {};
                window.clearTimeout(state.hover);
                window.clearTimeout(state.collapse);
                timers.set(card, state);
            });
            setExpandedId(null);
        };

        const expand = (card: HTMLElement) => {
            if (reduceMotion) {
                return;
            }
            const id = cardId(card);
            if (!id) {
                return;
            }
            cards.forEach((other) => {
                if (other === card) {
                    return;
                }
                const state = timers.get(other) ?? {};
                window.clearTimeout(state.hover);
                window.clearTimeout(state.collapse);
                timers.set(other, state);
            });
            const state = timers.get(card) ?? {};
            window.clearTimeout(state.collapse);
            timers.set(card, state);
            setExpandedId(id);
        };

        const collapse = (card: HTMLElement, delay = 160) => {
            const state = timers.get(card) ?? {};
            window.clearTimeout(state.hover);
            window.clearTimeout(state.collapse);
            const id = cardId(card);
            state.collapse = window.setTimeout(() => {
                if (id) {
                    setExpandedId((current) => (current === id ? null : current));
                }
            }, delay);
            timers.set(card, state);
        };

        const mostlyVisible = (card: HTMLElement) => {
            const rect = card.getBoundingClientRect();
            const viewH = window.innerHeight || 1;
            const visible = Math.min(rect.bottom, viewH) - Math.max(rect.top, 0);
            if (visible <= 0 || rect.height <= 0) {
                return false;
            }
            return visible / rect.height >= CARD_INTERSECT_MIN;
        };

        const pickBestCard = (): HTMLElement | null => {
            let best: HTMLElement | null = null;
            let bestScore = Number.NEGATIVE_INFINITY;
            const viewMid = (window.innerHeight || 0) / 2;
            for (const card of cards) {
                const ratio = ratios.get(card) ?? 0;
                if (ratio < CARD_INTERSECT_MIN || !mostlyVisible(card)) {
                    continue;
                }
                const rect = card.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                const score = ratio * 10000 - Math.abs(mid - viewMid);
                if (score > bestScore) {
                    bestScore = score;
                    best = card;
                }
            }
            return best;
        };

        const onForceExpand = (event: Event) => {
            const card = event.currentTarget as HTMLElement;
            const state = timers.get(card) ?? {};
            window.clearTimeout(state.hover);
            window.clearTimeout(state.collapse);
            timers.set(card, state);
            expand(card);
        };

        const onForceCollapse = (event: Event) => {
            const card = event.currentTarget as HTMLElement;
            collapseNow(card);
        };

        const onDocPointerDown = (event: Event) => {
            if (!stickyExpand()) {
                return;
            }
            // Query live DOM — reorder on right-cell expand moves nodes.
            const expanded = root.querySelector<HTMLElement>('.ptile.dwell-card.is-expanded');
            if (!expanded) {
                return;
            }
            const target = event.target;
            if (!(target instanceof Node)) {
                return;
            }
            // Click stayed inside the expanded listing — keep it open.
            if (expanded.contains(target)) {
                return;
            }
            // Sheets/menus live outside the card; don't collapse for those.
            if (target instanceof Element && target.closest('.sheet, .sheet-backdrop, .sort-menu')) {
                return;
            }
            collapseNow(expanded);
        };

        cards.forEach((card) => {
            timers.set(card, {});
            ratios.set(card, 0);
            card.addEventListener('serbizyu:force-expand', onForceExpand);
            card.addEventListener('serbizyu:force-collapse', onForceCollapse);
        });

        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    ratios.set(entry.target as HTMLElement, entry.intersectionRatio);
                }
                if (!allowIoExpand() || !scrollSettled) {
                    return;
                }
                const best = pickBestCard();
                if (best) {
                    expand(best);
                } else {
                    cards.forEach((card) => {
                        if ((ratios.get(card) ?? 0) < CARD_INTERSECT_MIN * 0.75) {
                            collapse(card, 140);
                        }
                    });
                }
            },
            {
                root: null,
                rootMargin: '-8% 0px -8% 0px',
                threshold: [0, 0.25, 0.4, 0.5, 0.58, 0.7, 0.85, 1],
            },
        );
        cards.forEach((card) => io.observe(card));

        const onScroll = () => {
            if (!allowIoExpand()) {
                return;
            }
            scrollSettled = false;
            window.clearTimeout(scrollSettleTimer);
            cards.forEach((card) => collapse(card, 100));
            scrollSettleTimer = window.setTimeout(() => {
                scrollSettled = true;
                if (!allowIoExpand()) {
                    return;
                }
                const best = pickBestCard();
                if (best) {
                    expand(best);
                }
            }, SCROLL_SETTLE_MS);
        };

        const onMultiColChange = () => {
            if (!multiCol()) {
                return;
            }
            // Entering 2-col: drop any IO-driven expand; hover + click-away remain.
            window.clearTimeout(scrollSettleTimer);
            scrollSettled = true;
            collapseAll();
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('pointerdown', onDocPointerDown, true);
        multiColMq?.addEventListener('change', onMultiColChange);

        return () => {
            window.clearTimeout(scrollSettleTimer);
            window.removeEventListener('scroll', onScroll);
            document.removeEventListener('pointerdown', onDocPointerDown, true);
            multiColMq?.removeEventListener('change', onMultiColChange);
            io.disconnect();
            cards.forEach((card) => {
                card.removeEventListener('serbizyu:force-expand', onForceExpand);
                card.removeEventListener('serbizyu:force-collapse', onForceCollapse);
                const state = timers.get(card);
                window.clearTimeout(state?.hover);
                window.clearTimeout(state?.collapse);
            });
            // Do not clear expandedId here — filtered/view churn (and Strict Mode)
            // would wipe a steady hover expand. Invalid ids are cleared separately.
        };
    }, [filtered, view]);

    const openListing = (id: string) => {
        router.visit(`/listings/${id}`);
    };

    const clearHoverTimer = (id: string) => {
        const timer = hoverTimersRef.current.get(id);
        if (timer) {
            window.clearTimeout(timer);
            hoverTimersRef.current.delete(id);
        }
    };

    const clearHoverTracking = (id: string) => {
        clearHoverTimer(id);
        hoverAnchorRef.current.delete(id);
    };

    const armDwellTimer = (listingId: string) => {
        clearHoverTimer(listingId);
        const timer = window.setTimeout(() => {
            hoverTimersRef.current.delete(listingId);
            hoverAnchorRef.current.delete(listingId);
            setExpandedId(listingId);
        }, CARD_DWELL_MS);
        hoverTimersRef.current.set(listingId, timer);
    };

    const onCardHoverStart = (listingId: string, event: MouseEvent<HTMLElement>) => {
        if (matchesMedia('(prefers-reduced-motion: reduce)', false)) {
            return;
        }
        // Trust mouseenter itself. Do not gate on (hover: hover) — many desktop
        // environments (touch laptops, embedded browsers) report hover:none and
        // would permanently disable expand.
        // Steady-cursor dwell: expand only if the pointer stays near this anchor.
        hoverAnchorRef.current.set(listingId, { x: event.clientX, y: event.clientY });
        armDwellTimer(listingId);
    };

    const onCardPointerMove = (listingId: string, event: PointerEvent<HTMLElement>) => {
        if (event.pointerType && event.pointerType !== 'mouse') {
            return;
        }
        const anchor = hoverAnchorRef.current.get(listingId);
        if (!anchor) {
            return;
        }
        const dx = event.clientX - anchor.x;
        const dy = event.clientY - anchor.y;
        if (Math.hypot(dx, dy) <= CARD_DWELL_STEADY_PX) {
            return;
        }
        // Movement broke the dwell — re-anchor and restart the timer.
        hoverAnchorRef.current.set(listingId, { x: event.clientX, y: event.clientY });
        armDwellTimer(listingId);
    };

    const onCardHoverEnd = (listingId: string) => {
        clearHoverTracking(listingId);
        // 2-col sticky expand: keep open until click-away.
        if (matchesMedia('(min-width: 900px)', false)) {
            return;
        }
        window.setTimeout(() => {
            setExpandedId((current) => (current === listingId ? null : current));
        }, 180);
    };

    const onCardActivate = (listing: ListingRecord) => {
        openListing(listing.id);
    };

    const togglePin = (id: string) => {
        setPins((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const setViewMode = (mode: ViewMode) => {
        setView(mode);
        if (desktop === false) {
            setNavOpen(false);
        }
    };

    const applyRec = (item: string) => {
        setActiveRec(item);
        setSearch(item);
    };

    const rootClass = [
        'sz-browse-plp',
        `view-${view}`,
        stuck ? 'is-stuck-host' : '',
        compact ? 'chrome-compact' : '',
        navOpen ? 'nav-open' : '',
        recPaused ? '' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <section ref={rootRef} className={rootClass} aria-labelledby="browse-title">
            <div className={`stickybar${stuck ? ' is-stuck' : ''}`}>
                <div className="sticky-inner">
                    <div className="nav-brand sz-secondary-logo-slot">
                        <Link className="brand-mark" href="/" aria-label="Serbizyu home">
                            <img src={LOGO_SRC} alt="Serbizyu" width={184} height={51} decoding="async" />
                        </Link>
                    </div>

                    <div className="nav-panel" id="browse-nav-panel">
                        <div className="chrome-bar" aria-label="Browse controls">
                            <input
                                className="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search need"
                                placeholder="Search active listings"
                            />
                            <button
                                type="button"
                                className={`btn-tool${filterOpen ? ' is-on' : ''}`}
                                onClick={() => setFilterOpen(true)}
                            >
                                {Ico.filter}
                                <span>Filter</span>
                            </button>
                            <button
                                type="button"
                                className="btn-tool"
                                aria-expanded={sortOpen}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSortOpen((v) => !v);
                                }}
                            >
                                {Ico.sort}
                                <span>Sort</span>
                            </button>
                            <div className="view-seg" role="group" aria-label="Browse layout">
                                <button
                                    type="button"
                                    className={`seg${view === 'cards' ? ' is-on' : ''}`}
                                    aria-pressed={view === 'cards'}
                                    title="Cards"
                                    onClick={() => setViewMode('cards')}
                                >
                                    {Ico.cards}
                                    <span>Cards</span>
                                </button>
                                <button
                                    type="button"
                                    className={`seg${view === 'list' ? ' is-on' : ''}`}
                                    aria-pressed={view === 'list'}
                                    title="List"
                                    onClick={() => setViewMode('list')}
                                >
                                    {Ico.list}
                                    <span>List</span>
                                </button>
                            </div>
                            <span className="tools-meta">
                                <strong>{filtered.length}</strong> · <span>{sort.replace(' first', '')}</span>
                            </span>
                            {sortOpen ? (
                                <div className="sort-menu is-open" role="menu">
                                    {(['Newest first', 'Title A–Z', 'Title Z–A'] as SortMode[]).map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            className={sort === option ? 'is-on' : ''}
                                            onClick={() => {
                                                setSort(option);
                                                setSortOpen(false);
                                            }}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="nav-end">
                        <button
                            type="button"
                            className="pin-tray-launch"
                            aria-expanded={pinOpen}
                            title="Pinned listings"
                            onClick={() => setPinOpen(true)}
                        >
                            {Ico.pin}
                            <span className="pin-label">
                                <span>{pins.size}</span> pinned
                            </span>
                        </button>
                        <button
                            type="button"
                            className="nav-toggle"
                            aria-expanded={navOpen}
                            aria-controls="browse-nav-panel"
                            aria-label={navOpen ? 'Close search and filters' : 'Open search and filters'}
                            onClick={() => setNavOpen((v) => !v)}
                        >
                            <span className="nav-toggle-open" aria-hidden="true">
                                {Ico.menu}
                            </span>
                            <span className="nav-toggle-close" aria-hidden="true">
                                {Ico.close}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <div
                className={`rec-rail${recPaused ? ' is-paused' : ''}`}
                aria-live="polite"
                onMouseEnter={() => setRecPaused(true)}
                onMouseLeave={() => setRecPaused(false)}
                onFocusCapture={() => setRecPaused(true)}
                onBlurCapture={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        setRecPaused(false);
                    }
                }}
            >
                <div className="rec-head">
                    <span className="rec-kicker">{recSet.kicker}</span>
                    <div className="rec-dots" aria-hidden="true">
                        {REC_SETS.map((_, n) => (
                            <button
                                key={REC_SETS[n].kicker}
                                type="button"
                                className={`dot${n === recIndex ? ' is-on' : ''}`}
                                aria-label={`Show ${REC_SETS[n].kicker}`}
                                onClick={() => setRecIndex(n)}
                            />
                        ))}
                    </div>
                </div>
                <div className="rec-marquee" aria-label={recSet.kicker}>
                    <div className="rec-track">
                        <div className="rec-strip">
                            {recSet.items.map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    className={`chip rec${activeRec === item ? ' is-on' : ''}`}
                                    onClick={() => applyRec(item)}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="browse-body">
                <div className="results">
                    <header className="browse-intro">
                        <p className="eyebrow">Buyer view · public supply</p>
                        <h1 id="browse-title">Browse active services in Tagudin</h1>
                        <p className="muted">
                            Only server-approved active listings appear here. Drafts and pending review stay private.
                        </p>
                    </header>


                    {filtered.length === 0 ? (
                        <div className="empty-panel" role="status">
                            <strong>No active public listings match.</strong>
                            <p className="muted" style={{ marginTop: '0.35rem' }}>
                                Clear search or filters, or return after review approval publishes more supply.
                            </p>
                        </div>
                    ) : view === 'list' ? (
                            <div className="plist">
                                {filtered.map((listing) => (
                                    <article
                                        key={listing.id}
                                        className="prow"
                                        aria-label={listing.title}
                                        data-id={listing.id}
                                        role="link"
                                        tabIndex={0}
                                        onClick={() => onCardActivate(listing)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onCardActivate(listing);
                                            }
                                        }}
                                    >
                                        <div className="th">
                                            <div className="ph-fallback" aria-hidden="true">
                                                {initial(listing)}
                                            </div>
                                        </div>
                                        <div>
                                            <h3>{listing.title}</h3>
                                            <p>{subtitle(listing)}</p>
                                            <p className="punchline">{punchline(listing)}</p>
                                            <p className="owner-copy">By {ownerLabel(listing) || 'Local provider'}</p>
                                            <TwinMeta listing={listing} />
                                        </div>
                                        <div className="end">
                                            <span className="meta-line">{formatPrice(listing) ?? '—'}</span>
                                            <button
                                                type="button"
                                                className={`pin-btn text${pins.has(listing.id) ? ' is-on' : ''}`}
                                                aria-pressed={pins.has(listing.id)}
                                                aria-label={pins.has(listing.id) ? 'Unpin listing' : 'Pin listing'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    togglePin(listing.id);
                                                }}
                                            >
                                                {Ico.pin}
                                                <span>Pin</span>
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                    ) : (
                            <div className="pgrid cols-4">
                                {gridListings.map((listing) => (
                                    <article
                                        key={listing.id}
                                        className={`ptile dwell-card${expandedId === listing.id ? ' is-expanded' : ''}`}
                                        aria-label={listing.title}
                                        data-id={listing.id}
                                        role="link"
                                        tabIndex={0}
                                        onMouseEnter={(e) => onCardHoverStart(listing.id, e)}
                                        onPointerMove={(e) => onCardPointerMove(listing.id, e)}
                                        onMouseLeave={() => onCardHoverEnd(listing.id)}
                                        onClick={() => onCardActivate(listing)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onCardActivate(listing);
                                            }
                                        }}
                                    >
                                        <MediaRail
                                            listing={listing}
                                            pinned={pins.has(listing.id)}
                                            onTogglePin={() => togglePin(listing.id)}
                                        />
                                        <CardBody listing={listing} />
                                    </article>
                                ))}
                            </div>
                    )}
                </div>
            </div>

            {filterOpen ? (
                <>
                    <div className="sheet-backdrop is-open" onClick={() => setFilterOpen(false)} aria-hidden="true" />
                    <div className="sheet is-open" role="dialog" aria-label="Filters" aria-modal="true">
                        <h2>Filters</h2>
                        <div className="group">
                            <strong>Listing type</strong>
                            <div className="chips">
                                {(
                                    [
                                        ['all', 'All'],
                                        ['service', 'Service'],
                                        ['product', 'Product'],
                                    ] as const
                                ).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={`chip${typeFilter === value ? ' is-on' : ''}`}
                                        onClick={() => setTypeFilter(value)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="group">
                            <strong>Category</strong>
                            <div className="chips">
                                <button
                                    type="button"
                                    className={`chip${categoryFilter === 'all' ? ' is-on' : ''}`}
                                    onClick={() => setCategoryFilter('all')}
                                >
                                    All categories
                                </button>
                                {categoryOptions.map(([code, label]) => (
                                    <button
                                        key={code}
                                        type="button"
                                        data-category={code}
                                        className={`chip${categoryFilter === code ? ' is-on' : ''}`}
                                        onClick={() => setCategoryFilter(code)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="group">
                            <strong>Area</strong>
                            <div className="chips">
                                <button
                                    type="button"
                                    className={`chip${tagudinOnly ? ' is-on' : ''}`}
                                    onClick={() => setTagudinOnly(true)}
                                >
                                    Tagudin
                                </button>
                                <button
                                    type="button"
                                    className={`chip${!tagudinOnly ? ' is-on' : ''}`}
                                    onClick={() => setTagudinOnly(false)}
                                >
                                    All areas
                                </button>
                            </div>
                        </div>
                        <div className="actions">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => {
                                    setTypeFilter('all');
                                    setCategoryFilter('all');
                                    setTagudinOnly(true);
                                }}
                            >
                                Reset
                            </button>
                            <button type="button" className="btn btn-primary" onClick={() => setFilterOpen(false)}>
                                Apply filters
                            </button>
                        </div>
                    </div>
                </>
            ) : null}

            {pinOpen ? (
                <>
                    <div className="sheet-backdrop is-open" onClick={() => setPinOpen(false)} aria-hidden="true" />
                    <div className="sheet pin-sheet is-open" role="dialog" aria-label="Pinned listings" aria-modal="true">
                        <h2>Pinned listings</h2>
                        <p className="muted" style={{ marginTop: '-0.35rem' }}>
                            Local shortlist while you browse. Not a cart — no checkout implied.
                        </p>
                        <div className="pin-list">
                            {pinnedListings.length === 0 ? (
                                <p className="muted">No pins yet. Pin listings from the grid or list.</p>
                            ) : (
                                pinnedListings.map((listing) => (
                                    <div key={listing.id} className="pin-row">
                                        <div
                                            className="ph-fallback"
                                            aria-hidden="true"
                                            style={{ width: '3.2rem', height: '3.2rem', borderRadius: 8 }}
                                        >
                                            {initial(listing)}
                                        </div>
                                        <div>
                                            <strong>{listing.title}</strong>
                                            <span>{subtitle(listing)}</span>
                                        </div>
                                        <button type="button" onClick={() => togglePin(listing.id)}>
                                            Unpin
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="actions">
                            <button type="button" className="btn btn-ghost" onClick={() => setPins(new Set())}>
                                Clear pins
                            </button>
                            <button type="button" className="btn btn-primary" onClick={() => setPinOpen(false)}>
                                Done
                            </button>
                        </div>
                    </div>
                </>
            ) : null}

        </section>
    );
}

export default BrowsePlp;
