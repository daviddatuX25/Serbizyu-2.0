import { useState } from 'react';
import { CheckCircle2, Download, FileImage, FileText, LoaderCircle, RefreshCw, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { router } from '@inertiajs/react';
import type { WorkNodeRecord } from '../../types';
import WorkNodeEvidenceTools, { type WorkProofPayload } from './WorkNodeEvidenceTools';

type DeliveryFile = {
    id: string;
    name: string;
    mediaType: string;
    sizeBytes: number;
    scanStatus: 'quarantined' | 'clean' | 'infected' | 'failed';
    downloadUrl: string | null;
};
type A9DeliveryNodeProof = WorkProofPayload & { photoUrls?: string[] };


type DeliveryVersion = {
    id: string;
    version: number;
    status: 'draft' | 'submitted' | 'accepted' | 'superseded';
    submittedAt: string | null;
    nodeProofs: Record<string, A9DeliveryNodeProof>;
    files: DeliveryFile[];
};

export type A9DeliveryProjection = {
    enabled: boolean;
    viewer: 'provider' | 'customer';
    workStatus: string;
    revisionsAllowed: number;
    revisionsUsed: number;
    nodes: WorkNodeRecord[];
    currentDelivery: DeliveryVersion | null;
    deliveries: DeliveryVersion[];
};

type Props = {
    orderId: string;
    delivery: A9DeliveryProjection | null;
};

const MAX_FILES = 12;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];

