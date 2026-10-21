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
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import GlovoWaveModal from '../../components/mobile/GlovoWaveModal';
import QuoteComposerSheet, { type ProviderListingOption } from '../../components/quotes/QuoteComposerSheet';
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
    created_at: string;
}

interface RequestDetailProps {
    request: {
        id: string;
        requester_user_id: string;
        requester_name: string;
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
}

export default function RequestShow({
    request,
    quotes,
    session,
    my_listings = [],
}: RequestDetailProps) {
    const isOwner = session?.authenticated && session.user_id === request.requester_user_id;
    const [composerOpen, setComposerOpen] = useState(false);
    const [submittingQuote, setSubmittingQuote] = useState(false);
    const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);

    // Form state for Quote Composer sheet
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Tender mode detection
    const tenderMode = request.item_list?.tender_mode ?? 'open_tender';
    const isSealed = tenderMode === 'sealed_tender';

    // Agnostic & flexible proposal filter state
    const [filterTag, setFilterTag] = useState<'all' | 'materials' | 'labor_only' | 'delivery'>('all');
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
                return text.includes('part') || text.includes('material') || text.includes('hardware');
            });
        } else if (filterTag === 'labor_only') {
            list = list.filter((q) => {
                const text = (q.scope?.proposal || '').toLowerCase();
                return text.includes('labor only') || !text.includes('part');
            });
        } else if (filterTag === 'delivery') {
            list = list.filter((q) => {
                const text = (q.scope?.proposal || '').toLowerCase();
                return text.includes('courier') || text.includes('delivery') || text.includes('transit');
            });
        }

        if (sortBy === 'price_asc') {
            list.sort((a, b) => a.amount_minor - b.amount_minor);
        } else if (sortBy === 'price_desc') {
            list.sort((a, b) => b.amount_minor - a.amount_minor);
        } else if (sortBy === 'duration') {
            list.sort((a, b) => (a.scope?.estimated_duration || '').localeCompare(b.scope?.estimated_duration || ''));
        }
        return list;
    }, [quotes, filterTag, sortBy]);

    const budgetFormatted = request.budget_amount_minor
        ? `₱${(request.budget_amount_minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        : 'Open Budget';

    const photoUrl = request.item_list?.photo || '/photos/req-electrician.jpg';
    const urgencyLabel =
        request.timing?.urgency === 'today'
            ? 'Needed Today · Afternoon'
            : request.timing?.urgency === 'specific'
              ? `Scheduled: ${request.timing.scheduled_for ?? 'Specific Date'}`
              : 'Flexible Timing';

    const handleAcceptQuote = (quoteId: string) => {
        if (!confirm('Accept this provider quote and award the request? An official order will be created.')) {
            return;
        }

        setAcceptingQuoteId(quoteId);
        router.post(
            `/requests/${request.id}/quotes/${quoteId}/accept`,
            {},
            {
                onError: (errors) => {
                    alert(Object.values(errors).flat().join('\n') || 'Failed to accept quote.');
                    setAcceptingQuoteId(null);
                },
            }
        );
    };

    const handleQuoteSubmit = (payload: {
        amount_minor: number;
        currency: string;
        proposal: string;
        estimated_duration: string;
        work_shape: string;
        listing_id?: string | null;
        idempotency_key: string;
    }) => {
        setSubmittingQuote(true);
        setErrorMessage(null);

        router.post(
            `/requests/${request.id}/quotes`,
            payload,
            {
                onSuccess: () => {
                    setComposerOpen(false);
                    setSubmittingQuote(false);
                },
                onError: (errors) => {
                    setErrorMessage(Object.values(errors).flat().join(' ') || 'Could not submit quote.');
                    setSubmittingQuote(false);
                },
            }
        );
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
                    setCounterNotice(
                        `Counter offer submitted: ₱${counterLaborAmount.toFixed(2)}`
                    );
                    setTimeout(() => {
                        setCounterModalOpen(false);
                        setCounterNotice(null);
                    }, 1200);
                },
                onError: (errors) => {
                    setCounterNotice(Object.values(errors).flat().join(' ') || 'Could not submit counter offer.');
                },
            }
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
                    className="flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-4 py-1.5 text-xs font-bold text-slate-800 transition-colors"
                >
                    <ArrowLeft className="size-3.5 stroke-[2.5]" />
                    <span>Back to Marketplace</span>
                </Link>
            }
        >
            <Head title={`Request: ${request.title}`} />

            {/* Mobile Header */}
            <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <Link
                    href="/browse"
                    className="size-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors"
                >
                    <ArrowLeft className="size-4.5 stroke-[2.5]" />
                </Link>
                <div className="text-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">
                        {isSealed ? 'Sealed Bidding' : 'Citizen Tender'}
                    </span>
                    <h2 className="text-xs font-bold text-[#0F2F58] truncate max-w-[200px]">{request.title}</h2>
                </div>
                <div className="size-9" />
            </div>

            {/* Main Responsive Canvas */}
            <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 pb-28 lg:pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Hero Photo & Main Request Specifications (7 cols) */}
                    <div className="lg:col-span-7 space-y-5">
                        {/* Hero Photo Banner */}
                        <div className="relative w-full h-[240px] sm:h-[340px] rounded-2xl overflow-hidden bg-slate-200 shadow-xs border border-slate-200/80">
                            <img
                                src={photoUrl}
                                alt={request.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80';
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                            {/* Tender Mode Badge */}
                            <span
                                data-testid="tender-mode-badge"
                                className={`absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur-xs ${
                                    isSealed
                                        ? 'bg-purple-900/90 text-purple-200 border border-purple-400/40'
                                        : 'bg-white/95 text-[#0D715F]'
                                }`}
                            >
                                {isSealed ? <Lock className="size-3.5" /> : <Globe className="size-3.5 stroke-[2.5]" />}
                                <span>{isSealed ? 'Sealed Bidding' : 'Open Citizen Tender'}</span>
                            </span>

                            <button
                                type="button"
                                onClick={() => alert('Photo inspection view')}
                                className="absolute top-4 right-4 size-9 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-800 shadow-md hover:bg-white transition-all active:scale-95"
                            >
                                <ZoomIn className="size-4.5 stroke-[2.2]" />
                            </button>

                            <div className="absolute bottom-4 left-4 right-4 text-white">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-300">
                                    Community Need · Tagudin
                                </div>
                                <h1 className="text-lg sm:text-xl font-extrabold text-white leading-tight drop-shadow-sm">
                                    {request.title}
                                </h1>
                            </div>
                        </div>

                        {/* Overview Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                                        Target Budget
                                    </span>
                                    <div className="text-2xl font-black text-[#0D715F] tracking-tight">{budgetFormatted}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                                        <Clock className="size-3.5 stroke-[2.5]" />
                                        <span>{urgencyLabel}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                <MapPin className="size-4 text-[#0D715F] shrink-0 stroke-[2.3]" />
                                <span>{request.location?.barangay || request.location?.area_code || 'Tagudin, Ilocos Sur'}</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 ml-auto">
                                    <Lock className="size-2.5 stroke-[2.5]" />
                                    <span>Protected Location</span>
                                </span>
                            </div>

                            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-8 rounded-full bg-[#0D715F] text-white flex items-center justify-center font-extrabold text-xs">
                                        {request.requester_name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900">{request.requester_name}</div>
                                        <div className="text-[11px] text-slate-500">Tagudin Citizen Requester</div>
                                    </div>
                                    <FileText className="size-4 text-slate-400 stroke-[2] ml-auto" />
                                </div>
                                <p className="text-xs leading-relaxed text-slate-700 italic border-l-2 border-[#0D715F] pl-3 py-0.5">
                                    "{request.description}"
                                </p>
                            </div>

                            {/* Scope Requirements */}
                            {Array.isArray(request.item_list?.requirements) && request.item_list.requirements.length > 0 && (
                                <div className="space-y-2 pt-1 border-t border-slate-100">
                                    <span className="text-xs font-bold text-[#0F2F58] flex items-center gap-1.5">
                                        <CheckCircle2 className="size-3.5 text-teal-600" />
                                        <span>Required Deliverables ({request.item_list.requirements.length})</span>
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {request.item_list.requirements.map((req, i) => (
                                            <div
                                                key={i}
                                                className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 flex items-start gap-2"
                                            >
                                                <span className="size-4 rounded-full bg-blue-100 text-[10px] font-bold text-blue-900 flex items-center justify-center shrink-0 mt-0.5">
                                                    {i + 1}
                                                </span>
                                                <span className="text-slate-700 leading-snug">{req}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Quotes & Bidding Deck (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                            {/* Header with Comparison Trigger */}
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <Shield className="size-4 text-[#0D715F] stroke-[2.5]" />
                                    <h3 className="text-sm font-extrabold text-[#0F2F58]">Active Provider Bids</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {quotes.length > 1 && (
                                        <button
                                            type="button"
                                            data-testid="matrix-compare-btn"
                                            onClick={() => setMatrixModalOpen(true)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-bold text-[#0D715F] hover:bg-teal-100 transition-colors cursor-pointer"
                                            title="Compare quotes side-by-side"
                                        >
                                            <TableProperties className="size-3" />
                                            <span>Matrix</span>
                                        </button>
                                    )}
                                    <span className="rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-extrabold text-[#0D715F]">
                                        {quotes.length} {quotes.length === 1 ? 'Bid' : 'Bids'}
                                    </span>
                                </div>
                            </div>

                            {/* Sealed Notice for Non-Owners */}
                            {isSealed && !isOwner && (
                                <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3.5 text-xs text-purple-950 space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <Lock className="size-3.5 text-purple-700" />
                                        <span>Sealed Bidding</span>
                                    </div>
                                    <p className="text-[11px] text-purple-800 leading-relaxed">
                                        Quotes remain confidential until bidding closes.
                                    </p>
                                </div>
                            )}

                            {/* Agnostic & Flexible Filter Pills */}
                            {quotes.length > 1 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                                        <span>Filter Offers</span>
                                        <div className="flex items-center gap-1">
                                            <SlidersHorizontal className="size-3" />
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                                className="bg-transparent text-slate-700 font-semibold focus:outline-hidden text-[11px] cursor-pointer"
                                            >
                                                <option value="price_asc">Lowest Price</option>
                                                <option value="price_desc">Highest Price</option>
                                                <option value="duration">Duration</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5" data-testid="bids-filter-bar">
                                        {[
                                            { id: 'all', label: `All (${quotes.length})` },
                                            { id: 'materials', label: 'Parts Included' },
                                            { id: 'labor_only', label: 'Labor Only' },
                                            { id: 'delivery', label: 'With Courier' },
                                        ].map((pill) => (
                                            <button
                                                key={pill.id}
                                                type="button"
                                                onClick={() => setFilterTag(pill.id as typeof filterTag)}
                                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
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
                                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center space-y-1.5">
                                    <span className="text-xs text-slate-500 font-medium">No quotes matching criteria.</span>
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
                                            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 transition-all hover:border-teal-500 hover:bg-white"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                        <span>{q.provider_name}</span>
                                                        <CheckCircle2 className="size-3.5 text-teal-600 shrink-0" />
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">
                                                        Duration: {q.scope?.estimated_duration || 'Same-day'}
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
                                                <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100">
                                                    "{q.scope.proposal}"
                                                </p>
                                            )}

                                            {/* Action Buttons for Requester */}
                                            {isOwner && request.status === 'published' && q.status === 'submitted' && (
                                                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                                                    <button
                                                        type="button"
                                                        data-testid="negotiate-quote-btn"
                                                        onClick={() => openCounterModal(q)}
                                                        className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                                                    >
                                                        <Coins className="size-3 text-slate-500" />
                                                        <span>Counter</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={acceptingQuoteId !== null}
                                                        onClick={() => handleAcceptQuote(q.id)}
                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0D715F] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0a574a] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        <CheckCircle2 className="size-3.5 stroke-[2.5]" />
                                                        <span>
                                                            {acceptingQuoteId === q.id ? 'Accepting...' : 'Accept & Hire'}
                                                        </span>
                                                    </button>
                                                </div>
                                            )}

                                            {q.status === 'accepted' && (
                                                <div className="rounded-lg bg-teal-100/80 p-2 text-center text-xs font-bold text-teal-900 flex items-center justify-center gap-1.5">
                                                    <CheckCircle2 className="size-3.5 text-teal-700" />
                                                    <span>Winning Offer Awarded</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Action Button for Providers */}
                            {!isOwner && request.status === 'published' && (
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setComposerOpen(true)}
                                        className="w-full h-11 rounded-xl bg-[#0D715F] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:bg-[#0a574a] transition-all active:scale-[0.98] cursor-pointer"
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
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 flex items-center gap-2 z-30 shadow-lg">
                {!isOwner ? (
                    <>
                        <button
                            type="button"
                            onClick={() => setComposerOpen(true)}
                            className="flex-1 h-11 rounded-xl bg-[#0D715F] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-[#0a574a] transition-all active:scale-[0.98]"
                        >
                            <Send className="size-3.5 stroke-[2.5]" />
                            <span>Submit a Quote</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => alert('Connects directly with the citizen requester.')}
                            className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-100 transition-all active:scale-95"
                        >
                            <MessageCircle className="size-4 text-slate-500 stroke-[2]" />
                            <span>Ask</span>
                        </button>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-between px-2 text-xs">
                        <span className="font-bold text-[#0F2F58]">Your Request Dashboard</span>
                        <span className="text-[11px] text-teal-700 font-bold bg-teal-50 border border-teal-200 rounded-full px-2.5 py-0.5">
                            {quotes.length} Bids Available
                        </span>
                    </div>
                )}
            </div>

            {/* Proposal Side-by-Side Comparison Matrix Modal */}
            <GlovoWaveModal
                isOpen={matrixModalOpen}
                onClose={() => setMatrixModalOpen(false)}
                title="Compare Offers"
                subtitle={`${request.title} · ${quotes.length} Offers`}
            >
                <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="p-2.5 font-extrabold text-slate-700">Feature</th>
                                {quotes.map((q) => (
                                    <th key={q.id} className="p-2.5 font-extrabold text-[#0F2F58] min-w-[120px]">
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
                                    <td key={q.id} className="p-2.5 text-[11px] text-slate-600 leading-snug">
                                        {q.scope?.proposal || 'Direct service delivery'}
                                    </td>
                                ))}
                            </tr>
                            {isOwner && request.status === 'published' && (
                                <tr>
                                    <td className="p-2.5 font-bold text-slate-500">Award</td>
                                    {quotes.map((q) => (
                                        <td key={q.id} className="p-2.5">
                                            {q.status === 'submitted' ? (
                                                <button
                                                    type="button"
                                                    disabled={acceptingQuoteId !== null}
                                                    onClick={() => {
                                                        setMatrixModalOpen(false);
                                                        handleAcceptQuote(q.id);
                                                    }}
                                                    className="rounded-lg bg-[#0D715F] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#0a574a] transition-all cursor-pointer"
                                                >
                                                    Accept
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 capitalize">{q.status}</span>
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
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 font-bold flex items-center gap-2">
                                <Check className="size-4 text-emerald-600" />
                                <span>{counterNotice}</span>
                            </div>
                        )}

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                            <span className="text-slate-400 text-[10px] font-bold uppercase">Original Proposal</span>
                            <div className="flex items-center justify-between font-bold text-slate-800">
                                <span>{selectedQuoteForCounter.provider_name}</span>
                                <span className="font-mono text-[#0D715F]">
                                    ₱{(selectedQuoteForCounter.amount_minor / 100).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Labor Stepper */}
                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 block">Proposed Rate (PHP)</label>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCounterLaborAmount((prev) => Math.max(100, prev - 20))}
                                    className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold active:scale-95 cursor-pointer"
                                >
                                    <Minus className="size-4" />
                                </button>
                                <div className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-center font-mono text-sm font-extrabold text-[#0F2F58]">
                                    ₱{counterLaborAmount.toFixed(2)}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCounterLaborAmount((prev) => prev + 20)}
                                    className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold active:scale-95 cursor-pointer"
                                >
                                    <Plus className="size-4" />
                                </button>
                            </div>
                        </div>

                        {/* Material Toggle */}
                        <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between">
                            <div>
                                <span className="font-bold text-slate-800 block">Include Parts &amp; Materials</span>
                                <span className="text-[10px] text-slate-400">
                                    Provider supplies parts
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                checked={counterIncludeHardware}
                                onChange={(e) => setCounterIncludeHardware(e.target.checked)}
                                className="size-4 rounded text-blue-600 cursor-pointer"
                            />
                        </div>

                        {/* Counter Note */}
                        <div className="space-y-1">
                            <label className="font-bold text-slate-700 block">Terms Note to Provider</label>
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
                                className="w-full rounded-xl bg-[#0F2F58] py-2.5 font-bold text-white hover:bg-[#1a447c] transition-all cursor-pointer"
                            >
                                Submit Counter
                            </button>
                        </div>
                    </form>
                </GlovoWaveModal>
            )}

            {/* 5-Step Guided vs Standard Quote Composer Sheet */}
            <QuoteComposerSheet
                isOpen={composerOpen}
                onClose={() => setComposerOpen(false)}
                requestId={request.id}
                requestTitle={request.title}
                budgetFormatted={budgetFormatted}
                myListings={my_listings}
                onSubmit={handleQuoteSubmit}
                isSubmitting={submittingQuote}
                errorMessage={errorMessage}
            />
        </AppShell>
    );
}
