import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import type { SliceSession } from '../types';

export function ProductShell({
    session,
    active = 'home',
    title = 'Your Serbizyu workspace',
    children,
}: {
    session?: SliceSession | null;
    active?: 'home' | 'listings' | 'browse';
    title?: string;
    children: ReactNode;
}) {
    const displayName = session?.displayName ?? session?.display_name ?? 'Your account';
    const authenticated = Boolean(session?.authenticated || session?.isAuthenticated);
    const links = [
        { key: 'home', label: 'Home', href: '/' },
        { key: 'listings', label: 'My Listings', href: '/my-listings' },
        { key: 'browse', label: 'Browse', href: '/browse' },
    ] as const;

    const iconFor = (key: (typeof links)[number]['key']) => {
        if (key === 'home') {
            return '⌂';
        }
        if (key === 'listings') {
            return '▤';
        }
        return '⌕';
    };

    return (
        <div className="sz-product-shell">
            {authenticated ? (
                <aside className="sz-sidebar" aria-label="Primary navigation">
                    <div className="sz-sidebar-inner">
                        <Link href="/" className="sz-brand">
                            <span className="sz-brand-mark" aria-hidden="true">
                                S
                            </span>
                            <span>
                                <span className="sz-brand-name">Serbizyu</span>
                                <span className="sz-brand-meta">Local marketplace</span>
                            </span>
                        </Link>
                        <nav className="sz-nav" aria-label="Workspace">
                            {links.map((link) => (
                                <Link
                                    key={link.key}
                                    href={link.href}
                                    className={`sz-nav-link ${active === link.key ? 'is-active' : ''}`}
                                >
                                    <span aria-hidden="true">{iconFor(link.key)}</span>
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                        <div className="sz-account-card">
                            <strong>{displayName}</strong>
                            <small>Local marketplace account</small>
                        </div>
                    </div>
                </aside>
            ) : null}

            <div className="sz-app-canvas">
                <header className="sz-topbar">
                    {authenticated ? (
                        <span className="sz-online-dot" aria-hidden="true">
                            ●
                        </span>
                    ) : null}
                    <p className="sz-topbar-title">{title}</p>
                    <div className="sz-topbar-meta">
                        <span>{authenticated ? 'Your workspace' : 'Public marketplace'}</span>
                    </div>
                </header>
                {children}
                {authenticated ? (
                    <nav className="sz-mobile-nav" aria-label="Mobile navigation">
                        {links.map((link) => (
                            <Link key={link.key} href={link.href} className={active === link.key ? 'is-active' : ''}>
                                <span aria-hidden="true">{iconFor(link.key)}</span>
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                ) : null}
            </div>
        </div>
    );
}
