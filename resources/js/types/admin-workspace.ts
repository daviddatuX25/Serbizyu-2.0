import type { ListingRecord, WorkNodeRecord } from '@/types';

export type Paginated<T> = {
    data: T[];
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
};

export type StaffContext = {
    operator: {
        id: string;
        display_name: string;
        roles: string[];
    };
    environment: string;
    cohort: {
        selected: string | null;
        options: string[];
    };
};

export type StaffInboxView =
    | 'all_open'
    | 'assigned_to_me'
    | 'waiting_on_me'
    | 'waiting_on_others'
    | 'closed';

export type StaffInboxFilters = {
    view: StaffInboxView;
    q: string | null;
    status: string | null;
    category: string | null;
    cohort: string | null;
    assignee: string | null;
    page: number;
};

export type StaffInboxViews = Record<StaffInboxView, number>;

export type StaffInboxRow = {
    id: string;
    reference: string;
    kind: string;
    title: string;
    status: string;
    severity: string | null;
    assigned_to: { id: string; display_name: string } | null;
    responsibility: Responsibility;
    opened_at: string;
    updated_at: string;
    first_response_due_at: string | null;
    resolution_due_at: string | null;
    cohort: string;
    inspect_url: string;
};

export type Fact = { label: string; value: string | number | boolean | null };

export type WorkspaceRail = {
    state: string;
    label: string;
    reference?: string;
    facts: Fact[];
};

export type CaseRail = WorkspaceRail & {
    id: string;
    reference: string;
    title: string;
};

export type StockFacts = {
    state: string;
    label: string;
    facts: Fact[];
};

export type SiblingFacts = {
    id: string;
    kind: string;
    reference: string;
    title: string;
    state: string;
    inspect_url: string;
};

export type Responsibility = {
    party: 'staff' | 'participant' | 'none';
    user_id: string | null;
    label: string;
};

export type SafeEvidence = {
    id: string;
    label: string;
    kind: string;
    status: string;
    created_at: string | null;
};

export type SafeCaseConversation = {
    id: string;
    title: string;
    participant_label: string;
    messages: Array<{
        id: string;
        author_label: string;
        body: string;
        created_at: string;
        visibility: 'participant' | 'staff_internal';
    }>;
};

export type SafeAudit = {
    id: string;
    event: string;
    actor_label: string;
    created_at: string;
    facts: Fact[];
};

export type WorkspaceCommandAvailability = {
    enabled: boolean;
    reason: string | null;
};

export type IdentityReviewAction = {
    can_review: boolean;
    method: 'POST';
    review_url: string;
    body_fields: ['decision', 'reason'];
    decisions: Array<'approve' | 'reject'>;
    rejection_reasons: string[];
};
export type BackedActions = {
    assign?: WorkspaceCommandAvailability;
    resolve?: WorkspaceCommandAvailability;
    hold?: WorkspaceCommandAvailability;
    identity_review?: IdentityReviewAction | null;
    listing_review?: RegistryModeration | null;
};

export type ListingReviewDetails = Omit<
    Pick<
        ListingRecord,
        | 'description'
        | 'listing_type'
        | 'price_amount_minor'
        | 'currency'
        | 'work_shape'
        | 'work_specification'
        | 'media'
        | 'variants'
        | 'prep_lead_time'
        | 'deal_chain_combinations'
        | 'deal_chain_specification'
    >,
    'work_specification'
> & {
    work_specification?: (
        Omit<NonNullable<ListingRecord['work_specification']>, 'nodes'>
        & { nodes?: Array<Partial<WorkNodeRecord>> }
    ) | null;
};

export type GovernanceTarget = {
    kind: 'order' | 'work_instance' | 'payment_obligation';
    id: string;
    label: string;
    version: number;
};

export type GovernanceHold = {
    id: string;
    target_kind: GovernanceTarget['kind'];
    target_id: string;
    status: string;
    version: number;
    reason_class: string;
    reason: string;
    created_at: string;
    released_at: string | null;
};

export type GovernanceCommandPayload = {
    case_id: string;
    command_type: 'administrative_hold.place' | 'administrative_hold.release';
    checker_user_id: string;
    target_kind: GovernanceTarget['kind'];
    target_id: string;
    expected_target_version: number;
    reason_class: string;
    reason: string;
    idempotency_key: string;
    hold_id?: string;
    expected_hold_version?: number;
    release_conditions?: string[];
};

