import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ProductShell } from '../components/ProductShell';
import { ListingCard, ListingCardGrid } from '../components/listings/ListingCard';
import { BrowsePlp } from '../components/browse/BrowsePlp';
import { AlmostThereOnboarding } from '../components/onboarding/AlmostThereOnboarding';
import { MyListingsWorkspace } from '../components/listings/MyListingsWorkspace';
import { ListingDetailView } from '../components/listings/ListingDetailView';
import { ListingPreview } from '../components/listings/ListingPreview';
import { Badge, Button, Card, CardContent, Field, Notice, Select, Textarea, TextInput } from '../components/ui';
import type { HomeProps, ListingDraft, ReadinessState, SliceSession } from '../types';

type ErrorMap = Record<string, string>;

type Action = 'onboarding' | 'listing' | 'submit' | 'logout' | null;

function pageErrorMap(errors: unknown): ErrorMap {
    if (!errors || typeof errors !== 'object') {
        return {};
    }

    return Object.fromEntries(
        Object.entries(errors as Record<string, unknown>).map(([key, value]) => [
            key,
            Array.isArray(value) ? String(value[0] ?? '') : String(value ?? ''),
        ]),
    );
}

function isAuthenticated(session?: SliceSession | null): boolean {
    return Boolean(session?.authenticated || session?.isAuthenticated);
}


function readinessReady(readiness?: ReadinessState | null): boolean {
    return Boolean(readiness?.ready && (readiness.providerIntent ?? readiness.provider_intent));
}

function displayName(session?: SliceSession | null, readiness?: ReadinessState | null): string {
    return session?.displayName ?? session?.display_name ?? readiness?.displayName ?? readiness?.display_name ?? 'there';
}

function ReviewBoundary({ children }: { children: string }) {
    return <Notice tone="warning" title="Prototype boundary">{children}</Notice>;
}

function StatusSummary({ readiness, draft }: { readiness: ReadinessState; draft?: ListingDraft | null }) {
    const provider = Boolean(readiness.providerIntent ?? readiness.provider_intent);
    return (
        <div className="sz-grid-3">
            <Card><CardContent><Badge tone="success">Ready</Badge><h3 className="sz-section-title" style={{ marginTop: '0.75rem' }}>Your profile</h3><p className="sz-copy">{readiness.displayName ?? readiness.display_name ?? 'Profile saved'} · {readiness.areaCode ?? readiness.area_code ?? 'Tagudin'}</p></CardContent></Card>
            <Card><CardContent><Badge tone={provider ? 'success' : 'warning'}>{provider ? 'Enabled' : 'Setup needed'}</Badge><h3 className="sz-section-title" style={{ marginTop: '0.75rem' }}>Offer capability</h3><p className="sz-copy">{provider ? 'You can create and manage a listing.' : 'Complete setup before creating a listing.'}</p></CardContent></Card>
            <Card><CardContent><Badge tone={draft?.status === 'pending_review' ? 'warning' : 'info'}>{draft?.status === 'pending_review' ? 'Pending review' : 'Not public yet'}</Badge><h3 className="sz-section-title" style={{ marginTop: '0.75rem' }}>Publication gate</h3><p className="sz-copy">Listings stay private until review accepts them.</p></CardContent></Card>
        </div>
    );
}

