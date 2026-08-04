import { Link, router } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
import ProductExperience from './ProductExperience';

import type {
    DenialState,
    HomeProps,
    ListingDraft,
    ListingRecord,
    ReadinessState,
    SliceSession,
} from '../types';

type ActionName =
    'login' | 'challenge' | 'onboarding' | 'create' | 'save' | 'submit' | 'denial' | null;

type ListingFields = {
    title: string;
    description: string;
    category_code: string;
    listing_type: string;
};

type ErrorBag = Record<string, unknown>;

type SubmissionIntent = {
    key: string;
    expectedVersion: number;
};

const DEFAULT_DEMO_NOTICE = 'Demo only — no SMS was sent';
const DEFAULT_READINESS: ReadinessState = {
    status: 'not_started',
    providerIntent: true,
    area: 'Tagudin',
    languageCode: 'fil',
    lowDataMode: false,
};

function isAuthenticated(session: SliceSession | null | undefined): boolean {
    return Boolean(session?.authenticated ?? session?.isAuthenticated ?? session?.userId);
}

function isChallengePending(session: SliceSession | null | undefined): boolean {
    const status = session?.status?.toLowerCase();
    return Boolean(
        session?.challengeRequired ??
        session?.challenge_required ??
        (status === 'challenge_pending' || status === 'challenge_required'),
    );
}

function isReady(readiness: ReadinessState | null | undefined): boolean {
    const status = readiness?.status?.toLowerCase();
    return Boolean(
        readiness?.ready || status === 'ready' || status === 'complete' || status === 'completed',
    );
}

function providerIntent(readiness: ReadinessState | null | undefined): boolean {
    return Boolean(readiness?.providerIntent ?? readiness?.provider_intent ?? false);
}

function listingState(listing: ListingRecord | null | undefined): string {
    return String(listing?.state ?? listing?.status ?? 'unknown').toLowerCase();
}

function isActiveListing(listing: ListingRecord): boolean {
    return listingState(listing) === 'active' && listing.public !== false;
}

function listingVersion(listing: ListingRecord | null | undefined): number {
    return Number(listing?.expectedVersion ?? listing?.expected_version ?? listing?.version ?? 1);
}

function listingType(listing: ListingRecord | null | undefined): string {
    return String(listing?.listingType ?? listing?.listing_type ?? 'service');
}

function categoryCode(listing: ListingRecord | null | undefined): string {
    return String(listing?.categoryCode ?? listing?.category_code ?? '');
}

function ownerName(listing: ListingRecord): string | null {
    return (
        listing.ownerName ??
        listing.owner_name ??
        listing.owner?.displayName ??
        listing.owner?.display_name ??
        null
    );
}

function fixtureIdentifier(session: SliceSession | null | undefined): string {
    return String(session?.fixtureIdentifier ?? session?.fixture_identifier ?? '');
}

function fieldValue(errors: ErrorBag, key: string): string | null {
    const value = errors[key];
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string').join(' ');
    }
    return typeof value === 'string' ? value : null;
}

function summarizeErrors(errors: ErrorBag): string {
    const messages = Object.entries(errors).flatMap(([key, value]) => {
        if (key === 'correlation_id' || key === 'correlationId') {
            return [];
        }
        if (Array.isArray(value)) {
            return value.filter((item): item is string => typeof item === 'string');
        }
        return typeof value === 'string' ? [value] : [];
    });
    return (
        messages.join(' ') ||
        'The server could not complete that request. Review the fields and try again.'
    );
}

function errorCorrelationId(errors: ErrorBag): string | null {
    const value = errors.correlation_id ?? errors.correlationId;
    if (Array.isArray(value)) {
        const correlationId = value.find((item): item is string => typeof item === 'string');
        return correlationId ?? null;
    }
    return typeof value === 'string' ? value : null;
}

function idempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `slice-${Date.now()}`;
}

export function submissionIntentForVersion(
    intent: SubmissionIntent | null,
    expectedVersion: number,
    createKey: () => string,
): SubmissionIntent {
    if (intent?.expectedVersion === expectedVersion) {
        return intent;
    }

    return { key: createKey(), expectedVersion };
}

function StatusPill({ state }: { state: string }) {
    const label = state === 'pending_review' ? 'Pending review' : state.replaceAll('_', ' ');
    return <span className={`status-pill status-${state}`}>{label}</span>;
}

