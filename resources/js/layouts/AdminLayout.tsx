import { Link, router, usePage } from '@inertiajs/react';
import * as React from 'react';
import {
    Activity,
    AlertCircle,
    ArrowRight,
    FileSearch,
    FileText,
    FolderTree,
    Moon,
    Network,
    Radio,
    Receipt,
    Scale,
    Search,
    Sun,
    Tag,
    Users,
    Wrench,
} from 'lucide-react';
import type { PageProps } from '@inertiajs/core';

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
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import type { StaffContext } from '@/types/admin-workspace';

export interface BreadcrumbSegment {
    label: string;
    href?: string;
}

type AdminLayoutProps = {
    children: React.ReactNode;
    currentSection?:
        | 'triage'
        | 'inspector'
        | 'holds'
        | 'outbox'
        | 'capabilities'
        | 'audit'
        | 'disputes';
    title?: string;
    breadcrumbs?: BreadcrumbSegment[];
};

type AdminPageProps = PageProps & { staffContext?: StaffContext };

const navigation = [
    {
        title: 'Operations',
        links: [
            { href: '/admin/triage', label: 'Staff Inbox', icon: AlertCircle },
            { href: '/admin/inspect', label: 'Universal Workspace', icon: FileSearch },
            { href: '/admin/disputes', label: 'Disputes & Holds', icon: Scale },
            { href: '/admin/telemetry', label: 'Telemetry', icon: Activity },
        ],
    },
    {
        title: 'Marketplace',
        links: [
            { href: '/admin/orders', label: 'Orders & Work', icon: FileText },
            { href: '/admin/listings', label: 'Provider Listings', icon: Tag },
            { href: '/admin/tenders', label: 'Requests & Quotes', icon: Radio },
            { href: '/admin/users', label: 'Accounts & Roles', icon: Users },
            { href: '/admin/financials', label: 'Payments & Ledgers', icon: Receipt },
        ],
    },
    {
        title: 'Blueprint Governance',
        links: [
            { href: '/admin/catalogs/work', label: 'Work Templates', icon: Wrench },
            { href: '/admin/catalogs/deal-chains', label: 'Deal Chains', icon: Network },
            { href: '/admin/catalogs/taxonomy', label: 'Categories & Rules', icon: FolderTree },
        ],
    },
];

function matchesPath(url: string, href: string) {
    if (href === '/admin/triage') return url === '/admin' || url.startsWith(href);
    if (href === '/admin/inspect') return url.startsWith('/admin/inspect');
    return url.startsWith(href);
}

