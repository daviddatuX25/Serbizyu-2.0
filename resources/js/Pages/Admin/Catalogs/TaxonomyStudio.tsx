import { Head } from '@inertiajs/react';
import * as React from 'react';
import {
    AlertCircle,
    Check,
    ChevronRight,
    FileCheck2,
    FolderTree,
    RotateCw,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Users,
    Zap,
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
import { Label } from '@/components/ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
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
import { Textarea } from '@/components/ui/textarea';
import { AdminMetricCard } from '@/components/admin/GraphicMetrics';
import { AdminLayout } from '@/layouts/AdminLayout';

export interface CategoryPolicyRow {
    id: string;
    code: string;
    name: string;
    description: string;
    safetyClass: 'S0' | 'S1' | 'S2' | 'S3';
    requiredClearance: string;
    clearanceDetails: string;
    workShapes: Array<'A1' | 'A3' | 'A4' | 'A9'>;
    allowedLanes: string[];
    profileCode: string;
    currentVersion: number;
    pinnedVersionString: string;
    activeProvidersCount: number;
    accreditedProviders: string[];
    status: 'active' | 'paused' | 'pending_review';
}

const SAMPLE_CATEGORY_POLICIES: CategoryPolicyRow[] = [
    {
        id: 'cat-1',
        code: 'home-electrical',
        name: 'Home Electrical & HVAC',
        description:
            'Residential breaker box wiring, high-voltage motor diagnostics, and split-type aircon servicing.',
        safetyClass: 'S3',
        requiredClearance: 'PRC License or TESDA NC II',
        clearanceDetails:
            'Mandatory Registered Master Electrician (PRC) or TESDA NC II in Electrical / RAC Servicing. Fallback Barangay clearance disallowed for 220V work.',
        workShapes: ['A1', 'A3'],
        allowedLanes: ['cash', 'proof', 'tiwala'],
        profileCode: 'PROF_HOME_ELECTRICAL',
        currentVersion: 2,
        pinnedVersionString: 'v2.1',
        activeProvidersCount: 2,
        accreditedProviders: ['Arman Electric', 'Danilo Agri Machining'],
        status: 'active',
    },
    {
        id: 'cat-2',
        code: 'local-food',
        name: 'Local Food & Traditional Bakes',
        description:
            'Artisanal provincial delicacies, fresh bibingka party boxes, carabao pastillas, and catering platters.',
        safetyClass: 'S1',
        requiredClearance: 'Barangay Sanitary Clearance',
        clearanceDetails:
            'Barangay food handling endorsement or municipal sanitary permit. Elders assisted via registered community agents.',
        workShapes: ['A4'],
        allowedLanes: ['cash', 'proof', 'tiwala'],
        profileCode: 'PROF_LOCAL_BAKERY',
        currentVersion: 3,
        pinnedVersionString: 'v1.4',
        activeProvidersCount: 2,
        accreditedProviders: ['Tagudin Traditional Bakes', 'Lola Nena Dela Cruz (via Danny)'],
        status: 'active',
    },
    {
        id: 'cat-3',
        code: 'home-plumbing',
        name: 'Home Plumbing & Sanitation',
        description:
            'Residential water pump repair, PVC pipe installation, and jetmatic seal replacement.',
        safetyClass: 'S2',
        requiredClearance: 'LGU Police / Barangay Endorsement',
        clearanceDetails:
            'Proof of residence and local LGU endorsement. Technical plumbing experience verified via initial site evidence upload.',
        workShapes: ['A3'],
        allowedLanes: ['cash', 'proof'],
        profileCode: 'PROF_HOME_PLUMBING',
        currentVersion: 1,
        pinnedVersionString: 'v1.0',
        activeProvidersCount: 1,
        accreditedProviders: ['Kuya Ben Pipes'],
        status: 'active',
    },
    {
        id: 'cat-4',
        code: 'custom-woodwork',
        name: 'Woodwork & Custom Carpentry',
        description:
            'Timber dining table fabrication, home framing, door hanging, and custom cabinet millwork.',
        safetyClass: 'S2',
        requiredClearance: 'DTI Registration or LGU Endorsement',
        clearanceDetails:
            'DTI Certificate of Business Name Registration (BNR) for commercial workshops, or Barangay carpentry endorsement.',
        workShapes: ['A1'],
        allowedLanes: ['cash', 'proof'],
        profileCode: 'PROF_CUSTOM_CARPENTRY',
        currentVersion: 1,
        pinnedVersionString: 'v1.1',
        activeProvidersCount: 1,
        accreditedProviders: ['Juan Carpentry Works'],
        status: 'active',
    },
    {
        id: 'cat-5',
        code: 'agri-logistics',
        name: 'Agricultural Hauling & Logistics',
        description:
            'Palay wet crop dike extraction, kuliglig tractor hauling, and solar dryer grain transport.',
        safetyClass: 'S2',
        requiredClearance: 'LGU Barangay / Farmers Guild Endorsement',
        clearanceDetails:
            'Membership in Tagudin Haulers Guild or barangay tractor operator registration.',
        workShapes: ['A4'],
        allowedLanes: ['cash'],
        profileCode: 'PROF_AGRI_LOGISTICS',
        currentVersion: 2,
        pinnedVersionString: 'v2.0',
        activeProvidersCount: 1,
        accreditedProviders: ['Bitalag Haulers Guild'],
        status: 'active',
    },
    {
        id: 'cat-6',
        code: 'courier-dispatch',
        name: 'Express Delivery & Courier Transit',
        description:
            'Same-day parcel transit, motorcycle food dispatch, and multi-vendor Deal-Chain delivery extensions.',
        safetyClass: 'S3',
        requiredClearance: "LTO Driver's License & Motorcycle OR/CR",
        clearanceDetails:
            "Professional driver's license with motorcycle restriction code and valid vehicle registration.",
        workShapes: ['A4'],
        allowedLanes: ['cash', 'proof'],
        profileCode: 'PROF_COURIER_TRANSIT',
        currentVersion: 2,
        pinnedVersionString: 'v1.5',
        activeProvidersCount: 1,
        accreditedProviders: ['Mark Tagudin Courier'],
        status: 'active',
    },
    {
        id: 'cat-7',
        code: 'digital-design',
        name: 'Digital Creative & Graphic Design',
        description:
            'Custom screenprint vector logos, tarpaulin layout, and digital branding assets.',
        safetyClass: 'S0',
        requiredClearance: 'Phone OTP Only (Open)',
        clearanceDetails:
            'Low physical risk. Open to all verified citizens. Quality assured via milestone deliverable sign-off.',
        workShapes: ['A9'],
        allowedLanes: ['proof', 'tiwala'],
        profileCode: 'PROF_DIGITAL_DESIGN',
        currentVersion: 1,
        pinnedVersionString: 'v1.2',
        activeProvidersCount: 1,
        accreditedProviders: ['Maya Dela Cruz'],
        status: 'active',
    },
    {
        id: 'cat-8',
        code: 'metalwork-welding',
        name: 'Metalwork & Structural Welding',
        description:
            'Galvanized gutter repair, iron gate welding, and high-altitude stage scaffold reinforcement.',
        safetyClass: 'S3',
        requiredClearance: 'TESDA NC II (SMAW Arc Welding)',
        clearanceDetails:
            'Mandatory Shielded Metal Arc Welding certification and safety harness compliance.',
        workShapes: ['A1'],
        allowedLanes: ['cash', 'proof'],
        profileCode: 'PROF_STRUCTURAL_WELDING',
        currentVersion: 1,
        pinnedVersionString: 'v1.0',
        activeProvidersCount: 0,
        accreditedProviders: [],
        status: 'active',
    },
];

export default function TaxonomyStudio() {
    const [policies] = React.useState<CategoryPolicyRow[]>(SAMPLE_CATEGORY_POLICIES);
    const [safetyFilter, setSafetyFilter] = React.useState<string>('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(6);
    const [selectedPolicy, setSelectedPolicy] = React.useState<CategoryPolicyRow | null>(null);
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

    // Version bump modal state
    const [bumpModalItem, setBumpModalItem] = React.useState<CategoryPolicyRow | null>(null);
    const [bumpReason, setBumpReason] = React.useState('');
    const [bumpExecuted, setBumpExecuted] = React.useState(false);

    // Filter computation
    const filteredPolicies = React.useMemo(() => {
        return policies.filter((item) => {
            if (safetyFilter !== 'all' && item.safetyClass !== safetyFilter) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    item.name.toLowerCase().includes(q) ||
                    item.code.toLowerCase().includes(q) ||
                    item.requiredClearance.toLowerCase().includes(q)
                );
            }

            return true;
        });
    }, [policies, safetyFilter, searchQuery]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [safetyFilter, searchQuery, pageSize]);

    const totalItems = filteredPolicies.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const paginatedPolicies = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredPolicies.slice(start, start + pageSize);
    }, [filteredPolicies, currentPage, pageSize]);

    const isAllPageSelected =
        paginatedPolicies.length > 0 && paginatedPolicies.every((p) => selectedIds.includes(p.id));
    const isSomePageSelected =
        paginatedPolicies.some((p) => selectedIds.includes(p.id)) && !isAllPageSelected;

    const getSafetyBadge = (safetyClass: string) => {
        switch (safetyClass) {
            case 'S3':
                return (
                    <Badge variant="destructive" className="gap-1 font-mono text-[10px]">
                        <ShieldAlert className="size-2.5" />
                        <span>High Risk</span>
                    </Badge>
                );
            case 'S2':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1 border-amber-500/40 bg-amber-500/5 font-mono text-[10px] text-amber-500"
                    >
                        <Shield className="size-2.5" />
                        <span>In-Home</span>
                    </Badge>
                );
            case 'S1':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1 border-blue-500/40 bg-blue-500/5 font-mono text-[10px] text-blue-400"
                    >
                        <Check className="size-2.5" />
                        <span>Public</span>
                    </Badge>
                );
            case 'S0':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1 border-emerald-500/40 bg-emerald-500/5 font-mono text-[10px] text-emerald-500"
                    >
                        <Zap className="size-2.5" />
                        <span>Digital</span>
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="font-mono text-[10px]">
                        {safetyClass}
                    </Badge>
                );
        }
    };

    const handleExecuteBump = (e: React.FormEvent) => {
        e.preventDefault();
        if (!bumpReason.trim() || !bumpModalItem) return;

        setBumpExecuted(true);
        setTimeout(() => {
            bumpModalItem.currentVersion += 1;
            bumpModalItem.pinnedVersionString = `v${bumpModalItem.currentVersion}.0`;
            setBumpExecuted(false);
            setBumpModalItem(null);
            setBumpReason('');
        }, 1000);
    };

    return (
        <AdminLayout currentSection="inspector" title="Categories & Trade Rules">
            <Head title="Categories & Trade Rules — Serbizyu Admin" />

            <div className="flex flex-col gap-6">
                {/* Header Overview */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
                                Service Categories &amp; Trade Governance Rules
                            </h1>
                            <Badge variant="outline" className="font-mono text-xs">
                                Governed Taxonomy
                            </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Governed master policy defining allowed work shapes, payment lanes,
                            safety risk classes, and mandatory credentials across Tagudin.
                        </p>
                    </div>
                    <Badge variant="outline" className="w-fit font-mono text-xs">
                        {policies.length} Governed Categories
                    </Badge>
                </div>

                {/* Macro Governance & Safety Telemetry Strip */}
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3.5 text-xs shadow-2xs lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="size-4 text-emerald-500" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                    Governance Architecture
                                </span>
                                <span className="font-semibold text-foreground">
                                    Zero-Unvetted Policy{' '}
                                    <span className="font-mono text-[10px] text-emerald-500">
                                        (S2/S3 strictly gated)
                                    </span>
                                </span>
                            </div>
                        </div>

                        <Separator orientation="vertical" className="hidden h-6 sm:block" />

                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                Regulated High-Risk (S3)
                            </span>
                            <span className="font-semibold text-rose-400">
                                3 Categories{' '}
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    (PRC / TESDA / LTO mandated)
                                </span>
                            </span>
                        </div>

                        <Separator orientation="vertical" className="hidden h-6 sm:block" />

                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                Accreditation Linkage
                            </span>
                            <span className="font-semibold text-foreground">
                                Linked to Identity Review
                            </span>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-500">
                        <AlertCircle className="size-3.5 shrink-0" />
                        <div className="flex items-center gap-1.5 font-medium">
                            <span>Supply Gap:</span>
                            <strong className="text-foreground">
                                Metalwork &amp; Welding has 0 active accredited providers
                            </strong>
                        </div>
                    </div>
                </div>

                {/* 4 Graphic KPI Metric Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <AdminMetricCard
                        title="Governed Categories"
                        value="08 Active"
                        statusBeacon="live"
                        accentColor="#10b981"
                        trendData={[5, 6, 7, 7, 8, 8]}
                        subtext="Municipal service catalog families"
                        badgeText="Taxonomy"
                    />

                    <AdminMetricCard
                        title="Safety Class Split"
                        value="38% S3 High"
                        statusBeacon="live"
                        accentColor="#f59e0b"
                        segments={[
                            { label: 'S3 High', value: 3, colorClass: 'bg-red-500' },
                            { label: 'S2 In-Home', value: 2, colorClass: 'bg-amber-500' },
                            { label: 'S1 Public', value: 2, colorClass: 'bg-blue-500' },
                            { label: 'S0 Digital', value: 1, colorClass: 'bg-emerald-500' },
                        ]}
                        subtext="Risk-weighted physical exposure matrix"
                    />

                    <AdminMetricCard
                        title="Active Supply Density"
                        value="09 Providers"
                        statusBeacon="live"
                        accentColor="#38bdf8"
                        donutPct={88}
                        subtext="88% categories staffed with active supply"
                    />

                    <AdminMetricCard
                        title="Immutable Versions"
                        value="v2.1 Current"
                        statusBeacon="purple"
                        accentColor="#a855f7"
                        subtext="Pin resolution enforced on all orders"
                    />
                </div>

                {/* Scalable Filter & Search Toolbar */}
                <Card className="border-border bg-card shadow-xs">
                    <CardHeader className="flex flex-col gap-3 border-b border-border p-4 pb-3">
                        {/* Safety Class Tabs */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="inline-flex max-w-full items-center overflow-x-auto rounded-lg border border-border bg-muted/30 p-1 text-xs font-medium">
                                {[
                                    { id: 'all', label: `All Categories (${policies.length})` },
                                    { id: 'S3', label: 'High Risk (3)' },
                                    { id: 'S2', label: 'In-Home (2)' },
                                    { id: 'S1', label: 'Public (2)' },
                                    { id: 'S0', label: 'Digital (1)' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setSafetyFilter(tab.id)}
                                        className={`cursor-pointer rounded-md px-3 py-1 text-xs whitespace-nowrap transition-all ${
                                            safetyFilter === tab.id
                                                ? 'bg-background font-semibold text-foreground shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Single Fast Search Bar */}
                        <div className="relative w-full">
                            <Search className="absolute top-2.5 left-3 size-3.5 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 w-full border-border bg-muted/20 pl-9 font-mono text-xs text-foreground"
                            />
                        </div>
                    </CardHeader>

                    {/* Unified Scan-First Table (6 Columns + Checkbox) */}
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
                                                            ...paginatedPolicies.map((p) => p.id),
                                                        ]),
                                                    );
                                                    setSelectedIds(newIds);
                                                } else {
                                                    const pageIds = new Set(
                                                        paginatedPolicies.map((p) => p.id),
                                                    );
                                                    setSelectedIds(
                                                        selectedIds.filter(
                                                            (id) => !pageIds.has(id),
                                                        ),
                                                    );
                                                }
                                            }}
                                            aria-label="Select all categories on this page"
                                        />
                                    </TableHead>
                                    <TableHead className="w-64">
                                        Service Category &amp; Code
                                    </TableHead>
                                    <TableHead className="w-36">Safety Risk Tier</TableHead>
                                    <TableHead className="w-64">
                                        Required Accreditation Proof
                                    </TableHead>
                                    <TableHead className="w-36">Allowed Work Shapes</TableHead>
                                    <TableHead className="w-36">
                                        Pinned Version &amp; Supply
                                    </TableHead>
                                    <TableHead className="w-24 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedPolicies.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="h-32 text-center text-xs text-muted-foreground"
                                        >
                                            No categories match your filter criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedPolicies.map((item) => {
                                        const isSelected = selectedIds.includes(item.id);
                                        return (
                                            <TableRow
                                                key={item.id}
                                                className={`group cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-primary/5 hover:bg-primary/10'
                                                        : 'hover:bg-muted/40'
                                                }`}
                                                onClick={() => setSelectedPolicy(item)}
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
                                                        aria-label={`Select category ${item.name}`}
                                                    />
                                                </TableCell>

                                                {/* 1. Category Name & Code */}
                                                <TableCell>
                                                    <div className="flex min-w-0 flex-col gap-0.5">
                                                        <span className="truncate text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                                                            {item.name}
                                                        </span>
                                                        <span className="font-mono text-[10.5px] text-muted-foreground">
                                                            {item.code} ·{' '}
                                                            <span className="font-normal text-primary">
                                                                {item.profileCode}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* 2. Safety Risk Tier */}
                                                <TableCell>
                                                    {getSafetyBadge(item.safetyClass)}
                                                </TableCell>

                                                {/* 3. Required Accreditation Proof */}
                                                <TableCell>
                                                    <div className="flex flex-col text-xs leading-snug">
                                                        <span className="max-w-[240px] truncate font-semibold text-foreground">
                                                            {item.requiredClearance}
                                                        </span>
                                                        <span className="max-w-[240px] truncate text-[10px] text-muted-foreground">
                                                            {item.safetyClass === 'S0'
                                                                ? 'Open self-service listing'
                                                                : 'Clearance required'}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* 4. Allowed Work Shapes */}
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.workShapes.map((shape) => (
                                                            <Badge
                                                                key={shape}
                                                                variant="outline"
                                                                className="px-1.5 py-0 font-mono text-[9.5px]"
                                                            >
                                                                {shape}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>

                                                {/* 5. Pinned Version & Active Supply */}
                                                <TableCell>
                                                    <div className="flex flex-col text-xs">
                                                        <span className="font-mono font-bold text-foreground">
                                                            {item.pinnedVersionString}
                                                        </span>
                                                        <span
                                                            className={
                                                                item.activeProvidersCount > 0
                                                                    ? 'text-[10.5px] font-medium text-emerald-500'
                                                                    : 'text-[10.5px] font-medium text-amber-500'
                                                            }
                                                        >
                                                            {item.activeProvidersCount > 0
                                                                ? `${item.activeProvidersCount} providers live`
                                                                : '0 providers (unmet)'}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* 6. Actions: Peek */}
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 cursor-pointer gap-1 px-2 text-xs text-muted-foreground group-hover:text-foreground"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedPolicy(item);
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
                                categories
                            </div>

                            <div className="flex items-center gap-3">
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

                {/* Quick Peek Drawer for Governed Policy */}
                <Sheet
                    open={!!selectedPolicy}
                    onOpenChange={(open) => !open && setSelectedPolicy(null)}
                >
                    <SheetContent
                        side="right"
                        className="flex h-full flex-col overflow-hidden p-0 sm:max-w-lg"
                    >
                        <SheetHeader>
                            <div className="flex items-center justify-between pr-6">
                                <div className="flex items-center gap-2">
                                    <FolderTree className="size-4 text-primary" />
                                    <SheetTitle>Category Governance Policy</SheetTitle>
                                </div>
                                <div className="flex items-center gap-1 font-mono text-[10px]">
                                    <Badge variant="outline">
                                        {selectedPolicy?.pinnedVersionString}
                                    </Badge>
                                    {selectedPolicy && getSafetyBadge(selectedPolicy.safetyClass)}
                                </div>
                            </div>
                            <SheetDescription>
                                Official municipal trade policy, required clearances, and allowed
                                fulfillment formats.
                            </SheetDescription>
                        </SheetHeader>

                        {selectedPolicy && (
                            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6 text-xs">
                                {/* Category Header Card */}
                                <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">
                                            System Code: {selectedPolicy.code}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="border-primary/30 font-mono text-[9px] text-primary"
                                        >
                                            {selectedPolicy.profileCode}
                                        </Badge>
                                    </div>
                                    <span className="text-base leading-snug font-bold text-foreground">
                                        {selectedPolicy.name}
                                    </span>
                                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                        {selectedPolicy.description}
                                    </p>
                                </div>

                                {/* Safety & Legal Classification Card */}
                                <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                                            <Shield className="size-3 text-primary" />
                                            <span>Philippine Legal &amp; Safety Tier</span>
                                        </span>
                                        {getSafetyBadge(selectedPolicy.safetyClass)}
                                    </div>
                                    <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/10 p-2.5">
                                        <span className="font-semibold text-foreground">
                                            {selectedPolicy.safetyClass === 'S3'
                                                ? 'S3 Elevated Physical / Electrical / Vehicle Risk'
                                                : selectedPolicy.safetyClass === 'S2'
                                                  ? 'S2 In-Home / Practical Domestic Work'
                                                  : selectedPolicy.safetyClass === 'S1'
                                                    ? 'S1 Public Stall / Local Food Preparation'
                                                    : 'S0 Open Digital / Remote Creative Service'}
                                        </span>
                                        <p className="text-[11px] leading-snug text-muted-foreground">
                                            {selectedPolicy.clearanceDetails}
                                        </p>
                                    </div>
                                </div>

                                {/* Required Accreditation Proof Card */}
                                <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                        Required Accreditation Document to Unlock Listing
                                    </span>
                                    <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground">
                                                {selectedPolicy.requiredClearance}
                                            </span>
                                            <span className="text-[10.5px] text-muted-foreground">
                                                Reviewed in Identity Review
                                            </span>
                                        </div>
                                        <FileCheck2 className="size-5 shrink-0 text-primary" />
                                    </div>
                                </div>

                                {/* Allowed Commercial Formats Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Allowed Work Shapes
                                        </span>
                                        <div className="flex flex-wrap gap-1 pt-0.5">
                                            {selectedPolicy.workShapes.map((s) => (
                                                <Badge
                                                    key={s}
                                                    variant="outline"
                                                    className="font-mono text-[10px]"
                                                >
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Payment Lanes
                                        </span>
                                        <div className="flex flex-wrap gap-1 pt-0.5">
                                            {selectedPolicy.allowedLanes.map((l) => (
                                                <Badge
                                                    key={l}
                                                    variant="outline"
                                                    className="font-mono text-[9.5px] capitalize"
                                                >
                                                    {l}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Active Tagudin Accredited Providers */}
                                <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                                            <Users className="size-3 text-primary" />
                                            <span>
                                                Accredited Providers Live in Tagudin (
                                                {selectedPolicy.activeProvidersCount})
                                            </span>
                                        </span>
                                        <Badge variant="outline" className="text-[9px]">
                                            {selectedPolicy.activeProvidersCount > 0
                                                ? 'Supplied'
                                                : 'Supply Desert'}
                                        </Badge>
                                    </div>
                                    {selectedPolicy.accreditedProviders.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedPolicy.accreditedProviders.map((p) => (
                                                <span
                                                    key={p}
                                                    className="rounded-md border border-border bg-muted/20 px-2 py-0.5 text-xs text-foreground"
                                                >
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-1 text-xs text-amber-500">
                                            Zero providers currently cleared for this category.
                                            Sourcing push recommended.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Sheet Footer */}
                        <SheetFooter>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setSelectedPolicy(null)}
                            >
                                Close Peek
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className="h-8 cursor-pointer gap-1.5 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                onClick={() => {
                                    if (selectedPolicy) {
                                        setBumpModalItem(selectedPolicy);
                                    }
                                }}
                            >
                                <RotateCw className="size-3.5" />
                                <span>Bump Policy Version</span>
                            </Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>

                {/* Guarded Policy Version Bump Modal */}
                <Dialog
                    open={bumpModalItem !== null}
                    onOpenChange={(open) => !open && setBumpModalItem(null)}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base font-bold">
                                <RotateCw className="size-4 text-primary" />
                                <span>Bump Category Policy Version</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Create new immutable business version for{' '}
                                <strong>{bumpModalItem?.name}</strong> (v
                                {bumpModalItem?.currentVersion} $\rightarrow$ v
                                {(bumpModalItem?.currentVersion ?? 1) + 1}).
                            </DialogDescription>
                        </DialogHeader>

                        <form
                            onSubmit={handleExecuteBump}
                            className="flex flex-col gap-3 py-2 text-xs"
                        >
                            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs leading-snug text-muted-foreground">
                                Existing active listings remain pinned to their current version
                                snapshot. New version takes effect for future listings under
                                GovernedCatalogService rules.
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="bump-reason"
                                    className="text-xs font-semibold text-foreground"
                                >
                                    Reason for change
                                </Label>
                                <Textarea
                                    id="bump-reason"
                                    value={bumpReason}
                                    onChange={(e) => setBumpReason(e.target.value)}
                                    placeholder="State reason for taxonomy policy revision (e.g. Added TESDA NC II alternative clearance)..."
                                    className="min-h-[85px] border-border bg-muted/20 text-xs leading-relaxed text-foreground"
                                    required
                                />
                            </div>

                            {bumpExecuted && (
                                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-500">
                                    <Check className="size-4 shrink-0" />
                                    <span>
                                        Category version bumped successfully. Snapshot committed to
                                        category_versions.
                                    </span>
                                </div>
                            )}

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setBumpModalItem(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="h-8 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                    disabled={!bumpReason.trim() || bumpExecuted}
                                >
                                    {bumpExecuted ? 'Committed ✓' : 'Commit Version Bump'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
