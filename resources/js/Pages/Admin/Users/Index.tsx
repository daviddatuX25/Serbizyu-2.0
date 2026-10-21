import { Head, router } from '@inertiajs/react';
import * as React from 'react';
import {
    ArrowUpRight,
    Check,
    ChevronRight,
    FileCheck2,
    FileDown,
    Search,
    Send,
    ShieldAlert,
    ShieldCheck,
    UserCheck,
    Users,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

export interface UserAccountRecord {
    id: string;
    name: string;
    initials: string;
    phoneMasked: string;
    accessTier: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
    roleCodes: string[];
    verificationStatus: 'verified_gov' | 'verified_barangay' | 'unverified' | 'pending_review';
    agentDelegation?: { agentName: string; scope: string };
    barangay: string;
    status: 'active' | 'suspended';
    joinedDate: string;
    evidenceClass?: string;
}

const SAMPLE_USERS: UserAccountRecord[] = [
    {
        id: 'usr-01',
        name: 'Maria Santos',
        initials: 'MS',
        phoneMasked: '+63 917 *** 3456',
        accessTier: 'L2',
        roleCodes: ['buyer'],
        verificationStatus: 'verified_gov',
        barangay: 'Poblacion',
        status: 'active',
        joinedDate: '2026-08-12',
        evidenceClass: 'PH_PHILID',
    },
    {
        id: 'usr-02',
        name: 'Arman Electric',
        initials: 'AE',
        phoneMasked: '+63 918 *** 7890',
        accessTier: 'L3',
        roleCodes: ['provider'],
        verificationStatus: 'verified_gov',
        barangay: 'Poblacion',
        status: 'active',
        joinedDate: '2026-08-15',
        evidenceClass: 'PRC_LICENSE_ELECTRICAL',
    },
    {
        id: 'usr-03',
        name: 'Lola Nena Dela Cruz',
        initials: 'LN',
        phoneMasked: '+63 920 *** 1122',
        accessTier: 'L0',
        roleCodes: ['provider'],
        verificationStatus: 'verified_barangay',
        agentDelegation: { agentName: 'Kuya Danny (Agent)', scope: 'listings, quotes' },
        barangay: 'Farola',
        status: 'active',
        joinedDate: '2026-08-20',
        evidenceClass: 'BARANGAY_INDIGENCY_CLEAR',
    },
    {
        id: 'usr-04',
        name: 'Kuya Danny Bataller',
        initials: 'KD',
        phoneMasked: '+63 921 *** 4455',
        accessTier: 'L3',
        roleCodes: ['agent', 'provider'],
        verificationStatus: 'verified_gov',
        barangay: 'Farola',
        status: 'active',
        joinedDate: '2026-08-10',
        evidenceClass: 'LGU_COMMUNITY_AGENT_CERT',
    },
    {
        id: 'usr-05',
        name: 'Juan Carpentry Works',
        initials: 'JC',
        phoneMasked: '+63 922 *** 9988',
        accessTier: 'L1',
        roleCodes: ['provider'],
        verificationStatus: 'pending_review',
        barangay: 'Libtong',
        status: 'active',
        joinedDate: '2026-09-02',
        evidenceClass: 'DTI_BUSINESS_REGISTRATION',
    },
    {
        id: 'usr-06',
        name: 'Elena Cruz',
        initials: 'EC',
        phoneMasked: '+63 919 *** 5566',
        accessTier: 'L2',
        roleCodes: ['buyer'],
        verificationStatus: 'verified_gov',
        barangay: 'Bitalag',
        status: 'active',
        joinedDate: '2026-08-28',
        evidenceClass: 'PH_DRIVERS_LICENSE',
    },
    {
        id: 'usr-07',
        name: 'Danilo Agri Machining',
        initials: 'DA',
        phoneMasked: '+63 915 *** 8811',
        accessTier: 'L3',
        roleCodes: ['provider'],
        verificationStatus: 'verified_gov',
        barangay: 'Dacutan',
        status: 'active',
        joinedDate: '2026-08-05',
        evidenceClass: 'MAYOR_PERMIT_TAGUDIN',
    },
    {
        id: 'usr-08',
        name: 'Barangay Farola Coop',
        initials: 'BF',
        phoneMasked: '+63 916 *** 2233',
        accessTier: 'L2',
        roleCodes: ['buyer'],
        verificationStatus: 'verified_barangay',
        barangay: 'Farola',
        status: 'active',
        joinedDate: '2026-08-18',
        evidenceClass: 'BARANGAY_COOP_CHARTER',
    },
    {
        id: 'usr-09',
        name: 'Rico Aircon Services',
        initials: 'RA',
        phoneMasked: '+63 927 *** 4400',
        accessTier: 'L1',
        roleCodes: ['provider'],
        verificationStatus: 'pending_review',
        barangay: 'Ambalayat',
        status: 'active',
        joinedDate: '2026-09-10',
        evidenceClass: 'TESDA_NC2_HVAC',
    },
    {
        id: 'usr-10',
        name: 'Tessie Vulcanizing Shop',
        initials: 'TV',
        phoneMasked: '+63 928 *** 7712',
        accessTier: 'L0',
        roleCodes: ['provider'],
        verificationStatus: 'verified_barangay',
        agentDelegation: { agentName: 'Kuya Danny (Agent)', scope: 'invoicing, bids' },
        barangay: 'Baritao',
        status: 'active',
        joinedDate: '2026-08-30',
        evidenceClass: 'BARANGAY_RESIDENCY_AFFIDAVIT',
    },
    {
        id: 'usr-11',
        name: 'Mark Tagudin Courier',
        initials: 'MC',
        phoneMasked: '+63 930 *** 9901',
        accessTier: 'L2',
        roleCodes: ['provider'],
        verificationStatus: 'verified_gov',
        barangay: 'Poblacion',
        status: 'active',
        joinedDate: '2026-09-01',
        evidenceClass: 'LTO_MOTORCYCLE_REGISTRATION',
    },
    {
        id: 'usr-12',
        name: 'Clara Domestic Cleaners',
        initials: 'CC',
        phoneMasked: '+63 932 *** 3344',
        accessTier: 'L1',
        roleCodes: ['provider'],
        verificationStatus: 'pending_review',
        barangay: 'Purok West',
        status: 'active',
        joinedDate: '2026-09-12',
        evidenceClass: 'POLICE_CLEARANCE_LGU',
    },
];

export default function UsersIndex() {
    const [users] = React.useState<UserAccountRecord[]>(SAMPLE_USERS);
    const [statusTab, setStatusTab] = React.useState<string>('all');
    const [participationFilter, setParticipationFilter] = React.useState<string>('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(6);
    const [selectedUser, setSelectedUser] = React.useState<UserAccountRecord | null>(null);
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [bulkAction, setBulkAction] = React.useState<{
        type: 'verify_batch' | 'broadcast_notice' | 'export_census';
        title: string;
    } | null>(null);
    const [bulkReason, setBulkReason] = React.useState('');
    const [bulkExecuted, setBulkExecuted] = React.useState(false);

    // Filter logic
    const filteredUsers = React.useMemo(() => {
        return users.filter((u) => {
            // Tab filters
            if (statusTab === 'verified' && !u.verificationStatus.startsWith('verified'))
                return false;
            if (statusTab === 'pending' && u.verificationStatus !== 'pending_review') return false;
            if (statusTab === 'assisted' && !u.agentDelegation) return false;
            if (statusTab === 'restricted' && u.status !== 'suspended') return false;

            // Participation filter
            if (participationFilter === 'direct' && u.agentDelegation) return false;
            if (participationFilter === 'assisted' && !u.agentDelegation) return false;

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    u.name.toLowerCase().includes(q) ||
                    u.phoneMasked.toLowerCase().includes(q) ||
                    u.barangay.toLowerCase().includes(q) ||
                    u.id.toLowerCase().includes(q)
                );
            }

            return true;
        });
    }, [users, statusTab, participationFilter, searchQuery]);

    // Reset page when filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [statusTab, participationFilter, searchQuery, pageSize]);

    // Pagination calculation
    const totalItems = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const paginatedUsers = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredUsers.slice(start, start + pageSize);
    }, [filteredUsers, currentPage, pageSize]);

    const isAllPageSelected =
        paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedIds.includes(u.id));
    const isSomePageSelected =
        paginatedUsers.some((u) => selectedIds.includes(u.id)) && !isAllPageSelected;

    const getVerificationBadge = (status: string) => {
        switch (status) {
            case 'verified_gov':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1 border-emerald-500/30 text-[10px] text-emerald-500"
                    >
                        <ShieldCheck className="size-2.5" />
                        <span>L3: Gov ID / License</span>
                    </Badge>
                );
            case 'verified_barangay':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1 border-blue-500/30 text-[10px] text-blue-400"
                    >
                        <FileCheck2 className="size-2.5" />
                        <span>L2: Barangay Clear</span>
                    </Badge>
                );
            case 'pending_review':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1 border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-500"
                    >
                        <ShieldAlert className="size-2.5" />
                        <span>Pending Review</span>
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        L1: Phone OTP
                    </Badge>
                );
        }
    };

    return (
        <AdminLayout currentSection="capabilities" title="Accounts & Roles Registry">
            <Head title="Accounts & Roles — Serbizyu Admin" />

            <div className="flex flex-col gap-6">
                {/* Header Overview */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
                            Citizen Accounts &amp; Role Assignments
                        </h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            High-level directory of municipal residents, participation modes, and
                            community agent delegations across Tagudin.
                        </p>
                    </div>
                    <Badge variant="outline" className="w-fit font-mono text-xs">
                        {users.length} Registered Citizens
                    </Badge>
                </div>

                {/* 4 Graphic KPI Metric Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <AdminMetricCard
                        title="Citizen Accounts"
                        value={`${users.length} Active`}
                        statusBeacon="live"
                        accentColor="#10b981"
                        trendData={[110, 118, 125, 132, 138, 142]}
                        subtext="Tagudin municipal resident profiles"
                        badgeText="Citizens"
                    />

                    <AdminMetricCard
                        title="Participation Mode"
                        value="83% Direct"
                        statusBeacon="live"
                        accentColor="#38bdf8"
                        segments={[
                            { label: 'Direct', value: 10, colorClass: 'bg-emerald-500' },
                            { label: 'Assisted', value: 2, colorClass: 'bg-purple-500' },
                        ]}
                        subtext="Elderly & offline assisted via Bayanihan agents"
                    />

                    <AdminMetricCard
                        title="Active Agent Grants"
                        value="2 Assisted"
                        statusBeacon="live"
                        accentColor="#a855f7"
                        donutPct={85}
                        subtext="Elder owners assisted via consent_grants"
                    />

                    <AdminMetricCard
                        title="Pending ID Verification"
                        value="3 Tasks"
                        statusBeacon="warning"
                        accentColor="#f59e0b"
                        subtext="Clearances awaiting operator approval"
                    />
                </div>

                {/* Scalable Filter & Search Toolbar */}
                <Card className="border-border bg-card shadow-xs">
                    <CardHeader className="flex flex-col gap-3 border-b border-border p-4 pb-3">
                        {/* Top Toolbar: Status Tabs + Participation Filter */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            {/* Quick Status Tabs */}
                            <div className="inline-flex max-w-full items-center overflow-x-auto rounded-lg border border-border bg-muted/30 p-1 text-xs font-medium">
                                {[
                                    { id: 'all', label: `All Accounts (${users.length})` },
                                    { id: 'verified', label: `Verified (9)` },
                                    { id: 'pending', label: `Pending Review (3)` },
                                    { id: 'assisted', label: `Assisted by Agent (2)` },
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

                            {/* Participation Mode Filter Select */}
                            <div className="flex shrink-0 items-center gap-2">
                                <Select
                                    value={participationFilter}
                                    onValueChange={setParticipationFilter}
                                >
                                    <SelectTrigger className="h-8 w-48 border-border bg-muted/20 text-xs text-foreground">
                                        <SelectValue placeholder="Participation Mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">
                                            All Modes (Direct + Assisted)
                                        </SelectItem>
                                        <SelectItem value="direct" className="text-xs">
                                            Direct Citizens Only
                                        </SelectItem>
                                        <SelectItem value="assisted" className="text-xs">
                                            Agent-Assisted Only
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
                                placeholder="Search citizens..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 w-full border-border bg-muted/20 pl-9 font-mono text-xs text-foreground"
                            />
                        </div>
                    </CardHeader>

                    {/* Clean Scan-First Table with Bulk Selection */}
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
                                                            ...paginatedUsers.map((u) => u.id),
                                                        ]),
                                                    );
                                                    setSelectedIds(newIds);
                                                } else {
                                                    const pageIds = new Set(
                                                        paginatedUsers.map((u) => u.id),
                                                    );
                                                    setSelectedIds(
                                                        selectedIds.filter(
                                                            (id) => !pageIds.has(id),
                                                        ),
                                                    );
                                                }
                                            }}
                                            aria-label="Select all accounts on this page"
                                        />
                                    </TableHead>
                                    <TableHead className="w-52">Citizen / Account</TableHead>
                                    <TableHead className="w-44">Mobile &amp; Barangay</TableHead>
                                    <TableHead className="w-44">Participation Mode</TableHead>
                                    <TableHead className="w-36">Roles</TableHead>
                                    <TableHead className="w-40">Trust Verification</TableHead>
                                    <TableHead className="w-24 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="h-32 text-center text-xs text-muted-foreground"
                                        >
                                            No accounts match your filter criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedUsers.map((item) => {
                                        const isSelected = selectedIds.includes(item.id);
                                        return (
                                            <TableRow
                                                key={item.id}
                                                className={`group cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-primary/5 hover:bg-primary/10'
                                                        : 'hover:bg-muted/40'
                                                }`}
                                                onClick={() => setSelectedUser(item)}
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
                                                        aria-label={`Select citizen ${item.name}`}
                                                    />
                                                </TableCell>

                                                {/* 1. Citizen & ID */}
                                                <TableCell>
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar className="size-7 shrink-0 rounded-md">
                                                            <AvatarFallback className="bg-primary/20 text-[10px] font-bold text-primary">
                                                                {item.initials}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex min-w-0 flex-col">
                                                            <span className="truncate text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                                                                {item.name}
                                                            </span>
                                                            <span className="font-mono text-[10.5px] text-muted-foreground">
                                                                {item.id}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* 2. Mobile & Barangay */}
                                                <TableCell>
                                                    <div className="flex flex-col text-xs leading-snug">
                                                        <span className="font-mono text-muted-foreground">
                                                            {item.phoneMasked}
                                                        </span>
                                                        <span className="text-[11px] text-foreground/80">
                                                            {item.barangay}, Tagudin
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* 3. Participation Mode */}
                                                <TableCell>
                                                    {item.agentDelegation ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="max-w-[170px] gap-1 truncate border-purple-500/40 bg-purple-500/5 text-[10px] text-purple-400"
                                                        >
                                                            <Users className="size-2.5 shrink-0" />
                                                            <span className="truncate">
                                                                Assisted:{' '}
                                                                {
                                                                    item.agentDelegation.agentName.split(
                                                                        ' ',
                                                                    )[0]
                                                                }
                                                            </span>
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-border text-[10px] text-muted-foreground"
                                                        >
                                                            Direct Citizen
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                {/* 4. Roles */}
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.roleCodes.map((r) => (
                                                            <Badge
                                                                key={r}
                                                                variant="outline"
                                                                className="px-1.5 py-0 text-[9px] capitalize"
                                                            >
                                                                {r}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>

                                                {/* 5. Verification Status */}
                                                <TableCell>
                                                    {getVerificationBadge(item.verificationStatus)}
                                                </TableCell>

                                                {/* 6. Action: Peek Drawer */}
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 cursor-pointer gap-1 px-2 text-xs text-muted-foreground group-hover:text-foreground"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedUser(item);
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
                                accounts
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
             FLOATING DOCKED BULK ACTION BAR (When >= 1 citizen is selected)
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
                                Citizens
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
                                        type: 'verify_batch',
                                        title: 'Queue for Barangay Clearance Check',
                                    });
                                    setBulkReason('');
                                    setBulkExecuted(false);
                                }}
                            >
                                <ShieldCheck className="size-3.5 text-emerald-500" />
                                <span>Check Clearance</span>
                            </Button>

                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 cursor-pointer gap-1.5 border-border text-xs hover:bg-muted/50"
                                onClick={() => {
                                    setBulkAction({
                                        type: 'broadcast_notice',
                                        title: 'Send SMS Advisory Notice to Citizens',
                                    });
                                    setBulkReason('');
                                    setBulkExecuted(false);
                                }}
                            >
                                <Send className="size-3.5 text-blue-400" />
                                <span>Send SMS</span>
                            </Button>

                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 cursor-pointer gap-1.5 border-border text-xs hover:bg-muted/50"
                                onClick={() => {
                                    setBulkAction({
                                        type: 'export_census',
                                        title: 'Export Tagudin Citizen Registry Records',
                                    });
                                    setBulkReason('');
                                    setBulkExecuted(false);
                                }}
                            >
                                <FileDown className="size-3.5 text-primary" />
                                <span>Export Records</span>
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
             GUARDED BATCH CONFIRMATION DIALOG (PRD-053 Attributable Command)
             =================================================================== */}
                <Dialog
                    open={bulkAction !== null}
                    onOpenChange={(open) => !open && setBulkAction(null)}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base font-bold">
                                <Users className="size-4 text-primary" />
                                <span>{bulkAction?.title}</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Scope preview:{' '}
                                <strong>{selectedIds.length} citizens selected</strong> in Tagudin
                                municipal operations.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-3 py-2 text-xs">
                            <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 p-3">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                    Selected Citizens
                                </span>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {users
                                        .filter((u) => selectedIds.includes(u.id))
                                        .map((u) => (
                                            <Badge
                                                key={u.id}
                                                variant="outline"
                                                className="font-mono text-[10px]"
                                            >
                                                {u.name} ({u.id})
                                            </Badge>
                                        ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Mandatory Operator Justification
                                </label>
                                <Input
                                    value={bulkReason}
                                    onChange={(e) => setBulkReason(e.target.value)}
                                    placeholder="e.g. Municipal trade verification batch for Poblacion..."
                                    className="h-8 border-border bg-muted/20 text-xs text-foreground"
                                />
                                <span className="text-[10px] text-muted-foreground">
                                    Appended to audit_events with operator attribution under
                                    PRD-053.
                                </span>
                            </div>

                            {bulkExecuted && (
                                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-500">
                                    <Check className="size-4 shrink-0" />
                                    <span>
                                        Batch citizen command recorded successfully in simulation
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
                    open={!!selectedUser}
                    onOpenChange={(open) => !open && setSelectedUser(null)}
                >
                    <SheetContent
                        side="right"
                        className="flex h-full flex-col overflow-hidden p-0 sm:max-w-lg"
                    >
                        <SheetHeader>
                            <div className="flex items-center justify-between pr-6">
                                <div className="flex items-center gap-2">
                                    <UserCheck className="size-4 text-primary" />
                                    <SheetTitle>Citizen Dossier Peek</SheetTitle>
                                </div>
                                <Badge variant="outline" className="font-mono text-[10px]">
                                    {selectedUser?.id}
                                </Badge>
                            </div>
                            <SheetDescription>
                                Quick operational preview of resident profile, access credentials,
                                and delegation status.
                            </SheetDescription>
                        </SheetHeader>

                        {selectedUser && (
                            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
                                {/* Profile Identity Card */}
                                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
                                    <Avatar className="size-12 shrink-0 rounded-lg">
                                        <AvatarFallback className="bg-primary/20 text-base font-bold text-primary">
                                            {selectedUser.initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex min-w-0 flex-1 flex-col">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-foreground">
                                                {selectedUser.name}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="border-emerald-500/30 text-[9px] text-emerald-500"
                                            >
                                                {selectedUser.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {selectedUser.phoneMasked}
                                        </span>
                                        <span className="mt-0.5 text-[11px] text-muted-foreground">
                                            {selectedUser.barangay}, Tagudin, Ilocos Sur
                                        </span>
                                    </div>
                                </div>

                                {/* Primary Attributes Grid: Participation & Trust */}
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Participation Mode
                                        </span>
                                        <div>
                                            {selectedUser.agentDelegation ? (
                                                <Badge
                                                    variant="outline"
                                                    className="gap-1 border-purple-500/40 bg-purple-500/5 text-[10px] text-purple-400"
                                                >
                                                    <Users className="size-2.5" />
                                                    <span>Agent-Assisted</span>
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] text-muted-foreground"
                                                >
                                                    Direct Citizen
                                                </Badge>
                                            )}
                                        </div>
                                        <span className="text-[10.5px] leading-snug text-muted-foreground">
                                            {selectedUser.agentDelegation
                                                ? `Assisted by ${selectedUser.agentDelegation.agentName}`
                                                : 'Direct self-managed commercial actions'}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Trust Level Gate
                                        </span>
                                        <div>
                                            {getVerificationBadge(selectedUser.verificationStatus)}
                                        </div>
                                        <span className="truncate font-mono text-[10.5px] text-muted-foreground">
                                            {selectedUser.evidenceClass ?? 'No Evidence File'}
                                        </span>
                                    </div>
                                </div>

                                {/* Device & Channel Modality (Secondary Preference) */}
                                <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/10 p-3 text-xs">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                        Channel Modality Preference
                                    </span>
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-foreground">
                                            {selectedUser.accessTier === 'L0'
                                                ? 'SMS Keypad / Feature Phone (GSM Gateway)'
                                                : selectedUser.accessTier === 'L1'
                                                  ? 'Barangay Kiosk / Terminal Assisted'
                                                  : selectedUser.accessTier === 'L2'
                                                    ? 'Low-Data Mode (IndexedDB Offline Cache)'
                                                    : 'Full Smartphone Web Application'}
                                        </span>
                                        <Badge variant="outline" className="font-mono text-[9px]">
                                            {selectedUser.accessTier} Mode
                                        </Badge>
                                    </div>
                                    <span className="text-[10.5px] text-muted-foreground">
                                        Notification and PWA payload adaptation hint under ADR-016.
                                    </span>
                                </div>

                                {/* Active Roles & Authorizations */}
                                <div className="flex flex-col gap-2 text-xs">
                                    <span className="text-xs font-semibold text-foreground">
                                        Active Market Roles
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedUser.roleCodes.map((r) => (
                                            <div
                                                key={r}
                                                className="flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2.5 py-1 text-xs capitalize"
                                            >
                                                <span className="size-1.5 rounded-full bg-primary" />
                                                <span>{r}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Community Agent Delegation (acting-for consent grant) */}
                                <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3.5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 font-semibold text-foreground">
                                            <Users className="size-3.5 text-purple-400" />
                                            <span>Community Agent Delegation</span>
                                        </span>
                                        <Badge variant="outline" className="text-[9px]">
                                            {selectedUser.agentDelegation
                                                ? 'Delegated'
                                                : 'Direct Owner'}
                                        </Badge>
                                    </div>
                                    {selectedUser.agentDelegation ? (
                                        <div className="flex flex-col gap-1 text-muted-foreground">
                                            <div>
                                                Designated Agent:{' '}
                                                <strong className="text-foreground">
                                                    {selectedUser.agentDelegation.agentName}
                                                </strong>
                                            </div>
                                            <div>
                                                Authorized Scope:{' '}
                                                <code className="font-mono text-[11px] text-foreground">
                                                    {selectedUser.agentDelegation.scope}
                                                </code>
                                            </div>
                                            <span className="mt-1 text-[10px] text-purple-400">
                                                Locked via legal consent_grant contract under
                                                PRD-007.
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            This citizen manages their own account and bids directly
                                            without an acting-for agent.
                                        </span>
                                    )}
                                </div>

                                {/* Registration Timestamp */}
                                <div className="flex justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                                    <span>Registered in Tagudin:</span>
                                    <span className="font-mono text-foreground">
                                        {selectedUser.joinedDate}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Sheet Footer with Deep-Link to Dedicated Detail/Identity Review */}
                        <SheetFooter>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setSelectedUser(null)}
                            >
                                Close Peek
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className="h-8 gap-1.5 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                onClick={() => {
                                    if (selectedUser) {
                                        router.visit(
                                            `/admin/identity-review?user=${selectedUser.id}`,
                                        );
                                    }
                                }}
                            >
                                <span>Open Full Identity Review</span>
                                <ArrowUpRight className="size-3.5" />
                            </Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>
        </AdminLayout>
    );
}
