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
    addons?: ListingAddonRecord[];
    partner_candidates?: PartnerCandidateRecord[];
    catalog_source?: string | null;
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

export type WorkCatalogRecord = {
    id: string;
    catalog_code: string;
    work_shape: string;
    shape_contract_version: number;
    payload_schema_version: number;
    catalog_version: number;
    title: string;
    summary: string;
    status: string;
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
