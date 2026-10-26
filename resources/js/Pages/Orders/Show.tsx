import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Clock,
    Coins,
    HelpCircle,
    MapPin,
    MessageSquare,
    MoreVertical,
    Package,
    Phone,
    ShieldCheck,
    Star,
    X,
} from 'lucide-react';
import type { WorkNodeRecord } from '../../types';
import WorkNodeEvidenceTools, { type WorkNodeAction } from '../../components/mobile/WorkNodeEvidenceTools';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';
import ReviewCeremonyModal from '../../components/reviews/ReviewCeremonyModal';
import GlovoWaveModal from '../../components/mobile/GlovoWaveModal';
import WorkNodeEvidenceReview from '../../components/mobile/WorkNodeEvidenceReview';
import PaymentObligationSheet, { type PaymentObligation } from '../../components/mobile/PaymentObligationSheet';
import A9DeliveryPanel, { type A9DeliveryProjection } from '../../components/mobile/A9DeliveryPanel';
import A4HandoffPanel, { type A4HandoffProjection } from '../../components/orders/A4HandoffPanel';
import AppointmentPanel from '../../components/orders/AppointmentPanel';
import WorkClearanceChallenge from '../../components/orders/WorkClearanceChallenge';
import ConversationDrawer from '../../components/conversations/ConversationDrawer';
type OrderProposal = {
    id: string;
    version: number;
    kind: string;
    status: string;
    proposed_by_user_id: string;
    amount_minor: number | null;
    currency: string | null;
    note: string | null;
    can_accept: boolean;
    can_decline: boolean;
    can_counter: boolean;
    can_amend: boolean;
    expected_order_version: number;
};

type ProposalSheetAction = 'counter' | 'amend';

