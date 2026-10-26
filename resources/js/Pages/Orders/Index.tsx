import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, ShoppingBag } from 'lucide-react';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';
import { BottomNavBar, type NavTabId } from '../../marketplace/components/BottomNavBar';
import { CreatorPostModal } from '../../components/marketplace/CreatorPostModal';
import { QuickDealScanModal } from '../../components/marketplace/QuickDealScanModal';
export type SlotProgressState =
    | 'completed'
    | 'in_transit'
    | 'counter_ready'
    | 'on_site_prep'
    | 'awaiting_signoff'
    | 'partner_confirmed'
    | 'invited'
    | 'sourcing'
    | 'blocked'
    | 'replacement_needed'
    | 'done'
    | 'active'
    | 'gated';

interface OrderSlotItem {
    ordinal: number;
    title: string;
    provider: string;
    status: SlotProgressState;
    status_label: string;
}
interface OrderSummaryItem {
    id: string;
    type: 'order' | 'deal_chain';
    title: string | null;
    order_status: string;
    work_status: string | null;
    amount_minor: number | null;
    currency: string | null;
    role: string;
    public_reference: string | null;
    slots?: OrderSlotItem[];
    slots_count?: number;
    updated_at: string;
    created_at: string;
}

type QueueSection = 'needsAction' | 'active' | 'done';

interface OrdersIndexProps {
    needsAction: OrderSummaryItem[];
    active: OrderSummaryItem[];
    done: OrderSummaryItem[];
    counts: {
        needsAction: number;
        active: number;
        done: number;
    };
    session?: unknown;
    readiness?: unknown;
}