function ActionFeedback({
    error,
    success,
    correlationId,
}: {
    error: string | null;
    success: string | null;
    correlationId: string | null;
}) {
    if (!error && !success) {
        return null;
    }

    return (
        <div
            className={`feedback ${error ? 'feedback-error' : 'feedback-success'}`}
            role={error ? 'alert' : 'status'}
        >
            <strong>{error ? 'Needs attention' : 'Saved'}</strong>
            <span>{error ?? success}</span>
            {correlationId ? (
                <span className="feedback-correlation">Reference: {correlationId}</span>
            ) : null}
        </div>
    );
}

function DemoNotice({ notice }: { notice: string }) {
    const visibleNotice = /^demo only\.\s*no sms was sent\.?$/i.test(notice.trim())
        ? DEFAULT_DEMO_NOTICE
        : notice;

    return (
        <div className="demo-notice" role="note">
            <span className="demo-dot" aria-hidden="true" />
            <div>
                <strong>CAPSTONE / SANDBOX</strong>
                <p>{visibleNotice}</p>
            </div>
        </div>
    );
}

function Header({ authenticated, appName }: { authenticated: boolean; appName: string }) {
    return (
        <header className="topbar">
            <Link href="/" className="brand" aria-label={`${appName} home`}>
                <span className="brand-mark" aria-hidden="true">
                    S
                </span>
                <span>{appName}</span>
            </Link>
            <nav className="topnav" aria-label="Primary navigation">
                <Link href="/browse" className="nav-link">
                    Browse
                </Link>
                {authenticated ? (
                    <Link href="/#workspace" className="nav-link">
                        My workspace
                    </Link>
                ) : null}
            </nav>
            <span className="sandbox-chip">Demo environment</span>
        </header>
    );
}

function Welcome({
    notice,
    fixtureId,
    setFixtureId,
    action,
    error,
    success,
    correlationId,
    onSubmit,
}: {
    notice: string;
    fixtureId: string;
    setFixtureId: (value: string) => void;
    action: ActionName;
    error: string | null;
    success: string | null;
    correlationId: string | null;
    onSubmit: () => void;
}) {
    return (
        <section className="welcome-grid" aria-labelledby="welcome-title">
            <div className="welcome-copy">
                <p className="eyebrow">A local-services marketplace prototype</p>
                <h1 id="welcome-title">Welcome to Serbizyu</h1>
                <p className="lede">
                    Start with a fixture account, prepare a service listing, and see the boundary
                    between an owner draft, review, and public discovery.
                </p>
                <div className="trust-row">
                    <span>
                        <span className="trust-icon">01</span> Fixture session
                    </span>
                    <span>
                        <span className="trust-icon">02</span> Readiness
                    </span>
                    <span>
                        <span className="trust-icon">03</span> Listing review
                    </span>
                </div>
            </div>
            <div className="login-card" id="login">
                <DemoNotice notice={notice} />
                <div className="section-kicker">Enter the demo</div>
                <h2>Use a fixture identifier</h2>
                <p className="muted">
                    No password is collected. This local path only selects a deterministic demo
                    account.
                </p>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                >
                    <label className="field-label" htmlFor="fixture-identifier">
                        Fixture identifier
                    </label>
                    <input
                        id="fixture-identifier"
                        className="text-input"
                        value={fixtureId}
                        onChange={(event) => setFixtureId(event.target.value)}
                        placeholder="for example, provider-tagudin"
                        autoComplete="off"
                    />
                    <button
                        className="button button-primary button-wide"
                        type="submit"
                        disabled={action !== null}
                    >
                        {action === 'login'
                            ? 'Opening fixture…'
                            : 'Continue to simulated challenge'}
                    </button>
                </form>
                <ActionFeedback error={error} success={success} correlationId={correlationId} />
                <p className="small-print">
                    The fixture identifier is not a phone number and is not stored as a secret.
                </p>
            </div>
        </section>
    );
}

function Challenge({
    fixtureId,
    action,
    error,
    success,
    correlationId,
    onSubmit,
}: {
    fixtureId: string;
    action: ActionName;
    error: string | null;
    success: string | null;
    correlationId: string | null;
    onSubmit: () => void;
}) {
    return (
        <section className="center-card" aria-labelledby="challenge-title">
            <div className="challenge-icon" aria-hidden="true">
                ✓
            </div>
            <p className="eyebrow">Fixture challenge</p>
            <h1 id="challenge-title">Confirm this simulated session</h1>
            <p className="lede compact">
                You selected <strong>{fixtureId || 'the fixture account'}</strong>. Continue through
                the safe challenge path; there is no real code, SMS, or identity provider behind
                this screen.
            </p>
            <DemoNotice notice={DEFAULT_DEMO_NOTICE} />
            <button
                className="button button-primary button-wide"
                type="button"
                onClick={onSubmit}
                disabled={action !== null}
            >
                {action === 'challenge' ? 'Confirming fixture…' : 'Complete simulated challenge'}
            </button>
            <ActionFeedback error={error} success={success} correlationId={correlationId} />
        </section>
    );
}

