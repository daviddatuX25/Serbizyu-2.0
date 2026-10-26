import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { router } from '@inertiajs/react';

import { GovernancePanel } from './GovernancePanel';
import type { GovernanceWorkspace } from '@/types/admin-workspace';

vi.mock('@inertiajs/react', () => ({
    router: { reload: vi.fn() },
}));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.head.querySelector('meta[name="csrf-token"]')?.remove();
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

const governance = {
    actor_user_id: 'staff-maker',
    case: { id: 'case-32', reference: 'CASE-32', version: 7, status: 'open', assigned_user_id: 'staff-maker', responsibility_party: 'staff' },
    eligible_staff: [
        { id: 'staff-maker', display_name: 'Mara Maker', roles: ['admin'] },
        { id: 'staff-checker', display_name: 'Cora Checker', roles: ['operate'] },
    ],
    targets: [
        { kind: 'payment_obligation', id: 'obl-32', label: 'OBL-32 · disputed payment', version: 5 },
        { kind: 'work_instance', id: 'work-32', label: 'Work 32', version: 11 },
    ],
    holds: [{ id: 'hold-32', target_kind: 'payment_obligation', target_id: 'obl-32', status: 'active', version: 2, reason_class: 'dispute', reason: 'Declaration mismatch', created_at: '2026-10-26', released_at: null }],
    approvals: [
        { id: 'approval-32', command_type: 'administrative_hold.place', status: 'pending', maker_user_id: 'staff-maker', checker_user_id: 'staff-checker', payload_hash: 'server-hash-32', expires_at: '2026-10-27T00:00:00Z', case_id: 'case-32', command_payload: { case_id: 'case-32', command_type: 'administrative_hold.place', checker_user_id: 'staff-checker', target_kind: 'payment_obligation', target_id: 'obl-32', expected_target_version: 5, reason_class: 'dispute', reason: 'Payment declaration mismatch requires review.', idempotency_key: 'maker-key' }, can_approve: false, can_execute: false },
    ],
    permissions: { can_assign: true, can_resolve: true, can_request_hold: true, can_request_release: true },
    packets: [],
    available_exhibits: [],
    excluded_exhibits: [],
} as unknown as GovernanceWorkspace;

type MockJsonResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function authorizeBrowserRequests() {
    const csrf = document.createElement('meta');
    csrf.name = 'csrf-token';
    csrf.content = 'csrf-32';
    document.head.append(csrf);
}

function jsonResponse(data: unknown, ok = true): MockJsonResponse {
    return { ok, status: ok ? 200 : 422, json: async () => ({ data }) };
}

