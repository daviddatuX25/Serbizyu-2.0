import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, ShoppingBag } from 'lucide-react';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';
import { BottomNavBar, type NavTabId } from '../../marketplace/components/BottomNavBar';
import { CreatorPostModal } from '../../components/marketplace/CreatorPostModal';
import { QuickDealScanModal } from '../../components/marketplace/QuickDealScanModal';
interface OrderSlotItem {
    ordinal: number;
    title: string;
    provider: string;
    status: 'done' | 'active' | 'gated';
    status_label: string;
}

interface OrderSummaryItem {
    id: string;
    type: 'order' | 'deal_chain';
    title: string;
    order_status: string;
    work_status: string | null;
    amount_minor: number;
    currency: string;
    role: string;
    slots?: OrderSlotItem[];
    slots_count?: number;
    updated_at: string;
    created_at: string;
}
interface OrdersIndexProps {
    ongoing: OrderSummaryItem[];
    history: OrderSummaryItem[];
    counts: {
        ongoing: number;
        history: number;
    };
    session?: unknown;
    readiness?: unknown;
}

function formatPrice(minor: number, currency: string = 'PHP'): string {
    return `${currency} ${(minor / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OrdersIndex(props: OrdersIndexProps) {
    const [activeTab, setActiveTab] = useState<'ongoing' | 'history'>('ongoing');
    const [creatorOpen, setCreatorOpen] = useState(false);
    const [quickDealOpen, setQuickDealOpen] = useState(false);

    const ongoingList = props.ongoing ?? [];
    const historyList = props.history ?? [];

    const getStatusDisplay = (item: OrderSummaryItem) => {
        if (item.type === 'deal_chain') {
            return {
                label: 'Sourcing Partners',
                dotClass: 'bg-blue-500 animate-pulse',
                badgeText: 'Bilateral Escrow',
                badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
            };
        }

        if (item.order_status === 'pending_acceptance') {
            return {
                label: 'Pending Acceptance · Awaiting Provider',
                dotClass: 'bg-amber-500',
                badgeText: 'Cash on Delivery',
                badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
            };
        }

        if (item.work_status === 'in_progress') {
            return {
                label: 'In Progress · ETA ~45 mins',
                dotClass: 'bg-emerald-500 animate-ping',
                badgeText: 'Work Underway',
                badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            };
        }

        if (item.work_status === 'awaiting_signoff' || item.work_status === 'completion_proposed') {
            return {
                label: 'Work Done · Awaiting Customer Sign-off',
                dotClass: 'bg-amber-500',
                badgeText: 'Payment Due',
                badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
            };
        }

        if (item.order_status === 'accepted') {
            return {
                label: 'Accepted · Work Queued',
                dotClass: 'bg-emerald-500',
                badgeText: 'Confirmed',
                badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            };
        }

        if (item.order_status === 'closed') {
            return {
                label: 'Settled & Closed',
                dotClass: 'bg-slate-400',
                badgeText: 'Completed',
                badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
            };
        }

        return {
            label: item.order_status.replace(/_/g, ' '),
            dotClass: 'bg-slate-400',
            badgeText: 'Order',
            badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
            <DesktopGlobalNav activeRoute="orders" />

            {/* Mobile Viewport Shell */}
            <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white pb-[90px] shadow-xs lg:hidden">
                {/* Mobile Orders Topbar */}
                <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur">
                    <Link
                        href="/browse"
                        className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
                        aria-label="Back to browse"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <h1 className="text-sm font-extrabold tracking-tight text-[#0F2F58]">
                        Orders &amp; Deals
                    </h1>
                    <Link
                        href="/picks"
                        className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
                        aria-label="View picks tray"
                    >
                        <ShoppingBag className="size-4 text-[#0F2F58]" />
                    </Link>
                </header>

                {/* Glovo Segmented Tab Bar (Ongoing vs History) */}
                <div className="border-b border-slate-100 bg-[#FAFCFB] p-2.5">
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('ongoing')}
                            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
                                activeTab === 'ongoing'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <span>Ongoing</span>
                            <span
                                className={`py-0.2 rounded-full px-1.5 text-[10px] font-extrabold ${
                                    activeTab === 'ongoing'
                                        ? 'bg-[#FFC244] text-[#0F2F58]'
                                        : 'bg-slate-200 text-slate-600'
                                }`}
                            >
                                {ongoingList.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('history')}
                            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
                                activeTab === 'history'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <span>History</span>
                            <span
                                className={`py-0.2 rounded-full px-1.5 text-[10px] font-extrabold ${
                                    activeTab === 'history'
                                        ? 'bg-[#FFC244] text-[#0F2F58]'
                                        : 'bg-slate-200 text-slate-600'
                                }`}
                            >
                                {historyList.length}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Content Stream */}
                <main className="flex-1 space-y-3.5 p-4">
                    {activeTab === 'ongoing' ? (
                        ongoingList.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-center">
                                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-blue-50 text-[#0F2F58]">
                                    <ShoppingBag className="size-6" />
                                </div>
                                <h3 className="text-sm font-extrabold text-slate-900">
                                    No ongoing orders
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                    You don't have any active orders or staged deal chains in
                                    Tagudin right now.
                                </p>
                                <Link
                                    href="/browse"
                                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#0F2F58] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#153e74]"
                                >
                                    <span>Explore Marketplace</span>
                                    <ArrowRight className="size-3.5" />
                                </Link>
                            </div>
                        ) : (
                            ongoingList.map((item) => {
                                const statusInfo = getStatusDisplay(item);
                                const targetUrl =
                                    item.type === 'deal_chain'
                                        ? `/deal-chains/${item.id}`
                                        : `/orders/${item.id}`;

                                return (
                                    <article
                                        key={item.id}
                                        className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_rgba(15,47,88,0.05)]"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                                    {item.type === 'deal_chain'
                                                        ? 'Deal Chain'
                                                        : 'Order'}{' '}
                                                    #{item.id.slice(0, 8).toUpperCase()}
                                                </div>
                                                <h3 className="mt-0.5 text-sm font-extrabold text-slate-900">
                                                    {item.title}
                                                </h3>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono text-sm font-extrabold text-[#0F2F58]">
                                                    {formatPrice(item.amount_minor, item.currency)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Banner with Pulsing Dot */}
                                        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`size-2 rounded-full ${statusInfo.dotClass}`}
                                                />
                                                <span className="font-bold text-slate-800">
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                            <span
                                                className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${statusInfo.badgeClass}`}
                                            >
                                                {statusInfo.badgeText}
                                            </span>
                                        </div>

                                        {/* Slots Strip for Deal Chain (matching orders-mobile.html:542-564) */}
                                        {item.type === 'deal_chain' && Array.isArray(item.slots) && item.slots.length > 0 && (
                                            <div className="flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-[#F8FAFC] p-3">
                                                {item.slots.map((s) => (
                                                    <div key={s.ordinal} className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <span className="font-semibold text-slate-800">
                                                                {s.ordinal}. {s.title}
                                                            </span>
                                                            <span className="text-[10.5px] text-slate-400 truncate">
                                                                · {s.provider}
                                                            </span>
                                                        </div>
                                                        <span
                                                            className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ${
                                                                s.status === 'done'
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : s.status === 'active'
                                                                      ? 'bg-amber-100 text-amber-800'
                                                                      : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                        >
                                                            {s.status_label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <Link
                                            href={targetUrl}
                                            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#0F2F58] text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-[#153e74]"
                                        >
                                            <span>Track Order Details</span>
                                            <ArrowRight className="size-3.5" />
                                        </Link>
                                    </article>
                                );
                            })
                        )
                    ) : historyList.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-center">
                            <Clock className="mx-auto mb-2 size-10 stroke-[1.5] text-slate-400" />
                            <h3 className="text-sm font-extrabold text-slate-900">
                                No order history yet
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Completed orders and mutual review receipts will appear here.
                            </p>
                        </div>
                    ) : (
                        historyList.map((item) => (
                            <article
                                key={item.id}
                                className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400">
                                            #{item.id.slice(0, 8).toUpperCase()} ·{' '}
                                            {item.updated_at.slice(0, 10)}
                                        </div>
                                        <h3 className="mt-0.5 text-sm font-bold text-slate-900">
                                            {item.title}
                                        </h3>
                                    </div>
                                    <div className="font-mono text-xs font-bold text-slate-800">
                                        {formatPrice(item.amount_minor, item.currency)}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-xs text-slate-500">
                                    <div className="flex items-center gap-1 font-bold text-emerald-700">
                                        <CheckCircle2 className="size-3.5" />
                                        <span>Completed</span>
                                    </div>
                                    <Link
                                        href={`/orders/${item.id}`}
                                        className="font-bold text-[#0F2F58] hover:underline"
                                    >
                                        View Receipt →
                                    </Link>
                                </div>
                            </article>
                        ))
                    )}
                </main>

                {/* Bottom Navigation */}
                <BottomNavBar
                    activeTab="orders"
                    ordersCount={ongoingList.length}
                    onTabSelect={(tab: NavTabId) => {
                        if (tab === 'explore') router.visit('/browse');
                        if (tab === 'post') setCreatorOpen(true);
                        if (tab === 'quick_deal') setQuickDealOpen(true);
                        if (tab === 'orders') setActiveTab('ongoing');
                        if (tab === 'profile') router.visit('/my-listings');
                    }}
                    onQuickDealClick={() => setQuickDealOpen(true)}
                />

                {/* Creator Drawer Modal */}
                <CreatorPostModal open={creatorOpen} onClose={() => setCreatorOpen(false)} />

                {/* Quick Deal Scanner Modal */}
                <QuickDealScanModal open={quickDealOpen} onClose={() => setQuickDealOpen(false)} />
            </div>

            {/* Desktop Container (Hidden on Mobile) */}
            <div className="mx-auto hidden max-w-5xl px-6 py-10 lg:block">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-[#0F2F58]">
                            Orders &amp; Deals Hub
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Manage ongoing work, milestone evidence, and closed receipts in Tagudin.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Ongoing Column */}
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                Ongoing Orders ({ongoingList.length})
                            </h2>
                        </div>
                        {ongoingList.length === 0 ? (
                            <p className="py-4 text-xs text-slate-400">
                                No active orders right now.
                            </p>
                        ) : (
                            ongoingList.map((item) => (
                                <div
                                    key={item.id}
                                    className="space-y-2 rounded-xl border border-slate-200 p-4 transition-colors hover:border-[#0F2F58]"
                                >
                                    <div className="flex items-start justify-between">
                                        <span className="text-xs font-bold text-slate-900">
                                            {item.title}
                                        </span>
                                        <span className="font-mono text-xs font-extrabold text-[#0F2F58]">
                                            {formatPrice(item.amount_minor)}
                                        </span>
                                    </div>
                                    <Link
                                        href={
                                            item.type === 'deal_chain'
                                                ? `/deal-chains/${item.id}`
                                                : `/orders/${item.id}`
                                        }
                                        className="text-xs font-bold text-blue-700 hover:underline"
                                    >
                                        Track Order →
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>

                    {/* History Column */}
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-extrabold tracking-wider text-slate-500 uppercase">
                                History ({historyList.length})
                            </h2>
                        </div>
                        {historyList.length === 0 ? (
                            <p className="py-4 text-xs text-slate-400">No completed orders yet.</p>
                        ) : (
                            historyList.map((item) => (
                                <div
                                    key={item.id}
                                    className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-3.5"
                                >
                                    <div className="flex items-start justify-between">
                                        <span className="text-xs font-semibold text-slate-800">
                                            {item.title}
                                        </span>
                                        <span className="font-mono text-xs text-slate-700">
                                            {formatPrice(item.amount_minor)}
                                        </span>
                                    </div>
                                    <Link
                                        href={`/orders/${item.id}`}
                                        className="text-[11px] font-bold text-[#0F2F58] hover:underline"
                                    >
                                        View Details →
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