function Readiness({
    readiness,
    action,
    error,
    success,
    correlationId,
    onSubmit,
}: {
    readiness: ReadinessState;
    action: ActionName;
    error: string | null;
    success: string | null;
    correlationId: string | null;
    onSubmit: (fields: {
        display_name: string;
        area_code: string;
        language_code: string;
        low_data_mode: boolean;
        help_preference: string;
    }) => void;
}) {
    const [displayName, setDisplayName] = useState(
        readiness.displayName ?? readiness.display_name ?? '',
    );
    const [areaCode, setAreaCode] = useState(
        readiness.areaCode ?? readiness.area_code ?? readiness.area ?? 'Tagudin',
    );
    const [languageCode, setLanguageCode] = useState(
        readiness.languageCode ?? readiness.language_code ?? readiness.language ?? 'fil',
    );
    const [lowDataMode, setLowDataMode] = useState(
        readiness.lowDataMode ?? readiness.low_data_mode ?? false,
    );
    const [helpPreference, setHelpPreference] = useState(
        readiness.helpPreference ?? readiness.help_preference ?? 'self_managed',
    );
    const [intentSelected, setIntentSelected] = useState<boolean>(
        providerIntent(readiness) ||
            (readiness.providerIntent == null && readiness.provider_intent == null),
    );

    return (
        <section className="workspace-grid" aria-labelledby="readiness-title">
            <div className="workspace-intro">
                <p className="eyebrow">Step 02 · readiness</p>
                <h1 id="readiness-title">Prepare your account to offer a service</h1>
                <p className="lede compact">
                    Capability intent is additive. You can browse and request help later; this step
                    only adds your Provider/Owner readiness path. It does not switch your account
                    persona.
                </p>
                <div className="boundary-card">
                    <div className="boundary-icon">i</div>
                    <div>
                        <strong>Review boundary</strong>
                        <p>
                            Your identity and formalization status are represented by a fixture
                            only. You may save a draft, but no listing is made active by this
                            screen.
                        </p>
                    </div>
                </div>
            </div>
            <div className="form-card">
                <div className="section-kicker">Account readiness</div>
                <h2 id="readiness-form-title">Tell us what is safe to show</h2>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!intentSelected) {
                            return;
                        }
                        onSubmit({
                            display_name: displayName,
                            area_code: areaCode,
                            language_code: languageCode,
                            low_data_mode: lowDataMode,
                            help_preference: helpPreference,
                        });
                    }}
                >
                    <label className="field-label" htmlFor="display-name">
                        Display name
                    </label>
                    <input
                        id="display-name"
                        className="text-input"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="Your public display name"
                    />
                    <label className="field-label" htmlFor="area-code">
                        Safe area
                    </label>
                    <input
                        id="area-code"
                        className="text-input"
                        value={areaCode}
                        onChange={(event) => setAreaCode(event.target.value)}
                    />
                    <label className="field-label" htmlFor="language-code">
                        Language preference
                    </label>
                    <select
                        id="language-code"
                        className="text-input"
                        value={languageCode}
                        onChange={(event) => setLanguageCode(event.target.value)}
                    >
                        <option value="fil">Filipino</option>
                        <option value="en">English</option>
                    </select>
                    <label className="check-row" htmlFor="provider-intent">
                        <input
                            id="provider-intent"
                            type="checkbox"
                            checked={intentSelected}
                            onChange={(event) => setIntentSelected(event.target.checked)}
                        />
                        <span>
                            <strong>Add Provider capability intent</strong>
                            <small>
                                This enables the Owner listing workspace; it is not a persona
                                switch.
                            </small>
                        </span>
                    </label>
                    <label className="check-row" htmlFor="low-data-mode">
                        <input
                            id="low-data-mode"
                            type="checkbox"
                            checked={lowDataMode}
                            onChange={(event) => setLowDataMode(event.target.checked)}
                        />
                        <span>
                            <strong>Use low-data guidance</strong>
                            <small>
                                Prefer shorter explanations and fewer automatic refreshes.
                            </small>
                        </span>
                    </label>
                    <label className="field-label" htmlFor="help-preference">
                        Setup support
                    </label>
                    <select
                        id="help-preference"
                        className="text-input"
                        value={helpPreference}
                        onChange={(event) => setHelpPreference(event.target.value)}
                    >
                        <option value="self_managed">I will manage this myself</option>
                        <option value="assistance_requested">I may request help later</option>
                    </select>
                    <button
                        className="button button-primary button-wide"
                        type="submit"
                        disabled={action !== null || !intentSelected}
                    >
                        {action === 'onboarding'
                            ? 'Saving readiness…'
                            : 'Save readiness and open workspace'}
                    </button>
                </form>
                <ActionFeedback error={error} success={success} correlationId={correlationId} />
                {readiness.blockers?.length ? (
                    <div className="inline-note">
                        <strong>Still conditional:</strong> {readiness.blockers.join(' ')}
                    </div>
                ) : null}
            </div>
        </section>
    );
}

