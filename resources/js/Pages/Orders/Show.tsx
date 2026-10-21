import { useState } from 'react';
import { Form, Link, router, usePage } from '@inertiajs/react';
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
    Send,
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
type OrderShowProps = {
    correlationId?: string | null;
    notice?: string | null;
    actor_perspective?: 'customer' | 'provider' | 'courier';
    order: {
        id: string;
        status: string;
        version: number;
        listing_id: string;
        mechanism: string;
        origin: string;
        geography?: string | null;
        proposal?: Record<string, unknown>;
        can_finalize: boolean;
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
        status: string;
        work_shape: string;
        signature_hash?: string | null;
        active_node_id?: string | null;
        active_ordinal?: number;
        pending_customer_confirmation?: boolean;
        nodes?: WorkNodeRecord[];
    } | null;
    obligation?: {
        id: string;
        status: string;
        lane: string;
        amount_minor: number;
        currency: string;
    } | null;
    financials?: {
        amount_minor: number;
        currency: string;
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
};

interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    time: string;
    isSelf: boolean;
}

function money(minor: number | undefined, currency: string | undefined): string {
    if (minor === undefined || minor === null) {
        return '—';
    }
    return `${currency ?? 'PHP'} ${(minor / 100).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
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

    // Chat drawer state
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        {
            id: 'c1',
            sender: perspective === 'customer' ? (props.order.provider_name ?? 'Provider') : (props.order.customer_name ?? 'Customer'),
            text: perspective === 'customer'
                ? 'Good day! I have confirmed your appointment and am preparing the equipment.'
                : 'Hello! Looking forward to the service. Please let me know once you arrive at the gate.',
            time: '1:10 PM',
            isSelf: false,
        },
    ]);

    // Support Desk drawer state
    const [supportOpen, setSupportOpen] = useState(false);
    const [biddingDrawerOpen, setBiddingDrawerOpen] = useState(false);
    const [supportInput, setSupportInput] = useState('');
    const [supportMessages, setSupportMessages] = useState<ChatMessage[]>([
        {
            id: 's1',
            sender: 'Tagudin Dispatch Support',
            text: 'Hello! You are connected to Serbizyu Tagudin Support (#SUP-TAGUDIN). How can we assist with your order?',
            time: 'Just now',
            isSelf: false,
        },
    ]);

    const [processingNodeId, setProcessingNodeId] = useState<string | null>(null);
    const [signoffProcessing, setSignoffProcessing] = useState(false);

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

    const handleSendChatMessage = () => {
        if (!chatInput.trim()) return;
        const newMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            sender: 'You',
            text: chatInput.trim(),
            time: 'Just now',
            isSelf: true,
        };
        setChatMessages((prev) => [...prev, newMsg]);
        setChatInput('');
    };

    const handleSendSupportMessage = () => {
        if (!supportInput.trim()) return;
        const newMsg: ChatMessage = {
            id: `sup-${Date.now()}`,
            sender: 'You',
            text: supportInput.trim(),
            time: 'Just now',
            isSelf: true,
        };
        setSupportMessages((prev) => [...prev, newMsg]);
        setSupportInput('');
        setTimeout(() => {
            setSupportMessages((prev) => [
                ...prev,
                {
                    id: `sup-reply-${Date.now()}`,
                    sender: 'Tagudin Dispatch Support',
                    text: 'Thank you for your report. A local dispatch agent has noted this on Order ' + props.order.id.slice(0, 8).toUpperCase() + '.',
                    time: 'Just now',
                    isSelf: false,
                },
            ]);
        }, 1000);
    };

    // Derived lifecycle status
    const orderStatus = props.order.status;
    const workStatus =
        props.work?.status ??
        (orderStatus === 'accepted' ? 'in_progress' : 'pending');
    const isSettled = orderStatus === 'closed' || workStatus === 'completed';
    const isSignoff =
        workStatus === 'awaiting_signoff' ||
        workStatus === 'completion_proposed';
    const isInProgress =
        (orderStatus === 'accepted' && workStatus === 'in_progress') ||
        workStatus === 'scheduled';
    const isPending = orderStatus === 'pending_acceptance';

    // Scoped amounts
    const amountMinor =
        props.financials?.amount_minor ??
        props.obligation?.amount_minor ??
        props.terms?.amount_minor ??
        Number(props.order.proposal?.amount_minor ?? 45000);
    const currency =
        props.financials?.currency ?? props.obligation?.currency ?? 'PHP';
    const formattedAmount = money(amountMinor, currency);

    const orderShortId = `#ORD-${props.order.id.slice(0, 8).toUpperCase()}`;
    const listingTitle = props.order.listing_title || 'Tagudin Service Order';

    // Smart back link
    const backHref = props.order.deal_chain_id
        ? `/deal-chains/${props.order.deal_chain_id}`
        : '/orders';
    const backLabel = props.order.deal_chain_id
        ? `${props.order.deal_chain_ref ?? 'Deal Chain'} Relay Pool`
        : 'Orders Hub';

    const counterpartyName = props.order.counterparty_name ?? '';
    const counterpartyPhone = props.order.counterparty_phone ?? '';

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
                                        setSupportOpen(true);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <HelpCircle className="size-3.5 text-blue-600" />
                                    <span>Contact Support Desk</span>
                                </button>
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
                        {props.order.can_contact && counterpartyPhone !== '' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setChatOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
                                >
                                    <MessageSquare className="size-3.5 text-sky-600" />
                                    <span>Message {counterpartyName.split(' ')[0]}</span>
                                </button>
                                <a
                                    href={`tel:${counterpartyPhone}`}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
                                >
                                    <Phone className="size-3.5 text-emerald-600" />
                                    <span>Call</span>
                                </a>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={() => setSupportOpen(true)}
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
                                            isSettled
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
                                            {isSettled
                                                ? 'Settled & Closed'
                                                : isSignoff
                                                ? 'Awaiting Sign-off'
                                                : isInProgress
                                                ? 'Work Underway'
                                                : isPending
                                                ? 'Pending Acceptance'
                                                : 'Confirmed'}
                                        </span>
                                    </span>
                                    <span className="text-[10px] font-bold text-white/70">
                                        {props.order.can_finalize
                                            ? 'Needs Acceptance'
                                            : 'Confirmed'}
                                    </span>
                                </div>

                                <h1 className="text-lg font-extrabold text-white sm:text-xl leading-snug pt-1">
                                    {listingTitle}
                                </h1>

                                <p className="text-xs text-white/80">
                                    {perspective === 'customer'
                                        ? `Provider: ${props.order.provider_name || 'Kuya Ben AC'} · Centro, Tagudin`
                                        : perspective === 'provider'
                                        ? `Client: ${props.order.customer_name || 'Maria Santos'} · Tagudin Resident`
                                        : `Delivery Assignment: Danny Express Rider`}
                                </p>
                            </div>

                            {/* Service Media Thumbnail */}
                            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/20 shadow-sm bg-white/10">
                                <img
                                    src="/photos/ac-clean.jpg"
                                    alt="Service thumbnail"
                                    className="size-full object-cover"
                                />
                            </div>
                        </div>
                        {props.order.can_contact && counterpartyPhone !== '' && (
                            <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setChatOpen(true)}
                                    className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 py-1.5 text-xs font-bold text-white hover:bg-white/20"
                                >
                                    <MessageSquare className="size-3.5 text-sky-300" />
                                    <span>Message {counterpartyName.split(' ')[0]}</span>
                                </button>
                                <a
                                    href={`tel:${counterpartyPhone}`}
                                    className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
                                >
                                    <Phone className="size-3.5 text-emerald-300" />
                                    <span>Call</span>
                                </a>
                            </div>
                        )}


                        {/* Timing ETA Strip */}
                        <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-2.5 text-[11px] text-white/90">
                            <div className="flex items-center gap-1.5">
                                <Clock className="size-3.5 text-emerald-300" />
                                <span>Estimated Arrival: ~25 mins (Today)</span>
                            </div>
                            <span className="font-mono text-xs font-extrabold text-amber-300">
                                {formattedAmount}
                            </span>
                        </div>
                    </div>

                    {/* 2. Live Progress Execution Section */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                        Work Execution Pipeline
                                    </h2>
                                    {props.work?.signature_hash && (
                                        <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {props.work.signature_hash}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {props.work?.nodes && props.work.nodes.length > 0
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
                                    const isNodeCompleted = node.status === 'completed';
                                    const isNodeActive = node.status === 'in_progress' || node.status === 'active';
                                    const isAwaitingConfirm = node.status === 'awaiting_customer_confirmation';
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
                                                isNodeActive
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
                                                            isNodeCompleted
                                                                ? 'bg-emerald-600 text-white'
                                                                : isNodeActive
                                                                ? 'bg-[#0F2F58] text-white'
                                                                : 'bg-slate-200 text-slate-500'
                                                        }`}
                                                    >
                                                        {isNodeCompleted ? <Check className="size-3.5" /> : node.ordinal}
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
                                                    {isNodeCompleted ? (
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
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                            Locked
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {!isNodeCompleted && (isNodeActive || isAwaitingConfirm) && (
                                                <div className="mt-3.5 border-t border-slate-200/80 pt-3">
                                                    {perspective === 'provider' && isNodeActive && (
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
                                                            {!props.order.is_order_buyer ? (
                                                                <span className="text-[11px] font-semibold text-slate-600">
                                                                    Only the child order buyer can approve this step.
                                                                </span>
                                                            ) : node.approval_method === 'presence_otp' ? (
                                                                <span className="text-[11px] font-semibold text-amber-950">
                                                                    This step requires an in-person confirmation code.
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

                                            {props.order.can_view_work_evidence && (node.evidence !== null && node.evidence !== undefined || isAwaitingConfirm) && (
                                                <WorkNodeEvidenceReview
                                                    evidence={node.evidence}
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
                                        ? 'Work steps appear after the provider accepts and the order is finalized.'
                                        : 'This order has no active Work node data. No completion or proof action is available here.'}
                                </p>
                            </div>
                        )}
                    </div>


                    {/* 3. Graphic Invoice */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h2 className="text-xs font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                Graphic Invoice
                            </h2>
                            <span className="font-mono text-[9px] font-bold text-slate-400">
                                {props.financials?.label || 'Direct Settlement'}
                            </span>
                        </div>

                        <div className="space-y-2 text-xs">
                            {props.financials?.breakdown?.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-slate-700">
                                    <span>{item.label}</span>
                                    <span className="font-mono font-bold">
                                        {money(item.amount_minor, currency)}
                                    </span>
                                </div>
                            )) || (
                                <>
                                    <div className="flex justify-between text-slate-700">
                                        <span>Primary Consideration:</span>
                                        <span className="font-mono font-bold">{formattedAmount}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>0% Platform Fee · Tagudin Public Rails</span>
                                        <span className="font-mono font-bold text-emerald-700">
                                            ₱0.00 (Zero Fee)
                                        </span>
                                    </div>
                                </>
                            )}

                            <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 text-sm font-extrabold text-[#0F2F58]">
                                <span>{props.financials?.label || 'Total Amount'}:</span>
                                <span className="font-mono text-base">{formattedAmount}</span>
                            </div>
                        </div>

                        {/* Payment Method Badge Strip */}
                        <div className="rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-700 font-semibold">
                                <Coins className="size-4 text-[#0F2F58]" />
                                <span>
                                    {props.obligation?.lane === 'external_cash'
                                        ? 'Cash on Delivery · Due on Completion'
                                        : 'Escrow Secured via Tagudin Rails'}
                                </span>
                            </div>
                            <span
                                className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase ${
                                    isSettled
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                }`}
                            >
                                {isSettled ? 'Settled' : 'Payment Pending'}
                            </span>
                        </div>
                    </div>

                    {/* 4. Service Location Strip */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                        <div className="flex items-start gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#0F2F58]">
                                <MapPin className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                    Service Location · Tagudin
                                </span>
                                <div className="text-xs font-extrabold text-slate-900 mt-0.5">
                                    {props.order.service_address ||
                                        'Purok 4, Barangay Centro, Tagudin, Ilocos Sur'}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                    {props.order.landmark ||
                                        'Near Barangay Health Center · Blue Gate'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Finalize Form for Pending Orders */}
                    {props.order.can_finalize && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                            <Form
                                action={`/orders/${props.order.id}/finalize`}
                                method="post"
                                className="space-y-3"
                            >
                                <div>
                                    <div className="text-xs font-extrabold text-amber-900">
                                        Awaiting Standing Acceptance
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                                        Both parties agree to the work scope and commercial terms.
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#153e74]"
                                >
                                    <span>Authorize &amp; Lock Standing Acceptance</span>
                                    <ArrowRight className="size-3.5" />
                                </button>
                            </Form>
                        </div>
                    )}
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

                            {isSignoff ? (
                                props.order.can_signoff ? (
                                    <button
                                        type="button"
                                        onClick={handleSignoff}
                                        disabled={signoffProcessing}
                                        className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0D715F] px-4 text-xs font-extrabold text-white shadow-md hover:bg-[#0a574a] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {signoffProcessing ? 'Saving sign-off…' : 'Review work & release payment'}
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
                            ) : isSettled ? (
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

                            {isSettled ? (
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

                    {/* COURIER ACTIONS */}
                    {perspective === 'courier' && (
                        <>
                            {isSettled ? (
                                <div className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-extrabold text-emerald-800 shadow-sm">
                                    <CheckCircle2 className="size-4 text-emerald-600" />
                                    <span>Delivery Completed · Transit Fee Settled</span>
                                </div>
                            ) : isInProgress ? (
                                <>
                                    <div className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-800">
                                        <CheckCircle2 className="size-4 text-emerald-600" />
                                        <span>Picked Up</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.post(`/orders/${props.order.id}/courier/handoff`)
                                        }
                                        className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] px-4 text-xs font-extrabold text-white shadow-md hover:bg-[#153e74]"
                                    >
                                        <span>Confirm Hand-off at Gate · {formattedAmount}</span>
                                        <ArrowRight className="size-4" />
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.post(`/orders/${props.order.id}/courier/pickup`)
                                    }
                                    className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] px-4 text-xs font-extrabold text-white shadow-md hover:bg-[#153e74]"
                                >
                                    <Package className="size-4 text-white" />
                                    <span>Confirm Package Pickup at Store</span>
                                    <ArrowRight className="size-4" />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </footer>

            {/* Direct Order Chat Drawer */}
            {chatOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
                    onClick={() => setChatOpen(false)}
                >
                    <div
                        className="flex h-[85vh] sm:h-[620px] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black text-[#0F2F58] truncate">
                                        Chat with {counterpartyName}
                                    </h3>
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold text-emerald-800">
                                        Online
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate">
                                    Order {orderShortId} · {listingTitle}
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

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
                            {chatMessages.map((m) => (
                                <div
                                    key={m.id}
                                    className={`flex flex-col ${m.isSelf ? 'items-end' : 'items-start'}`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1 px-1">
                                        <span className="text-[10px] font-extrabold text-slate-600">
                                            {m.sender}
                                        </span>
                                        <span className="text-[9px] text-slate-400">{m.time}</span>
                                    </div>
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed ${
                                            m.isSelf
                                                ? 'bg-[#0F2F58] text-white shadow-xs rounded-br-xs'
                                                : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-xs'
                                        }`}
                                    >
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Prompts */}
                        <div className="border-t border-slate-100 bg-white px-4 py-2 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                            <button
                                type="button"
                                onClick={() => setChatInput('I have arrived at the gate.')}
                                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:bg-slate-100 font-bold"
                            >
                                I have arrived at the gate
                            </button>
                            <button
                                type="button"
                                onClick={() => setChatInput('Testing the cold run now.')}
                                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:bg-slate-100 font-bold"
                            >
                                Testing cold run now
                            </button>
                            <button
                                type="button"
                                onClick={() => setChatInput('Gate is open, please enter.')}
                                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:bg-slate-100 font-bold"
                            >
                                Gate is open
                            </button>
                        </div>

                        {/* Composer */}
                        <div className="border-t border-slate-200 bg-white p-3.5">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendChatMessage();
                                }}
                                className="flex items-center gap-2"
                            >
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={`Message ${counterpartyName.split(' ')[0]}...`}
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

            {/* Support Desk Drawer */}
            {supportOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
                    onClick={() => setSupportOpen(false)}
                >
                    <div
                        className="flex h-[85vh] sm:h-[620px] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                            <div>
                                <h3 className="text-sm font-black text-[#0F2F58]">
                                    Tagudin Dispatch &amp; Support Desk
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Ticket #SUP-TAGUDIN · Order {orderShortId}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSupportOpen(false)}
                                className="flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/70"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                            {supportMessages.map((m) => (
                                <div
                                    key={m.id}
                                    className={`flex flex-col ${m.isSelf ? 'items-end' : 'items-start'}`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1 px-1">
                                        <span className="text-[10px] font-extrabold text-slate-600">
                                            {m.sender}
                                        </span>
                                        <span className="text-[9px] text-slate-400">{m.time}</span>
                                    </div>
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed ${
                                            m.isSelf
                                                ? 'bg-[#0F2F58] text-white shadow-xs rounded-br-xs'
                                                : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-xs'
                                        }`}
                                    >
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-slate-200 bg-white p-3.5">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendSupportMessage();
                                }}
                                className="flex items-center gap-2"
                            >
                                <input
                                    type="text"
                                    value={supportInput}
                                    onChange={(e) => setSupportInput(e.target.value)}
                                    placeholder="Explain issue or ask dispatch for help..."
                                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0F2F58] focus:bg-white focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={!supportInput.trim()}
                                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-xs hover:bg-blue-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                                >
                                    <Send className="size-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

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
