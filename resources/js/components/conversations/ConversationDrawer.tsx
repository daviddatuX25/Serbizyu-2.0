import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, LoaderCircle, Paperclip, Send, X } from 'lucide-react';
import GlovoWaveModal from '../mobile/GlovoWaveModal';
import type {
    ConversationContext,
    ConversationMeta,
    ConversationMessage,
    ConversationMessagesPage,
} from './types';

type ConversationDrawerProps = {
    open: boolean;
    onClose: () => void;
    openUrl?: string;
    initialConversation?: ConversationMeta;
    context?: ConversationContext;
};

type ApiError = { message?: string; error?: { message?: string } };
type HttpError = Error & { status: number };
type OpenResponse = { data: ConversationMeta };
const POLL_INTERVAL_MS = 8_000;

function requestHeaders(json = false): HeadersInit {
    const token = document.cookie
        .split(';')
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.slice('XSRF-TOKEN='.length);
    return {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
        ...(json ? { 'Content-Type': 'application/json' } : {}),
    };
}

function contextQuery(context?: ConversationContext): string {
    const query = new URLSearchParams();
    if (context?.owner_user_id) query.set('owner_user_id', context.owner_user_id);
    if (context?.consent_grant_id) query.set('consent_grant_id', context.consent_grant_id);
    const value = query.toString();
    return value ? `?${value}` : '';
}

async function responseError(response: Response): Promise<HttpError> {
    let payload: ApiError = {};
    try {
        payload = await response.json() as ApiError;
    } catch {
        // A non-JSON response still gets an actionable generic error.
    }
    const message = payload.error?.message ?? payload.message;
    const error = response.status === 401
        ? new Error('Your session has expired. Sign in again to continue.')
        : response.status === 403 || response.status === 404
            ? new Error(message ?? 'You no longer have access to this conversation.')
            : response.status === 409
                ? new Error(message ?? 'This conversation changed. Review the latest messages and try again.')
                : new Error(message ?? `Conversation request failed (${response.status}). Try again.`);
    return Object.assign(error, { status: response.status });
}

function isAuthorizationFailure(cause: unknown): boolean {
    return cause instanceof Error && 'status' in cause && (cause.status === 403 || cause.status === 404);
}

function displayTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}
function mergeMessages(current: ConversationMessage[], incoming: ConversationMessage[]): ConversationMessage[] {
    if (incoming.length === 0) return current;
    const seenIds = new Set(current.map((message) => message.id));
    const additions: ConversationMessage[] = [];
    for (const message of incoming) {
        if (seenIds.has(message.id)) continue;
        seenIds.add(message.id);
        additions.push(message);
    }
    if (additions.length === 0) return current;

    const merged: ConversationMessage[] = [];
    let currentIndex = 0;
    let incomingIndex = 0;
    while (currentIndex < current.length && incomingIndex < additions.length) {
        const existing = current[currentIndex];
        const next = additions[incomingIndex];
        if (existing.sequence < next.sequence || (existing.sequence === next.sequence && existing.id < next.id)) {
            merged.push(existing);
            currentIndex++;
        } else if (existing.sequence > next.sequence || existing.id !== next.id) {
            merged.push(next);
            incomingIndex++;
        } else {
            merged.push(existing);
            currentIndex++;
            incomingIndex++;
        }
    }
    while (currentIndex < current.length) merged.push(current[currentIndex++]);
    while (incomingIndex < additions.length) merged.push(additions[incomingIndex++]);
    return merged;
}


