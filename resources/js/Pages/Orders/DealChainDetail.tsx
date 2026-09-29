import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Check, Clock, Lock, ShieldCheck, Star } from 'lucide-react';
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
    description: string;
    status: string;
    requested_at: string;
    child_order_id?: string | null;
    child_order_status?: string | null;
    work_status?: string | null;
    payment_obligation_status?: string | null;
    amount_minor?: number | null;
    currency?: string | null;
    amount_source?: string | null;
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

function statusLabel(status: string): string {
    const labels: Record<string, string> = {
        open: 'Open · Sourcing',
        sourcing: 'Sourcing',
        invited: 'Provider invited',
        quoted: 'Quote received',
        accepted: 'Accepted',
        in_progress: 'In progress',
        completed: 'Completed',
        blocked: 'Blocked',
        cancelled: 'Cancelled',
        failed: 'Failed',
    };

    return labels[status] ?? status.replaceAll('_', ' ');
}

function statusTone(status: string): string {
    if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (status === 'in_progress' || status === 'accepted')
        return 'border-sky-200 bg-sky-50 text-sky-800';
    if (status === 'blocked' || status === 'failed')
        return 'border-rose-200 bg-rose-50 text-rose-800';
    if (status === 'cancelled') return 'border-slate-200 bg-slate-100 text-slate-600';

    return 'border-amber-200 bg-amber-50 text-amber-900';
}


function slotImage(slot: DealNeedRecord): string {
    const title = slot.title.toLowerCase();
    if (slot.need_kind === 'product' || title.includes('capacitor') || title.includes('part') || title.includes('store')) {
        return '/photos/ac-capacitor.jpg';
    }
    if (title.includes('courier') || title.includes('transit') || title.includes('delivery') || title.includes('rider')) {
        return '/photos/courier.jpg';
    }
    if (title.includes('audit') || title.includes('safety') || title.includes('inspect')) {
        return '/photos/req-electrician.jpg';
    }
    if (title.includes('bibingka') || title.includes('food') || title.includes('bake')) {
        return '/photos/bibingka.jpg';
    }
    return '/photos/ac-clean.jpg';
}

