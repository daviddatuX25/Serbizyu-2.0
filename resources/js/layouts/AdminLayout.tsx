import { Link, router, usePage } from '@inertiajs/react';
import * as React from 'react';
import {
    Activity,
    AlertCircle,
    ArrowRight,
    Bell,
    ChevronDown,
    FileSearch,
    FileText,
    FolderTree,
    Moon,
    Network,
    Radio,
    Receipt,
    Scale,
    Search,
    Shield,
    Sun,
    Tag,
    UserCheck,
    Users,
    Wrench,
    X,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from '@/components/ui/sidebar';

export interface BreadcrumbSegment {
    label: string;
    href?: string;
}

interface AdminLayoutProps {
    children: React.ReactNode;
    currentSection?:
        'triage' | 'inspector' | 'holds' | 'outbox' | 'capabilities' | 'audit' | 'disputes';
    title?: string;
    breadcrumbs?: BreadcrumbSegment[];
    cohort?: 'genuine' | 'sandbox' | 'training';
    onCohortChange?: (cohort: 'genuine' | 'sandbox' | 'training') => void;
    onSectionChange?: (section: string) => void;
}

export function AdminLayout({
    children,
    currentSection: _currentSection,
    title = 'Triage Queue',
    breadcrumbs,
    cohort = 'genuine',
    onCohortChange,
    onSectionChange: _onSectionChange,
}: AdminLayoutProps) {
    const { url } = usePage();
    const [activeCohort, setActiveCohort] = React.useState<'genuine' | 'sandbox' | 'training'>(
        cohort,
    );
    const [isCommandOpen, setIsCommandOpen] = React.useState(false);
    const [commandQuery, setCommandQuery] = React.useState('');
    const [theme, setTheme] = React.useState<'dark' | 'light'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('serbizyu_admin_theme');
            if (saved === 'light' || saved === 'dark') return saved;
        }
        return 'dark';
    });

    // Keyboard shortcut listener (Cmd+K or Ctrl+K)
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (
                (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
                (e.key === '/' &&
                    !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))
            ) {
                e.preventDefault();
                setIsCommandOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const isActive = (path: string) => {
        if (path === '/admin/triage') {
            return (
                url === '/admin/triage' ||
                url === '/admin' ||
                url.startsWith('/admin?section=triage')
            );
        }
        if (path === '/admin/inspect') {
            return (
                url.startsWith('/admin/inspect') ||
                url.startsWith('/admin/inspector') ||
                url.includes('section=inspector')
            );
        }
        return url.startsWith(path);
    };

    const handleCohortClick = (newCohort: 'genuine' | 'sandbox' | 'training') => {
        setActiveCohort(newCohort);
        onCohortChange?.(newCohort);
    };

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        if (typeof window !== 'undefined') {
            localStorage.setItem('serbizyu_admin_theme', next);
        }
    };

    const resolvedBreadcrumbs: BreadcrumbSegment[] = React.useMemo(() => {
        if (breadcrumbs && breadcrumbs.length > 0) {
            return breadcrumbs;
        }

        const segments: BreadcrumbSegment[] = [{ label: 'Operations', href: '/admin/triage' }];

        if (title?.includes('Diagnostic') || title?.includes('Inspector')) {
            segments.push({ label: 'Orders & Work', href: '/admin/orders' });
            const refMatch = title.match(/ORD-[\w-]+/);
            segments.push({ label: refMatch ? `#${refMatch[0]}` : 'Order Inspection' });
        } else if (title?.includes('Orders')) {
            segments.push({ label: 'Orders & Work', href: '/admin/orders' });
        } else if (title?.includes('Listings')) {
            segments.push({ label: 'Provider Listings', href: '/admin/listings' });
        } else if (title?.includes('Tenders') || title?.includes('Requests')) {
            segments.push({ label: 'Requests & Quotes', href: '/admin/tenders' });
        } else if (
            title?.includes('Accounts') ||
            title?.includes('Citizens') ||
            title?.includes('Roles')
        ) {
            segments.push({ label: 'Accounts & Roles', href: '/admin/users' });
        } else if (title?.includes('Work Catalog') || title?.includes('Work Templates')) {
            segments.push({ label: 'Blueprint Governance', href: '/admin/catalogs/work' });
            segments.push({ label: 'Work Templates' });
        } else if (title?.includes('Deal Chain')) {
            segments.push({ label: 'Blueprint Governance', href: '/admin/catalogs/deal-chains' });
            segments.push({ label: 'Deal Chains' });
        } else if (title?.includes('Categories') || title?.includes('Taxonomy')) {
            segments.push({ label: 'Blueprint Governance', href: '/admin/catalogs/taxonomy' });
            segments.push({ label: 'Categories & Rules' });
        } else if (title?.includes('Financials') || title?.includes('Payments')) {
            segments.push({ label: 'Marketplace', href: '/admin/financials' });
            segments.push({ label: 'Payments & Ledgers' });
        } else if (title?.includes('Dispute')) {
            segments.push({ label: 'Operations', href: '/admin/disputes' });
            segments.push({ label: 'Disputes & Holds' });
        } else if (title?.includes('Telemetry') || title?.includes('Health')) {
            segments.push({ label: 'Operations', href: '/admin/system-health' });
            segments.push({ label: 'System Health' });
        }

        return segments;
    }, [breadcrumbs, title]);

    React.useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
            document.body.classList.add('dark');
            document.body.classList.remove('light');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
            document.body.classList.remove('dark');
            document.body.classList.add('light');
        }
        return () => {
            document.documentElement.classList.remove('dark', 'light');
            document.body.classList.remove('dark', 'light');
        };
    }, [theme]);

    return (
        <div
            className={`${theme} admin-shell flex min-h-screen w-full bg-background text-foreground`}
        >
            <SidebarProvider defaultOpen={true}>
                <Sidebar collapsible="icon" className="border-r border-border">
                    {/* Sidebar Header */}
                    <SidebarHeader className="border-b border-border p-3">
                        <div className="flex items-center gap-2.5 px-1 py-1">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
                                <Shield className="size-4" />
                            </div>
                            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                                <span className="font-heading text-sm font-bold text-foreground">
                                    Serbizyu Ops
                                </span>
                                <span className="text-[10px] font-medium text-muted-foreground">
                                    Executive Console
                                </span>
                            </div>
                        </div>
                    </SidebarHeader>

                    {/* Sidebar Content */}
                    <SidebarContent className="px-1.5 py-2">
                        {/* 1. OPERATIONS (Daily Action & Remediation) */}
                        <SidebarGroup>
                            <SidebarGroupLabel className="text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                                Operations
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive('/admin/triage')}
                                            tooltip="Triage Queue"
                                        >
                                            <Link href="/admin/triage">
                                                <AlertCircle className="size-4 text-amber-500" />
                                                <span>Triage Queue</span>
                                            </Link>
                                        </SidebarMenuButton>
                                        <SidebarMenuBadge className="bg-amber-500/15 font-mono text-[10px] text-amber-600 dark:text-amber-400">
                                            4
                                        </SidebarMenuBadge>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive('/admin/inspect')}
                                            tooltip="Universal Inspector"
                                        >
                                            <Link href="/admin/inspect">
                                                <FileSearch className="size-4 text-primary" />
                                                <span>Universal Inspector</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive('/admin/identity-review')}
                                            tooltip="Identity Review"
                                        >
                                            <Link href="/admin/identity-review">
                                                <UserCheck className="size-4 text-blue-400" />
                                                <span>Identity Review</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive('/admin/disputes')}
                                            tooltip="Disputes &amp; Holds"
                                        >
                                            <Link href="/admin/disputes">
                                                <Scale className="size-4 text-rose-400" />
                                                <span>Disputes &amp; Holds</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={
                                                isActive('/admin/system-health') ||
                                                isActive('/admin/telemetry')
                                            }
                                            tooltip="System Health"
                                        >
                                            <Link href="/admin/system-health">
                                                <Activity className="size-4 text-emerald-400" />
                                                <span>System Health</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        {/* 2. MARKETPLACE (Oversight Registries) */}
                        <SidebarGroup>
                            <SidebarGroupLabel className="text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                                Marketplace
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive('/admin/orders')}
                                            tooltip="Orders & Work Registry"
                                        >
                                            <Link href="/admin/orders">
                                                <FileText className="size-4" />
                                                <span>Orders &amp; Work</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive('/admin/listings')}
                                            tooltip="Provider Listings Inventory"
                                        >
                                            <Link href="/admin/listings">
                                                <Tag className="size-4" />
                                                <span>Provider Listings</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={
                                                isActive('/admin/tenders') ||
                                                isActive('/admin/requests')
                                            }
                                            tooltip="Requests &amp; Quotes"
                                        >
                                            <Link href="/admin/tenders">
                                                <Radio className="size-4" />
                                                <span>Requests &amp; Quotes</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive('/admin/users')}
                                            tooltip="Accounts & Role Assignments"
                                        >
                                            <Link href="/admin/users">
                                                <Users className="size-4" />
                                                <span>Accounts &amp; Roles</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive('/admin/financials')}
                                            tooltip="Payment Obligations & Ledger Reconciliation"
                                        >
                                            <Link href="/admin/financials">
                                                <Receipt className="size-4" />
                                                <span>Payments &amp; Ledgers</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        {/* 3. BLUEPRINT GOVERNANCE (Authoring) */}
                        <SidebarGroup>
                            <SidebarGroupLabel className="text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                                Blueprint Governance
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive('/admin/catalogs/work')}
                                            tooltip="Work Templates"
                                        >
                                            <Link href="/admin/catalogs/work">
                                                <Wrench className="size-4" />
                                                <span>Work Templates</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive('/admin/catalogs/deal-chains')}
                                            tooltip="Deal Chains"
                                        >
                                            <Link href="/admin/catalogs/deal-chains">
                                                <Network className="size-4" />
                                                <span>Deal Chains</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive('/admin/catalogs/taxonomy')}
                                            tooltip="Categories &amp; Rules"
                                        >
                                            <Link href="/admin/catalogs/taxonomy">
                                                <FolderTree className="size-4" />
                                                <span>Categories &amp; Rules</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>

                    {/* Sidebar Footer: Clean Platform & Station Version (No duplicate user profile!) */}
                    <SidebarFooter className="border-t border-border p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                            <span className="font-mono text-[10.5px]">Serbizyu 2.0</span>
                            <span className="text-[10px]">Tagudin Pilot</span>
                        </div>
                    </SidebarFooter>

                    <SidebarRail />
                </Sidebar>

                {/* Main Operating Surface */}
                <SidebarInset>
                    {/* Top Cockpit Header */}
                    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-xs">
                        {/* Left: Sidebar Toggle & Breadcrumbs */}
                        <div className="flex min-w-0 items-center gap-2">
                            <SidebarTrigger />
                            <Separator orientation="vertical" className="mr-1 h-4" />
                            <Breadcrumb className="hidden truncate sm:block">
                                <BreadcrumbList>
                                    {resolvedBreadcrumbs.map((crumb, idx) => {
                                        const isLast = idx === resolvedBreadcrumbs.length - 1;
                                        return (
                                            <React.Fragment key={idx}>
                                                <BreadcrumbItem
                                                    className={
                                                        idx === 0
                                                            ? 'hidden sm:inline-flex'
                                                            : 'inline-flex'
                                                    }
                                                >
                                                    {crumb.href && !isLast ? (
                                                        <BreadcrumbLink
                                                            href={crumb.href}
                                                            className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                                                        >
                                                            {crumb.label}
                                                        </BreadcrumbLink>
                                                    ) : (
                                                        <BreadcrumbPage className="font-semibold text-foreground">
                                                            {crumb.label}
                                                        </BreadcrumbPage>
                                                    )}
                                                </BreadcrumbItem>
                                                {!isLast && (
                                                    <BreadcrumbSeparator
                                                        className={
                                                            idx === 0
                                                                ? 'hidden sm:inline-flex'
                                                                : 'inline-flex'
                                                        }
                                                    />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>

                        {/* Center: Guided Quick-Find Command Trigger (⌘K) */}
                        <button
                            type="button"
                            onClick={() => setIsCommandOpen(true)}
                            className="relative hidden w-64 cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground shadow-2xs transition-all hover:bg-muted/40 md:flex lg:w-96"
                        >
                            <Search className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">Quick find orders, citizens, tools...</span>
                            <kbd className="pointer-events-none ml-auto inline-flex h-5 items-center gap-1 rounded border border-border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </button>

                        {/* Right: Operational Cockpit Controls */}
                        <div className="flex shrink-0 items-center gap-2.5">
                            {/* Station Telemetry Pulse */}
                            <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-1 text-xs xl:flex">
                                <span className="relative flex size-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                                </span>
                                <span className="text-[11px] font-medium text-foreground">
                                    🟢 Tagudin Central
                                </span>
                            </div>

                            {/* Operational Attention Alert Bell (🔔 4) */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="relative size-8 cursor-pointer border-border text-muted-foreground hover:text-foreground"
                                        aria-label="Open attention queue"
                                    >
                                        <Bell className="size-3.5" />
                                        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow-xs">
                                            4
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-80 border-border bg-card p-2 shadow-xl"
                                >
                                    <div className="mb-2 flex items-center justify-between border-b border-border px-1 pb-2">
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                            <AlertCircle className="size-3.5 text-amber-500" />
                                            <span>Operational Attention (4)</span>
                                        </span>
                                        <Badge variant="outline" className="text-[9px]">
                                            Priority
                                        </Badge>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <DropdownMenuItem
                                            className="flex cursor-pointer flex-col items-start gap-1 rounded-md p-2 hover:bg-muted/50"
                                            onClick={() =>
                                                router.visit('/admin/inspect?ref=ORD-2026-09')
                                            }
                                        >
                                            <div className="flex w-full items-center justify-between">
                                                <span className="font-mono text-xs font-bold text-foreground">
                                                    ORD-2026-09
                                                </span>
                                                <span className="text-[10px] font-medium text-amber-500">
                                                    Cash Mismatch
                                                </span>
                                            </div>
                                            <p className="text-[11px] leading-snug text-muted-foreground">
                                                Arman Electric flagged unreceived ₱90 payment at
                                                site.
                                            </p>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            className="flex cursor-pointer flex-col items-start gap-1 rounded-md p-2 hover:bg-muted/50"
                                            onClick={() => router.visit('/admin/users')}
                                        >
                                            <div className="flex w-full items-center justify-between">
                                                <span className="font-mono text-xs font-bold text-foreground">
                                                    USR-05 Juan Carpentry
                                                </span>
                                                <span className="text-[10px] font-medium text-blue-400">
                                                    Pending Review
                                                </span>
                                            </div>
                                            <p className="text-[11px] leading-snug text-muted-foreground">
                                                DTI Registration submitted for trade verification.
                                            </p>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            className="flex cursor-pointer flex-col items-start gap-1 rounded-md p-2 hover:bg-muted/50"
                                            onClick={() => router.visit('/admin/disputes')}
                                        >
                                            <div className="flex w-full items-center justify-between">
                                                <span className="font-mono text-xs font-bold text-foreground">
                                                    ORD-2026-04
                                                </span>
                                                <span className="text-[10px] font-medium text-rose-400">
                                                    Dispute Open
                                                </span>
                                            </div>
                                            <p className="text-[11px] leading-snug text-muted-foreground">
                                                Bibingka party box delivery handoff dispute filed.
                                            </p>
                                        </DropdownMenuItem>
                                    </div>

                                    <div className="mt-2 border-t border-border pt-2">
                                        <Link href="/admin/triage" className="block">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-full justify-center text-xs text-primary hover:text-primary/90"
                                            >
                                                <span>View Full Triage Queue</span>
                                                <ArrowRight className="ml-1 size-3" />
                                            </Button>
                                        </Link>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Operator Duty Session & Preferences Menu (Single Responsive Source!) */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card/60 px-2 py-1 text-xs transition-colors hover:bg-card">
                                        <Avatar className="size-6 shrink-0 rounded-md">
                                            <AvatarFallback className="bg-primary/20 text-[10px] font-bold text-primary">
                                                OP
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex hidden flex-col text-left leading-none lg:flex">
                                            <span className="text-xs font-semibold text-foreground">
                                                Officer Santos
                                            </span>
                                            <span className="text-[9.5px] text-muted-foreground">
                                                Desk Supervisor
                                            </span>
                                        </div>
                                        <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-56 border-border bg-card p-1.5 shadow-xl"
                                >
                                    <DropdownMenuLabel className="px-2 py-1 text-xs font-semibold">
                                        Operator Duty Session
                                    </DropdownMenuLabel>
                                    <div className="mb-1 border-b border-border px-2 py-1 text-[11px] text-muted-foreground">
                                        Station: Tagudin Central Desk (Shift A)
                                    </div>

                                    <DropdownMenuItem
                                        onClick={toggleTheme}
                                        className="flex cursor-pointer items-center justify-between text-xs"
                                    >
                                        <span>Display Mode</span>
                                        <span className="flex items-center gap-1 text-muted-foreground capitalize">
                                            {theme === 'dark' ? (
                                                <Moon className="size-3" />
                                            ) : (
                                                <Sun className="size-3" />
                                            )}
                                            {theme}
                                        </span>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="my-1 border-border" />

                                    {/* Dataset Simulation Mode (Moved inside here!) */}
                                    <DropdownMenuLabel className="px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                                        Dataset Simulation Mode
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => handleCohortClick('genuine')}
                                        className={`flex cursor-pointer items-center justify-between text-xs ${activeCohort === 'genuine' ? 'font-bold text-primary' : ''}`}
                                    >
                                        <span>Tagudin Genuine</span>
                                        {activeCohort === 'genuine' && (
                                            <span className="text-[10px] text-emerald-500">
                                                ✓ Active
                                            </span>
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => handleCohortClick('sandbox')}
                                        className={`flex cursor-pointer items-center justify-between text-xs ${activeCohort === 'sandbox' ? 'font-bold text-primary' : ''}`}
                                    >
                                        <span>Sandbox Test</span>
                                        {activeCohort === 'sandbox' && (
                                            <span className="text-[10px] text-emerald-500">
                                                ✓ Active
                                            </span>
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => handleCohortClick('training')}
                                        className={`flex cursor-pointer items-center justify-between text-xs ${activeCohort === 'training' ? 'font-bold text-primary' : ''}`}
                                    >
                                        <span>Training Simulator</span>
                                        {activeCohort === 'training' && (
                                            <span className="text-[10px] text-emerald-500">
                                                ✓ Active
                                            </span>
                                        )}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>

                    {/* Operating Content Viewport */}
                    <div className="flex-1 p-6 md:p-8">
                        <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
                    </div>
                </SidebarInset>
            </SidebarProvider>

            {/* ===================================================================
           GUIDED COMMAND PALETTE DIALOG (⌘K / Quick Find)
           =================================================================== */}
            <Dialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
                <DialogContent className="gap-0 overflow-hidden border-border bg-card p-0 shadow-2xl sm:max-w-xl [&>button:last-child]:hidden">
                    {/* Search Input Bar (Flexbox vertically centered!) */}
                    <div className="flex items-center gap-2.5 border-b border-border bg-muted/20 px-4 py-3">
                        <Search className="size-4 shrink-0 text-muted-foreground" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search orders, citizens, or jump to tool..."
                            value={commandQuery}
                            onChange={(e) => setCommandQuery(e.target.value)}
                            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && commandQuery.trim()) {
                                    setIsCommandOpen(false);
                                    router.visit(
                                        `/admin/inspect?ref=${encodeURIComponent(commandQuery.trim())}`,
                                    );
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setIsCommandOpen(false)}
                            className="flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                            aria-label="Close search"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                    {/* Grouped Search Results */}
                    <div className="flex max-h-[380px] flex-col gap-3 overflow-y-auto p-3 text-xs">
                        {/* Quick Record Jump (if typed) */}
                        {commandQuery.trim() && (
                            <div
                                className="flex cursor-pointer items-center justify-between rounded-lg border border-primary/40 bg-primary/5 p-2.5 transition-colors hover:bg-primary/10"
                                onClick={() => {
                                    setIsCommandOpen(false);
                                    router.visit(
                                        `/admin/inspect?ref=${encodeURIComponent(commandQuery.trim())}`,
                                    );
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <FileSearch className="size-4 text-primary" />
                                    <div>
                                        <span className="font-semibold text-foreground">
                                            Inspect Record "{commandQuery.trim()}"
                                        </span>
                                        <p className="text-[11px] text-muted-foreground">
                                            Open directly in Universal Multi-Aggregate Inspector
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="size-3.5 text-primary" />
                            </div>
                        )}

                        {/* 1. Active Orders & Incidents */}
                        <div className="flex flex-col gap-1">
                            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                Orders
                            </span>
                            {[
                                {
                                    ref: 'ORD-2026-09',
                                    title: 'Ceiling Fan Run Capacitor Replacement',
                                    sub: '₱90.00 · Cash Mismatch Flagged',
                                    href: '/admin/inspect?ref=ORD-2026-09',
                                },
                                {
                                    ref: 'ORD-2026-04',
                                    title: 'Weekend Special Bibingka Tray',
                                    sub: '₱120.00 · Handoff Dispute Open',
                                    href: '/admin/inspect?ref=ORD-2026-04',
                                },
                                {
                                    ref: 'ORD-2026-08',
                                    title: 'On-Site Plumbing Jetmatic Inspection',
                                    sub: '₱45.00 · Slot Confirmed',
                                    href: '/admin/inspect?ref=ORD-2026-08',
                                },
                            ]
                                .filter(
                                    (item) =>
                                        !commandQuery.trim() ||
                                        item.ref
                                            .toLowerCase()
                                            .includes(commandQuery.toLowerCase()) ||
                                        item.title
                                            .toLowerCase()
                                            .includes(commandQuery.toLowerCase()),
                                )
                                .map((item) => (
                                    <div
                                        key={item.ref}
                                        className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/40"
                                        onClick={() => {
                                            setIsCommandOpen(false);
                                            router.visit(item.href);
                                        }}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <FileText className="size-3.5 text-primary" />
                                            <div className="flex flex-col">
                                                <span className="font-mono font-semibold text-foreground">
                                                    {item.ref} ·{' '}
                                                    <span className="font-sans font-normal">
                                                        {item.title}
                                                    </span>
                                                </span>
                                                <span className="text-[10.5px] text-muted-foreground">
                                                    {item.sub}
                                                </span>
                                            </div>
                                        </div>
                                        <ArrowRight className="size-3 text-muted-foreground" />
                                    </div>
                                ))}
                        </div>

                        {/* 2. Registered Citizens & Roles */}
                        <div className="flex flex-col gap-1 border-t border-border pt-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                People
                            </span>
                            {[
                                {
                                    name: 'Maria Santos',
                                    role: 'Citizen Buyer',
                                    loc: 'Poblacion',
                                    id: 'usr-01',
                                },
                                {
                                    name: 'Arman Electric',
                                    role: 'Trade Provider',
                                    loc: 'Poblacion',
                                    id: 'usr-02',
                                },
                                {
                                    name: 'Lola Nena Dela Cruz',
                                    role: 'Assisted Provider (via Danny)',
                                    loc: 'Farola',
                                    id: 'usr-03',
                                },
                                {
                                    name: 'Kuya Danny Bataller',
                                    role: 'Community Agent',
                                    loc: 'Farola',
                                    id: 'usr-04',
                                },
                            ]
                                .filter(
                                    (c) =>
                                        !commandQuery.trim() ||
                                        c.name.toLowerCase().includes(commandQuery.toLowerCase()) ||
                                        c.loc.toLowerCase().includes(commandQuery.toLowerCase()),
                                )
                                .map((c) => (
                                    <div
                                        key={c.id}
                                        className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/40"
                                        onClick={() => {
                                            setIsCommandOpen(false);
                                            router.visit(`/admin/users`);
                                        }}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <UserCheck className="size-3.5 text-blue-400" />
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">
                                                    {c.name}
                                                </span>
                                                <span className="text-[10.5px] text-muted-foreground">
                                                    {c.role} · {c.loc}, Tagudin
                                                </span>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="font-mono text-[9px]">
                                            {c.id}
                                        </Badge>
                                    </div>
                                ))}
                        </div>

                        {/* 3. Quick Navigation Shortcuts */}
                        <div className="flex flex-col gap-1 border-t border-border pt-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                Tools
                            </span>
                            <div className="grid grid-cols-2 gap-1">
                                {[
                                    {
                                        name: 'Universal Inspector',
                                        href: '/admin/inspect',
                                        icon: FileSearch,
                                    },
                                    {
                                        name: 'Triage Attention Queue',
                                        href: '/admin/triage',
                                        icon: AlertCircle,
                                    },
                                    {
                                        name: 'Disputes & Holds',
                                        href: '/admin/disputes',
                                        icon: Scale,
                                    },
                                    {
                                        name: 'System Health & Telemetry',
                                        href: '/admin/system-health',
                                        icon: Activity,
                                    },
                                    {
                                        name: 'Work Catalog Studio',
                                        href: '/admin/catalogs/work',
                                        icon: Wrench,
                                    },
                                    {
                                        name: 'Deal Chain DAGs',
                                        href: '/admin/catalogs/deal-chains',
                                        icon: Network,
                                    },
                                ].map((s) => (
                                    <div
                                        key={s.href}
                                        className="flex cursor-pointer items-center gap-2 rounded-md p-2 transition-colors hover:bg-muted/40"
                                        onClick={() => {
                                            setIsCommandOpen(false);
                                            router.visit(s.href);
                                        }}
                                    >
                                        <s.icon className="size-3.5 text-muted-foreground" />
                                        <span className="truncate text-xs font-medium text-foreground">
                                            {s.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
