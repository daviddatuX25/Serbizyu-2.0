import { Head, Link } from '@inertiajs/react';
import {
    Wrench,
    Package,
    ArrowRight,
    CheckCircle2,
    ShieldCheck,
    Layers,
    Truck,
} from 'lucide-react';
import { DesktopGlobalNav } from '../../components/layout/DesktopGlobalNav';

interface CreatePickerProps {
    session?: any;
    readiness?: any;
    correlationId?: string;
}

export default function CreatePicker({}: CreatePickerProps) {
    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 pb-16">
            <Head title="Choose Listing Type | Serbizyu Tagudin" />
            <DesktopGlobalNav activeRoute="create_listing" />

            <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">

                {/* Section Header */}
                <div className="text-center sm:text-left mb-8">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-extrabold text-[#0F2F58] uppercase tracking-wider mb-2">
                        <ShieldCheck className="size-3.5 text-[#0F2F58]" />
                        <span>Tagudin Commerce &amp; Trades</span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-[#0F2F58] sm:text-3xl">
                        What would you like to list?
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 max-w-xl">
                        Choose the format that best fits your offering. Each builder provides tailored pricing models, verification gates, and customer preview tools.
                    </p>
                </div>

                {/* Selection Cards Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Service Card */}
                    <div
                        data-testid="create-service-card"
                        className="group relative flex flex-col justify-between rounded-3xl border-2 border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#0F2F58] hover:shadow-xl"
                    >
                        <div>
                            <div className="flex items-start justify-between">
                                <div className="flex size-14 items-center justify-center rounded-2xl bg-[#EBF2FA] text-[#0F2F58] transition-transform group-hover:scale-105">
                                    <Wrench className="size-7" />
                                </div>
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-extrabold text-emerald-800 uppercase tracking-wide">
                                    Governed Work Plan
                                </span>
                            </div>

                            <h2 className="mt-5 text-xl font-black text-slate-900 group-hover:text-[#0F2F58]">
                                Service &amp; Labor
                            </h2>
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                                For repairmen, technicians, tradespeople, cleaners, transport, and specialized hourly or staged labor in Tagudin.
                            </p>

                            <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-5 text-xs text-slate-600">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                                    <span>Customizable work stages &amp; verification gates</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Layers className="size-4 text-emerald-600 shrink-0" />
                                    <span>Partner deal chains (parts sourcing &amp; couriers)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                                    <span>Fixed, quote range, or tiered package pricing</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-4">
                            <Link
                                href="/listings/create/service"
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F2F58] py-3.5 px-5 text-xs font-black text-white shadow-md transition-all hover:bg-[#153e74] group-hover:shadow-lg"
                            >
                                <span>Start Service Listing</span>
                                <ArrowRight className="size-4 text-[#FFC72C] transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>

                    {/* Product Card */}
                    <div
                        data-testid="create-product-card"
                        className="group relative flex flex-col justify-between rounded-3xl border-2 border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-500 hover:shadow-xl"
                    >
                        <div>
                            <div className="flex items-start justify-between">
                                <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 transition-transform group-hover:scale-105">
                                    <Package className="size-7" />
                                </div>
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-extrabold text-amber-800 uppercase tracking-wide">
                                    Physical Goods
                                </span>
                            </div>

                            <h2 className="mt-5 text-xl font-black text-slate-900 group-hover:text-amber-700">
                                Product &amp; Goods
                            </h2>
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                                For hardware supplies, spare parts, fresh harvests, retail inventory, and physical goods sold across Tagudin.
                            </p>

                            <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-5 text-xs text-slate-600">
                                <div className="flex items-center gap-2">
                                    <Truck className="size-4 text-amber-600 shrink-0" />
                                    <span>Fulfillment by pickup, delivery courier, or meetup</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 text-amber-600 shrink-0" />
                                    <span>Stock quantity &amp; condition tracking (New / Surplus)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Layers className="size-4 text-amber-600 shrink-0" />
                                    <span>Single price or bundled package tiers</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-4">
                            <Link
                                href="/listings/create/product"
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F2F58] py-3.5 px-5 text-xs font-black text-white shadow-md transition-all hover:bg-[#153e74] group-hover:shadow-lg"
                            >
                                <span>Start Product Listing</span>
                                <ArrowRight className="size-4 text-[#FFC72C] transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
