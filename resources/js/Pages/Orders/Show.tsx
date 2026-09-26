import { useState } from 'react';
import { Form, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    ArrowRight,
    AlertCircle,
    MessageSquare,
    Camera,
    Truck,
    Package,
    MoreVertical,
    MapPin,
    ChevronDown,
    Coins,
    ShieldCheck,
} from 'lucide-react';
import type { WorkNodeRecord } from '../../types';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';

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
        actor_role: 'buyer' | 'provider' | 'courier';
        customer_name?: string;
        provider_name?: string;
        listing_title?: string;
        service_address?: string;
        landmark?: string;
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
    }[];
    errors?: Record<string, string | string[]>;
};

function money(minor: number | undefined, currency: string | undefined): string {
    if (minor === undefined || minor === null) {
        return '—';
    }
    return `${currency ?? 'PHP'} ${(minor / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function matchNodeKindBadge(kind: string): { label: string; style: string } {
    switch (kind) {
        case 'decision_gate':
            return { label: 'Customer Confirmation Gate', style: 'bg-amber-100 text-amber-900 border border-amber-300/80' };
        case 'checkin_intake':
            return { label: 'Intake / Arrival Gate', style: 'bg-blue-100 text-blue-900 border border-blue-200' };
        case 'handoff_ready':
            return { label: 'Handoff Readiness Gate', style: 'bg-sky-100 text-sky-900 border border-sky-200' };
        case 'final_signoff':
            return { label: 'Final Sign-off Gate', style: 'bg-emerald-100 text-emerald-900 border border-emerald-300' };
        default:
            return { label: 'Execution Proof Gate', style: 'bg-slate-100 text-slate-700 border border-slate-200' };
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

    // Perspective is derived and locked directly from the authenticated session
    const perspective =
        props.actor_perspective ||
        (props.order.actor_role === 'buyer' ? 'customer' : 'provider');

    // Progressive disclosure toggle for Deal Chain relay
    const [isChainExpanded, setIsChainExpanded] = useState(false);
    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

    // Interactive provider tasks state
    const [partBypassed, setPartBypassed] = useState(false);
    const [taskChecklist, setTaskChecklist] = useState<Record<string, boolean>>({
        task_diagnostics: true,
        task_installation: false,
        task_safety_test: false,
    });

    const toggleTask = (key: string) => {
        setTaskChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleAdvanceNode = (nodeId: string, action: string, payload: Record<string, unknown> = {}) => {
        router.post(`/orders/${props.order.id}/work-nodes/${nodeId}`, {
            action,
            payload: JSON.stringify(payload),
        }, {
            preserveScroll: true,
        });
    };
    // Derived lifecycle status
    const orderStatus = props.order.status;
    const workStatus = props.work?.status ?? (orderStatus === 'accepted' ? 'in_progress' : 'pending');
    const isSettled = orderStatus === 'closed' || workStatus === 'completed';
    const isSignoff = workStatus === 'awaiting_signoff' || workStatus === 'completion_proposed';
    const isInProgress = (orderStatus === 'accepted' && workStatus === 'in_progress') || workStatus === 'scheduled';
    const isPending = orderStatus === 'pending_acceptance';

    // Scoped amounts
    const amountMinor =
        props.financials?.amount_minor ??
        props.obligation?.amount_minor ??
        props.terms?.amount_minor ??
        Number(props.order.proposal?.amount_minor ?? 45000);
    const currency = props.financials?.currency ?? props.obligation?.currency ?? 'PHP';
    const formattedAmount = money(amountMinor, currency);

    const orderShortId = `#ORD-${props.order.id.slice(0, 8).toUpperCase()}`;
    const listingTitle = props.order.listing_title || 'Tagudin Service Order';

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
            <DesktopGlobalNav activeRoute="orders" />

            {/* Mobile Top Header Bar matching order-detail-mobile.html:910-924 */}
            <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur lg:hidden">
                <Link
                    href="/orders"
                    className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95"
                    aria-label="Back to Orders Hub"
                    title="Back to Orders Hub"
                >
                    <ArrowLeft className="size-4" />
                </Link>

                <div className="flex flex-col items-center min-w-0 px-2 text-center">
                    <span className="font-mono text-[10px] font-extrabold text-slate-400">
                        {orderShortId}
                    </span>
                    <span className="text-xs font-extrabold text-[#0F2F58] truncate max-w-[200px]">
                        {listingTitle}
                    </span>
                </div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setOptionsMenuOpen((prev) => !prev)}
                        className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95"
                        aria-label="Order Options"
                        title="Order Options"
                    >
                        <MoreVertical className="size-4" />
                    </button>

                    {optionsMenuOpen && (
                        <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                            <button
                                type="button"
                                onClick={() => {
                                    setOptionsMenuOpen(false);
                                    alert(`Order Support: Connected for ${orderShortId}.`);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <MessageSquare className="size-3.5" />
                                <span>Contact Support Desk</span>
                            </button>
                            <Link
                                href="/orders"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <ArrowLeft className="size-3.5" />
                                <span>Back to Orders Hub</span>
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-5 pb-32 sm:px-6 lg:py-8">
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

                <div className="flex flex-col gap-5">
                    {/* 1. Hero Feature Card (Visual Navy-to-Teal Media Card matching order-detail-mobile.html:930-970) */}
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
                                        {props.order.can_finalize ? 'Needs Acceptance' : 'Confirmed'}
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

                        {/* Timing ETA Strip */}
                        <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-[11px] text-white/90">
                            <div className="flex items-center gap-1.5">
                                <Clock className="size-3.5 text-emerald-300" />
                                <span>Estimated Arrival: ~25 mins (Today)</span>
                            </div>
                            <span className="font-mono text-xs font-extrabold text-amber-300">
                                {formattedAmount}
                            </span>
                        </div>
                    </div>

                    {/* 2. Live Progress Execution Section (Tailored per Perspective) */}
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
                                        ? `${props.work.nodes.length}-gate governed ${props.work.work_shape || 'A1'} work contract`
                                        : perspective === 'customer'
                                          ? isChainExpanded ? 'Full Relay (3 Steps)' : 'Step 2 of 3 (Active)'
                                          : 'Technician Execution & Verification Gates'}
                                </p>
                            </div>

                            {props.work?.pending_customer_confirmation && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-extrabold text-amber-800 animate-pulse">
                                    <AlertCircle className="size-3 text-amber-600" />
                                    <span>Customer Action Required</span>
                                </span>
                            )}

                            {(!props.work?.nodes || props.work.nodes.length === 0) && perspective === 'customer' && (
                                <button
                                    type="button"
                                    onClick={() => setIsChainExpanded((prev) => !prev)}
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-[#0F2F58] hover:bg-slate-200 transition-colors"
                                >
                                    <span>{isChainExpanded ? 'Collapse' : 'Full Relay'}</span>
                                    <ChevronDown
                                        className={`size-3.5 transition-transform duration-200 ${isChainExpanded ? 'rotate-180' : ''}`}
                                    />
                                </button>
                            )}
                        </div>

                        {/* DYNAMIC WORK PIPELINE */}
                        {props.work?.nodes && props.work.nodes.length > 0 ? (
                            <div className="space-y-3">
                                {props.work.nodes.map((node) => {
                                    const isNodeCompleted = node.status === 'completed';
                                    const isNodeActive = node.status === 'active';
                                    const isAwaitingConfirm = node.status === 'awaiting_customer_confirmation';
                                    const kindBadge = matchNodeKindBadge(node.node_kind);

                                    return (
                                        <div
                                            key={node.id}
                                            className={`rounded-xl border p-4 transition-all text-xs ${
                                                isAwaitingConfirm
                                                    ? 'border-amber-300 bg-amber-50/60 shadow-xs'
                                                    : isNodeActive
                                                      ? 'border-[#0F2F58]/30 bg-[#FAFCFB] shadow-xs'
                                                      : isNodeCompleted
                                                        ? 'border-emerald-200 bg-emerald-50/40'
                                                        : 'border-slate-200/80 bg-slate-50/50 opacity-60'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    <div
                                                        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                                                            isNodeCompleted
                                                                ? 'bg-emerald-600 text-white'
                                                                : isAwaitingConfirm
                                                                  ? 'bg-amber-600 text-white animate-pulse'
                                                                  : isNodeActive
                                                                    ? 'bg-[#0F2F58] text-white'
                                                                    : 'bg-slate-200 text-slate-500'
                                                        }`}
                                                    >
                                                        {isNodeCompleted ? '✓' : node.ordinal}
                                                    </div>

                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-extrabold text-slate-900 text-sm">
                                                                {node.title}
                                                            </span>
                                                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9.5px] font-extrabold uppercase ${kindBadge.style}`}>
                                                                {kindBadge.label}
                                                            </span>
                                                            {node.duration_label && (
                                                                <span className="text-[10px] text-slate-400 font-semibold">
                                                                    ~{node.duration_label}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {node.description && (
                                                            <p className="text-[11.5px] text-slate-600 leading-relaxed">
                                                                {node.description}
                                                            </p>
                                                        )}

                                                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 pt-0.5">
                                                            <ShieldCheck className="size-3 text-slate-400" />
                                                            <span>{node.evidence_description || 'Verification required'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="shrink-0 text-right">
                                                    {isNodeCompleted ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                                            <CheckCircle2 className="size-3" />
                                                            <span>Completed</span>
                                                        </span>
                                                    ) : isAwaitingConfirm ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900 uppercase">
                                                            <span>Needs Customer Approval</span>
                                                        </span>
                                                    ) : isNodeActive ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F2F58] uppercase">
                                                            <span>Active Gate</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                            Locked
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Row */}
                                            {!isNodeCompleted && (isNodeActive || isAwaitingConfirm) && (
                                                <div className="mt-3.5 border-t border-slate-200/80 pt-3 flex flex-wrap items-center justify-between gap-2">
                                                    {perspective === 'customer' && (
                                                        <>
                                                            {isAwaitingConfirm ? (
                                                                <div className="w-full flex items-center justify-between bg-amber-100/70 p-3 rounded-xl border border-amber-200">
                                                                    <div className="space-y-0.5">
                                                                        <div className="text-xs font-extrabold text-amber-950">
                                                                            Action Required: Confirm Gate
                                                                        </div>
                                                                        <div className="text-[11px] text-amber-900">
                                                                            Provider has submitted this stage for your review.
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAdvanceNode(node.id, node.node_kind === 'final_signoff' ? 'signoff_completion' : 'confirm_gate')}
                                                                        className="cursor-pointer rounded-full bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-800 transition-colors"
                                                                    >
                                                                        Approve &amp; Advance
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[11px] font-semibold text-slate-500 italic">
                                                                    Provider is currently executing this milestone.
                                                                </span>
                                                            )}
                                                        </>
                                                    )}

                                                    {perspective === 'provider' && (
                                                        <>
                                                            {isAwaitingConfirm ? (
                                                                <span className="text-[11px] font-bold text-amber-800 italic">
                                                                    Gate submitted. Waiting for customer confirmation to proceed...
                                                                </span>
                                                            ) : isNodeActive ? (
                                                                <div className="w-full flex items-center justify-between">
                                                                    <span className="text-[11px] text-slate-500">
                                                                        Proof: <strong>{node.evidence_type}</strong>
                                                                    </span>

                                                                    {node.control_mode === 'customer_confirm' || node.node_kind === 'decision_gate' ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAdvanceNode(node.id, 'request_confirmation', { proof: 'verified' })}
                                                                            className="cursor-pointer rounded-full bg-amber-600 px-4 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-amber-700 transition-colors"
                                                                        >
                                                                            Request Customer Confirmation →
                                                                        </button>
                                                                    ) : node.node_kind === 'handoff_ready' ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAdvanceNode(node.id, 'mark_ready_for_handoff')}
                                                                            className="cursor-pointer rounded-full bg-sky-700 px-4 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-sky-800 transition-colors"
                                                                        >
                                                                            Mark Ready for Collection →
                                                                        </button>
                                                                    ) : node.node_kind === 'final_signoff' ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAdvanceNode(node.id, 'propose_completion')}
                                                                            className="cursor-pointer rounded-full bg-[#0F2F58] px-4 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#153e74] transition-colors"
                                                                        >
                                                                            Propose Work Completion →
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAdvanceNode(node.id, 'complete_step')}
                                                                            className="cursor-pointer rounded-full bg-[#0F2F58] px-4 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#153e74] transition-colors"
                                                                        >
                                                                            Complete Gate →
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* FALLBACK LEGACY PERSPECTIVES */
                            <>
                        {/* CUSTOMER PERSPECTIVE: Progressive Disclosure Relay */}
                        {perspective === 'customer' && (
                            <div className="space-y-3">
                                {/* Active Step 2 (Always Visible) */}
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex size-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                                                2
                                            </div>
                                            <span className="font-extrabold text-slate-900">
                                                Courier Transit on Highway
                                            </span>
                                        </div>
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 uppercase">
                                            Active
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 leading-relaxed pl-8">
                                        Danny Express picked up replacement parts from Tagudin Hardware and is traveling to Purok 4.
                                    </p>
                                </div>

                                {/* Expanded Steps 1 & 3 */}
                                {isChainExpanded && (
                                    <div className="space-y-2.5 pt-1 border-t border-slate-100">
                                        {/* Step 1: Store Source */}
                                        <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs">
                                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                                                ✓
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-800">
                                                        Step 1 · Store Counter Pack
                                                    </span>
                                                    <span className="text-[10px] font-bold text-emerald-700">Completed</span>
                                                </div>
                                                <p className="mt-0.5 text-[11px] text-slate-500">
                                                    Tagudin Hardware Depot packed and released 35uF capacitor.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 3: On-Site Labor */}
                                        <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs">
                                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                                                3
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-800">
                                                        Step 3 · On-Site Technician Installation
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">Queued</span>
                                                </div>
                                                <p className="mt-0.5 text-[11px] text-slate-500">
                                                    Kuya Ben scheduled on-site immediately after courier delivery.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* PROVIDER PERSPECTIVE: Transit Relay Gating & Real Task Checklist */}
                        {perspective === 'provider' && (
                            <div className="space-y-3.5">
                                {/* Transit Gating Banner */}
                                <div
                                    className={`rounded-xl border p-3.5 text-xs transition-colors ${
                                        partBypassed
                                            ? 'border-emerald-200 bg-emerald-50/60'
                                            : 'border-amber-200 bg-amber-50/70'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 font-bold text-slate-800">
                                            <Package className="size-4 text-[#0F2F58]" />
                                            <span>
                                                {partBypassed
                                                    ? 'Part on Site (Manual Override Confirmed)'
                                                    : 'Transit Relay Gating: Waiting for Courier'}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPartBypassed((prev) => !prev)}
                                            className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F2F58] hover:bg-slate-50 cursor-pointer"
                                        >
                                            {partBypassed ? 'Undo' : 'Bypass (Part on Site)'}
                                        </button>
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-600">
                                        {partBypassed
                                            ? 'You confirmed capacitor is present. You can execute installation tasks directly.'
                                            : 'Danny Express is in transit with the 35uF capacitor. If part is already with you, tap Bypass.'}
                                    </p>
                                </div>

                                {/* Task Checklist */}
                                <div className="space-y-2">
                                    <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                                        Service Milestone Checklist
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label
                                            onClick={() => toggleTask('task_diagnostics')}
                                            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs transition-all ${
                                                taskChecklist.task_diagnostics
                                                    ? 'border-emerald-200 bg-emerald-50/50'
                                                    : 'border-slate-200 bg-[#FAFCFB]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={taskChecklist.task_diagnostics}
                                                    onChange={() => {}}
                                                    className="size-4 rounded accent-[#0F2F58]"
                                                />
                                                <span className="font-bold text-slate-800">
                                                    1. Main breaker lock-out &amp; coil inspection
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-700">
                                                {taskChecklist.task_diagnostics ? 'Verified' : 'Pending'}
                                            </span>
                                        </label>

                                        <label
                                            onClick={() => toggleTask('task_installation')}
                                            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs transition-all ${
                                                taskChecklist.task_installation
                                                    ? 'border-emerald-200 bg-emerald-50/50'
                                                    : 'border-slate-200 bg-[#FAFCFB]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={taskChecklist.task_installation}
                                                    onChange={() => {}}
                                                    className="size-4 rounded accent-[#0F2F58]"
                                                />
                                                <span className="font-bold text-slate-800">
                                                    2. Install 35uF capacitor &amp; crimp terminals
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-600">
                                                {taskChecklist.task_installation ? 'Verified' : partBypassed ? 'Ready' : 'Waiting on part'}
                                            </span>
                                        </label>

                                        <label
                                            onClick={() => toggleTask('task_safety_test')}
                                            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs transition-all ${
                                                taskChecklist.task_safety_test
                                                    ? 'border-emerald-200 bg-emerald-50/50'
                                                    : 'border-slate-200 bg-[#FAFCFB]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={taskChecklist.task_safety_test}
                                                    onChange={() => {}}
                                                    className="size-4 rounded accent-[#0F2F58]"
                                                />
                                                <span className="font-bold text-slate-800">
                                                    3. Cold compressor run &amp; photo sign-off
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {taskChecklist.task_safety_test ? 'Verified' : 'Queued'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* COURIER PERSPECTIVE: Transit Route Steps */}
                        {perspective === 'courier' && (
                            <div className="space-y-3">
                                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 text-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 font-bold text-sky-900">
                                            <Truck className="size-4 text-sky-700" />
                                            <span>Rider Route: Store to Purok 4</span>
                                        </div>
                                        <span className="font-mono font-extrabold text-[#0F2F58]">
                                            ₱80.00 Delivery Fee
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 text-[11px] text-slate-600">
                                        <div>• <strong>Pickup:</strong> Tagudin Hardware Depot · Counter Lane</div>
                                        <div>• <strong>Destination:</strong> {props.order.service_address || 'Purok 4, Barangay Centro'}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-[#FAFCFB] p-3 text-xs">
                                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                                        ✓
                                    </div>
                                    <span className="font-bold text-slate-800">
                                        Pickup verified at counter · En route to gate
                                    </span>
                                </div>
                            </div>
                        )}
                            </>
                        )}
                    </div>

                    {/* 3. Graphic Invoice Card matching order-detail-mobile.html:1050-1110 */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div>
                                <h2 className="text-sm font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                    Graphic Invoice
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {props.financials?.label || 'Total Agreed Settlement'}
                                </p>
                            </div>
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                0% Platform Fee · Tagudin Public Rails
                            </span>
                        </div>

                        {/* Breakdown Rows */}
                        <div className="space-y-2 text-xs">
                            {props.financials?.breakdown?.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-slate-600">
                                    <span>{item.label}</span>
                                    <span className="font-mono font-bold text-slate-800">
                                        ₱{(item.amount_minor / 100).toFixed(2)}
                                    </span>
                                </div>
                            )) || (
                                <>
                                    <div className="flex justify-between text-slate-600">
                                        <span>Labor &amp; Service:</span>
                                        <span className="font-mono font-bold text-slate-800">
                                            {formattedAmount}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>Platform Commission:</span>
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

                    {/* 4. Service Location Strip matching order-detail-mobile.html:1120-1160 */}
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
                                    {props.order.service_address || 'Purok 4, Barangay Centro, Tagudin, Ilocos Sur'}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                    {props.order.landmark || 'Near Barangay Health Center · Blue Gate'}
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

            {/* 5. Fixed Bottom Action Dock (Tailored per Perspective matching order-detail-mobile.html:1170-1280) */}
            <footer className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur">
                <div className="mx-auto flex max-w-4xl items-center gap-3">
                    {/* CUSTOMER ACTIONS */}
                    {perspective === 'customer' && (
                        <>
                            <button
                                type="button"
                                onClick={() => router.visit('/orders')}
                                className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
                            >
                                <MessageSquare className="size-4 text-[#0F2F58]" />
                                <span>Orders Hub</span>
                            </button>

                            {isSignoff ? (
                                <button
                                    type="button"
                                    onClick={() => router.post(`/orders/${props.order.id}/work/signoff`)}
                                    className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0D715F] px-4 text-xs font-extrabold text-white shadow-md hover:bg-[#0a574a]"
                                >
                                    <span>Review Photos &amp; Release Escrow</span>
                                    <ArrowRight className="size-4" />
                                </button>
                            ) : isSettled ? (
                                <button
                                    type="button"
                                    onClick={() => router.visit('/browse')}
                                    className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] px-4 text-xs font-extrabold text-white shadow-md hover:bg-[#153e74]"
                                >
                                    <span>Order Completed · Browse More Offers</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => router.visit(`/orders/${props.order.id}`)}
                                    className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] px-4 text-xs font-extrabold text-white shadow-md hover:bg-[#153e74]"
                                >
                                    <span>Work in Progress · {formattedAmount}</span>
                                    <ArrowRight className="size-4" />
                                </button>
                            )}
                        </>
                    )}

                    {/* PROVIDER ACTIONS */}
                    {perspective === 'provider' && (
                        <>
                            <button
                                type="button"
                                onClick={() => router.visit('/my-listings')}
                                className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
                            >
                                <Camera className="size-4 text-[#0F2F58]" />
                                <span>My Listings</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => router.post(`/orders/${props.order.id}/work/propose-completion`)}
                                className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] px-4 text-xs font-extrabold text-white shadow-md hover:bg-[#153e74]"
                            >
                                <span>Request Completion Sign-off</span>
                                <ArrowRight className="size-4" />
                            </button>
                        </>
                    )}

                    {/* COURIER ACTIONS */}
                    {perspective === 'courier' && (
                        <>
                            <button
                                type="button"
                                onClick={() => router.post(`/orders/${props.order.id}/courier/pickup`)}
                                className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
                            >
                                <Package className="size-4 text-[#0F2F58]" />
                                <span>Confirm Pickup</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => router.post(`/orders/${props.order.id}/courier/handoff`)}
                                className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] px-4 text-xs font-extrabold text-white shadow-md hover:bg-[#153e74]"
                            >
                                <span>Confirm Hand-off at Gate · ₱80.00</span>
                                <ArrowRight className="size-4" />
                            </button>
                        </>
                    )}
                </div>
            </footer>
        </div>
    );
}
