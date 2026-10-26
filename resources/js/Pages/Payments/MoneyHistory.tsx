import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowUpRight, CircleHelp, Clock3, ReceiptText, WalletCards } from 'lucide-react';
import { AppShell } from '../../components/AppShell';

type MoneyHistoryRecord = {
    id: string;
    public_reference: string;
    order_id: string;
    title: string;
    party_name: string;
    role: 'payer' | 'recipient';
    lane: string;
    status: string;
    amount_minor: number;
    updated_at: string;
};

type CurrencyGroup = {
    currency: string;
    receivable_minor: number;
    awaiting_acknowledgement_minor: number;
    under_review_minor: number;
    settled_minor: number;
    records: MoneyHistoryRecord[];
};

type SummaryKey = 'receivable_minor' | 'awaiting_acknowledgement_minor' | 'under_review_minor' | 'settled_minor';
type MoneyHistoryCategory = 'not-due' | 'receivable' | 'awaiting' | 'review' | 'settled' | 'inactive';
type Filter = 'all' | 'needs-action' | 'recorded';

const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'needs-action', label: 'Needs action' },
    { id: 'recorded', label: 'Recorded' },
];

function formatMoney(minor: number, currency: string): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(minor / 100);
}

function laneLabel(lane: string): string {
    switch (lane) {
        case 'external_cash': return 'External cash · direct between parties';
        case 'p2p_transfer': return 'Personal wallet transfer';
        case 'protected_digital': return 'Protected digital · sandbox only';
        default: return lane.replaceAll('_', ' ');
    }
}

function formatUpdatedAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}
function recordCategory(status: string): MoneyHistoryCategory {
    switch (status) {
        case 'not_due': return 'not-due';
        case 'due':
        case 'proof_rejected': return 'receivable';
        case 'payer_reported_cash':
        case 'payer_submitted_p2p_proof': return 'awaiting';
        case 'disputed_mismatch': return 'review';
        case 'settled': return 'settled';
        case 'superseded':
        case 'cancelled':
        default: return 'inactive';
    }
}

function statusPresentation(status: string) {
    switch (status) {
        case 'not_due': return { label: 'Not due', classes: 'bg-slate-50 text-slate-700 ring-slate-200' };
        case 'due': return { label: 'Due', classes: 'bg-amber-50 text-amber-800 ring-amber-200' };
        case 'payer_reported_cash': return { label: 'Cash reported · awaiting acknowledgement', classes: 'bg-blue-50 text-blue-800 ring-blue-200' };
        case 'payer_submitted_p2p_proof': return { label: 'Transfer evidence submitted', classes: 'bg-blue-50 text-blue-800 ring-blue-200' };
        case 'proof_rejected': return { label: 'Transfer proof needs replacement', classes: 'bg-amber-50 text-amber-800 ring-amber-200' };
        case 'disputed_mismatch': return { label: 'Under review', classes: 'bg-rose-50 text-rose-800 ring-rose-200' };
        case 'settled': return { label: 'Settled outside Serbizyu', classes: 'bg-emerald-50 text-emerald-800 ring-emerald-200' };
        case 'superseded':
        case 'cancelled':
        default: return { label: 'No longer active', classes: 'bg-slate-50 text-slate-700 ring-slate-200' };
    }
}

