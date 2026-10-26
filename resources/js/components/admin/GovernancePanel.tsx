import * as React from 'react';
import { router } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
    GovernanceApproval,
    GovernanceCommandPayload,
    GovernanceTarget,
    GovernanceWorkspace,
    LuponPacket,
} from '@/types/admin-workspace';

const reasonClasses = ['dispute', 'fraud', 'safety', 'legal', 'provider', 'operational'] as const;
const returnKinds = ['signed_kasunduan', 'katibayan'] as const;

type JsonResult = {
    data?: unknown;
    message?: string;
    errors?: Record<string, string[] | string>;
};

function failureMessage(result: JsonResult | null, fallback: string): string {
    const fieldMessage = Object.values(result?.errors ?? {}).flatMap((value) => Array.isArray(value) ? value : [value])[0];
    return result?.message ?? fieldMessage ?? fallback;
}

function labelize(value: string): string {
    return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function targetKey(kind: GovernanceTarget['kind'], id: string): string {
    return `${kind}:${id}`;
}

async function readResult(response: Response): Promise<JsonResult | null> {
    return response.json().catch(() => null) as Promise<JsonResult | null>;
}

export function GovernancePanel({ caseId, governance }: { caseId: string; governance: GovernanceWorkspace }) {
    const [assigneeId, setAssigneeId] = React.useState(governance.case.assigned_user_id ?? '');
    const [resolution, setResolution] = React.useState('');
    const [commandType, setCommandType] = React.useState<GovernanceCommandPayload['command_type']>('administrative_hold.place');
    const [targetChoice, setTargetChoice] = React.useState('');
    const [holdChoice, setHoldChoice] = React.useState('');
    const [checkerId, setCheckerId] = React.useState('');
    const [reasonClass, setReasonClass] = React.useState<(typeof reasonClasses)[number] | ''>('');
    const [reason, setReason] = React.useState('');
    const [releaseConditions, setReleaseConditions] = React.useState('');
    const [recipient, setRecipient] = React.useState('');
    const [selectedExhibits, setSelectedExhibits] = React.useState<string[]>([]);
    const [pending, setPending] = React.useState<string | null>(null);
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const packetCreationRequest = React.useRef<{ fingerprint: string; key: string } | null>(null);

    const canPlaceHold = governance.permissions.can_request_hold;
    const canReleaseHold = governance.permissions.can_request_release;
    const effectiveCommandType = canPlaceHold && canReleaseHold
        ? commandType
        : canPlaceHold
            ? 'administrative_hold.place'
            : 'administrative_hold.release';
    const eligibleCheckers = governance.eligible_staff.filter((staff) => staff.id !== governance.actor_user_id);
    const selectedAssignee = governance.eligible_staff.find((staff) => staff.id === assigneeId);
    const activeHolds = governance.holds.filter((hold) => hold.status === 'active' || hold.status === 'reviewing');
    const selectedTarget = governance.targets.find((target) => targetKey(target.kind, target.id) === targetChoice);
    const releasableHolds = activeHolds.filter((hold) => holdChoice === hold.id);
    const releaseConditionValues = releaseConditions.split('\n').map((line) => line.trim()).filter(Boolean);
    const releaseConditionsWithinLimits = releaseConditionValues.length <= 10 && releaseConditionValues.every((line) => line.length <= 500);
    const selectedHold = releasableHolds[0];
    const commandTarget = effectiveCommandType === 'administrative_hold.release'
        ? governance.targets.find((target) => target.id === selectedHold?.target_id && target.kind === selectedHold?.target_kind)
        : selectedTarget;

    const perform = async (key: string, url: string, body: object | FormData, fallback: string): Promise<boolean> => {
        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
        if (!csrfToken) {
            setErrors((current) => ({ ...current, [key]: 'This browser session is missing its CSRF token. Refresh the page and try again.' }));
            return false;
        }

        setPending(key);
        setErrors((current) => ({ ...current, [key]: '' }));
        try {
            const isMultipart = body instanceof FormData;
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
                },
                body: isMultipart ? body : JSON.stringify(body),
            });
            const result = await readResult(response);
            if (!response.ok) throw new Error(failureMessage(result, fallback));
            if (!result?.data) throw new Error('The server did not return a saved result. Refresh before continuing.');
            router.reload();
            return true;
        } catch (cause) {
            setErrors((current) => ({
                ...current,
                [key]: cause instanceof Error ? cause.message : fallback,
            }));
            return false;
        } finally {
            setPending(null);
        }
    };

    const assignCase = () => {
        if (!selectedAssignee) return;
        void perform('assign', `/admin/support-cases/${encodeURIComponent(caseId)}/assign`, {
            expected_version: governance.case.version,
            assignee_user_id: assigneeId,
            idempotency_key: crypto.randomUUID(),
        }, 'The case assignment could not be saved.');
    };

    const resolveCase = () => {
        if (!resolution.trim()) return;
        void perform('resolve', `/admin/support-cases/${encodeURIComponent(caseId)}/resolve`, {
            expected_version: governance.case.version,
            resolution: resolution.trim(),
            idempotency_key: crypto.randomUUID(),
        }, 'The case resolution could not be saved.');
    };

    const requestHoldCommand = () => {
        if (!commandTarget || !checkerId || !reasonClass || !reason.trim()) return;
        const release = effectiveCommandType === 'administrative_hold.release';
        if (release && (!canReleaseHold || !selectedHold || !releaseConditionsWithinLimits)) return;
        if (!release && !canPlaceHold) return;
        void perform('approval-request', '/admin/command-approvals', {
            case_id: caseId,
            command_type: effectiveCommandType,
            checker_user_id: checkerId,
            target_kind: commandTarget.kind,
            target_id: commandTarget.id,
            expected_target_version: commandTarget.version,
            reason_class: reasonClass,
            reason: reason.trim(),
            idempotency_key: crypto.randomUUID(),
            ...(release ? {
                hold_id: selectedHold?.id,
                expected_hold_version: selectedHold?.version,
                release_conditions: releaseConditionValues,
            } : {}),
        }, 'The hold approval request could not be saved.');
    };

    const actOnApproval = (approval: GovernanceApproval, action: 'approve' | 'execute') => {
        const path = `/admin/command-approvals/${encodeURIComponent(approval.id)}/${action}`;
        void perform(`approval-${approval.id}`, path, {}, `The approval could not be ${action === 'approve' ? 'approved' : 'executed'}.`);
    };

    const createPacket = () => {
        const trimmedRecipient = recipient.trim();
        if (!trimmedRecipient) return;
        const payload = {
            expected_case_version: governance.case.version,
            recipient: trimmedRecipient,
            exhibit_file_ids: selectedExhibits,
        };
        const fingerprint = JSON.stringify([caseId, payload]);
        if (packetCreationRequest.current?.fingerprint !== fingerprint) {
            packetCreationRequest.current = { fingerprint, key: crypto.randomUUID() };
        }
        const request = packetCreationRequest.current;
        void perform('packet-create', `/admin/support-cases/${encodeURIComponent(caseId)}/lupon-packets`, {
            ...payload,
            idempotency_key: request.key,
        }, 'The handoff packet could not be prepared.').then((acknowledged) => {
            if (acknowledged && packetCreationRequest.current?.key === request.key) {
                packetCreationRequest.current = null;
            }
        });
    };

    const packetAction = (packet: LuponPacket, action: string, body: object | FormData, fallback: string) => {
        const path = `/admin/lupon-packets/${encodeURIComponent(packet.id)}/${action}`;
        void perform(`packet-${packet.id}`, path, body, fallback);
    };

    const assignedStaff = governance.eligible_staff.find((person) => person.id === governance.case.assigned_user_id);
    return (
        <section aria-labelledby="governance-heading" className="flex flex-col gap-4">
            <header className="flex flex-col gap-1">
                <h2 id="governance-heading" className="text-sm font-semibold text-foreground">Case governance · {governance.case.reference}</h2>
                <p className="text-xs text-muted-foreground">Case {labelize(governance.case.status)} · Version {governance.case.version} · Assigned {assignedStaff?.display_name ?? governance.case.assigned_user_id ?? 'unassigned'} · Responsibility {labelize(governance.case.responsibility_party)}</p>
            </header>
            <fieldset disabled={pending !== null} aria-label="Governance actions" className="contents">

            <div className="grid gap-4 xl:grid-cols-2">
                <section className="flex flex-col gap-3 rounded-lg border border-border p-4" aria-labelledby="case-assignment-heading">
                    <div>
                        <h3 id="case-assignment-heading" className="text-sm font-medium">Assignment</h3>
                        <p className="text-xs text-muted-foreground">Updates staff responsibility only; financial state is independent.</p>
                    </div>
                    {governance.permissions.can_assign ? (
                        <>
                            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                Assign to
                                <select aria-label="Assign to" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} disabled={pending === 'assign'} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                                    <option value="">Choose eligible staff</option>
                                    {governance.eligible_staff.map((staff) => <option key={staff.id} value={staff.id}>{staff.display_name} · {staff.roles.join(', ')}</option>)}
                                </select>
                            </label>
                            <Button type="button" disabled={!selectedAssignee || pending === 'assign'} onClick={assignCase}>{pending === 'assign' ? 'Assigning…' : 'Assign case'}</Button>
                            {errors.assign && <p role="alert" className="text-sm text-destructive">{errors.assign}</p>}
                        </>
                    ) : <p className="text-sm text-muted-foreground">Case assignment is unavailable to this staff member.</p>}
                </section>

                <section className="flex flex-col gap-3 rounded-lg border border-border p-4" aria-labelledby="case-resolution-heading">
                    <div>
                        <h3 id="case-resolution-heading" className="text-sm font-medium">Resolve support case</h3>
                        <p className="text-xs text-muted-foreground">This closes the support case only. It does not settle, release, or split funds.</p>
                    </div>
                    {governance.permissions.can_resolve ? (
                        <>
                            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                Resolution
                                <textarea aria-label="Resolution" value={resolution} onChange={(event) => setResolution(event.target.value)} disabled={pending === 'resolve'} maxLength={2000} rows={3} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" />
                            </label>
                            <Button type="button" disabled={!resolution.trim() || pending === 'resolve'} onClick={resolveCase}>{pending === 'resolve' ? 'Resolving…' : 'Resolve case'}</Button>
                            {errors.resolve && <p role="alert" className="text-sm text-destructive">{errors.resolve}</p>}
                        </>
                    ) : <p className="text-sm text-muted-foreground">Case resolution is unavailable to this staff member.</p>}
                </section>
            </div>

            <section className="flex flex-col gap-4 rounded-lg border border-border p-4" aria-labelledby="holds-heading">
                <div>
                    <h3 id="holds-heading" className="text-sm font-medium">Surgical hold approvals</h3>
                    <p className="text-xs text-muted-foreground">A hold applies only to the selected aggregate. Placement and release require a different designated checker; release never settles money.</p>
                </div>
                {canPlaceHold || canReleaseHold ? (
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                            Command
                            <select aria-label="Hold command" value={effectiveCommandType} onChange={(event) => { setCommandType(event.target.value as GovernanceCommandPayload['command_type']); setTargetChoice(''); setHoldChoice(''); }} disabled={pending === 'approval-request'} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                                <option value="administrative_hold.place" disabled={!canPlaceHold}>Place a hold</option>
                                <option value="administrative_hold.release" disabled={!canReleaseHold || activeHolds.length === 0}>Request hold release</option>
                            </select>
                        </label>
                        {effectiveCommandType === 'administrative_hold.release' ? (
                            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                Active hold
                                <select aria-label="Active hold" value={holdChoice} onChange={(event) => setHoldChoice(event.target.value)} disabled={pending === 'approval-request'} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                                    <option value="">Choose an active hold</option>
                                    {activeHolds.map((hold) => <option key={hold.id} value={hold.id}>{hold.id} · {labelize(hold.target_kind)} · {hold.target_id} · v{hold.version}</option>)}
                                </select>
                            </label>
                        ) : (
                            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                Hold target
                                <select aria-label="Hold target" value={targetChoice} onChange={(event) => setTargetChoice(event.target.value)} disabled={pending === 'approval-request'} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                                    <option value="">Choose one linked target</option>
                                    {governance.targets.map((target) => <option key={targetKey(target.kind, target.id)} value={targetKey(target.kind, target.id)}>{target.label} · {labelize(target.kind)} · v{target.version}</option>)}
                                </select>
                            </label>
                        )}
                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                            Designated checker
                            <select aria-label="Designated checker" value={checkerId} onChange={(event) => setCheckerId(event.target.value)} disabled={pending === 'approval-request'} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                                <option value="">Choose a different eligible staff member</option>
                                {eligibleCheckers.map((staff) => <option key={staff.id} value={staff.id}>{staff.display_name} · {staff.roles.join(', ')}</option>)}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                            Reason category
                            <select aria-label="Reason category" value={reasonClass} onChange={(event) => setReasonClass(event.target.value as typeof reasonClass)} disabled={pending === 'approval-request'} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                                <option value="">Choose a reason category</option>
                                {reasonClasses.map((value) => <option key={value} value={value}>{labelize(value)}</option>)}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-muted-foreground md:col-span-2">
                            Hold reason
                            <textarea aria-label="Hold reason" value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending === 'approval-request'} maxLength={2000} rows={2} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" />
                        </label>
                        {effectiveCommandType === 'administrative_hold.release' && (
                            <label className="flex flex-col gap-1 text-xs text-muted-foreground md:col-span-2">
                                Release conditions or evidence
                                <textarea aria-label="Release conditions" value={releaseConditions} onChange={(event) => setReleaseConditions(event.target.value)} disabled={pending === 'approval-request'} maxLength={5000} rows={2} placeholder="One condition or evidence item per line" className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" />
                                <span className="text-xs text-muted-foreground">Up to 10 conditions, 500 characters each.</span>
                            </label>
                        )}
                        <div className="flex flex-col gap-2 md:col-span-2">
                            <Button type="button" disabled={!commandTarget || !checkerId || checkerId === governance.actor_user_id || !reasonClass || !reason.trim() || (effectiveCommandType === 'administrative_hold.release' && (!canReleaseHold || !selectedHold || !releaseConditionsWithinLimits)) || (effectiveCommandType === 'administrative_hold.place' && !canPlaceHold) || pending === 'approval-request'} onClick={requestHoldCommand}>{pending === 'approval-request' ? 'Requesting…' : effectiveCommandType === 'administrative_hold.release' ? 'Request release approval' : 'Request hold approval'}</Button>
                            {errors['approval-request'] && <p role="alert" className="text-sm text-destructive">{errors['approval-request']}</p>}
                        </div>
                    </div>
                ) : <p className="text-sm text-muted-foreground">Hold approval requests are unavailable to this staff member.</p>}

                <div className="flex flex-col gap-2">
                    {governance.holds.map((hold) => (
                        <article key={hold.id} className="rounded-md border border-border p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-medium">{hold.id} · {labelize(hold.status)}</p>
                                <span className="text-xs text-muted-foreground">{labelize(hold.target_kind)} · {hold.target_id} · Hold version {hold.version}</span>
                            </div>
                            <p className="mt-1 text-sm">{hold.reason}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{labelize(hold.reason_class)} · {hold.created_at}{hold.released_at ? ` · Released ${hold.released_at}` : ''}</p>
                        </article>
                    ))}
                    {governance.holds.length === 0 && <p className="text-sm text-muted-foreground">No administrative holds are linked to this case.</p>}
                </div>

                <div className="flex flex-col gap-2" aria-label="Hold approval requests">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Maker / checker requests</h4>
                    {governance.approvals.map((approval) => <ApprovalRow key={approval.id} approval={approval} governance={governance} pending={pending === `approval-${approval.id}`} onAct={actOnApproval} error={errors[`approval-${approval.id}`]} />)}
                    {governance.approvals.length === 0 && <p className="text-sm text-muted-foreground">No hold approval requests are recorded.</p>}
                </div>
            </section>

            <section className="flex flex-col gap-4 rounded-lg border border-border p-4" aria-labelledby="lupon-heading">
                <div>
                    <h3 id="lupon-heading" className="text-sm font-medium">Barangay handoff packet</h3>
                    <p className="text-xs text-muted-foreground">Serbizyu is an evidentiary custodian, not a judicial authority. Packet materials are not a court filing or a financial settlement.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        Receiving office
                        <Input aria-label="Receiving office" value={recipient} onChange={(event) => setRecipient(event.target.value)} disabled={pending === 'packet-create'} maxLength={160} />
                    </label>
                    <fieldset className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <legend>Case-scoped exhibits</legend>
                        {governance.available_exhibits.length ? governance.available_exhibits.map((exhibit) => (
                            <label key={exhibit.id} className="flex items-start gap-2 rounded-md border border-border p-2 text-sm text-foreground">
                                <input type="checkbox" value={exhibit.id} checked={selectedExhibits.includes(exhibit.id)} disabled={pending === 'packet-create'} onChange={(event) => setSelectedExhibits((current) => event.target.checked ? [...current, exhibit.id] : current.filter((id) => id !== exhibit.id))} />
                                <span className="flex min-w-0 flex-col gap-1">
                                    <span>{exhibit.name} · {exhibit.evidence_type}</span>
                                    <span className="break-all text-xs text-muted-foreground">{exhibit.media_type} · {exhibit.size_bytes} bytes · SHA-256 {exhibit.sha256}</span>
                                    <span className="text-xs text-muted-foreground">{exhibit.created_at ?? 'Date not recorded'}</span>
                                </span>
                            </label>
                        )) : <p className="text-sm text-muted-foreground">No case-scoped eligible exhibits are available.</p>}
                    </fieldset>
                    {governance.excluded_exhibits.length > 0 && (
                        <div className="flex flex-col gap-2 md:col-span-2" aria-label="Excluded case evidence">
                            <p className="text-xs font-medium text-muted-foreground">Evidence unavailable for handoff</p>
                            {governance.excluded_exhibits.map((item) => <p key={`${item.id}-${item.reason}`} className="break-words text-xs text-muted-foreground">{item.id} · {labelize(item.reason)}</p>)}
                        </div>
                    )}
                    <div className="flex flex-col gap-2 md:col-span-2">
                        <Button type="button" disabled={!recipient.trim() || pending === 'packet-create'} onClick={createPacket}>{pending === 'packet-create' ? 'Preparing…' : 'Prepare handoff packet'}</Button>
                        {errors['packet-create'] && <p role="alert" className="text-sm text-destructive">{errors['packet-create']}</p>}
                    </div>
                </div>
                <div className="flex flex-col gap-4">
                    {governance.packets.map((packet) => <PacketRecord key={packet.id} packet={packet} pending={pending === `packet-${packet.id}`} error={errors[`packet-${packet.id}`]} onAct={packetAction} />)}
                    {governance.packets.length === 0 && <p className="text-sm text-muted-foreground">No handoff packets have been created for this case.</p>}
                </div>
            </section>
            </fieldset>
        </section>
    );
}

