import { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, TriangleAlert } from 'lucide-react';

type MovementType = 'receiving' | 'damaged' | 'recount';
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
    row_version: number;
    affected_orders: string[];
    movements: Array<{
        id: string;
        movement_type: string;
        delta_on_hand: number;
        balance_on_hand: number;
        balance_held: number;
        balance_committed: number;
        balance_available: number;
        counted_quantity: number | null;
        reason: string | null;
        reference: string | null;
        occurred_at: string;
        actor_name: string | null;
        order_reference: string | null;
    }>;
};

type AdjustmentForm = {
    movement_type: MovementType;
    quantity: number;
    expected_row_version: number;
    idempotency_key: string;
    reason: string;
    reference: string;
};

const movementTitles: Record<MovementType, string> = {
    receiving: 'Receive stock',
    damaged: 'Record damaged stock',
    recount: 'Record physical recount',
};

function newIdempotencyKey(): string {
    return `stock-${window.crypto.randomUUID()}`;
}

export default function StockShow({ stockItem, notice }: { stockItem: StockItem; notice?: string | null }) {
    const [movementType, setMovementType] = useState<MovementType>('receiving');
    const { data, setData, post, processing, errors, clearErrors } = useForm<AdjustmentForm>({
        movement_type: 'receiving',
        quantity: 1,
        expected_row_version: stockItem.row_version,
        idempotency_key: newIdempotencyKey(),
        reason: '',
        reference: '',
    });
    const [savedKey, setSavedKey] = useState(data.idempotency_key);
    const shortage = stockItem.availability_status === 'shortage';

    function chooseMovement(type: MovementType) {
        setMovementType(type);
        setData('movement_type', type);
        setData('quantity', type === 'recount' ? 0 : 1);
        clearErrors();
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setData('expected_row_version', stockItem.row_version);
        post(`/stock/${stockItem.id}/adjustments`, {
            preserveScroll: true,
            onSuccess: () => {
                const nextKey = newIdempotencyKey();
                setData({ ...data, quantity: movementType === 'recount' ? 0 : 1, reason: '', reference: '', expected_row_version: stockItem.row_version + 1, idempotency_key: nextKey });
                setSavedKey(nextKey);
            },
        });
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
                    <Link href="/stock" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#0F2F58] hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]"><ArrowLeft className="size-4" aria-hidden="true" />Stock ledger</Link>
                    <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0F2F58]">{stockItem.variant_name}</h1>
                    <p className="mt-1 text-sm text-slate-600">{stockItem.listing_title} · Movement history</p>
                </div>
            </header>

            <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
                {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{notice}</p> : null}
                {shortage ? (
                    <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-5">
                        <div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 size-5 shrink-0 text-rose-700" aria-hidden="true" /><div><h2 className="font-bold text-rose-950">Available stock is below existing commitments</h2><p className="mt-1 text-sm leading-relaxed text-rose-900">The recount is recorded as the true physical count. Existing holds and accepted orders have not been cancelled; new holds are blocked until stock covers them.</p></div></div>
                        {stockItem.affected_orders.length > 0 ? <div className="mt-4 border-t border-rose-200 pt-3"><h3 className="text-sm font-bold text-rose-950">Orders that need review</h3><ul className="mt-2 flex flex-wrap gap-2">{stockItem.affected_orders.map((reference) => <li key={reference} className="rounded-full bg-white px-3 py-1 font-mono text-sm font-bold text-rose-900">{reference}</li>)}</ul></div> : null}
                    </section>
                ) : null}

                <section aria-label="Current stock balance" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div><h2 className="font-bold text-[#0F2F58]">Current balance</h2><p className="mt-1 text-sm text-slate-600">Available = on hand − held − committed unfulfilled</p></div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${shortage ? 'bg-rose-100 text-rose-900' : stockItem.availability_status === 'out_of_stock' ? 'bg-slate-100 text-slate-700' : stockItem.availability_status === 'paused' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{shortage ? 'Shortage' : stockItem.availability_status === 'out_of_stock' ? 'Out of stock' : stockItem.availability_status === 'paused' ? 'Paused' : 'Available'}</span>
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
                        <Balance label="On hand" value={stockItem.on_hand} />
                        <Balance label="Held" value={stockItem.held} />
                        <Balance label="Committed" value={stockItem.committed_unfulfilled} />
                        <Balance label="Available" value={stockItem.available} strong />
                    </dl>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div><h2 className="font-bold text-[#0F2F58]">Record a stock movement</h2><p className="mt-1 text-sm text-slate-600">Physical adjustments update on-hand stock; they never remove or cancel an order commitment.</p></div>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="Stock movement type">
                        {(['receiving', 'damaged', 'recount'] as const).map((type) => <button key={type} type="button" onClick={() => chooseMovement(type)} aria-pressed={movementType === type} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58] ${movementType === type ? 'border-[#0F2F58] bg-[#0F2F58] text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{movementTitles[type]}</button>)}
                    </div>
                    <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-semibold text-slate-800">{movementType === 'receiving' ? 'Quantity received' : movementType === 'damaged' ? 'Damaged quantity' : 'Physical count'}<input type="number" min={movementType === 'recount' ? 0 : 1} step="1" required value={data.quantity} onChange={(event) => setData('quantity', Number(event.target.value))} aria-invalid={Boolean(errors.quantity)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-base tabular-nums outline-none focus:border-[#0F2F58] focus:ring-2 focus:ring-[#0F2F58]/20" />{errors.quantity ? <span className="mt-1 block text-sm font-medium text-rose-700">{errors.quantity}</span> : null}</label>
                        <label className="block text-sm font-semibold text-slate-800">{movementType === 'recount' ? 'Count reference (optional)' : 'Supplier / damage reference (optional)'}<input type="text" maxLength={191} value={data.reference} onChange={(event) => setData('reference', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-[#0F2F58] focus:ring-2 focus:ring-[#0F2F58]/20" /></label>
                        <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">Reason<input type="text" required minLength={3} maxLength={1000} value={data.reason} onChange={(event) => setData('reason', event.target.value)} aria-invalid={Boolean(errors.reason)} placeholder={movementType === 'receiving' ? 'e.g. Supplier delivery received' : movementType === 'damaged' ? 'e.g. Cracked during unloading' : 'e.g. Counted stock on shelf'} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none placeholder:text-slate-500 focus:border-[#0F2F58] focus:ring-2 focus:ring-[#0F2F58]/20" />{errors.reason ? <span className="mt-1 block text-sm font-medium text-rose-700">{errors.reason}</span> : null}</label>
                        {errors.movement_type ? <p role="alert" className="text-sm font-semibold text-rose-700 sm:col-span-2">{errors.movement_type}</p> : null}
                        {errors.expected_row_version ? <p role="alert" className="text-sm font-semibold text-rose-700 sm:col-span-2">{errors.expected_row_version}</p> : null}
                        <input type="hidden" name="expected_row_version" value={stockItem.row_version} />
                        <input type="hidden" name="idempotency_key" value={savedKey} />
                        <div className="sm:col-span-2 sm:flex sm:justify-end"><button type="submit" disabled={processing} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0F2F58] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#153e74] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58] disabled:cursor-wait disabled:opacity-60 sm:w-auto">{processing ? 'Saving movement…' : movementTitles[movementType]}<ArrowRight className="size-4" aria-hidden="true" /></button></div>
                    </form>
                </section>

                <section aria-labelledby="movement-history-heading">
                    <div className="flex items-end justify-between gap-3"><div><h2 id="movement-history-heading" className="text-lg font-extrabold text-[#0F2F58]">Movement history</h2><p className="mt-1 text-sm text-slate-600">Newest first · append-only ledger</p></div><span className="text-sm font-semibold text-slate-600">{stockItem.movements.length} entries</span></div>
                    {stockItem.movements.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">No movements have been recorded.</p> : <ol className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                        {stockItem.movements.map((movement) => <li key={movement.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-5"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{movementLabel(movement.movement_type)}</h3>{movement.order_reference ? <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700">{movement.order_reference}</span> : null}</div><p className="mt-1 text-sm text-slate-600">{movement.reason || 'Stock movement'}{movement.reference ? ` · ${movement.reference}` : ''}</p><p className="mt-1 text-xs text-slate-500">{formatDate(movement.occurred_at)}{movement.actor_name ? ` · ${movement.actor_name}` : ''}</p><p className="mt-2 text-xs text-slate-600">After: {movement.balance_on_hand} on hand · {movement.balance_held} held · {movement.balance_committed} committed · {movement.balance_available} available</p></div><div className="font-mono text-sm font-bold tabular-nums text-[#0F2F58] sm:text-right">{movement.movement_type === 'recount' ? `Count ${movement.counted_quantity}` : movement.delta_on_hand > 0 ? `+${movement.delta_on_hand}` : movement.delta_on_hand}</div></li>)}
                    </ol>}
                </section>
            </main>
        </div>
    );
}

function Balance({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
    return <div><dt className="text-xs font-bold tracking-wide text-slate-500 uppercase">{label}</dt><dd className={`mt-1 font-mono text-lg font-extrabold tabular-nums ${strong ? 'text-[#0F2F58]' : 'text-slate-800'}`}>{value}</dd></div>;
}

function movementLabel(type: string): string {
    return ({ opening_balance: 'Opening balance', receiving: 'Stock received', damaged: 'Damaged stock', recount: 'Physical recount', hold: 'Stock held for order', commit: 'Order accepted', release: 'Reservation released', fulfillment: 'Fulfilled order' } as Record<string, string>)[type] ?? type;
}

function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
