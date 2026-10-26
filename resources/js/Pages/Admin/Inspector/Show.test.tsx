import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { router } from '@inertiajs/react';
import type { ComponentType } from 'react';

import InspectorShow from './Show';
import type { InspectorPageProps } from '@/types/admin-workspace';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
    router: { visit: vi.fn(), reload: vi.fn(), post: vi.fn() },
}));
vi.mock('@/layouts/AdminLayout', () => ({
    AdminLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.head.querySelector('meta[name="csrf-token"]')?.remove();
    vi.clearAllMocks();
});

const props: InspectorPageProps = {
    workspace: null,
    query_ref: 'REF-DOES-NOT-EXIST',
    staffContext: {
        operator: { id: 'staff-31', display_name: 'Assigned Operator', roles: ['admin'] },
        environment: 'testing',
        cohort: { selected: null, options: [] },
    },
};

describe('Universal record workspace', () => {
    it('shows the unknown server reference without substituting a demo order', () => {
        const Page = InspectorShow as ComponentType<InspectorPageProps>;
        render(<Page {...props} />);

        expect(screen.getByText('REF-DOES-NOT-EXIST')).toBeTruthy();
        expect(screen.queryByText('ORD-2026-09')).toBeNull();
    });
    it('renders the independent server rails, responsibility, and permitted case conversation', () => {
        const Page = InspectorShow as ComponentType<InspectorPageProps>;
        render(<Page {...props} workspace={{
            id: 'order-31',
            kind: 'order',
            reference: 'ORD-31',
            title: 'Persisted order title',
            version: 2,
            facts: [],
            listing_details: null,
            rails: {
                agreement: { state: 'accepted', label: 'Accepted', reference: 'ORD-31', facts: [{ label: 'Terms', value: 'Locked' }] },
                work: { state: 'in_progress', label: 'In progress', facts: [{ label: 'Milestone', value: 'Arrival' }] },
                payment: { state: 'held', label: 'Held', reference: 'OBL-31', facts: [{ label: 'Lane', value: 'External cash · non-custodial' }] },
                case: [{ id: 'case-31', reference: 'CASE-31', title: 'Support case', state: 'open', label: 'Open', facts: [{ label: 'Assigned to', value: 'Staff queue' }] }],
            },
            stock: null,
            siblings: [{ id: 'chain-31', kind: 'deal_chain', reference: 'DC-31', title: 'Current chain', state: 'active', inspect_url: '/admin/inspect?ref=DC-31' }],
            responsibility: { party: 'staff', user_id: null, label: 'Unassigned staff' },
            evidence: [],
            conversations: [{
                id: 'case-conversation-31',
                title: 'Case conversation',
                participant_label: 'Participants and assigned staff',
                messages: [{
                    id: 'message-31',
                    author_label: 'Assigned Operator',
                    body: 'Staff-authorized case note.',
                    created_at: '2026-10-26T08:30:00Z',
                    visibility: 'staff_internal',
                }],
            }],
            audit: [],
            actions: {
                assign: { enabled: false, reason: 'Assignment controls are not available yet.' },
                resolve: { enabled: false, reason: 'Case resolution is not available yet.' },
                hold: { enabled: false, reason: 'Hold controls are not available yet.' },
            },
        }} />);

        expect(screen.getAllByText(/^accepted$/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/^in progress$/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/^held$/i).length).toBeGreaterThan(0);
        expect(screen.getByText('Unassigned staff')).toBeTruthy();
        expect(screen.getByText('Current chain')).toBeTruthy();
        expect(screen.getByText('Staff-authorized case note.')).toBeTruthy();
    });
    it('submits only a server-authorized identity decision and rejection reason', async () => {
        const fetchSpy = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: { status: 'rejected' } }),
        });
        vi.stubGlobal('fetch', fetchSpy);
        const csrfMeta = document.createElement('meta');
        csrfMeta.name = 'csrf-token';
        csrfMeta.content = 'test-token';
        document.head.append(csrfMeta);
        const Page = InspectorShow as ComponentType<InspectorPageProps>;
        const identityProps = {
            ...props,
            query_ref: 'IDV-SERVER-31',
            workspace: {
                id: 'verification-31',
                kind: 'identity_verification',
                reference: 'IDV-SERVER-31',
                title: 'Persisted identity verification',
                version: 1,
                facts: [],
                listing_details: null,
                rails: {
                    agreement: null,
                    work: null,
                    payment: null,
                    case: [{
                        id: 'verification-31',
                        reference: 'IDV-SERVER-31',
                        title: 'Identity verification',
                        state: 'pending',
                        label: 'Pending review',
                        facts: [],
                    }],
                },
                stock: null,
                siblings: [],
                responsibility: { party: 'staff', user_id: null, label: 'Reviewer decision required' },
                evidence: [],
                conversations: [],
                audit: [],
                actions: {
                    identity_review: {
                        can_review: true,
                        method: 'POST',
                        review_url: '/admin/identity-verifications/verification-31/review',
                        body_fields: ['decision', 'reason'],
                        decisions: ['approve', 'reject'],
                        rejection_reasons: ['DOCUMENT_UNREADABLE'],
                    },
                },
            },
        } as unknown as InspectorPageProps;
        render(<Page {...identityProps} />);

        fireEvent.change(screen.getByLabelText('Rejection reason'), { target: { value: 'DOCUMENT_UNREADABLE' } });
        fireEvent.click(screen.getByRole('button', { name: 'Reject verification' }));

        await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
            '/admin/identity-verifications/verification-31/review',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ decision: 'reject', reason: 'DOCUMENT_UNREADABLE' }),
            }),
        ));
        expect(router.reload).toHaveBeenCalled();
    });
    it('renders the current listing details before review decisions', () => {
        const Page = InspectorShow as ComponentType<InspectorPageProps>;
        const workspace = {
            id: 'listing-31',
            kind: 'listing',
            reference: 'LST-31',
            title: 'Current listing for staff review',
            version: 4,
            facts: [],
            listing_details: {
                description: 'A current-version public description.',
                listing_type: 'service',
                price_amount_minor: 42500,
                currency: 'PHP',
                work_shape: 'milestone',
                work_specification: { nodes: [{
                    id: 'inspect',
                    ordinal: 1,
                    title: 'Inspect the site',
                    description: 'Check sound and safe operation.',
                    duration_label: '30 min',
                    control_mode: 'customer_confirm', approval_method: 'app_confirm',
                    checklist_items: [{ id: 'noise-check', label: 'Check for unusual noise', required: true }],
                    metric_requirements: [{ id: 'temperature', name: 'Surface temperature', unit: '°C', required: true, target: 24 }],
                }] },
                media: {
                    cover_thumbnail_url: '/storage/listing-photo-31.jpg',
                    items: [
                        { id: 'media-31', kind: 'photo', url: '/storage/listing-photo-31.jpg', caption: 'Equipment on site', is_cover: true },
                        { id: 'video-31', kind: 'video', url: '/storage/listing-walkthrough.mp4', mime_type: 'video/mp4', caption: 'Walkthrough video' },
                    ],
                },
                variants: [{ id: 'variant-31', name: 'Standard visit', price: 425 }],
                prep_lead_time: 'next_day',
                deal_chain_combinations: [{
                    id: 'combo-fit',
                    title: 'Repair and fitting',
                    nodes: [{ id: 'slot-rider', role: 'delivery', title: 'Local rider', sub: 'Active rider listing' }],
                }],
                deal_chain_specification: { based_on_recipe_code: 'turnkey_parts', based_on_catalog_version: 1 },
            },
            rails: { agreement: null, work: null, payment: null, case: [] },
            stock: null,
            siblings: [],
            responsibility: { party: 'staff', user_id: null, label: 'Unassigned staff' },
            evidence: [],
            conversations: [],
            audit: [],
            actions: {
                listing_review: {
                    can_approve: true,
                    can_reject: true,
                    expected_version: 4,
                    approve_url: '/admin/listings/listing-31/approve',
                    reject_url: '/admin/listings/listing-31/reject',
                },
            },
        } as unknown as InspectorPageProps['workspace'];
        render(<Page {...props} query_ref="LST-31" workspace={workspace} />);

        expect(screen.getByText('A current-version public description.')).toBeTruthy();
        expect(screen.getByText('Inspect the site')).toBeTruthy();
        expect(screen.getByText('30 min')).toBeTruthy();
        const listedAmount = screen.getByText('Listed amount');
        expect(listedAmount.parentElement?.textContent).toContain('PHP 425.00');
        expect(screen.getByText('Standard visit')).toBeTruthy();
        expect(screen.getByText('Standard visit').parentElement?.textContent).toContain('PHP 425.00');
        expect(screen.getByText('Equipment on site')).toBeTruthy();
        expect(screen.getByText('Repair and fitting')).toBeTruthy();
        expect(screen.getByText(/Active rider listing/)).toBeTruthy();
        const video = screen.getByLabelText('Walkthrough video');
        expect(video.tagName).toBe('VIDEO');
        expect(video.hasAttribute('controls')).toBe(true);
        fireEvent.click(screen.getByText('Full authored work specification'));
        expect(screen.getByText(/Check for unusual noise/)).toBeTruthy();
        expect(screen.getByText(/Surface temperature/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Reject listing' }).hasAttribute('disabled')).toBe(true);
    });

    it('renders generic server-provided account facts on the user record', () => {
        const Page = InspectorShow as ComponentType<InspectorPageProps>;
        const workspace = {
            id: 'user-31',
            kind: 'user',
            reference: 'USR-31',
            title: 'Persisted account record',
            version: null,
            facts: [
                { label: 'Account state', value: 'active' },
                { label: 'Roles', value: 'provider, buyer' },
                { label: 'Verification', value: 'verified' },
            ],
            listing_details: null,
            rails: { agreement: null, work: null, payment: null, case: [] },
            stock: null,
            siblings: [],
            responsibility: { party: 'none', user_id: null, label: 'No current responsibility' },
            evidence: [],
            conversations: [],
            audit: [],
            actions: {},
        } as unknown as InspectorPageProps['workspace'];
        render(<Page {...props} query_ref="USR-31" workspace={workspace} />);

        expect(screen.getByText('Account state')).toBeTruthy();
        expect(screen.getByText('active')).toBeTruthy();
        expect(screen.getByText('provider, buyer')).toBeTruthy();
        expect(screen.getByText('verified')).toBeTruthy();
    });

    it('submits listing rejection through its authorized redirect endpoint with the expected version', () => {
        const Page = InspectorShow as ComponentType<InspectorPageProps>;
        const workspace = {
            id: 'listing-32',
            kind: 'listing',
            reference: 'LST-32',
            title: 'Reviewable listing',
            version: 7,
            facts: [],
            listing_details: null,
            rails: { agreement: null, work: null, payment: null, case: [] },
            stock: null,
            siblings: [],
            responsibility: { party: 'staff', user_id: null, label: 'Unassigned staff' },
            evidence: [],
            conversations: [],
            audit: [],
            actions: {
                listing_review: {
                    can_approve: true,
                    can_reject: true,
                    expected_version: 7,
                    approve_url: '/admin/listings/listing-32/approve',
                    reject_url: '/admin/listings/listing-32/reject',
                },
            },
        } as unknown as InspectorPageProps['workspace'];
        render(<Page {...props} query_ref="LST-32" workspace={workspace} />);

        fireEvent.change(screen.getByLabelText('Listing rejection reason'), { target: { value: 'Missing required details' } });
        const rejectButton = screen.getByRole('button', { name: 'Reject listing' });
        fireEvent.click(rejectButton);

        expect(router.post).toHaveBeenCalledWith(
            '/admin/listings/listing-32/reject',
            { expected_version: 7, reason: 'Missing required details' },
            expect.objectContaining({ preserveScroll: true }),
        );
        // The Inertia mock exposes its submitted callbacks for exercising server validation responses.
        const mockedPost = router.post as unknown as {
            mock: {
                calls: Array<[unknown, unknown, {
                    onStart?: () => void;
                    onError?: (errors: Record<string, string>) => void;
                    onFinish?: () => void;
                }]>;
            };
        };
        const requestOptions = mockedPost.mock.calls[0][2];
        act(() => requestOptions.onStart?.());
        expect(rejectButton.hasAttribute('disabled')).toBe(true);
        act(() => requestOptions.onError?.({ reason: 'The listing rejection reason was not accepted.' }));
        expect(screen.getByRole('alert').textContent).toBe('The listing rejection reason was not accepted.');
        expect((screen.getByLabelText('Listing rejection reason') as HTMLInputElement).value).toBe('Missing required details');
        act(() => requestOptions.onFinish?.());
    });

    it('renders backed governance controls only for the actual case workspace', () => {
        const Page = InspectorShow as ComponentType<InspectorPageProps>;
        const workspace: NonNullable<InspectorPageProps['workspace']> = {
            id: 'case-33',
            kind: 'case',
            reference: 'CASE-33',
            title: 'Support case',
            version: 4,
            facts: [],
            listing_details: null,
            rails: { agreement: null, work: null, payment: null, case: [] },
            stock: null,
            siblings: [],
            responsibility: { party: 'staff', user_id: 'staff-33', label: 'Assigned staff' },
            evidence: [],
            conversations: [],
            audit: [],
            actions: {},
            governance: {
                actor_user_id: 'staff-33',
                case: { id: 'case-33', reference: 'CASE-33', version: 4, status: 'open', assigned_user_id: 'staff-33', responsibility_party: 'staff' },
                eligible_staff: [{ id: 'staff-33', display_name: 'Assigned Staff', roles: ['operate'] }],
                targets: [],
                holds: [],
                approvals: [],
                packets: [],
                available_exhibits: [],
                excluded_exhibits: [],
                permissions: { can_assign: false, can_resolve: false, can_request_hold: false, can_request_release: false },
            },
        };

        const { rerender } = render(<Page {...props} query_ref="CASE-33" workspace={workspace} />);
        expect(screen.getByText('Case governance · CASE-33')).toBeTruthy();
        expect(screen.getByText(/evidentiary custodian, not a judicial authority/)).toBeTruthy();

        rerender(<Page {...props} query_ref="ORD-33" workspace={{ ...workspace, kind: 'order' }} />);
        expect(screen.queryByText('Case governance · CASE-33')).toBeNull();
    });
});