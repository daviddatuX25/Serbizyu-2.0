import { Link } from '@inertiajs/react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type DependencyList,
    type ReactNode,
} from 'react';
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

type ShellDrawerContextValue = {
    setDrawerActions: (actions: ReactNode | null) => void;
};

const ShellDrawerContext = createContext<ShellDrawerContextValue | null>(null);

/**
 * Pages that need the switching drawer (e.g. listing detail) register left-panel
 * actions here. When set, ProductShell replaces the plain mobile dock with the
 * actions ↔ nav switching drawer.
 */
export function useRegisterShellDrawerActions(actions: ReactNode | null, deps: DependencyList): void {
    const api = useContext(ShellDrawerContext);

    useEffect(() => {
        if (!api) {
            return;
        }
        api.setDrawerActions(actions);
        return () => api.setDrawerActions(null);
        // Caller controls freshness via deps (same pattern as useEffect).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

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

function Chevron({ dir }: { dir: 'left' | 'right' }) {
    return (
        <svg className="sz-switch-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            {dir === 'left' ? (
                <path d="M10 3.5 5.5 8 10 12.5" />
            ) : (
                <path d="M6 3.5 10.5 8 6 12.5" />
            )}
        </svg>
    );
}

type DrawerPanel = 'actions' | 'nav';

function SwitchingDrawer({
    active,
    actions,
}: {
    active: ProductNavKey;
    actions: ReactNode;
}) {
    const [panel, setPanel] = useState<DrawerPanel>('actions');
    const actionsOpen = panel === 'actions';
    const navOpen = panel === 'nav';
    /** Pause auto-return while nav has an open interaction (dropdowns later). */
    const [navHold, setNavHold] = useState(false);

    useEffect(() => {
        if (panel !== 'nav' || navHold) {
            return;
        }

        const timer = window.setTimeout(() => {
            setPanel('actions');
        }, 3000);

        return () => window.clearTimeout(timer);
    }, [panel, navHold]);

    return (
        <div
            className="sz-switch-drawer"
            data-shell="switch-drawer"
            data-panel={panel}
            data-nav-hold={navHold ? 'true' : undefined}
            role="group"
            aria-label="Page actions and navigation"
            onFocusCapture={(event) => {
                const target = event.target as HTMLElement | null;
                if (target?.closest('[data-sz-nav-hold="true"]')) {
                    setNavHold(true);
                }
            }}
            onBlurCapture={(event) => {
                const next = event.relatedTarget as HTMLElement | null;
                if (!next?.closest('[data-sz-nav-hold="true"]')) {
                    setNavHold(false);
                }
            }}
        >
            <div className={`sz-switch-card${actionsOpen ? ' is-open' : ' is-closed'}`} data-side="actions">
                <button
                    type="button"
                    className="sz-switch-handle"
                    aria-label="Show listing actions"
                    aria-expanded={actionsOpen}
                    onClick={() => {
                        setNavHold(false);
                        setPanel('actions');
                    }}
                >
                    <Chevron dir="right" />
                </button>
                <div className="sz-switch-panel sz-switch-panel-actions" aria-hidden={!actionsOpen}>{actions}</div>
            </div>

            <div className={`sz-switch-card${navOpen ? ' is-open' : ' is-closed'}`} data-side="nav">
                <button
                    type="button"
                    className="sz-switch-handle"
                    aria-label="Show navigation"
                    aria-expanded={navOpen}
                    onClick={() => setPanel('nav')}
                >
                    <Chevron dir="left" />
                </button>
                <nav className="sz-switch-panel sz-switch-panel-nav" aria-label="Mobile navigation" aria-hidden={!navOpen}>
                    {NAV.map((item) => (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`sz-switch-nav-link${item.key === 'create' ? ' is-create' : ''}${active === item.key ? ' is-active' : ''}`}
                            aria-current={active === item.key ? 'page' : undefined}
                            tabIndex={navOpen ? undefined : -1}
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
    const [drawerActions, setDrawerActionsState] = useState<ReactNode | null>(null);
    const setDrawerActions = useCallback((actions: ReactNode | null) => {
        setDrawerActionsState(actions);
    }, []);
    const drawerApi = useMemo(() => ({ setDrawerActions }), [setDrawerActions]);
    const hasSwitchDrawer = drawerActions != null;

    return (
        <ShellDrawerContext.Provider value={drawerApi}>
            <div
                className="sz-product-shell"
                data-shell="adaptive-rail"
                data-has-switch-drawer={hasSwitchDrawer ? 'true' : undefined}
            >
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

                    {hasSwitchDrawer ? (
                        <SwitchingDrawer active={active} actions={drawerActions} />
                    ) : (
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
                    )}
                </div>
            </div>
        </ShellDrawerContext.Provider>
    );
}
