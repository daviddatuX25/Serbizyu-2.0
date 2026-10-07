import type { ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface AuthShellProps {
    title: string;
    subtitle?: string;
    returnTo?: string;
    maxWidth?: 'narrow' | 'wide';
    children: ReactNode;
}


export function AuthShell({
    title,
    subtitle = 'Enter your details below to continue.',
    returnTo = '/',
    maxWidth = 'narrow',
    children,
}: AuthShellProps) {
    let pathname = '/';
    try {
        if (returnTo.startsWith('/')) {
            pathname = returnTo.split('?')[0].split('#')[0];
        } else {
            pathname = new URL(returnTo, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
        }
    } catch {
        pathname = returnTo;
    }

    const isReturningToListingBuilder =
        pathname.startsWith('/listings/create/product') ||
        pathname.startsWith('/listings/create/service');
    let backHref = '/';
    if (isReturningToListingBuilder) {
        try {
            if (returnTo.startsWith('/')) {
                backHref = returnTo;
            } else {
                const parsed = new URL(returnTo, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
                backHref = parsed.pathname + parsed.search + parsed.hash;
            }
        } catch {
            backHref = returnTo;
        }
    }
    const backLabel = isReturningToListingBuilder ? 'Back to listing builder' : 'Back to Marketplace';
    return (
        <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
            {/* Minimalist Topbar matching DesktopGlobalNav */}
            <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
                <div className="mx-auto flex max-w-5xl items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 no-underline">
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
                    </Link>

                    <Link
                        href={backHref}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                        <ArrowLeft className="size-3.5 text-slate-500" />
                        <span>{backLabel}</span>
                    </Link>
                </div>
            </header>

            {/* Main Center Area */}
            <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
                <div className={`w-full ${maxWidth === 'wide' ? 'max-w-3xl' : 'max-w-[440px]'}`}>
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,47,88,0.06)] sm:p-8">
                        {/* Title Block */}
                        <div className="mb-6">
                            <div className="inline-flex items-center gap-1.5 rounded-md bg-[#EBF2FA] px-2 py-0.5 text-[11px] font-bold text-[#0F2F58]">
                                <span>Tagudin Citizen Identity</span>
                            </div>
                            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="mt-1 text-xs text-slate-500 sm:text-sm">{subtitle}</p>
                            )}
                        </div>

                        {/* Content / Forms */}
                        {children}
                    </div>

                </div>
            </main>
        </div>
    );
}