function ListingWorkspace({ draft, errors, action, onCreate, onSave, onSubmit }: {
    draft?: ListingDraft | null;
    errors: ErrorMap;
    action: Action;
    onCreate: (input: { title: string; description: string; category_code: string; listing_type: string }) => void;
    onSave: (input: { title: string; description: string; category_code: string; listing_type: string }) => void;
    onSubmit: () => void;
}) {
    const [title, setTitle] = useState(draft?.title ?? '');
    const [description, setDescription] = useState(draft?.description ?? '');
    const [category, setCategory] = useState(draft?.categoryCode ?? draft?.category_code ?? 'home-help');
    const [type, setType] = useState(draft?.listingType ?? draft?.listing_type ?? 'service');

    useEffect(() => {
        setTitle(draft?.title ?? '');
        setDescription(draft?.description ?? '');
        setCategory(draft?.categoryCode ?? draft?.category_code ?? 'home-help');
        setType(draft?.listingType ?? draft?.listing_type ?? 'service');
    }, [draft?.id, draft?.version]);

    const input = { title: title.trim(), description: description.trim(), category_code: category, listing_type: type };
    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (draft?.id) onSave(input); else onCreate(input);
    };

    return (
        <Card id="my-listings">
            <CardContent className="sz-stack">
                <div className="sz-row-between">
                    <div>
                        <p className="sz-eyebrow">My Listings</p>
                        <h2 className="sz-section-title">Create something useful for your neighbors.</h2>
                        <p className="sz-copy">Drafts stay private. You can preview the public shape before submitting for review.</p>
                    </div>
                    {draft ? <Badge tone={draft.status === 'pending_review' ? 'warning' : 'info'}>{draft.status ?? 'draft'} · v{draft.version ?? 1}</Badge> : <Badge tone="neutral">No draft yet</Badge>}
                </div>
                <form onSubmit={save} className="sz-grid-2">
                    <div className="sz-stack">
                        <Field label="Listing title" error={errors.title} hint="Use a clear, human title. No claims of verification. ">
                            <TextInput name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Household help around Tagudin" />
                        </Field>
                        <Field label="What do you offer?" error={errors.description}>
                            <Textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what you can help with, where, and what a neighbor should expect." />
                        </Field>
                        <div className="sz-grid-2">
                            <Field label="Category" error={errors.category_code}>
                                <Select name="category_code" value={category} onChange={(event) => setCategory(event.target.value)}><option value="home-help">Home help</option><option value="food">Food</option><option value="repairs">Repairs</option></Select>
                            </Field>
                            <Field label="Listing type" error={errors.listing_type}>
                                <Select name="listing_type" value={type} onChange={(event) => setType(event.target.value)}><option value="service">Service</option><option value="product">Product</option></Select>
                            </Field>
                        </div>
                        {errors.form ? <Notice tone="danger">{errors.form}</Notice> : null}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                            <Button type="submit" loading={action === 'listing'}>{draft ? 'Save private draft' : 'Create private draft'}</Button>
                            {draft ? <Button type="button" variant="warm" onClick={onSubmit} disabled={draft.status !== 'draft' || !title.trim() || !description.trim()} loading={action === 'submit'}>Submit for review</Button> : null}
                        </div>
                    </div>
                    <ListingPreview
                        listing={{
                            id: draft?.id ?? 'preview',
                            title,
                            description,
                            category_code: category,
                            listing_type: type,
                            status: draft?.status ?? draft?.state ?? 'draft',
                            version: draft?.version ?? 1,
                            area: 'Tagudin',
                        }}
                    />
                </form>
            </CardContent>
        </Card>
    );
}

function ListingStatusList({ listings }: { listings: HomeProps['myListings'] }) {
    if (!listings || listings.length === 0) {
        return (
            <Notice tone="neutral" title="No saved listings yet">
                Your first listing will appear here after you save a private draft.
            </Notice>
        );
    }

    return (
        <ListingCardGrid>
            {listings.map((listing) => (
                <ListingCard
                    key={listing.id}
                    listing={listing}
                    variant="owner"
                    href={listing.id ? `/listings/${listing.id}` : null}
                />
            ))}
        </ListingCardGrid>
    );
}

function WorkspaceState({ props, errors, action, notice, onLogout }: { props: HomeProps; errors: ErrorMap; action: Action; notice: string | null; onLogout: () => void }) {
    const readiness = props.readiness ?? {};
    const draft = props.draft ?? null;
    const listingOnly = props.pageMode === 'listings';
    const [listingNotice, setListingNotice] = useState<string | null>(null);
    const listingErrors = errors;

    const createDraft = (input: { title: string; description: string; category_code: string; listing_type: string }) => {
        setListingNotice(null);
        router.post('/listings', input, { preserveScroll: true, onSuccess: () => setListingNotice('Draft created. The server projection is now authoritative.') });
    };
    const saveDraft = (input: { title: string; description: string; category_code: string; listing_type: string }) => {
        if (!draft?.id) return;
        setListingNotice(null);
        router.patch(`/listings/${draft.id}`, { ...input, expected_version: draft.version ?? draft.expectedVersion ?? draft.expected_version ?? 1 }, { preserveScroll: true, onSuccess: () => setListingNotice('Draft saved. Refresh or continue from the server version.') });
    };
    const submitDraft = () => {
        if (!draft?.id) return;
        router.post(`/listings/${draft.id}/submit`, { expected_version: draft.version ?? draft.expectedVersion ?? draft.expected_version ?? 1, idempotency_key: `product-slice-${draft.id}-${draft.version ?? 1}` }, { preserveScroll: true, onSuccess: () => setListingNotice('Submitted for review. It remains private until the review boundary approves it.') });
    };

    return (
        <ProductShell session={props.session} active={listingOnly ? 'listings' : 'home'} title={listingOnly ? 'My Listings' : 'Your local workspace'}>
            <main className="sz-page">
                <div className="sz-row-between" style={{ marginBottom: '1.25rem' }}>
                    <div><p className="sz-eyebrow">{listingOnly ? 'Private workspace' : `Good to see you, ${displayName(props.session, readiness)}`}</p><h1 className="sz-display-title">{listingOnly ? 'My Listings' : 'Make your next useful move.'}</h1><p className="sz-copy">{listingOnly ? 'Save drafts, review the buyer preview, and follow each server-owned publication state.' : 'Your workspace keeps setup, listings, and review status in one place.'}</p></div>
                    <Button type="button" variant="ghost" onClick={onLogout} loading={action === 'logout'}>Sign out</Button>
                </div>
                <ReviewBoundary>Drafts and pending review stay private. Only approved active listings appear in public browse.</ReviewBoundary>
                {!listingOnly ? <section style={{ marginTop: '1.25rem' }}><StatusSummary readiness={readiness} draft={draft} /></section> : null}
                {notice ? <div style={{ marginTop: '1rem' }}><Notice tone="success">{notice}</Notice></div> : null}
                {listingNotice ? <div style={{ marginTop: '1rem' }}><Notice tone="success">{listingNotice}</Notice></div> : null}
                <section style={{ marginTop: '1.25rem' }}>
                    <p className="sz-eyebrow">Server projection</p>
                    <ListingStatusList listings={props.myListings} />
                </section>
                <section style={{ marginTop: '1.25rem' }}><ListingWorkspace draft={draft} errors={listingErrors} action={action} onCreate={createDraft} onSave={saveDraft} onSubmit={submitDraft} /></section>
                {!listingOnly ? <section style={{ marginTop: '1.25rem' }}>
                    <Card><CardContent><p className="sz-eyebrow">Browse</p><h2 className="sz-section-title">See what is already active.</h2><p className="sz-copy">Public browse is intentionally separate from your private draft and pending review state.</p><Link href="/browse" className="sz-btn sz-btn-outline">Browse active listings</Link></CardContent></Card>
                </section> : null}
            </main>
        </ProductShell>
    );
}