export default function ConversationDrawer({
    open,
    onClose,
    openUrl,
    initialConversation,
    context,
}: ConversationDrawerProps) {
    const [conversation, setConversation] = useState<ConversationMeta | null>(initialConversation ?? null);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [paging, setPaging] = useState(false);
    const [sendFailed, setSendFailed] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [attachmentId, setAttachmentId] = useState('');
    const [audience, setAudience] = useState<'participants' | 'staff_internal'>('participants');
    const [hasMoreBefore, setHasMoreBefore] = useState(false);
    const nextAfter = useRef(0);
    const moreBefore = useRef<number | null>(null);
    const initialLoaded = useRef(false);
    const requestInFlight = useRef(false);
    const idempotency = useRef<{ draft: string; attachment: string; audience: string; key: string } | null>(null);
    const composerRef = useRef<HTMLTextAreaElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const previousScroll = useRef<{ height: number; top: number } | null>(null);
    const query = contextQuery(context);

    const loadPage = useCallback(async (url: string, mode: 'initial' | 'older' | 'newer', signal?: AbortSignal) => {
        const response = await fetch(url, {
            credentials: 'same-origin',
            headers: requestHeaders(),
            signal,
        });
        if (!response.ok) throw await responseError(response);
        const page = await response.json() as ConversationMessagesPage;
        if (signal?.aborted) return;
        setConversation(page.conversation);
        setAccessDenied(false);
        if (mode === 'initial') {
            setMessages((current) => mergeMessages(current, page.data));
            setHasMoreBefore(page.has_more_before);
            moreBefore.current = page.next_before_sequence;
            nextAfter.current = page.next_after_sequence;
            initialLoaded.current = true;
        } else if (mode === 'older') {
            setMessages((current) => mergeMessages(current, page.data));
            setHasMoreBefore(page.has_more_before);
            moreBefore.current = page.next_before_sequence;
        } else {
            setMessages((current) => mergeMessages(current, page.data));
            nextAfter.current = page.next_after_sequence;
        }
    }, []);

    const openConversation = useCallback(async (signal?: AbortSignal) => {
        if (initialConversation) {
            setConversation(initialConversation);
            await loadPage(`/conversations/${initialConversation.id}/messages${query}`, 'initial', signal);
            return;
        }
        if (!openUrl) throw new Error('This conversation is not available.');
        const response = await fetch(`${openUrl}${contextQuery(context)}`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: requestHeaders(true),
            body: JSON.stringify(context ?? {}),
            signal,
        });
        if (!response.ok) throw await responseError(response);
        const payload = await response.json() as OpenResponse;
        setConversation(payload.data);
        await loadPage(`/conversations/${payload.data.id}/messages${query}`, 'initial', signal);
    }, [context, initialConversation, loadPage, openUrl, query]);

    const refresh = useCallback(async () => {
        if (!open || document.visibilityState !== 'visible' || requestInFlight.current) return;
        requestInFlight.current = true;
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            if (!conversation || !initialLoaded.current) {
                await openConversation(controller.signal);
            } else {
                const separator = query ? '&' : '?';
                await loadPage(`/conversations/${conversation.id}/messages${query}${separator}after_sequence=${nextAfter.current}`, 'newer', controller.signal);
            }
            setError(null);
        } catch (cause) {
            if (!controller.signal.aborted) {
                if (isAuthorizationFailure(cause)) setAccessDenied(true);
                setError(cause instanceof Error ? cause.message : 'Messages could not be loaded.');
            }
        } finally {
            if (abortRef.current === controller) {
                abortRef.current = null;
                requestInFlight.current = false;
            }
        }
    }, [conversation, loadPage, open, openConversation, query]);

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        abortRef.current = controller;
        initialLoaded.current = false;
        setConversation(initialConversation ?? null);
        setMessages([]);
        setHasMoreBefore(false);
        moreBefore.current = null;
        nextAfter.current = 0;
        initialLoaded.current = false;
        idempotency.current = null;
        setDraft('');
        setAttachmentId('');
        setAudience('participants');
        setSendFailed(false);
        setAccessDenied(false);
        setLoading(true);
        setError(null);
        requestInFlight.current = true;
        void openConversation(controller.signal)
            .catch((cause: unknown) => {
                if (!controller.signal.aborted) {
                    if (isAuthorizationFailure(cause)) setAccessDenied(true);
                    setError(cause instanceof Error ? cause.message : 'Conversation could not be loaded.');
                }
            })
            .finally(() => {
                if (abortRef.current === controller) {
                    abortRef.current = null;
                    requestInFlight.current = false;
                    setLoading(false);
                }
            });
        return () => controller.abort();
    }, [open, openConversation]);

    useEffect(() => {
        if (!open || !conversation) return;
        const poll = () => {
            if (document.visibilityState === 'visible') void refresh();
        };
        const interval = window.setInterval(poll, POLL_INTERVAL_MS);
        document.addEventListener('visibilitychange', poll);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', poll);
        };
    }, [conversation, open, refresh]);

    useEffect(() => {
        if (open) composerRef.current?.focus();
    }, [open, conversation]);

    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        if (previousScroll.current) {
            list.scrollTop = previousScroll.current.top + list.scrollHeight - previousScroll.current.height;
            previousScroll.current = null;
        } else {
            list.scrollTop = list.scrollHeight;
        }
    }, [messages.length]);

    const changeDraft = (value: string) => {
        setDraft(value);
        if (idempotency.current && (idempotency.current.draft !== value.trim() || idempotency.current.attachment !== attachmentId || idempotency.current.audience !== audience)) {
            idempotency.current = null;
        }
        setSendFailed(false);
        if (error) setError(null);
    };

    const changeAttachment = (value: string) => {
        setAttachmentId(value);
        idempotency.current = null;
    };

    const send = async (event?: React.FormEvent) => {
        event?.preventDefault();
        if (!conversation || !conversation.can_send || conversation.read_only || sending) return;
        const content = draft.trim();
        if (!content && !attachmentId) return;
        if (!idempotency.current || idempotency.current.draft !== content || idempotency.current.attachment !== attachmentId || idempotency.current.audience !== audience) {
            idempotency.current = { draft: content, attachment: attachmentId, audience, key: crypto.randomUUID() };
        }
        const key = idempotency.current.key;
        setSending(true);
        setSendFailed(false);
        setError(null);
        try {
            const response = await fetch(`/conversations/${conversation.id}/messages${contextQuery(context)}`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { ...requestHeaders(true), 'X-Idempotency-Key': key },
                body: JSON.stringify({
                    idempotency_key: key,
                    content,
                    ...(attachmentId ? { attachment_evidence_file_id: attachmentId } : {}),
                    audience,
                    ...(context ?? {}),
                }),
            });
            if (!response.ok) throw await responseError(response);
            const payload = await response.json() as { data: ConversationMessage; conversation: ConversationMeta };
            setConversation(payload.conversation);
            setMessages((current) => mergeMessages(current, [payload.data]));
            if (idempotency.current?.key === key) {
                setDraft('');
                setAttachmentId('');
                idempotency.current = null;
            }
            setSendFailed(false);
            setAccessDenied(false);
            setError(null);
        } catch (cause) {
            if (isAuthorizationFailure(cause)) setAccessDenied(true);
            setError(cause instanceof Error ? cause.message : 'Message could not be sent. Your draft is still here; try again.');
            setSendFailed(true);
        } finally {
            setSending(false);
        }
    };
    const loadOlder = async () => {
        if (!conversation || paging || !hasMoreBefore || moreBefore.current === null) return;
        setPaging(true);
        setError(null);
        try {
            const list = listRef.current;
            if (list) previousScroll.current = { height: list.scrollHeight, top: list.scrollTop };
            const separator = query ? '&' : '?';
            await loadPage(`/conversations/${conversation.id}/messages${query}${separator}before_sequence=${moreBefore.current}`, 'older');
        } catch (cause) {
            if (isAuthorizationFailure(cause)) setAccessDenied(true);
            setError(cause instanceof Error ? cause.message : 'Earlier messages could not be loaded.');
        } finally {
            setPaging(false);
        }
    };

    const download = async (message: ConversationMessage) => {
        if (!conversation || !message.attachment) return;
        try {
            const response = await fetch(`/conversations/${conversation.id}/attachments/${message.attachment.id}${contextQuery(context)}`, {
                credentials: 'same-origin',
                headers: requestHeaders(),
            });
            if (!response.ok) throw await responseError(response);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = message.attachment.name;
            anchor.click();
            URL.revokeObjectURL(url);
        } catch (cause) {
            if (isAuthorizationFailure(cause)) setAccessDenied(true);
            setError(cause instanceof Error ? cause.message : 'Attachment could not be downloaded.');
        }
    };

    const title = conversation?.title ?? 'Conversation';
    const readOnly = accessDenied || !conversation?.can_send || conversation.read_only;
    const viewerIsActor = Boolean(conversation && conversation.viewer.actor_user_id !== conversation.viewer.owner_user_id);

    return (
        <GlovoWaveModal
            open={open}
            onClose={onClose}
            title={title}
            subtitle={conversation?.scope_type === 'order' ? `Order · ${conversation.scope_id}` : conversation?.scope_type === 'deal_chain_relay' ? 'Deal Chain handoff relay' : 'Support case'}
        >
            <div className="flex h-[min(72vh,680px)] min-h-[360px] flex-col">
                {viewerIsActor && conversation && (
                    <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                        Acting on behalf of: <strong>{conversation.viewer.owner_display_name}</strong>
                    </div>
                )}
                {conversation?.scope_type === 'deal_chain_relay' && (
                    <p className="shrink-0 border-b border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-950">Handoff coordination only. Partner prices and payment details stay private to each Order.</p>
                )}
                {error && (
                    <div role="alert" className="m-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">{error}</div>
                        <button type="button" className="font-bold underline" onClick={() => sendFailed ? void send() : void refresh()}>{sendFailed ? 'Retry sending' : 'Retry'}</button>
                    </div>
                )}
                <div ref={listRef} role="log" aria-label="Conversation messages" aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
                    {hasMoreBefore && <button type="button" disabled={paging} onClick={() => void loadOlder()} className="mx-auto flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 disabled:opacity-60">{paging && <LoaderCircle className="size-3 animate-spin" />}Load earlier messages</button>}
                    {loading && messages.length === 0 ? <p role="status" className="py-8 text-center text-sm text-slate-500">Loading conversation…</p> : null}
                    {!loading && !error && messages.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No messages yet. Start the conversation.</p> : null}
                    {messages.map((message) => {
                        const ownPrincipal = message.owner_user_id === conversation?.viewer.owner_user_id;
                        const attribution = message.actor_user_id !== message.owner_user_id
                            ? `${message.actor_display_name} · for ${message.owner_display_name}`
                            : message.actor_display_name;
                        return (
                            <article key={message.id} className={`flex flex-col ${ownPrincipal ? 'items-end' : 'items-start'}`}>
                                <div className="mb-1 flex max-w-[90%] items-center gap-2 px-1 text-[11px] text-slate-600">
                                    <strong>{attribution}</strong><time dateTime={message.created_at}>{displayTime(message.created_at)}</time>
                                </div>
                                {message.content && <p className={`max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${ownPrincipal ? 'rounded-br-sm bg-[#0F2F58] text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'}`}>{message.content}</p>}
                                {message.attachment && <button type="button" onClick={() => void download(message)} className="mt-1 flex min-h-10 max-w-[90%] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"><Download className="size-4" />{message.attachment.name}</button>}
                            </article>
                        );
                    })}
                </div>
                {readOnly ? (
                    <div className="shrink-0 border-t border-slate-200 bg-white p-4 text-center text-sm font-semibold text-slate-600">{accessDenied ? 'Access changed · read-only' : conversation?.status === 'archived' ? 'Conversation archived · read-only' : 'You can read this conversation but cannot send messages.'}</div>
                ) : (
                    <form onSubmit={(event) => void send(event)} className="shrink-0 space-y-2 border-t border-slate-200 bg-white p-3 sm:p-4">
                        {conversation?.can_write_internal && <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" disabled={sending} checked={audience === 'staff_internal'} onChange={(event) => { setAudience(event.target.checked ? 'staff_internal' : 'participants'); idempotency.current = null; }} />Staff-only note</label>}
                        <div className="flex items-end gap-2">
                            <label className="sr-only" htmlFor="conversation-message">Message</label>
                            <textarea id="conversation-message" ref={composerRef} aria-label="Message" disabled={sending} rows={2} value={draft} onChange={(event) => changeDraft(event.target.value)} placeholder="Write a message…" className="min-h-11 flex-1 resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F2F58] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0F2F58]/20 disabled:cursor-wait disabled:opacity-60" />
                            <button type="submit" disabled={sending || (!draft.trim() && !attachmentId)} aria-label="Send" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0D715F] text-white hover:bg-[#0a574a] disabled:cursor-not-allowed disabled:opacity-45"><Send className="size-4" /><span className="sr-only">Send</span></button>
                        </div>
                        {conversation?.available_attachments.length ? (
                            <div className="flex items-center gap-2 text-xs">
                                <Paperclip className="size-4 text-slate-500" />
                                <label className="sr-only" htmlFor="conversation-attachment">Attach existing clean evidence</label>
                                <select id="conversation-attachment" value={attachmentId} disabled={sending} onChange={(event) => changeAttachment(event.target.value)} className="min-h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-slate-700 disabled:cursor-wait disabled:opacity-60">
                                    <option value="">Attach existing evidence…</option>
                                    {conversation.available_attachments.map((attachment) => <option key={attachment.id} value={attachment.id}>{attachment.name}</option>)}
                                </select>
                                {attachmentId && <button type="button" aria-label="Remove attachment" disabled={sending} onClick={() => changeAttachment('')} className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-60"><X className="size-4" /></button>}
                            </div>
                        ) : null}
                    </form>
                )}
            </div>
        </GlovoWaveModal>
    );
}
