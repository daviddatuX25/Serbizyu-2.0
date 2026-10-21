import { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    Clock,
    Lock,
    MessageSquare,
    Phone,
    Send,
    ShieldCheck,
    Sparkles,
    Star,
    X,
} from 'lucide-react';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';
import ReviewCeremonyModal from '../../components/reviews/ReviewCeremonyModal';

interface DealChainRecord {
    id: string;
    coordinator_user_id: string;
    status: string;
    title: string;
    goal: string;
    total_budget_amount?: number | null;
    currency_code?: string | null;
    financial_state?: string;
    child_order_count?: number;
    created_at: string;
}

interface DealNeedRecord {
    id: string;
    deal_chain_id: string;
    ordinal: number;
    need_kind: string;
    title: string;
    listing_title?: string | null;
    description: string;
    status: string;
    requested_at: string;
    child_order_id?: string | null;
    order_reference?: string | null;
    child_order_status?: string | null;
    work_status?: string | null;
    payment_obligation_status?: string | null;
    amount_minor?: number | null;
    currency?: string | null;
    amount_source?: string | null;
    provider_name?: string | null;
    provider_phone?: string | null;
    can_view_order?: boolean;
}

interface DealDependencyRecord {
    id: string;
    deal_chain_id: string;
    predecessor_need_id: string;
    successor_need_id: string;
    dependency_type: string;
    status: string;
    condition_code: string;
}

interface DealChainDetailProps {
    chain: DealChainRecord;
    slots: DealNeedRecord[];
    dependencies: DealDependencyRecord[];
    notice?: string | null;
    view?: 'project' | 'worker';
    worker?: string | null;
}

interface ChatMessage {
    id: string;
    sender: string;
    role: 'buyer' | 'store' | 'courier' | 'technician' | 'system';
    text: string;
    time: string;
}

function statusLabel(status: string): string {
    const labels: Record<string, string> = {
        open: 'Open · Sourcing',
        sourcing: 'Sourcing',
        invited: 'Provider invited',
        quoted: 'Quote received',
        accepted: 'Accepted',
        in_progress: 'In progress',
        completed: 'Completed',
        blocked: 'Gated / Blocked',
        cancelled: 'Cancelled',
        failed: 'Failed',
        awaiting_signoff: 'Needs Sign-off',
    };

    return labels[status] ?? status.replaceAll('_', ' ');
}

function statusTone(status: string): string {
    if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (status === 'in_progress' || status === 'accepted')
        return 'border-sky-200 bg-sky-50 text-sky-800';
    if (status === 'blocked' || status === 'failed')
        return 'border-amber-200 bg-amber-50 text-amber-900';
    if (status === 'cancelled') return 'border-slate-200 bg-slate-100 text-slate-600';

    return 'border-blue-200 bg-blue-50 text-blue-900';
}

function slotImage(slot: DealNeedRecord): string {
    const title = slot.title.toLowerCase();
    if (slot.need_kind === 'product' || title.includes('capacitor') || title.includes('part') || title.includes('store') || title.includes('hardware') || title.includes('inverter')) {
        return '/photos/ac-capacitor.jpg';
    }
    if (title.includes('courier') || title.includes('transit') || title.includes('delivery') || title.includes('rider')) {
        return '/photos/courier.jpg';
    }
    if (title.includes('audit') || title.includes('safety') || title.includes('inspect') || title.includes('electrician')) {
        return '/photos/req-electrician.jpg';
    }
    if (title.includes('bibingka') || title.includes('food') || title.includes('bake')) {
        return '/photos/bibingka.jpg';
    }
    return '/photos/ac-clean.jpg';
}

function slotRoleBadge(slot: DealNeedRecord): { label: string; bg: string; text: string } {
    const title = slot.title.toLowerCase();
    if (slot.need_kind === 'product' || title.includes('capacitor') || title.includes('hardware') || title.includes('inverter')) {
        return { label: 'STORE', bg: 'bg-amber-500', text: 'text-white' };
    }
    if (title.includes('courier') || title.includes('transit') || title.includes('delivery')) {
        return { label: 'COURIER', bg: 'bg-sky-500', text: 'text-white' };
    }
    if (title.includes('audit') || title.includes('safety')) {
        return { label: 'AUDIT', bg: 'bg-purple-600', text: 'text-white' };
    }
    return { label: 'LABOR', bg: 'bg-emerald-600', text: 'text-white' };
}

function formatAmount(slot: DealNeedRecord): string {
    if (slot.amount_minor === null || slot.amount_minor === undefined) {
        return 'Amount pending provider terms';
    }

    return `${slot.currency ?? 'PHP'} ${(slot.amount_minor / 100).toFixed(2)}`;
}

