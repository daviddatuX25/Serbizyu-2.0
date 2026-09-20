import { Form, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    ShieldCheck,
    ArrowRight,
    AlertCircle,
} from 'lucide-react';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';

type OrderShowProps = {
    correlationId?: string | null;
    notice?: string | null;
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
        actor_role: 'buyer' | 'provider';
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
    } | null;
    obligation?: {
        id: string;
        status: string;
        lane: string;
        amount_minor: number;
        currency: string;
    } | null;
    errors?: Record<string, string | string[]>;
};

function money(minor: number | undefined, currency: string | undefined): string {
    if (minor === undefined || minor === null) {
        return '—';
    }
    return `${currency ?? 'PHP'} ${(minor / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OrderShow(props: OrderShowProps) {
    const page = usePage<{ errors?: Record<string, string | string[]>; flash?: { notice?: string } }>();
    const errors = props.errors ?? page.props.errors ?? {};
    const formError = Array.isArray(errors.form) ? errors.form[0] : errors.form;
    const notice = props.notice ?? page.props.flash?.notice ?? null;

    const amount = Number(props.order.proposal?.amount_minor ?? props.terms?.amount_minor ?? 0);
    const currency = String(props.order.proposal?.currency ?? props.terms?.currency ?? 'PHP');
    const isAccepted = props.order.status === 'accepted';

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
            <DesktopGlobalNav activeRoute="orders" />

            {/* Mobile Header */}
            <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
                <Link
                    href="/browse"
                    className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-700"
                    aria-label="Back to browse"
                >
                    <ArrowLeft className="size-4" />
                </Link>
                <div className="text-xs font-extrabold text-[#0F2F58]">
                    Order #{props.order.id.slice(0, 8).toUpperCase()}
                </div>
                <div className="size-9" />
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
                {/* Desktop Breadcrumbs */}
                <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
                    <Link href="/browse" className="hover:text-[#0F2F58] flex items-center gap-1">
                        <ArrowLeft className="size-3.5" />
                        <span>Marketplace</span>
                    </Link>
                    <span>/</span>
                    <Link href="/orders" className="hover:text-[#0F2F58]">
                        Orders &amp; Work
                    </Link>
                    <span>/</span>
                    <span className="text-slate-900 font-bold">Order #{props.order.id.slice(0, 8).toUpperCase()}</span>
                </div>

                {/* System Notice / Flash Alert */}
                {notice && (
                    <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 shadow-xs">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                        <span>{notice}</span>
                    </div>
                )}

                {/* Form Error Alert */}
                {formError && (
                    <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-900 shadow-xs">
                        <AlertCircle className="size-4 text-red-600 shrink-0" />
                        <span>{formError}</span>
                    </div>
                )}

                {/* Main 2-Column Order & Work Tracking View */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT COLUMN (60%): Order Status, Work Milestones, Settlement Protection */}
                    <div className="flex flex-col gap-6 lg:col-span-7">
                        {/* Order Header Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        Order Reference
                                    </span>
                                    <h1 className="text-lg sm:text-xl font-extrabold text-[#0F2F58]">
                                        Order #{props.order.id.slice(0, 8).toUpperCase()}
                                    </h1>
                                </div>

                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide border shadow-xs ${
                                        isAccepted
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                >
                                    {isAccepted ? 'Agreement Accepted ✓' : 'Pending Citizen Finalization'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-400 font-semibold block">Your Role</span>
                                    <span className="font-extrabold text-slate-900 capitalize">
                                        {props.order.actor_role} Account
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-semibold block">Source Listing</span>
                                    <Link
                                        href={`/listings/${props.order.listing_id}`}
                                        className="font-extrabold text-[#0F2F58] hover:underline truncate block"
                                    >
                                        View Listing #{props.order.listing_id.slice(0, 8)} ↗
                                    </Link>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-semibold block">Contract Version</span>
                                    <span className="font-mono font-bold text-slate-700">v{props.order.version}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-semibold block">Order Mechanism</span>
                                    <span className="font-mono font-bold text-slate-700 uppercase">
                                        {props.order.mechanism || 'Direct Booking'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Work Execution Milestones Tracker */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                        Work Execution &amp; Milestones
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        T4 Work engine tracking verified photo gates in Tagudin
                                    </p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10.5px] font-bold text-slate-700">
                                    {props.work?.work_shape || 'A3 Appointment'}
                                </span>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
                                    <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-extrabold text-slate-900">1. Order Proposal Formation</div>
                                        <div className="text-[11px] text-slate-600 mt-0.5">
                                            Citizen booking proposal submitted with agreed base rate and quantities.
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`flex items-start gap-3 rounded-xl border p-3 text-xs ${
                                        isAccepted
                                            ? 'border-emerald-200 bg-emerald-50/50'
                                            : 'border-amber-200 bg-amber-50/40'
                                    }`}
                                >
                                    {isAccepted ? (
                                        <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0 mt-0.5" />
                                    ) : (
                                        <Clock className="size-4.5 text-amber-600 shrink-0 mt-0.5" />
                                    )}
                                    <div>
                                        <div className="font-extrabold text-slate-900">
                                            2. Finalize Agreement &amp; Terms Snapshot
                                        </div>
                                        <div className="text-[11px] text-slate-600 mt-0.5">
                                            {isAccepted
                                                ? `Terms frozen in snapshot v${props.terms?.snapshot_version || 1}. Immutable contract sealed.`
                                                : 'Awaiting citizen authorization to freeze terms and fund escrow line.'}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`flex items-start gap-3 rounded-xl border p-3 text-xs ${
                                        isAccepted ? 'border-slate-200 bg-[#FAFCFB]' : 'border-slate-100 bg-slate-50/50 opacity-60'
                                    }`}
                                >
                                    <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 font-bold text-[10px] mt-0.5">
                                        3
                                    </div>
                                    <div>
                                        <div className="font-extrabold text-slate-900">
                                            3. Milestone Execution &amp; Photo Proofs
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                            {isAccepted
                                                ? 'Provider performs service according to required photo gates.'
                                                : 'Activates immediately after agreement finalization.'}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`flex items-start gap-3 rounded-xl border p-3 text-xs ${
                                        isAccepted ? 'border-slate-200 bg-[#FAFCFB]' : 'border-slate-100 bg-slate-50/50 opacity-60'
                                    }`}
                                >
                                    <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 font-bold text-[10px] mt-0.5">
                                        4
                                    </div>
                                    <div>
                                        <div className="font-extrabold text-slate-900">
                                            4. Citizen Sign-Off &amp; Escrow Release
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                            Citizen confirms completion with OTP; payment is released to the provider.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Non-Cascading Settlement Protection Guarantee */}
                        <div className="flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-950">
                            <ShieldCheck className="size-5 shrink-0 text-[#0F2F58] mt-0.5" />
                            <div>
                                <strong>Non-Cascading Settlement Protection:</strong> Each child order and party is held in its own independent escrow line. If courier transit encounters delays, the store's inventory and technician labor remain financially isolated and protected.
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN (40%): Sticky Proposal & Finalize Card */}
                    <div className="lg:col-span-5 sticky top-24">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md flex flex-col gap-5">
                            <div className="border-b border-slate-100 pb-4">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Agreed Escrow Amount
                                </span>
                                <div className="mt-1 font-mono text-3xl font-extrabold text-[#0F2F58]">
                                    {money(amount, currency)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    Payment Lane: {props.obligation?.lane?.replace('_', ' ').toUpperCase() || 'EXTERNAL CASH'}
                                </div>
                            </div>

                            {/* Terms Details */}
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Agreed Total:</span>
                                    <span className="font-mono font-bold text-slate-800">{money(amount, currency)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Tiwala Protection Fee:</span>
                                    <span className="font-mono font-bold text-emerald-700">₱0.00 (Promo)</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-[#0F2F58]">
                                    <span>Total Escrow Authorization:</span>
                                    <span className="font-mono text-base">{money(amount, currency)}</span>
                                </div>
                            </div>

                            {/* Finalize Action */}
                            {props.order.can_finalize ? (
                                <Form
                                    action={`/orders/${props.order.id}/finalize`}
                                    method="post"
                                    options={{ preserveScroll: true }}
                                >
                                    {({ processing }) => (
                                        <>
                                            <input
                                                type="hidden"
                                                name="expected_order_version"
                                                value={props.order.version}
                                            />
                                            <button
                                                type="submit"
                                                disabled={processing}
                                                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] text-xs font-extrabold tracking-wide text-white shadow-md transition-all hover:bg-[#153e74] active:scale-98 disabled:opacity-50"
                                            >
                                                <span>{processing ? 'Finalizing…' : 'Finalize Agreement & Authorize Escrow'}</span>
                                                <ArrowRight className="size-4" />
                                            </button>
                                        </>
                                    )}
                                </Form>
                            ) : (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-center text-xs font-bold text-emerald-900">
                                    {isAccepted
                                        ? 'Agreement is accepted. Work engine is tracking milestone delivery.'
                                        : 'This order cannot be finalized from your account right now.'}
                                </div>
                            )}

                            {/* Trust Security Guarantee */}
                            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-[11px] text-emerald-900">
                                <ShieldCheck className="size-4 shrink-0 text-emerald-700 mt-0.5" />
                                <span>
                                    <strong>Tiwala Escrow Protection:</strong> Funds release to the provider only after you review and approve the final milestone photos.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
