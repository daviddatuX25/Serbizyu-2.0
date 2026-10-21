import { Head, router } from '@inertiajs/react';
import * as React from 'react';
import {
    AlertCircle,
    ArrowUpRight,
    Check,
    ChevronRight,
    MapPin,
    Network,
    PauseCircle,
    Search,
    ShieldAlert,
    ShieldCheck,
    Tag,
    TrendingUp,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
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
import { FunnelAnalytics } from '@/components/admin/FunnelAnalytics';
import { AdminLayout } from '@/layouts/AdminLayout';

export interface ListingRecord {
    id: string;
    title: string;
    category: string;
    categoryVersion: string;
    listingType: 'service_offer' | 'product_offer';
    imageUrl?: string;
    evidencePhotos?: string[];
    impressionsCount: number;
    viewsCount: number;
    ctrPct: string;
    inquiriesCount: number;
    ordersCount: number;
    extensions?: Array<{
        mode: string;
        label: string;
        feeMinor: number;
        defaultPartner?: string;
        isDefault?: boolean;
    }>;
    provider: {
        name: string;
        handle: string;
        verified: boolean;
        agentName?: string;
    };
    workShape: 'A1' | 'A3' | 'A4' | 'A9';
    priceMinor: number;
    unitLabel: string;
    paymentLanes: string[];
    capacityType: 'slots' | 'quantity' | 'unlimited';
    availableCapacity: number;
    totalCapacity: number;
    status: 'active' | 'pending_review' | 'paused' | 'archived';
    version: number;
    barangays: string[];
    updatedAt: string;
}

const SAMPLE_LISTINGS: ListingRecord[] = [
    {
        id: 'lst-01',
        title: 'Ceiling Fan Diagnostics & Motor Rewind',
        category: 'Home Electrical',
        categoryVersion: 'v2.1',
        listingType: 'service_offer',
        imageUrl: '/photos/ac-capacitor.jpg',
        evidencePhotos: ['/photos/ac-clean.jpg', '/photos/ac-capacitor.jpg'],
        impressionsCount: 1420,
        viewsCount: 340,
        ctrPct: '23.9',
        inquiriesCount: 85,
        ordersCount: 24,
        extensions: [
            { mode: 'onsite', label: 'Shop Work at Tagudin Centro', feeMinor: 0, isDefault: true },
            {
                mode: 'delivery',
                label: 'Home Extraction & Delivery via Express Moto',
                feeMinor: 6000,
                defaultPartner: 'Tagudin Express Motorcycle Pool',
            },
        ],
        provider: { name: 'Arman Electric', handle: '@arman', verified: true },
        workShape: 'A1',
        priceMinor: 9000,
        unitLabel: 'per unit',
        paymentLanes: ['cash', 'proof'],
        capacityType: 'slots',
        availableCapacity: 2,
        totalCapacity: 4,
        status: 'active',
        version: 2,
        barangays: ['Poblacion', 'Bio', 'Rizal'],
        updatedAt: '2026-09-15',
    },
    {
        id: 'lst-02',
        title: 'Traditional Weekend Bibingka Tray (24 pcs Party Box)',
        category: 'Local Food & Bakery',
        categoryVersion: 'v1.4',
        listingType: 'product_offer',
        imageUrl: '/photos/bibingka.jpg',
        evidencePhotos: ['/photos/bibingka.jpg'],
        impressionsCount: 2850,
        viewsCount: 890,
        ctrPct: '31.2',
        inquiriesCount: 240,
        ordersCount: 78,
        extensions: [
            { mode: 'pickup', label: 'Market Stall #4 Pickup', feeMinor: 0, isDefault: true },
            {
                mode: 'delivery',
                label: 'Doorstep Delivery via Moto Pool',
                feeMinor: 6000,
                defaultPartner: 'Tagudin Express Motorcycle Pool',
            },
            {
                mode: 'cargo',
                label: 'Heavy Party Cargo via Sidecar',
                feeMinor: 8000,
                defaultPartner: 'Kuya Danny Tricycle Guild',
            },
        ],
        provider: { name: 'Tagudin Traditional Bakes', handle: '@ate_gina', verified: true },
        workShape: 'A4',
        priceMinor: 12000,
        unitLabel: 'per box',
        paymentLanes: ['cash', 'proof', 'tiwala'],
        capacityType: 'quantity',
        availableCapacity: 8,
        totalCapacity: 25,
        status: 'active',
        version: 4,
        barangays: ['Farola', 'Poblacion', 'Dacutan'],
        updatedAt: '2026-09-16',
    },
    {
        id: 'lst-03',
        title: 'Residential Jetmatic Pump Descaling & Seal Repair',
        category: 'Home Plumbing',
        categoryVersion: 'v1.0',
        listingType: 'service_offer',
        imageUrl: '/photos/ac-clean.jpg',
        evidencePhotos: ['/photos/ac-clean.jpg'],
        impressionsCount: 940,
        viewsCount: 180,
        ctrPct: '19.1',
        inquiriesCount: 42,
        ordersCount: 14,
        extensions: [
            { mode: 'onsite', label: 'Direct On-Site Service Visit', feeMinor: 0, isDefault: true },
        ],
        provider: { name: 'Kuya Ben Pipes', handle: '@ben_pipes', verified: true },
        workShape: 'A3',
        priceMinor: 4500,
        unitLabel: 'per visit',
        paymentLanes: ['cash'],
        capacityType: 'slots',
        availableCapacity: 1,
        totalCapacity: 3,
        status: 'active',
        version: 1,
        barangays: ['Bitalag', 'Ambalayat'],
        updatedAt: '2026-09-10',
    },
    {
        id: 'lst-04',
        title: 'Barangay League Screenprint Banner & Uniform Set',
        category: 'Craft & Printing',
        categoryVersion: 'v1.2',
        listingType: 'service_offer',
        imageUrl: '/photos/req-electrician.jpg',
        evidencePhotos: ['/photos/req-electrician.jpg'],
        impressionsCount: 480,
        viewsCount: 65,
        ctrPct: '13.5',
        inquiriesCount: 12,
        ordersCount: 0,
        provider: { name: 'Maya Dela Cruz', handle: '@maya_designs', verified: false },
        workShape: 'A9',
        priceMinor: 15000,
        unitLabel: 'per package',
        paymentLanes: ['tiwala'],
        capacityType: 'slots',
        availableCapacity: 0,
        totalCapacity: 2,
        status: 'pending_review',
        version: 1,
        barangays: ['Centro', 'Farola'],
        updatedAt: '2026-09-14',
    },
    {
        id: 'lst-05',
        title: 'Hand-Tractor Kuliglig Mud Route Hauling',
        category: 'Agri Logistics',
        categoryVersion: 'v2.0',
        listingType: 'service_offer',
        imageUrl: '/photos/courier.jpg',
        evidencePhotos: ['/photos/courier.jpg'],
        impressionsCount: 1100,
        viewsCount: 210,
        ctrPct: '19.1',
        inquiriesCount: 55,
        ordersCount: 19,
        extensions: [
            {
                mode: 'hauling',
                label: 'Paddy to Solar Dryer Direct Haul',
                feeMinor: 0,
                isDefault: true,
            },
        ],
        provider: { name: 'Bitalag Haulers Guild', handle: '@bitalag_haul', verified: true },
        workShape: 'A4',
        priceMinor: 24000,
        unitLabel: 'per trip',
        paymentLanes: ['cash'],
        capacityType: 'slots',
        availableCapacity: 3,
        totalCapacity: 5,
        status: 'active',
        version: 3,
        barangays: ['Bitalag', 'Ambalayat', 'Baritao'],
        updatedAt: '2026-09-12',
    },
    {
        id: 'lst-06',
        title: 'Fresh Carabao Milk Pastillas & Curd (500g Jar)',
        category: 'Local Food & Dairy',
        categoryVersion: 'v1.0',
        listingType: 'product_offer',
        imageUrl: '/photos/bibingka.jpg',
        evidencePhotos: ['/photos/bibingka.jpg'],
        impressionsCount: 1650,
        viewsCount: 420,
        ctrPct: '25.5',
        inquiriesCount: 98,
        ordersCount: 32,
        extensions: [
            { mode: 'pickup', label: 'Farola Farm Gate Pickup', feeMinor: 0, isDefault: true },
            {
                mode: 'delivery',
                label: 'Village Delivery via Danny Agent',
                feeMinor: 4000,
                defaultPartner: 'Kuya Danny Bataller',
            },
        ],
        provider: {
            name: 'Lola Nena Dela Cruz',
            handle: '@lola_nena',
            verified: true,
            agentName: 'Kuya Danny (Agent)',
        },
        workShape: 'A4',
        priceMinor: 3500,
        unitLabel: 'per jar',
        paymentLanes: ['cash'],
        capacityType: 'quantity',
        availableCapacity: 12,
        totalCapacity: 30,
        status: 'active',
        version: 2,
        barangays: ['Farola'],
        updatedAt: '2026-09-11',
    },
    {
        id: 'lst-07',
        title: 'Split-Type Aircon Chemical Wash & Pressure Test',
        category: 'Appliance Care',
        categoryVersion: 'v2.0',
        listingType: 'service_offer',
        imageUrl: '/photos/ac-clean.jpg',
        evidencePhotos: ['/photos/ac-clean.jpg'],
        impressionsCount: 720,
        viewsCount: 140,
        ctrPct: '19.4',
        inquiriesCount: 30,
        ordersCount: 8,
        provider: { name: 'Rico Aircon Services', handle: '@rico_hvac', verified: false },
        workShape: 'A3',
        priceMinor: 8500,
        unitLabel: 'per unit',
        paymentLanes: ['cash', 'proof'],
        capacityType: 'slots',
        availableCapacity: 4,
        totalCapacity: 6,
        status: 'pending_review',
        version: 1,
        barangays: ['Poblacion', 'Bio', 'Bitalag'],
        updatedAt: '2026-09-16',
    },
    {
        id: 'lst-08',
        title: 'Commercial Freezer Compressor Motor Rewinding',
        category: 'Industrial Electrical',
        categoryVersion: 'v2.2',
        listingType: 'service_offer',
        imageUrl: '/photos/ac-capacitor.jpg',
        evidencePhotos: ['/photos/ac-clean.jpg', '/photos/ac-capacitor.jpg'],
        impressionsCount: 560,
        viewsCount: 95,
        ctrPct: '17.0',
        inquiriesCount: 22,
        ordersCount: 7,
        provider: { name: 'Danilo Agri Machining', handle: '@danilo_mach', verified: true },
        workShape: 'A1',
        priceMinor: 14000,
        unitLabel: 'per unit',
        paymentLanes: ['cash'],
        capacityType: 'slots',
        availableCapacity: 1,
        totalCapacity: 2,
        status: 'active',
        version: 3,
        barangays: ['Dacutan', 'Poblacion'],
        updatedAt: '2026-09-13',
    },
    {
        id: 'lst-09',
        title: 'Custom Timber Dining Table & Bench Fabrication',
        category: 'Woodwork & Carpentry',
        categoryVersion: 'v1.1',
        listingType: 'service_offer',
        imageUrl: '/photos/req-cement.jpg',
        evidencePhotos: ['/photos/req-cement.jpg'],
        impressionsCount: 380,
        viewsCount: 42,
        ctrPct: '11.1',
        inquiriesCount: 8,
        ordersCount: 2,
        provider: { name: 'Juan Carpentry Works', handle: '@juan_wood', verified: false },
        workShape: 'A1',
        priceMinor: 45000,
        unitLabel: 'per set',
        paymentLanes: ['cash', 'proof'],
        capacityType: 'slots',
        availableCapacity: 1,
        totalCapacity: 2,
        status: 'paused',
        version: 1,
        barangays: ['Libtong'],
        updatedAt: '2026-09-08',
    },
    {
        id: 'lst-10',
        title: 'Tubeless Motorcycle Puncture Vulcanizing',
        category: 'Vehicle Emergency',
        categoryVersion: 'v1.0',
        listingType: 'service_offer',
        imageUrl: '/photos/courier.jpg',
        evidencePhotos: ['/photos/courier.jpg'],
        impressionsCount: 880,
        viewsCount: 190,
        ctrPct: '21.6',
        inquiriesCount: 45,
        ordersCount: 18,
        provider: {
            name: 'Tessie Vulcanizing Shop',
            handle: '@tessie_tires',
            verified: true,
            agentName: 'Kuya Danny (Agent)',
        },
        workShape: 'A4',
        priceMinor: 3500,
        unitLabel: 'per tire',
        paymentLanes: ['cash'],
        capacityType: 'slots',
        availableCapacity: 5,
        totalCapacity: 10,
        status: 'active',
        version: 1,
        barangays: ['Baritao', 'Farola'],
        updatedAt: '2026-09-14',
    },
    {
        id: 'lst-11',
        title: 'Express Document & Package Same-Day Dispatch',
        category: 'Courier Logistics',
        categoryVersion: 'v1.5',
        listingType: 'service_offer',
        imageUrl: '/photos/courier.jpg',
        evidencePhotos: ['/photos/courier.jpg'],
        impressionsCount: 1350,
        viewsCount: 310,
        ctrPct: '23.0',
        inquiriesCount: 80,
        ordersCount: 28,
        provider: { name: 'Mark Tagudin Courier', handle: '@mark_courier', verified: true },
        workShape: 'A4',
        priceMinor: 6000,
        unitLabel: 'per trip',
        paymentLanes: ['cash', 'proof'],
        capacityType: 'slots',
        availableCapacity: 8,
        totalCapacity: 12,
        status: 'active',
        version: 2,
        barangays: ['Poblacion', 'Bio', 'Bitalag', 'Dacutan'],
        updatedAt: '2026-09-15',
    },
    {
        id: 'lst-12',
        title: 'Household Post-Construction Deep Cleaning',
        category: 'Domestic Cleaning',
        categoryVersion: 'v1.0',
        listingType: 'service_offer',
        imageUrl: '/photos/ac-clean.jpg',
        evidencePhotos: ['/photos/ac-clean.jpg'],
        impressionsCount: 290,
        viewsCount: 28,
        ctrPct: '9.7',
        inquiriesCount: 5,
        ordersCount: 1,
        provider: { name: 'Clara Domestic Cleaners', handle: '@clara_clean', verified: false },
        workShape: 'A1',
        priceMinor: 18000,
        unitLabel: 'per day',
        paymentLanes: ['cash'],
        capacityType: 'slots',
        availableCapacity: 2,
        totalCapacity: 3,
        status: 'paused',
        version: 1,
        barangays: ['Purok West', 'Poblacion'],
        updatedAt: '2026-09-09',
    },
];

export default function ListingsIndex() {
    const [listings] = React.useState<ListingRecord[]>(SAMPLE_LISTINGS);
    const [statusTab, setStatusTab] = React.useState<string>('all');
    const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(6);
    const [selectedListing, setSelectedListing] = React.useState<ListingRecord | null>(null);
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [bulkAction, setBulkAction] = React.useState<{
        type: 'pause_circuit' | 'verify_rules' | 'assign_coverage';
        title: string;
    } | null>(null);
    const [bulkReason, setBulkReason] = React.useState('');
    const [bulkExecuted, setBulkExecuted] = React.useState(false);

    // Filter computation
    const filteredListings = React.useMemo(() => {
        return listings.filter((item) => {
            // Tab filter
            if (statusTab === 'active' && item.status !== 'active') return false;
            if (statusTab === 'pending' && item.status !== 'pending_review') return false;
            if (statusTab === 'paused' && item.status !== 'paused') return false;

            // Category filter
            if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    item.title.toLowerCase().includes(q) ||
                    item.category.toLowerCase().includes(q) ||
                    item.provider.name.toLowerCase().includes(q) ||
                    item.barangays.some((b) => b.toLowerCase().includes(q))
                );
            }

            return true;
        });
    }, [listings, statusTab, selectedCategory, searchQuery]);

    // Reset page when filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [statusTab, selectedCategory, searchQuery, pageSize]);

    // Pagination calculation
    const totalItems = filteredListings.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const paginatedListings = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredListings.slice(start, start + pageSize);
    }, [filteredListings, currentPage, pageSize]);

    const isAllPageSelected =
        paginatedListings.length > 0 && paginatedListings.every((l) => selectedIds.includes(l.id));
    const isSomePageSelected =
        paginatedListings.some((l) => selectedIds.includes(l.id)) && !isAllPageSelected;

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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return (
                    <Badge
                        variant="outline"
                        className="border-emerald-500/40 bg-emerald-500/5 text-[10px] text-emerald-500"
                    >
                        Published
                    </Badge>
                );
            case 'pending_review':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1 border-amber-500/40 bg-amber-500/5 text-[10px] text-amber-500"
                    >
                        <ShieldAlert className="size-2.5" />
                        <span>Review Pending</span>
                    </Badge>
                );
            case 'paused':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1 border-rose-500/40 bg-rose-500/5 text-[10px] text-rose-400"
                    >
                        <PauseCircle className="size-2.5" />
                        <span>Paused</span>
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-[10px]">
                        {status}
                    </Badge>
                );
        }
    };

    // Unique categories for filter dropdown
    const uniqueCategories = React.useMemo(() => {
        return Array.from(new Set(listings.map((l) => l.category))).sort();
    }, [listings]);

    return (
        <AdminLayout currentSection="inspector" title="Provider Listings Inventory">
            <Head title="Provider Listings — Serbizyu Admin" />

            <div className="flex flex-col gap-6">
                {/* Header Overview */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
                            Provider Listings
                        </h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Manage published services, capacity, and coverage across Tagudin.
                        </p>
                    </div>
                </div>

                {/* Macro Category Health & Discovery Telemetry Strip */}
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3.5 text-xs shadow-2xs lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="size-4 text-emerald-500" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                    Discovery Health
                                </span>
                                <span className="font-semibold text-foreground">
                                    18.4% Catalog CTR{' '}
                                    <span className="font-mono text-[10px] text-emerald-500">
                                        (+2.4% vs last week)
                                    </span>
                                </span>
                            </div>
                        </div>

                        <Separator orientation="vertical" className="hidden h-6 sm:block" />

                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                Search-to-Fill
                            </span>
                            <span className="font-semibold text-foreground">
                                85% In-Stock Rate{' '}
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    (Tagudin supply density)
                                </span>
                            </span>
                        </div>

                        <Separator orientation="vertical" className="hidden h-6 sm:block" />

                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                Top Trade Sector
                            </span>
                            <span className="font-semibold text-foreground">
                                Home Electrical{' '}
                                <span className="font-mono text-[10px] text-primary">
                                    (23.9% CVR)
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* Unmet Demand Alert */}
                    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-500">
                        <AlertCircle className="size-3.5 shrink-0" />
                        <div className="flex items-center gap-1.5 font-medium">
                            <span>Unmet Demand Signal:</span>
                            <strong className="text-foreground">
                                18 searches for "Roofing Tinsmith" in Farola
                            </strong>
                            <Badge
                                variant="outline"
                                className="border-amber-500/40 text-[9px] text-amber-500"
                            >
                                0 Active Supply
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* 4 Graphic KPI Metric Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <AdminMetricCard
                        title="Active Offerings"
                        value="08 Live"
                        statusBeacon="live"
                        accentColor="#10b981"
                        trendData={[5, 6, 7, 7, 8, 8]}
                        subtext="Published with pinned category versions"
                        badgeText="Catalog"
                    />

                    <AdminMetricCard
                        title="Work Shapes Distribution"
                        value="4 Canonical"
                        statusBeacon="live"
                        accentColor="#38bdf8"
                        segments={[
                            { label: 'A1 Linear', value: 4, colorClass: 'bg-blue-500' },
                            { label: 'A4 Handoff', value: 5, colorClass: 'bg-amber-500' },
                            { label: 'A3 Appt', value: 2, colorClass: 'bg-emerald-500' },
                            { label: 'A9 Digital', value: 1, colorClass: 'bg-purple-500' },
                        ]}
                        subtext="Fulfillment contract profiles"
                    />

                    <AdminMetricCard
                        title="Assisted Offerings"
                        value="2 via Agents"
                        statusBeacon="live"
                        accentColor="#a855f7"
                        donutPct={85}
                        subtext="Managed by accredited community liaisons"
                    />

                    <AdminMetricCard
                        title="Pending Accreditation"
                        value="2 Tasks"
                        statusBeacon="warning"
                        accentColor="#f59e0b"
                        subtext="Awaiting trade tool & license check"
                    />
                </div>

                {/* Scalable Filter & Search Toolbar */}
                <Card className="border-border bg-card shadow-xs">
                    <CardHeader className="flex flex-col gap-3 border-b border-border p-4 pb-3">
                        {/* Top Toolbar: Status Tabs + Category Filter */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            {/* Quick Status Tabs */}
                            <div className="inline-flex max-w-full items-center overflow-x-auto rounded-lg border border-border bg-muted/30 p-1 text-xs font-medium">
                                {[
                                    { id: 'all', label: `All (${listings.length})` },
                                    { id: 'active', label: 'Live (8)' },
                                    { id: 'pending', label: 'Review (2)' },
                                    { id: 'paused', label: 'Paused (2)' },
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

                            {/* Category Filter Select */}
                            <div className="flex shrink-0 items-center gap-2">
                                <Select
                                    value={selectedCategory}
                                    onValueChange={setSelectedCategory}
                                >
                                    <SelectTrigger className="h-8 w-48 border-border bg-muted/20 text-xs text-foreground">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">
                                            All Categories ({uniqueCategories.length})
                                        </SelectItem>
                                        {uniqueCategories.map((c) => (
                                            <SelectItem key={c} value={c} className="text-xs">
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Single Fast Search Bar */}
                        <div className="relative w-full">
                            <Search className="absolute top-2.5 left-3 size-3.5 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search listings..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 w-full border-border bg-muted/20 pl-9 font-mono text-xs text-foreground"
                            />
                        </div>
                    </CardHeader>

                    {/* Clean Scan-First Table with Thumbnails, Micro Telemetry Chips & Bulk Selection */}
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
                                                            ...paginatedListings.map((l) => l.id),
                                                        ]),
                                                    );
                                                    setSelectedIds(newIds);
                                                } else {
                                                    const pageIds = new Set(
                                                        paginatedListings.map((l) => l.id),
                                                    );
                                                    setSelectedIds(
                                                        selectedIds.filter(
                                                            (id) => !pageIds.has(id),
                                                        ),
                                                    );
                                                }
                                            }}
                                            aria-label="Select all offerings on this page"
                                        />
                                    </TableHead>
                                    <TableHead className="w-72">Offering &amp; Version</TableHead>
                                    <TableHead className="w-48">Provider &amp; Mode</TableHead>
                                    <TableHead className="w-40">
                                        Shape, Rate &amp; Telemetry
                                    </TableHead>
                                    <TableHead className="w-40">Coverage in Tagudin</TableHead>
                                    <TableHead className="w-32">Governed Status</TableHead>
                                    <TableHead className="w-24 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedListings.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="h-32 text-center text-xs text-muted-foreground"
                                        >
                                            No offerings match your filter criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedListings.map((item) => {
                                        const isSelected = selectedIds.includes(item.id);
                                        return (
                                            <TableRow
                                                key={item.id}
                                                className={`group cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-primary/5 hover:bg-primary/10'
                                                        : 'hover:bg-muted/40'
                                                }`}
                                                onClick={() => setSelectedListing(item)}
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
                                                        aria-label={`Select offering ${item.title}`}
                                                    />
                                                </TableCell>

                                                {/* 1. Offering, Thumbnail & Version */}
                                                <TableCell>
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        {item.imageUrl ? (
                                                            <img
                                                                src={item.imageUrl}
                                                                alt={item.title}
                                                                className="size-11 shrink-0 rounded-lg border border-border object-cover shadow-2xs"
                                                            />
                                                        ) : (
                                                            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
                                                                <Tag className="size-5 text-muted-foreground/60" />
                                                            </div>
                                                        )}
                                                        <div className="flex min-w-0 flex-col gap-0.5">
                                                            <span
                                                                className="block max-w-[260px] truncate text-xs font-semibold text-foreground transition-colors group-hover:text-primary"
                                                                title={item.title}
                                                            >
                                                                {item.title}
                                                            </span>
                                                            <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
                                                                <span>{item.category}</span>
                                                                <span>·</span>
                                                                <span className="font-mono font-medium text-primary">
                                                                    v{item.version}
                                                                </span>
                                                                {item.extensions &&
                                                                    item.extensions.length > 1 && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="border-primary/30 bg-primary/5 px-1 py-0 text-[9px] text-primary"
                                                                        >
                                                                            {item.extensions.length}{' '}
                                                                            Deal Presets
                                                                        </Badge>
                                                                    )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* 2. Provider & Participation Mode */}
                                                <TableCell>
                                                    <div className="flex flex-col text-xs leading-snug">
                                                        <div className="flex items-center gap-1">
                                                            <span className="max-w-[170px] truncate font-semibold text-foreground">
                                                                {item.provider.name}
                                                            </span>
                                                            {item.provider.verified && (
                                                                <span title="Accreditation Verified">
                                                                    <ShieldCheck className="size-3 shrink-0 text-emerald-500" />
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.provider.agentName ? (
                                                            <span className="text-[10px] font-medium text-purple-400">
                                                                via{' '}
                                                                {item.provider.agentName.replace(
                                                                    ' (Agent)',
                                                                    '',
                                                                )}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10.5px] text-muted-foreground">
                                                                Direct Provider
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* 3. Shape, Rate & Micro Telemetry Chip */}
                                                <TableCell>
                                                    <div className="flex flex-col gap-1 text-xs">
                                                        <span className="font-mono font-bold text-foreground">
                                                            ₱{(item.priceMinor / 100).toFixed(2)}{' '}
                                                            <span className="font-sans text-[10.5px] font-normal text-muted-foreground">
                                                                {item.unitLabel}
                                                            </span>
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            {getShapeBadge(item.workShape)}
                                                            {/* Compact Telemetry Chip */}
                                                            <span className="font-mono text-[10.5px] text-muted-foreground">
                                                                👁️ {item.viewsCount} ·{' '}
                                                                <span className="font-semibold text-emerald-500">
                                                                    {item.ctrPct}%
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* 4. Coverage in Tagudin */}
                                                <TableCell>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <MapPin className="size-3 shrink-0 text-muted-foreground" />
                                                        <span className="max-w-[150px] truncate text-[11px]">
                                                            {item.barangays[0]}
                                                            {item.barangays.length > 1 &&
                                                                ` (+${item.barangays.length - 1})`}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* 5. Governed Status */}
                                                <TableCell>{getStatusBadge(item.status)}</TableCell>

                                                {/* 6. Action: Peek */}
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 cursor-pointer gap-1 px-2 text-xs text-muted-foreground group-hover:text-foreground"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedListing(item);
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
                                offerings
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
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                                            (p) => (
                                                <PaginationItem key={p}>
                                                    <PaginationLink
                                                        isActive={p === currentPage}
                                                        onClick={() => setCurrentPage(p)}
                                                    >
                                                        {p}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ),
                                        )}
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

                {/* ===================================================================
             FLOATING DOCKED BULK ACTION BAR (When >= 1 listing is selected)
             =================================================================== */}
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
                                Offerings
                            </span>
                        </div>

                        {/* Bulk Action Buttons */}
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 cursor-pointer gap-1.5 border-border text-xs hover:bg-muted/50"
                                onClick={() => {
                                    setBulkAction({
                                        type: 'pause_circuit',
                                        title: 'Circuit-Breaker Bulk Pause (Emergency/Weather)',
                                    });
                                    setBulkReason('');
                                    setBulkExecuted(false);
                                }}
                            >
                                <PauseCircle className="size-3.5 text-rose-400" />
                                <span>Bulk Pause</span>
                            </Button>

                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 cursor-pointer gap-1.5 border-border text-xs hover:bg-muted/50"
                                onClick={() => {
                                    setBulkAction({
                                        type: 'verify_rules',
                                        title: 'Batch Category & Capability Alignment Verification',
                                    });
                                    setBulkReason('');
                                    setBulkExecuted(false);
                                }}
                            >
                                <ShieldCheck className="size-3.5 text-emerald-500" />
                                <span>Verify Rules</span>
                            </Button>

                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 cursor-pointer gap-1.5 border-border text-xs hover:bg-muted/50"
                                onClick={() => {
                                    setBulkAction({
                                        type: 'assign_coverage',
                                        title: 'Batch Barangay Coverage & Dispatch Verification',
                                    });
                                    setBulkReason('');
                                    setBulkExecuted(false);
                                }}
                            >
                                <MapPin className="size-3.5 text-blue-400" />
                                <span>Tag Coverage</span>
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

                {/* ===================================================================
             GUARDED BATCH CONFIRMATION DIALOG
             =================================================================== */}
                <Dialog
                    open={bulkAction !== null}
                    onOpenChange={(open) => !open && setBulkAction(null)}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base font-bold">
                                <Tag className="size-4 text-primary" />
                                <span>{bulkAction?.title}</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Scope preview:{' '}
                                <strong>{selectedIds.length} offerings selected</strong> across
                                Tagudin trade catalog.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-3 py-2 text-xs">
                            <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 p-3">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                    Selected Offerings
                                </span>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {listings
                                        .filter((l) => selectedIds.includes(l.id))
                                        .map((l) => (
                                            <Badge
                                                key={l.id}
                                                variant="outline"
                                                className="font-mono text-[10px]"
                                            >
                                                {l.title.slice(0, 26)}... (v{l.version})
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
                                    placeholder="e.g. Typhoon weather warning dispatch suspension for coastal barangays..."
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
                                        Batch listing command executed successfully in simulation
                                        log.
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

                {/* ===================================================================
             TIER 1 DETAIL: SLIDE-OVER QUICK PEEK DRAWER (<Sheet>)
             =================================================================== */}
                <Sheet
                    open={!!selectedListing}
                    onOpenChange={(open) => !open && setSelectedListing(null)}
                >
                    <SheetContent
                        side="right"
                        className="flex h-full flex-col overflow-hidden p-0 sm:max-w-lg"
                    >
                        <SheetHeader>
                            <div className="flex items-center justify-between pr-6">
                                <div className="flex items-center gap-2">
                                    <Tag className="size-4 text-primary" />
                                    <SheetTitle>Governed Offering Peek</SheetTitle>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                    <Badge variant="outline">{selectedListing?.id}</Badge>
                                    <Badge variant="secondary">v{selectedListing?.version}</Badge>
                                </div>
                            </div>
                            <SheetDescription>
                                Quick operational preview of immutable terms, capacity buckets, and
                                conversion funnel.
                            </SheetDescription>
                        </SheetHeader>

                        {selectedListing && (
                            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6 text-xs">
                                {/* Hero Media Banner */}
                                {selectedListing.imageUrl && (
                                    <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl border border-border shadow-xs">
                                        <img
                                            src={selectedListing.imageUrl}
                                            alt={selectedListing.title}
                                            className="h-full w-full object-cover"
                                        />
                                        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(selectedListing.status)}
                                                    <Badge
                                                        variant="outline"
                                                        className="border-white/20 bg-black/40 font-mono text-[10px] text-white"
                                                    >
                                                        v{selectedListing.version}
                                                    </Badge>
                                                </div>
                                                <span className="font-mono text-base font-bold text-white">
                                                    ₱{(selectedListing.priceMinor / 100).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Offering Title Card */}
                                <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Trade Offering
                                        </span>
                                        {getStatusBadge(selectedListing.status)}
                                    </div>
                                    <span className="text-sm leading-snug font-bold text-foreground">
                                        {selectedListing.title}
                                    </span>
                                    <div className="flex items-center justify-between border-t border-border pt-1 text-xs">
                                        <span className="text-muted-foreground">Category:</span>
                                        <span className="font-medium text-foreground">
                                            {selectedListing.category}{' '}
                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                ({selectedListing.categoryVersion})
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                {/* Commercial Terms & Work Shape */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Base Commercial Rate
                                        </span>
                                        <span className="font-mono text-base font-bold text-foreground">
                                            ₱{(selectedListing.priceMinor / 100).toFixed(2)}
                                        </span>
                                        <span className="text-[10.5px] text-muted-foreground">
                                            {selectedListing.unitLabel}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Fulfillment Shape
                                        </span>
                                        <div>{getShapeBadge(selectedListing.workShape)}</div>
                                        <span className="text-[10.5px] text-muted-foreground capitalize">
                                            {selectedListing.listingType.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>

                                {/* Funnel Analytics */}
                                <FunnelAnalytics
                                    title="Discovery & Conversion Funnel"
                                    description="Last 30-day mobile search discovery and booking pipeline"
                                    steps={[
                                        {
                                            id: 's1',
                                            label: 'Search Impressions (SERP)',
                                            value: selectedListing.impressionsCount,
                                            color: 'bg-blue-600',
                                            subtext:
                                                'Rendered ≥50% in resident search and browse feeds via native beacon',
                                        },
                                        {
                                            id: 's2',
                                            label: 'Detail Page Views (PDP)',
                                            value: selectedListing.viewsCount,
                                            color: 'bg-blue-500',
                                            subtext:
                                                'Tapped card to inspect inclusions, photos, and delivery options',
                                        },
                                        {
                                            id: 's3',
                                            label: 'High-Intent Engagements',
                                            value: selectedListing.inquiriesCount,
                                            color: 'bg-indigo-500',
                                            subtext:
                                                'Courier extension toggled, chat started, or slot held',
                                        },
                                        {
                                            id: 's4',
                                            label: 'Confirmed Orders',
                                            value: selectedListing.ordersCount,
                                            color: 'bg-emerald-600',
                                            subtext:
                                                'Locked bilateral commercial contract in Tagudin',
                                        },
                                    ]}
                                    conversionBadgeText={`${((selectedListing.ordersCount / selectedListing.viewsCount) * 100).toFixed(1)}% View-to-Order CVR`}
                                />

                                {/* Partnered Deal-Chaining Presets (Document 18 Contract) */}
                                <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                                            <Network className="size-3 text-primary" />
                                            <span>Fulfillment &amp; Deal-Chain Extensions</span>
                                        </span>
                                        <Badge variant="outline" className="text-[9px]">
                                            {selectedListing.extensions?.length ?? 1} Presets
                                        </Badge>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {selectedListing.extensions &&
                                        selectedListing.extensions.length > 0 ? (
                                            selectedListing.extensions.map((ext, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-start justify-between gap-2 rounded-lg border border-border bg-muted/10 p-2.5 text-xs"
                                                >
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold text-foreground">
                                                                {ext.label}
                                                            </span>
                                                            {ext.isDefault && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-emerald-500/30 px-1 py-0 text-[8.5px] text-emerald-500"
                                                                >
                                                                    Default
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {ext.defaultPartner && (
                                                            <span className="text-[10.5px] text-muted-foreground">
                                                                Partner:{' '}
                                                                <strong className="text-foreground">
                                                                    {ext.defaultPartner}
                                                                </strong>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="shrink-0 font-mono font-bold text-foreground">
                                                        {ext.feeMinor === 0
                                                            ? 'Free'
                                                            : `+₱${(ext.feeMinor / 100).toFixed(2)}`}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-xs text-muted-foreground">
                                                Direct counter / stall fulfillment only. No
                                                downstream courier extension attached.
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                        Single-owner base contract. Child orders formed
                                        independently at checkout.
                                    </span>
                                </div>

                                {/* Proof of Craft Evidence Gallery */}
                                {selectedListing.evidencePhotos &&
                                    selectedListing.evidencePhotos.length > 0 && (
                                        <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3.5 text-xs">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                                Proof of Craft &amp; Verification Photos
                                            </span>
                                            <div className="flex gap-2 overflow-x-auto pb-1">
                                                {selectedListing.evidencePhotos.map((photo, i) => (
                                                    <div
                                                        key={i}
                                                        className="size-16 shrink-0 overflow-hidden rounded-lg border border-border shadow-2xs"
                                                    >
                                                        <img
                                                            src={photo}
                                                            alt="Work proof"
                                                            className="size-full object-cover transition-transform hover:scale-105"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                                Verified during trade accreditation inspection in
                                                Tagudin.
                                            </span>
                                        </div>
                                    )}

                                {/* Granular Capacity Buckets */}
                                <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Governed Capacity Bucket
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="font-mono text-[9px] capitalize"
                                        >
                                            {selectedListing.capacityType}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">
                                            Available Allocation:
                                        </span>
                                        <span className="font-mono font-bold text-foreground">
                                            {selectedListing.availableCapacity} /{' '}
                                            {selectedListing.totalCapacity}{' '}
                                            {selectedListing.capacityType === 'slots'
                                                ? 'daily slots'
                                                : 'units'}
                                        </span>
                                    </div>
                                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="rounded-full bg-emerald-500 transition-all"
                                            style={{
                                                width: `${Math.round((selectedListing.availableCapacity / Math.max(1, selectedListing.totalCapacity)) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10.5px] text-muted-foreground">
                                        Oversell protection enforced via row-level locks.
                                    </span>
                                </div>

                                {/* Provider & Community Agent Attribution */}
                                <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                        Provider Accreditation &amp; Delegation
                                    </span>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-foreground">
                                                    {selectedListing.provider.name}
                                                </span>
                                                {selectedListing.provider.verified && (
                                                    <span title="Accreditation Verified">
                                                        <ShieldCheck className="size-3 text-emerald-500" />
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-mono text-[10.5px] text-muted-foreground">
                                                {selectedListing.provider.handle}
                                            </span>
                                        </div>
                                        <Badge variant="outline" className="text-[9px]">
                                            {selectedListing.provider.agentName
                                                ? 'Assisted by Agent'
                                                : 'Direct Provider'}
                                        </Badge>
                                    </div>
                                    {selectedListing.provider.agentName && (
                                        <div className="rounded-md border border-purple-500/30 bg-purple-500/5 p-2 text-[10.5px] text-purple-400">
                                            Managed by{' '}
                                            <strong>{selectedListing.provider.agentName}</strong>{' '}
                                            under registered Bayanihan consent grant.
                                        </div>
                                    )}
                                </div>

                                {/* Tagudin Barangay Coverage */}
                                <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                        Tagudin Coverage Area
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {selectedListing.barangays.map((b) => (
                                            <span
                                                key={b}
                                                className="flex items-center gap-1 rounded-md border border-border bg-muted/20 px-2 py-0.5 text-[11px] text-foreground"
                                            >
                                                <MapPin className="size-2.5 text-primary" />
                                                <span>{b}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment Lanes Supported */}
                                <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                        Authorized Payment Lanes
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {selectedListing.paymentLanes.map((l) => (
                                            <Badge
                                                key={l}
                                                variant="outline"
                                                className="text-[10px] capitalize"
                                            >
                                                {l === 'cash'
                                                    ? 'External Cash'
                                                    : l === 'proof'
                                                      ? 'Digital Proof'
                                                      : 'Tiwala Escrow'}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Immutable Version & Audit Note */}
                                <div className="flex justify-between border-t border-border pt-2 text-[10.5px] text-muted-foreground">
                                    <span>Version Pinned:</span>
                                    <span className="font-mono text-foreground">
                                        Snapshot v{selectedListing.version} (
                                        {selectedListing.updatedAt})
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Sheet Footer with Deep-Link */}
                        <SheetFooter>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setSelectedListing(null)}
                            >
                                Close Peek
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className="h-8 gap-1.5 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                onClick={() => {
                                    if (selectedListing) {
                                        router.visit(`/admin/orders?listing=${selectedListing.id}`);
                                    }
                                }}
                            >
                                <span>Inspect Active Orders</span>
                                <ArrowUpRight className="size-3.5" />
                            </Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>
        </AdminLayout>
    );
}
