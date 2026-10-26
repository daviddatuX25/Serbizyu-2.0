import type { ReactNode } from 'react';
import { NotificationBell } from './notifications/NotificationCenter';
import { DesktopGlobalNav } from './layout/DesktopGlobalNav';
import { BottomNavBar, type NavTabId } from '../marketplace/components/BottomNavBar';
import { router } from '@inertiajs/react';
import type { SliceSession, ReadinessState } from '../types';

interface AppShellProps {
    session?: SliceSession | null;
    readiness?: ReadinessState | null;
    activeRoute?: 'browse' | 'requests' | 'create_listing' | 'listings' | 'orders' | 'money-history' | 'deal-invitations';
    activeMobileTab?: NavTabId;
    picksCount?: number;
    onPicksClick?: () => void;
    rightSlot?: ReactNode;
    children: ReactNode;
}

/**
 * AppShell:
 * Single canonical responsive shell for Serbizyu 2.0 marketplace surfaces.
 * - Desktop (>= 1024px): Renders DesktopGlobalNav top header only. BottomNavBar is completely omitted.
 * - Mobile (< 1024px): Renders clean content and sticky bottom navigation.
 */
export function AppShell({
    session,
    readiness,
    activeRoute = 'browse',
    activeMobileTab = 'explore',
    picksCount = 0,
    onPicksClick,
    rightSlot,
    children,
}: AppShellProps) {
    const handleMobileTabSelect = (tab: NavTabId) => {
        if (tab === 'explore') router.visit('/browse');
        if (tab === 'post') router.visit('/requests/create');
        if (tab === 'orders') router.visit('/orders');
        if (tab === 'invitations') router.visit('/deal-invitations');
        if (tab === 'profile') router.visit('/my-listings');
    };

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 antialiased flex flex-col">
            {/* Desktop Navigation Header (Hidden on mobile) */}
            <DesktopGlobalNav
                session={session}
                readiness={readiness}
                activeRoute={activeRoute}
                picksCount={picksCount}
                onPicksClick={onPicksClick}
                actingContext={{
                    actorUserId: session?.userId || 'usr_guest',
                    ownerUserId: session?.userId || 'usr_guest',
                    ownerName: readiness?.displayName || session?.displayName || 'Tagudin Resident',
                    consentGrantId: 'cg_public',
                    isActingOnBehalf: false,
                }}
                rightSlot={rightSlot}
            />

            {/* Page Canvas */}
            <div className="flex-1 w-full pb-16 lg:pb-0">
                {children}
            </div>

            {/* Mobile Bottom Navigation (Hidden on desktop via lg:hidden) */}
            <BottomNavBar
                activeTab={activeMobileTab}
                ordersCount={picksCount}
                onTabSelect={handleMobileTabSelect}
                notificationSlot={<NotificationBell />}
            />
        </div>
    );
}
