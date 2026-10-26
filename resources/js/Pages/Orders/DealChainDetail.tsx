import { useMemo, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    Clock,
    Lock,
    Phone,
    ShieldCheck,
    Sparkles,
    Star,
} from 'lucide-react';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';
import ReviewCeremonyModal from '../../components/reviews/ReviewCeremonyModal';
import AppointmentSlotPicker, { type AppointmentHold } from '../../components/orders/AppointmentSlotPicker';
import ConversationDrawer from '../../components/conversations/ConversationDrawer';

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


interface DealNeedConfirmation {
    invitation_id: string;
    expected_need_version: number;
    terms_hash: string;
    capacity_hash: string;
    listing_id: string;
    listing_version_id: string;
    listing_version: number;
    title: string;
    work_shape: string;
    amount_minor: number | null;
    currency: string;
}

interface DealNeedRecord {
    id: string;
    deal_chain_id: string;
    ordinal: number;
    need_kind: string;
    title: string;
    listing_title?: string | null;
    description?: string;
    status: string;
    requested_at?: string;
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
    handoff_url?: string | null;
    can_view_order: boolean;
    confirmation?: DealNeedConfirmation | null;
    expected_need_version?: number;
    node_role?: string;
    can_withdraw?: boolean;
    can_replace?: boolean;
    replaces_deal_need_id?: string | null;
}

interface ReplacementCandidate {
    id: string;
    title: string;
    provider_name: string;
    price_minor: number;
    role: string;
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
    can_open_relay?: boolean;


}

function statusLabel(status: string): string {
    const labels: Record<string, string> = {
        open: 'Open · Sourcing',
        sourcing: 'Sourcing',
        invited: 'Provider invited',
        quoted: 'Quote received',
        accepted: 'Accepted',
        awaiting_customer_confirmation: 'Provider accepted · Confirm terms',
        in_progress: 'In progress',
        completed: 'Completed',
        replacement_needed: 'Partner needed',
        superseded: 'Replaced',
        cancelled: 'Withdrawn',

    };
    return labels[status] ?? status.replaceAll('_', ' ');
}

function statusTone(status: string): string {
    if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (status === 'in_progress' || status === 'accepted')
        return 'border-sky-200 bg-sky-50 text-sky-800';
    if (status === 'blocked' || status === 'failed' || status === 'replacement_needed')
        return 'border-amber-200 bg-amber-50 text-amber-900';
    if (status === 'cancelled' || status === 'superseded')
        return 'border-slate-200 bg-slate-100 text-slate-600';

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
    const amountMinor = slot.confirmation?.amount_minor ?? slot.amount_minor;
    const currency = slot.confirmation?.currency ?? slot.currency ?? 'PHP';
    if (amountMinor === null || amountMinor === undefined) {
        return 'Amount pending provider terms';
    }

    return `${currency} ${(amountMinor / 100).toFixed(2)}`;

}
function appointmentHoldKey(slot: DealNeedRecord): string | null {
    return slot.confirmation
        ? `${slot.id}:${slot.confirmation.listing_version_id}`
        : null;
}

