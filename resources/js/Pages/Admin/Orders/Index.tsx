import { Head } from '@inertiajs/react';
import * as React from 'react';
import {
    ArrowLeft,
    ArrowUpRight,
    Check,
    CheckCircle2,
    ChevronRight,
    FileCheck2,
    FileDown,
    FileText,
    Flag,
    PauseCircle,
    Search,
    Send,
    ShieldAlert,
    Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { AdminMetricCard } from '@/components/admin/GraphicMetrics';
import { AdminLayout } from '@/layouts/AdminLayout';

export interface OrderRecord {
    id: string;
    reference: string;
    workShape: 'A1' | 'A3' | 'A4' | 'A9';
    shapeTitle: string;
    listingTitle: string;
    imageUrl: string;
    buyer: { name: string; initials: string; phone: string };
    provider: { name: string; initials: string; handle: string };
    amountMinor: number;
    lane: 'cash' | 'proof' | 'direct' | 'tiwala';
    status: 'accepted' | 'in_progress' | 'awaiting_signoff' | 'completed' | 'on_hold' | 'disputed';
    hasActiveHold: boolean;
    holdScope?: string;
    progressStep: string;
    createdAt: string;
    completionPct: number;
    correlationId: string;
    evidencePhotos?: Array<{ label: string; url: string; time: string }>;
    pipelineSteps?: Array<{
        step: number;
        title: string;
        desc: string;
        status: 'done' | 'active' | 'gated';
        proof?: string;
        time?: string;
    }>;
    events?: Array<{
        time: string;
        type: 'Order' | 'Work' | 'Payment' | 'Dispute' | 'Hold';
        actor: string;
        text: string;
    }>;
}

const SAMPLE_ORDERS: OrderRecord[] = [
    {
        id: 'ord-1',
        reference: 'ORD-2026-09',
        workShape: 'A1',
        shapeTitle: 'Linear Project',
        listingTitle: 'Ceiling Fan Motor Diagnostics & Capacitor Replacement',
        imageUrl: '/photos/ac-capacitor.jpg',
        buyer: { name: 'Maria Santos', initials: 'MS', phone: '+63 917 812 3456' },
        provider: { name: 'Arman Electric', initials: 'AE', handle: '@arman' },
        amountMinor: 9000,
        lane: 'cash',
        status: 'on_hold',
        hasActiveHold: true,
        holdScope: 'Payment Obligation #OBL-881',
        progressStep: 'Step 2 of 3 (Replace Component)',
        createdAt: '2026-09-17 14:10',
        completionPct: 66,
        correlationId: '0198a3-c481',
        evidencePhotos: [
            {
                label: 'Step 1: Disassembly & Stator Inspection',
                url: '/photos/ac-clean.jpg',
                time: '14:15 PHT',
            },
            {
                label: 'Step 2: New 1.5uF Run Capacitor Unit',
                url: '/photos/ac-capacitor.jpg',
                time: '14:22 PHT',
            },
        ],
        pipelineSteps: [
            {
                step: 1,
                title: 'Intake & Disassembly',
                desc: 'Diagnostic inspection & casing removal.',
                status: 'done',
                proof: 'Photo verified ✓',
                time: '14:15:20 PHT',
            },
            {
                step: 2,
                title: 'Component Replacement',
                desc: 'Replace 1.5uF ceiling fan run capacitor.',
                status: 'active',
                proof: 'Wiring replacement...',
                time: 'Elapsed: 35m',
            },
            {
                step: 3,
                title: 'Amperage Load Test',
                desc: 'Bench test motor draw and high-speed spin.',
                status: 'gated',
                proof: 'Pending Step 2',
            },
        ],
        events: [
            {
                time: '14:10:02 PHT',
                type: 'Order',
                actor: 'BUYER-07',
                text: 'Terms accepted for Ceiling Fan Capacitor Replacement. Snapshot v1 locked at ₱90.00 with External Cash terms.',
            },
            {
                time: '14:15:20 PHT',
                type: 'Work',
                actor: 'PROVIDER-07',
                text: 'Work Step 1: Disassembly initiated. Photo evidence uploaded (disassembly.jpg).',
            },
            {
                time: '14:22:11 PHT',
                type: 'Payment',
                actor: 'BUYER-07',
                text: "Buyer submitted declaration: 'External Cash Paid: ₱90.00 in person'. Awaiting provider counter-confirmation.",
            },
            {
                time: '14:25:00 PHT',
                type: 'Dispute',
                actor: 'PROVIDER-07',
                text: "Provider flagged cash mismatch: 'No cash handed over during disassembly; buyer stated payment was made via family member'.",
            },
            {
                time: '14:30:15 PHT',
                type: 'Hold',
                actor: 'ADMIN-01',
                text: 'Operator ADMIN-01 placed scoped administrative hold on Payment Obligation #OBL-881. Reason class: dispute. Work instance remains unblocked.',
            },
        ],
    },
    {
        id: 'ord-2',
        reference: 'ORD-2026-04',
        workShape: 'A4',
        shapeTitle: 'Physical Handoff',
        listingTitle: 'Weekend Special Bibingka Tray (24 pcs Party Box)',
        imageUrl: '/photos/bibingka.jpg',
        buyer: { name: 'Elena Cruz', initials: 'EC', phone: '+63 918 991 2345' },
        provider: { name: 'Tagudin Traditional Bakes', initials: 'TB', handle: '@ate_gina' },
        amountMinor: 12000,
        lane: 'proof',
        status: 'disputed',
        hasActiveHold: false,
        progressStep: 'Delivery Handoff Disputed',
        createdAt: '2026-09-17 11:30',
        completionPct: 50,
        correlationId: '0198a3-b210',
        evidencePhotos: [
            { label: 'Party Box Packed at Bakery', url: '/photos/bibingka.jpg', time: '11:35 PHT' },
        ],
        pipelineSteps: [
            {
                step: 1,
                title: 'Baking & Packaging',
                desc: 'Batch baking in banana leaves and boxing.',
                status: 'done',
                proof: 'Box sealed ✓',
                time: '11:30 PHT',
            },
            {
                step: 2,
                title: 'Handoff to Courier',
                desc: 'Transfer package to Tagudin Express rider.',
                status: 'active',
                proof: 'Handoff disputed',
                time: '11:45 PHT',
            },
        ],
        events: [
            {
                time: '11:30:00 PHT',
                type: 'Order',
                actor: 'BUYER-04',
                text: 'Order placed for 24 pcs Bibingka Party Box via Digital Proof lane.',
            },
            {
                time: '11:45:10 PHT',
                type: 'Dispute',
                actor: 'BUYER-04',
                text: 'Buyer reported delivery delay and box damage during transit.',
            },
        ],
    },
    {
        id: 'ord-3',
        reference: 'ORD-2026-08',
        workShape: 'A3',
        shapeTitle: 'Appointment',
        listingTitle: 'On-Site Home Plumbing Jetmatic Inspection',
        imageUrl: '/photos/ac-clean.jpg',
        buyer: { name: 'Roberto Diaz', initials: 'RD', phone: '+63 919 445 6789' },
        provider: { name: 'Kuya Ben Plumbing', initials: 'BP', handle: '@ben_pipes' },
        amountMinor: 4500,
        lane: 'cash',
        status: 'in_progress',
        hasActiveHold: false,
        progressStep: 'On-Site Inspection Slot Confirmed',
        createdAt: '2026-09-17 09:15',
        completionPct: 33,
        correlationId: '0198a3-a005',
        evidencePhotos: [
            {
                label: 'Arrival at Site / Jetmatic Pump',
                url: '/photos/ac-clean.jpg',
                time: '09:30 PHT',
            },
        ],
        pipelineSteps: [
            {
                step: 1,
                title: 'Site Arrival & Visual Check',
                desc: 'Inspect pipe casing and seal condition.',
                status: 'done',
                proof: 'Arrival logged',
                time: '09:30 PHT',
            },
            {
                step: 2,
                title: 'Pressure & Leak Testing',
                desc: 'Verify prime holding pressure.',
                status: 'active',
                proof: 'Testing pressure',
            },
        ],
        events: [
            {
                time: '09:15:00 PHT',
                type: 'Order',
                actor: 'BUYER-08',
                text: 'Appointment slot confirmed for residential plumbing inspection.',
            },
            {
                time: '09:30:12 PHT',
                type: 'Work',
                actor: 'PROVIDER-08',
                text: 'Provider arrived on-site in Barangay Bitalag.',
            },
        ],
    },
    {
        id: 'ord-4',
        reference: 'ORD-2026-07',
        workShape: 'A1',
        shapeTitle: 'Linear Project',
        listingTitle: 'Main Electric Panelboard Breaker Upgrade (ISECO Liaison)',
        imageUrl: '/photos/req-electrician.jpg',
        buyer: { name: 'Mang Ernesto', initials: 'ME', phone: '+63 920 123 9876' },
        provider: { name: 'Arman Electric', initials: 'AE', handle: '@arman' },
        amountMinor: 35000,
        lane: 'cash',
        status: 'awaiting_signoff',
        hasActiveHold: false,
        progressStep: 'Step 3 of 3 (Final Sign-off Submitted)',
        createdAt: '2026-09-16 16:40',
        completionPct: 90,
        correlationId: '0198a3-9901',
        evidencePhotos: [
            {
                label: 'New Industrial Circuit Breakers Installed',
                url: '/photos/req-electrician.jpg',
                time: '17:15 PHT',
            },
        ],
        pipelineSteps: [
            {
                step: 1,
                title: 'Power Disconnect & De-energize',
                desc: 'Coordinate main fuse cutoff.',
                status: 'done',
                proof: 'De-energized ✓',
                time: '16:45 PHT',
            },
            {
                step: 2,
                title: 'Breaker Mounting & Busbar Wiring',
                desc: 'Install 60A main breaker and busbar.',
                status: 'done',
                proof: 'Wiring photo verified',
                time: '17:15 PHT',
            },
            {
                step: 3,
                title: 'Load Balancing & Energization',
                desc: 'Differential test with client.',
                status: 'active',
                proof: 'Awaiting sign-off',
            },
        ],
        events: [
            {
                time: '16:40:00 PHT',
                type: 'Order',
                actor: 'BUYER-07',
                text: 'Contract confirmed for panelboard upgrade.',
            },
            {
                time: '17:30:00 PHT',
                type: 'Work',
                actor: 'PROVIDER-07',
                text: 'Provider completed physical work and submitted sign-off request.',
            },
        ],
    },
    {
        id: 'ord-5',
        reference: 'ORD-2026-05',
        workShape: 'A9',
        shapeTitle: 'Digital Delivery',
        listingTitle: 'Custom Screenprint Vector Logo for Barangay League',
        imageUrl: '/photos/req-cement.jpg',
        buyer: { name: 'Barangay Farola SK', initials: 'BF', phone: '+63 921 345 6780' },
        provider: { name: 'Maya Dela Cruz', initials: 'MD', handle: '@maya_designs' },
        amountMinor: 15000,
        lane: 'tiwala',
        status: 'completed',
        hasActiveHold: false,
        progressStep: 'Final Vector Assets Accepted',
        createdAt: '2026-09-15 13:20',
        completionPct: 100,
        correlationId: '0198a3-7744',
    },
    {
        id: 'ord-6',
        reference: 'ORD-2026-02',
        workShape: 'A4',
        shapeTitle: 'Physical Handoff',
        listingTitle: 'Palay Grain Hauling (Ambalayat Paddy to Solar Dryer)',
        imageUrl: '/photos/courier.jpg',
        buyer: { name: 'Ernesto Batalag', initials: 'EB', phone: '+63 922 765 4321' },
        provider: { name: 'Bitalag Kuliglig Guild', initials: 'KG', handle: '@bitalag_haul' },
        amountMinor: 24000,
        lane: 'cash',
        status: 'completed',
        hasActiveHold: false,
        progressStep: '160 Sacks Transferred & Signed',
        createdAt: '2026-09-15 08:00',
        completionPct: 100,
        correlationId: '0198a3-5511',
    },
];

export default function OrdersIndex() {
    const [orders] = React.useState<OrderRecord[]>(SAMPLE_ORDERS);
    const [statusTab, setStatusTab] = React.useState<string>('all');
    const [selectedShape, setSelectedShape] = React.useState<string>('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(6);
    const [selectedOrder, setSelectedOrder] = React.useState<OrderRecord | null>(null);
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [inspectedOrder, setInspectedOrder] = React.useState<OrderRecord | null>(null);

    const [bulkAction, setBulkAction] = React.useState<{
        type: 'export_dossiers' | 'flag_review' | 'batch_notice';
        title: string;
    } | null>(null);
    const [bulkReason, setBulkReason] = React.useState('');
    const [bulkExecuted, setBulkExecuted] = React.useState(false);

    // Filter computation
    const filteredOrders = React.useMemo(() => {
        return orders.filter((order) => {
            if (statusTab === 'active' && !['accepted', 'in_progress'].includes(order.status))
                return false;
            if (statusTab === 'holds' && !order.hasActiveHold && order.status !== 'disputed')
                return false;
            if (statusTab === 'signoff' && order.status !== 'awaiting_signoff') return false;
            if (statusTab === 'completed' && order.status !== 'completed') return false;

            if (selectedShape !== 'all' && order.workShape !== selectedShape) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    order.reference.toLowerCase().includes(q) ||
                    order.listingTitle.toLowerCase().includes(q) ||
                    order.buyer.name.toLowerCase().includes(q) ||
                    order.provider.name.toLowerCase().includes(q)
                );
            }

            return true;
        });
    }, [orders, statusTab, selectedShape, searchQuery]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [statusTab, selectedShape, searchQuery, pageSize]);

    const totalItems = filteredOrders.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const paginatedOrders = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredOrders.slice(start, start + pageSize);
    }, [filteredOrders, currentPage, pageSize]);

    const isAllPageSelected =
        paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedIds.includes(o.id));
    const isSomePageSelected =
        paginatedOrders.some((o) => selectedIds.includes(o.id)) && !isAllPageSelected;

    const getShapeBadge = (shape: string) => {
        switch (shape) {
            case 'A1':
                return (
                    <Badge
                        variant="outline"
                        className="border-blue-500/40 font-mono text-[9px] text-blue-400"
                    >
                        A1 Linear
                    </Badge>
                );
            case 'A3':
                return (
                    <Badge
                        variant="outline"
                        className="border-emerald-500/40 font-mono text-[9px] text-emerald-400"
                    >
                        A3 Appt
                    </Badge>
                );
            case 'A4':
                return (
                    <Badge
                        variant="outline"
                        className="border-amber-500/40 font-mono text-[9px] text-amber-400"
                    >
                        A4 Handoff
                    </Badge>
                );
            case 'A9':
                return (
                    <Badge
                        variant="outline"
                        className="border-purple-500/40 font-mono text-[9px] text-purple-400"
                    >
                        A9 Digital
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="font-mono text-[9px]">
                        {shape}
                    </Badge>
                );
        }
    };

    const getStatusBadge = (order: OrderRecord) => {
        if (order.hasActiveHold) {
            return (
                <Badge
                    variant="default"
                    className="shrink-0 gap-1 bg-amber-600 font-mono text-[10px] text-white"
                >
                    <PauseCircle className="size-3" />
                    <span>Hold Active</span>
                </Badge>
            );
        }

        switch (order.status) {
            case 'in_progress':
                return (
                    <Badge
                        variant="outline"
                        className="border-blue-500/40 bg-blue-500/5 text-[10px] text-blue-400"
                    >
                        In Progress
                    </Badge>
                );
            case 'awaiting_signoff':
                return (
                    <Badge
                        variant="outline"
                        className="border-amber-500/40 bg-amber-500/5 text-[10px] text-amber-400"
                    >
                        Sign-off Pending
                    </Badge>
                );
            case 'completed':
                return (
                    <Badge
                        variant="outline"
                        className="border-emerald-500/40 bg-emerald-500/5 text-[10px] text-emerald-400"
                    >
                        Completed
                    </Badge>
                );
            case 'disputed':
                return (
                    <Badge variant="destructive" className="text-[10px]">
                        Disputed
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-[10px]">
                        {order.status}
                    </Badge>
                );
        }
    };

    return (
        <AdminLayout
            currentSection="inspector"
            title={
                inspectedOrder
                    ? `Order Workspace #${inspectedOrder.reference}`
                    : 'Orders & Work Master Index'
            }
            breadcrumbs={
                inspectedOrder
                    ? [
                          { label: 'Operations', href: '/admin/triage' },
                          { label: 'Orders & Work', href: '/admin/orders' },
                          { label: `#${inspectedOrder.reference}` },
                      ]
                    : undefined
            }
        >
            <Head
                title={
                    inspectedOrder
                        ? `Order #${inspectedOrder.reference} — Serbizyu Admin`
                        : 'Orders & Work Index — Serbizyu Admin'
                }
            />

            {/* ===================================================================
           VIEW 1: IN-PLACE DEEP ORDER INSPECTION (Stay on /admin/orders!)
           =================================================================== */}
            {inspectedOrder ? (
                <div className="flex animate-in flex-col gap-6 duration-200 fade-in">
                    {/* Top Return Bar */}
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 cursor-pointer gap-2 border-border text-xs"
                            onClick={() => setInspectedOrder(null)}
                        >
                            <ArrowLeft className="size-3.5" />
                            <span>Back to Orders Registry</span>
                        </Button>

                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                                Correlation:{' '}
                                <strong className="text-foreground">
                                    {inspectedOrder.correlationId}
                                </strong>
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                                Tagudin Pilot
                            </Badge>
                        </div>
                    </div>

                    {/* Hero Order Header Banner with Photo */}
                    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        <div className="flex flex-col items-stretch md:flex-row">
                            <div className="relative h-48 w-full shrink-0 bg-muted/30 md:h-auto md:w-64">
                                <img
                                    src={inspectedOrder.imageUrl}
                                    alt={inspectedOrder.listingTitle}
                                    className="h-full w-full object-cover"
                                />
                                <div className="absolute top-3 left-3">
                                    {getShapeBadge(inspectedOrder.workShape)}
                                </div>
                            </div>

                            <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-base font-bold text-primary">
                                                #{inspectedOrder.reference}
                                            </span>
                                            {getStatusBadge(inspectedOrder)}
                                        </div>
                                        <span className="font-mono text-xl font-bold text-foreground">
                                            ₱{(inspectedOrder.amountMinor / 100).toFixed(2)}
                                        </span>
                                    </div>

                                    <h1 className="font-heading text-lg leading-snug font-bold text-foreground">
                                        {inspectedOrder.listingTitle}
                                    </h1>
                                    <p className="text-xs text-muted-foreground">
                                        Initialized on{' '}
                                        <span className="font-mono text-foreground">
                                            {inspectedOrder.createdAt} PHT
                                        </span>{' '}
                                        · Bilateral commercial agreement locked in Tagudin.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs sm:grid-cols-4">
                                    <div>
                                        <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                                            Buyer
                                        </span>
                                        <span className="font-semibold text-foreground">
                                            {inspectedOrder.buyer.name}
                                        </span>
                                        <span className="block font-mono text-[10.5px] text-muted-foreground">
                                            {inspectedOrder.buyer.phone}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                                            Provider
                                        </span>
                                        <span className="font-semibold text-foreground">
                                            {inspectedOrder.provider.name}
                                        </span>
                                        <span className="block font-mono text-[10.5px] text-muted-foreground">
                                            {inspectedOrder.provider.handle}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                                            Payment Lane
                                        </span>
                                        <span className="font-semibold text-foreground capitalize">
                                            {inspectedOrder.lane === 'cash'
                                                ? 'External Cash'
                                                : inspectedOrder.lane === 'proof'
                                                  ? 'Digital Proof'
                                                  : 'Tiwala'}
                                        </span>
                                        <span className="block text-[10.5px] text-muted-foreground">
                                            Direct Peer-to-Peer
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                                            Work Progress
                                        </span>
                                        <span className="font-mono font-semibold text-blue-400">
                                            {inspectedOrder.completionPct}% Complete
                                        </span>
                                        <span className="block truncate text-[10.5px] text-muted-foreground">
                                            {inspectedOrder.progressStep}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active Hold Warning (if present) */}
                    {inspectedOrder.hasActiveHold && (
                        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs">
                            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                    Active Administrative Hold in Effect
                                </span>
                                <p className="leading-relaxed text-muted-foreground">
                                    Target:{' '}
                                    <strong className="text-foreground">
                                        {inspectedOrder.holdScope}
                                    </strong>
                                    . The Payment Obligation attestation is frozen under human
                                    investigation. Work progress advances unblocked.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Work Checkpoint Proof Photo Gallery */}
                    {inspectedOrder.evidencePhotos && inspectedOrder.evidencePhotos.length > 0 && (
                        <Card className="border-border bg-card shadow-xs">
                            <CardHeader className="border-b border-border pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                        <FileCheck2 className="size-4 text-primary" />
                                        <span>Work Evidence</span>
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {inspectedOrder.evidencePhotos.map((photo, i) => (
                                        <div
                                            key={i}
                                            className="flex flex-col overflow-hidden rounded-xl border border-border bg-muted/10"
                                        >
                                            <div className="h-44 w-full overflow-hidden bg-black/20">
                                                <img
                                                    src={photo.url}
                                                    alt={photo.label}
                                                    className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-0.5 p-3 text-xs">
                                                <span className="font-semibold text-foreground">
                                                    {photo.label}
                                                </span>
                                                <span className="font-mono text-[10.5px] text-muted-foreground">
                                                    Uploaded at {photo.time}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {inspectedOrder.pipelineSteps && (
                        <Card className="border-border bg-card shadow-xs">
                            <CardHeader className="border-b border-border pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                                        <Wrench className="size-4 text-primary" />
                                        <span>Work Pipeline</span>
                                    </CardTitle>
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {inspectedOrder.completionPct}% Complete
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    {inspectedOrder.pipelineSteps.map((s) => (
                                        <div
                                            key={s.step}
                                            className={`flex flex-col gap-2 rounded-lg border p-3.5 ${
                                                s.status === 'done'
                                                    ? 'border-emerald-500/30 bg-emerald-500/5'
                                                    : s.status === 'active'
                                                      ? 'relative border-blue-500/40 bg-blue-500/5'
                                                      : 'border-border bg-muted/20 opacity-60'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                                                    {s.status === 'done' && (
                                                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                                                    )}
                                                    {s.status === 'active' && (
                                                        <span className="size-2 animate-pulse rounded-full bg-blue-500" />
                                                    )}
                                                    <span>
                                                        Step {s.step}: {s.title}
                                                    </span>
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[9px] ${
                                                        s.status === 'done'
                                                            ? 'border-emerald-500/30 text-emerald-500'
                                                            : s.status === 'active'
                                                              ? 'border-blue-500/40 text-blue-400'
                                                              : ''
                                                    }`}
                                                >
                                                    {s.status === 'done'
                                                        ? 'Done'
                                                        : s.status === 'active'
                                                          ? 'In Progress'
                                                          : 'Gated'}
                                                </Badge>
                                            </div>
                                            <div className="text-xs font-medium text-foreground">
                                                {s.desc}
                                            </div>
                                            <div className="flex items-center justify-between border-t border-border/50 pt-1 text-[10.5px] text-muted-foreground">
                                                <span>{s.time ?? 'Scheduled'}</span>
                                                <span
                                                    className={
                                                        s.status === 'done'
                                                            ? 'font-medium text-emerald-500'
                                                            : 'text-blue-400'
                                                    }
                                                >
                                                    {s.proof}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Audit Timeline */}
                    {inspectedOrder.events && (
                        <Card className="border-border bg-card shadow-xs">
                            <CardHeader className="border-b border-border pb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm font-bold text-foreground">
                                            Multi-Aggregate Audit Timeline
                                        </CardTitle>
                                        <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                                            Immutable records persisted to audit_events. History is
                                            append-only.
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {inspectedOrder.events.length} Events
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="flex flex-col gap-3">
                                    {inspectedOrder.events.map((ev, idx) => (
                                        <div key={idx} className="flex items-start gap-3 text-xs">
                                            <span className="w-24 shrink-0 font-mono text-muted-foreground">
                                                {ev.time}
                                            </span>
                                            <Badge
                                                variant={
                                                    ev.type === 'Dispute'
                                                        ? 'destructive'
                                                        : ev.type === 'Hold'
                                                          ? 'default'
                                                          : 'outline'
                                                }
                                                className={`w-18 shrink-0 justify-center text-[10px] ${
                                                    ev.type === 'Hold'
                                                        ? 'bg-amber-600 text-white'
                                                        : ''
                                                }`}
                                            >
                                                {ev.type}
                                            </Badge>
                                            <div className="flex-1 leading-relaxed text-foreground">
                                                <span className="mr-1.5 font-mono text-[11px] font-semibold text-muted-foreground">
                                                    [{ev.actor}]
                                                </span>
                                                {ev.text}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                /* ===================================================================
             VIEW 2: SCAN-FIRST MASTER ORDERS TABLE (With Real Photo Thumbnails)
             =================================================================== */
                <div className="flex flex-col gap-6">
                    {/* Header Overview */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
                                Orders &amp; Work
                            </h1>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Track commercial orders, fulfillment progress, and payments.
                            </p>
                        </div>
                    </div>

                    {/* 4 Graphic KPI Metric Cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <AdminMetricCard
                            title="Total Order Volume"
                            value="₱24,580.00"
                            statusBeacon="live"
                            accentColor="#10b981"
                            trendData={[14, 18, 16, 22, 20, 25, 24]}
                            subtext="24 active transactions recorded across pilot"
                            badgeText="Tagudin"
                        />

                        <AdminMetricCard
                            title="Active in Fulfillment"
                            value="14 Active"
                            statusBeacon="live"
                            accentColor="#38bdf8"
                            segments={[
                                { label: 'A1 Linear', value: 6, colorClass: 'bg-blue-500' },
                                { label: 'A3 Appt', value: 4, colorClass: 'bg-emerald-500' },
                                { label: 'A4 Handoff', value: 3, colorClass: 'bg-amber-500' },
                                { label: 'A9 Digital', value: 1, colorClass: 'bg-purple-500' },
                            ]}
                            subtext="Distributed across 4 canonical work shapes"
                        />

                        <AdminMetricCard
                            title="Awaiting Sign-off"
                            value="04 Pending"
                            statusBeacon="warning"
                            accentColor="#f59e0b"
                            donutPct={75}
                            subtext="75% within standard 48h evaluation SLA"
                        />

                        <AdminMetricCard
                            title="Interventions & Holds"
                            value="02 Tasks"
                            statusBeacon="danger"
                            accentColor="#ef4444"
                            segments={[
                                { label: '1 Cash Mismatch', value: 1, colorClass: 'bg-amber-500' },
                                { label: '1 Quantity Dispute', value: 1, colorClass: 'bg-red-500' },
                            ]}
                            subtext="1 Payment Hold (#OBL-881) · 1 Open Dispute"
                        />
                    </div>

                    {/* Scalable Filter & Search Toolbar */}
                    <Card className="border-border bg-card shadow-xs">
                        <CardHeader className="flex flex-col gap-3 border-b border-border p-4 pb-3">
                            {/* Top Toolbar: Status Tabs + Work Shape Filter */}
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                {/* Quick Status Tabs */}
                                <div className="inline-flex max-w-full items-center overflow-x-auto rounded-lg border border-border bg-muted/30 p-1 text-xs font-medium">
                                    {[
                                        { id: 'all', label: `All (${orders.length})` },
                                        { id: 'active', label: 'In Progress (7)' },
                                        { id: 'signoff', label: 'Sign-off (2)' },
                                        { id: 'holds', label: 'On Hold (2)' },
                                        { id: 'completed', label: 'Completed (3)' },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setStatusTab(tab.id)}
                                            className={`cursor-pointer rounded-md px-3 py-1 text-xs whitespace-nowrap transition-all ${
                                                statusTab === tab.id
                                                    ? 'bg-background font-semibold text-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Work Shape Filter Select */}
                                <div className="flex shrink-0 items-center gap-2">
                                    <Select value={selectedShape} onValueChange={setSelectedShape}>
                                        <SelectTrigger className="h-8 w-44 border-border bg-muted/20 text-xs text-foreground">
                                            <SelectValue placeholder="Work Shape" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="text-xs">
                                                All Work Shapes
                                            </SelectItem>
                                            <SelectItem value="A1" className="text-xs">
                                                A1 Linear Project
                                            </SelectItem>
                                            <SelectItem value="A3" className="text-xs">
                                                A3 Appointment Slot
                                            </SelectItem>
                                            <SelectItem value="A4" className="text-xs">
                                                A4 Physical Handoff
                                            </SelectItem>
                                            <SelectItem value="A9" className="text-xs">
                                                A9 Digital Delivery
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Single Fast Search Bar */}
                            <div className="relative w-full">
                                <Search className="absolute top-2.5 left-3 size-3.5 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search orders..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 w-full border-border bg-muted/20 pl-9 font-mono text-xs text-foreground"
                                />
                            </div>
                        </CardHeader>

                        {/* Clean Scan-First Table with Bulk Selection (6 Columns + Checkbox) */}
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
                                                                ...paginatedOrders.map((o) => o.id),
                                                            ]),
                                                        );
                                                        setSelectedIds(newIds);
                                                    } else {
                                                        const pageIds = new Set(
                                                            paginatedOrders.map((o) => o.id),
                                                        );
                                                        setSelectedIds(
                                                            selectedIds.filter(
                                                                (id) => !pageIds.has(id),
                                                            ),
                                                        );
                                                    }
                                                }}
                                                aria-label="Select all orders on this page"
                                            />
                                        </TableHead>
                                        <TableHead className="w-36">Order Reference</TableHead>
                                        <TableHead className="w-72">
                                            Service &amp; Listing
                                        </TableHead>
                                        <TableHead className="w-48">Parties</TableHead>
                                        <TableHead className="w-36">Agreed Terms</TableHead>
                                        <TableHead className="w-36">Execution Status</TableHead>
                                        <TableHead className="w-24 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedOrders.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                className="h-32 text-center text-xs text-muted-foreground"
                                            >
                                                No orders match your filter criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedOrders.map((order) => {
                                            const isSelected = selectedIds.includes(order.id);
                                            return (
                                                <TableRow
                                                    key={order.id}
                                                    className={`group cursor-pointer transition-colors ${
                                                        isSelected
                                                            ? 'bg-primary/5 hover:bg-primary/10'
                                                            : 'hover:bg-muted/40'
                                                    }`}
                                                    onClick={() => setSelectedOrder(order)}
                                                >
                                                    {/* Checkbox Column */}
                                                    <TableCell
                                                        className="w-10 text-center"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedIds([
                                                                        ...selectedIds,
                                                                        order.id,
                                                                    ]);
                                                                } else {
                                                                    setSelectedIds(
                                                                        selectedIds.filter(
                                                                            (id) => id !== order.id,
                                                                        ),
                                                                    );
                                                                }
                                                            }}
                                                            aria-label={`Select order ${order.reference}`}
                                                        />
                                                    </TableCell>

                                                    {/* 1. Order Ref */}
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-mono text-xs font-bold text-primary group-hover:underline">
                                                                {order.reference}
                                                            </span>
                                                            <span className="font-mono text-[10.5px] text-muted-foreground">
                                                                {order.createdAt.split(' ')[0]}
                                                            </span>
                                                        </div>
                                                    </TableCell>

                                                    {/* 2. Service Title & Photo Thumbnail */}
                                                    <TableCell>
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <img
                                                                src={order.imageUrl}
                                                                alt={order.listingTitle}
                                                                className="size-11 shrink-0 rounded-lg border border-border object-cover shadow-2xs"
                                                            />
                                                            <div className="flex min-w-0 flex-col gap-0.5">
                                                                <span
                                                                    className="block max-w-[240px] truncate text-xs font-semibold text-foreground transition-colors group-hover:text-primary"
                                                                    title={order.listingTitle}
                                                                >
                                                                    {order.listingTitle}
                                                                </span>
                                                                <div className="flex items-center gap-1.5">
                                                                    {getShapeBadge(order.workShape)}
                                                                    <span className="max-w-[140px] truncate text-[10.5px] text-muted-foreground">
                                                                        {order.progressStep}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {/* 3. Parties */}
                                                    <TableCell>
                                                        <div className="flex flex-col text-xs leading-snug">
                                                            <span className="max-w-[170px] truncate font-semibold text-foreground">
                                                                {order.buyer.name}
                                                            </span>
                                                            <span className="max-w-[170px] truncate text-[11px] text-muted-foreground">
                                                                via {order.provider.name}
                                                            </span>
                                                        </div>
                                                    </TableCell>

                                                    {/* 4. Agreed Terms */}
                                                    <TableCell>
                                                        <div className="flex flex-col text-xs">
                                                            <span className="font-mono font-bold text-foreground">
                                                                ₱
                                                                {(order.amountMinor / 100).toFixed(
                                                                    2,
                                                                )}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground capitalize">
                                                                {order.lane === 'cash'
                                                                    ? 'External Cash'
                                                                    : order.lane === 'proof'
                                                                      ? 'Digital Proof'
                                                                      : 'Tiwala'}
                                                            </span>
                                                        </div>
                                                    </TableCell>

                                                    {/* 5. Status */}
                                                    <TableCell>{getStatusBadge(order)}</TableCell>

                                                    {/* 6. Action: Peek */}
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 cursor-pointer gap-1 px-2 text-xs text-muted-foreground group-hover:text-foreground"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedOrder(order);
                                                            }}
                                                        >
                                                            <span>Peek</span>
                                                            <ChevronRight className="size-3" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>

                            {/* Standard Pagination Bar */}
                            <div className="flex flex-col gap-3 border-t border-border bg-card/60 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-muted-foreground">
                                    Showing{' '}
                                    <strong className="text-foreground">
                                        {Math.min(1 + (currentPage - 1) * pageSize, totalItems)}
                                    </strong>{' '}
                                    to{' '}
                                    <strong className="text-foreground">
                                        {Math.min(currentPage * pageSize, totalItems)}
                                    </strong>{' '}
                                    of <strong className="text-foreground">{totalItems}</strong>{' '}
                                    orders
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Per Page Selector */}
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <span>Rows:</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => setPageSize(Number(e.target.value))}
                                            className="h-7 cursor-pointer rounded-md border border-border bg-muted/20 px-2 text-xs text-foreground"
                                        >
                                            <option value={6}>6</option>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                        </select>
                                    </div>

                                    {/* Page Navigation */}
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
                                            {Array.from(
                                                { length: totalPages },
                                                (_, i) => i + 1,
                                            ).map((p) => (
                                                <PaginationItem key={p}>
                                                    <PaginationLink
                                                        isActive={p === currentPage}
                                                        onClick={() => setCurrentPage(p)}
                                                    >
                                                        {p}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ))}
                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() =>
                                                        setCurrentPage((p) =>
                                                            Math.min(totalPages, p + 1),
                                                        )
                                                    }
                                                    disabled={currentPage >= totalPages}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Floating Bulk Action Bar */}
                    {selectedIds.length > 0 && (
                        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 animate-in items-center gap-3 rounded-xl border border-primary/40 bg-card/95 px-4 py-2.5 shadow-2xl backdrop-blur-md duration-200 fade-in slide-in-from-bottom-4">
                            <div className="flex items-center gap-2 border-r border-border pr-3">
                                <Badge
                                    variant="default"
                                    className="bg-primary px-2 font-mono text-xs text-primary-foreground"
                                >
                                    {selectedIds.length} Selected
                                </Badge>
                                <span className="hidden text-xs text-muted-foreground sm:inline">
                                    Orders
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 cursor-pointer gap-1.5 border-border text-xs hover:bg-muted/50"
                                    onClick={() => {
                                        setBulkAction({
                                            type: 'export_dossiers',
                                            title: 'Export Batch Investigation Dossiers',
                                        });
                                        setBulkReason('');
                                        setBulkExecuted(false);
                                    }}
                                >
                                    <FileDown className="size-3.5 text-primary" />
                                    <span>Export Dossiers</span>
                                </Button>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 cursor-pointer gap-1.5 border-border text-xs hover:bg-muted/50"
                                    onClick={() => {
                                        setBulkAction({
                                            type: 'flag_review',
                                            title: 'Flag for Operator Audit & Hold Review',
                                        });
                                        setBulkReason('');
                                        setBulkExecuted(false);
                                    }}
                                >
                                    <Flag className="size-3.5 text-amber-500" />
                                    <span>Flag for Review</span>
                                </Button>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 cursor-pointer gap-1.5 border-border text-xs hover:bg-muted/50"
                                    onClick={() => {
                                        setBulkAction({
                                            type: 'batch_notice',
                                            title: 'Broadcast Operator Milestone Notice',
                                        });
                                        setBulkReason('');
                                        setBulkExecuted(false);
                                    }}
                                >
                                    <Send className="size-3.5 text-blue-400" />
                                    <span>Send Notice</span>
                                </Button>
                            </div>

                            <div className="border-l border-border pl-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => setSelectedIds([])}
                                >
                                    Deselect
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Guarded Bulk Dialog */}
                    <Dialog
                        open={bulkAction !== null}
                        onOpenChange={(open) => !open && setBulkAction(null)}
                    >
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                                    <FileDown className="size-4 text-primary" />
                                    <span>{bulkAction?.title}</span>
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Scope preview:{' '}
                                    <strong>{selectedIds.length} orders selected</strong> across
                                    Tagudin pilot operations.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex flex-col gap-3 py-2 text-xs">
                                <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 p-3">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                        Affected Order References
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {orders
                                            .filter((o) => selectedIds.includes(o.id))
                                            .map((o) => (
                                                <Badge
                                                    key={o.id}
                                                    variant="outline"
                                                    className="font-mono text-[10px]"
                                                >
                                                    {o.reference}
                                                </Badge>
                                            ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        Reason for action
                                    </label>
                                    <Input
                                        value={bulkReason}
                                        onChange={(e) => setBulkReason(e.target.value)}
                                        placeholder="e.g. Batch compliance audit for Barangay Poblacion local trade..."
                                        className="h-8 border-border bg-muted/20 text-xs text-foreground"
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                        Recorded in audit log.
                                    </span>
                                </div>

                                {bulkExecuted && (
                                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-500">
                                        <Check className="size-4 shrink-0" />
                                        <span>
                                            Batch command recorded successfully in simulation log.
                                        </span>
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setBulkAction(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                    disabled={!bulkReason.trim() || bulkExecuted}
                                    onClick={() => {
                                        setBulkExecuted(true);
                                        setTimeout(() => {
                                            setBulkAction(null);
                                            setSelectedIds([]);
                                            setBulkExecuted(false);
                                        }, 900);
                                    }}
                                >
                                    {bulkExecuted ? 'Executed ✓' : 'Confirm Batch Action'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Quick Peek Drawer with Photo & In-Place Inspector Trigger */}
                    <Sheet
                        open={!!selectedOrder}
                        onOpenChange={(open) => !open && setSelectedOrder(null)}
                    >
                        <SheetContent
                            side="right"
                            className="flex h-full flex-col overflow-hidden p-0 sm:max-w-lg"
                        >
                            <SheetHeader>
                                <div className="flex items-center justify-between pr-6">
                                    <div className="flex items-center gap-2">
                                        <FileText className="size-4 text-primary" />
                                        <SheetTitle>Order Agreement Peek</SheetTitle>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-[10px]">
                                        {selectedOrder?.reference}
                                    </Badge>
                                </div>
                                <SheetDescription>
                                    Quick operational preview of bilateral contract, milestone
                                    status, and payment obligation.
                                </SheetDescription>
                            </SheetHeader>

                            {selectedOrder && (
                                <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6 text-xs">
                                    {/* Hero Media Cover Banner */}
                                    <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl border border-border bg-muted/20 shadow-xs">
                                        <img
                                            src={selectedOrder.imageUrl}
                                            alt={selectedOrder.listingTitle}
                                            className="h-full w-full object-cover"
                                        />
                                        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(selectedOrder)}
                                                    {getShapeBadge(selectedOrder.workShape)}
                                                </div>
                                                <span className="font-mono text-base font-bold text-white">
                                                    ₱{(selectedOrder.amountMinor / 100).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hold Banner if Active */}
                                    {selectedOrder.hasActiveHold && (
                                        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                                            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                                    Surgical Administrative Hold Active
                                                </span>
                                                <span className="text-[11px] leading-relaxed text-muted-foreground">
                                                    Target:{' '}
                                                    <strong className="text-foreground">
                                                        {selectedOrder.holdScope}
                                                    </strong>
                                                    . Payment attestation is frozen. Work progress
                                                    advances unblocked.
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Service Offering Title */}
                                    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/20 p-3.5">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Service Offering
                                        </span>
                                        <span className="text-sm leading-snug font-bold text-foreground">
                                            {selectedOrder.listingTitle}
                                        </span>
                                    </div>

                                    {/* Contracting Parties */}
                                    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Contracting Parties
                                        </span>
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-muted-foreground">
                                                    Citizen / Buyer
                                                </span>
                                                <span className="font-semibold text-foreground">
                                                    {selectedOrder.buyer.name}
                                                </span>
                                                <span className="font-mono text-[10.5px] text-muted-foreground">
                                                    {selectedOrder.buyer.phone}
                                                </span>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-[10px] text-muted-foreground">
                                                    Trade Provider
                                                </span>
                                                <span className="font-semibold text-foreground">
                                                    {selectedOrder.provider.name}
                                                </span>
                                                <span className="font-mono text-[10.5px] text-muted-foreground">
                                                    {selectedOrder.provider.handle}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Work Evidence */}
                                    {selectedOrder.evidencePhotos &&
                                        selectedOrder.evidencePhotos.length > 0 && (
                                            <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                                    Work Evidence Photos (
                                                    {selectedOrder.evidencePhotos.length})
                                                </span>
                                                <div className="flex gap-2.5 overflow-x-auto pb-1">
                                                    {selectedOrder.evidencePhotos.map(
                                                        (photo, i) => (
                                                            <div
                                                                key={i}
                                                                className="group relative size-20 shrink-0 overflow-hidden rounded-lg border border-border shadow-2xs"
                                                            >
                                                                <img
                                                                    src={photo.url}
                                                                    alt={photo.label}
                                                                    className="size-full object-cover"
                                                                />
                                                                <div className="absolute inset-x-0 bottom-0 truncate bg-black/70 p-1 font-mono text-[9px] text-white">
                                                                    {photo.time}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    {/* Work Execution Progress */}
                                    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3.5">
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 font-semibold text-foreground">
                                                <Wrench className="size-3.5 text-blue-400" />
                                                <span>
                                                    Fulfillment Status ({selectedOrder.shapeTitle})
                                                </span>
                                            </span>
                                            <span className="font-mono font-semibold text-blue-400">
                                                {selectedOrder.completionPct}%
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground">
                                            {selectedOrder.progressStep}
                                        </span>
                                        <div className="mt-0.5 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="rounded-full bg-blue-500 transition-all"
                                                style={{ width: `${selectedOrder.completionPct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sheet Footer: In-Place Workspace Trigger */}
                            <SheetFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setSelectedOrder(null)}
                                >
                                    Close Peek
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 cursor-pointer gap-1.5 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                    onClick={() => {
                                        if (selectedOrder) {
                                            const o = selectedOrder;
                                            setSelectedOrder(null);
                                            setInspectedOrder(o);
                                        }
                                    }}
                                >
                                    <span>Open Full Order Workspace</span>
                                    <ArrowUpRight className="size-3.5" />
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>
            )}
        </AdminLayout>
    );
}
