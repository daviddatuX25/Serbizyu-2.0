import { Head, Link, router } from '@inertiajs/react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminLayout } from '@/layouts/AdminLayout';
import type { RegistryPageProps, RegistryRow } from '@/types/admin-workspace';

const titles = {
    orders: 'Orders', financials: 'Financials', disputes: 'Disputes', listings: 'Listings',
    users: 'Users', tenders: 'Tenders', telemetry: 'System / Telemetry',
} as const;

function ModerationActions({ row }: { row: RegistryRow }) {
    const [reason, setReason] = React.useState('');
    const [processing, setProcessing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const moderation = row.moderation;
    if (!moderation || (!moderation.can_approve && !moderation.can_reject)) return null;
    const submit = (decision: 'approve' | 'reject') => {
        if (processing || (decision === 'approve' ? !moderation.can_approve : !moderation.can_reject || !reason.trim())) return;
        router.post(decision === 'approve' ? moderation.approve_url : moderation.reject_url, {
            expected_version: moderation.expected_version,
            ...(decision === 'reject' ? { reason: reason.trim() } : {}),
        }, {
            preserveScroll: true,
            onStart: () => {
                setProcessing(true);
                setError(null);
            },
            onError: errors => {
                const first = Object.values(errors)[0];
                setError(typeof first === 'string' ? first : 'The moderation decision could not be saved.');
            },
            onFinish: () => setProcessing(false),
        });
    };
    return <div className="mt-2 flex flex-wrap justify-end gap-2">
        {moderation.can_reject && <Input aria-label={`Rejection reason for ${row.reference}`} value={reason} onChange={event => { setReason(event.target.value); setError(null); }} disabled={processing} required maxLength={1000} placeholder="Reason required" className="h-8 w-40" />}
        {moderation.can_approve && <Button size="sm" disabled={processing} onClick={() => submit('approve')}>{processing ? 'Saving…' : 'Approve'}</Button>}
        {moderation.can_reject && <Button size="sm" variant="destructive" disabled={processing || !reason.trim()} onClick={() => submit('reject')}>{processing ? 'Saving…' : 'Reject'}</Button>}
        {error && <p role="alert" className="basis-full text-left text-xs text-destructive">{error}</p>}
    </div>;
}

export function AdminRegistryPage({ registry, staffContext }: RegistryPageProps) {
    const [query, setQuery] = React.useState(registry.filters.q ?? '');
    const [status, setStatus] = React.useState(registry.filters.status ?? '');
    const [category, setCategory] = React.useState(registry.filters.category ?? '');
    const [filterError, setFilterError] = React.useState<string | null>(null);
    const categorySupported = registry.kind === 'listings' || registry.kind === 'tenders'
        || registry.kind === 'telemetry' || registry.kind === 'disputes';
    const categoryLabel = registry.kind === 'disputes' ? 'Category' : 'Category UUID';
    const pathname = typeof window === 'undefined' ? `/admin/${registry.kind}` : window.location.pathname;
    const visit = (params: Record<string, string | number | null>) => {
        setFilterError(null);
        router.get(pathname, {
            q: registry.filters.q, status: registry.filters.status,
            category: categorySupported ? registry.filters.category : null,
            cohort: registry.filters.cohort, assignee: registry.filters.assignee,
            page: registry.filters.page, per_page: registry.filters.per_page,
            ...params,
        }, {
            preserveState: true, preserveScroll: true, replace: true,
            onError: errors => {
                const first = Object.values(errors)[0];
                setFilterError(typeof first === 'string' ? first : 'The registry filters could not be applied.');
            },
        });
    };
    const submitSearch = (event: React.FormEvent) => {
        event.preventDefault();
        visit({ q: query || null, status: status || null, ...(categorySupported ? { category: category || null } : {}), page: 1 });
    };
    const page = registry.rows.meta;

    return <>
        <Head title={`${titles[registry.kind]} | Admin`} />
        <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-8">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div><p className="text-sm font-medium text-muted-foreground">Staff registry · {staffContext.environment} · {staffContext.cohort.selected ?? 'All cohorts'}</p>
                    <h1 className="text-3xl font-semibold tracking-tight">{titles[registry.kind]}</h1></div>
                <Badge variant="outline">{staffContext.operator.display_name}</Badge>
            </header>
            {registry.metrics && Object.keys(registry.metrics).length > 0 && <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(registry.metrics).map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label.replaceAll('_', ' ')}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{value ?? 'Unavailable'}</CardContent></Card>)}
            </section>}
            <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base">Records <span className="text-muted-foreground">({page.total})</span></CardTitle>
                    <form onSubmit={submitSearch} className="flex flex-wrap gap-2">
                        <Input aria-label="Search registry" placeholder="Search records" value={query} onChange={event => setQuery(event.target.value)} className="w-48" />
                        <Input aria-label="Status filter" placeholder="Status" value={status} onChange={event => setStatus(event.target.value)} className="w-32" />
                        {categorySupported && <Input aria-label={categoryLabel} placeholder={registry.kind === 'disputes' ? 'Category' : 'Category UUID'} value={category} onChange={event => { setCategory(event.target.value); setFilterError(null); }} className="w-40" />}
                        <select aria-label="Cohort filter" value={registry.filters.cohort ?? ''} onChange={event => visit({ cohort: event.target.value || null, page: 1 })} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                            <option value="">All cohorts</option>
                            {staffContext.cohort.options.map(cohort => <option key={cohort} value={cohort}>{cohort}</option>)}
                        </select>
                        <Button type="submit" variant="secondary">Apply filters</Button>
                    </form>
                    {filterError && <p role="alert" className="basis-full text-sm text-destructive">{filterError}</p>}
                </CardHeader>
                <CardContent>
                    <Table><TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Record</TableHead><TableHead>Status</TableHead><TableHead>Summary</TableHead><TableHead>Cohort</TableHead><TableHead>Updated</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>{registry.rows.data.map(row => <TableRow key={row.id}>
                            <TableCell className="font-mono text-xs">{row.reference}</TableCell>
                            <TableCell><div className="font-medium">{row.title}</div><div className="text-xs text-muted-foreground">{row.kind}</div></TableCell>
                            <TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
                            <TableCell className="max-w-sm whitespace-normal">{row.summary}{row.facts.length > 0 && <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">{row.facts.map((fact, index) => <span key={`${fact.label}-${index}`}>{fact.label}: {fact.value ?? '—'}</span>)}</div>}</TableCell>
                            <TableCell>{row.cohort || 'Unclassified'}</TableCell><TableCell>{row.updated_at}</TableCell>
                            <TableCell className="text-right"><Button asChild variant="ghost" size="sm"><Link href={row.inspect_url}>Inspect</Link></Button><ModerationActions row={row} /></TableCell>
                        </TableRow>)}{registry.rows.data.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No records match the current filters.</TableCell></TableRow>}</TableBody>
                    </Table>
                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>{page.from ?? 0}–{page.to ?? 0} of {page.total}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!registry.rows.links.prev} onClick={() => visit({ page: Math.max(1, page.current_page - 1) })}>Previous</Button><span className="px-2 py-1">Page {page.current_page} of {page.last_page}</span><Button variant="outline" size="sm" disabled={!registry.rows.links.next} onClick={() => visit({ page: page.current_page + 1 })}>Next</Button></div></div>
                </CardContent>
            </Card>
        </div>
    </>;
}

AdminRegistryPage.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
