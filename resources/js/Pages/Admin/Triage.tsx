import { Head, Link, router } from '@inertiajs/react';
import * as React from 'react';
import { Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { AdminLayout } from '@/layouts/AdminLayout';
import { StaffContextBadges } from '@/components/admin/StaffContextBadges';
import type { StaffInboxFilters, StaffInboxView, TriagePageProps } from '@/types/admin-workspace';

const savedViews: Array<{ value: StaffInboxView; label: string }> = [
    { value: 'all_open', label: 'All open' },
    { value: 'assigned_to_me', label: 'Assigned to me' },
    { value: 'waiting_on_me', label: 'Waiting on me' },
    { value: 'waiting_on_others', label: 'Waiting on others' },
    { value: 'closed', label: 'Closed' },
];

function filterParams(filters: StaffInboxFilters, changes: Partial<StaffInboxFilters> = {}) {
    const next = { ...filters, ...changes };
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(next)) {
        if (key !== 'page' && value !== null && value !== '') params[key] = String(value);
    }
    return params;
}

function filterQuery(filters: StaffInboxFilters, view: StaffInboxView) {
    const params = new URLSearchParams(filterParams(filters, { view }));
    return params.toString();
}

function prettyValue(value: string) {
    return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateLabel(value: string | null) {
    if (!value) return 'Not set';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function Triage({ inbox, views, filters, staffContext }: TriagePageProps) {
    const [search, setSearch] = React.useState(filters.q ?? '');
    const [filterDraft, setFilterDraft] = React.useState({
        status: filters.status ?? '',
        category: filters.category ?? '',
        cohort: filters.cohort ?? '',
        assignee: filters.assignee ?? '',
    });
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setSearch(filters.q ?? '');
        setFilterDraft({
            status: filters.status ?? '',
            category: filters.category ?? '',
            cohort: filters.cohort ?? '',
            assignee: filters.assignee ?? '',
        });
    }, [filters.q, filters.status, filters.category, filters.cohort, filters.assignee]);

    const visit = (next: Partial<StaffInboxFilters>) => {
        setPending(true);
        setError(null);
        router.get('/admin/triage', filterParams(filters, { ...next, page: 1 }), {
            preserveScroll: true,
            replace: true,
            onError: (errors) => {
                const first = Object.values(errors)[0];
                setError(typeof first === 'string' ? first : 'The inbox filters could not be applied.');
            },
            onFinish: () => setPending(false),
        });
    };

    const openPage = (href: string | null) => {
        if (!href) return;
        setPending(true);
        setError(null);
        router.visit(href, {
            preserveScroll: true,
            onError: () => setError('The requested inbox page could not be loaded.'),
            onFinish: () => setPending(false),
        });
    };

    return (
        <AdminLayout
            currentSection="triage"
            title="Staff Inbox"
            breadcrumbs={[{ label: 'Operations', href: '/admin/triage' }, { label: 'Staff Inbox' }]}
        >
            <Head title="Staff Inbox — Serbizyu Admin" />
            <div className="flex flex-col gap-5">
                <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">Staff Inbox</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Open a record to inspect its persisted state and current responsibility.</p>
                    </div>
                    <StaffContextBadges staffContext={staffContext} />
                </header>

                <nav aria-label="Saved inbox views" className="flex gap-2 overflow-x-auto pb-1">
                    {savedViews.map(({ value, label }) => {
                        const count = views[value];
                        const href = `/admin/triage?${filterQuery(filters, value)}`;
                        return (
                            <Link
                                key={value}
                                href={href}
                                aria-current={filters.view === value ? 'page' : undefined}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${filters.view === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted'}`}
                            >
                                <span>{label}</span>
                                <span className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${filters.view === value ? 'bg-mango-400 text-[#0f2f58]' : 'bg-muted text-muted-foreground'}`}>
                                    {count}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <Card className="border-border bg-card shadow-xs">
                    <CardContent className="flex flex-col gap-4 p-4">
                        <form
                            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
                            onSubmit={(event) => {
                                event.preventDefault();
                                const { status, category, cohort, assignee } = filterDraft;
                                visit({
                                    q: search.trim() || null,
                                    status: status || null,
                                    category: category || null,
                                    cohort: cohort || null,
                                    assignee: assignee || null,
                                });
                            }}
                        >
                            <label className="relative sm:col-span-2 lg:col-span-1">
                                <span className="sr-only">Search inbox</span>
                                <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Reference or title"
                                    className="pl-8"
                                />
                            </label>
                            {(['status', 'category', 'cohort', 'assignee'] as const).map((key) => (
                                <label key={key} className="flex flex-col gap-1 text-xs text-muted-foreground">
                                    <span>{prettyValue(key)}</span>
                                    {key === 'cohort' ? (
                                        <select
                                            value={filterDraft.cohort}
                                            onChange={(event) => {
                                                setFilterDraft((current) => ({ ...current, cohort: event.target.value }));
                                            }}
                                            aria-label="Filter by cohort"
                                            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        >
                                            <option value="">Any cohort</option>
                                            {staffContext.cohort.options.map((cohort) => <option key={cohort} value={cohort}>{prettyValue(cohort)}</option>)}
                                        </select>
                                    ) : (
                                        <Input
                                            value={filterDraft[key]}
                                            onChange={(event) => {
                                                setFilterDraft((current) => ({ ...current, [key]: event.target.value }));
                                            }}
                                            placeholder={`Any ${prettyValue(key).toLowerCase()}`}
                                            aria-label={`Filter by ${key}`}
                                        />
                                    )}
                                </label>
                            ))}
                            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
                                <Button type="submit" disabled={pending}>
                                    <Search className="mr-2 size-4" /> Search
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href="/admin/triage">Clear filters</Link>
                                </Button>
                                <span className="ml-auto self-center text-xs text-muted-foreground">
                                    {inbox.meta.total} records
                                </span>
                            </div>
                        </form>
                        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-border bg-card shadow-xs">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">{savedViews.find((view) => view.value === filters.view)?.label}</h2>
                            <p className="text-xs text-muted-foreground">
                                Showing {inbox.meta.from ?? 0}–{inbox.meta.to ?? 0} of {inbox.meta.total}
                            </p>
                        </div>
                        {pending && <span role="status" className="text-xs text-muted-foreground">Loading inbox…</span>}
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Record</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Assigned to</TableHead>
                                    <TableHead>Current responsibility</TableHead>
                                    <TableHead>Opened / response SLA</TableHead>
                                    <TableHead className="text-right">Open</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inbox.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">
                                            No records match this saved view and its filters.
                                        </TableCell>
                                    </TableRow>
                                ) : inbox.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="min-w-64">
                                            <div className="flex flex-col gap-1">
                                                <Link href={row.inspect_url} className="font-mono text-xs font-semibold text-primary hover:underline">{row.reference}</Link>
                                                <span className="text-sm font-medium text-foreground">{row.title}</span>
                                                <span className="text-xs text-muted-foreground">{prettyValue(row.kind)} · {row.severity ? prettyValue(row.severity) : 'Severity not set'} · {row.cohort}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{prettyValue(row.status)}</Badge></TableCell>
                                        <TableCell className="text-sm">{row.assigned_to?.display_name ?? 'Unassigned'}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-medium">{row.responsibility.label}</span>
                                                <span className="text-xs text-muted-foreground">{prettyValue(row.responsibility.party)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-52 text-xs text-muted-foreground">
                                            <div className="flex flex-col gap-1">
                                                <span>Updated {dateLabel(row.updated_at)}</span>
                                                <span>Opened {dateLabel(row.opened_at)}</span>
                                                <span>First response due {dateLabel(row.first_response_due_at)}</span>
                                                <span>Resolution due {dateLabel(row.resolution_due_at)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link href={row.inspect_url}>Inspect</Link></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <footer className="flex items-center justify-between border-t border-border px-4 py-3">
                        <Button variant="outline" size="sm" disabled={!inbox.links.prev || pending} onClick={() => openPage(inbox.links.prev)}>
                            Previous
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Page {inbox.meta.current_page} of {inbox.meta.last_page}
                        </span>
                        <Button variant="outline" size="sm" disabled={!inbox.links.next || pending} onClick={() => openPage(inbox.links.next)}>
                            Next
                        </Button>
                    </footer>
                </Card>
            </div>
        </AdminLayout>
    );
}
