import { useState } from 'react';
import { router } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Coins, LoaderCircle } from 'lucide-react';
import GlovoWaveModal from './GlovoWaveModal';

export type PaymentObligation = {
    id: string;
    status: string;
    lane: 'external_cash' | 'p2p_transfer' | 'protected_digital';
    amount_minor: number;
    currency: string;
    eligible_lanes: Array<'external_cash' | 'p2p_transfer' | 'protected_digital'>;
    can_select_lane: boolean;
    can_report_cash: boolean;
    can_acknowledge_cash: boolean;
    can_submit_p2p_proof?: boolean;
    can_verify_p2p_proof?: boolean;
    can_flag_payment_mismatch?: boolean;
    p2p_proof_scan_status?: string | null;
    p2p_proof_url?: string | null;
    p2p_sent_amount_minor?: number | null;
    p2p_transfer_reference?: string | null;
};

function requestKey(action: string): string {
    const nonce = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return `payment-${action}-${nonce}`;
}

function amount(amountMinor: number, currency: string): string {
    return `${currency} ${(amountMinor / 100).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function parseAmountMinor(value: string): number | null {
    if (!/^\d+(?:\.\d{0,2})?$/.test(value)) {
        return null;
    }

    const [whole, fraction = ''] = value.split('.');
    const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));

    return Number.isSafeInteger(minor) ? minor : null;
}

function statusLabel(status: string): string {
    switch (status) {
        case 'not_due': return 'Not due';
        case 'due': return 'Due';
        case 'payer_reported_cash': return 'Awaiting recipient';
        case 'payer_submitted_p2p_proof': return 'Transfer evidence submitted';
        case 'proof_rejected': return 'Transfer proof needs replacement';
        case 'disputed_mismatch': return 'Under review';
        case 'settled': return 'Settled';
        case 'superseded': return 'Replaced';
        case 'cancelled': return 'Cancelled';
        default: return 'Payment status unavailable';
    }
}

export default function PaymentObligationSheet({
    orderId,
    obligation,
}: {
    orderId: string;
    obligation: PaymentObligation;
}) {
    const [open, setOpen] = useState(false);
    const [selectedLane, setSelectedLane] = useState(obligation.lane);
    const [processing, setProcessing] = useState(false);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [sentAmount, setSentAmount] = useState(((obligation.p2p_sent_amount_minor ?? obligation.amount_minor) / 100).toFixed(2));
    const [transferReference, setTransferReference] = useState(obligation.p2p_transfer_reference ?? '');
    const [receivedAmount, setReceivedAmount] = useState((obligation.amount_minor / 100).toFixed(2));
    const [rejectReason, setRejectReason] = useState('');
    const baseUrl = `/orders/${orderId}/payment-obligations/${obligation.id}`;
    const formattedAmount = amount(obligation.amount_minor, obligation.currency);
    const canSelectLane = obligation.can_select_lane && obligation.status === 'due';
    const receivedAmountMinor = parseAmountMinor(receivedAmount);
    const receivedMatchesPaymentFacts = receivedAmountMinor !== null
        && receivedAmountMinor === obligation.amount_minor
        && receivedAmountMinor === obligation.p2p_sent_amount_minor;

    const submit = (url: string, data: Record<string, string | number | File>) => {
        setProcessing(true);
        router.post(url, data, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#0F2F58] bg-white px-4 text-xs font-extrabold text-[#0F2F58] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]"
                aria-haspopup="dialog"
            >
                <Coins className="size-4" aria-hidden="true" />
                {obligation.status === 'payer_reported_cash' ? 'Cash report details' : 'Payment details'}
                <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
            <GlovoWaveModal
                isOpen={open}
                onClose={() => setOpen(false)}
                title="Payment obligation"
                subtitle={`Pay ${formattedAmount} directly to the recipient`}
                bottomSlot={null}
            >
                <div className="space-y-4 pb-5" data-testid="payment-obligation-sheet">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                        <div>
                            <h2 className="text-base font-extrabold text-[#0F2F58]">{formattedAmount}</h2>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                Cash or personal-wallet transfers happen between you and the recipient. Serbizyu does not hold this payment.
                            </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                            {statusLabel(obligation.status)}
                        </span>
                    </div>

                    {canSelectLane && obligation.eligible_lanes.length > 0 && (
                        <fieldset className="space-y-2">
                            <legend className="text-xs font-extrabold text-[#0F2F58]">Payment lane</legend>
                            {obligation.eligible_lanes.map((lane) => (
                                <label
                                    key={lane}
                                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 ${selectedLane === lane ? 'border-[#0F2F58] ring-1 ring-[#0F2F58]' : 'border-slate-200'}`}
                                >
                                    <input
                                        type="radio"
                                        name="payment-lane"
                                        value={lane}
                                        checked={selectedLane === lane}
                                        onChange={() => setSelectedLane(lane)}
                                        className="size-4 accent-[#0F2F58]"
                                    />
                                    <span className="text-xs font-bold text-slate-800">
                                        {lane === 'external_cash' ? 'External cash' : lane === 'p2p_transfer' ? 'Personal wallet transfer' : 'Protected digital · sandbox only'}
                                    </span>
                                </label>
                            ))}
                            {selectedLane !== obligation.lane && (
                                <button
                                    type="button"
                                    disabled={processing}
                                    onClick={() => submit(`${baseUrl}/lane`, {
                                        lane: selectedLane,
                                        idempotency_key: requestKey('lane'),
                                    })}
                                    className="mt-2 flex min-h-11 w-full items-center justify-center rounded-full bg-[#0F2F58] px-4 text-xs font-extrabold text-white hover:bg-[#153e74] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {processing ? <LoaderCircle className="size-4 animate-spin" aria-label="Saving lane" /> : 'Save payment lane'}
                                </button>
                            )}
                        </fieldset>
                    )}

                    {obligation.status === 'due' && selectedLane === 'external_cash' && obligation.can_report_cash && (
                        <div className="space-y-3 border-t border-slate-200 pt-4">
                            <p className="text-xs leading-relaxed text-slate-700">Report this only after you have handed the full amount directly to the recipient.</p>
                            <button
                                type="button"
                                disabled={processing || selectedLane !== obligation.lane}
                                onClick={() => submit(`${baseUrl}/cash/report`, { idempotency_key: requestKey('cash-report') })}
                                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0D715F] px-4 text-xs font-extrabold text-white hover:bg-[#0a574a] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {processing ? <LoaderCircle className="size-4 animate-spin" aria-label="Submitting report" /> : 'Report cash handed over'}
                            </button>
                        </div>
                    )}

                    {obligation.status === 'payer_reported_cash' && (
                        <div className="space-y-3 border-t border-slate-200 pt-4">
                            <div className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                                <p>Cash was reported by the payer. The obligation remains unsettled until the recipient confirms receipt.</p>
                            </div>
                            {obligation.can_acknowledge_cash && (
                                <button
                                    type="button"
                                    disabled={processing}
                                    onClick={() => submit(`${baseUrl}/cash/acknowledge`, { idempotency_key: requestKey('cash-ack') })}
                                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0F2F58] px-4 text-xs font-extrabold text-white hover:bg-[#153e74] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {processing ? <LoaderCircle className="size-4 animate-spin" aria-label="Confirming receipt" /> : 'Confirm cash received'}
                                </button>
                            )}
                            {obligation.can_flag_payment_mismatch && (
                                <>
                                    <label className="block space-y-1 text-xs font-bold text-slate-700">
                                        Amount received ({obligation.currency})
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={receivedAmount}
                                            onChange={(event) => setReceivedAmount(event.currentTarget.value)}
                                            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        disabled={processing || receivedAmountMinor === null || receivedAmountMinor === obligation.amount_minor}
                                        onClick={() => receivedAmountMinor !== null && submit(`${baseUrl}/mismatch`, { received_amount_minor: receivedAmountMinor })}
                                        className="flex min-h-11 w-full items-center justify-center rounded-full border border-amber-600 px-4 text-xs font-extrabold text-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Report cash amount mismatch
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {obligation.lane === 'p2p_transfer' && obligation.can_submit_p2p_proof && ['due', 'proof_rejected'].includes(obligation.status) && (
                        <div className="space-y-3 border-t border-slate-200 pt-4">
                            <p className="text-xs leading-relaxed text-slate-700">Upload an image of the transfer receipt. It stays private while the safety scan runs.</p>
                            <label className="block space-y-1 text-xs font-bold text-slate-700">
                                Transfer image
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(event) => setProofFile(event.currentTarget.files?.[0] ?? null)}
                                    className="block min-h-11 w-full rounded-xl border border-slate-300 p-2 text-xs"
                                />
                            </label>
                            <label className="block space-y-1 text-xs font-bold text-slate-700">
                                Transfer reference
                                <input
                                    type="text"
                                    value={transferReference}
                                    onChange={(event) => setTransferReference(event.currentTarget.value)}
                                    maxLength={255}
                                    readOnly={obligation.status === 'proof_rejected'}
                                    autoComplete="off"
                                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm read-only:bg-slate-50"
                                />
                            </label>
                            <label className="block space-y-1 text-xs font-bold text-slate-700">
                                Amount sent ({obligation.currency})
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={sentAmount}
                                    onChange={(event) => setSentAmount(event.currentTarget.value)}
                                    readOnly={obligation.status === 'proof_rejected'}
                                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm read-only:bg-slate-50"
                                />
                            </label>
                            <button
                                type="button"
                                disabled={processing || proofFile === null || transferReference.trim() === '' || parseAmountMinor(sentAmount) === null}
                                onClick={() => {
                                    const amountMinor = parseAmountMinor(sentAmount);
                                    if (proofFile && amountMinor !== null && transferReference.trim() !== '') {
                                        submit(`${baseUrl}/p2p/proof`, {
                                            proof: proofFile,
                                            sent_amount_minor: amountMinor,
                                            transfer_reference: transferReference.trim(),
                                        });
                                    }
                                }}
                                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0F2F58] px-4 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {processing ? <LoaderCircle className="size-4 animate-spin" aria-label="Scanning transfer proof" /> : obligation.status === 'proof_rejected' ? 'Upload replacement proof' : 'Upload and submit transfer proof'}
                            </button>
                        </div>
                    )}

                    {obligation.lane === 'p2p_transfer' && obligation.status === 'payer_submitted_p2p_proof' && (
                        <div className="space-y-3 border-t border-slate-200 pt-4">
                            <p className="text-xs leading-relaxed text-slate-700">
                                {obligation.p2p_proof_scan_status === 'clean' ? 'Transfer proof passed the safety scan.' : 'Transfer proof is being checked privately.'}
                            </p>
                            {obligation.p2p_sent_amount_minor !== null && obligation.p2p_sent_amount_minor !== undefined && obligation.p2p_transfer_reference && (
                                <p className="text-xs leading-relaxed text-slate-700">
                                    Payer reported {amount(obligation.p2p_sent_amount_minor, obligation.currency)} with reference {obligation.p2p_transfer_reference}.
                                </p>
                            )}
                            {obligation.p2p_proof_url && (
                                <a href={obligation.p2p_proof_url} className="inline-flex min-h-10 items-center font-bold text-[#0F2F58] underline" target="_blank" rel="noreferrer">
                                    View transfer proof
                                </a>
                            )}
                            {obligation.can_verify_p2p_proof && (
                                <>
                                    <label className="block space-y-1 text-xs font-bold text-slate-700">
                                        Amount received ({obligation.currency})
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={receivedAmount}
                                            onChange={(event) => setReceivedAmount(event.currentTarget.value)}
                                            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        disabled={processing || !receivedMatchesPaymentFacts}
                                        onClick={() => receivedAmountMinor !== null && submit(`${baseUrl}/p2p/verify`, { received_amount_minor: receivedAmountMinor })}
                                        className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#0D715F] px-4 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {processing ? <LoaderCircle className="size-4 animate-spin" aria-label="Verifying transfer" /> : 'Confirm full amount received'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={processing || receivedAmountMinor === null || receivedMatchesPaymentFacts}
                                        onClick={() => receivedAmountMinor !== null && submit(`${baseUrl}/mismatch`, { received_amount_minor: receivedAmountMinor })}
                                        className="flex min-h-11 w-full items-center justify-center rounded-full border border-amber-600 px-4 text-xs font-extrabold text-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Report amount mismatch
                                    </button>
                                    <label className="block space-y-1 text-xs font-bold text-slate-700">
                                        Why is the proof rejected?
                                        <input
                                            type="text"
                                            value={rejectReason}
                                            onChange={(event) => setRejectReason(event.currentTarget.value)}
                                            maxLength={500}
                                            className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        disabled={processing || rejectReason.trim().length < 5}
                                        onClick={() => submit(`${baseUrl}/p2p/reject`, { reason: rejectReason.trim() })}
                                        className="flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 px-4 text-xs font-extrabold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Reject proof and request replacement
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    {obligation.status === 'settled' && (
                        <p className="flex items-center gap-2 border-t border-slate-200 pt-4 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="size-4" aria-hidden="true" /> Both parties recorded receipt. Payment was settled outside Serbizyu.
                        </p>
                    )}
                    {obligation.status === 'due' && selectedLane !== 'external_cash' && (
                        <p className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-600">
                            This lane is selected for the obligation. Cash reporting applies only to External Cash.
                        </p>
                    )}
                    {obligation.status === 'not_due' && (
                        <p className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-600">
                            Payment options will be available when this obligation becomes due.
                        </p>
                    )}
                    {['payer_submitted_p2p_proof', 'proof_rejected', 'disputed_mismatch'].includes(obligation.status) && (
                        <p className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-600">
                            The payment lane stays locked after proof submission. A rejected proof can be replaced without changing the agreed amount.
                        </p>
                    )}
                    {obligation.status === 'disputed_mismatch' && (
                        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
                            This payment obligation is under review. Only this payment is on hold; Order and Work continue independently.
                        </p>
                    )}
                    {obligation.status === 'cancelled' && (
                        <p className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-600">
                            This obligation was cancelled. No payment action is available.
                        </p>
                    )}
                </div>
            </GlovoWaveModal>
        </>
    );
}
