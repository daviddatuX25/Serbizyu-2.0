import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText,
    Globe,
    Lock,
    MapPin,
    MessageCircle,
    Send,
    Shield,
    ZoomIn,
    TableProperties,
    SlidersHorizontal,
    Minus,
    Plus,
    Check,
    Coins,
    Camera,
    Truck,
    Workflow,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import GlovoWaveModal from '../../components/mobile/GlovoWaveModal';
import AppointmentSlotPicker, {
    type AppointmentHold,
} from '../../components/orders/AppointmentSlotPicker';
import QuoteComposerSheet, {
    type ProviderListingOption,
    type QuoteComposerPipeline,
} from '../../components/quotes/QuoteComposerSheet';
interface QuoteItem {
    id: string;
    request_id: string;
    provider_user_id: string;
    provider_name: string;
    quote_version: number;
    amount_minor: number;
    currency: string;
    scope: {
        proposal?: string;
        estimated_duration?: string;
    };
    work_shape: string;
    status: string;
    can_accept?: boolean;
    can_counter?: boolean;
    appointment_duration_minutes?: number | null;
    appointment_hold?: AppointmentHold | null;
    can_choose_appointment?: boolean;
    created_at: string;
}

const CATEGORY_IMAGES: Record<string, string> = {
    repairs: '/photos/ac-clean.jpg',
    'home-cleaning': '/photos/req-electrician.jpg',
    courier: '/photos/courier.jpg',
    'local-food': '/photos/bibingka.jpg',
    'print-assist': '/photos/greeting.jpg',
    'greeting-cards': '/photos/greeting.jpg',
    'local-services': '/photos/ac-clean.jpg',
    hardware: '/photos/req-cement.jpg',
    default: '/photos/ac-clean.jpg',
};

export function getCategoryPhoto(categoryCode?: string | null): string {
    if (!categoryCode) return CATEGORY_IMAGES.default;
    const clean = categoryCode.toLowerCase().trim();
    return CATEGORY_IMAGES[clean] ?? CATEGORY_IMAGES.default;
}

interface RequestDetailProps {
    request: {
        id: string;
        requester_user_id: string;
        requester_name: string;
        category_id?: string;
        category_code?: string | null;
        category_name?: string | null;
        title: string;
        description: string;
        item_list: {
            title?: string;
            photo?: string;
            task_scope?: string;
            preferred_fulfillment?: string;
            tender_mode?: string;
            budget_mode?: string;
            requirements?: string[];
            attach_pipeline?: boolean;
            pipeline?: QuoteComposerPipeline;
            payment_lane?: string;
        };
        budget_amount_minor: number | null;
        budget_currency: string | null;
        timing: {
            urgency?: string;
            scheduled_for?: string;
            time_window?: string;
        };
        location: {
            area_code?: string;
            barangay?: string;
            hide_exact_address?: boolean;
        };
        status: string;
        expires_at: string;
        created_at: string;
        quotes_count: number;
    };
    quotes: QuoteItem[];
    session?: {
        authenticated?: boolean;
        user_id?: string;
        display_name?: string;
    } | null;
    correlationId: string;
    my_listings?: ProviderListingOption[];
    viewer_role: string;
    actions: {
        can_quote: boolean;
        can_accept: boolean;
        is_owner: boolean;
    };
}

