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
        <GlovoWaveModal open={open} onClose={onClose} title="What are you posting?">
            <div className="flex flex-col gap-2.5 py-2 font-['Plus_Jakarta_Sans',sans-serif]">
                {/* Option 1: Citizen Request */}
                <button
                    type="button"
                    onClick={() => handleSelect('/requests/create')}
                    className="group flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-[#0F2F58] hover:shadow-xs active:scale-[0.99]"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-[#0F2F58] group-hover:text-white">
                            <FileText className="size-5 stroke-[2]" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0F2F58]">
                                Post a Request
                            </h4>
                            <p className="text-xs text-slate-500">
                                Need a repair, trade, or custom errand
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#0F2F58]" />
                </button>

                {/* Option 2: Service Listing */}
                <button
                    type="button"
                    onClick={() => handleSelect('/listings/create/service')}
                    className="group flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-[#0F2F58] hover:shadow-xs active:scale-[0.99]"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-[#0F2F58] group-hover:text-white">
                            <Wrench className="size-5 stroke-[2]" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0F2F58]">
                                Offer a Service
                            </h4>
                            <p className="text-xs text-slate-500">
                                Repairs, cleaning, tailoring, or skilled trade
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#0F2F58]" />
                </button>

                {/* Option 3: Product Listing */}
                <button
                    type="button"
                    onClick={() => handleSelect('/listings/create/product')}
                    className="group flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-[#0F2F58] hover:shadow-xs active:scale-[0.99]"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-[#0F2F58] group-hover:text-white">
                            <Package className="size-5 stroke-[2]" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0F2F58]">
                                Sell a Product
                            </h4>
                            <p className="text-xs text-slate-500">
                                Local goods, fresh food, or crafts
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#0F2F58]" />
                </button>
            </div>
        </GlovoWaveModal>
    );
}

export default CreatorPostModal;
