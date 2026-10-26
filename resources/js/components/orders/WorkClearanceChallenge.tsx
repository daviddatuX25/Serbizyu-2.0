import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import type { WorkNodeRecord } from '../../types';
import type { WorkProofPayload } from '../mobile/WorkNodeEvidenceTools';
type Challenge = { challenge_id: string; code: string; kind: 'presence_otp' | 'worker_dropoff'; expires_at: string; work_version: number; node_id: string };
type A4VerificationContext = { node_id: string; evidence_file_id: string; expected_transfer_version: number; checklist_responses?: WorkProofPayload['checklist_responses']; metric_readings?: WorkProofPayload['metric_readings']; location?: WorkProofPayload['location']; notes?: string };
type Props = {
    orderId: string;
    workVersion: number;
    node: WorkNodeRecord;
    verifyContext?: A4VerificationContext | null;
    requiresVerifyContext?: boolean;
    onVerified?: () => void;
};

async function postJson<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
    if (!csrf) throw new Error('Refresh this page to restore the secure session.');
    const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'X-Requested-With': 'XMLHttpRequest' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json() as { data?: T; message?: string; error?: { message?: string }; errors?: Record<string, string[]> };
    if (!response.ok) throw new Error(result.error?.message ?? Object.values(result.errors ?? {}).flat()[0] ?? result.message ?? 'The clearance code request failed. Try again.');
    if (!result.data) throw new Error('The server did not return a clearance challenge.');
    return result.data;
}

export default function WorkClearanceChallenge({ orderId, workVersion, node, verifyContext, requiresVerifyContext = false, onVerified }: Props) {
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (!challenge) return;
        const expiresIn = Date.parse(challenge.expires_at) - Date.now();
        const timer = window.setTimeout(() => {
            setChallenge(null);
            setError('This clearance code has expired. Issue a new code if needed.');
        }, Math.max(0, expiresIn));
        return () => window.clearTimeout(timer);
    }, [challenge]);
    const issue = async () => {
        setBusy(true); setError(null);
        try {
            const issued = await postJson<Challenge>(`/orders/${encodeURIComponent(orderId)}/work-nodes/${encodeURIComponent(node.id)}/clearance-challenges`);
            if (issued.node_id !== node.id || issued.work_version !== workVersion) throw new Error('The work step changed. Refresh before using this code.');
            setChallenge(issued);
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not issue a clearance code.'); }
        finally { setBusy(false); }
    };
    const verify = async () => {
        const pending = node.pending_challenge;
        if (!pending || (requiresVerifyContext && !verifyContext)) return;
        setBusy(true); setError(null);
        try {
            const path = verifyContext
                ? `/orders/${encodeURIComponent(orderId)}/handoff/receipt`
                : `/orders/${encodeURIComponent(orderId)}/work-nodes/${encodeURIComponent(node.id)}/clearance-challenges/${encodeURIComponent(pending.id)}/verify`;
            const body = verifyContext
                ? {
                    challenge_id: pending.id,
                    code,
                    work_version: workVersion,
                    node_id: verifyContext.node_id,
                    evidence_file_id: verifyContext.evidence_file_id,
                    idempotency_key: crypto.randomUUID(),
                    expected_transfer_version: verifyContext.expected_transfer_version,
                    ...(verifyContext.checklist_responses ? { checklist_responses: verifyContext.checklist_responses } : {}),
                    ...(verifyContext.metric_readings ? { metric_readings: verifyContext.metric_readings } : {}),
                    ...(verifyContext.location ? { location: verifyContext.location } : {}),
                    ...(verifyContext.notes ? { notes: verifyContext.notes } : {}),
                }
                : { code, work_version: workVersion };
            await postJson(path, body);
            setCode('');
            onVerified?.();
            router.reload();
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'The code could not be verified.'); }
        finally { setBusy(false); }
    };
    const codeKind = node.pending_challenge?.kind ?? challenge?.kind;
    const codeLength = codeKind === 'presence_otp' ? 4 : 6;
    const expires = challenge ? new Date(challenge.expires_at).toLocaleTimeString() : null;
    return <section className="w-full space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3" aria-label="Clearance code">
        {node.can_issue_challenge ? <>
            <p className="text-xs font-semibold text-indigo-950">Issue a one-time {node.approval_method === 'presence_otp' ? '4-digit in-person' : '6-digit handoff'} code. It is visible only here{expires ? ` and expires at ${expires}` : ''}.</p>
            {challenge ? <p className="rounded-lg bg-white p-3 text-center font-mono text-2xl font-bold tracking-[0.35em]" aria-live="polite">{challenge.code}</p> : null}
            <button type="button" disabled={busy} onClick={issue} className="min-h-11 w-full rounded-full bg-indigo-800 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Requesting…' : challenge ? 'Issue a new code' : 'Issue clearance code'}</button>
        </> : null}
        {node.can_verify_challenge && node.pending_challenge ? <form onSubmit={(event) => { event.preventDefault(); void verify(); }} className="space-y-2">
            <label className="block space-y-1 text-xs font-bold text-indigo-950">
                Enter the code provided by the other party
                <input
                    value={code}
                    onChange={(event) => setCode(event.currentTarget.value.replace(/\D/g, '').slice(0, codeLength))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={codeLength}
                    className="min-h-11 w-full rounded-lg border border-indigo-300 bg-white px-3 text-base tracking-widest"
                />
            </label>
            <button type="submit" disabled={busy || code.length !== codeLength || (requiresVerifyContext && !verifyContext)} className="min-h-11 w-full rounded-full bg-indigo-800 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Verifying…' : 'Verify code'}</button>
        </form> : null}
        {node.can_verify_challenge && !node.pending_challenge ? <div className="space-y-2 text-xs text-indigo-900" role="status">
            <p>Waiting for the other party to issue a clearance code. No code is available to verify yet.</p>
            <button type="button" onClick={() => router.reload()} className="min-h-10 rounded-full border border-indigo-300 px-3 font-semibold">Refresh challenge status</button>
        </div> : null}
        {error ? <p role="alert" className="text-sm font-semibold text-rose-800">{error}</p> : null}
    </section>;
}