function ListingForm({
    draft,
    action,
    errors,
    success,
    correlationId,
    onCreate,
    onSave,
    onSubmit,
}: {
    draft: ListingDraft | null;
    action: ActionName;
    errors: ErrorBag;
    success: string | null;
    correlationId: string | null;
    onCreate: (fields: ListingFields) => void;
    onSave: (fields: ListingFields) => void;
    onSubmit: () => void;
}) {
    const initialFields: ListingFields = {
        title: draft?.title ?? '',
        description: draft?.description ?? '',
        category_code: categoryCode(draft),
        listing_type: listingType(draft),
    };
    const [fields, setFields] = useState<ListingFields>(() => initialFields);

    const hasDraft = Boolean(draft?.id);
    const reviewLocked = hasDraft && listingState(draft) !== 'draft';
    const update = (key: keyof ListingFields, value: string) => {
        setFields((current) => ({ ...current, [key]: value }));
    };

    return (
        <div className="listing-editor">
            <div className="editor-heading">
                <div>
                    <p className="eyebrow">Step 03 · Owner workspace</p>
                    <h2>
                        {hasDraft ? 'Your service listing draft' : 'Create a service listing draft'}
                    </h2>
                </div>
                {hasDraft ? (
                    <StatusPill state={listingState(draft)} />
                ) : (
                    <span className="status-pill status-draft">Not saved</span>
                )}
            </div>
            <p className="muted">
                Save a draft first. Submitting creates a version and moves the listing to{' '}
                <strong>pending review</strong>; it does not publish the listing.
            </p>
            <div className="draft-id-row">
                {hasDraft ? (
                    <span>
                        Listing ID <code>{draft?.id}</code>
                    </span>
                ) : (
                    <span>New listing · server will assign the entity ID</span>
                )}
                {hasDraft ? (
                    <span>
                        Expected version <code>{listingVersion(draft)}</code>
                    </span>
                ) : null}
            </div>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    if (reviewLocked) {
                        return;
                    }
                    if (hasDraft) {
                        onSave(fields);
                    } else {
                        onCreate(fields);
                    }
                }}
            >
                <div className="field-grid">
                    <div className="field-span-2">
                        <label className="field-label" htmlFor="listing-title">
                            Listing title
                        </label>
                        <input
                            id="listing-title"
                            className={`text-input ${fieldValue(errors, 'title') ? 'input-error' : ''}`}
                            value={fields.title}
                            onChange={(event) => update('title', event.target.value)}
                            disabled={reviewLocked}
                            placeholder="What service do you offer?"
                        />
                        {fieldValue(errors, 'title') ? (
                            <p className="field-error">{fieldValue(errors, 'title')}</p>
                        ) : null}
                    </div>
                    <div>
                        <label className="field-label" htmlFor="listing-type">
                            Listing type
                        </label>
                        <select
                            id="listing-type"
                            className="text-input"
                            value={fields.listing_type}
                            onChange={(event) => update('listing_type', event.target.value)}
                            disabled={reviewLocked}
                        >
                            <option value="service">Service</option>
                            <option value="product">Product</option>
                        </select>
                    </div>
                    <div>
                        <label className="field-label" htmlFor="category-code">
                            Category code
                        </label>
                        <input
                            id="category-code"
                            className={`text-input ${fieldValue(errors, 'category_code') ? 'input-error' : ''}`}
                            value={fields.category_code}
                            onChange={(event) => update('category_code', event.target.value)}
                            disabled={reviewLocked}
                            placeholder="for example, home-care"
                        />
                        {fieldValue(errors, 'category_code') ? (
                            <p className="field-error">{fieldValue(errors, 'category_code')}</p>
                        ) : null}
                    </div>
                    <div className="field-span-2">
                        <label className="field-label" htmlFor="listing-description">
                            Description
                        </label>
                        <textarea
                            id="listing-description"
                            className={`text-input text-area ${fieldValue(errors, 'description') ? 'input-error' : ''}`}
                            value={fields.description}
                            onChange={(event) => update('description', event.target.value)}
                            disabled={reviewLocked}
                            placeholder="Describe the service in plain language."
                            rows={5}
                        />
                        {fieldValue(errors, 'description') ? (
                            <p className="field-error">{fieldValue(errors, 'description')}</p>
                        ) : null}
                    </div>
                </div>
                {reviewLocked ? (
                    <div className="review-boundary">
                        <strong>This listing is {listingState(draft).replaceAll('_', ' ')}.</strong>
                        <span>
                            Editing is unavailable at this lifecycle boundary. Public discovery only
                            includes an active listing after a separate review/policy gate.
                        </span>
                    </div>
                ) : (
                    <div className="form-actions">
                        <button
                            className="button button-secondary"
                            type="submit"
                            disabled={action !== null}
                        >
                            {action === 'create'
                                ? 'Creating draft…'
                                : action === 'save'
                                  ? 'Saving draft…'
                                  : hasDraft
                                    ? 'Save draft'
                                    : 'Create draft'}
                        </button>
                        {hasDraft ? (
                            <button
                                className="button button-primary"
                                type="button"
                                onClick={onSubmit}
                                disabled={action !== null}
                            >
                                {action === 'submit'
                                    ? 'Submitting for review…'
                                    : 'Submit for review'}
                            </button>
                        ) : null}
                    </div>
                )}
            </form>
            <ActionFeedback
                error={
                    summarizeErrors(errors) ===
                    'The server could not complete that request. Review the fields and try again.'
                        ? null
                        : summarizeErrors(errors)
                }
                success={success}
                correlationId={correlationId}
            />
            <p className="small-print">
                Server validation, expected-version checks, and idempotency remain authoritative.
                Refresh after saving to reload the server projection.
            </p>
        </div>
    );
}

