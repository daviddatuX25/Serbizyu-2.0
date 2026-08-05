import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import type { SliceSession } from '../types';

export type ProductNavKey = 'home' | 'browse' | 'create' | 'listings';

const CIRCLE_LOGO = '/brand/serbizyu-logo-circle.png';
const LONG_LOGO = '/brand/serbizyu-logo-long.png';
const CREATE_HREF = '/my-listings#my-listings-editor';

type NavItem = {
    key: ProductNavKey;
    label: string;
    shortLabel: string;
    href: string;
};

const NAV: NavItem[] = [
    { key: 'home', label: 'Home', shortLabel: 'Home', href: '/' },
    { key: 'browse', label: 'Browse', shortLabel: 'Browse', href: '/browse' },
    { key: 'create', label: 'Create', shortLabel: 'Create', href: CREATE_HREF },
    { key: 'listings', label: 'My Listings', shortLabel: 'Mine', href: '/my-listings' },
];

function NavIcon({ name }: { name: ProductNavKey }) {
    const common = {
        className: 'sz-nav-ico',
        viewBox: '0 0 24 24',
        'aria-hidden': true as const,
        focusable: false as const,
    };

    if (name === 'home') {
        return (
            <svg {...common}>
                <path d="M4 11 12 4l8 7" />
                <path d="M6 10.5V20h4v-5h4v5h4v-9.5" />
            </svg>
        );
    }
    if (name === 'browse') {
        return (
            <svg {...common}>
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
            </svg>
        );
    }
    if (name === 'create') {
        return (
            <svg {...common}>
                <path d="M12 5v14M5 12h14" />
            </svg>
        );
    }

    return (
        <svg {...common}>
            <path d="M5 7h14M5 12h14M5 17h9" />
        </svg>
    );
}

/**
 * Mobile secondary page chrome: reserved logo slot + tools.
 * On ≥900px the product rail owns brand — logo slot hides via CSS.
 */
export function ProductSecondaryBar({
    children,
    tools,
    logo = 'long',
}: {
    children?: ReactNode;
    tools?: ReactNode;
    logo?: 'long' | 'circle' | false;
}) {
    return (
        <div className="sz-secondary-bar">
            <div className="sz-secondary-logo-slot">
                {logo ? (
                    <Link href="/" className="sz-secondary-logo" aria-label="Serbizyu home">
                        <img
                            src={logo === 'circle' ? CIRCLE_LOGO : LONG_LOGO}
                            alt="Serbizyu"
                            width={logo === 'circle' ? 40 : 184}
                            height={logo === 'circle' ? 40 : 51}
                            decoding="async"
                        />
                    </Link>
                ) : null}
            </div>
            <div className="sz-secondary-tools">{tools ?? children}</div>
        </div>
    );
}

export function ProductShell({
    session,
    active = 'home',
    title = 'Your Serbizyu workspace',
    pageChrome = false,
    children,
}: {
    session?: SliceSession | null;
    active?: ProductNavKey;
    title?: string;
    /** Page owns sticky secondary chrome (e.g. Browse PLP). Skip shell mobile title bar. */
    pageChrome?: boolean;
    children: ReactNode;
}) {
    const displayName = session?.displayName ?? session?.display_name ?? null;

    return (
        <div className="sz-product-shell" data-shell="adaptive-rail">
            <aside className="sz-rail">
                <Link href="/" className="sz-rail-brand" aria-label="Serbizyu home">
                    <img
                        className="sz-rail-logo sz-rail-logo-circle"
                        src={CIRCLE_LOGO}
                        alt=""
                        width={64}
                        height={64}
                        decoding="async"
                    />
                    <img
                        className="sz-rail-logo sz-rail-logo-long"
                        src={LONG_LOGO}
                        alt="Serbizyu"
                        width={184}
                        height={51}
                        decoding="async"
                    />
                </Link>

                <nav className="sz-rail-nav" aria-label="Primary navigation">
                    {NAV.map((item) => (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`sz-rail-link${item.key === 'create' ? ' is-create' : ''}${active === item.key ? ' is-active' : ''}`}
                            title={item.label}
                            aria-current={active === item.key ? 'page' : undefined}
                        >
                            <NavIcon name={item.key} />
                            <span className="sz-rail-label">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <p className="sz-rail-meta">
                    {displayName ? `${displayName} · Tagudin pilot` : 'Tagudin pilot'}
                </p>
            </aside>

            <div className="sz-shell-canvas">
                {!pageChrome ? (
                    <header className="sz-shell-secondary">
                        <ProductSecondaryBar>
                            <p className="sz-shell-secondary-title">{title}</p>
                        </ProductSecondaryBar>
                    </header>
                ) : null}

                {children}

                <nav className="sz-dock" aria-label="Mobile navigation">
                    {NAV.map((item) => (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`sz-dock-link${item.key === 'create' ? ' is-create' : ''}${active === item.key ? ' is-active' : ''}`}
                            aria-current={active === item.key ? 'page' : undefined}
                        >
                            <NavIcon name={item.key} />
                            <span>{item.shortLabel}</span>
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    );
}
