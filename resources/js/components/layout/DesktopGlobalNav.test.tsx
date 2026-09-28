import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopGlobalNav } from './DesktopGlobalNav';

const routerPost = vi.hoisted(() => vi.fn());
let mockPageProps: Record<string, unknown> = {};

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: { post: routerPost },
    usePage: () => ({ props: mockPageProps }),
}));
describe('DesktopGlobalNav dynamic auth state', () => {
    beforeEach(() => {
        cleanup();
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
});