function slotRoleBadge(slot: DealNeedRecord): { label: string; bg: string; text: string } {
    const title = slot.title.toLowerCase();
    if (slot.need_kind === 'product' || title.includes('capacitor') || title.includes('store')) {
        return { label: 'STORE', bg: 'bg-amber-500', text: 'text-white' };
    }
    if (title.includes('courier') || title.includes('transit') || title.includes('delivery')) {
        return { label: 'RIDER', bg: 'bg-sky-500', text: 'text-white' };
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
            ? `Server projection for ${worker}`
            : 'Coordinator project projection';

    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const isCompleted =
        chain.status === 'completed' ||
        slots.some(
            (s) =>
                s.status === 'completed' ||
                s.child_order_status === 'completed' ||
                s.child_order_status === 'closed',
        );
    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
            <DesktopGlobalNav />

            <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
                <Link
                    href="/browse"
                    className="flex size-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
                    aria-label="Back to browse"
                >
                    <ArrowLeft className="size-5" />
                </Link>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[#0F2F58]">
                        Deal Chain #{shortId}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-extrabold text-blue-800">
                        <span className="size-1.5 rounded-full bg-blue-500" />
                        Server snapshot
                    </span>
                </div>

                <div className="flex size-9 items-center justify-center rounded-full text-slate-400">
                    <ShieldCheck className="size-5 text-[#0F2F58]" />
                </div>
            </header>

            <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
                <div className="hidden items-center justify-between lg:flex">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Link
                            href="/browse"
                            className="flex items-center gap-1 hover:text-[#0F2F58]"
                        >
                            <ArrowLeft className="size-3.5" />
                            <span>Back to Marketplace</span>
                        </Link>
                        <span>/</span>
                        <span className="font-bold text-slate-900">Deal Chain Coordination</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800 shadow-2xs">
                        <span className="size-2 rounded-full bg-blue-500" />
                        <span>Server DAG snapshot</span>
                    </div>
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
                                    Deal Chain Completed · Rate Project
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-600">
                                    Review your team with single cascading feedback or granular per-provider ratings.
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
                            <span>Rate Project ({slots.length} Providers)</span>
                        </button>
                    </div>
                )}

                <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                            Deal Chain #{shortId}
                        </span>
                        <span className="text-right font-mono text-sm font-extrabold text-[#0F2F58]">
                            {summaryAmount
                                ? `${summaryAmount} · Derived child total`
                                : 'No child terms formed'}
                        </span>
                    </div>

                    <h1 className="text-lg font-extrabold text-slate-900 sm:text-xl">
                        {chain.title || 'Deal Chain coordination plan'}
                    </h1>
                    <p className="text-sm text-slate-600">{chain.goal}</p>

                    <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-950">
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-blue-500" />
                        <span>
                            <strong>{contextLabel}.</strong> Chain status:{' '}
                            {statusLabel(chain.status)}. Financial state:{' '}
                            {chain.financial_state?.replaceAll('_', ' ') ??
                                'pending child agreements'}
                            .
                        </span>
                    </div>
                </section>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-extrabold tracking-wider text-[#0F2F58] uppercase">
                            Deal Chain Needs ({slots.length} Nodes · {dependencies.length} Active
                            Dependencies)
                        </div>
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-800 uppercase">
                            Planning graph
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

                        return (
                            <div key={slot.id} className="space-y-3">
                                <div
                                    className={`rounded-2xl border p-5 shadow-xs transition-all ${effectiveStatus === 'in_progress' ? 'border-sky-300 bg-white ring-1 ring-sky-200' : 'border-slate-200 bg-white'}`}
                                >
                                    <div className="flex items-start justify-between gap-3.5">
                                        <div className="flex min-w-0 flex-1 items-start gap-3.5">
                                            <div className="relative size-13 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
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
                                                    className={`absolute bottom-0 inset-x-0 ${slotRoleBadge(slot).bg} text-[7.5px] font-extrabold ${slotRoleBadge(slot).text} text-center uppercase py-0.2 tracking-wider`}
                                                >
                                                    {slotRoleBadge(slot).label}
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-extrabold text-slate-500 uppercase">
                                                        Slot #{slot.ordinal}
                                                    </span>
                                                    <h2 className="text-sm font-extrabold break-words text-slate-900 leading-tight">
                                                        {slot.title}
                                                    </h2>
                                                </div>
                                                <div className="mt-1 text-xs break-words text-slate-500 line-clamp-2 leading-relaxed">
                                                    {slot.description}
                                                </div>
                                                <div className="mt-2 flex items-center gap-2 text-[10.5px] font-medium text-slate-400">
                                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                                                        <ShieldCheck className="size-3" /> Tagudin Verified Partner Listing
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="max-w-[45%] shrink-0 text-right">
                                            <span className="font-mono text-sm font-extrabold text-[#0F2F58]">
                                                {formatAmount(slot)}
                                            </span>
                                            {slot.amount_source && (
                                                <div className="text-[9.5px] text-slate-400 capitalize">
                                                    {slot.amount_source}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 text-[10px] font-bold">
                                        <span
                                            className={`rounded-full border px-2.5 py-0.5 ${statusTone(effectiveStatus)}`}
                                        >
                                            {effectiveStatus === 'completed' && (
                                                <Check className="mr-1 inline size-3" />
                                            )}
                                            {effectiveStatus === 'in_progress' && (
                                                <Clock className="mr-1 inline size-3" />
                                            )}
                                            {effectiveStatus === 'blocked' && (
                                                <Lock className="mr-1 inline size-3" />
                                            )}
                                            {statusLabel(effectiveStatus)}
                                        </span>
                                        {slot.child_order_status && (
                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-slate-600">
                                                Order: {statusLabel(slot.child_order_status)}
                                            </span>
                                        )}
                                        {slot.work_status && (
                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-slate-600">
                                                Work: {statusLabel(slot.work_status)}
                                            </span>
                                        )}
                                        {slot.payment_obligation_status && (
                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-slate-600">
                                                Payment:{' '}
                                                {statusLabel(slot.payment_obligation_status)}
                                            </span>
                                        )}
                                        {!slot.child_order_id && (
                                            <span className="text-slate-500">
                                                No child Order formed
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {outgoingDependencies.length > 0 && (
                                    <div className="flex flex-wrap items-center justify-center gap-2 py-1">
                                        <div className="h-4 w-0.5 bg-slate-300" />
                                        {outgoingDependencies.map((dependency) => {
                                            const successor = slotsById.get(
                                                dependency.successor_need_id,
                                            );

                                            return (
                                                <span
                                                    key={dependency.id}
                                                    className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-slate-700"
                                                >
                                                    {dependency.condition_code} → Slot #
                                                    {successor?.ordinal ?? '?'}
                                                </span>
                                            );
                                        })}
                                        <div className="h-4 w-0.5 bg-slate-300" />
                                    </div>
                                )}

                                {incomingDependencies.length > 0 && (
                                    <div className="text-center text-[10px] font-semibold text-slate-400">
                                        Unlocked by{' '}
                                        {incomingDependencies
                                            .map((dependency) => dependency.condition_code)
                                            .join(', ')}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-5 text-xs text-blue-950">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#0F2F58]" />
                    <div>
                        <strong>Planning boundary:</strong> this page is a coordination projection.
                        Child Orders and payment obligations, when formed, remain independent; this
                        chain has no parent escrow.
                    </div>
                </div>
            </main>
            <ReviewCeremonyModal
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                dealChainId={chain.id}
                referenceTitle={chain.title || `Deal Chain #${shortId}`}
                actorRole="buyer"
                targets={slots.map((s) => ({
                    orderId: s.child_order_id || s.id,
                    providerName: s.title,
                    role: s.need_kind.toUpperCase(),
                }))}
            />
        </div>
    );
}