describe('governed case workspace actions', () => {
    it('assigns and resolves with the live case version and preserves user input on server errors', async () => {
        authorizeBrowserRequests();
        const fetchSpy = vi.fn()
            .mockResolvedValueOnce(jsonResponse({ case_id: 'case-32', version: 8 }))
            .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ message: 'Case version is stale.' }) });
        vi.stubGlobal('fetch', fetchSpy);
        render(<GovernancePanel caseId="case-32" governance={governance} />);

        fireEvent.change(screen.getByLabelText('Assign to'), { target: { value: 'staff-checker' } });
        fireEvent.click(screen.getByRole('button', { name: 'Assign case' }));
        await waitFor(() => expect(fetchSpy).toHaveBeenNthCalledWith(1,
            '/admin/support-cases/case-32/assign',
            expect.objectContaining({ body: expect.stringContaining('"expected_version":7') }),
        ));
        expect(router.reload).toHaveBeenCalled();
        expect(screen.getByText(/Assigned Mara Maker/)).toBeTruthy();

        fireEvent.change(screen.getByLabelText('Resolution'), { target: { value: 'Mediation concluded; financial rail unchanged.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Resolve case' }));
        await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Case version is stale.'));
        expect((screen.getByLabelText('Resolution') as HTMLTextAreaElement).value).toBe('Mediation concluded; financial rail unchanged.');
        expect(fetchSpy).toHaveBeenNthCalledWith(2,
            '/admin/support-cases/case-32/resolve',
            expect.objectContaining({ body: expect.stringContaining('"expected_version":7') }),
        );
    });
    it('disables all case mutations while a request is pending and refreshes only after acknowledgement', async () => {
        authorizeBrowserRequests();
        const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ case_id: 'case-32', assigned_user_id: 'staff-checker', version: 8 }));
        vi.stubGlobal('fetch', fetchSpy);
        render(<GovernancePanel caseId="case-32" governance={governance} />);

        fireEvent.change(screen.getByLabelText('Assign to'), { target: { value: 'staff-checker' } });
        fireEvent.click(screen.getByRole('button', { name: 'Assign case' }));
        expect(screen.getByRole('button', { name: 'Assigning…' }).matches(':disabled')).toBe(true);
        expect(screen.getByRole('button', { name: 'Resolve case' }).matches(':disabled')).toBe(true);
        expect(router.reload).not.toHaveBeenCalled();

        await waitFor(() => expect(router.reload).toHaveBeenCalledTimes(1));
    });

    it('requests a target-version-bound hold from a different designated checker and leaves approval state server-owned', async () => {
        authorizeBrowserRequests();
        const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ approval_id: 'approval-new-32', status: 'pending' }));
        vi.stubGlobal('fetch', fetchSpy);
        render(<GovernancePanel caseId="case-32" governance={governance} />);

        fireEvent.change(screen.getByLabelText('Hold target'), { target: { value: 'payment_obligation:obl-32' } });
        fireEvent.change(screen.getByLabelText('Designated checker'), { target: { value: 'staff-checker' } });
        fireEvent.change(screen.getByLabelText('Reason category'), { target: { value: 'dispute' } });
        fireEvent.change(screen.getByLabelText('Hold reason'), { target: { value: 'Payment declaration mismatch requires review.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Request hold approval' }));

        await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
            '/admin/command-approvals',
            expect.objectContaining({ body: expect.stringContaining('"expected_target_version":5') }),
        ));
        const payload = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
        expect(payload).toMatchObject({ case_id: 'case-32', target_kind: 'payment_obligation', target_id: 'obl-32', checker_user_id: 'staff-checker' });
        expect(payload.checker_user_id).not.toBe(governance.approvals[0].maker_user_id);
        expect(screen.getByText(/approval-32.*pending/i)).toBeTruthy();
        expect(router.reload).toHaveBeenCalled();
    });

    it('requests release against the exact active hold and current target and hold versions', async () => {
        authorizeBrowserRequests();
        const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ approval_id: 'release-approval-32', status: 'pending' }));
        vi.stubGlobal('fetch', fetchSpy);
        render(<GovernancePanel caseId="case-32" governance={governance} />);

        fireEvent.change(screen.getByLabelText('Hold command'), { target: { value: 'administrative_hold.release' } });
        fireEvent.change(screen.getByLabelText('Active hold'), { target: { value: 'hold-32' } });
        fireEvent.change(screen.getByLabelText('Designated checker'), { target: { value: 'staff-checker' } });
        fireEvent.change(screen.getByLabelText('Reason category'), { target: { value: 'legal' } });
        fireEvent.change(screen.getByLabelText('Hold reason'), { target: { value: 'Signed paperwork is returned and verified.' } });
        fireEvent.change(screen.getByLabelText('Release conditions'), { target: { value: 'Returned paperwork logged\nScan confirmed clean' } });
        fireEvent.click(screen.getByRole('button', { name: 'Request release approval' }));

        await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/admin/command-approvals', expect.any(Object)));
        const payload = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
        expect(payload).toMatchObject({
            command_type: 'administrative_hold.release',
            hold_id: 'hold-32',
            expected_hold_version: 2,
            target_kind: 'payment_obligation',
            target_id: 'obl-32',
            expected_target_version: 5,
            checker_user_id: 'staff-checker',
            release_conditions: ['Returned paperwork logged', 'Scan confirmed clean'],
        });
        expect(screen.getByText(/hold-32 · Active/)).toBeTruthy();
        expect(router.reload).toHaveBeenCalledTimes(1);
    });

    it('uses per-approval server permissions and posts approve then execute only after refreshed approved state', async () => {
        authorizeBrowserRequests();
        const fetchSpy = vi.fn()
            .mockResolvedValueOnce(jsonResponse({ approval_id: 'approval-32', status: 'approved' }))
            .mockResolvedValueOnce(jsonResponse({ approval_id: 'approval-32', hold_id: 'hold-32', status: 'active' }));
        vi.stubGlobal('fetch', fetchSpy);
        const { rerender } = render(<GovernancePanel caseId="case-32" governance={{
            ...governance,
            actor_user_id: 'staff-checker',
            approvals: [{ ...governance.approvals[0], can_approve: true }],
        }} />);

        fireEvent.click(screen.getByRole('button', { name: 'Approve approval-32' }));
        await waitFor(() => expect(fetchSpy).toHaveBeenNthCalledWith(1,
            '/admin/command-approvals/approval-32/approve',
            expect.objectContaining({ method: 'POST' }),
        ));
        expect(screen.queryByRole('button', { name: 'Execute approval-32' })).toBeNull();
        rerender(<GovernancePanel caseId="case-32" governance={{
            ...governance,
            actor_user_id: 'staff-checker',
            approvals: [{ ...governance.approvals[0], status: 'approved', can_execute: true }],
        }} />);
        fireEvent.click(screen.getByRole('button', { name: 'Execute approval-32' }));
        await waitFor(() => expect(fetchSpy).toHaveBeenNthCalledWith(2,
            '/admin/command-approvals/approval-32/execute',
            expect.objectContaining({ method: 'POST' }),
        ));
        expect(router.reload).toHaveBeenCalledTimes(2);
    });

    it('does not show approval actions when the server marks this approval unavailable to the current actor', () => {
        render(<GovernancePanel caseId="case-32" governance={governance} />);
        expect(screen.queryByRole('button', { name: 'Approve approval-32' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Execute approval-32' })).toBeNull();
    });

    it('creates three private artifacts from selected exhibits, records transmission and scanned return, then archives only after release', async () => {
        authorizeBrowserRequests();
        const exhibit = { id: 'evidence-32', name: 'Original receipt photo', media_type: 'image/jpeg', size_bytes: 2048, sha256: 'd'.repeat(64), evidence_type: 'receipt', created_at: '2026-10-26T09:00:00Z' };
        const excluded = { id: 'file-quarantined-32', reason: 'scan_quarantined' };
        const prepared = {
            id: 'packet-32', case_id: 'case-32', version: 3, status: 'prepared', recipient: 'Barangay Hall',
            transmitted_at: null, returned_at: null, return_kind: null, returned_evidence_file_id: null, returned_paper_download_url: null, returned_paper_scan_status: null, returned_paper_integrity_ok: false,
            cabinet_code: null, archived_at: null, active_case_holds: 1, archive_eligible: false,
            exhibits: [{ evidence_file_id: exhibit.id, filename: exhibit.name, media_type: exhibit.media_type, size_bytes: exhibit.size_bytes, sha256: exhibit.sha256, evidence_type: exhibit.evidence_type, created_at: exhibit.created_at, exif: { status: 'absent', timestamps: [], reason: 'No EXIF timestamp tags were found in the inspected image.' } }],
            excluded_exhibits: [excluded],
            artifacts: [
                { id: 'letter-32', kind: 'transmittal_letter', filename: 'transmittal.html', media_type: 'text/html', size_bytes: 320, sha256: 'a'.repeat(64), metadata: { format: 'printable_html', recipient: 'Barangay Hall' }, download_url: '/admin/lupon-packets/packet-32/artifacts/letter-32' },
                { id: 'manifest-32', kind: 'exhibit_manifest', filename: 'manifest.json', media_type: 'application/json', size_bytes: 480, sha256: 'b'.repeat(64), metadata: { format: 'json', exhibits: [] }, download_url: '/admin/lupon-packets/packet-32/artifacts/manifest-32' },
                { id: 'worksheet-32', kind: 'kasunduan_worksheet', filename: 'worksheet.html', media_type: 'text/html', size_bytes: 410, sha256: 'c'.repeat(64), metadata: { format: 'printable_html', unsigned: true }, download_url: '/admin/lupon-packets/packet-32/artifacts/worksheet-32' },
            ],
        };
        const transmitted = { ...prepared, version: 4, status: 'transmitted', transmitted_at: '2026-10-26T10:00:00Z', recipient: 'Punong Barangay' };
        const returned = { ...transmitted, version: 5, status: 'returned', returned_at: '2026-10-27T10:00:00Z', return_kind: 'signed_kasunduan', returned_evidence_file_id: 'returned-paper-32', returned_paper_download_url: null, returned_paper_scan_status: 'clean', returned_paper_integrity_ok: false, cabinet_code: 'CAB-32', archive_eligible: false };
        const fetchSpy = vi.fn()
            .mockResolvedValueOnce(jsonResponse({ packet: prepared }))
            .mockResolvedValueOnce(jsonResponse({ packet: transmitted }))
            .mockResolvedValueOnce(jsonResponse({ packet: returned }))
            .mockResolvedValueOnce(jsonResponse({ packet: { ...returned, version: 6, status: 'archived', archived_at: '2026-10-28T09:00:00Z', archive_eligible: false } }));
        vi.stubGlobal('fetch', fetchSpy);
        const packetWorkspace = { ...governance, packets: [], available_exhibits: [exhibit], excluded_exhibits: [excluded] } as GovernanceWorkspace;
        const { rerender } = render(<GovernancePanel caseId="case-32" governance={packetWorkspace} />);

        fireEvent.click(screen.getByRole('checkbox'));
        expect(screen.getByText(/file-quarantined-32 · Scan Quarantined/)).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Receiving office'), { target: { value: 'Barangay Hall' } });
        fireEvent.click(screen.getByRole('button', { name: 'Prepare handoff packet' }));
        await waitFor(() => expect(fetchSpy).toHaveBeenNthCalledWith(1,
            '/admin/support-cases/case-32/lupon-packets',
            expect.objectContaining({ body: expect.stringContaining('"expected_case_version":7') }),
        ));
        const createPayload = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
        expect(createPayload.exhibit_file_ids).toEqual(['evidence-32']);
        expect(router.reload).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('link', { name: /transmittal.html/ })).toBeNull();

        rerender(<GovernancePanel caseId="case-32" governance={{ ...packetWorkspace, packets: [prepared] } as GovernanceWorkspace} />);
        expect(screen.getByRole('link', { name: /transmittal.html/ }).getAttribute('href')).toBe(prepared.artifacts[0].download_url);
        expect(screen.getByRole('link', { name: /manifest.json/ }).getAttribute('href')).toBe(prepared.artifacts[1].download_url);
        expect(screen.getByRole('link', { name: /worksheet.html/ }).getAttribute('href')).toBe(prepared.artifacts[2].download_url);
        expect(screen.queryByText(/\.pdf/)).toBeNull();
        expect(screen.getByText('EXIF inspection: Absent')).toBeTruthy();
        expect(screen.getByText(/No EXIF timestamp tags were found/)).toBeTruthy();

        fireEvent.change(screen.getByLabelText('Transmission recipient'), { target: { value: 'Punong Barangay' } });
        fireEvent.change(screen.getByLabelText('Transmission date and time'), { target: { value: '2026-10-26T10:00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Record transmission' }));
        await waitFor(() => expect(fetchSpy).toHaveBeenNthCalledWith(2,
            '/admin/lupon-packets/packet-32/transmission',
            expect.objectContaining({ body: expect.stringContaining('2026-10-26T10:00') }),
        ));
        rerender(<GovernancePanel caseId="case-32" governance={{ ...packetWorkspace, packets: [transmitted] } as GovernanceWorkspace} />);

        const paperwork = new File(['signed physical agreement'], 'signed-kasunduan.png', { type: 'image/png' });
        fireEvent.change(screen.getByLabelText('Returned paperwork'), { target: { files: [paperwork] } });
        fireEvent.change(screen.getByLabelText('Return type'), { target: { value: 'signed_kasunduan' } });
        fireEvent.change(screen.getByLabelText('Physical return date and time'), { target: { value: '2026-10-27T10:00' } });
        fireEvent.change(screen.getByLabelText('Cabinet code'), { target: { value: 'CAB-32' } });
        fireEvent.click(screen.getByRole('button', { name: 'Log returned paperwork' }));
        await waitFor(() => expect(fetchSpy).toHaveBeenNthCalledWith(3,
            '/admin/lupon-packets/packet-32/returned-paperwork',
            expect.objectContaining({ body: expect.any(FormData) }),
        ));
        const returnedBody = fetchSpy.mock.calls[2][1].body as FormData;
        expect(returnedBody.get('paperwork')).toBe(paperwork);
        expect(returnedBody.get('return_kind')).toBe('signed_kasunduan');
        expect(returnedBody.get('cabinet_code')).toBe('CAB-32');
        expect(returnedBody.get('received_at')).toBe(new Date('2026-10-27T10:00').toISOString());
        expect(fetchSpy.mock.calls[2][1].headers['Content-Type']).toBeUndefined();
        expect(router.reload).toHaveBeenCalledTimes(3);
        rerender(<GovernancePanel caseId="case-32" governance={{ ...packetWorkspace, packets: [returned] } as GovernanceWorkspace} />);
        expect(screen.queryByRole('link', { name: 'Download scanned returned paperwork' })).toBeNull();
        expect(screen.queryByText('Scanned and verified')).toBeNull();
        expect(screen.getByText(/integrity check failed/i)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Archive packet-32' })).toBeNull();
        expect(screen.getByText('Case holds still active: 1')).toBeTruthy();

        const integrityVerified = { ...returned, returned_paper_download_url: '/admin/lupon-packets/packet-32/returned-paperwork', returned_paper_integrity_ok: true };
        const releasedWorkspace = { ...packetWorkspace, case: { ...governance.case, status: 'closed' }, holds: [], packets: [{ ...integrityVerified, archive_eligible: true, active_case_holds: 0 }] } as GovernanceWorkspace;
        rerender(<GovernancePanel caseId="case-32" governance={releasedWorkspace} />);
        expect(screen.getByText('Scanned and verified')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Download scanned returned paperwork' }).getAttribute('href')).toBe(integrityVerified.returned_paper_download_url);
        fireEvent.change(screen.getByLabelText('Hold command'), { target: { value: 'administrative_hold.release' } });
        expect((screen.getByLabelText('Hold command') as HTMLSelectElement).selectedOptions[0].value).toBe('administrative_hold.release');
        fireEvent.click(screen.getByRole('button', { name: 'Archive packet-32' }));
        await waitFor(() => expect(fetchSpy).toHaveBeenNthCalledWith(4,
            '/admin/lupon-packets/packet-32/archive',
            expect.objectContaining({ body: expect.stringContaining('"expected_version":5') }),
        ));
        expect(router.reload).toHaveBeenCalledTimes(4);
    });

    it('retains a packet creation idempotency key for a lost response and rotates it when intent changes', async () => {
        authorizeBrowserRequests();
        const fetchSpy = vi.fn()
            .mockRejectedValueOnce(new TypeError('Network connection lost'))
            .mockResolvedValueOnce(jsonResponse({ packet: { id: 'packet-32' } }))
            .mockResolvedValueOnce(jsonResponse({ packet: { id: 'packet-33' } }));
        vi.stubGlobal('fetch', fetchSpy);
        render(<GovernancePanel caseId="case-32" governance={{ ...governance, available_exhibits: [{ id: 'evidence-32', name: 'Receipt', media_type: 'image/jpeg', size_bytes: 1, sha256: 'd'.repeat(64), evidence_type: 'receipt', created_at: null }] }} />);

        fireEvent.change(screen.getByLabelText('Receiving office'), { target: { value: 'Barangay Hall' } });
        fireEvent.click(screen.getByRole('button', { name: 'Prepare handoff packet' }));
        await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Network connection lost/));
        fireEvent.click(screen.getByRole('button', { name: 'Prepare handoff packet' }));
        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(router.reload).toHaveBeenCalledTimes(1));
        const firstKey = JSON.parse(fetchSpy.mock.calls[0][1].body as string).idempotency_key;
        const retryKey = JSON.parse(fetchSpy.mock.calls[1][1].body as string).idempotency_key;
        expect(retryKey).toBe(firstKey);

        fireEvent.change(screen.getByLabelText('Receiving office'), { target: { value: 'Punong Barangay' } });
        fireEvent.click(screen.getByRole('button', { name: 'Prepare handoff packet' }));
        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
        await waitFor(() => expect(router.reload).toHaveBeenCalledTimes(2));
        const changedIntentKey = JSON.parse(fetchSpy.mock.calls[2][1].body as string).idempotency_key;
        expect(changedIntentKey).not.toBe(firstKey);

        fireEvent.click(screen.getByRole('button', { name: 'Prepare handoff packet' }));
        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(4));
        const postAcknowledgementKey = JSON.parse(fetchSpy.mock.calls[3][1].body as string).idempotency_key;
        expect(postAcknowledgementKey).not.toBe(changedIntentKey);


    });
    it('keeps exact-hold release approval available on a closed case when placement is denied', async () => {
        authorizeBrowserRequests();
        const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ approval_id: 'release-closed-32' }));
        vi.stubGlobal('fetch', fetchSpy);
        const closedCase = {
            ...governance,
            case: { ...governance.case, status: 'closed' },
            permissions: { ...governance.permissions, can_request_hold: false, can_request_release: true },
        } as GovernanceWorkspace;
        render(<GovernancePanel caseId="case-32" governance={closedCase} />);

        expect(screen.getByLabelText('Hold command')).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Hold command'), { target: { value: 'administrative_hold.release' } });
        fireEvent.change(screen.getByLabelText('Active hold'), { target: { value: 'hold-32' } });
        fireEvent.change(screen.getByLabelText('Designated checker'), { target: { value: 'staff-checker' } });
        fireEvent.change(screen.getByLabelText('Reason category'), { target: { value: 'legal' } });
        fireEvent.change(screen.getByLabelText('Hold reason'), { target: { value: 'Closed-case hold is independently releasable.' } });
        fireEvent.change(screen.getByLabelText('Release conditions'), { target: { value: 'Native hold review complete' } });
        fireEvent.click(screen.getByRole('button', { name: 'Request release approval' }));
        await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/admin/command-approvals', expect.any(Object)));
        expect(JSON.parse(fetchSpy.mock.calls[0][1].body as string)).toMatchObject({
            command_type: 'administrative_hold.release',
            hold_id: 'hold-32',
            expected_hold_version: 2,
            target_id: 'obl-32',
            expected_target_version: 5,
        });
        expect(screen.queryByLabelText('Hold target')).toBeNull();
    });
});
