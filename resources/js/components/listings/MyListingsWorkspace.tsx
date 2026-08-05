import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ProductShell } from '../ProductShell';
import { ListingCard, ListingCardGrid } from './ListingCard';
import { ListingPreview } from './ListingPreview';
import { Badge, Button, Card, CardContent, Field, Notice, Select, Textarea, TextInput } from '../ui';
import type { HomeProps, ListingDraft, ListingRecord, SliceSession } from '../../types';
import './my-listings-workspace.css';

type ErrorMap = Record<string, string>;
type Action = 'listing' | 'submit' | 'logout' | null;
type DraftInput = { title: string; description: string; category_code: string; listing_type: string };

function ReviewBoundary({ children }: { children: string }) {
    return (
        <Notice tone="warning" title="Review boundary">
            {children}
        </Notice>
    );
}

function ListingStatusList({ listings }: { listings: ListingRecord[] }) {
    if (listings.length === 0) {
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

function ListingWorkspace({
    draft,
    errors,
    action,
    onCreate,
    onSave,
    onSubmit,
}: {
    draft?: ListingDraft | null;
    errors: ErrorMap;
    action: Action;
    onCreate: (input: DraftInput) => void;
    onSave: (input: DraftInput) => void;
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

    const input: DraftInput = {
        title: title.trim(),
        description: description.trim(),
        category_code: category,
        listing_type: type,
    };

    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (draft?.id) {
            onSave(input);
        } else {
            onCreate(input);
        }
    };

    return (
        <Card id="my-listings-editor" className="mlw-editor">
            <CardContent className="sz-stack">
                <div className="sz-row-between">
                    <div>
                        <p className="sz-eyebrow">Draft editor</p>
                        <h2 className="sz-section-title">Save a private draft</h2>
                        <p className="sz-copy">
                            Title, description, category, and service/product type. Submit when ready for review.
                        </p>
                    </div>
                    {draft ? (
                        <Badge tone={draft.status === 'pending_review' ? 'warning' : 'info'}>
                            {draft.status ?? 'draft'} · v{draft.version ?? 1}
                        </Badge>
                    ) : (
                        <Badge tone="neutral">No draft yet</Badge>
                    )}
                </div>
                <form onSubmit={save} className="sz-grid-2">
                    <div className="sz-stack">
                        <Field label="Listing title" error={errors.title} hint="Use a clear, human title. No claims of verification.">
                            <TextInput
                                name="title"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="Household help around Tagudin"
                            />
                        </Field>
                        <Field label="What do you offer?" error={errors.description}>
                            <Textarea
                                name="description"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                placeholder="Describe what you can help with, where, and what a neighbor should expect."
                            />
                        </Field>
                        <div className="sz-grid-2">
                            <Field label="Category" error={errors.category_code}>
                                <Select
                                    name="category_code"
                                    value={category}
                                    onChange={(event) => setCategory(event.target.value)}
                                >
                                    <option value="home-help">Home help</option>
                                    <option value="food">Food</option>
                                    <option value="repairs">Repairs</option>
                                    <option value="local-services">Local services</option>
                                </Select>
                            </Field>
                            <Field label="Listing type" error={errors.listing_type}>
                                <Select
                                    name="listing_type"
                                    value={type}
                                    onChange={(event) => setType(event.target.value)}
                                >
                                    <option value="service">Service</option>
                                    <option value="product">Product</option>
                                </Select>
                            </Field>
                        </div>
                        {errors.form ? <Notice tone="danger">{errors.form}</Notice> : null}
                        <div className="mlw-form-actions">
                            <Button type="submit" loading={action === 'listing'}>
                                {draft ? 'Save draft' : 'Create listing'}
                            </Button>
                            {draft ? (
                                <Button
                                    type="button"
                                    variant="warm"
                                    onClick={onSubmit}
                                    disabled={draft.status !== 'draft' || !title.trim() || !description.trim()}
                                    loading={action === 'submit'}
                                >
                                    Submit for review
                                </Button>
                            ) : null}
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

export function MyListingsWorkspace({
    session,
    myListings = [],
    draft = null,
    errors = {},
    action,
    notice,
    onLogout,
}: {
    session?: SliceSession | null;
    myListings?: HomeProps['myListings'];
    draft?: ListingDraft | null;
    errors?: ErrorMap;
    action: Action;
    notice: string | null;
    onLogout: () => void;
}) {
    const listings = myListings ?? [];
    const [listingNotice, setListingNotice] = useState<string | null>(null);

    const createDraft = (input: DraftInput) => {
        setListingNotice(null);
        router.post('/listings', input, {
            preserveScroll: true,
            onSuccess: () => setListingNotice('Draft created. The server projection is now authoritative.'),
        });
    };

    const saveDraft = (input: DraftInput) => {
        if (!draft?.id) {
            return;
        }
        setListingNotice(null);
        router.patch(
            `/listings/${draft.id}`,
            {
                ...input,
                expected_version: draft.version ?? draft.expectedVersion ?? draft.expected_version ?? 1,
            },
            {
                preserveScroll: true,
                onSuccess: () => setListingNotice('Draft saved. Refresh or continue from the server version.'),
            },
        );
    };

    const submitDraft = () => {
        if (!draft?.id) {
            return;
        }
        router.post(
            `/listings/${draft.id}/submit`,
            {
                expected_version: draft.version ?? draft.expectedVersion ?? draft.expected_version ?? 1,
                idempotency_key: `product-slice-${draft.id}-${draft.version ?? 1}`,
            },
            {
                preserveScroll: true,
                onSuccess: () =>
                    setListingNotice(
                        'Submitted for review. It remains private until the review boundary approves it.',
                    ),
            },
        );
    };

    return (
        <ProductShell session={session} active="listings" title="My Listings">
            <main className="sz-page mlw">
                <div className="mlw-hero">
                    <div>
                        <p className="sz-eyebrow">Private workspace</p>
                        <h1 className="sz-display-title">My Listings</h1>
                        <p className="sz-copy mlw-lede">
                            See every offer you own, then create or finish a draft. Server state decides what buyers can
                            see.
                        </p>
                    </div>
                    <Button type="button" variant="ghost" onClick={onLogout} loading={action === 'logout'}>
                        Sign out
                    </Button>
                </div>

                <ReviewBoundary>
                    Drafts and pending review stay private. Only approved active listings appear in public browse.
                </ReviewBoundary>

                {notice ? (
                    <div className="mlw-notice">
                        <Notice tone="success">{notice}</Notice>
                    </div>
                ) : null}
                {listingNotice ? (
                    <div className="mlw-notice">
                        <Notice tone="success">{listingNotice}</Notice>
                    </div>
                ) : null}

                <section className="mlw-list" aria-labelledby="mlw-list-title">
                    <div className="mlw-list-head">
                        <div>
                            <p className="sz-eyebrow">Server projection</p>
                            <h2 id="mlw-list-title" className="sz-section-title">
                                Your listings
                            </h2>
                        </div>
                        <Badge tone="neutral">{listings.length} owned</Badge>
                    </div>
                    <ListingStatusList listings={listings} />
                </section>

                <div className="mlw-sticky-create">
                    <a className="sz-btn sz-btn-primary" href="#my-listings-editor">
                        Create listing
                    </a>
                </div>

                <section className="mlw-editor-wrap">
                    <ListingWorkspace
                        draft={draft}
                        errors={errors}
                        action={action}
                        onCreate={createDraft}
                        onSave={saveDraft}
                        onSubmit={submitDraft}
                    />
                </section>

                <section className="mlw-browse-link">
                    <Link href="/browse" className="sz-btn sz-btn-outline">
                        Browse active listings
                    </Link>
                </section>
            </main>
        </ProductShell>
    );
}
