import { router } from '@inertiajs/react';
import { ArrowRight, FileText, Package, Wrench } from 'lucide-react';
import GlovoWaveModal from '../mobile/GlovoWaveModal';

export interface CreatorPostModalProps {
    open: boolean;
    onClose: () => void;
}

export function CreatorPostModal({ open, onClose }: CreatorPostModalProps) {
    const handleSelect = (url: string) => {
        onClose();
        router.visit(url);
    };

    return (
        <GlovoWaveModal
            open={open}
            onClose={onClose}
            title="What would you like to post?"
            subtitle="Choose between posting a citizen request or creating a provider listing"
        >
            <div className="flex flex-col gap-4 py-1 font-['Plus_Jakarta_Sans',sans-serif]">
                {/* Intent Group 1: Buyer / Citizen Request */}
                <div className="space-y-1.5">
                    <div className="px-1 text-[10px] font-extrabold tracking-wider text-teal-800 uppercase">
                        Looking for help or an item?
                    </div>
                    <div
                        onClick={() => handleSelect('/requests/create')}
                        className="group flex cursor-pointer items-start gap-3.5 rounded-2xl border border-teal-200/90 bg-teal-50/40 p-4 shadow-[0_2px_8px_rgba(13,113,95,0.05)] transition-all hover:border-[#0D715F] hover:bg-white hover:shadow-md active:scale-[0.985]"
                    >
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-teal-100/80 text-[#0D715F] transition-colors group-hover:bg-[#0D715F] group-hover:text-white">
                            <FileText className="size-5 stroke-[2.2]" />
                        </div>
                        <div className="flex flex-1 flex-col">
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center rounded-full border border-teal-300/80 bg-teal-100/70 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-teal-900 uppercase">
                                    Citizen Request
                                </span>
                                <ArrowRight className="size-4 text-teal-700 transition-transform group-hover:translate-x-0.5" />
                            </div>
                            <h4 className="mt-1 text-sm font-extrabold text-slate-900 group-hover:text-[#0D715F]">
                                Post a Request
                            </h4>
                            <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-600">
                                Describe a job, repair, or item you need and receive quotes from
                                verified local providers.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Intent Group 2: Provider / Seller Listing */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="px-1 text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                        Create a Marketplace Listing (Offer to Community)
                    </div>

                    {/* Option 2A: Service Listing */}
                    <div
                        onClick={() => handleSelect('/listings/create/service')}
                        className="group flex cursor-pointer items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,47,88,0.04)] transition-all hover:border-[#0F2F58] hover:shadow-md active:scale-[0.985]"
                    >
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-[#0F2F58] transition-colors group-hover:bg-[#0F2F58] group-hover:text-white">
                            <Wrench className="size-5 stroke-[2.2]" />
                        </div>
                        <div className="flex flex-1 flex-col">
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center rounded-full border border-blue-200/60 bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[#0F2F58] uppercase">
                                    Listing · Service
                                </span>
                                <ArrowRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#0F2F58]" />
                            </div>
                            <h4 className="mt-1 text-sm font-extrabold text-slate-900 group-hover:text-[#0F2F58]">
                                Create Service Listing
                            </h4>
                            <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">
                                Offer a trade or service with defined labor rates, packages, and
                                work stages.
                            </p>
                        </div>
                    </div>

                    {/* Option 2B: Product Listing */}
                    <div
                        onClick={() => handleSelect('/listings/create/product')}
                        className="group flex cursor-pointer items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,47,88,0.04)] transition-all hover:border-[#0F2F58] hover:shadow-md active:scale-[0.985]"
                    >
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-amber-200/80 bg-amber-50 text-amber-900 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                            <Package className="size-5 stroke-[2.2]" />
                        </div>
                        <div className="flex flex-1 flex-col">
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center rounded-full border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-amber-900 uppercase">
                                    Listing · Product
                                </span>
                                <ArrowRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-800" />
                            </div>
                            <h4 className="mt-1 text-sm font-extrabold text-slate-900 group-hover:text-[#0F2F58]">
                                Create Product Listing
                            </h4>
                            <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">
                                Sell physical goods, replacement parts, handmade crafts, or local
                                delicacies.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </GlovoWaveModal>
    );
}

export default CreatorPostModal;