function ApprovalRow({
    approval,
    governance,
    pending,
    error,
    onAct,
}: {
    approval: GovernanceApproval;
    governance: GovernanceWorkspace;
    pending: boolean;
    error?: string;
    onAct: (approval: GovernanceApproval, action: 'approve' | 'execute') => void;
}) {
    const payload = approval.command_payload;
    const maker = governance.eligible_staff.find((staff) => staff.id === approval.maker_user_id)?.display_name ?? approval.maker_user_id;
    const checker = governance.eligible_staff.find((staff) => staff.id === approval.checker_user_id)?.display_name ?? approval.checker_user_id;
    const target = governance.targets.find((item) => item.kind === payload.target_kind && item.id === payload.target_id);
    return (
        <article className="flex flex-col gap-2 rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{approval.id} · {labelize(approval.command_type)} · {labelize(approval.status)}</p>
                <span className="text-xs text-muted-foreground">Expires {approval.expires_at}</span>
            </div>
            <p className="text-xs text-muted-foreground">Maker: {maker} · Designated checker: {checker}</p>
            <p className="text-sm">{target?.label ?? `${labelize(payload.target_kind)} · ${payload.target_id}`} · target version {payload.expected_target_version}{payload.hold_id ? ` · hold ${payload.hold_id} version ${payload.expected_hold_version}` : ''}</p>
            <p className="text-sm">{payload.reason}</p>
            <p className="text-xs text-muted-foreground">Reason category: {labelize(payload.reason_class)}</p>
            {payload.release_conditions && payload.release_conditions.length > 0 && <p className="text-xs text-muted-foreground">Release conditions: {payload.release_conditions.join(' · ')}</p>}
            <p className="break-all font-mono text-xs text-muted-foreground">Payload SHA-256: {approval.payload_hash}</p>
            <div className="flex flex-wrap gap-2">
                {approval.status === 'pending' && approval.can_approve && approval.checker_user_id === governance.actor_user_id && approval.maker_user_id !== governance.actor_user_id && <Button type="button" disabled={pending} onClick={() => onAct(approval, 'approve')}>{pending ? 'Approving…' : `Approve ${approval.id}`}</Button>}
                {approval.status === 'approved' && approval.can_execute && approval.checker_user_id === governance.actor_user_id && approval.maker_user_id !== governance.actor_user_id && <Button type="button" disabled={pending} onClick={() => onAct(approval, 'execute')}>{pending ? 'Executing…' : `Execute ${approval.id}`}</Button>}
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </article>
    );
}

