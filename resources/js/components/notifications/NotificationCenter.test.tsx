import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider, NotificationBell } from './NotificationCenter';

const routerVisit = vi.hoisted(() => vi.fn());
const routerOn = vi.hoisted(() => vi.fn(() => () => {}));
vi.mock('@inertiajs/react', () => ({ router: { visit: routerVisit, on: routerOn } }));

const summary = { unread_count: 2, needs_action_count: 1, updates_count: 1 };
const emptySummary = { unread_count: 0, needs_action_count: 0, updates_count: 0 };
const actionNotice = {
    id: 'notice-1', event_type: 'deal_invite', attention: 'needs_action', title: 'Invitation',
    body: 'A partner invited you.', action_url: '/deal-invitations/notice-1',
    created_at: '2026-10-25T10:00:00Z', read_at: null,
};
const updateNotice = {
    ...actionNotice, id: 'notice-2', event_type: 'quote_received', attention: 'updates',
    title: 'New quote', action_url: '/orders/order-2', read_at: '2026-10-25T10:01:00Z',
};
const response = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body }) as Response;
const mount = () => render(
    <NotificationProvider authenticated initialSummary={summary} pollInterval={60_000}>
        <NotificationBell />
    </NotificationProvider>,
);

beforeEach(() => {
    routerVisit.mockReset();
    vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.querySelectorAll('meta[name="csrf-token"]').forEach((meta) => meta.remove());
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
});

describe('notification inbox', () => {
    it('uses the current rotated XSRF cookie rather than stale page meta for read ACK', async () => {
        const csrfMeta = document.createElement('meta');
        csrfMeta.name = 'csrf-token';
        csrfMeta.content = 'stale-page-token';
        document.head.append(csrfMeta);
        document.cookie = 'XSRF-TOKEN=rotated%20session%20token; path=/';

        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(response({ data: summary }));
        fetchMock.mockResolvedValueOnce(response({ data: [actionNotice], next_cursor: null }));
        fetchMock.mockResolvedValueOnce(response({ data: { id: actionNotice.id, read_at: '2026-10-26T09:00:00Z', summary: { unread_count: 1, needs_action_count: 0, updates_count: 1 } } }));
        mount();
        fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
        fireEvent.click(await screen.findByRole('button', { name: /invitation/i }));

        await waitFor(() => expect(routerVisit).toHaveBeenCalledWith('/deal-invitations/notice-1'));
        expect(fetchMock).toHaveBeenCalledWith('/notifications/notice-1/read', expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'rotated session token' }),
        }));
        csrfMeta.remove();
        document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
    });

    it('loads real inbox data, filters by attention, acknowledges before navigating, and updates unread count from ACK', async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(response({ data: summary }));
        fetchMock.mockResolvedValueOnce(response({ data: [actionNotice, updateNotice], next_cursor: null }));
        fetchMock.mockResolvedValueOnce(response({ data: { id: actionNotice.id, read_at: '2026-10-26T09:00:00Z', summary: { unread_count: 1, needs_action_count: 0, updates_count: 1 } } }));
        fetchMock.mockResolvedValueOnce(response({ data: [{ ...actionNotice, read_at: '2026-10-26T09:00:00Z' }], next_cursor: null }));
        mount();

        fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
        fireEvent.click(screen.getByRole('button', { name: /your action/i }));
        expect(await screen.findByText('Invitation')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /updates/i }));
        expect(screen.getByText('New quote')).toBeTruthy();
        expect(screen.queryByText('Invitation')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /your action/i }));
        fireEvent.click(screen.getByRole('button', { name: /invitation/i }));

        await waitFor(() => expect(routerVisit).toHaveBeenCalledWith('/deal-invitations/notice-1'));
        expect(fetchMock).toHaveBeenCalledWith('/notifications/notice-1/read', expect.objectContaining({ method: 'POST' }));
        expect((await screen.findByLabelText('Unread notifications')).textContent).toBe('1');
        fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
        expect((await screen.findByRole('button', { name: /invitation, read/i })).getAttribute('data-read')).toBe('true');
    });

    it('keeps the notification unread and does not navigate when read acknowledgement fails', async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(response({ data: summary }));
        fetchMock.mockResolvedValueOnce(response({ data: [actionNotice], next_cursor: null }));
        fetchMock.mockResolvedValueOnce(response({}, false));
        mount();
        fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
        fireEvent.click(await screen.findByRole('button', { name: /invitation/i }));

        expect(await screen.findByText(/could not mark this notification as read/i)).toBeTruthy();
        expect(routerVisit).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Unread notifications').textContent).toBe('2');
        expect(screen.getByRole('button', { name: /invitation, unread/i }).getAttribute('data-read')).toBe('false');
    });

    it('loads later pages without dropping current items and shows a truthful empty state', async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(response({ data: summary }));
        fetchMock.mockResolvedValueOnce(response({ data: [actionNotice], next_cursor: 'cursor-2' }));
        fetchMock.mockResolvedValueOnce(response({ data: [{ ...actionNotice, id: 'notice-3', title: 'Older notice' }], next_cursor: null }));
        mount();
        fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
        expect(await screen.findByText('Invitation')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /load more/i }));
        expect(await screen.findByText('Older notice')).toBeTruthy();
        expect(screen.getByText('Invitation')).toBeTruthy();
        expect(fetchMock).toHaveBeenLastCalledWith('/notifications?cursor=cursor-2', expect.any(Object));

        cleanup();
        fetchMock.mockReset();
        fetchMock.mockResolvedValueOnce(response({ data: emptySummary }));
        fetchMock.mockResolvedValueOnce(response({ data: [], next_cursor: null }));
        mount();
        fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
        expect(await screen.findByText(/no notifications yet/i)).toBeTruthy();
        await screen.findByRole('button', { name: /^notifications$/i });
        expect(screen.queryByLabelText('Unread notifications')).toBeNull();
    });
    it('keeps the guest bell disabled and does not request private notification data', () => {
        const fetchMock = vi.mocked(fetch);
        render(
            <NotificationProvider authenticated={false} initialSummary={null}>
                <NotificationBell />
            </NotificationProvider>,
        );
        expect((screen.getByRole('button', { name: /sign in to view notifications/i }) as HTMLButtonElement).disabled).toBe(true);
        expect(fetchMock).not.toHaveBeenCalled();
    });

});
