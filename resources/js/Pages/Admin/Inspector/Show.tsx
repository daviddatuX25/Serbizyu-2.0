import { Head, Link, router } from '@inertiajs/react';
import * as React from 'react';
import { Search } from 'lucide-react';

import { GovernancePanel } from '@/components/admin/GovernancePanel';
import { StaffContextBadges } from '@/components/admin/StaffContextBadges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AdminLayout } from '@/layouts/AdminLayout';
import type { IdentityReviewAction, InspectorPageProps, ListingReviewDetails, RegistryModeration, WorkspaceCommandAvailability, WorkspaceRail } from '@/types/admin-workspace';

function labelize(value: string) {
    return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ListingReviewControls({ action }: { action: RegistryModeration }) {
    const [reason, setReason] = React.useState('');
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const rejectEnabled = action.can_reject && Boolean(reason.trim());

    const submit = (decision: 'approve' | 'reject') => {
        router.post(decision === 'approve' ? action.approve_url : action.reject_url, {
            expected_version: action.expected_version,
            ...(decision === 'reject' ? { reason: reason.trim() } : {}),
        }, {
            preserveScroll: true,
            onStart: () => {
                setPending(true);
                setError(null);
            },
            onError: (errors) => {
                const first = Object.values(errors)[0];
                setError(typeof first === 'string' ? first : 'The listing review could not be saved.');
            },
            onFinish: () => setPending(false),
        });
    };

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div>
                <p className="text-sm font-medium">Listing review</p>
                <p className="mt-1 text-xs text-muted-foreground">Decisions apply to the current listing version.</p>
            </div>
            {action.can_reject && (
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    Rejection reason
                    <Input
                        aria-label="Listing rejection reason"
                        value={reason}
                        onChange={(event) => { setReason(event.target.value); setError(null); }}
                        disabled={pending}
                        required
                        maxLength={1000}
                        className="h-9 text-sm text-foreground"
                    />
                </label>
            )}
            <div className="flex flex-wrap gap-2">
                {action.can_approve && (
                    <Button type="button" disabled={pending} onClick={() => submit('approve')}>
                        {pending ? 'Saving…' : 'Approve listing'}
                    </Button>
                )}
                {action.can_reject && (
                    <Button type="button" variant="destructive" disabled={pending || !rejectEnabled} onClick={() => submit('reject')}>
                        {pending ? 'Saving…' : 'Reject listing'}
                    </Button>
                )}
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
    );
}

function detailNodes(value: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item));
}

function DetailValue({ label, value }: { label: string; value: string | number | null | undefined }) {
    if (value === null || value === undefined || value === '') return null;
    return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-sm font-medium">{value}</dd></div>;
}