function PacketRecord({
    packet,
    pending,
    error,
    onAct,
}: {
    packet: LuponPacket;
    pending: boolean;
    error?: string;
    onAct: (packet: LuponPacket, action: string, body: object | FormData, fallback: string) => void;
}) {
    const [transmissionRecipient, setTransmissionRecipient] = React.useState(packet.recipient ?? '');
    const [transmittedAt, setTransmittedAt] = React.useState('');
    const [returnKind, setReturnKind] = React.useState<(typeof returnKinds)[number]>('signed_kasunduan');
    const [receivedAt, setReceivedAt] = React.useState('');
    const [cabinetCode, setCabinetCode] = React.useState(packet.cabinet_code ?? '');
    const [paperwork, setPaperwork] = React.useState<File | null>(null);

    const transmit = () => {
        if (!transmissionRecipient.trim() || !transmittedAt) return;
        onAct(packet, 'transmission', {
            expected_version: packet.version,
            recipient: transmissionRecipient.trim(),
            transmitted_at: new Date(transmittedAt).toISOString(),
            idempotency_key: crypto.randomUUID(),
        }, 'The physical transmission could not be recorded.');
    };

    const recordReturn = () => {
        if (!paperwork || !cabinetCode.trim() || !receivedAt) return;
        const form = new FormData();
        form.append('expected_version', String(packet.version));
        form.append('return_kind', returnKind);
        form.append('received_at', new Date(receivedAt).toISOString());
        form.append('cabinet_code', cabinetCode.trim());
        form.append('paperwork', paperwork);
        form.append('idempotency_key', crypto.randomUUID());
        onAct(packet, 'returned-paperwork', form, 'The returned physical paperwork could not be logged.');
    };

    return (
        <article className="flex flex-col gap-3 rounded-md border border-border p-4">
            <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h4 className="text-sm font-semibold">Packet {packet.id} · {labelize(packet.status)}</h4>
                    <p className="text-xs text-muted-foreground">Version {packet.version} · Recipient: {packet.recipient ?? 'Not recorded'}</p>
                </div>
                {packet.archived_at && <span className="text-xs text-muted-foreground">Archived {packet.archived_at}</span>}
            </header>
            <div className="flex flex-col gap-2">
                {packet.artifacts.map((artifact) => (
                    <div key={artifact.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2">
                        <div className="min-w-0">
                            <p className="break-all text-sm font-medium">{labelize(artifact.kind)} · {artifact.filename}</p>
                            <p className="break-all text-xs text-muted-foreground">{artifact.media_type} · {artifact.size_bytes} bytes · SHA-256 {artifact.sha256}</p>
                            <p className="text-xs text-muted-foreground">Artifact format: {labelize(artifact.metadata.format)}</p>
                        </div>
                        <a href={artifact.download_url} className="text-sm font-medium text-primary underline underline-offset-4" download aria-label={`Download ${artifact.filename}`}>Download private artifact</a>
                    </div>
                ))}
            </div>
            {packet.exhibits.length > 0 && (
                <section className="flex flex-col gap-2" aria-label="Verified exhibit snapshot">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exhibit snapshot and metadata inspection</h5>
                    {packet.exhibits.map((exhibit) => (
                        <div key={exhibit.evidence_file_id} className="rounded-md border border-border p-3">
                            <p className="text-sm font-medium">{exhibit.filename} · {exhibit.evidence_type}</p>
                            <p className="break-all text-xs text-muted-foreground">{exhibit.media_type} · {exhibit.size_bytes} bytes · SHA-256 {exhibit.sha256}</p>
                            <p className="text-xs text-muted-foreground">EXIF inspection: {labelize(exhibit.exif.status)}</p>
                            {exhibit.exif.timestamps.map((timestamp) => <p key={timestamp} className="text-xs text-muted-foreground">Embedded timestamp: {timestamp}</p>)}
                            {exhibit.exif.reason && <p className="text-xs text-muted-foreground">{exhibit.exif.reason}</p>}
                        </div>
                    ))}
                </section>
            )}
            {packet.excluded_exhibits.length > 0 && (
                <section className="flex flex-col gap-2" aria-label="Evidence excluded from packet snapshot">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sources excluded from this packet</h5>
                    {packet.excluded_exhibits.map((item) => <p key={`${item.id}-${item.reason}`} className="break-words text-xs text-muted-foreground">{item.id} · {labelize(item.reason)}</p>)}
                </section>
            )}
            {packet.transmitted_at && <p className="text-sm">Physical transmission recorded to {packet.recipient ?? 'recipient not recorded'} · {packet.transmitted_at}</p>}
            {packet.returned_at && (
                <div className="flex flex-col gap-1 rounded-md bg-muted/30 p-3 text-sm">
                    <p>Returned {labelize(packet.return_kind ?? 'paperwork')} · {packet.returned_at} · Cabinet {packet.cabinet_code ?? 'not recorded'}</p>
                    <p className="text-xs text-muted-foreground">Returned paper scan: {packet.returned_paper_scan_status ? labelize(packet.returned_paper_scan_status) : 'Awaiting private scan result'}</p>
                    {packet.returned_paper_scan_status === 'clean' && packet.returned_paper_integrity_ok && <p className="text-xs font-medium text-foreground">Scanned and verified</p>}
                    {packet.returned_paper_scan_status === 'clean' && !packet.returned_paper_integrity_ok && <p className="text-xs text-destructive">Integrity check failed; returned paperwork is not verified.</p>}
                    {packet.returned_paper_scan_status && packet.returned_paper_scan_status !== 'clean' && <p className="text-xs text-destructive">Returned paperwork scan is {labelize(packet.returned_paper_scan_status)}; not verified.</p>}
                    {!packet.returned_paper_scan_status && !packet.returned_paper_integrity_ok && <p className="text-xs text-muted-foreground">Returned paperwork integrity is unavailable; not verified.</p>}
                    {packet.returned_paper_scan_status === 'clean' && packet.returned_paper_integrity_ok && packet.returned_paper_download_url && <a href={packet.returned_paper_download_url} className="w-fit text-sm font-medium text-primary underline underline-offset-4" download>Download scanned returned paperwork</a>}
                    <p className="text-xs text-muted-foreground">Case holds still active: {packet.active_case_holds}</p>
                </div>
            )}
            {!packet.transmitted_at && packet.status === 'prepared' && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">Transmission recipient<Input aria-label="Transmission recipient" value={transmissionRecipient} onChange={(event) => setTransmissionRecipient(event.target.value)} disabled={pending} maxLength={160} /></label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">Transmission date and time<Input aria-label="Transmission date and time" type="datetime-local" value={transmittedAt} onChange={(event) => setTransmittedAt(event.target.value)} disabled={pending} /></label>
                    <Button type="button" disabled={!transmissionRecipient.trim() || !transmittedAt || pending} onClick={transmit} className="sm:col-span-2">{pending ? 'Recording…' : 'Record transmission'}</Button>
                </div>
            )}
            {packet.status === 'transmitted' && packet.transmitted_at && !packet.returned_at && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        Return type
                        <select aria-label="Return type" value={returnKind} onChange={(event) => setReturnKind(event.target.value as typeof returnKind)} disabled={pending} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                            <option value="signed_kasunduan">Signed Kasunduan</option>
                            <option value="katibayan">Katibayan</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">Physical return date and time<Input aria-label="Physical return date and time" type="datetime-local" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} disabled={pending} /></label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">Cabinet code<Input aria-label="Cabinet code" value={cabinetCode} onChange={(event) => setCabinetCode(event.target.value)} disabled={pending} maxLength={100} /></label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        Returned paperwork
                        <input aria-label="Returned paperwork" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPaperwork(event.target.files?.[0] ?? null)} disabled={pending} className="h-9 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1" />
                    </label>
                    <Button type="button" disabled={!paperwork || !cabinetCode.trim() || !receivedAt || pending} onClick={recordReturn} className="sm:col-span-2">{pending ? 'Uploading…' : 'Log returned paperwork'}</Button>
                </div>
            )}
            {packet.returned_at && packet.archive_eligible && packet.status === 'returned' && (
                <div className="flex flex-col gap-2">
                    <p className="text-sm">Paperwork is scanned clean, cabineted, and no exact-case holds remain.</p>
                    <Button type="button" disabled={pending} onClick={() => onAct(packet, 'archive', { expected_version: packet.version, idempotency_key: crypto.randomUUID() }, 'The packet could not be archived.')}>{pending ? 'Archiving…' : `Archive ${packet.id}`}</Button>
                </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </article>
    );
}
