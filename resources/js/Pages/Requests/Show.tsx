import React, { useState } from 'react';
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
    Sparkles,
    X,
    ZoomIn,
} from 'lucide-react';

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
        };
        budget_amount_minor: number | null;
        budget_currency: string | null;
        timing: {
            urgency?: string;
        };
        location: {
            area_code?: string;
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
}

export default function RequestShow({ request, quotes, session }: RequestDetailProps) {
    const isOwner = session?.authenticated && session.user_id === request.requester_user_id;
    const [composerOpen, setComposerOpen] = useState(false);
    const [submittingQuote, setSubmittingQuote] = useState(false);
    const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);

    // Form state for Quote Composer sheet
    const [quoteAmount, setQuoteAmount] = useState<string>('350');
    const [duration, setDuration] = useState('2 hours');
    const [proposalText, setProposalText] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const budgetFormatted = request.budget_amount_minor
        ? `₱${(request.budget_amount_minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        : 'Open Budget';

    const photoUrl = request.item_list?.photo || '/photos/req-electrician.jpg';
    const urgencyLabel = request.timing?.urgency === 'today' ? 'Needed Today · Afternoon' : 'Flexible Timing';

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

    const handleQuoteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingQuote(true);
        setErrorMessage(null);

        const amountMinor = Math.round(parseFloat(quoteAmount) * 100);
        if (isNaN(amountMinor) || amountMinor <= 0) {
            setErrorMessage('Please enter a valid amount.');
            setSubmittingQuote(false);
            return;
        }

        router.post(
            `/requests/${request.id}/quotes`,
            {
                amount_minor: amountMinor,
                currency: 'PHP',
                proposal: proposalText || 'Experienced local technician available to fulfill this request cleanly and promptly.',
                estimated_duration: duration,
                idempotency_key: `quote-ui-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            },
            {
                onSuccess: () => {
                    setComposerOpen(false);
                    setSubmittingQuote(false);
                    setProposalText('');
                },
                onError: (errors) => {
                    setErrorMessage(Object.values(errors).flat().join(' ') || 'Could not submit quote.');
                    setSubmittingQuote(false);
                },
            }
        );
    };

    return (
        <div className="min-h-screen bg-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif] text-slate-800 antialiased flex flex-col items-center p-0 sm:py-6 sm:px-4">
            <Head title={`Request: ${request.title}`} />

            {/* Desktop context tag */}
            <div className="hidden sm:flex w-full max-w-[420px] justify-between items-center text-xs text-slate-400 mb-2 font-medium px-2">
                <span>Tagudin Citizen Open Tender</span>
                <span className="text-teal-400 font-bold">ADR-R-004 · Public-Safe Scope</span>
            </div>

            {/* Mobile Shell */}
            <div className="w-full sm:w-[390px] min-h-screen sm:min-h-[844px] bg-[#F8F9FA] sm:rounded-[40px] sm:border-[10px] sm:border-[#1E293B] sm:shadow-2xl relative overflow-hidden flex flex-col">
                
                {/* Hero Photo Banner */}
                <div className="relative w-full h-[230px] bg-slate-200 shrink-0">
                    <img
                        src={photoUrl}
                        alt={request.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80';
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                    {/* Back button */}
                    <Link
                        href="/browse"
                        className="absolute top-4 left-4 z-20 size-9 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-800 shadow-md hover:bg-white transition-all active:scale-95"
                    >
                        <ArrowLeft className="size-4.5 stroke-[2.5]" />
                    </Link>

                    {/* Zoom button */}
                    <button
                        type="button"
                        onClick={() => alert('Photo inspection view')}
                        className="absolute top-4 right-4 z-20 size-9 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-800 shadow-md hover:bg-white transition-all active:scale-95"
                    >
                        <ZoomIn className="size-4.5 stroke-[2.2]" />
                    </button>
                </div>

                {/* Body Content */}
                <main className="flex-1 overflow-y-auto px-4.5 py-4 pb-28 space-y-3.5">
                    
                    {/* Header Card */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
                        <h1 className="text-base font-extrabold text-[#0F2F58] leading-snug">
                            Looking for: {request.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F7F1] px-2.5 py-1 text-[11px] font-bold text-[#0D715F]">
                                <Globe className="size-3 stroke-[2.5]" />
                                <span>Open Tender</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                                <Clock className="size-3 stroke-[2.5]" />
                                <span>{urgencyLabel}</span>
                            </span>
                        </div>

                        <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100">
                            <span className="text-xl font-extrabold text-[#0D715F] tracking-tight">{budgetFormatted}</span>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Estimated Budget</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <MapPin className="size-3.5 text-[#0D715F] shrink-0 stroke-[2.3]" />
                            <span>{request.location?.area_code || 'Tagudin, Ilocos Sur'}</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 ml-auto">
                                <Lock className="size-2.5 stroke-[2.5]" />
                                <span>Protected</span>
                            </span>
                        </div>
                    </div>

                    {/* Citizen Request Statement */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-2.5">
                        <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-full bg-[#0D715F] text-white flex items-center justify-center font-extrabold text-xs">
                                {request.requester_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-bold text-slate-900">{request.requester_name}</div>
                                <div className="text-[11px] text-slate-500">Requester · Citizen Resident</div>
                            </div>
                            <FileText className="size-4 text-slate-400 stroke-[2]" />
                        </div>
                        <p className="text-xs leading-relaxed text-slate-700 italic border-l-2 border-teal-500/40 pl-2.5 py-0.5">
                            "{request.description}"
                        </p>
                    </div>

                    {/* Specifications Card */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F2F58]">
                            <Sparkles className="size-3.5 text-[#0D715F] stroke-[2.5]" />
                            <span>Requested Deliverables & Details</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="text-slate-400 block font-medium">Task Scope</span>
                                <span className="font-bold text-slate-800">{request.item_list?.task_scope || 'Direct Project Scope'}</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="text-slate-400 block font-medium">Urgency</span>
                                <span className="font-bold text-slate-800">{urgencyLabel}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tender Quotes & Activity Deck */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-[#0F2F58] flex items-center gap-1.5">
                                <Shield className="size-3.5 text-[#0D715F] stroke-[2]" />
                                <span>Tender Activity & Quotes</span>
                            </span>
                            <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-extrabold text-[#0D715F]">
                                {quotes.length} {quotes.length === 1 ? 'Bid' : 'Bids'} Received
                            </span>
                        </div>

                        {quotes.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center space-y-1">
                                <span className="text-xs text-slate-500 font-medium">No quotes submitted yet.</span>
                                <p className="text-[11px] text-slate-400">Verified Tagudin providers can submit proposals below.</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5 pt-1">
                                {quotes.map((q) => (
                                    <div
                                        key={q.id}
                                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2 transition-all hover:border-teal-500 hover:bg-white"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                                    <span>{q.provider_name}</span>
                                                    <CheckCircle2 className="size-3 text-teal-600 shrink-0" />
                                                </div>
                                                <span className="text-[10px] text-slate-400">Estimated duration: {q.scope?.estimated_duration || 'Same-day'}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-extrabold text-[#0D715F]">₱{(q.amount_minor / 100).toFixed(2)}</span>
                                                <span className="block text-[9px] font-bold text-slate-400 uppercase">{q.status}</span>
                                            </div>
                                        </div>

                                        {q.scope?.proposal && (
                                            <p className="text-[11.5px] text-slate-600 line-clamp-2">
                                                {q.scope.proposal}
                                            </p>
                                        )}

                                        {/* Accept Button (Visible to Requester) */}
                                        {isOwner && request.status === 'published' && q.status === 'submitted' && (
                                            <div className="pt-1.5 border-t border-slate-200/80 flex justify-end">
                                                <button
                                                    type="button"
                                                    disabled={acceptingQuoteId !== null}
                                                    onClick={() => handleAcceptQuote(q.id)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D715F] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0a574a] transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    <CheckCircle2 className="size-3.5 stroke-[2.5]" />
                                                    <span>{acceptingQuoteId === q.id ? 'Accepting...' : 'Accept Quote & Hire'}</span>
                                                </button>
                                            </div>
                                        )}

                                        {q.status === 'accepted' && (
                                            <div className="rounded-md bg-teal-100/70 p-1.5 text-center text-[10px] font-bold text-teal-900">
                                                ✓ Winning Offer Awarded
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {/* Sticky Action Dock */}
                <footer className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3 flex items-center gap-2 z-30">
                    {!isOwner ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setComposerOpen(true)}
                                className="flex-1 h-11 rounded-xl bg-[#0D715F] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-900/10 hover:bg-[#0a574a] transition-all active:scale-[0.98]"
                            >
                                <Send className="size-3.5 stroke-[2.5]" />
                                <span>Submit a Quote</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => alert('Clarification chat connects directly with the requester.')}
                                className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-100 transition-all active:scale-95"
                            >
                                <MessageCircle className="size-4 text-slate-500 stroke-[2]" />
                                <span>Ask</span>
                            </button>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-between px-2 text-xs">
                            <span className="font-bold text-[#0F2F58]">Your Request Dashboard</span>
                            <span className="text-[11px] text-teal-700 font-semibold">{quotes.length} Bids Available</span>
                        </div>
                    )}
                </footer>

                {/* Quote Composer Sheet (Translating quote-composer.html) */}
                {composerOpen && (
                    <div className="absolute inset-0 bg-black/50 z-40 flex flex-col justify-end transition-opacity">
                        <div className="bg-white rounded-t-3xl border-t border-slate-200 p-5 space-y-4 max-h-[85%] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-sm font-extrabold text-[#0F2F58]">Submit Your Proposal</h3>
                                    <p className="text-[11px] text-slate-400">Offer quote for: {request.title}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setComposerOpen(false)}
                                    className="size-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            {errorMessage && (
                                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
                                    {errorMessage}
                                </div>
                            )}

                            <form onSubmit={handleQuoteSubmit} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Your Total Bid Amount (PHP ₱)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₱</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={quoteAmount}
                                            onChange={(e) => setQuoteAmount(e.target.value)}
                                            className="w-full h-10 rounded-xl border border-slate-300 pl-8 pr-3 text-sm font-bold text-slate-900 focus:border-[#0D715F] focus:ring-1 focus:ring-[#0D715F] outline-hidden"
                                            placeholder="350.00"
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 block">Buyer's budget: {budgetFormatted}</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Estimated Completion Duration
                                    </label>
                                    <input
                                        type="text"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs text-slate-800 focus:border-[#0D715F] focus:ring-1 focus:ring-[#0D715F] outline-hidden"
                                        placeholder="e.g. 1.5 hours, Same-day"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Scope & Proposal Note to Homeowner
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={proposalText}
                                        onChange={(e) => setProposalText(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:border-[#0D715F] focus:ring-1 focus:ring-[#0D715F] outline-hidden"
                                        placeholder="Describe your tools, replacement parts, or arrival time..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submittingQuote}
                                    className="w-full h-11 rounded-xl bg-[#0D715F] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-[#0a574a] transition-all disabled:opacity-50"
                                >
                                    <Send className="size-3.5 stroke-[2.5]" />
                                    <span>{submittingQuote ? 'Submitting Quote...' : 'Confirm & Send Quote to Citizen'}</span>
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
