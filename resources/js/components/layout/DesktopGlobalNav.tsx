import type { ReactNode } from 'react';
import { ShoppingBag } from 'lucide-react';
import type { ActingContextData } from '../mobile/types';

interface DesktopGlobalNavProps {
    actingContext?: ActingContextData;
    activeRoute?: string;
    picksCount?: number;
    onPicksClick?: () => void;
    rightSlot?: ReactNode;
}

export function DesktopGlobalNav({
    actingContext,
    activeRoute = 'listings',
    picksCount = 0,
    onPicksClick,
    rightSlot,
}: DesktopGlobalNavProps) {
    return (
        <header className="sticky top-0 z-50 hidden h-16 w-full border-b border-slate-200 bg-white/95 backdrop-blur transition-all lg:flex">
            <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-6">
                {/* Brand & Nav Links */}
                <div className="flex items-center gap-8">
                    <a href="/browse" className="flex items-center gap-2.5 text-decoration-none">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F2F58] font-bold text-white shadow-sm">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-[var(--sz-font-display)] text-base font-extrabold tracking-tight text-[#0F2F58]">
                                SERBIZYU
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
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
                            href="/my-listings"
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
                    {/* Picks Cart Equivalent Button */}
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

                    {/* User Profile Pill */}
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 p-1 pr-3 transition-colors hover:bg-slate-50">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F2F58] text-xs font-bold text-white">
                            R
                        </div>
                        <span className="text-xs font-bold text-slate-800">Rosa (Delegate)</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