export default function DealChainDetail({
    chain,
    slots,
    dependencies,
    notice,
    view = 'project',
    worker = null,
}: DealChainDetailProps) {
    const shortId = chain.id ? chain.id.substring(0, 8).toUpperCase() : 'DC';
    const slotsById = new Map(slots.map((slot) => [slot.id, slot]));
    const summaryAmount =
        chain.total_budget_amount === null || chain.total_budget_amount === undefined
            ? null
            : `${chain.currency_code ?? 'PHP'} ${chain.total_budget_amount.toFixed(2)}`;
    const contextLabel =
        view === 'worker' && worker
            ? `Server projection for ${worker}.`
            : 'Coordinator project projection.';
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatActiveSlot, setChatActiveSlot] = useState<DealNeedRecord | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'm1',
            sender: 'Tagudin Hardware Depot',
            role: 'store',
            text: 'Materials packed and verified at Counter Lane 2. Ready for courier dispatch.',
            time: '1:12 PM',
        },
        {
            id: 'm2',
            sender: 'Danny Express Rider',
            role: 'courier',
            text: 'Package picked up from hardware! En route to jobsite gate via Poblacion East.',
            time: '1:15 PM',
        },
        {
            id: 'm3',
            sender: 'Kuya Ben AC Services',
            role: 'technician',
            text: 'On-site prepping indoor unit. Will begin installation once courier drops off the parts.',
            time: '1:18 PM',
        },
    ]);

    const isCompleted =
        chain.status === 'completed' ||
        slots.length > 0 && slots.every(
            (s) =>
                s.status === 'completed' ||
                s.child_order_status === 'completed' ||
                s.child_order_status === 'closed',
        );

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;
        const newMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            sender: 'Coordinator (You)',
            role: 'buyer',
            text: chatInput.trim(),
            time: 'Just now',
        };
        setMessages((prev) => [...prev, newMsg]);
        setChatInput('');
    };

    const handleQuickPrompt = (prompt: string) => {
        setChatInput(prompt);
    };

    const openChatForSlot = (slot: DealNeedRecord) => {
        setChatActiveSlot(slot);
        setChatOpen(true);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 pb-20">
            <DesktopGlobalNav />

            {/* Mobile Sticky Topbar */}
            <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
                <Link
                    href="/orders"
                    className="flex size-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
                    aria-label="Back to Orders"
                >
                    <ArrowLeft className="size-5" />
                </Link>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[#0F2F58]">
                        Deal Chain #{shortId}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-800">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Relay
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setChatActiveSlot(null);
                        setChatOpen(true);
                    }}
                    className="flex size-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
                    title="Team Coordination Chat"
                >
                    <MessageSquare className="size-5 text-[#0F2F58]" />
                </button>
            </header>

            <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
                {/* Desktop Breadcrumbs */}
                <div className="hidden items-center justify-between lg:flex">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Link
                            href="/orders"
                            className="flex items-center gap-1 hover:text-[#0F2F58] font-bold text-slate-700"
                        >
                            <ArrowLeft className="size-3.5" />
                            <span>Orders Hub</span>
                        </Link>
                        <span>/</span>
                        <span className="font-extrabold text-slate-900">
                            Deal Chain #{shortId} Multi-Party Relay
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setChatActiveSlot(null);
                            setChatOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-extrabold text-[#0F2F58] shadow-2xs hover:bg-slate-50"
                    >
                        <MessageSquare className="size-3.5 text-sky-600" />
                        <span>Team Relay Chat</span>
                    </button>
                </div>

                {notice && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-xs font-bold text-blue-950 shadow-xs">
                        <ShieldCheck className="size-5 shrink-0 text-[#0F2F58]" />
                        <span>{notice}</span>
                    </div>
                )}

                {isCompleted && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-xs">
                        <div className="flex items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                                <Star className="size-5 fill-amber-300 text-amber-300" />
                            </div>
                            <div>
                                <h2 className="text-sm font-extrabold text-[#06362e]">
                                    Deal Chain Relay Completed · Rate Team
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-600">
                                    Review all participating merchants, couriers, and technicians with unified feedback.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            data-testid="rate-deal-chain-btn"
                            onClick={() => setReviewModalOpen(true)}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0D715F] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#0a574a]"
                        >
                            <Star className="size-4 fill-amber-300 text-amber-300" />
                            <span>Rate Team ({slots.length} Providers)</span>
                        </button>
                    </div>
                )}

                {/* Macro Hero Header Card */}
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold tracking-wider text-slate-500 uppercase">
                                Multi-Party Deal Chain #{shortId}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {slots.length}-Slot Orchestrated Relay
                            </span>
                        </div>
                        <span className="text-right font-mono text-base font-extrabold text-[#0F2F58]">
                            {summaryAmount
                                ? `${summaryAmount} · Derived child total`
                                : 'No child terms formed'}
                        </span>
                    </div>

                    <div>
                        <h1 className="text-xl font-black text-slate-900 sm:text-2xl">
                            {chain.title || 'Deal Chain Coordination Plan'}
                        </h1>
                        <p className="mt-1 text-sm text-slate-600 leading-relaxed">{chain.goal}</p>
                    </div>

                    <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-950">
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-blue-500" />
                        <span>
                            <strong>{contextLabel}</strong> Chain status:{' '}
                            <span className="font-semibold">{statusLabel(chain.status)}</span>. Because
                            deal coordination aggregates never write directly to orders or payment obligations,
                            this chain has no parent escrow.
                        </span>
                    </div>
                </section>

                {/* Child Orders / Listing Pool Section */}
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <div>
                            <h2 className="text-xs font-black tracking-wider text-[#0F2F58] uppercase">
                                Execution Relay Pool ({slots.length} Slots · {dependencies.length} Edge Rules)
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Click any child order below to inspect task gates, milestone evidence, and communication.
                            </p>
                        </div>
                        <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-800">
                            DAG Dependencies
                        </span>
                    </div>

                    {slots.map((slot) => {
                        const effectiveStatus =
                            slot.work_status ?? slot.child_order_status ?? slot.status;
                        const outgoingDependencies = dependencies.filter(
                            (dependency) => dependency.predecessor_need_id === slot.id,
                        );
                        const incomingDependencies = dependencies.filter(
                            (dependency) => dependency.successor_need_id === slot.id,
                        );

                        const hasChildOrder = Boolean(slot.child_order_id);
                        const roleMeta = slotRoleBadge(slot);

                        return (
                            <div key={slot.id} className="space-y-3">
                                <article
                                    className={`rounded-2xl border p-5 shadow-xs transition-all ${
                                        effectiveStatus === 'in_progress'
                                            ? 'border-sky-300 bg-white ring-2 ring-sky-100'
                                            : effectiveStatus === 'completed'
                                            ? 'border-emerald-200 bg-white/90'
                                            : effectiveStatus === 'blocked'
                                            ? 'border-slate-200 bg-slate-50/70'
                                            : 'border-slate-200 bg-white'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex min-w-0 flex-1 items-start gap-3.5">
                                            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                                                <img
                                                    src={slotImage(slot)}
                                                    alt={slot.title}
                                                    className="size-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = '/photos/ac-clean.jpg';
                                                    }}
                                                />
                                                <span
                                                    className={`absolute bottom-0 inset-x-0 ${roleMeta.bg} text-[7.5px] font-extrabold ${roleMeta.text} text-center uppercase py-0.2 tracking-wider`}
                                                >
                                                    {roleMeta.label}
                                                </span>
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-black text-slate-600 uppercase">
                                                        Slot #{slot.ordinal}
                                                    </span>
                                                    {slot.order_reference && (
                                                        <span className="shrink-0 rounded-md bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[9.5px] font-extrabold text-blue-700">
                                                            {slot.order_reference}
                                                        </span>
                                                    )}
                                                    <h3 className="text-sm font-extrabold text-slate-900 break-words leading-tight">
                                                        {slot.listing_title || slot.title}
                                                    </h3>
                                                </div>

                                                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                                                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                                        <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                                                        <span>{slot.provider_name ?? 'Assigned Partner'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="max-w-[45%] shrink-0 text-right">
                                            <span className="font-mono text-sm font-black text-[#0F2F58]">
                                                {formatAmount(slot)}
                                            </span>
                                            <div className="mt-1">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${statusTone(
                                                        effectiveStatus,
                                                    )}`}
                                                >
                                                    {effectiveStatus === 'completed' && <Check className="size-3" />}
                                                    {effectiveStatus === 'in_progress' && <Clock className="size-3" />}
                                                    {effectiveStatus === 'blocked' && <Lock className="size-3" />}
                                                    {statusLabel(effectiveStatus)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar for this Child Order / Slot */}
                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-3.5">
                                        <div className="flex items-center gap-2">
                                            {slot.provider_phone && (
                                                <a
                                                    href={`tel:${slot.provider_phone}`}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                    title={`Call ${slot.provider_name ?? 'Provider'}`}
                                                >
                                                    <Phone className="size-3 text-slate-500" />
                                                    <span>Call</span>
                                                </a>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => openChatForSlot(slot)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                            >
                                                <MessageSquare className="size-3 text-sky-600" />
                                                <span>Message</span>
                                            </button>
                                        </div>

                                        {hasChildOrder ? (
                                            <Link
                                                href={`/orders/${slot.child_order_id}`}
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F2F58] px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#0c2444] transition-all"
                                            >
                                                <span>View Task Details</span>
                                                <span className="text-[10px]">→</span>
                                            </Link>
                                        ) : (
                                            <span className="text-xs font-semibold text-slate-500">
                                                No child Order formed
                                            </span>
                                        )}
                                    </div>
                                </article>

                                {/* Outgoing Dependency Visual Connectors */}
                                {outgoingDependencies.length > 0 && (
                                    <div className="flex flex-wrap items-center justify-center gap-2 py-1">
                                        <div className="h-4 w-0.5 bg-slate-300" />
                                        {outgoingDependencies.map((dependency) => {
                                            const successor = slotsById.get(dependency.successor_need_id);
                                            return (
                                                <span
                                                    key={dependency.id}
                                                    className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-extrabold text-sky-800 shadow-2xs"
                                                >
                                                    <Sparkles className="size-3 text-sky-600" />
                                                    <span>
                                                        {dependency.condition_code} → Slot #{successor?.ordinal ?? '?'}
                                                    </span>
                                                </span>
                                            );
                                        })}
                                        <div className="h-4 w-0.5 bg-slate-300" />
                                    </div>
                                )}

                                {incomingDependencies.length > 0 && (
                                    <div className="text-center text-[10px] font-semibold text-slate-400">
                                        Gated by predecessor requirement:{' '}
                                        <span className="font-bold text-slate-600">
                                            {incomingDependencies.map((d) => d.condition_code).join(', ')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Team Coordination & Direct Messaging Drawer */}
            {chatOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
                    onClick={() => setChatOpen(false)}
                >
                    <div
                        className="flex h-[85vh] sm:h-[640px] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black text-[#0F2F58] truncate">
                                        {chatActiveSlot
                                            ? `Direct Chat · ${chatActiveSlot.provider_name ?? 'Provider'}`
                                            : `Deal Chain #${shortId} Coordination Room`}
                                    </h3>
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold text-emerald-800">
                                        Relay Active
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate">
                                    {chatActiveSlot
                                        ? `Slot #${chatActiveSlot.ordinal}: ${chatActiveSlot.title}`
                                        : `${slots.length} participants: Buyer, Store, Courier, Technician`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setChatOpen(false)}
                                className="flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/70"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Message Stream */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
                            {messages.map((m) => {
                                const isSelf = m.role === 'buyer';
                                return (
                                    <div
                                        key={m.id}
                                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1 px-1">
                                            <span className="text-[10px] font-extrabold text-slate-600">
                                                {m.sender}
                                            </span>
                                            <span className="text-[9px] text-slate-400">{m.time}</span>
                                        </div>
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed ${
                                                isSelf
                                                    ? 'bg-[#0F2F58] text-white shadow-xs rounded-br-xs'
                                                    : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-xs'
                                            }`}
                                        >
                                            {m.text}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Quick Prompts Bar */}
                        <div className="border-t border-slate-100 bg-white px-4 py-2 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                            <button
                                type="button"
                                onClick={() => handleQuickPrompt('Where are you now?')}
                                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:bg-slate-100 font-bold"
                            >
                                Where are you now?
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickPrompt('Parts are on-site.')}
                                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:bg-slate-100 font-bold"
                            >
                                Parts are on-site
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickPrompt('Proceeding with load test.')}
                                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:bg-slate-100 font-bold"
                            >
                                Proceeding with load test
                            </button>
                        </div>

                        {/* Input Composer */}
                        <div className="border-t border-slate-200 bg-white p-3.5">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendMessage();
                                }}
                                className="flex items-center gap-2"
                            >
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={
                                        chatActiveSlot
                                            ? `Message ${chatActiveSlot.provider_name ?? 'provider'}...`
                                            : 'Send relay update to team...'
                                    }
                                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0F2F58] focus:bg-white focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={!chatInput.trim()}
                                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0D715F] text-white shadow-xs hover:bg-[#0a574a] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                                >
                                    <Send className="size-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Ceremony Modal */}
            <ReviewCeremonyModal
                dealChainId={chain.id}
                referenceTitle={chain.title || 'Deal Chain Project'}
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                targets={slots
                    .filter((s) => s.child_order_id)
                    .map((s) => ({
                        orderId: s.child_order_id!,
                        providerName: s.provider_name ?? 'Provider',
                        role: s.need_kind,
                        title: s.listing_title ?? s.title,
                    }))}
            />
        </div>
    );
}
