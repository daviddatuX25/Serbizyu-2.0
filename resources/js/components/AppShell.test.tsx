import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AppShell } from './AppShell';
import { NotificationProvider, NotificationBell } from './notifications/NotificationCenter';
import { router } from '@inertiajs/react';

vi.mock('@inertiajs/react', () => ({ router: { visit: vi.fn(), on: vi.fn(() => () => {}) } }));
vi.mock('./layout/DesktopGlobalNav', () => ({ DesktopGlobalNav: () => null }));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

test('AppShell keeps page-owned notifications in one header and preserves five bottom actions', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { unread_count: 3, needs_action_count: 2, updates_count: 1 } }),
    }));
    render(
        <NotificationProvider
            authenticated
            initialSummary={{ unread_count: 3, needs_action_count: 2, updates_count: 1 }}
        >
            <AppShell>
                <header aria-label="Request navigation">
                    <h1>Request details</h1>
                    <NotificationBell />
                </header>
                <main>Bid list</main>
            </AppShell>
        </NotificationProvider>,
    );

    const mobileNavigation = screen.getByRole('navigation', { name: 'Bottom Navigation Bar' });
    expect(within(mobileNavigation).getAllByRole('button')).toHaveLength(5);
    expect(within(mobileNavigation).getByRole('button', { name: 'Quick Deal QR Scanner' })).toBeTruthy();
    expect(within(mobileNavigation).getByRole('button', { name: 'Explore' })).toBeTruthy();
    expect(within(mobileNavigation).getByRole('button', { name: 'Post' })).toBeTruthy();
    expect(within(mobileNavigation).getByRole('button', { name: 'Profile' })).toBeTruthy();
    expect(within(mobileNavigation).getByRole('button', { name: 'Orders' })).toBeTruthy();
    const notificationButton = screen.getByRole('button', { name: /notifications, 3 unread/i });
    expect(screen.getByRole('banner', { name: 'Request navigation' }).contains(notificationButton)).toBe(true);
    expect(mobileNavigation.contains(notificationButton)).toBe(false);
    fireEvent.click(within(mobileNavigation).getByRole('button', { name: 'Orders' }));
    expect(router.visit).toHaveBeenCalledWith('/orders');
});
