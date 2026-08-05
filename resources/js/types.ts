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
    blockers?: string[];
    nextRoute?: string | null;
};

export type ListingRecord = {
    id: string;
    title: string;
    description?: string | null;
    categoryCode?: string | null;
    category_code?: string | null;
    listingType?: string | null;
    listing_type?: string | null;
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
    demoNotice?: string | null;
    readiness?: ReadinessState | null;
    draft?: ListingDraft | null;
    publicListings?: ListingRecord[];
    activeListingDetail?: ListingRecord | null;
    myListings?: ListingRecord[];
    denial?: DenialState | null;
    pageMode?: 'home' | 'browse' | 'detail' | 'listings';
    experience?: 'legacy_slice' | 'foundation_v1' | string;
};