export function AdminLayout({
    children,
    title = 'Staff Inbox',
    breadcrumbs,
}: AdminLayoutProps) {
    const { url, props } = usePage<AdminPageProps>();
    const staffContext = props.staffContext;
    const [isCommandOpen, setIsCommandOpen] = React.useState(false);
    const [commandQuery, setCommandQuery] = React.useState('');
    const [theme, setTheme] = React.useState<'dark' | 'light'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('serbizyu_admin_theme');
            if (saved === 'light' || saved === 'dark') return saved;
        }
        return 'light';
    });

    React.useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (
                (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) ||
                (event.key === '/' &&
                    !['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName))
            ) {
                event.preventDefault();
                setIsCommandOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    const resolvedBreadcrumbs = React.useMemo(() => {
        if (breadcrumbs?.length) return breadcrumbs;
        return [{ label: 'Operations', href: '/admin/triage' }, { label: title }];
    }, [breadcrumbs, title]);

    const openReference = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const reference = commandQuery.trim();
        if (!reference) return;
        setIsCommandOpen(false);
        router.visit(`/admin/inspect?ref=${encodeURIComponent(reference)}`);
    };

    const initials = staffContext?.operator.display_name
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <>
            <SidebarProvider defaultOpen>
                <Sidebar collapsible="icon" className="border-r border-border bg-card">
                    <SidebarHeader className="border-b border-border px-3 py-3">
                        <Link href="/admin/triage" className="flex items-center gap-2.5">
                            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                                S
                            </span>
                            <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
                                <span className="truncate text-sm font-semibold text-foreground">
                                    Serbizyu Admin
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    Staff operations
                                </span>
                            </span>
                        </Link>
                    </SidebarHeader>
                    <SidebarContent className="px-1.5 py-2">
                        {navigation.map((group) => (
                            <SidebarGroup key={group.title}>
                                <SidebarGroupLabel className="text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                                    {group.title}
                                </SidebarGroupLabel>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {group.links.map(({ href, label, icon: Icon }) => (
                                            <SidebarMenuItem key={href}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={matchesPath(url, href)}
                                                    tooltip={label}
                                                >
                                                    <Link href={href}>
                                                        <Icon className="size-4" />
                                                        <span>{label}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        ))}
                    </SidebarContent>
                    <SidebarFooter className="border-t border-border p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                            <span className="font-mono text-[10.5px]">Serbizyu 2.0</span>
                            <span className="text-[10px]">{staffContext?.environment ?? 'Environment unavailable'}</span>
                        </div>
                    </SidebarFooter>
                    <SidebarRail />
                </Sidebar>
                <SidebarInset>
                    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-xs">
                        <div className="flex min-w-0 items-center gap-2">
                            <SidebarTrigger />
                            <Separator orientation="vertical" className="mr-1 h-4" />
                            <Breadcrumb className="hidden truncate sm:block">
                                <BreadcrumbList>
                                    {resolvedBreadcrumbs.map((crumb, index) => {
                                        const isLast = index === resolvedBreadcrumbs.length - 1;
                                        return (
                                            <React.Fragment key={`${crumb.label}-${index}`}>
                                                <BreadcrumbItem className={index === 0 ? 'hidden sm:inline-flex' : 'inline-flex'}>
                                                    {crumb.href && !isLast ? (
                                                        <BreadcrumbLink href={crumb.href} className="text-muted-foreground hover:text-foreground">
                                                            {crumb.label}
                                                        </BreadcrumbLink>
                                                    ) : (
                                                        <BreadcrumbPage className="font-semibold text-foreground">
                                                            {crumb.label}
                                                        </BreadcrumbPage>
                                                    )}
                                                </BreadcrumbItem>
                                                {!isLast && <BreadcrumbSeparator className={index === 0 ? 'hidden sm:inline-flex' : 'inline-flex'} />}
                                            </React.Fragment>
                                        );
                                    })}
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCommandOpen(true)}
                            className="hidden w-64 justify-start gap-2 text-xs text-muted-foreground md:flex lg:w-96"
                        >
                            <Search className="size-3.5" />
                            <span className="truncate">Find a record by reference or UUID</span>
                            <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
                        </Button>
                        <div className="flex shrink-0 items-center gap-2">
                            <div className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11px] sm:flex">
                                <span className="text-muted-foreground">Environment</span>
                                <Badge variant="outline" className="font-mono text-[10px]">
                                    {staffContext?.environment ?? 'Unavailable'}
                                </Badge>
                            </div>
                            <div className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11px] lg:flex">
                                <span className="text-muted-foreground">Cohort</span>
                                <Badge variant="outline" className="font-mono text-[10px]">
                                    {staffContext?.cohort.selected ?? 'All / unfiltered'}
                                </Badge>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button type="button" className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2 py-1 text-xs hover:bg-muted">
                                        <Avatar className="size-6 rounded-md">
                                            <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                                                {initials ?? '—'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="hidden max-w-36 truncate text-left font-medium lg:inline">
                                            {staffContext?.operator.display_name ?? 'Staff context unavailable'}
                                        </span>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 border-border bg-card">
                                    <DropdownMenuLabel className="text-xs">Signed-in operator</DropdownMenuLabel>
                                    <div className="px-2 pb-2 text-xs text-muted-foreground">
                                        <div>{staffContext?.operator.display_name ?? 'Operator unavailable'}</div>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {staffContext?.operator.roles.map((role) => (
                                                <Badge key={role} variant="outline" className="text-[10px]">{role}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => {
                                            const next = theme === 'dark' ? 'light' : 'dark';
                                            setTheme(next);
                                            localStorage.setItem('serbizyu_admin_theme', next);
                                        }}
                                        className="flex cursor-pointer items-center justify-between text-xs"
                                    >
                                        <span>Display theme</span>
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            {theme === 'dark' ? <Moon className="size-3" /> : <Sun className="size-3" />}
                                            {theme}
                                        </span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>
                    <div className="flex-1 p-4 md:p-6 lg:p-8">
                        <div className="mx-auto flex max-w-7xl flex-col gap-6">{children}</div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
            <Dialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
                <DialogContent className="gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-xl [&>button:last-child]:hidden">
                    <DialogTitle className="sr-only">Find and inspect a record</DialogTitle>
                    <form onSubmit={openReference} className="flex items-center gap-2.5 px-4 py-4">
                        <Search className="size-4 shrink-0 text-muted-foreground" />
                        <input
                            autoFocus
                            type="search"
                            value={commandQuery}
                            onChange={(event) => setCommandQuery(event.target.value)}
                            placeholder="Enter a persisted reference or UUID"
                            aria-label="Record reference or UUID"
                            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden"
                        />
                        <Button type="submit" size="sm" disabled={!commandQuery.trim()}>
                            Inspect <ArrowRight className="ml-1 size-3" />
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
