import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AppShell } from './AppShell';
import { NotificationProvider } from './notifications/NotificationCenter';
import { router } from '@inertiajs/react';

vi.mock('@inertiajs/react', () => ({ router: { visit: vi.fn(), on: vi.fn(() => () => {}) } }));
vi.mock('./layout/DesktopGlobalNav', () => ({ DesktopGlobalNav: () => null }));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

test('AppShell exposes the shared notification bell in its mobile navigation', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { unread_count: 3, needs_action_count: 2, updates_count: 1 } }),
    }));
    render(
        <NotificationProvider
            authenticated
            initialSummary={{ unread_count: 3, needs_action_count: 2, updates_count: 1 }}
        >
            <AppShell><main>Account</main></AppShell>
        </NotificationProvider>,
    );

    const mobileNavigation = screen.getByRole('navigation', { name: 'Bottom Navigation Bar' });
    const notificationButton = within(mobileNavigation).getByRole('button', { name: /notifications, 3 unread/i });
    expect(notificationButton.textContent).toBe('3');
    fireEvent.click(within(mobileNavigation).getByRole('button', { name: 'Orders' }));
    expect(router.visit).toHaveBeenCalledWith('/orders');
});
