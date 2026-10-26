import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, LoaderCircle } from 'lucide-react';

export type AppointmentHold = {
    id: string;
    starts_at: string;
    ends_at: string;
    hold_expires_at: string;
    duration_minutes: number;
};

type Slot = { starts_at: string; ends_at: string };
export type AppointmentSource =
    | { kind: 'listing'; listingId: string; listingVersionId: string }
    | { kind: 'quote'; requestId: string; quoteId: string; quoteVersion: number };

type Props = {
    source: AppointmentSource;
    onHeld: (hold: AppointmentHold) => void;
    disabled?: boolean;
};

const csrfToken = (): string => {
    const token = document.cookie
        .split('; ')
        .find((item) => item.startsWith('XSRF-TOKEN='))
        ?.split('=')
        .slice(1)
        .join('=');
    return token ? decodeURIComponent(token) : '';
};
const dayLabel = (value: string) =>
    new Date(value).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
const timeLabel = (value: string) =>
    new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function AppointmentSlotPicker(props: Props) {
    const { source } = props;
    const sourceKey =
        source.kind === 'listing'
            ? `listing:${source.listingId}:${source.listingVersionId}`
            : `quote:${source.requestId}:${source.quoteId}:${source.quoteVersion}`;

    return <AppointmentSlotsForSource key={sourceKey} {...props} />;
}

function AppointmentSlotsForSource({ source, onHeld, disabled = false }: Props) {
    const [slots, setSlots] = useState<Slot[]>([]);
    const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [holding, setHolding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const active = useRef(true);
    const sourceUrl =
        source.kind === 'listing'
            ? `/listings/${source.listingId}`
            : `/requests/${source.requestId}/quotes/${source.quoteId}`;
    const versionField = source.kind === 'listing' ? 'listing_version_id' : 'quote_version';
    const sourceVersion =
        source.kind === 'listing' ? source.listingVersionId : String(source.quoteVersion);

    useEffect(() => {
        active.current = true;
        const from = new Date(Date.now() + 30 * 60_000).toISOString();
        const to = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString();
        let cancelled = false;
        fetch(
            `${sourceUrl}/appointment-slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&${versionField}=${encodeURIComponent(sourceVersion)}`,
            {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
            },
        )
            .then(async (response) => {
                const payload = await response.json();
                if (!response.ok)
                    throw new Error(
                        payload?.error?.message ?? 'Appointment times could not be loaded.',
                    );
                if (!cancelled) {
                    setSlots(payload.data.slots);
                    setDurationMinutes(payload.data.duration_minutes);
                }
            })
            .catch((reason: unknown) => {
                if (!cancelled)
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : 'Appointment times could not be loaded.',
                    );
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
            active.current = false;
        };
    }, [sourceUrl, versionField, sourceVersion]);

    const slotsByDay = useMemo(
        () =>
            slots.reduce<Record<string, Slot[]>>((groups, slot) => {
                const key = new Date(slot.starts_at).toLocaleDateString();
                groups[key] = [...(groups[key] ?? []), slot];
                return groups;
            }, {}),
        [slots],
    );

    const reserve = async () => {
        if (!selected || disabled || holding) return;
        setHolding(true);
        setError(null);
        try {
            const response = await fetch(`${sourceUrl}/appointment-holds`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({
                    starts_at: selected,
                    [versionField]:
                        source.kind === 'quote' ? source.quoteVersion : source.listingVersionId,
                    idempotency_key: `appointment-${crypto.randomUUID()}`,
                }),
            });
            const payload = await response.json();
            if (!response.ok)
                throw new Error(
                    payload?.error?.message ?? 'That time was just taken. Choose another slot.',
                );
            if (!active.current) return;
            onHeld(payload.data as AppointmentHold);
        } catch (reason: unknown) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : 'That time was just taken. Choose another slot.',
            );
            setSelected(null);
        } finally {
            setHolding(false);
        }
    };

    return (
        <section
            className="space-y-5"
            aria-label="Appointment availability"
            data-testid="appointment-slot-picker"
        >
            <header className="flex items-start gap-3 rounded-xl border border-[#D8E1EB] bg-white p-4">
                <CalendarClock
                    className="mt-0.5 size-5 shrink-0 text-[#0F2F58]"
                    aria-hidden="true"
                />
                <div>
                    <p className="text-sm font-semibold text-[#102A43]">
                        Full appointment duration ·{' '}
                        {durationMinutes === null ? 'Loading' : `${durationMinutes} minutes`}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-[#526579]">
                        The selected interval is held for up to 10 minutes while you complete the
                        request.
                    </p>
                </div>
            </header>
            {loading ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#D8E1EB] bg-white p-5 text-sm text-[#526579]">
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    Loading available times…
                </div>
            ) : null}
            {!loading && slots.length === 0 && !error ? (
                <div className="rounded-2xl border border-dashed border-[#CBD5DF] px-5 py-10 text-center">
                    <h2 className="font-semibold text-[#243B53]">No open appointment times</h2>
                    <p className="mt-1 text-sm text-[#526579]">
                        There are no available slots in the next seven days. Try again later.
                    </p>
                </div>
            ) : null}
            {!loading
                ? Object.entries(slotsByDay).map(([day, daySlots]) => (
                      <div key={day} className="space-y-3">
                          <h2 className="text-base font-bold text-[#102A43]">
                              {dayLabel(daySlots[0].starts_at)}
                          </h2>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {daySlots.map((slot) => (
                                  <button
                                      key={slot.starts_at}
                                      type="button"
                                      aria-pressed={selected === slot.starts_at}
                                      disabled={disabled || holding}
                                      onClick={() => setSelected(slot.starts_at)}
                                      className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58] ${selected === slot.starts_at ? 'border-[#0F2F58] bg-[#0F2F58] text-white' : 'border-[#CBD5DF] bg-white text-[#102A43] hover:border-[#0F2F58]'}`}
                                  >
                                      {timeLabel(slot.starts_at)} – {timeLabel(slot.ends_at)}
                                  </button>
                              ))}
                          </div>
                      </div>
                  ))
                : null}
            {error ? (
                <p
                    role="alert"
                    className="rounded-lg bg-[#FDECEC] px-3 py-2 text-sm font-semibold text-[#9B1C1C]"
                >
                    {error}
                </p>
            ) : null}
            {selected ? (
                <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-xl border border-[#D8E1EB] bg-white p-3 shadow-lg sm:p-4">
                    <p className="min-w-0 text-sm font-semibold text-[#243B53]">
                        Selected · {new Date(selected).toLocaleString()}
                    </p>
                    <button
                        type="button"
                        disabled={disabled || holding}
                        onClick={reserve}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#F4A900] px-4 text-sm font-bold text-[#172B4D] disabled:opacity-50"
                    >
                        {holding ? (
                            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                        ) : null}
                        {holding ? 'Holding time…' : 'Continue'}
                    </button>
                </div>
            ) : null}
        </section>
    );
}