type OrderShowProps = {
    correlationId?: string | null;
    notice?: string | null;
    actor_perspective?: 'customer' | 'provider' | 'courier';
    proposal?: OrderProposal | null;
    order: {
        id: string;
        status: 'proposed' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
        version: number;
        listing_id: string;
        mechanism: string;
        origin: string;
        geography?: string | null;
        can_accept: boolean;
        can_decline: boolean;
        can_counter: boolean;
        can_amend: boolean;
        can_signoff: boolean;
        can_view_work_evidence: boolean;
        is_order_buyer: boolean;
        actor_role: 'buyer' | 'provider' | 'courier';
        deal_chain_id?: string | null;
        deal_chain_title?: string | null;
        deal_chain_ref?: string | null;
        customer_name?: string;
        provider_name?: string;
        counterparty_name?: string | null;
        counterparty_phone?: string | null;
        can_contact: boolean;
        listing_title?: string;
        service_address?: string;
        landmark?: string;
        request_id?: string | null;
        quote_id?: string | null;
        bidding_lineage?: {
            request_id: string;
            request_ref: string;
            request_title: string;
            tender_mode: string;
            quote_id: string | null;
            quote_ref: string | null;
            quote_version: number;
            winning_amount_minor: number | null;
            total_quotes_received: number;
            is_sealed: boolean;
        } | null;
    };
    terms?: {
        snapshot_version: number;
        amount_minor: number;
        currency: string;
        source_listing_version_id: string;
        accepted_by_user_id: string;
        accepted_at: string;
    } | null;
    work?: {
        id: string;
        version: number;
        status: string;
        work_shape: string;
        signature_hash?: string | null;
        active_node_id?: string | null;
        active_ordinal?: number;
        pending_customer_confirmation?: boolean;
        nodes?: WorkNodeRecord[];
    } | null;
    obligation?: PaymentObligation | null;
    a9Delivery?: A9DeliveryProjection | null;
    a4Handoff?: A4HandoffProjection;
    appointment?: {
        scheduledAt: string | null;
        scheduleChangeRequests: { id: string; proposedStart: string; proposedEnd: string; proposerUserId: string; status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired'; createdAt: string }[];
        canPropose: boolean;
        viewerUserId: string;
    } | null;
    financials?: {
        amount_minor: number | null;
        currency: string | null;
        label: string;
        status: string;
        breakdown: { label: string; amount_minor: number }[];
    };
    deal_chain_slots?: {
        id: string;
        ordinal: number;
        need_kind: string;
        title: string;
        status: string;
        status_label?: string;
        provider?: string;
        is_current?: boolean;
    }[];
    errors?: Record<string, string | string[]>;
    active_support_case_id?: string | null;
};

type SupportCategory = 'fulfillment' | 'payment' | 'cancellation' | 'other';

function money(minor: number | undefined, currency: string | undefined): string {
    if (minor === undefined || minor === null) {
        return 'Terms not yet agreed';
    }
    const formatted = (minor / 100).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return currency ? `${currency} ${formatted}` : formatted;
}

function matchNodeKindBadge(kind: string): { label: string; style: string } {
    switch (kind) {
        case 'decision_gate':
            return {
                label: 'Customer Confirmation Gate',
                style: 'bg-amber-100 text-amber-900 border border-amber-300/80',
            };
        case 'checkin_intake':
            return {
                label: 'Intake / Arrival Gate',
                style: 'bg-blue-100 text-blue-900 border border-blue-200',
            };
        case 'handoff_ready':
            return {
                label: 'Handoff Readiness Gate',
                style: 'bg-sky-100 text-sky-900 border border-sky-200',
            };
        case 'final_signoff':
            return {
                label: 'Final Sign-off Gate',
                style: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
            };
        default:
            return {
                label: 'Execution Proof Gate',
                style: 'bg-slate-100 text-slate-700 border border-slate-200',
            };
    }
}
function requestedConversationContext(search: string): { owner_user_id?: string; consent_grant_id?: string } {
    const query = new URLSearchParams(search);
    const owner = query.get('owner_user_id');
    const grant = query.get('consent_grant_id');
    return {
        ...(owner ? { owner_user_id: owner } : {}),
        ...(grant ? { consent_grant_id: grant } : {}),
    };
}

export default function OrderShow(props: OrderShowProps) {
    const page = usePage<{
        errors?: Record<string, string | string[]>;
        flash?: { notice?: string };
    }>();
    const errors = props.errors ?? page.props.errors ?? {};
    const formError = Array.isArray(errors.form) ? errors.form[0] : errors.form;
    const notice = props.notice ?? page.props.flash?.notice ?? null;

    // Perspective is derived strictly from the authenticated session
    const perspective =
        props.actor_perspective ||
        (props.order.actor_role === 'buyer' ? 'customer' : 'provider');

    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

    const [chatOpen, setChatOpen] = useState(false);
    const [supportComposeOpen, setSupportComposeOpen] = useState(false);
    const [supportConversationOpen, setSupportConversationOpen] = useState(false);
    const [supportConversationUrl, setSupportConversationUrl] = useState<string | null>(null);
    const [supportCategory, setSupportCategory] = useState<SupportCategory>('fulfillment');
    const [supportReport, setSupportReport] = useState('');
    const [supportCreating, setSupportCreating] = useState(false);
    const [supportError, setSupportError] = useState<string | null>(null);
    const [biddingDrawerOpen, setBiddingDrawerOpen] = useState(false);
    const [activeSupportCaseId, setActiveSupportCaseId] = useState(props.active_support_case_id ?? null);
    const supportIdempotency = useRef<{ category: SupportCategory; content: string; key: string } | null>(null);
    const conversationSearch = window.location.search;
    const conversationContext = useMemo(() => requestedConversationContext(conversationSearch), [conversationSearch]);
    useEffect(() => {
        setActiveSupportCaseId(props.active_support_case_id ?? null);
    }, [props.active_support_case_id, props.order.id]);

    const [processingNodeId, setProcessingNodeId] = useState<string | null>(null);
    const [signoffProcessing, setSignoffProcessing] = useState(false);
    const [proposalSheetAction, setProposalSheetAction] = useState<ProposalSheetAction | null>(null);
    const [proposalAmount, setProposalAmount] = useState('');
    const [proposalScope, setProposalScope] = useState('');
    const [proposalNote, setProposalNote] = useState('');
    const [proposalActionProcessing, setProposalActionProcessing] = useState(false);
    const [proposalIdempotencyKey, setProposalIdempotencyKey] = useState('');
    const [proposalProcessing, setProposalProcessing] = useState(false);

    const openProposalSheet = (action: ProposalSheetAction) => {
        const minor = props.proposal?.amount_minor;
        setProposalSheetAction(action);
        setProposalAmount(minor === null || minor === undefined ? '' : (minor / 100).toFixed(2));
        setProposalScope('');
        setProposalNote('');
        setProposalIdempotencyKey(crypto.randomUUID());
    };

    const sendProposalAction = (
        action: 'accept' | 'decline' | ProposalSheetAction,
        proposalAccept = false,
        payload: { amount_minor?: number; scope?: string; note?: string } = {},
        idempotencyKey: string = crypto.randomUUID(),
        onSuccess?: () => void,
        onFinish?: () => void,
    ) => {
        const path = proposalAccept && props.proposal
            ? `/orders/${props.order.id}/proposals/${props.proposal.id}/accept`
            : `/orders/${props.order.id}/${action}`;
        router.post(path, {
            expected_order_version: proposalAccept
                ? props.proposal?.expected_order_version
                : props.order.version,
            idempotency_key: idempotencyKey,
            ...payload,
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess,
            onFinish,
        });
    };

    const submitProposalChange = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!proposalSheetAction) return;
        const amount = Number(proposalAmount);
        if (!Number.isFinite(amount) || amount <= 0) return;
        const payload: { amount_minor: number; scope?: string; note?: string } = {
            amount_minor: Math.round(amount * 100),
        };
        if (proposalScope.trim() !== '') payload.scope = proposalScope;
        if (proposalNote.trim() !== '') payload.note = proposalNote;
        setProposalProcessing(true);
        sendProposalAction(
            proposalSheetAction,
            false,
            payload,
            proposalIdempotencyKey,
            () => {
                setProposalSheetAction(null);
                setProposalAmount('');
                setProposalScope('');
                setProposalNote('');
                setProposalIdempotencyKey('');
            },
            () => setProposalProcessing(false),
        );
    };

    const orderStatus = props.order.status;
    const workStatus = props.work?.status ?? 'not_available';
    const isWorkCompleted = workStatus === 'completed';
    const isPaymentSettled = props.obligation?.status === 'settled';
    const isSignoff =
        workStatus === 'awaiting_signoff' ||
        workStatus === 'completion_proposed';
    const isInProgress =
        orderStatus === 'in_progress' ||
        (orderStatus === 'accepted' && workStatus === 'in_progress') ||
        workStatus === 'scheduled';
    const isPending = orderStatus === 'proposed';

    const amountMinor =
        props.terms?.amount_minor ??
        props.obligation?.amount_minor ??
        props.financials?.amount_minor ??
        undefined;
    const currency =
        props.terms?.currency ??
        props.obligation?.currency ??
        props.financials?.currency ??
        undefined;
    const financialAmount =
        props.financials?.amount_minor ??
        props.obligation?.amount_minor ??
        props.terms?.amount_minor ??
        props.proposal?.amount_minor ??
        undefined;
    const financialCurrency =
        props.financials?.currency ??
        props.obligation?.currency ??
        props.terms?.currency ??
        props.proposal?.currency ??
        undefined;
    const hasAcceptedTerms = Boolean(props.terms || props.obligation);
    const isPendingProposal = props.proposal?.status === 'proposed' && !hasAcceptedTerms;
    const termsDifferFromObligation = Boolean(
        props.terms
        && props.obligation
        && (props.terms.amount_minor !== props.obligation.amount_minor || props.terms.currency !== props.obligation.currency),
    );
    const financialHeaderLabel = props.obligation
        ? props.financials?.label || 'Payment obligation'
        : isPendingProposal
          ? 'Proposed terms'
          : 'Order terms';
    const financialAmountLabel = props.obligation
        ? props.financials?.label || 'Payment obligation'
        : isPendingProposal
          ? 'Proposed amount'
          : props.terms
            ? 'Agreed amount'
            : 'Order amount';
    const formattedAmount = money(amountMinor, currency);

    const orderShortId = `#ORD-${props.order.id.slice(0, 8).toUpperCase()}`;
    const listingTitle = props.order.listing_title || 'Order';

    // Smart back link
    const backHref = props.order.deal_chain_id
        ? `/deal-chains/${props.order.deal_chain_id}`
        : '/orders';
    const backLabel = props.order.deal_chain_id
        ? `${props.order.deal_chain_ref ?? 'Deal Chain'} Relay Pool`
        : 'Orders Hub';

    const counterpartyName = props.order.counterparty_name ?? '';
    const counterpartyPhone = props.order.counterparty_phone ?? '';

    const proposal = props.proposal;
    const canAcceptProposal = proposal?.can_accept === true || props.order.can_accept;
    const canDeclineProposal = proposal?.can_decline === true || props.order.can_decline;
    const canCounterProposal = proposal?.can_counter === true || props.order.can_counter;
    const canAmendProposal = proposal?.can_amend === true || props.order.can_amend;
    const submitSimpleProposalAction = (action: 'accept' | 'decline', proposalAccept = false) => {
        if (proposalActionProcessing) return;
        setProposalActionProcessing(true);
        sendProposalAction(action, proposalAccept, {}, crypto.randomUUID(), undefined, () => setProposalActionProcessing(false));
    };

    const handleAdvanceNode = (
        nodeId: string,
        action: string,
        payload: Record<string, unknown> = {},
    ) => {
        setProcessingNodeId(nodeId);
        router.post(
            `/orders/${props.order.id}/work-nodes/${nodeId}`,
            { action, payload: payload as Record<string, string | number | boolean | null> },
            {
                preserveScroll: true,
                onFinish: () => setProcessingNodeId(null),
            },
        );
    };

    const handleSignoff = () => {
        setSignoffProcessing(true);
        router.post(`/orders/${props.order.id}/work/signoff`, {}, {
            preserveScroll: true,
            onFinish: () => setSignoffProcessing(false),
        });
    };

    const openSupport = () => {
        setSupportError(null);
        if (activeSupportCaseId) {
            setSupportConversationUrl(`/support-cases/${activeSupportCaseId}/conversation`);
            setSupportConversationOpen(true);
            setSupportComposeOpen(false);
            return;
        }
        setSupportComposeOpen(true);
    };

    const createSupportCase = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const content = supportReport.trim();
        if (!content || supportCreating) return;
        setSupportCreating(true);
        setSupportError(null);
        const xsrfToken = document.cookie.split(';').map((cookie) => cookie.trim())
            .find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length);
        if (!supportIdempotency.current || supportIdempotency.current.category !== supportCategory || supportIdempotency.current.content !== content) {
            supportIdempotency.current = { category: supportCategory, content, key: crypto.randomUUID() };
        }
        const idempotencyKey = supportIdempotency.current.key;
        try {
            const response = await fetch('/support-cases', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Idempotency-Key': idempotencyKey,
                    'X-XSRF-TOKEN': xsrfToken ? decodeURIComponent(xsrfToken) : '',
                },
                body: JSON.stringify({
                    order_id: props.order.id,
                    category: supportCategory,
                    content,
                    idempotency_key: idempotencyKey,
                    ...conversationContext,
                }),
            });
            const payload = await response.json() as {
                data?: { id: string; public_reference: string; conversation_id: string };
                error?: { message?: string };
                message?: string;
            };
            if (!response.ok || !payload.data?.id) {
                throw new Error(payload.error?.message ?? payload.message ?? `Support case could not be opened (${response.status}).`);
            }
            setSupportComposeOpen(false);
            setActiveSupportCaseId(payload.data.id);
            setSupportConversationUrl(`/support-cases/${payload.data.id}/conversation`);
            setSupportReport('');
            setChatOpen(false);
            setSupportConversationOpen(true);
            supportIdempotency.current = null;
        } catch (cause) {
            setSupportError(cause instanceof Error ? cause.message : 'Support case could not be opened. Your report is still here.');
        } finally {
            setSupportCreating(false);
        }
    };


    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 pb-28">
            <DesktopGlobalNav activeRoute="orders" />

            {/* Mobile Header Bar */}
            <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur lg:hidden">
                <Link
                    href={backHref}
                    className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95"
                    aria-label={`Back to ${backLabel}`}
                    title={`Back to ${backLabel}`}
                >
                    <ArrowLeft className="size-4" />
                </Link>

                <div className="flex flex-col items-center min-w-0 px-2 text-center">
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-extrabold text-slate-400">
                            {orderShortId}
                        </span>
                        {props.order.deal_chain_ref && (
                            <span className="rounded-md bg-blue-50 border border-blue-100 px-1.5 py-0.2 text-[9px] font-extrabold text-blue-700">
                                {props.order.deal_chain_ref}
                            </span>
                        )}
                    </div>
                    <span className="text-xs font-extrabold text-[#0F2F58] truncate max-w-[200px]">
                        {listingTitle}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setOptionsMenuOpen((prev) => !prev)}
                            className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95"
                            aria-label="Order Options"
                        >
                            <MoreVertical className="size-4" />
                        </button>

                        {optionsMenuOpen && (
                            <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOptionsMenuOpen(false);
                                        openSupport();
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <HelpCircle className="size-3.5 text-blue-600" />
                                    <span>Contact Support Desk</span>
                                </button>
                                <Link
                                    href="/stock"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <Package className="size-3.5 text-slate-500" />
                                    <span>Stock ledger</span>
                                </Link>
                                <Link
                                    href="/money-history"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <Coins className="size-3.5 text-slate-500" />
                                    <span>Money history</span>
                                </Link>
                                <Link
                                    href={backHref}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <ArrowLeft className="size-3.5" />
                                    <span>Back to {backLabel}</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-5 pb-16 sm:px-6 lg:py-8">
                {/* Desktop Breadcrumbs */}
                <div className="hidden items-center justify-between mb-5 lg:flex">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Link
                            href="/orders"
                            className="hover:text-[#0F2F58] font-bold text-slate-700"
                        >
                            Orders Hub
                        </Link>
                        {props.order.deal_chain_id && (
                            <>
                                <span>/</span>
                                <Link
                                    href={`/deal-chains/${props.order.deal_chain_id}`}
                                    className="hover:text-[#0F2F58] font-bold text-slate-700"
                                >
                                    {props.order.deal_chain_ref ?? 'Deal Chain'} Relay Pool
                                </Link>
                            </>
                        )}
                        <span>/</span>
                        <span className="font-extrabold text-slate-900">
                            Order {orderShortId}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {props.order.can_contact && (
                            <button
                                type="button"
                                onClick={() => setChatOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
                            >
                                <MessageSquare className="size-3.5 text-sky-600" />
                                <span>Message {counterpartyName.split(' ')[0] || 'counterparty'}</span>
                            </button>
                        )}
                        {props.order.can_contact && counterpartyPhone !== '' && (
                            <a
                                href={`tel:${counterpartyPhone}`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
                            >
                                <Phone className="size-3.5 text-emerald-600" />
                                <span>Call</span>
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={openSupport}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
                        >
                            <HelpCircle className="size-3.5 text-blue-600" />
                            <span>Support</span>
                        </button>
                    </div>
                </div>

                {/* Notice Alert */}
                {notice && (
                    <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-900 shadow-xs">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span>{notice}</span>
                    </div>
                )}

                {/* Form Error Alert */}
                {formError && (
                    <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-900 shadow-xs">
                        <AlertCircle className="size-4 shrink-0 text-red-600" />
                        <span>{formError}</span>
                    </div>
                )}

                {/* Tender Origin / Bidding Lineage Banner */}
                {props.order.bidding_lineage && (
                    <div
                        data-testid="tender-lineage-banner"
                        className="mb-5 rounded-2xl border border-teal-200/90 bg-gradient-to-r from-teal-50/90 via-white to-blue-50/80 p-4 shadow-xs"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-9 items-center justify-center rounded-xl bg-[#0D715F] text-white shadow-2xs">
                                    <ShieldCheck className="size-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0D715F]">
                                            {props.order.bidding_lineage.is_sealed
                                                ? 'Sealed Bidding Award'
                                                : 'Citizen Tender Award'}
                                        </span>
                                        <span className="font-mono text-[10px] font-bold text-slate-500">
                                            {props.order.bidding_lineage.request_ref}
                                        </span>
                                    </div>
                                    <h3 className="text-xs sm:text-sm font-extrabold text-[#0F2F58]">
                                        Awarded from: {props.order.bidding_lineage.request_title}
                                    </h3>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    data-testid="view-bidding-lineage-btn"
                                    onClick={() => setBiddingDrawerOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-white px-3 py-1.5 text-xs font-bold text-[#0D715F] hover:bg-teal-50 shadow-2xs active:scale-95 transition-all cursor-pointer"
                                >
                                    <Coins className="size-3.5" />
                                    <span>Bidding Lineage</span>
                                </button>
                                <Link
                                    href={`/requests/${props.order.bidding_lineage.request_id}`}
                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
                                >
                                    <span>Request Spec</span>
                                    <ArrowRight className="size-3" />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-5">
                    {/* 1. Hero Feature Card */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F2F58] via-[#0e3b68] to-[#0d5f50] p-5 text-white shadow-md">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                                            isWorkCompleted
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                                : isSignoff
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                                : isInProgress
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                                : 'bg-blue-500/20 text-blue-200 border border-blue-400/30'
                                        }`}
                                    >
                                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span>
                                            {isWorkCompleted
                                                ? 'Work completed'
                                                : isSignoff
                                                ? 'Awaiting Sign-off'
                                                : isInProgress
                                                ? 'Work Underway'
                                                : isPending
                                                ? 'Proposal open'
                                                : orderStatus.replaceAll('_', ' ')}
                                        </span>
                                    </span>
                                    <span className="text-[10px] font-bold text-white/70">
                                        {props.order.status.replaceAll('_', ' ')}
                                    </span>
                                </div>

                                <h1 className="text-lg font-extrabold text-white sm:text-xl leading-snug pt-1">
                                    {listingTitle}
                                </h1>

                                <p className="text-xs text-white/80">
                                    {counterpartyName ? `Counterparty: ${counterpartyName}` : null}
                                </p>
                            </div>

                        </div>
                        {props.order.can_contact && (
                            <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setChatOpen(true)}
                                    className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 py-1.5 text-xs font-bold text-white hover:bg-white/20"
                                >
                                    <MessageSquare className="size-3.5 text-sky-300" />
                                    <span>Message {counterpartyName.split(' ')[0] || 'counterparty'}</span>
                                </button>
                                {counterpartyPhone !== '' && (
                                    <a
                                        href={`tel:${counterpartyPhone}`}
                                        className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
                                    >
                                        <Phone className="size-3.5 text-emerald-300" />
                                        <span>Call</span>
                                    </a>
                                )}
                            </div>
                        )}


                    </div>
                    <section aria-label="Order progress rails" data-testid="order-progress-rails" className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <span className="block text-[10px] font-bold text-slate-500">Agreement</span>
                            <strong className="mt-1 block text-xs font-extrabold text-[#0F2F58]">
                                {orderStatus === 'accepted' || orderStatus === 'in_progress' || orderStatus === 'completed' ? 'Accepted' : orderStatus.replaceAll('_', ' ')}
                            </strong>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <span className="block text-[10px] font-bold text-slate-500">Work</span>
                            <strong className="mt-1 block text-xs font-extrabold text-[#0F2F58]">
                                {isWorkCompleted ? 'Completed' : workStatus.replaceAll('_', ' ')}
                            </strong>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <span className="block text-[10px] font-bold text-slate-500">Payment</span>
                            <strong className={`mt-1 block text-xs font-extrabold ${isPaymentSettled ? 'text-emerald-800' : 'text-[#0F2F58]'}`}>
                                {props.obligation ? props.obligation.status.replaceAll('_', ' ') : 'Not available'}
                            </strong>
                        </div>
                    </section>
                    {proposal && (
                        <section aria-label="Current proposal" className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-extrabold tracking-wider text-amber-900 uppercase">Current proposal</p>
                                    <h2 className="mt-1 text-sm font-extrabold text-slate-900">{proposal.kind.replaceAll('_', ' ')} · {proposal.status.replaceAll('_', ' ')}</h2>
                                </div>
                                <span className="font-mono text-sm font-extrabold text-[#0F2F58]">{money(proposal.amount_minor ?? undefined, proposal.currency ?? undefined)}</span>
                            </div>
                            {proposal.note && <p className="text-xs leading-relaxed text-slate-700">{proposal.note}</p>}
                            <div className="flex flex-wrap gap-2">
                                {canAcceptProposal && (
                                    <button type="button" disabled={proposalActionProcessing} onClick={() => submitSimpleProposalAction('accept', proposal.can_accept)} className="min-h-10 rounded-full bg-[#0D715F] px-4 text-xs font-extrabold text-white hover:bg-[#0a574a] disabled:opacity-50">
                                        Accept proposal
                                    </button>
                                )}
                                {canDeclineProposal && (
                                    <button type="button" disabled={proposalActionProcessing} onClick={() => submitSimpleProposalAction('decline')} className="min-h-10 rounded-full border border-rose-300 bg-white px-4 text-xs font-extrabold text-rose-800 hover:bg-rose-50 disabled:opacity-50">
                                        Decline proposal
                                    </button>
                                )}
                                {canCounterProposal && (
                                    <button type="button" disabled={proposalActionProcessing} onClick={() => openProposalSheet('counter')} className="min-h-10 rounded-full border border-[#0F2F58] bg-white px-4 text-xs font-extrabold text-[#0F2F58] hover:bg-blue-50 disabled:opacity-50">
                                        Counter proposal
                                    </button>
                                )}
                                {canAmendProposal && (
                                    <button type="button" disabled={proposalActionProcessing} onClick={() => openProposalSheet('amend')} className="min-h-10 rounded-full border border-slate-300 bg-white px-4 text-xs font-extrabold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
                                        Amend proposal
                                    </button>
                                )}
                            </div>
                        </section>
                    )}

                    {/* 2. Live Progress Execution Section */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                        {props.work?.work_shape === 'A9' ? 'A9 Delivery Plan' : 'Work Execution Pipeline'}
                                    </h2>
                                    {props.work?.signature_hash && (
                                        <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {props.work.signature_hash}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {props.work?.work_shape === 'A9'
                                        ? 'Planned delivery steps. Evidence, QA, and version acceptance happen in the A9 delivery panel.'
                                        : props.work?.nodes && props.work.nodes.length > 0
                                        ? `${props.work.nodes.length} Work nodes · ${props.work.work_shape || 'A1'}`
                                        : isPending
                                        ? 'Work steps appear after the provider accepts the order.'
                                        : 'No active Work step data is available.'}
                                </p>
                            </div>
                        </div>

                        {/* Governed Nodes List */}
                        {props.work?.nodes && props.work.nodes.length > 0 ? (
                            <div className="space-y-3">
                                {props.work.nodes.map((node) => {
                                    const kindBadge = matchNodeKindBadge(node.node_kind);
                                    const isNativeA9 = props.work?.work_shape === 'A9';
                                    const isNodeCompleted = !isNativeA9 && node.status === 'completed';
                                    const isNodeActive = !isNativeA9 && (node.status === 'in_progress' || node.status === 'active');
                                    const isAwaitingConfirm = !isNativeA9 && node.status === 'awaiting_customer_confirmation';
                                    const activeAction: WorkNodeAction = node.node_kind === 'final_signoff'
                                        ? 'propose_completion'
                                        : node.control_mode === 'customer_confirm' || node.node_kind === 'decision_gate'
                                        ? 'request_confirmation'
                                        : node.node_kind === 'handoff_ready'
                                        ? 'mark_ready_for_handoff'
                                        : 'complete_step';

                                    return (
                                        <div
                                            key={node.id}
                                            className={`rounded-xl border p-4 transition-all ${
                                                isNativeA9
                                                    ? 'border-slate-200 bg-white'
                                                    : isNodeActive
                                                    ? 'border-sky-300 bg-sky-50/30 ring-1 ring-sky-200'
                                                    : isNodeCompleted
                                                    ? 'border-emerald-200 bg-emerald-50/20'
                                                    : 'border-slate-200 bg-[#FAFCFB]'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div
                                                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                            isNativeA9
                                                                ? 'bg-slate-200 text-slate-500'
                                                                : isNodeCompleted
                                                                ? 'bg-emerald-600 text-white'
                                                                : isNodeActive
                                                                ? 'bg-[#0F2F58] text-white'
                                                                : 'bg-slate-200 text-slate-500'
                                                        }`}
                                                    >
                                                        {isNativeA9 ? node.ordinal : isNodeCompleted ? <Check className="size-3.5" /> : node.ordinal}
                                                    </div>

                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span
                                                                className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${kindBadge.style}`}
                                                            >
                                                                {kindBadge.label}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-xs font-extrabold text-slate-900 leading-snug">
                                                            {node.title}
                                                        </h3>
                                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                                            {node.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="shrink-0 text-right">
                                                    {isNativeA9 ? (
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Planned step</span>
                                                    ) : isNodeCompleted ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                                            <Check className="size-3" /> Done
                                                        </span>
                                                    ) : isAwaitingConfirm ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900 uppercase">
                                                            Needs Customer Approval
                                                        </span>
                                                    ) : isNodeActive ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F2F58] uppercase">
                                                            Active Gate
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Locked</span>
                                                    )}
                                                </div>
                                            </div>

                                            {!isNodeCompleted && (isNodeActive || isAwaitingConfirm) && (
                                                <div className="mt-3.5 border-t border-slate-200/80 pt-3">
                                                    {props.work?.work_shape !== 'A4' && props.work?.work_shape !== 'A9' && (node.can_issue_challenge || node.can_verify_challenge) && node.approval_method !== 'app_confirm' && (
                                                        <WorkClearanceChallenge orderId={props.order.id} workVersion={props.work!.version} node={node} />
                                                    )}
                                                    {perspective === 'provider' && isNodeActive && props.work?.work_shape !== 'A4' && props.work?.work_shape !== 'A9' && (
                                                        <WorkNodeEvidenceTools
                                                            orderId={props.order.id}
                                                            node={node}
                                                            action={activeAction}
                                                            processing={processingNodeId === node.id}
                                                            onSubmit={(payload) => handleAdvanceNode(node.id, activeAction, payload)}
                                                            onPreviewPhoto={setPreviewPhoto}
                                                        />
                                                    )}

                                                    {perspective === 'provider' && isAwaitingConfirm && (
                                                        <p className="text-[11px] font-semibold text-amber-800">
                                                            Submitted to the customer. Waiting for their confirmation.
                                                        </p>
                                                    )}

                                                    {perspective === 'customer' && isNodeActive && (
                                                        <p className="text-[11px] font-semibold text-slate-600">
                                                            The provider is working on this step.
                                                        </p>
                                                    )}

                                                    {perspective === 'customer' && isAwaitingConfirm && (
                                                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                                            <div className="space-y-1">
                                                                <p className="text-xs font-bold text-amber-950">
                                                                    {node.node_kind === 'final_signoff' ? 'Final work review' : 'Step approval required'}
                                                                </p>
                                                                <p className="text-[11px] text-amber-900">
                                                                    {node.node_kind === 'final_signoff'
                                                                        ? 'Review the submitted proof before signing off.'
                                                                        : 'The provider submitted this step for your review.'}
                                                                </p>
                                                            </div>
                                                            {props.work?.work_shape === 'A4' ? (
                                                                <span className="text-[11px] font-semibold text-amber-950">Use the governed A4 handoff panel below to complete authored Work proof and recipient receipt.</span>
                                                            ) : !props.order.is_order_buyer ? (
                                                                <span className="text-[11px] font-semibold text-slate-600">
                                                                    Only the child order buyer can approve this step.
                                                                </span>
                                                            ) : node.approval_method === 'presence_otp' || node.approval_method === 'worker_dropoff' ? (
                                                                <span className="text-[11px] font-semibold text-amber-950">
                                                                    {node.approval_method === 'presence_otp' ? 'This step requires the provider to verify the customer-issued in-person code.' : 'This handoff requires the receiving party to verify the worker-issued code.'}
                                                                </span>
                                                            ) : node.node_kind === 'final_signoff' ? (
                                                                props.order.can_signoff ? (
                                                                    <span className="text-[11px] font-semibold text-amber-950">
                                                                        Use the order sign-off action below after reviewing the evidence.
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[11px] font-semibold text-amber-950">
                                                                        Required proof is still under safety review.
                                                                    </span>
                                                                )
                                                            ) : node.can_confirm ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAdvanceNode(node.id, 'confirm_gate')}
                                                                    disabled={processingNodeId === node.id}
                                                                    className="min-h-10 rounded-full bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:opacity-50"
                                                                >
                                                                    Confirm step
                                                                </button>
                                                            ) : (
                                                                <span className="text-[11px] font-semibold text-amber-950">
                                                                    Required proof is still under safety review.
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {!isNativeA9 && props.order.can_view_work_evidence && (node.evidence !== null && node.evidence !== undefined || isAwaitingConfirm) && (
                                                <WorkNodeEvidenceReview
                                                    evidence={node.evidence}
                                                    node={node}
                                                    onPreviewPhoto={setPreviewPhoto}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4">
                                <p className="text-xs font-bold text-slate-800">No governed Work steps are available.</p>
                                <p className="text-[11px] leading-relaxed text-slate-600">
                                    {isPending
                                        ? 'Work steps become available after proposal acceptance.'
                                        : 'This order has no active Work node data. No completion or proof action is available here.'}
                                </p>
                            </div>
                        )}
                    </div>


                    {props.work?.work_shape === 'A9' && props.a9Delivery?.enabled && (
                        <A9DeliveryPanel orderId={props.order.id} delivery={props.a9Delivery} />
                    )}
                    {props.appointment && <AppointmentPanel orderId={props.order.id} appointment={props.appointment} />}
                    {props.a4Handoff?.enabled && (
                        <A4HandoffPanel
                            orderId={props.order.id}
                            orderVersion={props.order.version}
                            handoff={props.a4Handoff}
                        />
                    )}

                    {/* Commercial Terms */}
                    {(props.financials || amountMinor !== undefined || props.obligation) && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <h2 className="text-xs font-extrabold tracking-wider text-[#0F2F58] uppercase">Commercial terms</h2>
                                <span className="font-mono text-[9px] font-bold text-slate-400">
                                    {financialHeaderLabel}
                                </span>
                            </div>

                            <div className="space-y-2 text-xs">
                                {props.financials ? (
                                    <>
                                        {props.financials.breakdown.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-slate-700">
                                                <span>{item.label}</span>
                                                <span className="font-mono font-bold">{money(item.amount_minor, financialCurrency)}</span>
                                            </div>
                                        ))}
                                        {financialAmount !== undefined && (
                                            <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 text-sm font-extrabold text-[#0F2F58]">
                                                <span>{financialAmountLabel}:</span>
                                                <span className="font-mono text-base">{money(financialAmount, financialCurrency)}</span>
                                            </div>
                                        )}
                                    </>
                                ) : props.obligation ? (
                                    <div className="flex justify-between text-slate-700">
                                        <span>Payment obligation</span>
                                        <span className="font-mono font-bold">{money(props.obligation.amount_minor, props.obligation.currency)}</span>
                                    </div>
                                ) : amountMinor !== undefined ? (
                                    <div className="flex justify-between text-slate-700">
                                        <span>{financialAmountLabel}</span>
                                        <span className="font-mono font-bold">{formattedAmount}</span>
                                    </div>
                                ) : null}
                                {termsDifferFromObligation && props.terms && (
                                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-slate-700">
                                        <span>Current agreed terms · v{props.terms.snapshot_version}</span>
                                        <span className="shrink-0 font-mono font-bold">{money(props.terms.amount_minor, props.terms.currency)}</span>
                                    </div>
                                )}
                            </div>

                        {props.obligation && (
                            <div className="space-y-3 border-t border-slate-200 pt-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <span className="font-semibold text-slate-700">
                                        {props.obligation.lane === 'external_cash'
                                            ? 'External cash · direct between parties'
                                            : props.obligation.lane === 'p2p_transfer'
                                              ? 'Personal wallet transfer'
                                              : 'Protected digital · sandbox only'}
                                    </span>
                                    <span className="rounded-full border border-slate-200 px-2.5 py-1 font-bold text-slate-700">
                                        {props.obligation.status.replaceAll('_', ' ')}
                                    </span>
                                </div>
                                <PaymentObligationSheet key={props.obligation.id} orderId={props.order.id} obligation={props.obligation} />
                                <Link href="/money-history" className="inline-flex min-h-10 items-center text-xs font-extrabold text-[#0F2F58] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]">
                                    View money history
                                </Link>
                            </div>
                        )}
                    </div>
                        )}

                    {props.order.service_address || props.order.landmark ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                            <div className="flex items-start gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#0F2F58]">
                                    <MapPin className="size-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Service Location</span>
                                    {props.order.service_address && <div className="mt-0.5 text-xs font-extrabold text-slate-900">{props.order.service_address}</div>}
                                    {props.order.landmark && <div className="mt-0.5 text-[11px] text-slate-500">{props.order.landmark}</div>}
                                </div>
                            </div>
                        </div>
                    ) : null}
                    </div>
            </main>

            {/* 5. Fixed Bottom Action Dock */}
            <footer className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur">
                <div className="mx-auto flex max-w-4xl items-center gap-3">
                    {/* CUSTOMER ACTIONS */}
                    {perspective === 'customer' && (
                        <>
                            <Link
                                href={backHref}
                                className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
                            >
                                <ArrowLeft className="size-4 text-[#0F2F58]" />
                                <span>{props.order.deal_chain_id ? 'Relay Pool' : 'Orders Hub'}</span>
                            </Link>

                            {isSignoff && props.work?.work_shape !== 'A4' && props.work?.work_shape !== 'A9' ? (
                                props.order.can_signoff ? (
                                    <button
                                        type="button"
                                        onClick={handleSignoff}
                                        disabled={signoffProcessing}
                                        className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0D715F] px-4 text-xs font-extrabold text-white shadow-md hover:bg-[#0a574a] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {signoffProcessing ? 'Saving sign-off…' : 'Review and confirm Work'}
                                        <ArrowRight className="size-4" />
                                    </button>
                                ) : (
                                    <div className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 text-center text-xs font-bold text-amber-900">
                                        <Clock className="size-4 shrink-0 text-amber-700" aria-hidden="true" />
                                        <span>
                                            {props.order.is_order_buyer
                                                ? 'Sign-off is unavailable until the required Work evidence is approved and available.'
                                                : 'Waiting for the child order buyer to sign off.'}
                                        </span>
                                    </div>
                                )
                            ) : isWorkCompleted ? (
                                <button
                                    type="button"
                                    data-testid="leave-review-btn"
                                    onClick={() => setReviewModalOpen(true)}
                                    className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0D715F] px-4 text-xs font-extrabold text-white shadow-md hover:bg-[#0a574a]"
                                >
                                    <Star className="size-4 fill-amber-300 text-amber-300" />
                                    <span>Rate Service &amp; Share Feedback</span>
                                </button>
                            ) : null}
                        </>
                    )}

                    {/* PROVIDER ACTIONS */}
                    {perspective === 'provider' && (
                        <>
                            <Link
                                href={backHref}
                                className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
                            >
                                <ArrowLeft className="size-4 text-[#0F2F58]" />
                                <span>{props.order.deal_chain_id ? 'Relay Pool' : 'Orders Hub'}</span>
                            </Link>

                            {isWorkCompleted ? (
                                <button
                                    type="button"
                                    data-testid="provider-reliability-btn"
                                    onClick={() => setReviewModalOpen(true)}
                                    className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] px-4 text-xs font-extrabold text-white shadow-md hover:bg-[#153e74]"
                                >
                                    <ShieldCheck className="size-4 text-emerald-400" />
                                    <span>Citizen Reliability Feedback</span>
                                </button>
                            ) : isSignoff ? (
                                <div className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 text-xs font-extrabold text-amber-800 shadow-sm">
                                    <Clock className="size-4 text-amber-600" />
                                    <span>Completion proposed · waiting for customer</span>
                                </div>
                            ) : null}
                        </>
                    )}

                </div>
            </footer>

            <ConversationDrawer
                open={chatOpen}
                onClose={() => setChatOpen(false)}
                openUrl={`/orders/${props.order.id}/conversation`}
                context={conversationContext}
            />
            <GlovoWaveModal
                open={supportComposeOpen}
                onClose={() => setSupportComposeOpen(false)}
                title="Contact Support"
                subtitle={`Open an actual support case for Order ${orderShortId}`}
            >
                <form onSubmit={(event) => void createSupportCase(event)} className="space-y-4 py-4">
                    <label className="block space-y-1.5 text-sm font-semibold text-slate-800">
                        <span>Issue type</span>
                        <select
                            value={supportCategory}
                            onChange={(event) => setSupportCategory(event.target.value as SupportCategory)}
                            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                        >
                            <option value="fulfillment">Order or fulfillment</option>
                            <option value="payment">Payment</option>
                            <option value="cancellation">Cancellation</option>
                            <option value="other">Other</option>
                        </select>
                    </label>
                    <label className="block space-y-1.5 text-sm font-semibold text-slate-800">
                        <span>What do you need help with?</span>
                        <textarea
                            value={supportReport}
                            onChange={(event) => setSupportReport(event.target.value)}
                            rows={4}
                            required
                            maxLength={5000}
                            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-[#0F2F58] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0F2F58]/20"
                        />
                    </label>
                    {supportError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-900">{supportError}</p>}
                    <button type="submit" disabled={supportCreating || !supportReport.trim()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0F2F58] px-4 text-sm font-bold text-white disabled:opacity-50">
                        {supportCreating ? <><span className="size-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />Opening case…</> : 'Open support case'}
                    </button>
                </form>
            </GlovoWaveModal>
            <ConversationDrawer
                open={supportConversationOpen}
                onClose={() => setSupportConversationOpen(false)}
                openUrl={supportConversationUrl ?? undefined}
                context={conversationContext}
            />

            {/* Photo Preview Modal */}
            {previewPhoto && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setPreviewPhoto(null)}
                >
                    <div
                        className="relative max-w-lg w-full overflow-hidden rounded-2xl bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-3.5 border-b border-slate-200">
                            <span className="text-xs font-extrabold text-[#0F2F58]">
                                Inspection Proof Evidence Photo
                            </span>
                            <button
                                type="button"
                                onClick={() => setPreviewPhoto(null)}
                                className="flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        <img
                            src={previewPhoto}
                            alt="Full proof preview"
                            className="w-full max-h-[70vh] object-contain bg-black/5"
                        />
                    </div>
                </div>
            )}

            <GlovoWaveModal
                open={proposalSheetAction !== null}
                onClose={() => setProposalSheetAction(null)}
                title={proposalSheetAction === 'amend' ? 'Amend proposal' : 'Counter proposal'}
                subtitle="Send revised terms for the other party to review."
                bottomSlot={
                    <button
                        type="submit"
                        form="proposal-change-form"
                        disabled={proposalProcessing}
                        className="min-h-11 w-full rounded-full bg-[#0F2F58] px-5 text-sm font-extrabold text-white hover:bg-[#153e74] disabled:opacity-50"
                    >
                        {proposalProcessing ? 'Sending…' : proposalSheetAction === 'amend' ? 'Send amended proposal' : 'Send counterproposal'}
                    </button>
                }
            >
                <form id="proposal-change-form" onSubmit={submitProposalChange} className="space-y-4">
                    <label className="block space-y-1.5 text-xs font-bold text-slate-800">
                        <span>Amount</span>
                        <input
                            aria-label="Amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            value={proposalAmount}
                            onChange={(event) => setProposalAmount(event.target.value)}
                            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium"
                        />
                    </label>
                    {errors.amount_minor && <p role="alert" className="text-xs font-semibold text-rose-700">{Array.isArray(errors.amount_minor) ? errors.amount_minor[0] : errors.amount_minor}</p>}
                    <label className="block space-y-1.5 text-xs font-bold text-slate-800">
                        <span>Scope</span>
                        <textarea
                            aria-label="Scope"
                            rows={3}
                            value={proposalScope}
                            onChange={(event) => setProposalScope(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
                        />
                    </label>
                    <label className="block space-y-1.5 text-xs font-bold text-slate-800">
                        <span>Note</span>
                        <textarea
                            aria-label="Note"
                            rows={2}
                            value={proposalNote}
                            onChange={(event) => setProposalNote(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
                        />
                    </label>
                    {errors.note && <p role="alert" className="text-xs font-semibold text-rose-700">{Array.isArray(errors.note) ? errors.note[0] : errors.note}</p>}
                </form>
            </GlovoWaveModal>
            {/* Review Ceremony Modal */}
            <ReviewCeremonyModal
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                orderId={props.order.id}
                referenceTitle={listingTitle}
                actorRole={perspective === 'customer' ? 'buyer' : 'provider'}
                targets={[
                    {
                        orderId: props.order.id,
                        providerName: counterpartyName,
                        role: perspective === 'customer' ? 'provider' : 'customer',
                        title: listingTitle,
                    },
                ]}
            />

            {/* Bidding Lineage Drawer */}
            {props.order.bidding_lineage && (
                <GlovoWaveModal
                    isOpen={biddingDrawerOpen}
                    onClose={() => setBiddingDrawerOpen(false)}
                    title="Tender & Bidding Lineage"
                    subtitle={`${props.order.bidding_lineage.request_ref} · Awarded Contract Terms`}
                >
                    <div className="space-y-4 text-xs text-slate-700">
                        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-extrabold text-[#0D715F]">Origin Request</span>
                                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase border border-teal-200 text-[#0D715F]">
                                    {props.order.bidding_lineage.is_sealed ? 'Sealed Bidding' : 'Open Tender'}
                                </span>
                            </div>
                            <h4 className="text-sm font-bold text-[#0F2F58]">
                                {props.order.bidding_lineage.request_title}
                            </h4>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                Winning Proposal Details
                            </span>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[10px] text-slate-400 block">Winning Quote</span>
                                    <span className="font-mono font-bold text-slate-900">
                                        {props.order.bidding_lineage.quote_ref ?? 'Quote Awarded'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 block">Quote Version</span>
                                    <span className="font-mono font-bold text-slate-900">
                                        v{props.order.bidding_lineage.quote_version} (Final)
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 block">Agreed Amount</span>
                                    <span className="font-mono font-extrabold text-[#0D715F]">
                                        {props.order.bidding_lineage.winning_amount_minor !== null
                                            ? `₱${(props.order.bidding_lineage.winning_amount_minor / 100).toFixed(2)}`
                                            : formattedAmount}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 block">Total Quotes Received</span>
                                    <span className="font-bold text-slate-800">
                                        {props.order.bidding_lineage.total_quotes_received} proposals
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                            {props.order.bidding_lineage.is_sealed ? (
                                <p>
                                    <strong>Sealed Tender Confidentiality:</strong> This job was posted under sealed/blind bidding rules. Competing bids and rival quotations remain strictly confidential in the immutable vault.
                                </p>
                            ) : (
                                <p>
                                    <strong>Open Citizen Tender:</strong> Evaluated from {props.order.bidding_lineage.total_quotes_received} submitted offers in Tagudin community pool. Final terms were bilateral-locked into this legally binding execution order.
                                </p>
                            )}
                        </div>
                    </div>
                </GlovoWaveModal>
            )}
        </div>
    );
}
