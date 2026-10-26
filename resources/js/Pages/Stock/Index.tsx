import { Link } from '@inertiajs/react';
import { ArrowUpRight, Boxes, PackageSearch } from 'lucide-react';

type StockItem = {
    id: string;
    listing_id: string;
    resource_key: string;
    listing_title: string;
    variant_name: string;
    on_hand: number;
    held: number;
    committed_unfulfilled: number;
    available: number;
    availability_status: 'open' | 'out_of_stock' | 'shortage' | 'paused';
};

function Status({ status }: { status: StockItem['availability_status'] }) {
    const styles = {
        open: 'bg-emerald-50 text-emerald-800',
        out_of_stock: 'bg-slate-100 text-slate-700',
        shortage: 'bg-rose-50 text-rose-800',
        paused: 'bg-amber-50 text-amber-800',
    };
    const label = {
        open: 'Available',
        out_of_stock: 'Out of stock',
        shortage: 'Shortage',
        paused: 'Paused',
    };

    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[status]}`}>{label[status]}</span>;
}

export default function StockIndex({ items = [] }: { items: StockItem[] }) {
    const totals = items.reduce(
        (sum, item) => ({
            onHand: sum.onHand + item.on_hand,
            held: sum.held + item.held,
            committed: sum.committed + item.committed_unfulfilled,
            available: sum.available + item.available,
        }),
        { onHand: 0, held: 0, committed: 0, available: 0 },
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
                    <div>
                        <Link href="/my-listings" className="text-sm font-semibold text-[#0F2F58] hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]">My listings</Link>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0F2F58]">Stock</h1>
                        <p className="mt-1 text-sm text-slate-600">Physical quantities and active commitments across your product variants.</p>
                    </div>
                    <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 sm:flex">
                        <Boxes className="size-4 text-[#0F2F58]" aria-hidden="true" />
                        {items.length} tracked variants
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
                <section aria-label="Stock totals" className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-slate-200 pb-5 sm:grid-cols-4">
                    <Balance label="On hand" value={totals.onHand} />
                    <Balance label="Held" value={totals.held} muted />
                    <Balance label="Committed" value={totals.committed} muted />
                    <Balance label="Available" value={totals.available} emphasis />
                </section>
                <p className="mt-4 text-sm text-slate-600">Available = on hand − held − committed unfulfilled. Holds and orders do not change physical stock.</p>

                {items.length === 0 ? (
                    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                        <PackageSearch className="mx-auto size-8 text-slate-400" aria-hidden="true" />
                        <h2 className="mt-3 text-lg font-bold text-[#0F2F58]">No tracked product stock yet</h2>
                        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">Product variants appear here when their listings are published. Opening stock can be zero and later updated from the stock ledger.</p>
                        <Link href="/my-listings" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#0F2F58] px-4 py-2 text-sm font-bold text-white hover:bg-[#153e74] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]">View listings</Link>
                    </div>
                ) : (
                    <>
                        <div className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-bold tracking-wide text-slate-600 uppercase">
                                    <tr><th className="px-5 py-3">Product · variant</th><th className="px-4 py-3 text-right">On hand</th><th className="px-4 py-3 text-right">Held</th><th className="px-4 py-3 text-right">Committed</th><th className="px-4 py-3 text-right">Available</th><th className="px-5 py-3">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/70">
                                            <td className="px-5 py-4"><Link href={`/stock/${item.id}`} className="font-bold text-[#0F2F58] hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]">{item.listing_title}</Link><div className="mt-0.5 text-slate-600">{item.variant_name}</div></td>
                                            <Cell value={item.on_hand} />
                                            <Cell value={item.held} />
                                            <Cell value={item.committed_unfulfilled} />
                                            <Cell value={item.available} strong />
                                            <td className="px-5 py-4"><Status status={item.availability_status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <ul className="mt-5 space-y-3 md:hidden">
                            {items.map((item) => (
                                <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0"><Link href={`/stock/${item.id}`} className="block truncate font-bold text-[#0F2F58] hover:underline">{item.listing_title}</Link><p className="mt-0.5 text-sm text-slate-600">{item.variant_name}</p></div>
                                        <Status status={item.availability_status} />
                                    </div>
                                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 text-sm">
                                        <Count label="On hand" value={item.on_hand} />
                                        <Count label="Available" value={item.available} strong />
                                        <Count label="Held" value={item.held} />
                                        <Count label="Committed" value={item.committed_unfulfilled} />
                                    </dl>
                                    <Link href={`/stock/${item.id}`} className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#0F2F58]">Open ledger <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </main>
        </div>
    );
}

function Balance({ label, value, emphasis = false, muted = false }: { label: string; value: number; emphasis?: boolean; muted?: boolean }) {
    return <div><div className="text-xs font-bold tracking-wide text-slate-500 uppercase">{label}</div><div className={`mt-1 font-mono text-xl font-extrabold tabular-nums ${emphasis ? 'text-[#0F2F58]' : muted ? 'text-slate-700' : 'text-slate-900'}`}>{value}</div></div>;
}

function Cell({ value, strong = false }: { value: number; strong?: boolean }) {
    return <td className={`px-4 py-4 text-right font-mono tabular-nums ${strong ? 'font-extrabold text-[#0F2F58]' : 'font-semibold text-slate-700'}`}>{value}</td>;
}

function Count({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
    return <div className="flex items-center justify-between gap-3"><dt className="text-slate-600">{label}</dt><dd className={`font-mono tabular-nums ${strong ? 'font-extrabold text-[#0F2F58]' : 'font-semibold text-slate-900'}`}>{value}</dd></div>;
}