export default function A9DeliveryPanel({ orderId, delivery }: Props) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [revisionMessage, setRevisionMessage] = useState('');
    const [draftProofs, setDraftProofs] = useState<{ deliveryId: string; nodeProofs: Record<string, WorkProofPayload> } | null>(null);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    if (!delivery?.enabled) return null;

    const current = delivery.currentDelivery;
    const draft = delivery.deliveries.find((item) => item.status === 'draft') ?? null;
    const activeProofs = draft && draftProofs?.deliveryId === draft.id ? draftProofs.nodeProofs : {};
    const requiredProofNodes = delivery.nodes.filter((node) => (node.required_proofs ?? []).length > 0);
    const canUpload = delivery.viewer === 'provider' && ['not_started', 'in_progress'].includes(delivery.workStatus);
    const canReview = delivery.viewer === 'customer' && current?.status === 'submitted';
    const revisionsRemaining = Math.max(0, delivery.revisionsAllowed - delivery.revisionsUsed);

    const refresh = () => router.reload();

    const send = async (path: string, body?: FormData | Record<string, unknown>) => {
        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
        if (!csrfToken) throw new Error('Refresh this page to restore the secure session.');
        const response = await fetch(path, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
                ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            },
            body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        });
        const result = await response.json() as { data?: unknown; message?: string; error?: { message?: string }; errors?: Record<string, string[]> };
        if (!response.ok) {
            throw new Error(result.error?.message ?? Object.values(result.errors ?? {}).flat()[0] ?? result.message ?? 'The delivery could not be saved. Try again.');
        }
        return result.data;
    };

    const upload = async () => {
        setError(null);
        setNotice(null);
        if (selectedFiles.length === 0 || selectedFiles.length > MAX_FILES) {
            setError('Choose between 1 and 12 files.');
            return;
        }
        const invalid = selectedFiles.find((file) => !ACCEPTED_TYPES.includes(file.type) || file.size < 1 || file.size > MAX_FILE_BYTES);
        if (invalid) {
            setError('Use JPEG, PNG, WebP, PDF, or plain text files up to 25 MB each.');
            return;
        }

        setBusy(true);
        try {
            const targetDraft = draft ?? await send(`/orders/${encodeURIComponent(orderId)}/deliveries`) as { id: string };
            const form = new FormData();
            selectedFiles.forEach((file) => form.append('files[]', file));
            await send(`/orders/${encodeURIComponent(orderId)}/deliveries/${encodeURIComponent(targetDraft.id)}/files`, form);
            setSelectedFiles([]);
            setNotice('Files are private while their safety scans run. Refresh to check when they are ready.');
            refresh();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'The files could not be uploaded.');
        } finally {
            setBusy(false);
        }
    };

    const submit = async (draftId: string) => {
        if (requiredProofNodes.some((node) => !activeProofs[node.id])) {
            setError('Save the required proof for each authored Work node before submitting this version.');
            return;
        }
        setBusy(true);
        setError(null);
        setNotice(null);
        try {
            await send(`/orders/${encodeURIComponent(orderId)}/deliveries/${encodeURIComponent(draftId)}/submit`, {
                node_proofs: activeProofs,
            });
            setDraftProofs(null);
            setNotice('Delivery submitted for customer review.');
            refresh();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'The delivery could not be submitted.');
        } finally {
            setBusy(false);
        }
    };

    const accept = async () => {
        if (!current) return;
        setBusy(true);
        setError(null);
        try {
            await send(`/orders/${encodeURIComponent(orderId)}/deliveries/${encodeURIComponent(current.id)}/accept`);
            setNotice(`Version ${current.version} accepted. Work is complete; payment remains a separate status.`);
            refresh();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'The delivery could not be accepted.');
        } finally {
            setBusy(false);
        }
    };

    const requestRevision = async () => {
        if (!current || !revisionMessage.trim()) return;
        setBusy(true);
        setError(null);
        try {
            await send(`/orders/${encodeURIComponent(orderId)}/revision-requests`, {
                delivery_id: current.id,
                message: revisionMessage.trim(),
            });
            setDraftProofs(null);
            setRevisionMessage('');
            setNotice('Revision requested. The provider can now prepare the next version.');
            refresh();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'The revision request could not be saved.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="space-y-4 rounded-2xl border border-[#D8E1EB] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="a9-delivery-title" data-testid="a9-delivery-panel">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF3F8] text-[#0F2F58]"><FileText className="size-5" aria-hidden="true" /></span>
                    <div className="min-w-0">
                        <h2 id="a9-delivery-title" className="text-base font-extrabold text-[#102B4E]">Digital delivery</h2>
                        <p className="mt-0.5 text-sm leading-5 text-slate-600">Private files · versioned review</p>
                    </div>
                </div>
                <button type="button" onClick={refresh} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[#D8E1EB] px-3 text-xs font-bold text-[#0F2F58] hover:bg-[#F5F8FB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]" aria-label="Refresh delivery scan status">
                    <RefreshCw className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-[#F4F7FA] px-3 py-2.5 text-sm text-[#183A60]">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>Files stay private until they pass the safety scan. Work completion does not confirm payment.</p>
            </div>

            {error && <p role="alert" className="rounded-xl border border-[#B42318] px-3 py-2 text-sm font-medium text-[#8F1D14]">{error}</p>}
            {notice && <p role="status" className="rounded-xl border border-[#B7D8C5] bg-[#F2FAF5] px-3 py-2 text-sm font-semibold text-[#1D5A37]">{notice}</p>}

            {canUpload && (
                <div className="space-y-3 rounded-xl border border-[#D8E1EB] p-3 sm:p-4">
                    <div>
                        <h3 className="text-sm font-bold text-[#102B4E]">{draft ? `Add files to version ${draft.version}` : 'Prepare a delivery'}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-600">JPEG, PNG, WebP, PDF, or plain text · up to 12 files · 25 MB each</p>
                    </div>
                    {draft && requiredProofNodes.map((node) => (
                        <div key={`${draft.id}-${node.id}`} className="space-y-2 border-t border-[#E4EAF0] pt-3">
                            <h4 className="text-sm font-bold text-[#183A60]">{node.title}</h4>
                            {activeProofs[node.id] && <p className="text-xs font-semibold text-[#1D6A40]" role="status">Proof is ready to include in version {draft.version}.</p>}
                            <WorkNodeEvidenceTools
                                orderId={orderId}
                                node={node}
                                action="complete_step"
                                processing={busy}
                                onSubmit={(payload) => {
                                    setDraftProofs((previous) => ({
                                        deliveryId: draft.id,
                                        nodeProofs: {
                                            ...(previous?.deliveryId === draft.id ? previous.nodeProofs : {}),
                                            [node.id]: payload,
                                        },
                                    }));
                                    setError(null);
                                }}
                                onPreviewPhoto={setPreviewPhoto}
                                submitLabel="Attach proof to this delivery"
                            />
                        </div>
                    ))}
                    <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#9BAFC4] px-3 py-3 text-sm font-semibold text-[#0F2F58] hover:bg-[#F7F9FC] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#0F2F58]">
                        <UploadCloud className="size-4" aria-hidden="true" />
                        <span>{selectedFiles.length ? `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} selected` : 'Choose deliverable files'}</span>
                        <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,.jpg,.jpeg,.png,.webp,.pdf,.txt" className="sr-only" onChange={(event) => setSelectedFiles(Array.from(event.currentTarget.files ?? []))} aria-label="Choose deliverable files" />
                    </label>
                    {selectedFiles.length > 0 && <ul className="divide-y divide-[#E4EAF0] text-sm text-slate-700">{selectedFiles.map((file, index) => <li key={`${file.name}-${index}`} className="flex justify-between gap-3 py-2"><span className="min-w-0 truncate">{file.name}</span><span className="shrink-0 text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</span></li>)}</ul>}
                    <button type="button" disabled={busy || selectedFiles.length === 0} onClick={upload} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0F2F58] px-4 text-sm font-bold text-white hover:bg-[#173D6C] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]">
                        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="size-4" aria-hidden="true" />}{draft ? 'Upload files privately' : 'Create version and upload'}
                    </button>
                    {draft && draft.files.length > 0 && <div className="space-y-2 border-t border-[#E4EAF0] pt-3">
                        <p className="text-xs font-semibold text-slate-600">Version {draft.version} scan status</p>
                        {draft.files.map((file) => <p key={file.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate">{file.name}</span><span className={`shrink-0 text-xs font-semibold ${file.scanStatus === 'clean' ? 'text-[#1D6A40]' : file.scanStatus === 'infected' || file.scanStatus === 'failed' ? 'text-[#9B241C]' : 'text-[#805400]'}`}>{file.scanStatus === 'clean' ? 'Clean' : file.scanStatus === 'quarantined' ? 'Scanning' : file.scanStatus === 'infected' ? 'Blocked' : 'Unavailable'}</span></p>)}
                        <button type="button" disabled={busy || draft.files.some((file) => file.scanStatus !== 'clean')} onClick={() => submit(draft.id)} className="h-11 w-full rounded-xl bg-[#F5AE23] px-4 text-sm font-extrabold text-[#2E260F] hover:bg-[#F9BE4E] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]">Submit version {draft.version} for review</button>
                    </div>}
                </div>
            )}

            {current && (
                <div className="space-y-3 rounded-xl border border-[#D8E1EB] p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-[#102B4E]">Version {current.version}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${current.status === 'accepted' ? 'bg-[#EAF6EE] text-[#1D6A40]' : 'bg-[#EAF1F8] text-[#24496F]'}`}>{current.status === 'accepted' ? 'Accepted' : 'Submitted · not accepted'}</span>
                    </div>
                    {current.files.map((file) => (
                        <div key={file.id} className="flex min-h-12 items-center justify-between gap-3 border-t border-[#E4EAF0] pt-2.5">
                            <div className="flex min-w-0 items-center gap-2.5">
                                {file.mediaType.startsWith('image/') ? <FileImage className="size-5 shrink-0 text-[#385B7E]" aria-hidden="true" /> : <FileText className="size-5 shrink-0 text-[#385B7E]" aria-hidden="true" />}
                                <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#183A60]">{file.name}</p><p className="text-xs text-slate-500">{file.mediaType} · {(file.sizeBytes / 1024 / 1024).toFixed(1)} MB</p></div>
                            </div>
                            {file.downloadUrl && <a href={file.downloadUrl} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#0F2F58] hover:bg-[#F4F7FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]"><Download className="size-4" aria-hidden="true" />Download</a>}
                        </div>
                    ))}
                    {Object.keys(current.nodeProofs).length > 0 && <div className="space-y-2 border-t border-[#E4EAF0] pt-3">
                        <h4 className="text-sm font-bold text-[#102B4E]">Authored Work proof</h4>
                        {delivery.nodes.filter((node) => current.nodeProofs[node.id]).map((node) => {
                            const proof = current.nodeProofs[node.id];
                            const checklistResponses = proof.checklist_responses ?? [];
                            const metricReadings = proof.metric_readings ?? [];
                            return (
                                <div key={node.id} className="rounded-lg bg-[#F7F9FC] p-3">
                                    <p className="text-sm font-semibold text-[#183A60]">{node.title}</p>
                                    {checklistResponses.length > 0 && <ul className="mt-2 space-y-1 text-xs text-slate-700">
                                        {checklistResponses.map((response) => {
                                            const item = node.checklist_items?.find((candidate) => candidate.id === response.id);
                                            return <li key={response.id}>{item?.label ?? response.id}: {response.completed ? 'Complete' : 'Not complete'}</li>;
                                        })}
                                    </ul>}
                                    {metricReadings.length > 0 && <ul className="mt-2 space-y-1 text-xs text-slate-700">
                                        {metricReadings.map((reading) => {
                                            const requirement = node.metric_requirements?.find((candidate) => candidate.id === reading.id);
                                            return <li key={reading.id}>{requirement?.name ?? reading.id}: {reading.value} {reading.unit}</li>;
                                        })}
                                    </ul>}
                                    {proof.photoUrls && proof.photoUrls.length > 0 && <ul className="mt-2 space-y-1 text-xs">
                                        {proof.photoUrls.map((url, index) => <li key={url}><a href={url} className="font-semibold text-[#0F2F58] underline">Download photo proof {index + 1}</a></li>)}
                                    </ul>}
                                </div>
                            );
                        })}
                    </div>}
                    {canReview && <div className="space-y-3 border-t border-[#E4EAF0] pt-3">
                        <label htmlFor="a9-revision-message" className="block text-sm font-bold text-[#102B4E]">Request a change <span className="font-medium text-slate-500">({revisionsRemaining} remaining)</span></label>
                        <textarea id="a9-revision-message" value={revisionMessage} onChange={(event) => setRevisionMessage(event.currentTarget.value)} maxLength={2000} rows={3} disabled={busy || revisionsRemaining === 0} placeholder={revisionsRemaining === 0 ? 'No revisions remain.' : 'Tell the provider what needs to change'} className="w-full resize-y rounded-xl border border-[#B7C5D4] px-3 py-2.5 text-sm text-[#183A60] placeholder:text-slate-500 focus:border-[#0F2F58] focus:outline-none focus:ring-2 focus:ring-[#0F2F58]/20 disabled:bg-[#F4F7FA]" />
                        <div className="grid gap-2 sm:grid-cols-2">
                            <button type="button" disabled={busy || revisionsRemaining === 0 || revisionMessage.trim().length === 0} onClick={requestRevision} className="h-11 rounded-xl border border-[#B7C5D4] px-4 text-sm font-bold text-[#183A60] hover:bg-[#F5F8FB] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]">Request revision</button>
                            <button type="button" disabled={busy} onClick={accept} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0F2F58] px-4 text-sm font-extrabold text-white hover:bg-[#173D6C] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]"><CheckCircle2 className="size-4" aria-hidden="true" />Accept version {current.version}</button>
                        </div>
                    </div>}
                </div>
            )}
            {previewPhoto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-label="A9 Work evidence photo" onClick={() => setPreviewPhoto(null)}>
                    <button type="button" onClick={() => setPreviewPhoto(null)} className="absolute right-4 top-4 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-slate-900" aria-label="Close photo preview"><X className="size-5" /></button>
                    <img src={previewPhoto} alt="A9 Work evidence" className="max-h-[90vh] max-w-full rounded-xl object-contain" />
                </div>
            )}

            {delivery.deliveries.filter((item) => item.id !== current?.id && item.status !== 'draft').map((version) => (
                <details key={version.id} className="rounded-xl border border-[#D8E1EB] px-3 py-2.5">
                    <summary className="cursor-pointer list-none text-sm font-bold text-[#183A60]">Version {version.version} · {version.status}</summary>
                    <div className="mt-2 space-y-2">{version.files.map((file) => <div key={file.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate text-slate-700">{file.name}</span>{file.downloadUrl && <a href={file.downloadUrl} className="inline-flex h-9 shrink-0 items-center gap-1 text-xs font-bold text-[#0F2F58]"><Download className="size-4" aria-hidden="true" />Download</a>}</div>)}</div>
                </details>
            ))}

            {delivery.viewer === 'customer' && !current && delivery.deliveries.length === 0 && <p className="rounded-xl border border-dashed border-[#B7C5D4] px-3 py-5 text-center text-sm text-slate-600">The provider has not submitted a delivery yet.</p>}
        </section>
    );
}
