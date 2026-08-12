import { Form, Link, usePage } from '@inertiajs/react';

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

    return `${currency ?? 'PHP'} ${(minor / 100).toFixed(2)}`;
}

/**
 * Throwaway founder confirm page for T3 ordinary Order formation.
 * Not hi-fi kit chrome — intentionally plain so Detail/Browse stay untouched.
 */
export default function OrderShow(props: OrderShowProps) {
    const page = usePage<{ errors?: Record<string, string | string[]>; flash?: { notice?: string } }>();
    const errors = props.errors ?? page.props.errors ?? {};
    const formError = Array.isArray(errors.form) ? errors.form[0] : errors.form;
    const notice = props.notice ?? null;
    const amount = Number(props.order.proposal?.amount_minor ?? props.terms?.amount_minor ?? 0);
    const currency = String(props.order.proposal?.currency ?? props.terms?.currency ?? 'PHP');

    return (
        <main
            style={{
                maxWidth: 720,
                margin: '2rem auto',
                padding: '1.25rem',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                lineHeight: 1.45,
            }}
        >
            <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7 }}>
                Throwaway order confirm · T3 Direct Booking
            </p>
            <h1 style={{ marginTop: 8 }}>Order {props.order.status}</h1>
            <p style={{ marginTop: 0 }}>
                You are the <strong>{props.order.actor_role}</strong>. Listing{' '}
                <Link href={`/listings/${props.order.listing_id}`}>{props.order.listing_id}</Link>
            </p>

            {notice ? (
                <p style={{ background: '#eef8ee', border: '1px solid #b7dfb7', padding: '0.75rem 1rem' }}>{notice}</p>
            ) : null}
            {formError ? (
                <p style={{ background: '#fdeeee', border: '1px solid #e2b6b6', padding: '0.75rem 1rem' }}>{formError}</p>
            ) : null}

            <section style={{ borderTop: '1px solid #ddd', paddingTop: '1rem', marginTop: '1rem' }}>
                <h2 style={{ fontSize: 16 }}>Proposal</h2>
                <ul>
                    <li>Status: {props.order.status}</li>
                    <li>Version: {props.order.version}</li>
                    <li>Amount: {money(amount, currency)}</li>
                    <li>Mechanism: {props.order.mechanism}</li>
                    <li>Origin: {props.order.origin}</li>
                </ul>
            </section>

            <section style={{ borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                <h2 style={{ fontSize: 16 }}>After finalize</h2>
                <ul>
                    <li>Terms: {props.terms ? `v${props.terms.snapshot_version} · ${money(props.terms.amount_minor, props.terms.currency)}` : 'not yet'}</li>
                    <li>Work: {props.work ? `${props.work.work_shape} · ${props.work.status}` : 'not yet'}</li>
                    <li>
                        Obligation:{' '}
                        {props.obligation
                            ? `${props.obligation.lane} · ${props.obligation.status} · ${money(props.obligation.amount_minor, props.obligation.currency)}`
                            : 'not yet'}
                    </li>
                </ul>
            </section>

            {props.order.can_finalize ? (
                <Form
                    action={`/orders/${props.order.id}/finalize`}
                    method="post"
                    style={{ marginTop: '1.25rem' }}
                    options={{ preserveScroll: true }}
                >
                    {({ processing }) => (
                        <>
                            <input type="hidden" name="expected_order_version" value={props.order.version} />
                            <button
                                type="submit"
                                disabled={processing}
                                style={{
                                    background: '#111',
                                    color: '#fff',
                                    border: 0,
                                    padding: '0.7rem 1.1rem',
                                    cursor: processing ? 'wait' : 'pointer',
                                }}
                            >
                                {processing ? 'Finalizing…' : 'Finalize agreement'}
                            </button>
                        </>
                    )}
                </Form>
            ) : (
                <p style={{ marginTop: '1.25rem', opacity: 0.8 }}>
                    {props.order.status === 'accepted'
                        ? 'Agreement is accepted. Work engine (T4) will progress this further.'
                        : 'This order cannot be finalized from your account right now.'}
                </p>
            )}

            <p style={{ marginTop: '2rem', fontSize: 12, opacity: 0.65 }}>
                Correlation: {props.correlationId ?? '—'}
            </p>
            <p>
                <Link href="/browse">← Back to browse</Link>
            </p>
        </main>
    );
}
