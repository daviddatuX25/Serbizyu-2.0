import { Head, Link, router } from '@inertiajs/react';
import * as React from 'react';
import {
    ArrowRight,
    Check,
    CheckCircle2,
    Clock,
    Filter,
    PauseCircle,
    RefreshCw,
    RotateCw,
    Search,
    UserCheck,
    X,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AdminMetricCard } from '@/components/admin/GraphicMetrics';
import { AdminLayout } from '@/layouts/AdminLayout';

export type TriagePriority = 'P1' | 'P2' | 'P3';
export type TriageCategory = 'payment_hold' | 'work_variance' | 'dead_letter' | 'identity_review';

export interface QueueItem {
    id: string;
    priority: TriagePriority;
    category: TriageCategory;
    categoryLabel: string;
    reference: string;
    targetAggregate: string;
    counterparty1: { name: string; role: string; initials: string };
    counterparty2: { name: string; role: string; initials: string };
    amountMinor: number;
    context: string;
    slaRemaining: string;
    slaUrgent: boolean;
    actionType: 'inspect_and_hold' | 'inspect' | 'replay' | 'review_id';
    status: 'active' | 'resolved';
}

const INITIAL_QUEUE_ITEMS: QueueItem[] = [
    {
        id: 'item-1',
        priority: 'P1',
        category: 'payment_hold',
        categoryLabel: 'Payment Hold',
        reference: 'ORD-2026-09',
        targetAggregate: 'Payment Obligation (#OBL-881)',
        counterparty1: { name: 'Maria Santos', role: 'Buyer', initials: 'MS' },
        counterparty2: { name: 'Arman Tech', role: 'Provider', initials: 'AT' },
        amountMinor: 9000,
        context:
            'Buyer reported ₱90 cash paid; provider reports zero received. Surgical hold active.',
        slaRemaining: '1h 45m left',
        slaUrgent: true,
        actionType: 'inspect_and_hold',
        status: 'active',
    },
    {
        id: 'item-2',
        priority: 'P2',
        category: 'work_variance',
        categoryLabel: 'Work Variance',
        reference: 'ORD-2026-04',
        targetAggregate: 'Work Delivery (A4 Handoff)',
        counterparty1: { name: 'Elena Cruz', role: 'Buyer', initials: 'EC' },
        counterparty2: { name: 'Tagudin Bakery', role: 'Merchant', initials: 'TB' },
        amountMinor: 12000,
        context:
            'Quantity variance: 18 pieces received versus 24 ordered. Delivery sign-off contested.',
        slaRemaining: '3h 20m left',
        slaUrgent: false,
        actionType: 'inspect',
        status: 'active',
    },
    {
        id: 'item-3',
        priority: 'P2',
        category: 'dead_letter',
        categoryLabel: 'Dead-Letter Outbox',
        reference: 'EVT-0198-a1',
        targetAggregate: 'Transactional Outbox Worker',
        counterparty1: { name: 'Outbox Engine', role: 'System', initials: 'SYS' },
        counterparty2: { name: '+639178123456', role: 'Citizen', initials: 'PH' },
        amountMinor: 0,
        context:
            'SMS notification gateway timed out after 3 retries (504 Semaphore Gateway Timeout).',
        slaRemaining: 'OVERDUE',
        slaUrgent: true,
        actionType: 'replay',
        status: 'active',
    },
    {
        id: 'item-4',
        priority: 'P3',
        category: 'identity_review',
        categoryLabel: 'Identity Review',
        reference: 'USR-0042-id',
        targetAggregate: 'Citizen Capability Profile Gate',
        counterparty1: { name: 'Juan Carpentry', role: 'Applicant', initials: 'JC' },
        counterparty2: { name: 'Barangay Farola', role: 'LGU', initials: 'LGU' },
        amountMinor: 0,
        context:
            'Barangay clearance & DTI cert submitted for A1 Linear Project provider qualification.',
        slaRemaining: '24h 00m left',
        slaUrgent: false,
        actionType: 'review_id',
        status: 'active',
    },
];