function BrowseState({ props }: { props: HomeProps }) {
    const listings = props.publicListings ?? [];

    return (
        <ProductShell session={props.session} active="browse" title="Browse" pageChrome={true}>
            <BrowsePlp listings={listings} />
        </ProductShell>
    );
}

function DetailState({ props }: { props: HomeProps }) {
    return (
        <ProductShell session={props.session} active="browse" title="Listing detail">
            <main className="sz-page">
                <ListingDetailView
                    listing={props.activeListingDetail}
                    denial={props.denial}
                    correlationId={props.correlationId}
                />
            </main>
        </ProductShell>
    );
}

export default function ProductExperience(props: HomeProps) {
    if (props.pageMode === 'browse') {
        return <BrowseState props={props} />;
    }

    if (props.pageMode === 'detail') {
        return <DetailState props={props} />;
    }

    const session = props.session;
    const authenticated = isAuthenticated(session);
    const ready = readinessReady(props.readiness);

    const [errors, setErrors] = useState<ErrorMap>({});
    const [notice, setNotice] = useState<string | null>(null);
    const [action, setAction] = useState<Action>(null);
    const visibleErrors = { ...pageErrorMap(props.errors), ...errors };


    const withAction = (nextAction: Exclude<Action, null>, callback: () => void) => {
        setAction(nextAction);
        setErrors({});
        setNotice(null);
        callback();
    };

    const logout = () => withAction('logout', () => router.post('/auth/logout', {}, { preserveScroll: true, onFinish: () => setAction(null) }));

    if (authenticated && ready && props.pageMode === 'listings') {
        return (
            <MyListingsWorkspace
                session={props.session}
                myListings={props.myListings}
                draft={props.draft}
                errors={visibleErrors}
                action={action === 'onboarding' ? null : action}
                notice={notice}
                onLogout={logout}
            />
        );
    }

    if (authenticated && ready) {
        return <WorkspaceState props={props} errors={visibleErrors} action={action} notice={notice} onLogout={logout} />;
    }


    if (authenticated && !ready) {
        return (
            <ProductShell session={session} title="Set up your workspace">
                <AlmostThereOnboarding
                    readiness={props.readiness}
                    errors={visibleErrors}
                    notice={notice}
                    action={action === 'onboarding' ? 'onboarding' : null}
                />
            </ProductShell>
        );
    }

    return (
        <ProductShell title="Welcome to Serbizyu">
            <main className="sz-page"><Card><CardContent><p className="sz-eyebrow">Your marketplace</p><h1 className="sz-display-title">Discover local listings built on clear information.</h1><p className="sz-copy">Browse what is active, or sign in securely to create and manage your own listings.</p><a className="sz-btn sz-btn-primary" href="/auth/phone">Sign in securely</a></CardContent></Card></main>
        </ProductShell>
    );
}