function formatPrice(minor: number | null, currency: string | null): string | null {
    if (minor === null || currency === null) return null;
    return `${currency} ${(minor / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getSlotBadgeStyle(status: SlotProgressState | string): string {
    switch (status) {
        case 'completed':
        case 'done':
            return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
        case 'in_transit':
            return 'bg-blue-100 text-blue-800 border border-blue-200';
        case 'counter_ready':
            return 'bg-sky-100 text-sky-800 border border-sky-200';
        case 'on_site_prep':
            return 'bg-teal-100 text-teal-800 border border-teal-200';
        case 'awaiting_signoff':
            return 'bg-amber-100 text-amber-900 border border-amber-200/80';
        case 'partner_confirmed':
            return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
        case 'invited':
            return 'bg-purple-100 text-purple-800 border border-purple-200';
        case 'blocked':
        case 'gated':
        case 'replacement_needed':
            return 'bg-amber-50 text-amber-900 border border-amber-200/80';
        case 'sourcing':
        default:
            return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
}
export default function OrdersIndex(props: OrdersIndexProps) {
    const [activeSection, setActiveSection] = useState<QueueSection>('needsAction');
    const [creatorOpen, setCreatorOpen] = useState(false);
    const [quickDealOpen, setQuickDealOpen] = useState(false);
    const sections: { key: QueueSection; label: string; items: OrderSummaryItem[]; count: number }[] = [
        { key: 'needsAction', label: 'Needs Action', items: props.needsAction, count: props.counts.needsAction },
        { key: 'active', label: 'Active', items: props.active, count: props.counts.active },
        { key: 'done', label: 'Done', items: props.done, count: props.counts.done },
    ];
    const selected = sections.find((section) => section.key === activeSection) ?? sections[0];
    const queueLabel = (item: OrderSummaryItem) => {
        const status = item.work_status ?? item.order_status;
        return status.replaceAll('_', ' ');
    };
    const renderItem = (item: OrderSummaryItem) => {
        const targetUrl = item.type === 'deal_chain' ? `/deal-chains/${item.id}` : `/orders/${item.id}`;
        const amount = formatPrice(item.amount_minor, item.currency);

        return (
            <article key={`${item.type}-${item.id}`} className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_rgba(15,47,88,0.05)]">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                            {item.type === 'deal_chain' ? 'Deal Chain' : 'Order'}{item.public_reference ? ` · ${item.public_reference}` : ''}
                        </div>
                        <h3 className="mt-0.5 text-sm font-extrabold text-slate-900">{item.title ?? 'Order'}</h3>
                    </div>
                    {amount ? (
                        <span className="shrink-0 font-mono text-sm font-extrabold text-[#0F2F58]">{amount}</span>
                    ) : (
                        <span className="shrink-0 text-right text-[11px] font-semibold text-slate-500">Terms not yet agreed</span>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-slate-400" aria-hidden="true" />
                        <span className="font-bold capitalize text-slate-800">{queueLabel(item)}</span>
                    </div>
                    <span className="text-slate-500">{item.role.replaceAll('_', ' ')}</span>
                </div>
                {item.type === 'deal_chain' && item.slots && item.slots.length > 0 && (
                    <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-[#F8FAFC] p-3">
                        <div className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                            {item.slots.length} {item.slots.length === 1 ? 'slot' : 'slots'}
                        </div>
                        {item.slots.map((slot) => (
                            <div key={slot.ordinal} className="flex items-center justify-between gap-2 text-xs">
                                <div className="flex min-w-0 items-center gap-1.5 truncate">
                                    <span className="shrink-0 font-semibold text-slate-800">{slot.ordinal}. {slot.title}</span>
                                    <span className="truncate text-[10.5px] text-slate-400">· {slot.provider}</span>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ${getSlotBadgeStyle(slot.status)}`}>
                                    {slot.status_label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <Link href={targetUrl} className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#0F2F58] text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-[#153e74] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]">
                    <span>View details</span>
                    <ArrowRight className="size-3.5" />
                </Link>
            </article>
        );
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
            <DesktopGlobalNav activeRoute="orders" />
            <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-white pb-[90px] shadow-xs lg:hidden">
                <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur">
                    <Link href="/browse" className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label="Back to browse">
                        <ArrowLeft className="size-4" />
                    </Link>
                    <h1 className="text-sm font-extrabold tracking-tight text-[#0F2F58]">Orders &amp; Deals</h1>
                    <Link href="/picks" className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label="View picks tray">
                        <ShoppingBag className="size-4 text-[#0F2F58]" />
                    </Link>
                </header>

                <div className="border-b border-slate-100 bg-[#FAFCFB] p-2.5">
                    <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                        {sections.map(({ key, label, count }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setActiveSection(key)}
                                aria-pressed={activeSection === key}
                                className={`flex min-h-10 items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58] ${activeSection === key ? 'bg-[#0F2F58] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <span>{label}</span>
                                <span className={`rounded-full px-1.5 text-[10px] font-extrabold ${activeSection === key ? 'bg-[#FFC244] text-[#0F2F58]' : 'bg-slate-200 text-slate-600'}`}>{count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <nav aria-label="Order tools" className="flex items-center justify-end gap-4 border-b border-slate-100 bg-white px-4 py-2">
                    <Link href="/stock" className="text-xs font-bold text-[#0F2F58] underline underline-offset-2">Stock ledger</Link>
                    <Link href="/money-history" className="text-xs font-bold text-[#0F2F58] underline underline-offset-2">Money history</Link>
                </nav>
                <main className="flex-1 space-y-3.5 p-4">
                    {selected.items.length > 0 ? (
                        selected.items.map(renderItem)
                    ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-center">
                            {activeSection === 'done' ? <CheckCircle2 className="mx-auto mb-2 size-10 stroke-[1.5] text-slate-400" /> : <Clock className="mx-auto mb-2 size-10 stroke-[1.5] text-slate-400" />}
                            <h2 className="text-sm font-extrabold text-slate-900">No {activeSection === 'needsAction' ? 'orders needing action' : activeSection === 'active' ? 'active orders' : 'completed or cancelled orders'} yet</h2>
                            <p className="mt-1 text-xs text-slate-500">Your order queue will update when an order changes.</p>
                            {activeSection === 'needsAction' && (
                                <Link href="/browse" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#0F2F58] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#153e74]">
                                    Explore Marketplace <ArrowRight className="size-3.5" />
                                </Link>
                            )}
                        </div>
                    )}
                </main>

                <BottomNavBar
                    activeTab="orders"
                    ordersCount={props.counts.needsAction + props.counts.active}
                    onTabSelect={(tab: NavTabId) => {
                        if (tab === 'explore') router.visit('/browse');
                        if (tab === 'post') setCreatorOpen(true);
                        if (tab === 'quick_deal') setQuickDealOpen(true);
                        if (tab === 'orders') setActiveSection('needsAction');
                        if (tab === 'invitations') router.visit('/deal-invitations');
                        if (tab === 'profile') router.visit('/my-listings');
                    }}
                    onQuickDealClick={() => setQuickDealOpen(true)}
                />
                <CreatorPostModal open={creatorOpen} onClose={() => setCreatorOpen(false)} />
                <QuickDealScanModal open={quickDealOpen} onClose={() => setQuickDealOpen(false)} />
            </div>

            <main className="mx-auto hidden max-w-7xl px-6 py-10 lg:block">
                <div className="mb-8 flex items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-[#0F2F58]">Orders &amp; Deals</h1>
                        <p className="mt-1 text-sm text-slate-500">See what needs your attention, what is active, and what is complete.</p>
                    </div>
                    <nav aria-label="Order tools" className="flex items-center gap-4">
                        <Link href="/stock" className="text-sm font-bold text-[#0F2F58] underline underline-offset-2">Stock ledger</Link>
                    </nav>
                </div>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    {sections.map(({ key, label, items, count }) => (
                        <section key={key} aria-label={label} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h2 className="text-sm font-extrabold tracking-wider text-[#0F2F58] uppercase">{label}</h2>
                                <span className="rounded-full bg-[#FFC244] px-2 py-0.5 text-xs font-extrabold text-[#0F2F58]">{count}</span>
                            </div>
                            {items.length > 0 ? items.map(renderItem) : <p className="py-4 text-xs text-slate-400">No {label.toLowerCase()} orders.</p>}
                        </section>
                    ))}
                </div>
            </main>
        </div>
    );
}

