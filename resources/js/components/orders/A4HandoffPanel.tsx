import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { CheckCircle2, PackageCheck, Truck, X } from 'lucide-react';
import WorkClearanceChallenge from './WorkClearanceChallenge';
import type { WorkNodeRecord } from '../../types';
import WorkNodeEvidenceTools, { type WorkProofPayload } from '../mobile/WorkNodeEvidenceTools';

type HandoffTransfer = {
    id: string;
    status: 'prepared' | 'offered' | 'departed' | 'received';
    mode: 'counter_pickup' | 'courier_delivery' | null;
    offered_to_user_id: string | null;
    version: number;
    prepared_at: string;
    offered_at: string | null;
    departed_at: string | null;
    received_at: string | null;
};

type CourierCandidate = { id: string; label: string; public_reference: string | null };

export type A4HandoffProjection = {
    enabled: boolean;
    listingType: 'product' | 'service' | null;
    status: string;
    transfer: HandoffTransfer | null;
    canMarkPrepared: boolean;
    canOfferCustody: boolean;
    canAcceptCustody: boolean;
    canRecordReceipt: boolean;
    couriers: CourierCandidate[];
    workVersion: number | null;
    proofNode: WorkNodeRecord | null;
};

type Props = {
    orderId: string;
    orderVersion: number;
    handoff: A4HandoffProjection;
};