export default function RequestShow({
    request,
    quotes,
    session,
    my_listings = [],
    actions,
}: RequestDetailProps) {
    const isOwner = actions.is_owner;
    const [composerOpen, setComposerOpen] = useState(false);
    const [submittingQuote, setSubmittingQuote] = useState(false);
    const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);
    const [appointmentQuote, setAppointmentQuote] = useState<QuoteItem | null>(null);
    const [appointmentHold, setAppointmentHold] = useState<AppointmentHold | null>(null);
    const [acceptanceError, setAcceptanceError] = useState<string | null>(null);

    // Form state for Quote Composer sheet
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Tender mode detection
    const tenderMode = request.item_list?.tender_mode ?? 'open_tender';
    const isSealed = tenderMode === 'sealed_tender';

    // Agnostic & flexible proposal filter state
    const [filterTag, setFilterTag] = useState<'all' | 'materials' | 'labor_only' | 'delivery'>(
        'all',
    );
    const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'duration'>('price_asc');

    // Modals
    const [matrixModalOpen, setMatrixModalOpen] = useState(false);
    const [counterModalOpen, setCounterModalOpen] = useState(false);
    const [selectedQuoteForCounter, setSelectedQuoteForCounter] = useState<QuoteItem | null>(null);
    const [counterLaborAmount, setCounterLaborAmount] = useState<number>(300);
    const [counterIncludeHardware, setCounterIncludeHardware] = useState<boolean>(false);
    const [counterNote, setCounterNote] = useState<string>('');
    const [counterNotice, setCounterNotice] = useState<string | null>(null);

    // Filter and sort quotes dynamically
    const filteredQuotes = useMemo(() => {
        let list = [...quotes];
        if (filterTag === 'materials') {
            list = list.filter((q) => {
                const text = (q.scope?.proposal || '').toLowerCase();
                return (
                    text.includes('part') || text.includes('material') || text.includes('hardware')
                );
            });
        } else if (filterTag === 'labor_only') {
            list = list.filter((q) => {
                const text = (q.scope?.proposal || '').toLowerCase();
                return text.includes('labor only') || !text.includes('part');
            });
        } else if (filterTag === 'delivery') {
            list = list.filter((q) => {
                const text = (q.scope?.proposal || '').toLowerCase();
                return (
                    text.includes('courier') ||
                    text.includes('delivery') ||
                    text.includes('transit')
                );
            });
        }

        if (sortBy === 'price_asc') {
            list.sort((a, b) => a.amount_minor - b.amount_minor);
        } else if (sortBy === 'price_desc') {
            list.sort((a, b) => b.amount_minor - a.amount_minor);
        } else if (sortBy === 'duration') {
            list.sort((a, b) =>
                (a.scope?.estimated_duration || '').localeCompare(
                    b.scope?.estimated_duration || '',
                ),
            );
        }
        return list;
    }, [quotes, filterTag, sortBy]);

    const budgetFormatted = request.budget_amount_minor
        ? `₱${(request.budget_amount_minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        : 'Open Budget';

    const photoUrl = request.item_list?.photo || getCategoryPhoto(request.category_code);
    const urgencyLabel =
        request.timing?.urgency === 'today'
            ? 'Needed Today · Afternoon'
            : request.timing?.urgency === 'specific'
              ? `Scheduled: ${request.timing.scheduled_for ?? 'Specific Date'}`
              : 'Flexible Timing';

    const handleAcceptQuote = (quoteId: string) => {
        const quote = quotes.find((item) => item.id === quoteId);
        setAcceptanceError(null);
        if (quote?.work_shape === 'A3') {
            setAppointmentQuote(quote);
            setAppointmentHold(quote.appointment_hold ?? null);
            return;
        }
        if (
            !confirm(
                'Accept this provider quote and award the request? An official order will be created.',
            )
        )
            return;
        setAcceptingQuoteId(quoteId);
        router.post(
            `/requests/${request.id}/quotes/${quoteId}/accept`,
            {},
            {
                onError: (errors) =>
                    setAcceptanceError(
                        Object.values(errors).flat().join(' ') ||
                            'The quote could not be accepted.',
                    ),
                onFinish: () => setAcceptingQuoteId(null),
            },
        );
    };

    const confirmAppointmentQuote = async () => {
        if (!appointmentQuote || !appointmentHold || acceptingQuoteId !== null) return;
        if (Date.parse(appointmentHold.hold_expires_at) <= Date.now()) {
            setAcceptanceError('This appointment hold expired. Choose another time.');
            setAppointmentHold(null);
            return;
        }
        setAcceptingQuoteId(appointmentQuote.id);
        setAcceptanceError(null);
        try {
            const response = await fetch(
                `/requests/${request.id}/quotes/${appointmentQuote.id}/accept`,
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN':
                            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                                ?.content ?? '',
                    },
                    body: JSON.stringify({
                        appointment_reservation_id: appointmentHold.id,
                        quote_version: appointmentQuote.quote_version,
                    }),
                },
            );
            const result = await response.json();
            if (!response.ok)
                throw new Error(
                    result.message ??
                        result.error?.message ??
                        'The appointment quote could not be accepted.',
                );
            router.visit(`/orders/${result.data.order_id}`);
        } catch (error) {
            setAcceptanceError(
                error instanceof Error
                    ? error.message
                    : 'The appointment quote could not be accepted.',
            );
        } finally {
            setAcceptingQuoteId(null);
        }
    };

    const handleQuoteSubmit = (payload: {
        amount_minor: number;
        currency: string;
        proposal: string;
        estimated_duration: string;
        work_shape: string;
        listing_id?: string | null;
        appointment_duration_minutes?: number;
        listing_version_id?: string;
        variant_id?: string;
        quantity?: number;
        idempotency_key: string;
    }) => {
        setSubmittingQuote(true);
        setErrorMessage(null);

        router.post(`/requests/${request.id}/quotes`, payload, {
            onSuccess: () => {
                setComposerOpen(false);
                setSubmittingQuote(false);
            },
            onError: (errors) => {
                setErrorMessage(
                    Object.values(errors).flat().join(' ') || 'Could not submit quote.',
                );
                setSubmittingQuote(false);
            },
        });
    };

    const openCounterModal = (quote: QuoteItem) => {
        setSelectedQuoteForCounter(quote);
        setCounterLaborAmount(Math.round(quote.amount_minor / 100));
        setCounterIncludeHardware(false);
        setCounterNote('');
        setCounterNotice(null);
        setCounterModalOpen(true);
    };

    const handleSendCounter = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQuoteForCounter) return;

        router.post(
            `/requests/${request.id}/quotes/${selectedQuoteForCounter.id}/counter`,
            {
                amount_minor: Math.round(counterLaborAmount * 100),
                note: counterNote,
                include_hardware: counterIncludeHardware,
            },
            {
                onSuccess: () => {
                    setCounterNotice(`Counter offer submitted: ₱${counterLaborAmount.toFixed(2)}`);
                    setTimeout(() => {
                        setCounterModalOpen(false);
                        setCounterNotice(null);
                    }, 1200);
                },
                onError: (errors) => {
                    setCounterNotice(
                        Object.values(errors).flat().join(' ') || 'Could not submit counter offer.',
                    );
                },
            },
        );
    };
    return (
        <AppShell
            session={session}
            activeRoute="requests"
            activeMobileTab="explore"
            rightSlot={
                <Link
                    href="/browse"
                    className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-200"
                >
                    <ArrowLeft className="size-3.5 stroke-[2.5]" />
                    <span>Back to Marketplace</span>
                </Link>
            }
        >
            <Head title={`Request: ${request.title}`} />

            {/* Mobile Header */}
            <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden">
                <Link
                    href="/browse"
                    className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200"
                >
                    <ArrowLeft className="size-4.5 stroke-[2.5]" />
                </Link>
                <div className="text-center">
                    <span className="text-[10px] font-extrabold tracking-wider text-teal-700 uppercase">
                        {isSealed ? 'Sealed Bidding' : 'Citizen Tender'}
                    </span>
                    <h2 className="max-w-[200px] truncate text-xs font-bold text-[#0F2F58]">
                        {request.title}
                    </h2>
                </div>
                <div className="size-9" />
            </div>

            {/* Main Responsive Canvas */}
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 sm:px-6 lg:pb-12">
                {acceptanceError && !appointmentQuote && (
                    <p
                        role="alert"
                        className="mb-4 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-800"
                    >
                        {acceptanceError}
                    </p>
                )}
                <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                    {/* Left Column: Hero Photo & Main Request Specifications (7 cols) */}
                    <div className="space-y-5 lg:col-span-7">
                        {/* Hero Photo Banner */}
                        <div className="relative h-[240px] w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-200 shadow-xs sm:h-[340px]">
                            <img
                                src={photoUrl}
                                alt={request.title}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/photos/ac-clean.jpg';
                                }}
                            />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                            {/* Tender Mode Badge */}
                            <span
                                data-testid="tender-mode-badge"
                                className={`absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur-xs ${
                                    isSealed
                                        ? 'border border-purple-400/40 bg-purple-900/90 text-purple-200'
                                        : 'bg-white/95 text-[#0D715F]'
                                }`}
                            >
                                {isSealed ? (
                                    <Lock className="size-3.5" />
                                ) : (
                                    <Globe className="size-3.5 stroke-[2.5]" />
                                )}
                                <span>{isSealed ? 'Sealed Bidding' : 'Open Citizen Tender'}</span>
                            </span>

                            <button
                                type="button"
                                onClick={() => alert('Photo inspection view')}
                                className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur-xs transition-all hover:bg-white active:scale-95"
                            >
                                <ZoomIn className="size-4.5 stroke-[2.2]" />
                            </button>

                            <div className="absolute right-4 bottom-4 left-4 text-white">
                                {request.category_name ? (
                                    <div className="mb-1.5 flex items-center gap-1.5">
                                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold text-white backdrop-blur-xs">
                                            {request.category_name}
                                        </span>
                                    </div>
                                ) : null}
                                <h1 className="text-lg leading-tight font-extrabold text-white drop-shadow-sm sm:text-xl">
                                    {request.title}
                                </h1>
                            </div>
                        </div>

                        {/* Overview Card */}
                        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div>
                                    <span className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                                        Target Budget
                                    </span>
                                    <div className="text-2xl font-black tracking-tight text-[#0D715F]">
                                        {budgetFormatted}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                                        <Clock className="size-3.5 stroke-[2.5]" />
                                        <span>{urgencyLabel}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                <MapPin className="size-4 shrink-0 stroke-[2.3] text-[#0D715F]" />
                                <span>
                                    {request.location?.barangay ||
                                        request.location?.area_code ||
                                        'Tagudin, Ilocos Sur'}
                                </span>
                                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                    <Lock className="size-2.5 stroke-[2.5]" />
                                    <span>Protected Location</span>
                                </span>
                            </div>

                            <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50 p-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex size-8 items-center justify-center rounded-full bg-[#0D715F] text-xs font-extrabold text-white">
                                        {request.requester_name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900">
                                            {request.requester_name}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            Tagudin Citizen Requester
                                        </div>
                                    </div>
                                    <FileText className="ml-auto size-4 stroke-[2] text-slate-400" />
                                </div>
                                <p className="border-l-2 border-[#0D715F] py-0.5 pl-3 text-xs leading-relaxed text-slate-700 italic">
                                    &ldquo;{request.description}&rdquo;
                                </p>
                            </div>

                            {/* Scope Requirements */}
                            {Array.isArray(request.item_list?.requirements) &&
                                request.item_list.requirements.length > 0 && (
                                    <div className="space-y-2 border-t border-slate-100 pt-1">
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-[#0F2F58]">
                                            <CheckCircle2 className="size-3.5 text-teal-600" />
                                            <span>
                                                Required Deliverables (
                                                {request.item_list.requirements.length})
                                            </span>
                                        </span>
                                        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                            {request.item_list.requirements.map((req, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5"
                                                >
                                                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-900">
                                                        {i + 1}
                                                    </span>
                                                    <span className="leading-snug text-slate-700">
                                                        {req}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            {/* Fulfillment & Payment Preferences */}
                            {(request.item_list?.preferred_fulfillment ||
                                request.item_list?.payment_lane) && (
                                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2 text-xs">
                                    {request.item_list?.preferred_fulfillment && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                            <Truck className="size-3 text-slate-500" />
                                            <span>
                                                Fulfillment:{' '}
                                                <strong className="text-slate-900 capitalize">
                                                    {request.item_list.preferred_fulfillment.replace(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </strong>
                                            </span>
                                        </span>
                                    )}
                                    {request.item_list?.payment_lane && (
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                                            <Coins className="size-3 text-emerald-600" />
                                            <span>
                                                Payment:{' '}
                                                <strong className="text-emerald-950 capitalize">
                                                    {request.item_list.payment_lane ===
                                                    'external_cash'
                                                        ? 'Direct Cash (COD)'
                                                        : request.item_list.payment_lane.replace(
                                                              '_',
                                                              ' ',
                                                          )}
                                                </strong>
                                            </span>
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Planned Work Pipeline / Execution Gates */}
                            {Array.isArray(request.item_list?.pipeline?.stages) &&
                                request.item_list.pipeline.stages.length > 0 && (
                                    <div
                                        className="space-y-3 border-t border-slate-100 pt-3"
                                        data-testid="request-work-pipeline"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <Workflow className="size-4 text-[#0F2F58]" />
                                                <span className="text-xs font-bold text-[#0F2F58]">
                                                    Planned Work Gates (
                                                    {request.item_list.pipeline.stages.length})
                                                </span>
                                            </div>
                                            {request.item_list.pipeline.template && (
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                                    {request.item_list.pipeline.template}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            {request.item_list.pipeline.stages.map((stage, i) => (
                                                <div
                                                    key={stage.id || i}
                                                    className="space-y-1.5 rounded-xl border border-l-4 border-slate-200/90 border-l-[#0F2F58] bg-white p-3 shadow-2xs"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-[#0F2F58] text-[10px] font-black text-white">
                                                                {stage.num || `0${i + 1}`}
                                                            </span>
                                                            <span className="text-xs font-extrabold text-slate-900">
                                                                {stage.title}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {stage.dur && (
                                                                <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                                                    <Clock className="size-2.5" />
                                                                    <span>{stage.dur}</span>
                                                                </span>
                                                            )}
                                                            <span className="inline-flex items-center gap-1 rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
                                                                {stage.evidenceType ===
                                                                    'dual_sign' ||
                                                                stage.gateType === 'signoff' ? (
                                                                    <>
                                                                        <CheckCircle2 className="size-2.5 text-teal-600" />
                                                                        <span>Dual Signoff</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Camera className="size-2.5 text-teal-600" />
                                                                        <span>Photo Proof</span>
                                                                    </>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {stage.desc && (
                                                        <p className="pl-7 text-xs leading-relaxed font-medium text-slate-700">
                                                            {stage.desc}
                                                        </p>
                                                    )}
                                                    {stage.evidence &&
                                                        stage.evidence !==
                                                            'Verification proof required at this gate.' && (
                                                            <div className="ml-7 flex items-center gap-1.5 rounded-md border border-teal-100 bg-white p-1.5 text-[11px] text-teal-700">
                                                                <Shield className="size-3 shrink-0 text-teal-600" />
                                                                <span>Proof: {stage.evidence}</span>
                                                            </div>
                                                        )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* Right Column: Quotes & Bidding Deck (5 cols) */}
                    <div className="space-y-4 lg:col-span-5">
                        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                            {/* Header with Comparison Trigger */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <Shield className="size-4 stroke-[2.5] text-[#0D715F]" />
                                    <h3 className="text-sm font-extrabold text-[#0F2F58]">
                                        Active Provider Bids
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {quotes.length > 1 && (
                                        <button
                                            type="button"
                                            data-testid="matrix-compare-btn"
                                            onClick={() => setMatrixModalOpen(true)}
                                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-bold text-[#0D715F] transition-colors hover:bg-teal-100"
                                            title="Compare quotes side-by-side"
                                        >
                                            <TableProperties className="size-3" />
                                            <span>Matrix</span>
                                        </button>
                                    )}
                                    <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-extrabold text-[#0D715F]">
                                        {quotes.length} {quotes.length === 1 ? 'Bid' : 'Bids'}
                                    </span>
                                </div>
                            </div>

                            {/* Sealed Notice for Non-Owners */}
                            {isSealed && !isOwner && (
                                <div className="space-y-1 rounded-xl border border-purple-200 bg-purple-50/70 p-3.5 text-xs text-purple-950">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <Lock className="size-3.5 text-purple-700" />
                                        <span>Sealed Bidding</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-purple-800">
                                        Quotes remain confidential until bidding closes.
                                    </p>
                                </div>
                            )}

                            {/* Agnostic & Flexible Filter Pills */}
                            {quotes.length > 1 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                        <span>Filter Offers</span>
                                        <div className="flex items-center gap-1">
                                            <SlidersHorizontal className="size-3" />
                                            <select
                                                value={sortBy}
                                                onChange={(e) =>
                                                    setSortBy(e.target.value as typeof sortBy)
                                                }
                                                className="cursor-pointer bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-hidden"
                                            >
                                                <option value="price_asc">Lowest Price</option>
                                                <option value="price_desc">Highest Price</option>
                                                <option value="duration">Duration</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div
                                        className="flex flex-wrap gap-1.5"
                                        data-testid="bids-filter-bar"
                                    >
                                        {[
                                            { id: 'all', label: `All (${quotes.length})` },
                                            { id: 'materials', label: 'Parts Included' },
                                            { id: 'labor_only', label: 'Labor Only' },
                                            { id: 'delivery', label: 'With Courier' },
                                        ].map((pill) => (
                                            <button
                                                key={pill.id}
                                                type="button"
                                                onClick={() =>
                                                    setFilterTag(pill.id as typeof filterTag)
                                                }
                                                className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                                                    filterTag === pill.id
                                                        ? 'bg-[#0F2F58] text-white shadow-2xs'
                                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                {pill.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Bids List */}
                            {filteredQuotes.length === 0 ? (
                                <div className="space-y-1.5 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                                    <span className="text-xs font-medium text-slate-500">
                                        No quotes matching criteria.
                                    </span>
                                    <p className="text-[11px] text-slate-400">
                                        {quotes.length === 0
                                            ? 'Verified Tagudin tradespersons can submit a bid below.'
                                            : 'Try changing your filter selection.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredQuotes.map((q) => (
                                        <div
                                            key={q.id}
                                            className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition-all hover:border-teal-500 hover:bg-white"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                                        <span>{q.provider_name}</span>
                                                        <CheckCircle2 className="size-3.5 shrink-0 text-teal-600" />
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">
                                                        Duration:{' '}
                                                        {q.scope?.estimated_duration || 'Same-day'}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-[#0D715F]">
                                                        ₱{(q.amount_minor / 100).toFixed(2)}
                                                    </span>
                                                    <span className="block text-[9px] font-bold text-slate-400 uppercase">
                                                        {q.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {q.scope?.proposal && (
                                                <p className="rounded-lg border border-slate-100 bg-white p-2.5 text-xs leading-relaxed text-slate-600">
                                                    &ldquo;{q.scope.proposal}&rdquo;
                                                </p>
                                            )}

                                            {/* Action Buttons for Requester */}
                                            {q.can_accept && (
                                                <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
                                                    <button
                                                        type="button"
                                                        data-testid="negotiate-quote-btn"
                                                        onClick={() => openCounterModal(q)}
                                                        className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-95"
                                                    >
                                                        <Coins className="size-3 text-slate-500" />
                                                        <span>Counter</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={acceptingQuoteId !== null}
                                                        onClick={() => handleAcceptQuote(q.id)}
                                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0D715F] px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#0a574a] active:scale-95 disabled:opacity-50"
                                                    >
                                                        <CheckCircle2 className="size-3.5 stroke-[2.5]" />
                                                        <span>
                                                            {acceptingQuoteId === q.id
                                                                ? 'Accepting...'
                                                                : 'Accept & Hire'}
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                            {q.work_shape === 'A3' &&
                                                q.can_choose_appointment &&
                                                !q.can_accept &&
                                                q.status === 'submitted' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAcceptQuote(q.id)}
                                                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                                                    >
                                                        Choose appointment for this counter-offer
                                                    </button>
                                                )}

                                            {q.status === 'accepted' && (
                                                <div className="flex items-center justify-center gap-1.5 rounded-lg bg-teal-100/80 p-2 text-center text-xs font-bold text-teal-900">
                                                    <CheckCircle2 className="size-3.5 text-teal-700" />
                                                    <span>Winning Offer Awarded</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {actions.can_quote && (
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setComposerOpen(true)}
                                        className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0D715F] text-xs font-bold text-white shadow-md transition-all hover:bg-[#0a574a] active:scale-[0.98]"
                                    >
                                        <Send className="size-3.5 stroke-[2.5]" />
                                        <span>Submit Your Quote</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Fixed Bottom Bar */}
            {actions.can_quote ? (
                <div className="fixed right-0 bottom-0 left-0 z-30 flex items-center gap-2 border-t border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md lg:hidden">
                    <button
                        type="button"
                        onClick={() => setComposerOpen(true)}
                        className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0D715F] text-xs font-bold text-white shadow-md transition-all hover:bg-[#0a574a] active:scale-[0.98]"
                    >
                        <Send className="size-3.5 stroke-[2.5]" />
                        <span>Submit a Quote</span>
                    </button>
                    <button
                        type="button"
                        disabled
                        title="Request messaging is not available."
                        className="flex h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-500 disabled:cursor-not-allowed"
                    >
                        <MessageCircle className="size-4 stroke-[2] text-slate-500" />
                        <span>Messaging unavailable</span>
                    </button>
                </div>
            ) : isOwner ? (
                <div className="fixed right-0 bottom-0 left-0 z-30 flex items-center justify-between border-t border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md lg:hidden">
                    <span className="font-bold text-[#0F2F58]">Your Request Dashboard</span>
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-700">
                        {quotes.length} Bids Available
                    </span>
                </div>
            ) : null}

            {/* Proposal Side-by-Side Comparison Matrix Modal */}
            <GlovoWaveModal
                isOpen={matrixModalOpen}
                onClose={() => setMatrixModalOpen(false)}
                title="Compare Offers"
                subtitle={`${request.title} · ${quotes.length} Offers`}
            >
                <div className="-mx-2 overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="p-2.5 font-extrabold text-slate-700">Feature</th>
                                {quotes.map((q) => (
                                    <th
                                        key={q.id}
                                        className="min-w-[120px] p-2.5 font-extrabold text-[#0F2F58]"
                                    >
                                        {q.provider_name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr>
                                <td className="p-2.5 font-bold text-slate-500">Total Cost</td>
                                {quotes.map((q) => (
                                    <td key={q.id} className="p-2.5 font-black text-[#0D715F]">
                                        ₱{(q.amount_minor / 100).toFixed(2)}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="p-2.5 font-bold text-slate-500">Turnaround</td>
                                {quotes.map((q) => (
                                    <td key={q.id} className="p-2.5 font-semibold text-slate-800">
                                        {q.scope?.estimated_duration || 'Standard'}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="p-2.5 font-bold text-slate-500">Proposal Scope</td>
                                {quotes.map((q) => (
                                    <td
                                        key={q.id}
                                        className="p-2.5 text-[11px] leading-snug text-slate-600"
                                    >
                                        {q.scope?.proposal || 'Direct service delivery'}
                                    </td>
                                ))}
                            </tr>
                            {quotes.some((quote) => quote.can_accept) && (
                                <tr>
                                    <td className="p-2.5 font-bold text-slate-500">Award</td>
                                    {quotes.map((q) => (
                                        <td key={q.id} className="p-2.5">
                                            {q.can_accept ? (
                                                <button
                                                    type="button"
                                                    disabled={acceptingQuoteId !== null}
                                                    onClick={() => {
                                                        setMatrixModalOpen(false);
                                                        handleAcceptQuote(q.id);
                                                    }}
                                                    className="cursor-pointer rounded-lg bg-[#0D715F] px-2.5 py-1 text-[11px] font-bold text-white transition-all hover:bg-[#0a574a]"
                                                >
                                                    Accept
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 capitalize">
                                                    {q.status}
                                                </span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlovoWaveModal>

            {/* Pre-Order Counter-Offer Modal */}
            {selectedQuoteForCounter && (
                <GlovoWaveModal
                    isOpen={counterModalOpen}
                    onClose={() => setCounterModalOpen(false)}
                    title="Counter Offer"
                    subtitle={`Negotiate with ${selectedQuoteForCounter.provider_name}`}
                >
                    <form onSubmit={handleSendCounter} className="space-y-4 text-xs">
                        {counterNotice && (
                            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-bold text-emerald-900">
                                <Check className="size-4 text-emerald-600" />
                                <span>{counterNotice}</span>
                            </div>
                        )}

                        <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                Original Proposal
                            </span>
                            <div className="flex items-center justify-between font-bold text-slate-800">
                                <span>{selectedQuoteForCounter.provider_name}</span>
                                <span className="font-mono text-[#0D715F]">
                                    ₱{(selectedQuoteForCounter.amount_minor / 100).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Labor Stepper */}
                        <div className="space-y-1.5">
                            <label className="block font-bold text-slate-700">
                                Proposed Rate (PHP)
                            </label>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCounterLaborAmount((prev) => Math.max(100, prev - 20))
                                    }
                                    className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 active:scale-95"
                                >
                                    <Minus className="size-4" />
                                </button>
                                <div className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-center font-mono text-sm font-extrabold text-[#0F2F58]">
                                    ₱{counterLaborAmount.toFixed(2)}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCounterLaborAmount((prev) => prev + 20)}
                                    className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 active:scale-95"
                                >
                                    <Plus className="size-4" />
                                </button>
                            </div>
                        </div>

                        {/* Material Toggle */}
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                            <div>
                                <span className="block font-bold text-slate-800">
                                    Include Parts &amp; Materials
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    Provider supplies parts
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                checked={counterIncludeHardware}
                                onChange={(e) => setCounterIncludeHardware(e.target.checked)}
                                className="size-4 cursor-pointer rounded text-blue-600"
                            />
                        </div>

                        {/* Counter Note */}
                        <div className="space-y-1">
                            <label className="block font-bold text-slate-700">
                                Terms Note to Provider
                            </label>
                            <textarea
                                rows={2}
                                value={counterNote}
                                onChange={(e) => setCounterNote(e.target.value)}
                                placeholder="Explain scope adjustments or materials you already have on-site..."
                                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                className="w-full cursor-pointer rounded-xl bg-[#0F2F58] py-2.5 font-bold text-white transition-all hover:bg-[#1a447c]"
                            >
                                Submit Counter
                            </button>
                        </div>
                    </form>
                </GlovoWaveModal>
            )}

            {appointmentQuote && (
                <GlovoWaveModal
                    isOpen
                    onClose={() => setAppointmentQuote(null)}
                    title="Choose appointment"
                    subtitle={`Quote v${appointmentQuote.quote_version} · ${appointmentQuote.provider_name}`}
                >
                    <div className="space-y-4">
                        {acceptanceError && (
                            <p role="alert" className="text-sm text-red-800">
                                {acceptanceError}
                            </p>
                        )}
                        {appointmentHold ? (
                            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                                <p className="text-sm font-semibold">
                                    Held appointment ·{' '}
                                    {new Date(appointmentHold.starts_at).toLocaleString()} –{' '}
                                    {new Date(appointmentHold.ends_at).toLocaleTimeString()}
                                </p>
                                <p className="text-xs text-slate-600">
                                    Held until{' '}
                                    {new Date(appointmentHold.hold_expires_at).toLocaleTimeString()}
                                    . No agreement exists until the counterparty accepts.
                                </p>
                                {appointmentQuote.can_choose_appointment && (
                                    <button
                                        type="button"
                                        onClick={() => setAppointmentHold(null)}
                                        className="text-sm font-semibold underline"
                                    >
                                        Choose another time
                                    </button>
                                )}
                            </div>
                        ) : appointmentQuote.can_choose_appointment ? (
                            <AppointmentSlotPicker
                                source={{
                                    kind: 'quote',
                                    requestId: request.id,
                                    quoteId: appointmentQuote.id,
                                    quoteVersion: appointmentQuote.quote_version,
                                }}
                                onHeld={setAppointmentHold}
                                disabled={acceptingQuoteId !== null}
                            />
                        ) : (
                            <p className="text-sm text-slate-700">
                                The customer must choose an appointment before this counter-offer
                                can be accepted.
                            </p>
                        )}
                        {appointmentQuote.can_accept ? (
                            <button
                                type="button"
                                onClick={confirmAppointmentQuote}
                                disabled={!appointmentHold || acceptingQuoteId !== null}
                                className="min-h-11 w-full rounded-xl bg-[#F4A900] px-4 py-3 text-sm font-bold text-slate-900 disabled:opacity-50"
                            >
                                {acceptingQuoteId !== null
                                    ? 'Accepting…'
                                    : 'Confirm appointment and accept quote'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={!appointmentHold}
                                onClick={() => {
                                    setAppointmentQuote(null);
                                    router.reload({ only: ['quotes', 'actions'] });
                                }}
                                className="min-h-11 w-full rounded-xl bg-[#F4A900] px-4 py-3 text-sm font-bold text-slate-900 disabled:opacity-50"
                            >
                                Save appointment for the provider to review
                            </button>
                        )}
                    </div>
                </GlovoWaveModal>
            )}

            <QuoteComposerSheet
                key={request.id}
                isOpen={composerOpen}
                onClose={() => setComposerOpen(false)}
                requestId={request.id}
                requestTitle={request.title}
                budgetFormatted={budgetFormatted}
                budgetAmountMinor={request.budget_amount_minor}
                categoryCode={request.category_code}
                categoryName={request.category_name}
                requestPipeline={request.item_list?.pipeline}
                preferredFulfillment={request.item_list?.preferred_fulfillment}
                requirements={request.item_list?.requirements}
                myListings={my_listings}
                onSubmit={handleQuoteSubmit}
                isSubmitting={submittingQuote}
                errorMessage={errorMessage}
            />
        </AppShell>
    );
}
