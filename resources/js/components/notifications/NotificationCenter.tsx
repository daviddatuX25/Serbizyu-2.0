import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Bell, Check, ChevronDown, LoaderCircle, X } from 'lucide-react';
import { router } from '@inertiajs/react';
import GlovoWaveModal from '../mobile/GlovoWaveModal';
import type { NotificationSummary, NotificationRecord, SliceSession } from '@/types';

type InboxResponse = { data: NotificationRecord[]; next_cursor: string | null };
type ReadResponse = { data: { id: string; read_at: string; summary: NotificationSummary } };
type NotificationContextValue = {
    summary: NotificationSummary | null;
    open: boolean;
    authenticated: boolean;
    setOpen: (open: boolean) => void;
    setSummary: (summary: NotificationSummary) => void;
    triggerRef: MutableRefObject<HTMLElement | null>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);
const POLL_INTERVAL_MS = 30_000;

function csrfHeaders(): HeadersInit {
    const xsrfToken = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.split('=')
        .slice(1)
        .join('=');
    return {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': xsrfToken ? decodeURIComponent(xsrfToken) : '',
    };
}

function safeActionPath(url: string): string | null {
    if (!url.startsWith('/') || url.startsWith('//') || url.includes('\\')) return null;
    try {
        const parsed = new URL(url, window.location.origin);
        if (parsed.origin !== window.location.origin) return null;
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return null;
    }
}

export function NotificationProvider({
    children,
    authenticated,
    initialSummary,
    pollInterval = POLL_INTERVAL_MS,
}: {
    children: ReactNode;
    authenticated: boolean;
    initialSummary: NotificationSummary | null;
    pollInterval?: number;
}) {
    const [isAuthenticated, setIsAuthenticated] = useState(authenticated);
    const [summary, setSummary] = useState<NotificationSummary | null>(authenticated ? initialSummary : null);
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLElement | null>(null);

    useEffect(() => router.on('navigate', (event) => {
        const pageProps = event.detail.page.props as {
            session?: SliceSession | null;
            notificationSummary?: NotificationSummary | null;
        };
        const nextAuthenticated = pageProps.notificationSummary != null || Boolean(
            pageProps.session?.authenticated ?? pageProps.session?.isAuthenticated ?? pageProps.session?.userId,
        );
        setIsAuthenticated(nextAuthenticated);
        setSummary(nextAuthenticated ? pageProps.notificationSummary ?? null : null);
    }), []);

    const refreshSummary = useCallback(async (signal?: AbortSignal) => {
        if (!isAuthenticated) return;
        const response = await fetch('/notifications/summary', {
            credentials: 'same-origin',
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            signal,
        });
        if (!response.ok) throw new Error('The notification summary could not be loaded.');
        const payload = await response.json() as { data?: NotificationSummary };
        if (!signal?.aborted && payload.data) setSummary(payload.data);
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;
        let inFlight = false;
        let requestController: AbortController | null = null;
        const refreshWhenVisible = () => {
            if (document.visibilityState !== 'visible' || inFlight) return;
            const controller = new AbortController();
            requestController = controller;
            inFlight = true;
            void refreshSummary(controller.signal)
                .catch(() => undefined)
                .finally(() => {
                    if (requestController === controller) {
                        inFlight = false;
                        requestController = null;
                    }
                });
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                requestController?.abort();
                requestController = null;
                inFlight = false;
                return;
            }
            refreshWhenVisible();
        };
        refreshWhenVisible();
        const timer = window.setInterval(refreshWhenVisible, pollInterval);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            requestController?.abort();
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isAuthenticated, pollInterval, refreshSummary]);

    const value = useMemo(
        () => ({ summary, open, authenticated: isAuthenticated, setOpen, setSummary, triggerRef }),
        [summary, open, isAuthenticated],
    );
    return (
        <NotificationContext.Provider value={value}>
            {children}
            {isAuthenticated && <NotificationInbox />}
        </NotificationContext.Provider>
    );
}

