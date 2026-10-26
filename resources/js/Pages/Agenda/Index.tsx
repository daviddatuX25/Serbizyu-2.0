import { FormEvent, useState } from 'react';
import { router } from '@inertiajs/react';
import { CalendarDays, LoaderCircle, Trash2 } from 'lucide-react';

type AgendaItem = { id: string; startsAt: string; endsAt: string; status: 'booked' | 'held'; holdExpiresAt: string | null; orderReference: string | null; customerName: string | null };
type AgendaBlock = { id: string; startsAt: string; endsAt: string; reason: string | null };
type Props = { agenda: { bookings: AgendaItem[]; blocks: AgendaBlock[]; open: { startsAt: string; endsAt: string }[]; range: { from: string; to: string } }; correlationId: string };

const localInput = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const timeLabel = (value: string) => new Date(value).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function AgendaIndex({ agenda }: Props) {
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const blocksByStart = [...agenda.blocks].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const bookingsByStart = [...agenda.bookings].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    const submitBlock = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        router.post('/agenda/blocks', { starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(), reason }, {
            preserveScroll: true,
            onError: (errors) => setError(Object.values(errors)[0] ?? 'The availability block could not be saved.'),
            onFinish: () => setBusy(false),
        });
    };

    const deleteBlock = (block: AgendaBlock) => {
        router.delete(`/agenda/blocks/${block.id}`, { preserveScroll: true, onError: (errors) => setError(Object.values(errors)[0] ?? 'The availability block could not be deleted.') });
    };

    return (
        <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6" data-testid="provider-agenda">
            <header className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#EBF2FA] text-[#0F2F58]"><CalendarDays className="size-6" aria-hidden="true" /></span>
                <div><h1 className="text-2xl font-bold tracking-tight text-[#102A43]">Provider agenda</h1><p className="mt-1 max-w-[65ch] text-sm leading-6 text-[#526579]">Appointments, temporary holds, open time and your availability blocks. Creating a block prevents future holds; it does not cancel appointments already booked.</p></div>
            </header>
            <section aria-labelledby="agenda-items-title" className="space-y-3">
                <h2 id="agenda-items-title" className="text-lg font-bold text-[#102A43]">Schedule</h2>
                {bookingsByStart.length === 0 && blocksByStart.length === 0 ? <div className="rounded-2xl border border-dashed border-[#CBD5DF] px-5 py-10 text-center"><p className="font-semibold text-[#243B53]">No appointments or blocks in this period</p><p className="mt-1 text-sm text-[#526579]">Open time is available for customers to request.</p></div> : (
                    <ol className="divide-y divide-[#E6ECF2] rounded-2xl border border-[#D8E1EB] bg-white">
                        {bookingsByStart.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
                            <time className="w-full text-xs font-semibold tabular-nums text-[#526579] sm:w-44">{timeLabel(item.startsAt)} – {new Date(item.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
                            <div className="min-w-0 flex-1"><p className="font-semibold text-[#102A43]">{item.status === 'booked' ? item.customerName ?? 'Appointment' : 'Appointment hold'}</p><p className="text-sm text-[#526579]">{item.status === 'booked' ? item.orderReference ?? 'Confirmed booking' : `Held until ${item.holdExpiresAt ? timeLabel(item.holdExpiresAt) : 'expiry'}`}</p></div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === 'booked' ? 'bg-[#E7F5ED] text-[#17663B]' : 'bg-[#FFF4D6] text-[#78520A]'}`}>{item.status === 'booked' ? 'Booked' : 'Held'}</span>
                        </li>)}
                        {blocksByStart.map((block) => <li key={block.id} className="flex flex-wrap items-center gap-3 bg-[#F4F7FA] px-4 py-4 sm:px-5">
                            <time className="w-full text-xs font-semibold tabular-nums text-[#526579] sm:w-44">{timeLabel(block.startsAt)} – {new Date(block.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
                            <div className="min-w-0 flex-1"><p className="font-semibold text-[#102A43]">Unavailable</p><p className="text-sm text-[#526579]">{block.reason || 'Provider availability block'}</p></div>
                            <span className="rounded-full bg-[#E8EDF2] px-2.5 py-1 text-xs font-bold text-[#354B60]">Blocked</span>
                            <button type="button" onClick={() => deleteBlock(block)} aria-label={`Remove block starting ${timeLabel(block.startsAt)}`} className="grid size-10 place-items-center rounded-lg text-[#526579] hover:bg-white hover:text-[#9B1C1C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]"><Trash2 className="size-4" aria-hidden="true" /></button>
                        </li>)}
                    </ol>
                )}
            </section>
            <section aria-labelledby="agenda-open-title" className="rounded-2xl border border-[#D8E1EB] bg-white p-4 sm:p-5">
                <h2 id="agenda-open-title" className="text-lg font-bold text-[#102A43]">Open availability</h2>
                <p className="mt-1 text-sm text-[#526579]">Intervals without a booking, hold or block in this period.</p>
                <ul className="mt-3 space-y-2">
                    {agenda.open.length === 0 ? <li className="text-sm text-[#526579]">No open intervals in this period.</li> : agenda.open.map((interval) => <li key={interval.startsAt} className="flex flex-wrap items-center gap-3 rounded-lg bg-[#E7F5ED] px-3 py-2"><time className="text-sm font-semibold tabular-nums text-[#17663B]">{timeLabel(interval.startsAt)} – {new Date(interval.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#17663B]">Open</span></li>)}
                </ul>
            </section>
            <section aria-labelledby="agenda-block-title" className="rounded-2xl border border-[#D8E1EB] bg-white p-4 sm:p-5">
                <h2 id="agenda-block-title" className="text-lg font-bold text-[#102A43]">Block unavailable time</h2>
                <form onSubmit={submitBlock} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                    <label className="grid gap-1 text-sm font-semibold text-[#243B53]">Starts<input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} min={localInput(new Date())} className="min-h-11 rounded-lg border border-[#CBD5DF] bg-white px-3 text-[#102A43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]" /></label>
                    <label className="grid gap-1 text-sm font-semibold text-[#243B53]">Ends<input required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} min={startsAt || localInput(new Date())} className="min-h-11 rounded-lg border border-[#CBD5DF] bg-white px-3 text-[#102A43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]" /></label>
                    <label className="grid gap-1 text-sm font-semibold text-[#243B53]">Reason (optional)<input maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-11 rounded-lg border border-[#CBD5DF] bg-white px-3 text-[#102A43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]" /></label>
                    <button type="submit" disabled={busy || !startsAt || !endsAt} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0F2F58] px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}Save block</button>
                </form>
                {error ? <p role="alert" className="mt-3 text-sm font-medium text-[#9B1C1C]">{error}</p> : null}
            </section>
        </main>
    );
}
