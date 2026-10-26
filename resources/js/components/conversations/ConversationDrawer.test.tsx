import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ConversationDrawer from './ConversationDrawer';

const meta = {
    id: 'conversation-1',
    scope_type: 'order',
    scope_id: 'order-1',
    title: 'Order messages',
    status: 'open',
    read_only: false,
    can_send: true,
    can_write_internal: false,
    viewer: {
        actor_user_id: 'actor-1',
        owner_user_id: 'owner-1',
        owner_display_name: 'Tagudin Hardware',
        consent_grant_id: 'grant-1',
    },
    available_attachments: [],
};

const message = {
    id: 'message-1',
    sequence: 1,
    content: 'The package is ready.',
    actor_user_id: 'actor-1',
    owner_user_id: 'owner-1',
    consent_grant_id: 'grant-1',
    actor_display_name: 'Carlo',
    owner_display_name: 'Tagudin Hardware',
    audience: 'participants',
    created_at: '2026-10-26T10:00:00Z',
    attachment: null,
};

const emptyPage = {
    data: [], conversation: meta, next_before_sequence: null,
    next_after_sequence: 0, has_more_before: false, has_more_after: false,
};

afterEach(() => {
    cleanup();
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
    vi.unstubAllGlobals();
});

describe('ConversationDrawer', () => {
    it('renders only server-loaded messages, shows a sent message after acknowledgement, and applies server permission changes', async () => {
        const readOnlyMeta = { ...meta, status: 'archived', read_only: true, can_send: false };
        const acknowledgedMessage = { ...message, content: 'The package is ready.' };
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: meta }), { status: 201 }))
            .mockResolvedValueOnce(new Response(JSON.stringify(emptyPage), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                data: acknowledgedMessage, conversation: readOnlyMeta,
            }), { status: 201 }));
        vi.stubGlobal('fetch', fetchMock);
        document.cookie = 'XSRF-TOKEN=live-token';

        render(<ConversationDrawer open openUrl="/orders/order-1/conversation" onClose={vi.fn()} />);

        expect(await screen.findByText('Tagudin Hardware')).toBeTruthy();
        expect(screen.queryByText('The package is ready.')).toBeNull();
        expect(fetchMock.mock.calls[0][0]).toBe('/orders/order-1/conversation');
        expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('POST');
        fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
            target: { value: 'The package is ready.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));

        expect(await screen.findByText('The package is ready.')).toBeTruthy();
        expect(screen.getByText('Carlo · for Tagudin Hardware')).toBeTruthy();
        expect(await screen.findByText('Conversation archived · read-only')).toBeTruthy();
        expect(screen.queryByRole('textbox', { name: 'Message' })).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(3);
        const sendRequest = fetchMock.mock.calls[2][1] as RequestInit;
        expect(JSON.parse(String(sendRequest.body))).toMatchObject({
            content: 'The package is ready.',
            audience: 'participants',
        });
        expect(new Headers(sendRequest.headers).get('X-XSRF-TOKEN')).toBe('live-token');
    });

    it('retains a failed draft and reuses its idempotency key when the user retries', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: meta }), { status: 201 }))
            .mockResolvedValueOnce(new Response(JSON.stringify(emptyPage), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Temporary service error.' }), { status: 503 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: message, conversation: meta }), { status: 201 }));
        vi.stubGlobal('fetch', fetchMock);
        render(<ConversationDrawer open openUrl="/orders/order-1/conversation" onClose={vi.fn()} />);
        const composer = await screen.findByRole('textbox', { name: 'Message' });
        fireEvent.change(composer, { target: { value: 'The package is ready.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect((await screen.findByRole('alert')).textContent).toContain('Temporary service error.');
        expect((composer as HTMLTextAreaElement).value).toBe('The package is ready.');
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(await screen.findByText('The package is ready.')).toBeTruthy();

        const failedRequest = fetchMock.mock.calls[2][1] as RequestInit;
        const retriedRequest = fetchMock.mock.calls[3][1] as RequestInit;
        expect(new Headers(failedRequest.headers).get('X-Idempotency-Key')).toBeTruthy();
        expect(new Headers(retriedRequest.headers).get('X-Idempotency-Key')).toBe(new Headers(failedRequest.headers).get('X-Idempotency-Key'));
    });

    it('shows live authorization failures instead of an empty or pretend conversation', async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Access revoked.' }), { status: 403 }));
        vi.stubGlobal('fetch', fetchMock);
        render(<ConversationDrawer open openUrl="/orders/order-1/conversation" onClose={vi.fn()} />);
        expect((await screen.findByRole('alert')).textContent).toContain('Access revoked.');
        expect(screen.queryByText('No messages yet. Start the conversation.')).toBeNull();
        expect(await screen.findByRole('button', { name: 'Retry' })).toBeTruthy();
    });

    it('shows revoked sending access as read-only without mislabeling an open conversation archived', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: meta }), { status: 201 }))
            .mockResolvedValueOnce(new Response(JSON.stringify(emptyPage), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Access revoked.' }), { status: 403 }));
        vi.stubGlobal('fetch', fetchMock);
        render(<ConversationDrawer open openUrl="/orders/order-1/conversation" onClose={vi.fn()} />);
        fireEvent.change(await screen.findByRole('textbox', { name: 'Message' }), {
            target: { value: 'A new message.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));

        expect((await screen.findByRole('alert')).textContent).toContain('Access revoked.');
        expect(await screen.findByText('Access changed · read-only')).toBeTruthy();
        expect(screen.queryByText('Conversation archived · read-only')).toBeNull();
    });

    it('preserves a later draft when a deferred ACK completes an earlier intent', async () => {
        let resolveAcknowledgement!: (response: Response) => void;
        const acknowledgement = new Promise<Response>((resolve) => {
            resolveAcknowledgement = resolve;
        });
        const pendingConversation = {
            ...meta,
            available_attachments: [{ id: 'evidence-1', name: 'Clean proof.jpg', mime_type: 'image/jpeg' }],
        };
        const pendingPage = { ...emptyPage, conversation: pendingConversation };
        let composer: HTMLTextAreaElement;
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: pendingConversation }), { status: 201 }))
            .mockResolvedValueOnce(new Response(JSON.stringify(pendingPage), { status: 200 }))
            .mockImplementationOnce(() => {
                fireEvent.change(composer, { target: { value: 'A later draft.' } });
                return acknowledgement;
            });
        vi.stubGlobal('fetch', fetchMock);
        render(<ConversationDrawer open openUrl="/orders/order-1/conversation" onClose={vi.fn()} />);
        composer = await screen.findByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
        fireEvent.change(composer, { target: { value: 'First intent.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(composer.disabled).toBe(true);
        expect(screen.getByRole('combobox', { name: 'Attach existing clean evidence' }).hasAttribute('disabled')).toBe(true);

        resolveAcknowledgement(new Response(JSON.stringify({
            data: { ...message, content: 'First intent.' },
            conversation: pendingConversation,
        }), { status: 201 }));

        const messageLog = await screen.findByRole('log', { name: 'Conversation messages' });
        expect(await within(messageLog).findByText('First intent.')).toBeTruthy();
        expect(composer.value).toBe('A later draft.');
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('merges acknowledgement and concurrent poll results by sequence without loss or duplicates', async () => {
        const sequence50 = { ...message, id: 'message-50', sequence: 50, content: 'Participant message 50', actor_user_id: 'other-1', owner_user_id: 'other-1' };
        const sequence51 = { ...message, id: 'message-51', sequence: 51, content: 'Participant message 51', actor_user_id: 'other-1', owner_user_id: 'other-1' };
        const sequence52 = { ...message, id: 'message-52', sequence: 52, content: 'My acknowledged message 52' };
        const initialPage = {
            data: [sequence50], conversation: meta, next_before_sequence: null,
            next_after_sequence: 50, has_more_before: false, has_more_after: false,
        };
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: meta }), { status: 201 }))
            .mockResolvedValueOnce(new Response(JSON.stringify(initialPage), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ data: sequence52, conversation: meta }), { status: 201 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                data: [sequence51], conversation: meta, next_before_sequence: null,
                next_after_sequence: 51, has_more_before: false, has_more_after: false,
            }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        render(<ConversationDrawer open openUrl="/orders/order-1/conversation" onClose={vi.fn()} />);
        const messageLog = await screen.findByRole('log', { name: 'Conversation messages' });
        expect(await within(messageLog).findByText('Participant message 50')).toBeTruthy();
        fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Send sequence 52.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(await within(messageLog).findByText('My acknowledged message 52')).toBeTruthy();

        fireEvent(document, new Event('visibilitychange'));

        expect(await within(messageLog).findByText('Participant message 51')).toBeTruthy();
        const displayed = within(messageLog).getAllByText(/^(Participant message 50|Participant message 51|My acknowledged message 52)$/)
            .map((element) => element.textContent);
        expect(displayed).toEqual([
            'Participant message 50',
            'Participant message 51',
            'My acknowledged message 52',
        ]);
    });
});