export function NotificationBell() {
    const context = useContext(NotificationContext);
    if (!context) return null;
    const unreadCount = context.summary?.unread_count ?? 0;
    return (
        <button
            type="button"
            disabled={!context.authenticated}
            onClick={(event) => {
                if (!context.authenticated) return;
                context.triggerRef.current = event.currentTarget;
                context.setOpen(true);
            }}
            className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0F2F58] shadow-2xs transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]"
            aria-label={!context.authenticated ? 'Sign in to view notifications' : unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            title={context.authenticated ? 'Notifications' : 'Sign in to view notifications'}
            aria-haspopup={context.authenticated ? 'dialog' : undefined}
            aria-expanded={context.authenticated ? context.open : undefined}
        >
            <Bell className="size-4" aria-hidden="true" />
            {unreadCount > 0 && (
                <span aria-label="Unread notifications" className="absolute -top-1 -right-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-extrabold leading-none text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    );
}

function NotificationInbox() {
    const context = useContext(NotificationContext);
    if (!context) return null;
    const { open, setOpen, setSummary, triggerRef } = context;
    const [items, setItems] = useState<NotificationRecord[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'needs_action' | 'updates'>('needs_action');
    const [acknowledging, setAcknowledging] = useState<string | null>(null);
    const titleId = useId();
    const loadController = useRef<AbortController | null>(null);
    const readController = useRef<AbortController | null>(null);
    const firstActionRef = useRef<HTMLButtonElement>(null);

    const loadPage = useCallback(async (nextCursor: string | null, append: boolean) => {
        if (append) setLoadingMore(true);
        else setLoading(true);
        setError(null);
        const controller = new AbortController();
        loadController.current?.abort();
        loadController.current = controller;
        try {
            const query = nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : '';
            const response = await fetch(`/notifications${query}`, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                signal: controller.signal,
            });
            const payload = await response.json() as Partial<InboxResponse> & { message?: string };
            if (controller.signal.aborted) return;
            if (!response.ok || !Array.isArray(payload.data)) throw new Error(payload.message ?? 'Your notifications could not be loaded.');
            setItems((current) => {
                if (!append) return payload.data as NotificationRecord[];
                const currentIds = new Set(current.map((item) => item.id));
                return [...current, ...(payload.data as NotificationRecord[]).filter((item) => !currentIds.has(item.id))];
            });
            setCursor(payload.next_cursor ?? null);
        } catch (caught) {
            if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Your notifications could not be loaded.');
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, []);

    useEffect(() => {
        if (open) {
            void loadPage(null, false);
            firstActionRef.current?.focus();
            const trapFocus = (event: KeyboardEvent) => {
                if (event.key !== 'Tab') return;
                const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
                const focusable = dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])');
                if (!focusable?.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            };
            document.addEventListener('keydown', trapFocus);
            return () => {
                document.removeEventListener('keydown', trapFocus);
                loadController.current?.abort();
                readController.current?.abort();
            };
        }
        loadController.current?.abort();
        readController.current?.abort();
        setAcknowledging(null);
        triggerRef.current?.focus();
        return undefined;
    }, [open, loadPage, triggerRef]);

    const acknowledgeAndOpen = async (item: NotificationRecord) => {
        if (acknowledging === item.id) return;
        const target = safeActionPath(item.action_url);
        if (!target) {
            setError('This notification does not have a valid destination.');
            return;
        }
        setAcknowledging(item.id);
        setError(null);
        const controller = new AbortController();
        readController.current?.abort();
        readController.current = controller;
        try {
            const response = await fetch(`/notifications/${encodeURIComponent(item.id)}/read`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { ...csrfHeaders(), 'Content-Type': 'application/json' },
                body: '{}',
                signal: controller.signal,
            });
            const payload = await response.json() as ReadResponse & { message?: string };
            if (controller.signal.aborted) return;
            if (!response.ok || !payload.data?.read_at || !payload.data.summary) {
                throw new Error(payload.message ?? 'Could not mark this notification as read. Try again.');
            }
            setSummary(payload.data.summary);
            setItems((current) => current.map((notice) => notice.id === item.id ? { ...notice, read_at: payload.data.read_at } : notice));
            context.setOpen(false);
            router.visit(target);
        } catch (caught) {
            if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Could not mark this notification as read. Try again.');
        } finally {
            if (!controller.signal.aborted) setAcknowledging(null);
        }
    };

    const visibleItems = items.filter((item) => item.attention === tab);
    const actionCount = context.summary?.needs_action_count ?? 0;
    const updatesCount = context.summary?.updates_count ?? 0;

    return (
        <GlovoWaveModal open={open} onClose={() => setOpen(false)} title="Notifications" subtitle="Updates for your account">
            <section aria-labelledby={titleId}>
                <h2 id={titleId} className="sr-only">Notification inbox</h2>
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100">
                    <div role="group" aria-label="Filter notifications" className="flex gap-2">
                        <button ref={firstActionRef} type="button" aria-pressed={tab === 'needs_action'} onClick={() => setTab('needs_action')} className={`min-h-11 border-b-2 px-3 text-sm font-bold ${tab === 'needs_action' ? 'border-[#0F2F58] text-[#0F2F58]' : 'border-transparent text-slate-500'}`}>
                            Your action{actionCount > 0 ? ` (${actionCount})` : ''}
                        </button>
                        <button type="button" aria-pressed={tab === 'updates'} onClick={() => setTab('updates')} className={`min-h-11 border-b-2 px-3 text-sm font-bold ${tab === 'updates' ? 'border-[#0F2F58] text-[#0F2F58]' : 'border-transparent text-slate-500'}`}>
                            Updates{updatesCount > 0 ? ` (${updatesCount})` : ''}
                        </button>
                    </div>
                    <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="ml-auto inline-flex size-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#0F2F58]">
                        <X className="size-4" aria-hidden="true" />
                    </button>
                </div>
                {error && <div role="alert" className="mb-3 rounded-xl border border-rose-200 bg-white p-3 text-sm text-rose-800">{error}<button type="button" onClick={() => void loadPage(null, false)} className="ml-2 font-bold underline">Retry</button></div>}
                {loading && <p role="status" className="flex items-center gap-2 py-8 text-sm text-slate-600"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Loading notifications…</p>}
                {!loading && !error && visibleItems.length === 0 && <p className="py-10 text-center text-sm text-slate-600">{items.length === 0 ? 'No notifications yet.' : tab === 'needs_action' ? 'Nothing needs your action.' : 'No updates yet.'}</p>}
                {!loading && visibleItems.length > 0 && <ul className="space-y-2">
                    {visibleItems.map((item) => {
                        const isReading = acknowledging === item.id;
                        return <li key={item.id}>
                            <button type="button" disabled={isReading} onClick={() => void acknowledgeAndOpen(item)} data-read={item.read_at ? 'true' : 'false'} aria-label={`${item.title}${item.read_at ? ', read' : ', unread'}`} className={`flex min-h-16 w-full items-start gap-3 rounded-xl border bg-white p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#0F2F58] ${item.read_at ? 'border-slate-200' : 'border-blue-200'}`}>
                                <span className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-full ${item.read_at ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-[#0F2F58]'}`} aria-hidden="true">{isReading ? <LoaderCircle className="size-4 animate-spin" /> : item.read_at ? <Check className="size-4" /> : <Bell className="size-4" />}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block font-bold text-slate-900">{item.title}</span>
                                    <span className="mt-1 block text-sm leading-5 text-slate-600">{item.body}</span>
                                    <time className="mt-2 block text-xs text-slate-500" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
                                </span>
                                <ChevronDown className="mt-1 size-4 -rotate-90 text-slate-400" aria-hidden="true" />
                            </button>
                        </li>;
                    })}
                </ul>}
                {cursor && !loading && <button type="button" disabled={loadingMore} onClick={() => void loadPage(cursor, true)} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-[#0F2F58] disabled:opacity-60">{loadingMore && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}{loadingMore ? 'Loading…' : 'Load more'}</button>}
            </section>
        </GlovoWaveModal>
    );
}