export default function A4HandoffPanel({ orderId, orderVersion, handoff }: Props) {
    const [mode, setMode] = useState<'counter_pickup' | 'courier_delivery'>('counter_pickup');
    const [courierId, setCourierId] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [receiptProof, setReceiptProof] = useState<WorkProofPayload | null>(null);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    const transfer = handoff.transfer;
    const preparedNode = handoff.proofNode?.ordinal === 1 ? handoff.proofNode : null;
    const custodyNode = handoff.proofNode?.ordinal === 2 ? handoff.proofNode : null;
    const receiptNode = handoff.proofNode?.ordinal === 3 ? handoff.proofNode : null;
    const challengeRequired = receiptNode?.approval_method === 'worker_dropoff' || receiptNode?.handoff_party === 'worker_dropoff';
    useEffect(() => {
        setReceiptProof(null);
    }, [receiptNode?.id, handoff.workVersion, transfer?.version]);
    const withCleanEvidence = (node: WorkNodeRecord): WorkNodeRecord => ({
        ...node,
        required_proofs: [...new Set([...(node.required_proofs ?? []), 'photo_proof'])],
        candidate_evidence: node.candidate_evidence ?? [],
    });
    const sendEvidenceAction = (path: string, node: WorkNodeRecord, payload: WorkProofPayload, version: Record<string, string | number>) => {
        const evidenceFileId = payload.evidence_file_ids?.[0];
        if (!evidenceFileId) {
            setError('Select or submit a clean scanned Work photo before continuing.');
            return;
        }
        if (handoff.workVersion === null) {
            setError('The A4 Work version is not available. Refresh before submitting proof.');
            return;
        }
        const data: Record<string, unknown> = {
            ...version,
            node_id: node.id,
            work_version: handoff.workVersion,
            idempotency_key: crypto.randomUUID(),
            evidence_file_id: evidenceFileId,
            ...(payload.checklist_responses ? { checklist_responses: payload.checklist_responses } : {}),
            ...(payload.metric_readings ? { metric_readings: payload.metric_readings } : {}),
            ...(payload.location ? { location: payload.location } : {}),
            ...(payload.notes ? { notes: payload.notes } : {}),
        };
        setError(null);
        setProcessing(true);
        router.post(path, data as Parameters<typeof router.post>[1], {
            preserveScroll: true,
            onError: (errors) => setError(Object.values(errors).flat().join(' ') || 'The handoff proof could not be saved.'),
            onFinish: () => setProcessing(false),
        });
    };

    if (!handoff.enabled || handoff.listingType === null) return null;

    return (
        <section aria-labelledby="a4-handoff-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[#0F2F58]">
                    <PackageCheck className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 id="a4-handoff-heading" className="text-sm font-extrabold text-[#0F2F58]">{handoff.listingType === 'product' ? 'Product handoff' : 'Courier handoff'}</h2>
                    <p className="mt-1 text-xs text-slate-600">Prepared · custody · recipient receipt</p>
                </div>
                <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold capitalize text-slate-700">{handoff.status.replaceAll('_', ' ')}</span>
            </div>

            <ol className="my-4 grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-600">
                {[
                    ['Prepared', transfer !== null],
                    ['Custody departed', transfer?.status === 'departed' || transfer?.status === 'received'],
                    ['Received', transfer?.status === 'received'],
                ].map(([label, complete]) => (
                    <li key={String(label)} className={`rounded-xl border px-2 py-2 ${complete ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white'}`}>
                        {complete ? <CheckCircle2 className="mx-auto mb-1 size-4" aria-hidden="true" /> : null}{label}
                    </li>
                ))}
            </ol>

            {error ? <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{error}</p> : null}
            {handoff.proofNode && (handoff.proofNode.candidate_evidence?.length ?? 0) === 0 ? <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">A clean scanned Work photo is required for this A4 phase. Upload one in the proof form.</p> : null}

            <div className="flex flex-wrap gap-2">
                {handoff.canMarkPrepared && handoff.workVersion !== null && preparedNode && (
                    <WorkNodeEvidenceTools
                        orderId={orderId}
                        node={withCleanEvidence(preparedNode)}
                        action="complete_step"
                        processing={processing}
                        onSubmit={(payload) => sendEvidenceAction(`/orders/${orderId}/handoff/prepared`, preparedNode, payload, { expected_order_version: orderVersion })}
                        onPreviewPhoto={setPreviewPhoto}
                        submitLabel="Mark prepared"
                    />
                )}
                {handoff.canMarkPrepared && !preparedNode ? <p role="alert" className="text-xs font-semibold text-rose-800">A4 preparation is unavailable because its authored Work node is missing.</p> : null}
                {handoff.canOfferCustody && transfer && (
                    <div className="flex w-full flex-wrap items-end gap-2">
                        <label className="min-w-40 flex-1 text-xs font-bold text-slate-700">Handoff method
                            <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} className="mt-1 block min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs">
                                <option value="counter_pickup">{handoff.listingType === 'product' ? 'Counter pickup' : 'Direct recipient handoff'}</option>
                                {handoff.listingType === 'product' && handoff.couriers.length > 0 && <option value="courier_delivery">Courier delivery</option>}
                            </select>
                        </label>
                        {mode === 'courier_delivery' && (
                            <label className="min-w-40 flex-1 text-xs font-bold text-slate-700">Assigned courier
                                <select value={courierId} onChange={(event) => setCourierId(event.target.value)} className="mt-1 block min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium">
                                    <option value="">Choose an active courier</option>
                                    {handoff.couriers.map((courier) => <option key={courier.id} value={courier.id}>{courier.label}{courier.public_reference ? ` · ${courier.public_reference}` : ''}</option>)}
                                </select>
                            </label>
                        )}
                        <button disabled={processing || (mode === 'courier_delivery' && !handoff.couriers.some((courier) => courier.id === courierId))} onClick={() => {
                            setError(null);
                            setProcessing(true);
                            router.post(`/orders/${orderId}/handoff/custody`, { transfer_mode: mode, ...(mode === 'courier_delivery' ? { courier_user_id: courierId } : {}), expected_transfer_version: transfer.version, idempotency_key: crypto.randomUUID() }, {
                                preserveScroll: true,
                                onError: (errors) => setError(Object.values(errors).flat().join(' ') || 'Custody could not be offered.'),
                                onFinish: () => setProcessing(false),
                            });
                        }} className="min-h-10 rounded-full bg-[#0F2F58] px-4 text-xs font-extrabold text-white disabled:opacity-50"><Truck className="mr-1 inline size-4" aria-hidden="true" />{handoff.listingType === 'product' ? 'Offer custody' : 'Offer recipient handoff'}</button>
                    </div>
                )}
                {handoff.canAcceptCustody && handoff.workVersion !== null && transfer && custodyNode && (
                    <WorkNodeEvidenceTools
                        orderId={orderId}
                        node={withCleanEvidence(custodyNode)}
                        action="mark_ready_for_handoff"
                        processing={processing}
                        onSubmit={(payload) => sendEvidenceAction(`/orders/${orderId}/handoff/custody/${transfer.id}/accept`, custodyNode, payload, { expected_transfer_version: transfer.version })}
                        onPreviewPhoto={setPreviewPhoto}
                        submitLabel={handoff.listingType === 'product' ? 'Accept custody & record departure' : 'Confirm recipient handoff'}
                    />
                )}
                {handoff.canAcceptCustody && !custodyNode ? <p role="alert" className="text-xs font-semibold text-rose-800">Custody acceptance is unavailable because its authored Work node is missing.</p> : null}
                {handoff.canRecordReceipt && handoff.workVersion !== null && transfer && receiptNode && !challengeRequired && (
                    <WorkNodeEvidenceTools
                        orderId={orderId}
                        node={withCleanEvidence(receiptNode)}
                        action="propose_completion"
                        processing={processing}
                        onSubmit={(payload) => sendEvidenceAction(`/orders/${orderId}/handoff/receipt`, receiptNode, payload, { expected_transfer_version: transfer.version })}
                        onPreviewPhoto={setPreviewPhoto}
                        submitLabel="Confirm final receipt"
                    />
                )}
                {handoff.canRecordReceipt && !receiptNode ? <p role="alert" className="text-xs font-semibold text-rose-800">Final receipt is unavailable because its authored Work node is missing.</p> : null}
                {handoff.workVersion !== null && challengeRequired && receiptNode?.can_verify_challenge && (
                    <WorkNodeEvidenceTools
                        orderId={orderId}
                        node={withCleanEvidence(receiptNode)}
                        action="propose_completion"
                        processing={processing}
                        onSubmit={setReceiptProof}
                        onPreviewPhoto={setPreviewPhoto}
                        submitLabel="Review proof & enter receipt code"
                    />
                )}
                {handoff.workVersion !== null && challengeRequired && receiptNode && (receiptNode.can_issue_challenge || receiptNode.can_verify_challenge) && transfer && (
                    <WorkClearanceChallenge
                        orderId={orderId}
                        workVersion={handoff.workVersion}
                        node={receiptNode}
                        requiresVerifyContext={receiptNode.can_verify_challenge}
                        verifyContext={receiptProof?.evidence_file_ids?.[0] ? {
                            node_id: receiptNode.id,
                            evidence_file_id: receiptProof.evidence_file_ids[0],
                            expected_transfer_version: transfer.version,
                            checklist_responses: receiptProof.checklist_responses,
                            metric_readings: receiptProof.metric_readings,
                            location: receiptProof.location,
                            notes: receiptProof.notes,
                        } : null}
                        onVerified={() => setReceiptProof(null)}
                    />
                )}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">{handoff.listingType === 'product' ? 'Stock leaves inventory at verified custody departure. Receipt does not deduct stock again; payment confirmation stays separate.' : 'Courier service completion requires the recipient’s separate receipt. Payment confirmation stays separate.'}</p>
            {previewPhoto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-label="A4 Work evidence photo">
                    <button type="button" onClick={() => setPreviewPhoto(null)} className="absolute right-4 top-4 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-slate-900" aria-label="Close photo preview"><X className="size-5" /></button>
                    <img src={previewPhoto} alt="Submitted A4 Work evidence" className="max-h-[90vh] max-w-full rounded-xl object-contain" />
                </div>
            )}
        </section>
    );
}
