import { useState } from 'react';
import { router } from '@inertiajs/react';
import { CalendarClock, LoaderCircle } from 'lucide-react';

export type ScheduleChangeRequest = {
    id: string;
    proposedStart: string;
    proposedEnd: string;
    proposerUserId: string;
    status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
    createdAt: string;
};

export type AppointmentProjection = {
    scheduledAt: string | null;
    scheduleChangeRequests: ScheduleChangeRequest[];
    canPropose: boolean;
    viewerUserId: string;
};

type Props = {
    orderId: string;
    appointment: AppointmentProjection | null;
};

const localInput = (value: string): string => {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function AppointmentPanel({ orderId, appointment }: Props) {
    const [startsAt, setStartsAt] = useState('');
    const [reason, setReason] = useState('');
    const [busyRequest, setBusyRequest] = useState<string | null>(null);
    const [busyAction, setBusyAction] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!appointment) return null;

    const send = (url: string, action: string, data?: Record<string, string>) => {
        setBusyRequest(action);
        setError(null);
        router.post(url, data ?? {}, {
            preserveScroll: true,
            onError: (errors) => setError(Object.values(errors)[0] ?? 'The schedule change could not be saved.'),
            onFinish: () => setBusyRequest(null),
        });
    };

    const activeRequest = appointment.scheduleChangeRequests.find((request) => request.status === 'pending');
    return (
        <section className="space-y-4 rounded-2xl border border-[#D8E1EB] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="appointment-title" data-testid="appointment-panel">
            <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EBF2FA] text-[#0F2F58]"><CalendarClock className="size-5" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                    <h2 id="appointment-title" className="text-base font-bold text-[#102A43]">Appointment</h2>
                    <p className="mt-1 text-sm text-[#526579]">{appointment.scheduledAt ? `Booked for ${new Date(appointment.scheduledAt).toLocaleString()}` : 'No appointment time has been confirmed yet.'}</p>
                </div>
            </div>
            {activeRequest ? (
                <div className="space-y-3 rounded-xl bg-[#F4F7FA] p-4" data-testid="schedule-change-pending">
                    <div>
                        <p className="text-sm font-semibold text-[#102A43]">Schedule change requested</p>
                        <p className="mt-1 text-sm text-[#526579]">Proposed time: {new Date(activeRequest.proposedStart).toLocaleString()}. The current booking remains active until both participants agree.</p>
                    </div>
                    {activeRequest.proposerUserId === appointment.viewerUserId ? (
                        <button type="button" disabled={busyRequest !== null} onClick={() => send(`/orders/${orderId}/schedule-change-requests/${activeRequest.id}/withdraw`, 'withdraw')} className="rounded-lg border border-[#CBD5DF] px-3 py-2 text-sm font-semibold text-[#102A43] disabled:opacity-50">Withdraw request</button>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={busyRequest !== null} onClick={() => send(`/orders/${orderId}/schedule-change-requests/${activeRequest.id}/accept`, 'accept')} className="rounded-lg bg-[#F4A900] px-3 py-2 text-sm font-bold text-[#172B4D] disabled:opacity-50">{busyRequest === 'accept' ? <LoaderCircle className="size-4 animate-spin" /> : 'Accept new time'}</button>
                            <button type="button" disabled={busyRequest !== null} onClick={() => send(`/orders/${orderId}/schedule-change-requests/${activeRequest.id}/reject`, 'reject')} className="rounded-lg border border-[#CBD5DF] px-3 py-2 text-sm font-semibold text-[#102A43] disabled:opacity-50">Reject</button>
                        </div>
                    )}
                </div>
            ) : appointment.canPropose ? (
                <form className="grid gap-3 rounded-xl bg-[#F4F7FA] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(event) => {
                    event.preventDefault();
                    setBusyAction(true);
                    setError(null);
                    router.post(`/orders/${orderId}/schedule-change-requests`, { starts_at: new Date(startsAt).toISOString(), reason }, {
                        preserveScroll: true,
                        onError: (errors) => setError(Object.values(errors)[0] ?? 'Choose a new appointment time.'),
                        onFinish: () => setBusyAction(false),
                    });
                }}>
                    <label className="grid gap-1 text-sm font-semibold text-[#243B53]">Propose a new time<input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} min={localInput(new Date().toISOString())} className="min-h-11 rounded-lg border border-[#CBD5DF] bg-white px-3 text-[#102A43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]" /></label>
                    <label className="grid gap-1 text-sm font-semibold text-[#243B53]">Reason (optional)<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className="min-h-11 rounded-lg border border-[#CBD5DF] bg-white px-3 text-[#102A43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]" /></label>
                    <button type="submit" disabled={busyAction || !startsAt} className="min-h-11 rounded-lg bg-[#F4A900] px-4 text-sm font-bold text-[#172B4D] disabled:opacity-50">{busyAction ? <LoaderCircle className="size-4 animate-spin" /> : 'Request change'}</button>
                </form>
            ) : null}
            {error ? <p role="alert" className="text-sm font-medium text-[#9B1C1C]">{error}</p> : null}
            {appointment.scheduleChangeRequests.filter((request) => request.status !== 'pending').slice(0, 3).map((request) => <p key={request.id} data-testid={request.status === 'expired' ? 'schedule-change-expired' : undefined} className="text-xs text-[#526579]">Previous request · {request.status === 'expired' ? 'Expired — original appointment remains booked' : request.status} · {new Date(request.createdAt).toLocaleString()}</p>)}
        </section>
    );
}
