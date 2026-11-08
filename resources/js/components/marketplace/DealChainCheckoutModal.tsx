import { ArrowRight, FileCheck, Package, ShieldCheck, Truck, Wrench } from 'lucide-react';
import GlovoWaveModal from '../mobile/GlovoWaveModal';
import type { BasketItem, DealChainNode } from '@/marketplace/types';
import { hasValidSavedDealChainPreview } from '@/marketplace/booking';

interface DealChainCheckoutModalProps {
    open: boolean;
    onClose: () => void;
    items: BasketItem[];
    totalAmount: number;
    onAuthorize: () => void;
}

type PlannedNode = {
    id: string;
    title: string;
    description: string;
    role: string;
    type: DealChainNode['type'];
};

function nodeIcon(type: PlannedNode['type']) {
    if (type === 'store') return <Package className="size-4 text-amber-700" />;
    if (type === 'delivery') return <Truck className="size-4 text-sky-700" />;
    if (type === 'audit') return <FileCheck className="size-4 text-purple-700" />;

    return <Wrench className="size-4 text-emerald-700" />;
}

export function DealChainCheckoutModal({
    open,
    onClose,
    items,
    totalAmount,
    onAuthorize,
}: DealChainCheckoutModalProps) {
    const invalidSavedPreview = items.some((item) => item.deal_chain_combination_id && !hasValidSavedDealChainPreview(item));
    const hasSavedPlan = items.some((item) => Boolean(item.deal_chain_combination_id));
    const unresolvedSavedRole = items.some((item) => item.savedDealChain?.nodes.some((node) => !node.isPrimary && !node.listingId));
    if (!open) return null;
    const plannedNodes: PlannedNode[] = items.flatMap((item) => {
        const preview = item.savedDealChain ?? item.dealChain;
        if (preview) {
            return preview.nodes.map((node, nodeIndex) => ({
                id: `${item.id}-${nodeIndex}`,
                title: node.title,
                description: [
                    item.title,
                    node.sub,
                    ...(item.savedDealChain?.dependencies ?? [])
                        .filter((edge) => edge.successorId === node.id)
                        .map((edge) => {
                            const predecessor = preview.nodes.find((candidate) => candidate.id === edge.predecessorId);
                            const milestone = edge.conditionCode === 'part_ready' ? 'item is ready'
                                : edge.conditionCode === 'delivery_signed' ? 'delivery is received' : 'work is confirmed complete';
                            return `Starts after ${predecessor?.title ?? 'previous task'}: ${milestone}`;
                        }),
                ].filter(Boolean).join(' · '),
                role: node.role,
                type: node.type,
            }));
        }
        if (item.deal_chain_combination_id) return [];
        return [{
            id: `${item.id}-primary`,
            title: item.title,
            description: 'Primary listing need · Provider agreement required',
            role: item.listing_type === 'product' ? 'Product' : 'Labor',
            type: item.listing_type === 'product' ? 'store' : 'labor',
        }];
    });

    return (
        <GlovoWaveModal
            open={open}
            onClose={onClose}
            title="Review Coordinated Deal Chain"
            subtitle={`${plannedNodes.length} Coordinated Partner Nodes · Terms confirmed per provider`}
            bottomSlot={
                <button
                    type="button"
                    disabled={invalidSavedPreview || unresolvedSavedRole}
                    onClick={() => onAuthorize()}
                    className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#FFC72C] text-xs font-extrabold tracking-wide text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <span>Stage Coordinated Plan</span>
                    <ArrowRight className="size-4" />
                </button>
            }
        >
            <div className="flex flex-col gap-4 py-2 font-['Plus_Jakarta_Sans',sans-serif]">
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <div className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                                Detailed node projection
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                                This stages a coordination plan. It does not create Orders, Work, or
                                payment obligations.
                            </p>
                        </div>
                        {!hasSavedPlan && (
                            <span className="shrink-0 font-mono text-xs font-bold text-slate-500">
                                Estimate ₱{totalAmount.toFixed(2)}
                            </span>
                        )}
                    </div>
                    {invalidSavedPreview && (
                        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                            This saved plan has no matching display preview. Revisit its source listing and add it again before staging.
                        </p>
                    )}
                    {unresolvedSavedRole && (
                        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                            Choose a provider for every open saved role before staging.
                        </p>
                    )}

                    {plannedNodes.map((node, index) => (
                        <div
                            key={node.id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                                    {nodeIcon(node.type)}
                                </div>
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                                        Node #{index + 1} · {node.role}
                                    </span>
                                    <div className="font-extrabold text-slate-900">
                                        {node.title}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        {node.description}
                                    </div>
                                </div>
                            </div>
                            <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-extrabold text-amber-800">
                                Needs agreement
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-[11px] text-blue-950">
                    <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-[#0F2F58]" />
                    <div>
                        <strong>Planning boundary:</strong> provider selection, accepted terms,
                        Work, and each child payment lane are resolved in later sourcing and
                        agreement steps.
                    </div>
                </div>
            </div>
        </GlovoWaveModal>
    );
}