export type GovernanceApproval = {
    id: string;
    command_type: GovernanceCommandPayload['command_type'];
    status: string;
    maker_user_id: string;
    checker_user_id: string;
    payload_hash: string;
    expires_at: string;
    case_id: string;
    command_payload: GovernanceCommandPayload;
    can_approve: boolean;
    can_execute: boolean;
};

export type LuponPacketArtifact = {
    id: string;
    kind: string;
    filename: string;
    media_type: string;
    size_bytes: number;
    sha256: string;
    metadata: { format: string; [key: string]: unknown };
    download_url: string;
};

export type LuponPacket = {
    id: string;
    case_id: string;
    version: number;
    status: string;
    recipient: string | null;
    transmitted_at: string | null;
    returned_at: string | null;
    return_kind: 'signed_kasunduan' | 'katibayan' | null;
    returned_evidence_file_id: string | null;
    returned_paper_download_url: string | null;
    returned_paper_scan_status: string | null;
    returned_paper_integrity_ok: boolean;
    cabinet_code: string | null;
    archived_at: string | null;
    active_case_holds: number;
    archive_eligible: boolean;
    artifacts: LuponPacketArtifact[];
    exhibits: LuponPacketExhibit[];
    excluded_exhibits: LuponExcludedExhibit[];
};

export type LuponPacketExhibit = {
    evidence_file_id: string;
    filename: string;
    media_type: string;
    size_bytes: number;
    sha256: string;
    evidence_type: string;
    created_at: string | null;
    exif: {
        status: 'present' | 'absent' | 'unreadable' | 'not_applicable';
        timestamps: string[];
        reason: string | null;
    };
};

export type LuponExcludedExhibit = {
    id: string;
    reason: string;
};

export type LuponExhibit = {
    id: string;
    name: string;
    media_type: string;
    size_bytes: number;
    sha256: string;
    evidence_type: string;
    created_at: string | null;
};

export type GovernanceWorkspace = {
    actor_user_id: string;
    case: {
        id: string;
        reference: string;
        version: number;
        status: string;
        assigned_user_id: string | null;
        responsibility_party: string;
    };
    eligible_staff: Array<{ id: string; display_name: string; roles: string[] }>;
    targets: GovernanceTarget[];
    holds: GovernanceHold[];
    approvals: GovernanceApproval[];
    packets: LuponPacket[];
    available_exhibits: LuponExhibit[];
    excluded_exhibits: LuponExcludedExhibit[];
    permissions: {
        can_assign: boolean;
        can_resolve: boolean;
        can_request_hold: boolean;
        can_request_release: boolean;
    };
};

export type InspectorWorkspace = {
    id: string;
    kind: string;
    reference: string;
    title: string;
    version: string | number | null;
    facts: Fact[];
    listing_details: ListingReviewDetails | null;
    rails: {
        agreement: WorkspaceRail | null;
        work: WorkspaceRail | null;
        payment: WorkspaceRail | null;
        case: CaseRail[];
    };
    stock: StockFacts | null;
    siblings: SiblingFacts[];
    responsibility: Responsibility;
    evidence: SafeEvidence[];
    conversations: SafeCaseConversation[];
    audit: SafeAudit[];
    actions: BackedActions;
    governance?: GovernanceWorkspace | null;
};


export type TriagePageProps = {
    inbox: Paginated<StaffInboxRow>;
    views: StaffInboxViews;
    filters: StaffInboxFilters;
    staffContext: StaffContext;
};

export type InspectorPageProps = {
    workspace: InspectorWorkspace | null;
    query_ref: string;
    staffContext: StaffContext;
};

export type RegistryKind =
    | 'orders'
    | 'financials'
    | 'disputes'
    | 'listings'
    | 'users'
    | 'tenders'
    | 'telemetry';

export type RegistryModeration = {
    can_approve: boolean;
    can_reject: boolean;
    expected_version: number;
    approve_url: string;
    reject_url: string;
};

export type RegistryRow = {
    id: string;
    reference: string;
    kind: string;
    title: string;
    status: string;
    summary: string;
    updated_at: string;
    cohort: string;
    inspect_url: string;
    facts: Fact[];
    moderation?: RegistryModeration | null;
};

export type RegistryFilters = {
    q: string | null;
    status: string | null;
    category: string | null;
    cohort: string | null;
    assignee: string | null;
    page: number;
    per_page: number;
};

export type RegistryMetrics = Record<string, number | string | null>;

export type RegistryReadModel = {
    kind: RegistryKind;
    rows: Paginated<RegistryRow>;
    filters: RegistryFilters;
    metrics?: RegistryMetrics;
};

export type RegistryPageProps = {
    registry: RegistryReadModel;
    staffContext: StaffContext;
};