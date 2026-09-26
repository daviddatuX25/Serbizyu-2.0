import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, LogOut, Package, ShoppingBag, User as UserIcon } from 'lucide-react';
import { router } from '@inertiajs/react';
import type { ActingContextData } from '../mobile/types';
import type { ReadinessState, SliceSession } from '@/types';

interface DesktopGlobalNavProps {
    session?: SliceSession | null;
    readiness?: ReadinessState | null;
    actingContext?: ActingContextData;
    activeRoute?: string;
    picksCount?: number;
    onPicksClick?: () => void;
    rightSlot?: ReactNode;
}

export function DesktopGlobalNav({
    session,
    readiness,
    actingContext,
    activeRoute = 'browse',
    picksCount = 0,
    onPicksClick,
    rightSlot,
}: DesktopGlobalNavProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const authenticated = Boolean(
        session?.authenticated ?? session?.isAuthenticated ?? session?.userId,
    );

    const displayName =
        readiness?.displayName ??
        readiness?.display_name ??
        session?.displayName ??
        session?.display_name ??
        session?.phone ??
        'Citizen';

    const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        setDropdownOpen(false);
        router.post('/auth/logout', {}, { preserveScroll: false });
    };

    return (
        <header className="sticky top-0 z-50 hidden h-16 w-full border-b border-slate-200 bg-white/95 backdrop-blur transition-all lg:flex">
            <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-6">
                {/* Brand & Nav Links */}
                <div className="flex items-center gap-8">
                    <a href="/" className="text-decoration-none flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F2F58] font-bold text-white shadow-sm">
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-base font-[var(--sz-font-display)] font-extrabold tracking-tight text-[#0F2F58]">
                                SERBIZYU
                            </span>
                            <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                                Tagudin Market
                            </span>
                        </div>
                    </a>

                    {/* Navigation Links */}
                    <nav className="flex items-center gap-1">
                        <a
                            href="/browse"
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                activeRoute === 'browse'
                                    ? 'bg-[#EBF2FA] text-[#0F2F58]'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            Browse Marketplace
                        </a>
                        <a
                            href="/requests/create"
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                activeRoute === 'requests'
                                    ? 'bg-[#EBF2FA] text-[#0F2F58]'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            Post a Request
                        </a>
                        <a
                            href="/listings/create"
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                activeRoute === 'create_listing'
                                    ? 'bg-[#EBF2FA] text-[#0F2F58]'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            + Post a Service
                        </a>
                        <a
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                activeRoute === 'listings'
                                    ? 'bg-[#EBF2FA] text-[#0F2F58]'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            My Listings
                        </a>
                        <a
                            href="/orders"
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                activeRoute === 'orders'
                                    ? 'bg-[#EBF2FA] text-[#0F2F58]'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            Orders
                        </a>
                    </nav>
                </div>

                {/* Right Area: Location + Context + Profile */}
                <div className="flex items-center gap-3">
                    {/* Picks Cart Button */}
                    <button
                        type="button"
                        onClick={onPicksClick}
                        className="relative flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-[#0F2F58] shadow-xs transition-colors hover:bg-slate-50"
                        aria-label="View citizen picks"
                    >
                        <ShoppingBag className="size-4 text-[#0F2F58]" />
                        <span>Picks</span>
                        {picksCount > 0 && (
                            <span className="flex size-5 items-center justify-center rounded-full bg-[#0F2F58] text-[10px] font-extrabold text-white">
                                {picksCount}
                            </span>
                        )}
                    </button>

                    {/* Acting-for Badge (if active) */}
                    {actingContext?.isActingOnBehalf && (
                        <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#92400E]">
                            <span>👤 Acting for: {actingContext.ownerName}</span>
                            <span className="cursor-pointer text-[10px] underline">Switch ▾</span>
                        </div>
                    )}

                    {rightSlot}

                    {/* Dynamic Auth Section */}
                    {authenticated ? (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setDropdownOpen((prev) => !prev)}
                                className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-2.5 transition-all hover:border-slate-300 hover:bg-slate-50"
                                aria-expanded={dropdownOpen}
                                aria-label="User account menu"
                            >
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F2F58] text-xs font-bold text-white shadow-xs">
                                    {initial}
                                </div>
                                <span className="max-w-[120px] truncate text-xs font-bold text-slate-800">
                                    {displayName}
                                </span>
                                <ChevronDown className="size-3 text-slate-400" />
                            </button>

                            {/* Dropdown Menu */}
                            {dropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 animate-in rounded-2xl border border-slate-200 bg-white p-2 shadow-xl duration-100 zoom-in-95 fade-in">
                                    <div className="border-b border-slate-100 px-3 py-2">
                                        <p className="truncate text-xs font-bold text-slate-900">
                                            {displayName}
                                        </p>
                                        <p className="mt-0.5 text-[11px] font-medium text-emerald-600">
                                            {readiness?.ready
                                                ? '✓ Verified Provider'
                                                : '✓ Verified Citizen'}
                                        </p>
                                    </div>

                                    <div className="py-1">
                                        <a
                                            href="/my-listings"
                                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#EBF2FA] hover:text-[#0F2F58]"
                                        >
                                            <Package className="size-3.5 text-slate-400" />
                                            <span>My Listings</span>
                                        </a>
                                        <a
                                            href="/orders"
                                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#EBF2FA] hover:text-[#0F2F58]"
                                        >
                                            <ShoppingBag className="size-3.5 text-slate-400" />
                                            <span>My Orders</span>
                                        </a>
                                        <a
                                            href="/requests/create"
                                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#EBF2FA] hover:text-[#0F2F58]"
                                        >
                                            <UserIcon className="size-3.5 text-slate-400" />
                                            <span>Post a Request</span>
                                        </a>
                                    </div>

                                    <div className="border-t border-slate-100 pt-1">
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                        >
                                            <LogOut className="size-3.5" />
                                            <span>Log Out</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <a
                                href="/auth/sign-in"
                                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-[#0F2F58] shadow-xs transition-colors hover:bg-slate-50"
                            >
                                Sign In
                            </a>
                            <a
                                href="/auth/register"
                                className="rounded-full bg-[#0F2F58] px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#184277]"
                            >
                                Join
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
