import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, ClipboardList } from 'lucide-react';
import { DesktopGlobalNav } from '../layout/DesktopGlobalNav';

export interface TenderWorkspaceRecord {
    id: string;
    request_id: string;
    quote_id: string | null;
    title: string;
    status: string;
    tender_mode: string;
    amount_minor: number | null;
    currency: string | null;
    deadline: string | null;
    expired: boolean;
    pending_turn: 'you' | 'counterparty' | null;
    quote_version?: number;
    quote_count?: number;
    order_id: string | null;
    order_reference: string | null;
}

export function TenderWorkspace({
    records,
    mode,
}: {
    records: TenderWorkspaceRecord[];
    mode: 'requests' | 'quotes';
}) {
    const [filter, setFilter] = useState<'all' | 'action' | 'awarded'>('all');
    const [accepting, setAccepting] = useState<string | null>(null);
    const title = mode === 'requests' ? 'My Requests' : 'My Quotes';
    const visible = records.filter((record) =>
        filter === 'action'
            ? record.pending_turn === 'you'
            : filter === 'awarded'
              ? record.order_id !== null
              : true,
    );

    return (
        <>
            <Head title={title} />
            <DesktopGlobalNav activeRoute={mode} />
            <main className="mx-auto min-h-screen max-w-4xl bg-white px-5 pt-6 pb-16 text-slate-900 md:pt-12">
                <Link
                    href="/browse"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                    <ArrowLeft size={16} /> Browse
                </Link>
                <div className="mb-6 flex items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                    <Link
                        href={mode === 'requests' ? '/my-quotes' : '/my-requests'}
                        className="text-sm font-semibold underline underline-offset-4"
                    >
                        {mode === 'requests' ? 'My Quotes' : 'My Requests'}
                    </Link>
                </div>
                <nav className="mb-6 flex gap-2" aria-label="Filter tenders">
                    {(
                        [
                            ['all', 'All'],
                            ['action', 'Needs action'],
                            ['awarded', 'Awarded'],
                        ] as const
                    ).map(([value, label]) => (
                        <button
                            type="button"
                            key={value}
                            aria-pressed={filter === value}
                            onClick={() => setFilter(value)}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-500'}`}
                        >
                            {label}
                        </button>
                    ))}
                </nav>
                {visible.length === 0 ? (
                    <section className="py-16 text-center">
                        <ClipboardList size={36} className="mx-auto mb-4 text-slate-400" />
                        <h2 className="text-xl font-semibold">
                            {filter === 'action'
                                ? 'Nothing needs your response'
                                : filter === 'awarded'
                                  ? 'No awarded orders yet'
                                  : `No ${mode} yet`}
                        </h2>
                        <p className="mt-2 text-slate-600">
                            {mode === 'requests'
                                ? 'Your posted requests and negotiations appear here.'
                                : 'Quotes you send and counter-offers appear here.'}
                        </p>
                        <Link
                            href={mode === 'requests' ? '/requests/create' : '/browse'}
                            className="mt-6 inline-flex rounded-full bg-amber-400 px-5 py-3 font-semibold text-slate-900"
                        >
                            {mode === 'requests' ? 'Post a request' : 'Browse requests'}
                        </Link>
                    </section>
                ) : (
                    <ul className="divide-y divide-slate-200 border-y border-slate-200">
                        {visible.map((record) => (
                            <li key={record.id} className="py-6">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <Link
                                            href={`/requests/${record.request_id}`}
                                            className="text-lg font-semibold hover:underline"
                                        >
                                            {record.title}
                                        </Link>
                                        <p className="mt-1 text-sm text-slate-600">
                                            {record.tender_mode.replaceAll('_', ' ')}
                                            {record.quote_version !== undefined
                                                ? ` · Quote v${record.quote_version}`
                                                : ` · ${record.quote_count ?? 0} active quotes`}
                                        </p>
                                    </div>
                                    {record.amount_minor !== null && record.currency && (
                                        <span className="font-semibold tabular-nums">
                                            {new Intl.NumberFormat('en-PH', {
                                                style: 'currency',
                                                currency: record.currency,
                                            }).format(record.amount_minor / 100)}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                    <span className="font-medium">
                                        {record.expired
                                            ? 'Expired'
                                            : record.status.replaceAll('_', ' ')}
                                    </span>
                                    {record.deadline && (
                                        <span className="text-slate-600">
                                            Deadline{' '}
                                            {new Date(record.deadline).toLocaleString('en-PH', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            })}
                                        </span>
                                    )}
                                    {record.pending_turn && (
                                        <span
                                            className={
                                                record.pending_turn === 'you'
                                                    ? 'font-semibold text-amber-800'
                                                    : 'text-slate-600'
                                            }
                                        >
                                            {record.pending_turn === 'you'
                                                ? 'Waiting on you'
                                                : 'Waiting on counterparty'}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-4">
                                    {record.order_id ? (
                                        <Link
                                            href={`/orders/${record.order_id}`}
                                            className="inline-flex items-center gap-2 font-semibold"
                                        >
                                            Open {record.order_reference ?? 'awarded order'}
                                            <ArrowRight size={16} />
                                        </Link>
                                    ) : (
                                        <Link
                                            href={`/requests/${record.request_id}`}
                                            className="inline-flex items-center gap-2 text-sm font-semibold"
                                        >
                                            Review request
                                            <ArrowRight size={16} />
                                        </Link>
                                    )}
                                    {record.pending_turn === 'you' &&
                                        record.quote_id &&
                                        !record.order_id && (
                                            <button
                                                type="button"
                                                disabled={accepting !== null}
                                                onClick={() => {
                                                    setAccepting(record.id);
                                                    router.post(
                                                        `/requests/${record.request_id}/quotes/${record.quote_id}/accept`,
                                                        {},
                                                        { onFinish: () => setAccepting(null) },
                                                    );
                                                }}
                                                className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
                                            >
                                                {accepting === record.id
                                                    ? 'Accepting…'
                                                    : 'Accept these terms'}
                                            </button>
                                        )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </>
    );
}