function Browse({
    listings,
    activeDetail,
}: {
    listings: ListingRecord[];
    activeDetail: ListingRecord | null;
}) {
    const activeListings = listings.filter(isActiveListing);

    return (
        <section className="browse-section" id="browse" aria-labelledby="browse-title">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Buyer view · public supply</p>
                    <h2 id="browse-title">Browse active services in Tagudin</h2>
                </div>
                <Link className="text-link" href="/browse">
                    Refresh browse
                </Link>
            </div>
            <p className="muted">
                Only server-approved active listings are shown here. Drafts and pending review
                submissions stay private.
            </p>
            {activeDetail ? <ListingDetail listing={activeDetail} /> : null}
            {activeListings.length ? (
                <div className="listing-grid">
                    {activeListings.map((listing) => (
                        <article className="listing-card" key={listing.id}>
                            <div className="listing-card-top">
                                <StatusPill state="active" />
                                <span>{listing.area ?? listing.locality ?? 'Tagudin area'}</span>
                            </div>
                            <h3>{listing.title}</h3>
                            <p>
                                {listing.description ||
                                    'Service details are available in the safe public projection.'}
                            </p>
                            <div className="listing-card-meta">
                                <span>{listingType(listing)}</span>
                                <span>{categoryCode(listing) || 'Local service'}</span>
                            </div>
                            <Link
                                className="button button-outline button-small"
                                href={`/listings/${listing.id}`}
                            >
                                Open listing <span aria-hidden="true">→</span>
                            </Link>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <strong>No active public listings were returned.</strong>
                    <span>
                        Refresh browse or return to your workspace. A pending review listing will
                        not appear here.
                    </span>
                    <Link className="button button-outline button-small" href="/">
                        Return home
                    </Link>
                </div>
            )}
        </section>
    );
}

function ListingDetail({ listing }: { listing: ListingRecord }) {
    return (
        <article className="detail-card" aria-labelledby="listing-detail-title">
            <div className="detail-label">
                Public listing detail · ID <code>{listing.id}</code>
            </div>
            <h2 id="listing-detail-title">{listing.title}</h2>
            <p>{listing.description || 'The owner has not added a public description yet.'}</p>
            <dl className="detail-list">
                <div>
                    <dt>Area</dt>
                    <dd>{listing.area ?? listing.locality ?? 'Tagudin area'}</dd>
                </div>
                <div>
                    <dt>Type</dt>
                    <dd>{listingType(listing)}</dd>
                </div>
                <div>
                    <dt>Owner</dt>
                    <dd>{ownerName(listing) ?? 'Public owner projection'}</dd>
                </div>
                <div>
                    <dt>Lifecycle</dt>
                    <dd>
                        <StatusPill state={listingState(listing)} />
                    </dd>
                </div>
            </dl>
            <ProtectedAttempt listingId={listing.id} />
        </article>
    );
}

function ProtectedAttempt({ listingId }: { listingId: string }) {
    const [action, setAction] = useState<ActionName>(null);
    const [error, setError] = useState<string | null>(null);
    const [correlationId, setCorrelationId] = useState<string | null>(null);

    const attempt = () => {
        setAction('denial');
        setError(null);
        router.post(
            `/listings/${listingId}/protected-edit-attempt`,
            {},
            {
                preserveScroll: true,
                onError: (errors) => {
                    const bag = errors as ErrorBag;
                    setError(summarizeErrors(bag));
                    setCorrelationId(errorCorrelationId(bag));
                },
                onFinish: () => setAction(null),
            },
        );
    };

    return (
        <div className="protected-action">
            <div>
                <strong>Protected owner action</strong>
                <p>
                    This intentional test path should deny a public viewer without exposing
                    protected fields.
                </p>
            </div>
            <button
                className="button button-quiet"
                type="button"
                onClick={attempt}
                disabled={action !== null}
            >
                {action === 'denial' ? 'Checking permission…' : 'Try protected action'}
            </button>
            <ActionFeedback error={error} success={null} correlationId={correlationId} />
        </div>
    );
}

function Denial({
    denial,
    fallbackCorrelationId,
}: {
    denial: DenialState;
    fallbackCorrelationId: string | null;
}) {
    const correlationId = denial.correlationId ?? denial.correlation_id ?? fallbackCorrelationId;

    return (
        <section className="denial-card" role="alert" aria-labelledby="denial-title">
            <div className="denial-icon" aria-hidden="true">
                !
            </div>
            <div>
                <p className="eyebrow">Safe denial</p>
                <h2 id="denial-title">That action is not available here</h2>
                <p>{denial.message}</p>
                <p className="muted">
                    {denial.recovery ??
                        'Return to a safe route or refresh to recover the latest server state.'}
                </p>
                {correlationId ? (
                    <p className="correlation-line">
                        Correlation ID <code>{correlationId}</code>
                    </p>
                ) : null}
                <div className="form-actions">
                    <Link className="button button-secondary" href="/#workspace">
                        Return to workspace
                    </Link>
                    <button
                        className="button button-quiet"
                        type="button"
                        onClick={() => router.reload({ preserveUrl: true })}
                    >
                        Refresh state
                    </button>
                </div>
            </div>
        </section>
    );
}

export default function Home(props: HomeProps) {
    if (props.experience === 'foundation_v1') {
        return <ProductExperience {...props} />;
    }

    const appName = props.app?.name ?? 'Serbizyu';
    const runtimeEnvironment = props.runtime?.environment ?? 'local';
    const scope = props.scope ?? {
        productFeatures: true,
        externalProviders: false,
        schemaMigrations: true,
    };
    const session = props.session;
    const readiness = props.readiness ?? DEFAULT_READINESS;
    const authenticated = isAuthenticated(session);
    const challengePending = isChallengePending(session);
    const ready = isReady(readiness);
    const initialFixtureId = fixtureIdentifier(session);
    const [fixtureId, setFixtureId] = useState(() => initialFixtureId);
    const [action, setAction] = useState<ActionName>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [mutationCorrelationId, setMutationCorrelationId] = useState<string | null>(null);
    const [listingErrors, setListingErrors] = useState<ErrorBag>({});
    const submissionIntentRef = useRef<{ key: string; expectedVersion: number } | null>(null);
    const pageMode = props.pageMode ?? 'home';

    const startAction = (nextAction: ActionName) => {
        setAction(nextAction);
        setError(null);
        setSuccess(null);
        setMutationCorrelationId(null);
    };

    const completeAction = (message: string) => {
        setSuccess(message);
        setError(null);
    };

    const handleErrors = (errors: ErrorBag) => {
        setError(summarizeErrors(errors));
        setMutationCorrelationId(errorCorrelationId(errors));
    };

    const login = () => {
        startAction('login');
        router.post(
            '/demo/login',
            { fixture_identifier: fixtureId.trim() },
            {
                preserveScroll: true,
                preserveState: 'errors',
                onSuccess: () =>
                    completeAction('Fixture selected. Continue with the simulated challenge.'),
                onError: (errors) => handleErrors(errors as ErrorBag),
                onFinish: () => setAction(null),
            },
        );
    };

    const challenge = () => {
        startAction('challenge');
        router.post(
            '/demo/challenge',
            { fixture_identifier: fixtureId.trim() },
            {
                preserveScroll: true,
                preserveState: 'errors',
                onSuccess: () =>
                    completeAction('Simulated challenge completed. Readiness is next.'),
                onError: (errors) => handleErrors(errors as ErrorBag),
                onFinish: () => setAction(null),
            },
        );
    };

    const saveReadiness = (fields: {
        display_name: string;
        area_code: string;
        language_code: string;
        low_data_mode: boolean;
        help_preference: string;
    }) => {
        startAction('onboarding');
        router.post(
            '/onboarding',
            { provider_intent: true, ...fields },
            {
                preserveScroll: true,
                onSuccess: () =>
                    completeAction('Readiness saved. Your Owner workspace is now available.'),
                onError: (errors) => handleErrors(errors as ErrorBag),
                onFinish: () => setAction(null),
            },
        );
    };

    const createDraft = (fields: ListingFields) => {
        startAction('create');
        setListingErrors({});
        router.post('/listings', fields, {
            preserveScroll: true,
            onSuccess: () => {
                submissionIntentRef.current = null;
                completeAction(
                    'Draft created on the server. Refresh to confirm the saved projection.',
                );
            },
            onError: (errors) => {
                setListingErrors(errors as ErrorBag);
                handleErrors(errors as ErrorBag);
            },
            onFinish: () => setAction(null),
        });
    };

    const saveDraft = (fields: ListingFields) => {
        if (!props.draft?.id) {
            return;
        }
        startAction('save');
        setListingErrors({});
        router.patch(
            `/listings/${props.draft.id}`,
            {
                expected_version: listingVersion(props.draft),
                ...fields,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    submissionIntentRef.current = null;
                    completeAction('Draft saved. The server version is authoritative.');
                },
                onError: (errors) => {
                    setListingErrors(errors as ErrorBag);
                    handleErrors(errors as ErrorBag);
                },
                onFinish: () => setAction(null),
            },
        );
    };

    const submitDraft = () => {
        if (!props.draft?.id) {
            return;
        }
        const expectedVersion = listingVersion(props.draft);
        const submissionIntent = submissionIntentForVersion(
            submissionIntentRef.current,
            expectedVersion,
            idempotencyKey,
        );

        submissionIntentRef.current = submissionIntent;
        startAction('submit');
        setListingErrors({});
        router.post(
            `/listings/${props.draft.id}/submit`,
            {
                expected_version: expectedVersion,
                idempotency_key: submissionIntent.key,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    submissionIntentRef.current = null;
                    completeAction(
                        'Submitted for review. This listing is not public until the separate review boundary approves it.',
                    );
                },
                onError: (errors) => {
                    setListingErrors(errors as ErrorBag);
                    handleErrors(errors as ErrorBag);
                },
                onFinish: () => setAction(null),
            },
        );
    };

    const publicListings = useMemo(
        () => (props.publicListings ?? []).filter(isActiveListing),
        [props.publicListings],
    );
    const demoNotice = props.demoNotice ?? DEFAULT_DEMO_NOTICE;

    return (
        <div className="app-frame">
            <Header authenticated={authenticated} appName={appName} />
            <main className="page-shell">
                <div className="environment-strip">
                    <span>
                        <strong>CAPSTONE / SANDBOX</strong> · simulated local flow
                    </span>
                    <span>
                        Runtime: <code>{runtimeEnvironment}</code>
                    </span>
                </div>

                {props.denial ? (
                    <Denial
                        denial={props.denial}
                        fallbackCorrelationId={props.correlationId ?? mutationCorrelationId}
                    />
                ) : null}

                {pageMode !== 'home' ? null : challengePending ? (
                    <Challenge
                        fixtureId={fixtureId || initialFixtureId}
                        action={action}
                        error={error}
                        success={success}
                        correlationId={mutationCorrelationId ?? props.correlationId ?? null}
                        onSubmit={challenge}
                    />
                ) : !authenticated ? (
                    <Welcome
                        notice={demoNotice}
                        fixtureId={fixtureId}
                        setFixtureId={setFixtureId}
                        action={action}
                        error={error}
                        success={success}
                        correlationId={mutationCorrelationId ?? props.correlationId ?? null}
                        onSubmit={login}
                    />
                ) : !ready ? (
                    <Readiness
                        readiness={readiness}
                        action={action}
                        error={error}
                        success={success}
                        correlationId={mutationCorrelationId ?? props.correlationId ?? null}
                        onSubmit={saveReadiness}
                    />
                ) : (
                    <section
                        className="workspace-section"
                        id="workspace"
                        aria-labelledby="workspace-title"
                    >
                        <div className="workspace-header">
                            <div>
                                <p className="eyebrow">Provider / Owner workspace</p>
                                <h1 id="workspace-title">Turn an idea into a reviewed listing</h1>
                                <p className="lede compact">
                                    Save privately, review the server response, then submit when the
                                    details are ready.
                                </p>
                            </div>
                            <div className="workspace-meta">
                                <span className="status-pill status-ready">
                                    Readiness {readiness.status ?? 'ready'}
                                </span>
                                <span className="muted">{session?.source ?? 'mock_login'}</span>
                            </div>
                        </div>
                        <div className="stepper" aria-label="Connected slice progress">
                            <span className="step complete">
                                <b>01</b> Session
                            </span>
                            <span className="step complete">
                                <b>02</b> Readiness
                            </span>
                            <span className="step current">
                                <b>03</b> Listing
                            </span>
                            <span className="step">
                                <b>04</b> Public review
                            </span>
                        </div>
                        <ListingForm
                            key={props.draft?.id ?? 'new-listing'}
                            draft={props.draft ?? null}
                            action={action}
                            errors={listingErrors}
                            success={success}
                            correlationId={mutationCorrelationId ?? props.correlationId ?? null}
                            onCreate={createDraft}
                            onSave={saveDraft}
                            onSubmit={submitDraft}
                        />
                        <aside className="visibility-note" aria-label="Public visibility boundary">
                            <strong>Submitted listing stays private</strong>
                            <span>
                                Drafts and pending review submissions are visible only in the Owner
                                workspace. Browse shows the listing only after a separate
                                server-side review gate returns <em>active</em>.
                            </span>
                        </aside>
                        <details className="technical-disclosure">
                            <summary>Technical boundary and recovery guidance</summary>
                            <p>
                                Entity IDs, expected versions, idempotency keys, and correlation IDs
                                are supplied by the server contract. If a refresh shows a different
                                lifecycle, follow the server projection; no browser-only transition
                                is authoritative.
                            </p>
                            <button
                                className="button button-quiet"
                                type="button"
                                onClick={() => router.reload({ preserveUrl: true })}
                            >
                                Refresh server state
                            </button>
                        </details>
                    </section>
                )}

                {pageMode === 'detail' ? (
                    <section className="detail-page" aria-labelledby="listing-page-title">
                        <Link className="back-link" href="/browse">
                            ← Back to active listings
                        </Link>
                        {props.activeListingDetail ? (
                            <>
                                <p className="eyebrow">Public listing detail</p>
                                <h1 id="listing-page-title">{props.activeListingDetail.title}</h1>
                                <ListingDetail listing={props.activeListingDetail} />
                            </>
                        ) : (
                            <div className="empty-state" role="status">
                                <strong>This listing is unavailable.</strong>
                                <span>
                                    The listing may be paused, expired, private, or no longer part
                                    of the active Tagudin fixture.
                                </span>
                                <Link className="button button-outline button-small" href="/browse">
                                    Browse active listings
                                </Link>
                            </div>
                        )}
                    </section>
                ) : (
                    <Browse
                        listings={publicListings}
                        activeDetail={
                            pageMode === 'home' ? (props.activeListingDetail ?? null) : null
                        }
                    />
                )}

                <section
                    className={`boundary-footer ${pageMode === 'detail' ? 'detail-footer' : ''}`}
                    aria-labelledby="boundary-footer-title"
                >
                    <div>
                        <p className="eyebrow">What this slice does not claim</p>
                        <h2 id="boundary-footer-title">
                            No real SMS, OTP, payment, Admin, or Agent impersonation
                        </h2>
                    </div>
                    <p className="muted">
                        This is a connected CAPSTONE/SANDBOX flow. Review approval remains a
                        server-side boundary; pending review is intentionally excluded from public
                        browse.
                    </p>
                    <div className="footer-facts">
                        <span>
                            External providers:{' '}
                            {scope.externalProviders ? 'enabled by environment' : 'disabled'}
                        </span>
                        <span>
                            Product features:{' '}
                            {scope.productFeatures ? 'slice enabled' : 'foundation only'}
                        </span>
                        {props.correlationId ? (
                            <span>
                                Correlation: <code>{props.correlationId}</code>
                            </span>
                        ) : null}
                    </div>
                </section>
            </main>
        </div>
    );
}