export default function MoneyHistory({ groups = [] }: { groups: CurrencyGroup[] }) {
    const [filter, setFilter] = useState<Filter>('all');
    const filteredGroups = groups.map((group) => ({
        ...group,
        records: group.records.filter((record) => {
            const category = recordCategory(record.status);
            if (filter === 'needs-action') return (record.role === 'payer' && category === 'receivable') || (record.role === 'recipient' && category === 'awaiting');
            if (filter === 'recorded') return category === 'settled';
            return true;
        }),
    }));
    const hasRecords = filteredGroups.some((group) => group.records.length > 0);
    const recordsCount = groups.reduce((count, group) => count + group.records.length, 0);

    return (
        <AppShell activeRoute="money-history" activeMobileTab="explore">
            <Head title="Money History" />
            <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
                <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-2 text-xs font-extrabold tracking-[0.16em] text-[#D98B16] uppercase">Payment activity</p>
                        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F2F58] sm:text-4xl">Money history</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Each record belongs to one order and one payment obligation. Cash and personal-wallet transfers remain between the parties.</p>
                    </div>
                    <Link href="/orders" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#0F2F58] shadow-xs hover:bg-slate-50 sm:self-auto">
                        View orders <ArrowUpRight aria-hidden="true" className="size-4" />
                    </Link>
                </header>

                <section aria-label="Money history summary" className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {([
                        { label: 'Receivables', mobileLabel: 'Receivables', key: 'receivable_minor', icon: ReceiptText },
                        { label: 'Awaiting acknowledgement', mobileLabel: 'Awaiting ack', key: 'awaiting_acknowledgement_minor', icon: Clock3 },
                        { label: 'Under review', mobileLabel: 'Under review', key: 'under_review_minor', icon: CircleHelp },
                        { label: 'Settled outside Serbizyu', mobileLabel: 'Settled outside', key: 'settled_minor', icon: WalletCards },
                    ] satisfies { label: string; mobileLabel: string; key: SummaryKey; icon: typeof ReceiptText }[]).map(({ label, mobileLabel, key, icon: Icon }) => (
                        <article key={key} role="group" aria-label={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-[11px] leading-4 font-semibold text-slate-500"><span className="sm:hidden">{mobileLabel}</span><span className="hidden sm:inline">{label}</span></p>
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#EBF2FA] text-[#0F2F58]"><Icon aria-hidden="true" className="size-3.5" /></span>
                            </div>
                            <div className="mt-3 space-y-1">
                                {groups.length ? groups.map((group) => (
                                    <p key={group.currency} className="text-lg font-extrabold tracking-tight text-[#0F2F58]">{formatMoney(group[key], group.currency)} <span className="text-xs font-semibold text-slate-400">{group.currency}</span></p>
                                )) : <p className="text-sm font-bold text-slate-400">No records</p>}
                            </div>
                        </article>
                    ))}
                </section>

                <section aria-labelledby="history-records-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <h2 id="history-records-heading" className="text-lg font-extrabold text-slate-900">Payment records</h2>
                            <p className="mt-1 text-xs text-slate-500">{recordsCount} {recordsCount === 1 ? 'record' : 'records'} · amounts grouped by currency</p>
                        </div>
                        <div className="flex w-full gap-1 rounded-xl bg-slate-100 p-1 sm:w-auto" role="group" aria-label="Filter payment records">
                            {filters.map(({ id, label }) => (
                                <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={`min-h-10 flex-1 rounded-lg px-3 text-xs font-bold transition-colors sm:flex-none ${filter === id ? 'bg-white text-[#0F2F58] shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {hasRecords ? <div className="divide-y divide-slate-100">
                        {filteredGroups.map((group) => group.records.length > 0 && (
                            <section key={group.currency} aria-label={`${group.currency} payment records`} className="p-4 sm:p-6">
                                <h3 className="mb-3 text-xs font-extrabold tracking-[0.12em] text-slate-500 uppercase">{group.currency}</h3>
                                <ul className="space-y-3">
                                    {group.records.map((record) => {
                                        const presentation = statusPresentation(record.status);
                                        return <li key={record.id} className="rounded-xl border border-slate-200 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="font-bold text-slate-900">{record.title}</h4>
                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${presentation.classes}`}>{presentation.label}</span>
                                                </div>
                                                <p className="mt-1 text-xs leading-5 text-slate-600">{record.role === 'payer' ? 'Payee' : 'Payer'}: {record.party_name} <span aria-hidden="true">·</span> {laneLabel(record.lane)}</p>
                                                <p className="mt-1 text-xs text-slate-500">{record.public_reference} <span aria-hidden="true">·</span> Order {record.order_id}</p>
                                            </div>
                                            <div className="mt-3 shrink-0 sm:mt-0 sm:text-right">
                                                <p className="text-lg font-extrabold text-[#0F2F58]">{formatMoney(record.amount_minor, group.currency)}</p>
                                                <p className="mt-1 text-xs text-slate-500">{formatUpdatedAt(record.updated_at)}</p>
                                            </div>
                                        </li>;
                                    })}
                                </ul>
                            </section>
                        ))}
                    </div> : <div className="px-5 py-12 text-center sm:py-16">
                        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#EBF2FA] text-[#0F2F58]"><ReceiptText aria-hidden="true" className="size-6" /></span>
                        <h3 className="mt-4 text-base font-extrabold text-slate-900">{recordsCount === 0 ? 'No payment records yet' : 'No records match this filter'}</h3>
                        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">{recordsCount === 0 ? 'Recorded payment activity will appear here. This history is not a wallet or balance.' : 'Choose another filter to see the rest of your payment activity.'}</p>
                    </div>}
                </section>
                <p className="mt-4 text-xs leading-5 text-slate-500">History is not a wallet, withdrawal balance, or escrow service. Settled cash and personal-wallet payments are recorded between the parties.</p>
            </main>
        </AppShell>
    );
}
