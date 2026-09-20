import { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ShieldCheck,
    Phone,
    MessageSquare,
    Package,
    Truck,
    Wrench,
    Check,
    Clock,
    Lock,
} from 'lucide-react';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';

interface DealChainRecord {
    id: string;
    coordinator_user_id: string;
    status: string;
    title: string;
    goal: string;
    total_budget_amount?: number | null;
    currency_code?: string;
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

export default function DealChainDetail({
    chain,
    slots,
    dependencies,
    notice,
    view = 'project',
    worker = null,
}: DealChainDetailProps) {
    const [activePerspective, setActivePerspective] = useState<'project' | 'worker'>(view);
    const [activeWorker, setActiveWorker] = useState<string | null>(worker);

    const shortId = chain.id ? chain.id.substring(0, 8).toUpperCase() : 'DC-LIVE';

    const getSlotCost = (ordinal: number) => {
        if (ordinal === 1) return 180;
        if (ordinal === 2) return 35;
        if (ordinal === 3) return 450;
        return 100;
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Desktop Navigation */}
            <DesktopGlobalNav />

            {/* Mobile Header */}
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-200">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Relay
                    </span>
                </div>

                <div className="flex size-9 items-center justify-center rounded-full text-slate-400">
                    <ShieldCheck className="size-5 text-[#0F2F58]" />
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8 space-y-6">
                {/* Desktop Breadcrumbs */}
                <div className="hidden lg:flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Link href="/browse" className="hover:text-[#0F2F58] flex items-center gap-1">
                            <ArrowLeft className="size-3.5" />
                            <span>Back to Marketplace</span>
                        </Link>
                        <span>/</span>
                        <span className="text-slate-900 font-bold">Deal Chain Execution Workspace</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-200 shadow-2xs">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Live DAG Relay Active</span>
                    </div>
                </div>

                {/* Flash Notice Banner */}
                {notice && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-xs font-bold text-blue-950 shadow-xs flex items-center gap-2.5">
                        <ShieldCheck className="size-5 text-[#0F2F58] shrink-0" />
                        <span>{notice}</span>
                    </div>
                )}

                {/* Perspective View Switcher Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Execution Perspective:
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setActivePerspective('project');
                                setActiveWorker(null);
                            }}
                            className={`rounded-full px-3.5 py-1 text-xs font-bold cursor-pointer transition-colors ${
                                activePerspective === 'project'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Project View (Coordinator)
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActivePerspective('worker');
                                setActiveWorker('ben');
                            }}
                            className={`rounded-full px-3.5 py-1 text-xs font-bold cursor-pointer transition-colors ${
                                activePerspective === 'worker' && activeWorker === 'ben'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Technician (Gated)
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActivePerspective('worker');
                                setActiveWorker('danny');
                            }}
                            className={`rounded-full px-3.5 py-1 text-xs font-bold cursor-pointer transition-colors ${
                                activePerspective === 'worker' && activeWorker === 'danny'
                                    ? 'bg-[#0F2F58] text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Courier (En Route)
                        </button>
                    </div>
                </div>

                {/* Project Hero Card */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Deal Chain #{shortId}
                        </span>
                        <span className="font-mono text-xl font-extrabold text-[#0F2F58]">
                            ₱{(chain.total_budget_amount || 665).toFixed(2)} Total Escrow
                        </span>
                    </div>

                    <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
                        {chain.title || 'Tagudin Multi-Party Coordinated Delivery'}
                    </h1>

                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-900">
                        <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
                        <span>
                            {activePerspective === 'project' && (
                                <strong>Active Project: Parts in transit to job site · Technician on-site prepping unit</strong>
                            )}
                            {activePerspective === 'worker' && activeWorker === 'ben' && (
                                <strong>Technician View: Work step gated on Danny Express delivering the 35uF Run Capacitor</strong>
                            )}
                            {activePerspective === 'worker' && activeWorker === 'danny' && (
                                <strong>Courier View: Active route from Tagudin Hardware to customer doorstep · ETA 8 mins</strong>
                            )}
                        </span>
                    </div>
                </section>

                {/* Project Slots DAG Track */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-extrabold uppercase tracking-wider text-[#0F2F58]">
                            Coordinated Project Slots ({slots.length} Nodes · {dependencies.length} Active Gates)
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 uppercase">
                            Non-Cascading Settlement Active
                        </span>
                    </div>

                    {slots.map((slot, idx) => {
                        const isSettled = slot.ordinal === 1;
                        const isActive = slot.ordinal === 2;
                        const isGated = slot.ordinal === 3;

                        return (
                            <div key={slot.id} className="space-y-3">
                                {/* Slot Card */}
                                <div
                                    className={`rounded-2xl border p-5 transition-all shadow-xs ${
                                        isSettled
                                            ? 'border-slate-200 bg-slate-50/70'
                                            : isActive
                                            ? 'border-[#0F2F58] bg-white ring-1 ring-[#0F2F58]'
                                            : 'border-slate-200 bg-white'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={`flex size-9 shrink-0 items-center justify-center rounded-xl font-bold mt-0.5 ${
                                                    isSettled
                                                        ? 'bg-slate-200 text-slate-700'
                                                        : isActive
                                                        ? 'bg-sky-100 text-sky-800'
                                                        : 'bg-emerald-100 text-emerald-800'
                                                }`}
                                            >
                                                {slot.need_kind === 'product' ? (
                                                    <Package className="size-4.5" />
                                                ) : slot.title.toLowerCase().includes('courier') ? (
                                                    <Truck className="size-4.5" />
                                                ) : (
                                                    <Wrench className="size-4.5" />
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-extrabold text-slate-400 uppercase">
                                                        Slot #{slot.ordinal}
                                                    </span>
                                                    <h2 className="text-sm font-extrabold text-slate-900">
                                                        {slot.title}
                                                    </h2>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {slot.description}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="font-mono text-sm font-bold text-slate-900">
                                                ₱{getSlotCost(slot.ordinal).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mini Steps Progress Track */}
                                    <div className="mt-4 flex items-center gap-1.5 overflow-x-auto text-[10px] font-bold">
                                        {slot.ordinal === 1 && (
                                            <>
                                                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 flex items-center gap-1">
                                                    <Check className="size-3" /> Ordered
                                                </span>
                                                <span className="text-slate-300">→</span>
                                                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 flex items-center gap-1">
                                                    <Check className="size-3" /> Packaged
                                                </span>
                                                <span className="text-slate-300">→</span>
                                                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 flex items-center gap-1">
                                                    <Check className="size-3" /> Handed to Courier
                                                </span>
                                            </>
                                        )}

                                        {slot.ordinal === 2 && (
                                            <>
                                                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 flex items-center gap-1">
                                                    <Check className="size-3" /> Picked Up
                                                </span>
                                                <span className="text-slate-300">→</span>
                                                <span className="rounded-full bg-sky-100 text-sky-800 px-2.5 py-0.5 flex items-center gap-1 animate-pulse">
                                                    <Clock className="size-3" /> En Route · 8m ETA
                                                </span>
                                                <span className="text-slate-300">→</span>
                                                <span className="rounded-full bg-slate-100 text-slate-500 px-2.5 py-0.5">
                                                    Jobsite Dropoff
                                                </span>
                                            </>
                                        )}

                                        {slot.ordinal === 3 && (
                                            <>
                                                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 flex items-center gap-1">
                                                    <Check className="size-3" /> Triage
                                                </span>
                                                <span className="text-slate-300">→</span>
                                                <span className="rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 flex items-center gap-1">
                                                    <Lock className="size-3" /> Awaiting Part (Gated)
                                                </span>
                                                <span className="text-slate-300">→</span>
                                                <span className="rounded-full bg-slate-100 text-slate-500 px-2.5 py-0.5">
                                                    Installation &amp; Test
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Action Row & Escrow Status */}
                                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                                        <div>
                                            {isSettled && (
                                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                                    <Check className="size-3.5" /> ₱180.00 Sourced &amp; Settled
                                                </span>
                                            )}
                                            {isActive && (
                                                <span className="inline-flex items-center gap-1 text-sky-700 font-bold">
                                                    <Clock className="size-3.5" /> ₱35.00 Escrow Held · In Transit
                                                </span>
                                            )}
                                            {isGated && (
                                                <span className="inline-flex items-center gap-1 text-amber-800 font-bold">
                                                    <Lock className="size-3.5" /> ₱450.00 Escrow Held · Gated on Transit
                                                </span>
                                            )}
                                        </div>

                                        {isActive && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => alert('Calling Danny Express Rider (0917-882-9912)...')}
                                                    className="flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                                >
                                                    <Phone className="size-3.5" />
                                                    <span>Call</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => alert('Opening Team Coordination Channel for Deal Chain #' + shortId)}
                                                    className="flex items-center gap-1 rounded-full bg-[#0F2F58] px-3 py-1 text-xs font-bold text-white hover:bg-[#153e74] cursor-pointer"
                                                >
                                                    <MessageSquare className="size-3.5" />
                                                    <span>Chat</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Animated Dependency Wire Connector */}
                                {idx < slots.length - 1 && (
                                    <div className="flex items-center justify-center gap-2 py-1">
                                        <div className="h-4 w-0.5 bg-slate-300" />
                                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                            idx === 0
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                : 'bg-amber-50 text-amber-900 border-amber-200'
                                        }`}>
                                            {idx === 0
                                                ? 'Part Dispatched to Courier Node'
                                                : 'Transit Gating On-Site Labor'}
                                        </span>
                                        <div className="h-4 w-0.5 bg-slate-300" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Non-Cascading Settlement Guarantee */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 text-xs text-blue-950 flex items-start gap-3">
                    <ShieldCheck className="size-5 shrink-0 text-[#0F2F58] mt-0.5" />
                    <div>
                        <strong>Non-Cascading Settlement Protection Active:</strong> Each child order in this Deal Chain holds its own independent escrow line. If courier transit encounters a delay or road issue, the store&apos;s counter inventory payment remains protected and settled, and the customer&apos;s labor budget remains securely held in municipal escrow.
                    </div>
                </div>
            </main>
        </div>
    );
}