export default function Triage() {
    const [items, setItems] = React.useState<QueueItem[]>(INITIAL_QUEUE_ITEMS);
    const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
    const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
    const [searchQuery, setSearchQuery] = React.useState<string>('');
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [currentPage, setCurrentPage] = React.useState<number>(1);
    const pageSize = 10;

    // Hold Resolution Modal State
    const [selectedHoldItem, setSelectedHoldItem] = React.useState<QueueItem | null>(null);
    const [isHoldSheetOpen, setIsHoldSheetOpen] = React.useState<boolean>(false);
    const [releaseReason, setReleaseReason] = React.useState<string>('mutual_acknowledgement');
    const [operatorNotes, setOperatorNotes] = React.useState<string>('');
    const [isSubmittingHold, setIsSubmittingHold] = React.useState<boolean>(false);
    const [lastResolvedRef, setLastResolvedRef] = React.useState<string | null>(null);

    // Outbox Replay state
    const [replayingId, setReplayingId] = React.useState<string | null>(null);

    // Replay outbox handler
    const handleReplay = (id: string) => {
        setReplayingId(id);
        setTimeout(() => {
            setReplayingId(null);
            setItems((prev) =>
                prev.map((item) =>
                    item.id === id
                        ? {
                              ...item,
                              status: 'resolved',
                              context:
                                  'Event replayed successfully via TextBee GSM gateway. Outbox published.',
                              slaRemaining: 'RESOLVED',
                              slaUrgent: false,
                          }
                        : item,
                ),
            );
        }, 1200);
    };

    // Open Hold Resolution
    const handleOpenHold = (item: QueueItem) => {
        setSelectedHoldItem(item);
        setReleaseReason('mutual_acknowledgement');
        setOperatorNotes('');
        setIsHoldSheetOpen(true);
    };

    // Confirm Hold Release
    const handleConfirmReleaseHold = () => {
        if (!selectedHoldItem) return;
        setIsSubmittingHold(true);

        setTimeout(() => {
            setIsSubmittingHold(false);
            setIsHoldSheetOpen(false);
            setLastResolvedRef(selectedHoldItem.reference);
            setItems((prev) =>
                prev.map((item) =>
                    item.id === selectedHoldItem.id
                        ? {
                              ...item,
                              status: 'resolved',
                              context: `Administrative hold lifted by Officer Santos (${releaseReason.replace(/_/g, ' ')}). Payment obligation restored.`,
                              slaRemaining: 'RELEASED',
                              slaUrgent: false,
                          }
                        : item,
                ),
            );
        }, 800);
    };

    // Filtered Items
    const filteredItems = React.useMemo(() => {
        return items.filter((item) => {
            if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
                return false;
            }
            if (categoryFilter !== 'all' && item.category !== categoryFilter) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    item.reference.toLowerCase().includes(q) ||
                    item.targetAggregate.toLowerCase().includes(q) ||
                    item.context.toLowerCase().includes(q) ||
                    item.counterparty1.name.toLowerCase().includes(q) ||
                    item.counterparty2.name.toLowerCase().includes(q) ||
                    item.categoryLabel.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [items, priorityFilter, categoryFilter, searchQuery]);

    // Pagination calculations
    const totalItems = filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const paginatedItems = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredItems.slice(start, start + pageSize);
    }, [filteredItems, currentPage, pageSize]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [priorityFilter, categoryFilter, searchQuery]);

    // Selection helpers
    const isAllPageSelected =
        paginatedItems.length > 0 && paginatedItems.every((item) => selectedIds.includes(item.id));
    const isSomePageSelected =
        paginatedItems.some((item) => selectedIds.includes(item.id)) && !isAllPageSelected;

    // Dynamic counts for tabs & metrics
    const activeCount = items.filter((i) => i.status === 'active').length;
    const p1Count = items.filter((i) => i.priority === 'P1' && i.status === 'active').length;
    const p2Count = items.filter((i) => i.priority === 'P2' && i.status === 'active').length;
    const p3Count = items.filter((i) => i.priority === 'P3' && i.status === 'active').length;

    return (
        <AdminLayout
            currentSection="triage"
            title="Operations Triage Queue"
            breadcrumbs={[
                { label: 'Operations', href: '/admin/triage' },
                { label: 'Triage Queue' },
            ]}
        >
            <Head title="Triage Queue — Serbizyu Admin" />

            <div className="flex flex-col gap-6">
                {/* Page Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
                            Operations Triage Queue
                        </h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Priority incident desk for targeted holds, order disputes, outbox
                            dead-letters, and capability reviews.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className="w-fit border-amber-500/30 bg-amber-500/5 px-2.5 py-1 font-mono text-xs text-amber-500"
                        >
                            <span className="relative mr-1.5 flex size-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex size-2 rounded-full bg-amber-500"></span>
                            </span>
                            {activeCount} Actionable Incidents
                        </Badge>
                    </div>
                </div>

                {/* Hold Released Success Banner */}
                {lastResolvedRef && (
                    <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                        <div className="flex w-full items-center justify-between">
                            <div>
                                <AlertTitle className="text-xs font-bold text-foreground">
                                    Administrative Hold Successfully Released
                                </AlertTitle>
                                <AlertDescription className="mt-0.5 text-xs text-muted-foreground">
                                    Targeted hold on{' '}
                                    <span className="font-mono font-bold text-foreground">
                                        {lastResolvedRef}
                                    </span>{' '}
                                    was removed. Payment obligation restored to mutually
                                    acknowledged.
                                </AlertDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => setLastResolvedRef(null)}
                            >
                                <X className="size-3.5" />
                            </Button>
                        </div>
                    </Alert>
                )}

                {/* 4 Urgency Focus Metric Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Link href="/admin/disputes" className="group block">
                        <AdminMetricCard
                            title="Targeted Holds"
                            value={items
                                .filter(
                                    (i) => i.category === 'payment_hold' && i.status === 'active',
                                )
                                .length.toString()
                                .padStart(2, '0')}
                            statusBeacon="warning"
                            accentColor="#f59e0b"
                            badgeText="Surgical Hold"
                            subtext="Payment frozen · Work execution unblocked"
                        />
                    </Link>

                    <Link href="/admin/disputes" className="group block">
                        <AdminMetricCard
                            title="Dispute Cases"
                            value={items
                                .filter(
                                    (i) => i.category === 'work_variance' && i.status === 'active',
                                )
                                .length.toString()
                                .padStart(2, '0')}
                            statusBeacon="danger"
                            accentColor="#ef4444"
                            badgeText="A4 Handoff"
                            subtext="Quantity variance contested by Buyer"
                        />
                    </Link>

                    <Link href="/admin/system-health" className="group block">
                        <AdminMetricCard
                            title="Dead-Letter Outbox"
                            value={items
                                .filter(
                                    (i) => i.category === 'dead_letter' && i.status === 'active',
                                )
                                .length.toString()
                                .padStart(2, '0')}
                            statusBeacon="danger"
                            accentColor="#ef4444"
                            badgeText="3 Retries Max"
                            subtext="SMS gateway timeout awaiting replay"
                        />
                    </Link>

                    <Link href="/admin/identity-review" className="group block">
                        <AdminMetricCard
                            title="Citizen Accreditations"
                            value={items
                                .filter(
                                    (i) =>
                                        i.category === 'identity_review' && i.status === 'active',
                                )
                                .length.toString()
                                .padStart(2, '0')}
                            statusBeacon="live"
                            accentColor="#3b82f6"
                            badgeText="A1 Project"
                            subtext="Barangay & DTI clearances submitted"
                        />
                    </Link>
                </div>

                {/* Filter, Search & Action Toolbar */}
                <Card className="border-border bg-card shadow-xs">
                    <CardHeader className="flex flex-col gap-3 border-b border-border p-4 pb-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            {/* Priority Filter Tabs */}
                            <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs font-medium">
                                <button
                                    type="button"
                                    onClick={() => setPriorityFilter('all')}
                                    className={`rounded-md px-2.5 py-1 transition-colors ${
                                        priorityFilter === 'all'
                                            ? 'bg-background font-semibold text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    All Incidents ({items.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPriorityFilter('P1')}
                                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors ${
                                        priorityFilter === 'P1'
                                            ? 'bg-background font-semibold text-destructive shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <span className="size-1.5 rounded-full bg-destructive" />
                                    P1 Critical ({p1Count})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPriorityFilter('P2')}
                                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors ${
                                        priorityFilter === 'P2'
                                            ? 'bg-background font-semibold text-amber-500 shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <span className="size-1.5 rounded-full bg-amber-500" />
                                    P2 Urgent ({p2Count})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPriorityFilter('P3')}
                                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors ${
                                        priorityFilter === 'P3'
                                            ? 'bg-background font-semibold text-blue-500 shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <span className="size-1.5 rounded-full bg-blue-500" />
                                    P3 Routine ({p3Count})
                                </button>
                            </div>

                            {/* Category Filter Select */}
                            <div className="flex shrink-0 items-center gap-2">
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="h-8 w-44 border-border bg-muted/20 text-xs text-foreground">
                                        <Filter className="mr-1.5 size-3.5 text-muted-foreground" />
                                        <SelectValue placeholder="Filter Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        <SelectItem value="payment_hold">Payment Holds</SelectItem>
                                        <SelectItem value="work_variance">
                                            Work Variances
                                        </SelectItem>
                                        <SelectItem value="dead_letter">
                                            Outbox Dead-Letters
                                        </SelectItem>
                                        <SelectItem value="identity_review">
                                            Identity Reviews
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Fast Search Input */}
                        <div className="relative w-full">
                            <Search className="absolute top-2.5 left-3 size-3.5 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search queue..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 w-full border-border bg-muted/20 pl-9 font-mono text-xs text-foreground"
                            />
                        </div>
                    </CardHeader>

                    {/* Bulk Selection Bar */}
                    {selectedIds.length > 0 && (
                        <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-2 text-xs">
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className="bg-background font-mono text-[10px]"
                                >
                                    {selectedIds.length} Selected
                                </Badge>
                                <span className="text-muted-foreground">
                                    Desk actions available for selected items
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => setSelectedIds([])}
                                >
                                    Clear
                                </Button>
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                        alert(
                                            `Acknowledged ${selectedIds.length} incidents in triage log.`,
                                        );
                                        setSelectedIds([]);
                                    }}
                                >
                                    <Check className="mr-1 size-3" />
                                    Acknowledge Selected
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Scan-First Table */}
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-border bg-muted/20 text-xs">
                                    <TableHead className="w-10 text-center">
                                        <Checkbox
                                            checked={
                                                isAllPageSelected
                                                    ? true
                                                    : isSomePageSelected
                                                      ? 'indeterminate'
                                                      : false
                                            }
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    const newIds = Array.from(
                                                        new Set([
                                                            ...selectedIds,
                                                            ...paginatedItems.map((i) => i.id),
                                                        ]),
                                                    );
                                                    setSelectedIds(newIds);
                                                } else {
                                                    const pageIds = paginatedItems.map((i) => i.id);
                                                    setSelectedIds(
                                                        selectedIds.filter(
                                                            (id) => !pageIds.includes(id),
                                                        ),
                                                    );
                                                }
                                            }}
                                            aria-label="Select all"
                                        />
                                    </TableHead>
                                    <TableHead className="w-28">Priority</TableHead>
                                    <TableHead className="w-40">Incident Ref</TableHead>
                                    <TableHead className="w-48">Counterparties</TableHead>
                                    <TableHead>Incident Context &amp; Root Cause</TableHead>
                                    <TableHead className="w-32">SLA Countdown</TableHead>
                                    <TableHead className="w-48 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="h-32 text-center text-xs text-muted-foreground"
                                        >
                                            No matching incidents found in the triage queue.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedItems.map((item) => {
                                        const isSelected = selectedIds.includes(item.id);
                                        const isResolved = item.status === 'resolved';

                                        return (
                                            <TableRow
                                                key={item.id}
                                                className={`text-xs transition-colors hover:bg-muted/30 ${
                                                    isSelected ? 'bg-muted/40' : ''
                                                } ${isResolved ? 'bg-muted/10 opacity-60' : ''}`}
                                            >
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedIds([
                                                                    ...selectedIds,
                                                                    item.id,
                                                                ]);
                                                            } else {
                                                                setSelectedIds(
                                                                    selectedIds.filter(
                                                                        (id) => id !== item.id,
                                                                    ),
                                                                );
                                                            }
                                                        }}
                                                        aria-label={`Select ${item.reference}`}
                                                    />
                                                </TableCell>

                                                {/* Priority Column */}
                                                <TableCell>
                                                    {item.priority === 'P1' ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="flex w-fit items-center gap-1.5 border-destructive/40 bg-destructive/5 font-mono text-[10px] text-destructive"
                                                        >
                                                            <span className="relative flex size-1.5">
                                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
                                                                <span className="relative inline-flex size-1.5 rounded-full bg-destructive"></span>
                                                            </span>
                                                            P1 CRITICAL
                                                        </Badge>
                                                    ) : item.priority === 'P2' ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="flex w-fit items-center gap-1.5 border-amber-500/40 bg-amber-500/5 font-mono text-[10px] text-amber-500"
                                                        >
                                                            <span className="size-1.5 rounded-full bg-amber-500" />
                                                            P2 URGENT
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="flex w-fit items-center gap-1.5 border-blue-500/40 bg-blue-500/5 font-mono text-[10px] text-blue-500"
                                                        >
                                                            <span className="size-1.5 rounded-full bg-blue-500" />
                                                            P3 ROUTINE
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                {/* Reference & Target Column */}
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-mono font-bold text-foreground transition-colors hover:text-primary">
                                                            {item.reference}
                                                        </span>
                                                        <span className="truncate text-[10px] text-muted-foreground">
                                                            {item.targetAggregate}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Counterparties Column */}
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="size-6 shrink-0 rounded-full border border-border">
                                                            <AvatarFallback className="bg-muted text-[9px] font-semibold text-foreground">
                                                                {item.counterparty1.initials}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col overflow-hidden text-[11px] leading-tight">
                                                            <span className="truncate font-medium text-foreground">
                                                                {item.counterparty1.name}
                                                            </span>
                                                            <span className="truncate text-[9.5px] text-muted-foreground">
                                                                ➔ {item.counterparty2.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Incident Context Column */}
                                                <TableCell>
                                                    <div className="flex max-w-xl flex-col gap-1">
                                                        <span className="leading-snug text-foreground">
                                                            {item.context}
                                                        </span>
                                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                            <Badge
                                                                variant="outline"
                                                                className="px-1.5 py-0 text-[9px]"
                                                            >
                                                                {item.categoryLabel}
                                                            </Badge>
                                                            {item.amountMinor > 0 && (
                                                                <span className="font-mono font-semibold text-foreground">
                                                                    ₱
                                                                    {(
                                                                        item.amountMinor / 100
                                                                    ).toFixed(2)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* SLA Countdown Column */}
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                                        <Clock
                                                            className={`size-3.5 shrink-0 ${item.slaUrgent ? 'text-destructive' : 'text-muted-foreground'}`}
                                                        />
                                                        <span
                                                            className={
                                                                item.slaUrgent
                                                                    ? 'font-bold text-destructive'
                                                                    : 'text-foreground'
                                                            }
                                                        >
                                                            {item.slaRemaining}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Actions Column */}
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {item.actionType === 'inspect_and_hold' && (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-7 px-2 text-xs"
                                                                    onClick={() =>
                                                                        router.visit(
                                                                            `/admin/inspect?ref=${encodeURIComponent(item.reference)}`,
                                                                        )
                                                                    }
                                                                >
                                                                    Inspect
                                                                </Button>
                                                                {item.status === 'active' && (
                                                                    <Button
                                                                        variant="default"
                                                                        size="sm"
                                                                        className="h-7 bg-amber-600 px-2 text-xs text-white hover:bg-amber-700"
                                                                        onClick={() =>
                                                                            handleOpenHold(item)
                                                                        }
                                                                    >
                                                                        Resolve Hold
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}

                                                        {item.actionType === 'inspect' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 px-2.5 text-xs"
                                                                onClick={() =>
                                                                    router.visit(
                                                                        `/admin/inspect?ref=${encodeURIComponent(item.reference)}`,
                                                                    )
                                                                }
                                                            >
                                                                <span>Inspect Case</span>
                                                                <ArrowRight className="ml-1 size-3" />
                                                            </Button>
                                                        )}

                                                        {item.actionType === 'replay' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 border-border px-2.5 text-xs hover:bg-muted"
                                                                disabled={
                                                                    replayingId === item.id ||
                                                                    item.status === 'resolved'
                                                                }
                                                                onClick={() =>
                                                                    handleReplay(item.id)
                                                                }
                                                            >
                                                                {replayingId === item.id ? (
                                                                    <>
                                                                        <RotateCw className="mr-1 size-3 animate-spin text-primary" />
                                                                        <span>Replaying...</span>
                                                                    </>
                                                                ) : item.status === 'resolved' ? (
                                                                    <>
                                                                        <Check className="mr-1 size-3 text-emerald-500" />
                                                                        <span>Replayed</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <RefreshCw className="mr-1 size-3" />
                                                                        <span>Replay Event</span>
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}

                                                        {item.actionType === 'review_id' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 px-2.5 text-xs"
                                                                onClick={() =>
                                                                    router.visit(
                                                                        '/admin/identity-review',
                                                                    )
                                                                }
                                                            >
                                                                <UserCheck className="mr-1 size-3 text-primary" />
                                                                <span>Review Identity</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between border-t border-border p-4 text-xs text-muted-foreground">
                        <div>
                            Showing{' '}
                            <span className="font-semibold text-foreground">
                                {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                            </span>{' '}
                            to{' '}
                            <span className="font-semibold text-foreground">
                                {Math.min(currentPage * pageSize, totalItems)}
                            </span>{' '}
                            of <span className="font-semibold text-foreground">{totalItems}</span>{' '}
                            incidents
                        </div>

                        {totalPages > 1 && (
                            <Pagination className="mx-0 w-auto">
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() =>
                                                setCurrentPage((p) => Math.max(1, p - 1))
                                            }
                                            disabled={currentPage <= 1}
                                        />
                                    </PaginationItem>
                                    {Array.from({ length: totalPages }).map((_, i) => (
                                        <PaginationItem key={i}>
                                            <PaginationLink
                                                isActive={currentPage === i + 1}
                                                onClick={() => setCurrentPage(i + 1)}
                                            >
                                                {i + 1}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() =>
                                                setCurrentPage((p) => Math.min(totalPages, p + 1))
                                            }
                                            disabled={currentPage >= totalPages}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        )}
                    </div>
                </Card>
            </div>

            {/* ===================================================================
           HOLD RESOLUTION SHEET / DRAWER (OPS-001 & OPS-005)
           =================================================================== */}
            <Sheet open={isHoldSheetOpen} onOpenChange={setIsHoldSheetOpen}>
                <SheetContent
                    side="right"
                    className="flex w-full flex-col justify-between border-border bg-card p-6 sm:max-w-md"
                >
                    <div className="flex flex-col gap-6">
                        <SheetHeader className="border-b border-border pb-4">
                            <div className="flex items-center gap-2 text-amber-500">
                                <PauseCircle className="size-5 shrink-0" />
                                <SheetTitle className="font-heading text-base font-bold text-foreground">
                                    Resolve Targeted Hold
                                </SheetTitle>
                            </div>
                            <SheetDescription className="mt-1 text-xs text-muted-foreground">
                                Release surgical administrative freeze on payment obligation. Work
                                progress has continued independently.
                            </SheetDescription>
                        </SheetHeader>

                        {selectedHoldItem && (
                            <div className="flex flex-col gap-4 text-xs">
                                {/* Scope Confirmation Box */}
                                <div className="flex flex-col gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-foreground">
                                            Target Aggregate:
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="border-amber-500/40 font-mono text-[10px] text-amber-500"
                                        >
                                            Payment Obligation
                                        </Badge>
                                    </div>
                                    <span className="font-mono text-muted-foreground">
                                        {selectedHoldItem.targetAggregate}
                                    </span>
                                    <div className="border-t border-amber-500/20 pt-2 text-[11px] text-muted-foreground">
                                        Order Ref:{' '}
                                        <strong className="font-mono text-foreground">
                                            {selectedHoldItem.reference}
                                        </strong>
                                    </div>
                                </div>

                                {/* Reason Select */}
                                <div className="flex flex-col gap-1.5">
                                    <Label
                                        htmlFor="hold-reason"
                                        className="text-xs font-semibold text-foreground"
                                    >
                                        Basis for Administrative Release
                                    </Label>
                                    <Select value={releaseReason} onValueChange={setReleaseReason}>
                                        <SelectTrigger
                                            id="hold-reason"
                                            className="border-border bg-muted/20 text-xs text-foreground"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mutual_acknowledgement">
                                                Mutual Cash Receipt Acknowledged
                                            </SelectItem>
                                            <SelectItem value="evidence_validated">
                                                Digital Payment Screenshot Validated
                                            </SelectItem>
                                            <SelectItem value="reconciled_without_prejudice">
                                                Reconciled After Teleconference
                                            </SelectItem>
                                            <SelectItem value="desk_supervisor_override">
                                                Desk Supervisor Administrative Override
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Operator Signature & Notes */}
                                <div className="flex flex-col gap-1.5">
                                    <Label
                                        htmlFor="operator-notes"
                                        className="text-xs font-semibold text-foreground"
                                    >
                                        Operator Case File Notes
                                    </Label>
                                    <Textarea
                                        id="operator-notes"
                                        placeholder="Enter audit notes justifying the unfreeze decision..."
                                        value={operatorNotes}
                                        onChange={(e) => setOperatorNotes(e.target.value)}
                                        className="min-h-[90px] border-border bg-muted/20 font-mono text-xs text-foreground"
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                        Logged under Officer Santos (Desk Supervisor) with immutable
                                        cryptographic timestamp.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <SheetFooter className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs sm:w-auto"
                            onClick={() => setIsHoldSheetOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            className="w-full bg-emerald-600 text-xs text-white hover:bg-emerald-700 sm:w-auto"
                            disabled={isSubmittingHold}
                            onClick={handleConfirmReleaseHold}
                        >
                            {isSubmittingHold ? (
                                <>
                                    <RotateCw className="mr-1.5 size-3.5 animate-spin" />
                                    <span>Committing Release...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="mr-1.5 size-3.5" />
                                    <span>Confirm Release Hold</span>
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </AdminLayout>
    );
}
