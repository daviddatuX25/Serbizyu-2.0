import type { PageProps } from '@inertiajs/core';

export type EnvironmentSummary = {
    environment: string;
    providers: Record<string, { mode: string; enabled: boolean }>;
};

export type ListingLifecycle =
    | 'draft'
    | 'pending_review'
    | 'active'
    | 'paused'
    | 'unavailable'
    | 'expired'
    | 'archived'
    | 'rejected'
    | string;

export type SliceSession = {
    authenticated?: boolean;
    isAuthenticated?: boolean;
    userId?: string | null;
    fixtureIdentifier?: string | null;
    fixture_identifier?: string | null;
    source?: string | null;
    status?: string | null;
    challengeRequired?: boolean;
    challenge_required?: boolean;
    challengeId?: string | null;
    expiresAt?: string | null;
    phone?: string | null;
    displayName?: string | null;
    display_name?: string | null;
};

export type ReadinessState = {
    status?: string | null;
    ready?: boolean;
    providerIntent?: boolean;
    provider_intent?: boolean;
    displayName?: string | null;
    display_name?: string | null;
    area?: string | null;
    areaCode?: string | null;
    area_code?: string | null;
    language?: string | null;
    languageCode?: string | null;
    language_code?: string | null;
    lowDataMode?: boolean;
    low_data_mode?: boolean;
    helpPreference?: string | null;
    help_preference?: string | null;
    emailAttached?: boolean;
    email_attached?: boolean;
    passwordSet?: boolean;
    password_set?: boolean;
    blockers?: string[];
    nextRoute?: string | null;
};

export type PackageTierRecord = {
    id: string;
    title: string;
    price: number;
    orig_price?: number;
    origPrice?: number;
    sub: string;
    inclusions: string[];
};

export type MilestoneStageRecord = {
    id?: string;
    title?: string;
    label?: string;
    description?: string;
    sub?: string;
    state?: string;
};

export type ListingMediaItem = {
    id: string;
    kind: 'photo' | 'video';
    url: string;
    thumbnail_url?: string | null;
    caption?: string | null;
    mime_type?: string | null;
    size_bytes?: number | null;
    is_cover?: boolean;
};

export type ListingMedia = {
    cover_thumbnail_url?: string | null;
    has_video?: boolean;
    items: ListingMediaItem[];
};

export type ListingRecord = {
    id: string;
    title: string;
    description?: string | null;
    categoryCode?: string | null;
    category_code?: string | null;
    listingType?: string | null;
    listing_type?: string | null;
    workShape?: string | null;
    work_shape?: string | null;
    state?: ListingLifecycle | null;
    status?: ListingLifecycle | null;
    review_status?: string | null;
    reviewStatus?: string | null;
    version?: number | null;
    expectedVersion?: number | null;
    expected_version?: number | null;
    area?: string | null;
    locality?: string | null;
    stall_location?: string | null;
    stallLocation?: string | null;
    geography?: Record<string, unknown> | null;
    ownerName?: string | null;
    owner_name?: string | null;
    owner?: { displayName?: string | null; display_name?: string | null } | null;
    public?: boolean;
    fixture_key?: string | null;
    price_amount_minor?: number | null;
    currency?: string | null;
    capacity_summary?: string | null;
    package_tiers?: PackageTierRecord[];
    packageTiers?: PackageTierRecord[];
    milestone_stages?: MilestoneStageRecord[];
    milestoneStages?: MilestoneStageRecord[];
    work_catalog?: WorkCatalogReference | null;
    work_catalog_code?: string | null;
    workCatalogCode?: string | null;
    work_set_version?: number | null;
    workSetVersion?: number | null;
    pricing_mode?: string | null;
    pricingMode?: string | null;
    inclusions?: string[] | null;
    variants?: Array<Record<string, unknown>> | null;
    addons?: ListingAddonRecord[];
    partner_candidates?: PartnerCandidateRecord[];
    catalog_source?: string | null;
    cover_thumbnail_url?: string | null;
    has_video?: boolean;
    media?: ListingMedia | null;
    work_specification?: Record<string, unknown> | null;
    deal_chain_combinations?: Array<Record<string, unknown>>;
    deal_chain_specification?: Record<string, unknown> | null;
    terms?: Record<string, unknown> | null;
    prep_lead_time?: 'in_stock' | 'same_day' | 'next_day' | string | null;
    prepLeadTime?: 'in_stock' | 'same_day' | 'next_day' | string | null;
};