function ListingDetails({ details }: { details: ListingReviewDetails | null }) {
    if (!details) {
        return <p className="text-sm text-muted-foreground">Current listing-version details are unavailable.</p>;
    }
    const work = detailNodes(details.work_specification?.nodes);
    const variants = details.variants ?? [];
    const combinations = details.deal_chain_combinations ?? [];
    const media = details.media?.items ?? [];

    return (
        <div className="flex flex-col gap-4">
            <dl className="grid gap-3 sm:grid-cols-2">
                <DetailValue label="Listing type" value={details.listing_type ? labelize(details.listing_type) : details.listing_type} />
                <DetailValue label="Work shape" value={details.work_shape ? labelize(details.work_shape) : details.work_shape} />
                <DetailValue
                    label="Listed amount"
                    value={details.price_amount_minor === null || details.price_amount_minor === undefined
                        ? null
                        : `${details.currency ?? 'Currency not recorded'} ${(details.price_amount_minor / 100).toFixed(2)}`}
                />
                <DetailValue label="Preparation lead time" value={details.prep_lead_time} />
            </dl>
            {details.description && <div><h3 className="text-xs font-medium text-muted-foreground">Description</h3><p className="mt-1 whitespace-pre-wrap text-sm">{details.description}</p></div>}
            {media.length > 0 && (
                <div>
                    <h3 className="mb-2 text-xs font-medium text-muted-foreground">Listing media</h3>
                    <div className="flex flex-wrap gap-3">
                        {media.map((item) => (
                            <figure key={item.id} className="w-36">
                                {item.kind === 'video' ? (
                                    <video
                                        controls
                                        preload="metadata"
                                        poster={item.thumbnail_url || undefined}
                                        aria-label={item.caption || 'Listing video'}
                                        className="aspect-square w-full rounded-md border border-border object-cover"
                                    >
                                        <source src={item.url} type={item.mime_type || undefined} />
                                    </video>
                                ) : (
                                    <img src={item.thumbnail_url || item.url} alt={item.caption || 'Listing media'} className="aspect-square w-full rounded-md border border-border object-cover" />
                                )}
                                {item.caption && <figcaption className="mt-1 break-words text-xs">{item.caption}</figcaption>}
                            </figure>
                        ))}
                    </div>
                </div>
            )}
            {work.length > 0 && (
                <div>
                    <h3 className="mb-2 text-xs font-medium text-muted-foreground">Work specification</h3>
                    <ol className="flex flex-col gap-2">
                        {work.map((step, index) => {
                            const title = typeof step.title === 'string' ? step.title : `Step ${index + 1}`;
                            const duration = step.duration_label;
                            const proofs = Array.isArray(step.required_proofs) ? step.required_proofs : [];
                            const clearance = step.control_mode;
                            const approval = step.approval_method;
                            return <li key={typeof step.id === 'string' ? step.id : `${title}-${index}`} className="rounded-md border border-border p-3">
                                <p className="text-sm font-medium">
                                    {typeof step.ordinal === 'number' && <span aria-hidden="true">{step.ordinal}. </span>}
                                    <span>{title}</span>
                                </p>
                                {typeof step.description === 'string' && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{step.description}</p>}
                                <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                                    {(typeof duration === 'string' || typeof duration === 'number') && <DetailValue label="Target duration" value={String(duration)} />}
                                    {proofs.length > 0 && <DetailValue label="Required proof" value={proofs.filter((proof): proof is string => typeof proof === 'string').map(labelize).join(', ')} />}
                                    {(typeof clearance === 'string' || typeof clearance === 'number') && <DetailValue label="Clearance" value={typeof clearance === 'string' ? labelize(clearance) : String(clearance)} />}
                                    {(typeof approval === 'string' || typeof approval === 'number') && <DetailValue label="Approval" value={typeof approval === 'string' ? labelize(approval) : String(approval)} />}
                                </dl>
                            </li>;
                        })}
                    </ol>
                </div>
            )}
            {details.work_specification && (
                <details className="rounded-md border border-border p-3">
                    <summary className="cursor-pointer text-sm font-medium">Full authored work specification</summary>
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 text-xs">
                        {JSON.stringify(details.work_specification, null, 2)}
                    </pre>
                </details>
            )}
            {variants.length > 0 && (
                <div>
                    <h3 className="mb-2 text-xs font-medium text-muted-foreground">Variants</h3>
                    <ul className="flex flex-col gap-2">
                        {variants.map((variant, index) => {
                            const label = typeof variant.name === 'string' ? variant.name : `Variant ${index + 1}`;
                            const amount = variant.price;
                            const amountText = typeof amount === 'number'
                                ? `${details.currency ?? 'Currency not recorded'} ${amount.toFixed(2)}`
                                : null;
                            return <li key={typeof variant.id === 'string' ? variant.id : `${label}-${index}`} className="flex flex-wrap justify-between gap-2 rounded-md border border-border p-3 text-sm">
                                <span>{label}</span>{amountText && <span>{amountText}</span>}
                            </li>;
                        })}
                    </ul>
                </div>
            )}
            {combinations.length > 0 && (
                <div>
                    <h3 className="mb-2 text-xs font-medium text-muted-foreground">Deal-chain combinations</h3>
                    <ul className="flex flex-col gap-2">
                        {combinations.map((combination, index) => <li key={typeof combination.id === 'string' ? combination.id : `combination-${index}`} className="rounded-md border border-border p-3">
                            <p className="text-sm font-medium">{typeof combination.title === 'string' ? combination.title : `Combination ${index + 1}`}</p>
                            {Array.isArray(combination.nodes) && <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">{detailNodes(combination.nodes).map((node, nodeIndex) => <li key={typeof node.id === 'string' ? node.id : `${index}-${nodeIndex}`}>{typeof node.title === 'string' ? node.title : 'Untitled slot'}{typeof node.sub === 'string' ? ` · ${node.sub}` : ''}</li>)}</ul>}
                        </li>)}
                    </ul>
                </div>
            )}
            {details.deal_chain_specification && (
                <div>
                    <h3 className="mb-1 text-xs font-medium text-muted-foreground">Deal-chain specification</h3>
                    {Object.entries(details.deal_chain_specification)
                        .filter(([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
                        .map(([key, value]) => <p key={key} className="text-sm">{labelize(key)}: {typeof value === 'string' ? labelize(value) : String(value)}</p>)}
                </div>
            )}
        </div>
    );
}
function RailCard({ title, rail }: { title: string; rail: WorkspaceRail }) {
    return (
        <Card className="border-border bg-card shadow-xs">
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border pb-3">
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
                <Badge variant="outline">{rail.label}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Independent state</span>
                    <span className="font-mono text-foreground">{labelize(rail.state)}</span>
                </div>
                {rail.reference && <div className="font-mono text-xs text-primary">{rail.reference}</div>}
                {rail.facts.length ? (
                    <dl className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
                        {rail.facts.map((fact, index) => (
                            <div key={`${fact.label}-${index}`} className="flex flex-col gap-0.5">
                                <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                                <dd className="break-words text-sm font-medium text-foreground">{fact.value === null ? 'Not recorded' : String(fact.value)}</dd>
                            </div>
                        ))}
                    </dl>
                ) : <p className="text-xs text-muted-foreground">No additional facts recorded.</p>}
            </CardContent>
        </Card>
    );
}
function IdentityReviewControls({ action }: { action: IdentityReviewAction }) {
    const [reason, setReason] = React.useState('');
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const canApprove = action.can_review && action.decisions.includes('approve');
    const canReject =
        action.can_review &&
        action.decisions.includes('reject') &&
        action.rejection_reasons.includes(reason);

    const submit = async (decision: 'approve' | 'reject') => {
        if (decision === 'approve' ? !canApprove : !canReject) return;
        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
        if (!csrfToken) {
            setError('This browser session is missing its CSRF token. Refresh the page and try again.');
            return;
        }

        setPending(true);
        setError(null);
        try {
            const response = await fetch(action.review_url, {
                method: action.method,
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    decision,
                    reason: decision === 'reject' ? reason : null,
                }),
            });
            const result = await response.json().catch(() => null) as {
                data?: unknown;
                error?: { message?: string };
                message?: string;
                errors?: Record<string, string[]>;
            } | null;
            if (!response.ok) {
                const fieldError = Object.values(result?.errors ?? {}).flat()[0];
                throw new Error(result?.error?.message ?? fieldError ?? result?.message ?? 'The identity review could not be saved.');
            }
            if (!result?.data) throw new Error('The identity review response did not include a saved result.');
            router.reload();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'The identity review could not be saved.');
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div>
                <p className="text-sm font-medium">Identity verification review</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Decisions are recorded by the identity verification service.
                </p>
            </div>
            {action.can_review ? (
                <>
                    {action.decisions.includes('reject') && (
                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                            Rejection reason
                            <select
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                aria-label="Rejection reason"
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            >
                                <option value="">Choose a reason</option>
                                {action.rejection_reasons.map((code) => (
                                    <option key={code} value={code}>{labelize(code)}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {action.decisions.includes('approve') && (
                            <Button type="button" disabled={pending} onClick={() => submit('approve')}>
                                {pending ? 'Saving…' : 'Approve verification'}
                            </Button>
                        )}
                        {action.decisions.includes('reject') && (
                            <Button type="button" variant="outline" disabled={pending || !canReject} onClick={() => submit('reject')}>
                                {pending ? 'Saving…' : 'Reject verification'}
                            </Button>
                        )}
                    </div>
                </>
            ) : (
                <p className="text-sm text-muted-foreground">This verification is not available for staff review.</p>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
    );
}

function CommandStatus({ action, availability }: { action: string; availability: WorkspaceCommandAvailability }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
            <div>
                <p className="text-sm font-medium">{labelize(action)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{availability.reason ?? (availability.enabled ? 'Available through its authorized workflow.' : 'Not available for this record.')}</p>
            </div>
            <Badge variant={availability.enabled ? 'default' : 'outline'}>
                {availability.enabled ? 'Available in owning workflow' : 'Unavailable'}
            </Badge>
        </div>
    );
}

export default function InspectorShow({ workspace, query_ref, staffContext }: InspectorPageProps) {
    const [reference, setReference] = React.useState(query_ref);
    const [pending, setPending] = React.useState(false);

    React.useEffect(() => setReference(query_ref), [query_ref]);

    const inspect = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const value = reference.trim();
        if (!value) return;
        setPending(true);
        router.get('/admin/inspect', { ref: value }, {
            preserveScroll: true,
            onFinish: () => setPending(false),
        });
    };

    if (!workspace) {
        return (
            <AdminLayout
                currentSection="inspector"
                title="Record not found"
                breadcrumbs={[{ label: 'Operations', href: '/admin/triage' }, { label: 'Universal Workspace' }]}
            >
                <Head title="Record not found — Serbizyu Admin" />
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-10">
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Record not found</h1>
                        <p className="text-sm text-muted-foreground">
                            {query_ref
                                ? <>No persisted record matches <span className="font-mono font-medium text-foreground">{query_ref}</span>.</>
                                : 'Enter a public reference or record UUID to inspect a persisted record.'}
                        </p>
                    </div>
                    <Card className="border-border bg-card shadow-xs">
                        <CardContent className="p-4">
                            <form onSubmit={inspect} className="flex flex-col gap-2 sm:flex-row">
                                <label className="relative flex-1">
                                    <span className="sr-only">Public reference or UUID</span>
                                    <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                                    <Input
                                        value={reference}
                                        onChange={(event) => setReference(event.target.value)}
                                        placeholder="ORD-…, OBL-…, CASE-…, or UUID"
                                        className="pl-8 font-mono"
                                    />
                                </label>
                                <Button type="submit" disabled={pending || !reference.trim()}>
                                    {pending ? 'Looking up…' : 'Inspect record'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Button asChild variant="outline" className="mx-auto">
                        <Link href="/admin/triage">Return to staff inbox</Link>
                    </Button>
                </div>
            </AdminLayout>
        );
    }

    const rails: Array<{ key: string; title: string; rail: WorkspaceRail | null }> = [
        { key: 'agreement', title: 'Agreement', rail: workspace.rails.agreement },
        { key: 'work', title: 'Work', rail: workspace.rails.work },
        { key: 'payment', title: 'Payment', rail: workspace.rails.payment },
    ];

    return (
        <AdminLayout
            currentSection="inspector"
            title={`Workspace · ${workspace.reference}`}
            breadcrumbs={[
                { label: 'Operations', href: '/admin/triage' },
                { label: 'Universal Workspace', href: '/admin/inspect' },
                { label: workspace.reference },
            ]}
        >
            <Head title={`${workspace.reference} — Universal Workspace`} />
            <div className="flex flex-col gap-6">
                <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">{workspace.title}</h1>
                            <Badge variant="outline" className="font-mono">{workspace.reference}</Badge>
                            <Badge variant="outline">{labelize(workspace.kind)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Persisted record · {workspace.version === null ? 'Version not recorded' : `Version ${workspace.version}`}
                        </p>
                        <StaffContextBadges staffContext={staffContext} />
                    </div>
                    <form onSubmit={inspect} className="flex w-full gap-2 lg:max-w-md">
                        <label className="relative min-w-0 flex-1">
                            <span className="sr-only">Find a record</span>
                            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                            <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Reference or UUID" className="pl-8 font-mono" />
                        </label>
                        <Button type="submit" variant="outline" disabled={pending || !reference.trim()}>
                            {pending ? 'Loading…' : 'Inspect'}
                        </Button>
                    </form>
                </header>

                <section aria-labelledby="responsibility-heading" className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                            <h2 id="responsibility-heading" className="text-xs font-semibold tracking-wide text-primary uppercase">Current responsibility</h2>
                            <p className="mt-1 text-sm font-medium text-foreground">{workspace.responsibility.label}</p>
                        </div>
                        <Badge variant="outline">{labelize(workspace.responsibility.party)}</Badge>
                    </div>
                </section>

                <section aria-labelledby="rails-heading" className="flex flex-col gap-3">
                    <div>
                        <h2 id="rails-heading" className="text-sm font-semibold text-foreground">Independent record state</h2>
                        <p className="text-xs text-muted-foreground">Agreement, work, payment and case status remain separate.</p>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-3">
                        {rails.map(({ key, title, rail }) => rail ? (
                            <RailCard key={key} title={title} rail={rail} />
                        ) : (
                            <Card key={key} className="border-dashed border-border bg-muted/20 shadow-none">
                                <CardContent className="flex min-h-36 flex-col justify-center gap-2 p-4">
                                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                                    <p className="text-xs text-muted-foreground">Not applicable to this record.</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                <section aria-labelledby="case-heading" className="flex flex-col gap-3">
                    <div>
                        <h2 id="case-heading" className="text-sm font-semibold text-foreground">Case</h2>
                        <p className="text-xs text-muted-foreground">Case lifecycle is independent of agreement, work and payment.</p>
                    </div>
                    {workspace.rails.case.length ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {workspace.rails.case.map((rail) => <RailCard key={rail.id} title={rail.title} rail={rail} />)}
                        </div>
                    ) : (
                        <Card className="border-dashed border-border bg-muted/20 shadow-none">
                            <CardContent className="p-4 text-sm text-muted-foreground">No case is linked to this record.</CardContent>
                        </Card>
                    )}
                </section>

                {workspace.kind === 'case' && workspace.governance && (
                    <GovernancePanel key={workspace.governance.case.id} caseId={workspace.governance.case.id} governance={workspace.governance} />
                )}

                {(workspace.stock || workspace.siblings.length > 0) && (
                    <section className="grid gap-4 lg:grid-cols-2" aria-label="Inventory and related records">
                        {workspace.stock && <RailCard title="Current stock" rail={workspace.stock} />}
                        {workspace.siblings.length > 0 && (
                            <Card className="border-border bg-card shadow-xs">
                                <CardHeader><CardTitle className="text-sm">Related records</CardTitle></CardHeader>
                                <CardContent className="flex flex-col gap-2">
                                    {workspace.siblings.map((sibling) => (
                                        <Link key={sibling.id} href={sibling.inspect_url} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 hover:bg-muted">
                                            <span className="flex min-w-0 flex-col gap-1">
                                                <span className="font-mono text-xs text-primary">{sibling.reference}</span>
                                                <span className="truncate text-sm font-medium text-foreground">{sibling.title}</span>
                                            </span>
                                            <Badge variant="outline">{labelize(sibling.kind)} · {labelize(sibling.state)}</Badge>
                                        </Link>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </section>
                )}

                <section className="grid gap-4 xl:grid-cols-2">
                    <Card className="border-border bg-card shadow-xs">
                        <CardHeader><CardTitle className="text-sm">Evidence</CardTitle></CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            {workspace.evidence.length ? workspace.evidence.map((item) => (
                                <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                                    <div className="flex min-w-0 flex-col gap-1">
                                        <span className="truncate text-sm font-medium">{item.label}</span>
                                        <span className="text-xs text-muted-foreground">{labelize(item.kind)} · {item.created_at ?? 'Date not recorded'}</span>
                                    </div>
                                    <Badge variant="outline">{labelize(item.status)}</Badge>
                                </div>
                            )) : <p className="text-sm text-muted-foreground">No safe evidence metadata is available.</p>}
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-card shadow-xs">
                        <CardHeader><CardTitle className="text-sm">Case conversations</CardTitle></CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {workspace.rails.case.length > 0 && workspace.conversations.length > 0 ? workspace.conversations.map((conversation) => (
                                <article key={conversation.id} className="flex flex-col gap-2 border-b border-border pb-4 last:border-0 last:pb-0">
                                    <header className="flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="text-sm font-medium">{conversation.title}</h3>
                                        <span className="text-xs text-muted-foreground">{conversation.participant_label}</span>
                                    </header>
                                    {conversation.messages.map((message) => (
                                        <div key={message.id} className="rounded-lg bg-muted/50 p-3">
                                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                                <span>{message.author_label}</span>
                                                <span>{message.created_at}</span>
                                            </div>
                                            <p className="whitespace-pre-wrap text-sm text-foreground">{message.body}</p>
                                            <Badge variant="outline" className="mt-2 text-[10px]">{message.visibility === 'staff_internal' ? 'Staff internal' : 'Participant-visible'}</Badge>
                                        </div>
                                    ))}
                                </article>
                            )) : <p className="text-sm text-muted-foreground">No staff-authorized case conversations are available.</p>}
                        </CardContent>
                    </Card>
                </section>

                <section className="grid gap-4 xl:grid-cols-2">
                    <Card className="border-border bg-card shadow-xs">
                        <CardHeader><CardTitle className="text-sm">Audit history</CardTitle></CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            {workspace.audit.length ? workspace.audit.map((event) => (
                                <article key={event.id} className="rounded-md border border-border p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-sm font-medium">{event.event}</span>
                                        <time className="text-xs text-muted-foreground">{event.created_at}</time>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">{event.actor_label}</p>
                                    {event.facts.length > 0 && <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                                        {event.facts.map((fact, index) => (
                                            <div key={`${fact.label}-${index}`}>
                                                <dt className="text-[11px] text-muted-foreground">{fact.label}</dt>
                                                <dd className="break-words text-xs">{fact.value === null ? 'Not recorded' : String(fact.value)}</dd>
                                            </div>
                                        ))}
                                    </dl>}
                                </article>
                            )) : <p className="text-sm text-muted-foreground">No audit entries are available.</p>}
                        </CardContent>
                    </Card>
                    {!workspace.governance && (
                        <Card className="border-border bg-card shadow-xs">
                            <CardHeader><CardTitle className="text-sm">Staff commands</CardTitle></CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                {(['assign', 'resolve', 'hold'] as const).map((action) => {
                                    const availability = workspace.actions[action];
                                    return availability ? (
                                        <CommandStatus key={action} action={action} availability={availability} />
                                    ) : null;
                                })}
                                {workspace.actions.identity_review && (
                                    <IdentityReviewControls action={workspace.actions.identity_review} />
                                )}
                                {!workspace.actions.assign &&
                                    !workspace.actions.resolve &&
                                    !workspace.actions.hold &&
                                    !workspace.actions.identity_review &&
                                    !workspace.actions.listing_review && (
                                        <p className="text-sm text-muted-foreground">No staff commands are available for this record.</p>
                                    )}
                            </CardContent>
                        </Card>
                    )}
                    {workspace.facts.length > 0 && (
                        <Card className="border-border bg-card shadow-xs">
                            <CardHeader><CardTitle className="text-sm">Record details</CardTitle></CardHeader>
                            <CardContent>
                                <dl className="grid gap-3 sm:grid-cols-2">
                                    {workspace.facts.map((fact, index) => (
                                        <div key={`${fact.label}-${index}`}>
                                            <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                                            <dd className="break-words text-sm font-medium">{fact.value === null ? 'Not recorded' : String(fact.value)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </CardContent>
                        </Card>
                    )}
                    {workspace.kind === 'listing' && (
                        <Card className="border-border bg-card shadow-xs">
                            <CardHeader><CardTitle className="text-sm">Current listing details</CardTitle></CardHeader>
                            <CardContent><ListingDetails details={workspace.listing_details} /></CardContent>
                        </Card>
                    )}
                    {workspace.kind === 'listing' && workspace.actions.listing_review && (
                        <Card className="border-border bg-card shadow-xs">
                            <CardHeader><CardTitle className="text-sm">Listing moderation</CardTitle></CardHeader>
                            <CardContent><ListingReviewControls action={workspace.actions.listing_review} /></CardContent>
                        </Card>
                    )}

                </section>
            </div>
        </AdminLayout>
    );
}
