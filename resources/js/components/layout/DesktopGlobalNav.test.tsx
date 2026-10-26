import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopGlobalNav } from './DesktopGlobalNav';

const routerPost = vi.hoisted(() => vi.fn());
const routerVisit = vi.hoisted(() => vi.fn());
let mockPageProps: Record<string, unknown> = {};

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: { post: routerPost, visit: routerVisit },
    usePage: () => ({ props: mockPageProps }),
}));
describe('DesktopGlobalNav dynamic auth state', () => {
    beforeEach(() => {
        cleanup();
        routerVisit.mockReset();
        routerPost.mockReset();
        mockPageProps = {};
        window.localStorage.clear();
    });

    it('renders Sign In and Join CTAs when unauthenticated (guest)', () => {
        render(<DesktopGlobalNav session={null} readiness={null} />);

        // Must show Sign In and Join links
        const signInLink = screen.getByRole('link', { name: 'Sign In' });
        expect(signInLink).toBeTruthy();
        expect(signInLink.getAttribute('href')).toBe('/auth/sign-in');

        const joinLink = screen.getByRole('link', { name: 'Join' });
        expect(joinLink).toBeTruthy();
        expect(joinLink.getAttribute('href')).toBe('/auth/register');

        // Must NOT render mock "Rosa (Delegate)"
        expect(screen.queryByText('Rosa (Delegate)')).toBeNull();
    });

    it('renders user profile pill and toggles dropdown menu when authenticated', () => {
        render(
            <DesktopGlobalNav
                session={{ authenticated: true, userId: 'usr_1', displayName: 'Juan Dela Cruz' }}
                readiness={{ ready: true, displayName: 'Juan Dela Cruz' }}
            />,
        );

        // Sign In link should not be present
        expect(screen.queryByRole('link', { name: 'Sign In' })).toBeNull();

        // User button should display name
        const userBtn = screen.getByRole('button', { name: 'User account menu' });
        expect(userBtn).toBeTruthy();
        expect(screen.getByText('Juan Dela Cruz')).toBeTruthy();

        // Dropdown initially closed
        expect(screen.queryByRole('button', { name: 'Log Out' })).toBeNull();

        // Open dropdown
        fireEvent.click(userBtn);

        expect(screen.getByText('✓ Verified Provider')).toBeTruthy();
        expect(screen.getAllByRole('link', { name: 'My Listings' }).length).toBe(2);
        expect(screen.getByRole('button', { name: 'Log Out' })).toBeTruthy();

        // Click Log Out
        const logoutBtn = screen.getByRole('button', { name: 'Log Out' });
        fireEvent.click(logoutBtn);

        expect(routerPost).toHaveBeenCalledWith(
            '/auth/logout',
            {},
            expect.objectContaining({ preserveScroll: false }),
        );
    });

    it('falls back to usePage pageProps when session and readiness props are omitted', () => {
        mockPageProps = {
            session: { authenticated: true, userId: 'usr_page', displayName: 'Maria Santos' },
            readiness: { ready: true, displayName: 'Maria Santos' },
        };

        render(<DesktopGlobalNav />);

        expect(screen.queryByRole('link', { name: 'Sign In' })).toBeNull();
        expect(screen.getByText('Maria Santos')).toBeTruthy();
    });

    it('synchronizes live picks count from localStorage and serbizyu:picks-updated event', () => {
        window.localStorage.setItem('serbizyu.picks', JSON.stringify([
            { id: 'item_1', title: 'AC Clean', quantity: 2 },
            { id: 'item_2', title: 'Capacitor', quantity: 1 },
        ]));

        render(<DesktopGlobalNav session={null} readiness={null} />);

        // Should display total quantity 3
        expect(screen.getByText('3')).toBeTruthy();
    });

    it('toggles PicksDrawer open and closed on non-browse pages when clicking Picks', () => {
        window.localStorage.setItem(
            'serbizyu.picks',
            JSON.stringify([
                { id: 'item_1', title: 'AC Clean', price: 450, quantity: 2 },
            ]),
        );

        render(<DesktopGlobalNav session={null} readiness={null} />);

        // Drawer is initially closed
        expect(screen.queryByText('Citizen Picks')).toBeNull();

        // Click Picks in navbar to toggle open
        const picksBtn = screen.getByRole('button', { name: /View citizen picks/i });
        fireEvent.click(picksBtn);

        // Drawer is now open
        expect(screen.getByText('Citizen Picks')).toBeTruthy();
        expect(screen.getByText('AC Clean')).toBeTruthy();

        // Click close button on drawer
        const closeBtn = screen.getByRole('button', { name: /Close drawer/i });
        fireEvent.click(closeBtn);

        expect(screen.queryByText('Citizen Picks')).toBeNull();
    });

    it('delegates to onPicksClick when explicitly provided', () => {
        const onPicksClick = vi.fn();
        render(<DesktopGlobalNav onPicksClick={onPicksClick} />);

        const picksBtn = screen.getByRole('button', { name: /View citizen picks/i });
        fireEvent.click(picksBtn);

        expect(onPicksClick).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Citizen Picks')).toBeNull();
    });

    it('forwards the exact selected variant and listing version from the navbar Picks drawer', () => {
        window.localStorage.setItem('serbizyu.picks', JSON.stringify([{
            id: 'listing-1:variant-blue:',
            listing_id: 'listing-1',
            listing_type: 'product',
            variant_id: 'variant-blue',
            package_id: null,
            listing_version_id: 'version-9',
            title: 'Capacitor · Blue',
            price: 184,
            quantity: 2,
        }]));
        render(<DesktopGlobalNav session={null} readiness={null} />);
        fireEvent.click(screen.getByRole('button', { name: /View citizen picks/i }));
        fireEvent.click(screen.getByRole('button', { name: /Confirm Order/i }));

        expect(routerVisit).toHaveBeenCalledTimes(1);
        const url = new URL(routerVisit.mock.calls[0][0], 'http://localhost');
        expect(url.pathname).toBe('/listings/listing-1/book');
        expect(url.searchParams.get('variant_id')).toBe('variant-blue');
        expect(url.searchParams.get('listing_version_id')).toBe('version-9');
        expect(url.searchParams.get('quantity')).toBe('2');
    });
    it('renders unified Post CTA and opens streamlined CreatorPostModal when clicked', () => {
        render(<DesktopGlobalNav session={null} readiness={null} />);

        const postBtn = screen.getByRole('button', { name: 'Post request or create listing' });
        expect(postBtn).toBeTruthy();
        expect(screen.queryByText('What are you posting?')).toBeNull();

        fireEvent.click(postBtn);

        expect(screen.getByText('What are you posting?')).toBeTruthy();
        expect(screen.getByText('Post a Request')).toBeTruthy();
        expect(screen.getByText('Offer a Service')).toBeTruthy();
        expect(screen.getByText('Sell a Product')).toBeTruthy();
    });

    it('delegates to onPostClick when explicitly provided', () => {
        const onPostClick = vi.fn();
        render(<DesktopGlobalNav onPostClick={onPostClick} />);

        const postBtn = screen.getByRole('button', { name: 'Post request or create listing' });
        fireEvent.click(postBtn);

        expect(onPostClick).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('What are you posting?')).toBeNull();
    });
});