export type WorkCatalogReference = {
    code: string;
    shape_contract_version: number;
    payload_schema_version: number;
    catalog_version: number;
};

export type ListingAddonRecord = {
    id: string;
    code: string;
    title: string;
    description: string;
    price_amount_minor: number;
    currency: string;
    partner_role: 'courier' | 'technician' | 'store' | 'auditor';
    partner_fixture_keys: string[];
    status: 'available' | 'unavailable' | string;
    settlement_mode: 'independent_provider_agreement' | string;
};

export type PartnerCandidateRecord = {
    id: string;
    role: 'courier' | 'technician' | 'store' | 'auditor';
    name: string;
    sub: string;
    fee_amount_minor: number;
    category: string;
    icon: 'truck' | 'labor' | 'store' | 'audit';
    listing_fixture_key?: string | null;
};

export type DealChainCatalogRecord = {
    recipeId: string;
    pattern: string;
    patternCapsule: string[];
    title: string;
    extraFee: number;
    rating: string;
    bookedCount: string;
    desc: string;
    applicableCategories: string[];
    applicableListingTypes?: string[];
    applicableWorkShapes?: string[];
    nodes: Array<{
        role: string;
        title: string;
        sub: string;
        type: 'store' | 'delivery' | 'labor' | 'audit';
    }>;
};

export type WorkNodeRecord = {
    id: string;
    ordinal: number;
    title: string;
    description: string;
    node_kind: 'checkin_intake' | 'execution_proof' | 'decision_gate' | 'handoff_ready' | 'final_signoff' | string;
    evidence_type: 'photo_required' | 'video_required' | 'meter_log' | 'receipt_upload' | 'dual_sign' | string;
    evidence_description: string;
    control_mode: 'provider_advance' | 'customer_confirm' | 'counterparty_handoff' | string;
    mandatory: boolean;
    duration_label?: string | null;
    status?: 'active' | 'completed' | 'locked' | 'awaiting_customer_confirmation' | string;
    completed_at?: string | null;
    customer_confirmed_at?: string | null;
    evidence_payload?: Record<string, unknown> | null;
};

export type WorkCatalogRecord = {
    id: string;
    catalog_code: string;
    signature_hash?: string;
    work_shape: string;
    shape_contract_version: number;
    payload_schema_version: number;
    catalog_version: number;
    title: string;
    summary: string;
    status: string;
    category_codes?: string[];
    listing_types?: string[];
    total_adopted_count?: number;
    variance_threshold_percent: number;
    evaluation_window_hours: number;
    steps: Array<Record<string, unknown>>;
    observed_variations: Array<Record<string, unknown>>;
};

export type ListingDraft = ListingRecord & {
    title: string;
    description: string;
    categoryCode?: string | null;
    category_code?: string | null;
    listingType?: string | null;
    listing_type?: string | null;
};

export type DenialState = {
    code?: string | null;
    message: string;
    correlationId?: string | null;
    correlation_id?: string | null;
    recovery?: string | null;
};

export type HomeProps = PageProps & {
    app?: {
        name: string;
        environment: string;
        stage: string;
    };
    runtime?: EnvironmentSummary;
    correlationId?: string | null;
    scope?: {
        productFeatures: boolean;
        externalProviders: boolean;
        schemaMigrations: boolean;
    };
    session?: SliceSession | null;
    temporaryOtpPreview?: {
        code: string;
        expires_in_seconds: number;
        delivered_at?: string;
    };
    devMode?: boolean;
    demoNotice?: string | null;
    readiness?: ReadinessState | null;
    draft?: ListingDraft | null;
    publicListings?: ListingRecord[];
    communityRequests?: Array<{
        id: string;
        title: string;
        description: string;
        photo?: string | null;
        budget_amount_minor?: number | null;
        currency: string;
        urgency: string;
        area: string;
        requester_name: string;
        quotes_count: number;
        created_at: string;
    }>;
    activeListingDetail?: ListingRecord | null;
    dealChainCatalog?: DealChainCatalogRecord[];
    workCatalog?: WorkCatalogRecord[];
    booking?: {
        direct_booking_enabled?: boolean;
        can_propose?: boolean;
        requires_auth?: boolean;
        is_owner?: boolean;
        expected_listing_version?: number;
        default_amount_minor?: number | null;
        currency?: string;
        start_url?: string;
    } | null;
    myListings?: ListingRecord[];
    denial?: DenialState | null;
    pageMode?: 'home' | 'browse' | 'detail' | 'listings';
    experience?: 'legacy_slice' | 'foundation_v1' | string;
};