export default function DealChainDetail({
    chain,
    slots,
    dependencies,
    notice,
    view = 'project',
    can_open_relay = false,
}: DealChainDetailProps) {
    const shortId = chain.id ? chain.id.substring(0, 8).toUpperCase() : 'DC';
    const slotsById = new Map(slots.map((slot) => [slot.id, slot]));
    const summaryAmount =
        chain.total_budget_amount === null || chain.total_budget_amount === undefined
            ? null
            : `${chain.currency_code ?? 'PHP'} ${chain.total_budget_amount.toFixed(2)}`;
    const contextLabel =
        view === 'worker'
            ? 'Partner view · your agreement and shared readiness only.'
            : 'Coordinator project projection.';
    const [relayOpen, setRelayOpen] = useState(false);
    const conversationSearch = window.location.search;
    const conversationContext = useMemo(() => {
        const query = new URLSearchParams(conversationSearch);
        const owner = query.get('owner_user_id');
        const grant = query.get('consent_grant_id');
        return {
            ...(owner ? { owner_user_id: owner } : {}),
            ...(grant ? { consent_grant_id: grant } : {}),
        };
    }, [conversationSearch]);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [confirmingNeedId, setConfirmingNeedId] = useState<string | null>(null);
    const [appointmentHolds, setAppointmentHolds] = useState<Record<string, AppointmentHold>>({});
    const [candidateOptions, setCandidateOptions] = useState<Record<string, ReplacementCandidate[]>>({});
    const [loadingCandidatesFor, setLoadingCandidatesFor] = useState<string | null>(null);
    const [replacementError, setReplacementError] = useState<string | null>(null);
    const [withdrawingNeedId, setWithdrawingNeedId] = useState<string | null>(null);

    const postDealAction = async (url: string, payload: Record<string, unknown>) => {
        const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
                'X-Idempotency-Key': window.crypto.randomUUID(),
            },
            body: JSON.stringify(payload),
        });
        const result = await response.json() as { error?: { message?: string } };
        if (!response.ok) throw new Error(result.error?.message ?? 'This Deal Chain action could not be completed.');
        router.reload();
    };

    const withdrawPartner = async (slot: DealNeedRecord) => {
        if (!window.confirm('Withdraw this current partner slot? Any completed sibling agreements and payments stay unchanged.')) return;
        setWithdrawingNeedId(slot.id);
        setReplacementError(null);
        try {
            await postDealAction(`/deal-chains/${chain.id}/needs/${slot.id}/withdraw`, {
                expected_need_version: slot.expected_need_version ?? 1,
            });
        } catch (error) {
            setReplacementError(error instanceof Error ? error.message : 'The partner slot could not be withdrawn.');
        } finally {
            setWithdrawingNeedId(null);
        }
    };

    const loadReplacementCandidates = async (slot: DealNeedRecord) => {
        setLoadingCandidatesFor(slot.id);
        setReplacementError(null);
        try {
            const role = (slot.node_role ?? 'labor').toUpperCase();
            const response = await fetch(`/api/deal-chains/slot-candidates?role=${encodeURIComponent(role)}`, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) throw new Error('Eligible current listings could not be loaded.');
            const result = await response.json() as { data?: ReplacementCandidate[] };
            setCandidateOptions((current) => ({ ...current, [slot.id]: result.data ?? [] }));
        } catch (error) {
            setReplacementError(error instanceof Error ? error.message : 'Eligible listings could not be loaded.');
        } finally {
            setLoadingCandidatesFor(null);
        }
    };

    const chooseReplacement = async (slot: DealNeedRecord, candidate: ReplacementCandidate) => {
        setReplacementError(null);
        try {
            await postDealAction(`/deal-chains/${chain.id}/needs/${slot.id}/replace`, {
                expected_need_version: slot.expected_need_version ?? 1,
                listing_id: candidate.id,
            });
        } catch (error) {
            setReplacementError(error instanceof Error ? error.message : 'The invitation could not be issued.');
        }
    };

    const currentSlots = slots.filter((slot) => slot.status !== 'superseded');
    const isCompleted =
        currentSlots.length > 0 && currentSlots.every(
            (slot) => slot.status === 'completed' || slot.child_order_status === 'completed',
        );
    const confirmAgreement = (slot: DealNeedRecord) => {
        const terms = slot.confirmation;
        const holdKey = appointmentHoldKey(slot);
        const appointmentHold = holdKey ? appointmentHolds[holdKey] : undefined;
        if (!terms || terms.amount_minor === null || (terms.work_shape === 'A3' && !appointmentHold)) return;

        setConfirmingNeedId(slot.id);
        router.post(
            `/deal-chains/${chain.id}/needs/${slot.id}/confirm-agreement`,
            {
                invitation_id: terms.invitation_id,
                expected_need_version: terms.expected_need_version,
                terms_hash: terms.terms_hash,
                capacity_hash: terms.capacity_hash,
                appointment_reservation_id: appointmentHold?.id ?? null,
            },
            {
                preserveScroll: true,
                headers: { 'X-Idempotency-Key': window.crypto.randomUUID() },
                onFinish: () => setConfirmingNeedId(null),
            },
        );
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
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-extrabold text-slate-700">
                        {statusLabel(chain.status)}
                    </span>
                </div>

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

                </div>

                {notice && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-xs font-bold text-blue-950 shadow-xs">
                        <ShieldCheck className="size-5 shrink-0 text-[#0F2F58]" />
                        <span>{notice}</span>
                    </div>
                )}

                {view === 'project' && isCompleted && (
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
                                {slots.length}-Slot Orchestrated Relay
                            </span>
                        </div>
                        {view === 'project' && (
                            <span className="text-right font-mono text-base font-extrabold text-[#0F2F58]">
                                {summaryAmount
                                    ? `${summaryAmount} · Derived child total`
                                    : 'No child terms formed'}
                            </span>
                        )}
                        {can_open_relay && (
                            <button
                                type="button"
                                onClick={() => setRelayOpen(true)}
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0F2F58] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0c2444] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]"
                            >
                                Open handoff relay
                            </button>
                        )}
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

                        const hasChildOrder = Boolean(slot.child_order_id && (view === 'project' || slot.can_view_order));
                        const roleMeta = slotRoleBadge(slot);
                        const holdKey = appointmentHoldKey(slot);
                        const appointmentHold = holdKey ? appointmentHolds[holdKey] : undefined;

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
                                                        <span>{slot.provider_name ?? 'Provider not named'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="max-w-[45%] shrink-0 text-right">
                                            <span className="font-mono text-sm font-black text-[#0F2F58]">
                                                {view === 'worker' && !slot.can_view_order
                                                    ? 'Shared readiness'
                                                    : formatAmount(slot)}
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
                                    {slot.confirmation && (
                                        <section className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5" aria-label="Accepted provider terms">
                                            <p className="text-xs font-semibold leading-5 text-slate-700">
                                                {slot.replaces_deal_need_id
                                                    ? <>You accepted a fresh replacement invitation for <strong>{slot.confirmation.title}</strong> at {formatAmount(slot)}. Review these pinned terms and confirm to form the new child Order.</>
                                                    : <>Provider accepted <strong>{slot.confirmation.title}</strong> for {formatAmount(slot)}. Confirm only after reviewing these pinned terms.</>}
                                            </p>
                                            {slot.confirmation.work_shape === 'A3' && (
                                                <div className="space-y-2">
                                                    <AppointmentSlotPicker
                                                        key={`${slot.id}-${slot.confirmation.listing_version_id}`}
                                                        source={{
                                                            kind: 'listing',
                                                            listingId: slot.confirmation.listing_id,
                                                            listingVersionId: slot.confirmation.listing_version_id,
                                                        }}
                                                        disabled={confirmingNeedId === slot.id}
                                                        onHeld={(hold) => {
                                                            const key = appointmentHoldKey(slot);
                                                            if (key) {
                                                                setAppointmentHolds((current) => ({ ...current, [key]: hold }));
                                                            }
                                                        }}
                                                    />
                                                    {appointmentHold && (
                                                        <p className="text-xs font-bold text-emerald-800">
                                                            Appointment held for {new Date(appointmentHold.starts_at).toLocaleString()} · hold expires {new Date(appointmentHold.hold_expires_at).toLocaleTimeString()}.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </section>
                                    )}


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
                                        </div>
                                        {hasChildOrder ? (
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <Link
                                                    href={`/orders/${slot.child_order_id}`}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F2F58] px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#0c2444] transition-all"
                                                >
                                                    <span>View Task Details</span>
                                                    <span className="text-[10px]">→</span>
                                                </Link>
                                                {slot.handoff_url && (
                                                    <Link
                                                        href={slot.handoff_url}
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-extrabold text-amber-950 shadow-xs hover:bg-amber-100 transition-all"
                                                    >
                                                        <span>Open product handoff</span>
                                                        <span className="text-[10px]">→</span>
                                                    </Link>
                                                )}
                                            </div>
                                        ) : slot.child_order_id ? (
                                            <span className="text-xs font-semibold text-slate-500">
                                                Shared readiness only · sibling Order details are private
                                            </span>
                                        ) : slot.confirmation ? (
                                            <button
                                                type="button"
                                                onClick={() => confirmAgreement(slot)}
                                                disabled={slot.confirmation.amount_minor === null || confirmingNeedId === slot.id || (slot.confirmation.work_shape === 'A3' && !appointmentHold)}
                                                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#0F2F58] px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-[#0c2444] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58] disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {confirmingNeedId === slot.id ? 'Forming child Order…' : 'Confirm provider terms'}
                                            </button>
                                        ) : (
                                            <span className="text-xs font-semibold text-slate-500">
                                                No child Order formed
                                            </span>
                                        )}
                                    </div>
                                    {slot.can_withdraw && (
                                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                                            <button
                                                type="button"
                                                onClick={() => void withdrawPartner(slot)}
                                                disabled={withdrawingNeedId === slot.id}
                                                className="inline-flex min-h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                                            >
                                                {withdrawingNeedId === slot.id ? 'Withdrawing…' : 'Withdraw current partner'}
                                            </button>
                                            <p className="text-[11px] text-slate-500">Completed sibling agreements and payments remain unchanged.</p>
                                        </div>
                                    )}
                                    {view === 'project' && slot.can_replace && (
                                        <section className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3" aria-label="Choose a replacement partner">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <h4 className="text-xs font-extrabold text-amber-950">Choose a replacement partner</h4>
                                                    <p className="text-[11px] text-amber-900">A fresh invitation is sent. No Order forms until the provider accepts and you confirm their terms.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => void loadReplacementCandidates(slot)}
                                                    disabled={loadingCandidatesFor === slot.id}
                                                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                                                >
                                                    {loadingCandidatesFor === slot.id ? 'Loading listings…' : 'Show eligible listings'}
                                                </button>
                                            </div>
                                            {(candidateOptions[slot.id] ?? []).length > 0 && (
                                                <ul className="space-y-2">
                                                    {(candidateOptions[slot.id] ?? []).map((candidate) => (
                                                        <li key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white p-3">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-xs font-extrabold text-slate-900">{candidate.title}</p>
                                                                <p className="text-[11px] text-slate-600">Provider: {candidate.provider_name}</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => void chooseReplacement(slot, candidate)}
                                                                className="rounded-lg bg-[#0F2F58] px-3 py-2 text-xs font-bold text-white hover:bg-[#0c2444]"
                                                            >
                                                                Send invitation
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {candidateOptions[slot.id]?.length === 0 && loadingCandidatesFor !== slot.id && (
                                                <p className="text-xs text-slate-600">No eligible active listings are available for this slot.</p>
                                            )}
                                            {replacementError && <p role="alert" className="text-xs font-semibold text-rose-800">{replacementError}</p>}
                                        </section>
                                    )}
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

            {/* Review Ceremony Modal */}
            <ReviewCeremonyModal
                dealChainId={chain.id}
                referenceTitle={chain.title || 'Deal Chain Project'}
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                targets={slots
                    .filter((slot) => slot.child_order_id && slot.child_order_status === 'completed'
                        && !['superseded', 'cancelled', 'failed', 'replacement_needed'].includes(slot.status))
                    .map((s) => ({
                        orderId: s.child_order_id!,
                        providerName: s.provider_name ?? 'Provider',
                        role: s.need_kind,
                        title: s.listing_title ?? s.title,
                    }))}
            />
            <ConversationDrawer
                open={relayOpen}
                onClose={() => setRelayOpen(false)}
                openUrl={`/deal-chains/${chain.id}/relay`}
                context={conversationContext}
            />
        </div>
    );
}
