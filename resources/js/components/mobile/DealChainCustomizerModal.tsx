import { useEffect, useId, useMemo, useState } from 'react';
import {
    ArrowDown,
    ArrowUp,
    CheckCircle2,
    Plus,
    RotateCcw,
    SlidersHorizontal,
    Store,
    Trash2,
    X,
} from 'lucide-react';
import DealChainCanvas from './DealChainCanvas';
import type {
    DealChainCombination,
    DealChainNode,
    PartnerSlot,
    SlotType,
} from './types';

export interface DealChainCustomizerModalProps {
    open: boolean;
    onClose: () => void;
    combination: DealChainCombination | null;
    primaryListingTitle: string;
    primaryListingPricePesos: number;
    primaryListingType: 'service' | 'product';
    onSave: (updated: DealChainCombination) => void;
    onPickPartnerForSlot: (
        slotType: SlotType,
        onPicked: (partner: {
            id: string;
            title: string;
            providerName: string;
            priceMinor: number;
            photoUrl?: string;
            isOpenSlot?: boolean;
        }) => void,
    ) => void;
    onResetToTemplate?: () => void;
}

export const NODE_ROLE_PRESETS: Array<{
    slotType: SlotType;
    roleBadge: string;
    roleLabel: string;
    defaultName: string;
    defaultFeePesos: number;
    bg: string;
    color: string;
    position: 'before' | 'after';
    tier: number;
    conditionCode: string;
    description: string;
}> = [
    {
        slotType: 'store',
        roleBadge: 'STORE',
        roleLabel: 'Hardware / Part / Supply Partner',
        defaultName: 'Tagudin Hardware & Supply Depot',
        defaultFeePesos: 180,
        bg: '#FEF3C7',
        color: '#B45309',
        position: 'before',
        tier: 0,
        conditionCode: 'source_ready',
        description: 'Parts or materials procured from a merchant counter or warehouse stall.',
    },
    {
        slotType: 'delivery',
        roleBadge: 'COURIER',
        roleLabel: 'Doorstep Courier Runner',
        defaultName: 'Danny Express Motorcycle Pool',
        defaultFeePesos: 35,
        bg: '#E0F2FE',
        color: '#0284C7',
        position: 'before',
        tier: 1,
        conditionCode: 'delivered_to_site',
        description: 'Rapid on-demand transit of items from store/merchant directly to jobsite.',
    },
    {
        slotType: 'installation',
        roleBadge: 'LABOR',
        roleLabel: 'Co-Labor / Technician Partner',
        defaultName: 'Kuya Ben Aircon Services',
        defaultFeePesos: 250,
        bg: '#DCFCE7',
        color: '#15803D',
        position: 'after',
        tier: 2,
        conditionCode: 'work_completed',
        description: 'Specialized trade labor performing on-site service installation or prep.',
    },
    {
        slotType: 'audit',
        roleBadge: 'AUDIT',
        roleLabel: 'Certified Safety & Quality Auditor',
        defaultName: 'Safety Check (Master Electrician)',
        defaultFeePesos: 150,
        bg: '#F3E8FF',
        color: '#7E22CE',
        position: 'after',
        tier: 3,
        conditionCode: 'audit_cleared',
        description: 'Independent inspection certifying safety clearance, electrical integrity, or code compliance.',
    },
];

function rebuildNodesFromSlots(
    slots: PartnerSlot[],
    primaryTitle: string,
    primaryPricePesos: number,
    primaryListingType: 'service' | 'product',
): DealChainNode[] {
    const beforeSlots = slots.filter(
        (s) => s.type === 'store' || s.type === 'parts' || s.type === 'delivery',
    );
    const afterSlots = slots.filter(
        (s) => s.type !== 'store' && s.type !== 'parts' && s.type !== 'delivery',
    );

    const toNode = (slot: PartnerSlot, idx: number): DealChainNode => {
        const isStore = slot.type === 'store' || slot.type === 'parts';
        const isCourier = slot.type === 'delivery';
        const isAudit = slot.type === 'audit';
        const feePesos =
            typeof slot.feeMinor === 'number'
                ? Math.round(slot.feeMinor / 100)
                : parseInt((slot.meta || '').replace(/[^0-9]/g, ''), 10) || 50;

        return {
            id: slot.id || `node-${slot.type}-${idx}`,
            role: isStore ? 'STORE' : isCourier ? 'COURIER' : isAudit ? 'AUDIT' : 'LABOR',
            title: slot.isOpenSlot
                ? 'Open Partner Slot'
                : slot.name.length > 18
                  ? `${slot.name.slice(0, 17)}…`
                  : slot.name,
            sub: slot.isOpenSlot ? 'Buyer picks' : `₱${feePesos}`,
            type: slot.type,
            bg: isStore || isAudit ? '#FEF3C7' : isCourier ? '#E0F2FE' : '#ECFDF5',
            color: isStore || isAudit ? '#B45309' : isCourier ? '#0284C7' : '#059669',
            listingId: slot.listingId,
            feeMinor: slot.feeMinor,
            coverThumbnailUrl: slot.coverThumbnailUrl,
            tier: slot.tier,
            conditionCode: slot.conditionCode,
            allowBypass: slot.allowBypass,
        };
    };

    const primaryNode: DealChainNode = {
        id: 'node-primary-anchor',
        role: primaryListingType === 'product' ? 'YOUR PRODUCT' : 'YOUR SERVICE',
        title:
            primaryTitle.trim().length > 18
                ? `${primaryTitle.trim().slice(0, 17)}…`
                : primaryTitle.trim() || 'Your Offering',
        sub: `₱${Math.round(primaryPricePesos)}`,
        type: primaryListingType === 'product' ? 'store' : 'labor',
        bg: '#ECFDF5',
        color: '#059669',
        tier: Math.max(-1, ...beforeSlots.map((slot) => slot.tier ?? 0)) + 1,
    };
    return [...beforeSlots.map((s, i) => toNode(s, i)), primaryNode, ...afterSlots.map((s, i) => toNode(s, beforeSlots.length + 1 + i))];
}

export default function DealChainCustomizerModal({
    open,
    onClose,
    combination,
    primaryListingTitle,
    primaryListingPricePesos,
    primaryListingType,
    onSave,
    onPickPartnerForSlot,
    onResetToTemplate,
}: DealChainCustomizerModalProps) {
    const titleId = useId();
    const [title, setTitle] = useState('');
    const [slots, setSlots] = useState<PartnerSlot[]>([]);
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
    const [selectedGateId, setSelectedGateId] = useState<string>();
    const [gateConditionCode, setGateConditionCode] = useState<string>();
    const [gateAllowBypass, setGateAllowBypass] = useState(false);
    const [inspectorTab, setInspectorTab] = useState<'configure' | 'catalog'>('configure');
    const [isModified, setIsModified] = useState(false);
    useEffect(() => {
        if (open && combination) {
            setTitle(combination.title);
            const normalizedSlots = combination.slots.map((s, idx) => ({
                ...s,
                id: s.id || `slot-${s.type}-${idx}-${Date.now()}`,
                tier: typeof s.tier === 'number' ? s.tier : idx,
                conditionCode: s.conditionCode || (s.type === 'store' ? 'source_ready' : s.type === 'delivery' ? 'delivered_to_site' : 'completed'),
            }));
            setSlots(normalizedSlots);
            setGateConditionCode(combination.nodes.find((node) => node.id === 'node-primary-anchor')?.conditionCode);
            setGateAllowBypass(Boolean(combination.nodes.find((node) => node.id === 'node-primary-anchor')?.allowBypass));
            setSelectedSlotId(normalizedSlots[0]?.id || 'node-primary-anchor');
            setIsModified(Boolean(combination.isCustom));
        } else if (open && !combination) {
            setTitle('Custom Partnered Deal Chain');
            const defaultSlot: PartnerSlot = {
                id: `slot-delivery-${Date.now()}`,
                type: 'delivery',
                role: 'Doorstep Courier Runner',
                name: 'Danny Express Motorcycle Pool',
                meta: '₱35.00 route fee',
                feeMinor: 3500,
                coverThumbnailUrl: '/photos/courier.jpg',
                tier: 1,
                conditionCode: 'delivered_to_site',
            };
            setSlots([defaultSlot]);
            setSelectedSlotId(defaultSlot.id ?? null);
            setIsModified(true);
        }
    }, [open, combination]);

    const previewNodes = useMemo(() => {
        return rebuildNodesFromSlots(
            slots,
            primaryListingTitle,
            primaryListingPricePesos,
            primaryListingType,
        ).map((node) => node.id === 'node-primary-anchor' ? {
            ...node,
            conditionCode: gateConditionCode ?? node.conditionCode,
            allowBypass: gateAllowBypass || node.allowBypass,
        } : node);
    }, [slots, primaryListingTitle, primaryListingPricePesos, primaryListingType, gateConditionCode, gateAllowBypass]);

    const selectedSlot = useMemo(() => {
        return slots.find((s) => s.id === selectedSlotId) || null;
    }, [slots, selectedSlotId]);

    const totalPartnerMinor = useMemo(() => {
        return slots.reduce((sum, s) => sum + (s.feeMinor || 0), 0);
    }, [slots]);

    if (!open) return null;

    const handleAddSlot = (preset: (typeof NODE_ROLE_PRESETS)[number], isParallel = false) => {
        const nextId = `slot-${preset.slotType}-${Date.now()}`;
        const targetTier = isParallel && selectedSlot ? (selectedSlot.tier ?? 0) : slots.length;

        const nextSlot: PartnerSlot = {
            id: nextId,
            type: preset.slotType,
            role: preset.roleLabel,
            name: preset.defaultName,
            meta: `₱${preset.defaultFeePesos.toFixed(2)} partner fee`,
            feeMinor: preset.defaultFeePesos * 100,
            coverThumbnailUrl:
                preset.slotType === 'store'
                    ? '/photos/ac-capacitor.jpg'
                    : preset.slotType === 'delivery'
                      ? '/photos/courier.jpg'
                      : '/photos/req-electrician.jpg',
            tier: targetTier,
            conditionCode: preset.conditionCode,
        };

        setSlots((prev) => [...prev, nextSlot]);
        setSelectedSlotId(nextId);
        setInspectorTab('configure');
        setIsModified(true);
    };

    const handleRemoveSlot = (slotId: string) => {
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
        if (selectedSlotId === slotId) {
            setSelectedSlotId(slots[0]?.id || 'node-primary-anchor');
        }
        setIsModified(true);
    };

    const handleReorder = (index: number, direction: 'up' | 'down') => {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= slots.length) return;
        const copy = [...slots];
        const [moved] = copy.splice(index, 1);
        copy.splice(target, 1, { ...moved, tier: slots[target].tier });
        copy[target] = { ...copy[target], tier: slots[index].tier };
        setSlots(copy);
        setIsModified(true);
    };

    const handleRunInParallel = (index: number) => {
        const siblingIndex = index > 0 ? index - 1 : index + 1;
        const sibling = slots[siblingIndex];
        if (!sibling) return;
        const targetTier = sibling.tier ?? 0;
        setSlots((prev) => prev.map((slot, i) => i === index ? { ...slot, tier: targetTier } : slot));
        setIsModified(true);
    };

    const handleMakeSequential = (index: number) => {
        const slot = slots[index];
        if (!slot) return;
        const targetTier = (slot.tier ?? 0) + 1;
        setSlots((prev) => prev.map((item, i) => {
            if (i === index) return { ...item, tier: targetTier };
            return (item.tier ?? 0) >= targetTier ? { ...item, tier: (item.tier ?? 0) + 1 } : item;
        }));
        setIsModified(true);
    };

    const handleUpdateSelectedSlot = (patch: Partial<PartnerSlot>) => {
        if (!selectedSlotId) return;
        setSlots((prev) =>
            prev.map((s) => (s.id === selectedSlotId ? { ...s, ...patch } : s)),
        );
        setIsModified(true);
    };

    const handleBindListing = () => {
        if (!selectedSlot) return;
        onPickPartnerForSlot(selectedSlot.type, (picked) => {
            handleUpdateSelectedSlot({
                name: picked.isOpenSlot
                    ? `Open ${selectedSlot.role} Slot`
                    : picked.title || picked.providerName,
                meta: picked.isOpenSlot
                    ? 'Buyer selects partner at checkout'
                    : `₱${(picked.priceMinor / 100).toFixed(2)} partner fee`,
                listingId: picked.isOpenSlot ? undefined : picked.id,
                feeMinor: picked.priceMinor,
                coverThumbnailUrl: picked.photoUrl,
                isOpenSlot: Boolean(picked.isOpenSlot),
            });
        });
    };

    const handleSaveChain = () => {
        const baseId = combination?.id || `combo-custom-${Date.now()}`;
        const basedOnTitle =
            combination?.basedOnTitle ||
            (combination && !combination.isCustom ? combination.title : undefined);

        const updated: DealChainCombination = {
            id: baseId,
            title: title.trim() || 'Custom Partnered Deal Chain',
            icon: combination?.icon || 'Sliders',
            isDefault: combination?.isDefault ?? true,
            recipeId: combination?.recipeId || 'custom_chain',
            catalogVersion: combination?.catalogVersion || 1,
            isCustom: true,
            basedOnTitle,
            nodes: previewNodes,
            slots,
        };
        onSave(updated);
        onClose();
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs sm:items-center sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[94vh] w-full translate-y-0 flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl transition-transform duration-300 sm:max-h-[90vh] sm:max-w-4xl lg:max-w-5xl sm:rounded-2xl"
            >
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-4 pt-3 pb-3 sm:px-6 sm:pt-4">
                    {/* Header */}
                    <div className="shrink-0 border-b border-slate-100 pb-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-[#0F2F58] text-white">
                                        <SlidersHorizontal className="size-4 text-[#FFC72C]" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3
                                                id={titleId}
                                                className="m-0 text-base sm:text-lg font-extrabold text-[#0F2F58] tracking-tight"
                                            >
                                                Deal Chain Studio · Multi-Agency Relay
                                            </h3>
                                            {isModified && (
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9.5px] font-extrabold text-amber-900 uppercase">
                                                    Custom for this listing
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                            Assemble partner nodes, configure parallel sourcing, and define dependency unblocking gates.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {onResetToTemplate && (
                                    <button
                                        type="button"
                                        onClick={onResetToTemplate}
                                        className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                                    >
                                        <RotateCcw className="size-3 text-slate-500" />
                                        <span>Reset to Archetype</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Close"
                                    className="flex size-8 min-h-[36px] min-w-[36px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        </div>

                        {/* Editable Deal Chain Title */}
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide shrink-0">
                                Chain Title:
                            </span>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    setIsModified(true);
                                }}
                                placeholder="e.g. All-In Parts Sourcing, Transit & Installation Relay"
                                className="flex-1 rounded-lg border border-slate-200 bg-[#FAFCFB] px-2.5 py-1.5 text-xs font-extrabold text-[#0F2F58] outline-none focus:border-[#0F2F58] focus:bg-white"
                            />
                        </div>

                        {/* Top n8n DAG Canvas Preview Banner */}
                        <div className="mt-3 overflow-hidden rounded-xl">
                            <DealChainCanvas
                                nodes={previewNodes}
                                selectedNodeId={selectedSlotId}
                                selectedGateId={selectedGateId}
                                onGateClick={(gateId) => {
                                    const targetId = gateId.slice('gate-'.length);
                                    setSelectedGateId(gateId);
                                    setSelectedSlotId(targetId);
                                    setInspectorTab('configure');
                                }}
                                onNodeClick={(id) => {
                                    setSelectedGateId(undefined);
                                    setSelectedSlotId(id);
                                }}
                                onAddStepClick={(sourceId) => {
                                    setSelectedGateId(undefined);
                                    setSelectedSlotId(sourceId);
                                    setInspectorTab('catalog');
                                }}
                                theme="dark"
                                title="Interactive Graph Preview"
                            />
                        </div>
                    </div>

                    {/* Main Split: Left Slot Tier List & Right Inspector Panel */}
                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pt-3 md:flex-row">
                        {/* Left Column: Slots & Tiers */}
                        <div className="flex min-h-0 flex-col md:w-5/12 lg:w-4/12 border-b border-slate-100 pb-3 md:border-b-0 md:border-r md:pr-4">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-extrabold text-[#0F2F58] uppercase tracking-wider">
                                    Participating Slots ({slots.length + 1})
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">Tap to inspect</span>
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                                {/* Primary Listing Anchor (Fixed Center) */}
                                <div
                                    onClick={() => setSelectedSlotId('node-primary-anchor')}
                                    className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border p-2.5 transition-all ${
                                        selectedSlotId === 'node-primary-anchor'
                                            ? 'border-[#0D715F] bg-[#E8F7F1]/30 shadow-xs ring-1 ring-[#0D715F]'
                                            : 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[#0D715F] text-[9.5px] font-extrabold text-white">
                                                ★
                                            </span>
                                            <span className="text-xs font-extrabold text-[#0F2F58] truncate">
                                                {primaryListingTitle || 'Your Offering'}
                                            </span>
                                        </div>
                                        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-[#0D715F]">
                                            PRIMARY
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10.5px]">
                                        <span className="text-slate-500 font-medium">This Listing (Anchor)</span>
                                        <span className="font-mono font-bold text-[#0F2F58]">
                                            ₱{primaryListingPricePesos.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Dynamic Partner Slots */}
                                {slots.map((slot, idx) => {
                                    const isSelected = slot.id === selectedSlotId;
                                    const feePesos = (slot.feeMinor || 0) / 100;

                                    return (
                                        <div
                                            key={slot.id || idx}
                                            onClick={() => {
                                                if (slot.id) setSelectedSlotId(slot.id);
                                                if (inspectorTab === 'catalog') setInspectorTab('configure');
                                            }}
                                            className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-xl border p-2.5 transition-all ${
                                                isSelected && inspectorTab !== 'catalog'
                                                    ? 'border-[#0F2F58] bg-[#FAFCFB] shadow-xs ring-1 ring-[#0F2F58]'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-1.5">
                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                    <span className="flex size-5 shrink-0 items-center justify-center rounded bg-slate-100 font-mono text-[10px] font-extrabold text-slate-700">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="truncate text-xs font-extrabold text-slate-900">
                                                                {slot.name}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 font-medium">
                                                            {slot.role}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Reorder and Delete Controls */}
                                                <div
                                                    className="flex shrink-0 items-center gap-0.5"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        type="button"
                                                        disabled={idx === 0}
                                                        onClick={() => handleReorder(idx, 'up')}
                                                        title="Move step up"
                                                        aria-label="Move slot up"
                                                        className="flex size-6 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                                                    >
                                                        <ArrowUp className="size-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={idx === slots.length - 1}
                                                        onClick={() => handleReorder(idx, 'down')}
                                                        title="Move step down"
                                                        aria-label="Move slot down"
                                                        className="flex size-6 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                                                    >
                                                        <ArrowDown className="size-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => slot.id && handleRemoveSlot(slot.id)}
                                                        title="Delete slot"
                                                        aria-label="Delete slot"
                                                        className="flex size-6 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                    >
                                                        <Trash2 className="size-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Slot Sub-bar */}
                                            <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-[10.5px]">
                                                <span className="text-slate-500">
                                                    {slot.isOpenSlot ? (
                                                        <span className="font-bold text-amber-700">Open Slot · Buyer Chooses</span>
                                                    ) : (
                                                        <span>Bound Partner Listing</span>
                                                    )}
                                                </span>
                                                <span className="font-mono font-bold text-emerald-800">
                                                    ₱{feePesos.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-1.5" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRunInParallel(idx)}
                                                    disabled={slots.length < 2}
                                                    className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800 disabled:opacity-40"
                                                >
                                                    Run in Parallel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMakeSequential(idx)}
                                                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700"
                                                >
                                                    Make Sequential
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add Step Buttons at Bottom of Left Pane */}
                            <div className="mt-2.5 flex flex-col gap-1.5 border-t border-slate-100 pt-2.5">
                                <button
                                    type="button"
                                    onClick={() => setInspectorTab('catalog')}
                                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#0F2F58] bg-[#EBF2FA]/40 py-2 text-xs font-bold text-[#0F2F58] hover:bg-[#EBF2FA]"
                                >
                                    <Plus className="size-3.5" />
                                    <span>+ Add Partner Step from Library</span>
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Slot Inspector Panel */}
                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 md:w-7/12 lg:w-8/12" style={{ scrollbarWidth: 'thin' }}>
                            {/* Inspector Navigation Tabs */}
                            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setInspectorTab('configure')}
                                        className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                                            inspectorTab === 'configure'
                                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        Configure Slot
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInspectorTab('catalog')}
                                        className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                                            inspectorTab === 'catalog'
                                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        From Slot Library
                                    </button>
                                </div>

                                {selectedSlot && (
                                    <span className="text-[10.5px] font-bold text-slate-400">
                                        ID: {selectedSlot.id?.slice(0, 14)}…
                                    </span>
                                )}
                            </div>

                            {/* TAB 1: Slot Configuration */}
                            {inspectorTab === 'configure' && (
                                <>
                                    {selectedGateId ? (
                                        <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4" data-testid="dependency-gate-inspector">
                                            <div>
                                                <h4 className="text-sm font-extrabold text-emerald-900">Dependency Gate Inspector</h4>
                                                <p className="mt-1 text-xs text-slate-600">Wait for all inbound parallel nodes before this step can proceed.</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-700">Inbound nodes</label>
                                                <ul className="mt-1 space-y-1">
                                                    {previewNodes
                                                        .filter((node) => node.tier === (previewNodes.find((item) => item.id === selectedSlotId)?.tier ?? 0) - 1)
                                                        .map((node) => <li key={node.id} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">{node.title}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <label htmlFor="gate-condition-code" className="text-xs font-bold text-slate-700">Condition code</label>
                                                <select
                                                    id="gate-condition-code"
                                                    value={selectedSlot?.conditionCode || gateConditionCode || 'all_inputs_ready'}
                                                    onChange={(e) => selectedSlot ? handleUpdateSelectedSlot({ conditionCode: e.target.value }) : (setGateConditionCode(e.target.value), setIsModified(true))}
                                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-800"
                                                >
                                                    <option value="all_inputs_ready">All inputs ready (all_inputs_ready)</option>
                                                    <option value="source_ready">Item ready for pickup (source_ready)</option>
                                                    <option value="delivered_to_site">Delivered to site (delivered_to_site)</option>
                                                    <option value="work_completed">Work completed (work_completed)</option>
                                                    <option value="audit_cleared">Audit passed (audit_cleared)</option>
                                                </select>
                                            </div>
                                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(selectedSlot ? selectedSlot.allowBypass : gateAllowBypass)}
                                                    onChange={(e) => selectedSlot ? handleUpdateSelectedSlot({ allowBypass: e.target.checked }) : (setGateAllowBypass(e.target.checked), setIsModified(true))}
                                                    className="size-4 accent-emerald-700"
                                                />
                                                Allow customer bypass
                                            </label>
                                        </div>
                                    ) : selectedSlotId === 'node-primary-anchor' ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#0D715F]">
                                                <Store className="size-6" />
                                            </div>
                                            <h4 className="mt-3 text-sm font-extrabold text-[#0F2F58]">
                                                Primary Listing Anchor
                                            </h4>
                                            <p className="mt-1 max-w-sm text-xs text-slate-500">
                                                This step is anchored to your current listing ({primaryListingTitle}). Its price and work execution are governed in Step 1 and Step 2 of the builder.
                                            </p>
                                        </div>
                                    ) : selectedSlot ? (
                                        <div className="space-y-4">
                                            {/* Role & Name */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700">
                                                    Slot Title & Role
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={selectedSlot.name}
                                                        onChange={(e) => handleUpdateSelectedSlot({ name: e.target.value })}
                                                        className="flex-1 rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2 text-xs font-extrabold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                                    />
                                                    <select
                                                        value={selectedSlot.type}
                                                        onChange={(e) => handleUpdateSelectedSlot({ type: e.target.value as SlotType })}
                                                        className="rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#0F2F58]"
                                                    >
                                                        <option value="store">Store / Parts</option>
                                                        <option value="delivery">Courier / Transit</option>
                                                        <option value="installation">Labor / Tech</option>
                                                        <option value="audit">Safety / Audit</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Partner Assignment Mode: Bound Listing vs Open Slot */}
                                            <div className="space-y-2 rounded-xl border border-slate-200 bg-[#FAFCFB] p-3.5">
                                                <label className="text-xs font-bold text-slate-800">
                                                    Partner Assignment Mode
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateSelectedSlot({ isOpenSlot: false })}
                                                        className={`flex cursor-pointer flex-col rounded-lg border p-2.5 text-left transition-all ${
                                                            !selectedSlot.isOpenSlot
                                                                ? 'border-[#0F2F58] bg-white shadow-2xs ring-1 ring-[#0F2F58]'
                                                                : 'border-slate-200 bg-white/60 hover:bg-white'
                                                        }`}
                                                    >
                                                        <span className="text-[11px] font-extrabold text-[#0F2F58]">
                                                            Bound Tagudin Partner
                                                        </span>
                                                        <span className="mt-0.5 text-[9.5px] text-slate-500">
                                                            Pre-selected verified listing
                                                        </span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateSelectedSlot({ isOpenSlot: true, listingId: undefined })}
                                                        className={`flex cursor-pointer flex-col rounded-lg border p-2.5 text-left transition-all ${
                                                            selectedSlot.isOpenSlot
                                                                ? 'border-[#0F2F58] bg-white shadow-2xs ring-1 ring-[#0F2F58]'
                                                                : 'border-slate-200 bg-white/60 hover:bg-white'
                                                        }`}
                                                    >
                                                        <span className="text-[11px] font-extrabold text-amber-900">
                                                            Open Role Slot
                                                        </span>
                                                        <span className="mt-0.5 text-[9.5px] text-slate-500">
                                                            Buyer chooses partner at cart
                                                        </span>
                                                    </button>
                                                </div>

                                                {!selectedSlot.isOpenSlot && (
                                                    <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2">
                                                        <div className="flex items-center gap-2">
                                                            {selectedSlot.coverThumbnailUrl && (
                                                                <img
                                                                    src={selectedSlot.coverThumbnailUrl}
                                                                    alt=""
                                                                    className="size-8 rounded-md object-cover border border-slate-200"
                                                                />
                                                            )}
                                                            <div>
                                                                <div className="text-xs font-bold text-slate-900 truncate">
                                                                    {selectedSlot.name}
                                                                </div>
                                                                <div className="text-[10px] text-slate-500">
                                                                    {selectedSlot.meta}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleBindListing}
                                                            className="rounded-lg bg-[#0F2F58] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#1A3D6E]"
                                                        >
                                                            Change Partner ▾
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Estimated Partner Fee / Budget */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700">
                                                    Estimated Partner Fee (₱)
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-extrabold text-slate-500">₱</span>
                                                    <input
                                                        type="number"
                                                        value={Math.round((selectedSlot.feeMinor || 0) / 100)}
                                                        onChange={(e) =>
                                                            handleUpdateSelectedSlot({
                                                                feeMinor: Math.round((parseFloat(e.target.value) || 0) * 100),
                                                            })
                                                        }
                                                        className="w-32 rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-1.5 font-mono text-xs font-extrabold text-[#0F2F58] outline-none focus:border-[#0F2F58] focus:bg-white"
                                                    />
                                                    <span className="text-[11px] text-slate-400">
                                                        Budgeted fee allocated to this partner at checkout
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Coordination Dependency Gate */}
                                            <div className="space-y-2 rounded-xl border border-slate-200 bg-[#FAFCFB] p-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    <CheckCircle2 className="size-3.5 text-[#10B981]" />
                                                    <label className="text-xs font-bold text-slate-800">
                                                        Dependency Gate &amp; Unblocking Condition
                                                    </label>
                                                </div>
                                                <p className="text-[11px] text-slate-500">
                                                    This partner node remains blocked until the predecessor step emits verified evidence.
                                                </p>
                                                <div className="grid grid-cols-2 gap-2 pt-1">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-600 uppercase">
                                                            Condition Code:
                                                        </span>
                                                        <select
                                                            value={selectedSlot.conditionCode || 'source_ready'}
                                                            onChange={(e) => handleUpdateSelectedSlot({ conditionCode: e.target.value })}
                                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-[#0F2F58]"
                                                        >
                                                            <option value="source_ready">Item Ready for Pickup (source_ready)</option>
                                                            <option value="delivered_to_site">Delivered to Site (delivered_to_site)</option>
                                                            <option value="work_completed">Predecessor Work Done (work_completed)</option>
                                                            <option value="audit_cleared">Safety Audit Passed (audit_cleared)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-600 uppercase">
                                                            Customer Bypass:
                                                        </span>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                id="allow-bypass-cb"
                                                                checked={Boolean(selectedSlot.allowBypass)}
                                                                onChange={(e) => handleUpdateSelectedSlot({ allowBypass: e.target.checked })}
                                                                className="size-4 rounded accent-[#0F2F58]"
                                                            />
                                                            <label htmlFor="allow-bypass-cb" className="text-xs text-slate-700">
                                                                Allow buyer to supply own
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-10 text-center text-xs text-slate-400">
                                            Select a slot from the left list to configure.
                                        </div>
                                    )}
                                </>
                            )}

                            {/* TAB 2: Slot Library & Archetypes */}
                            {inspectorTab === 'catalog' && (
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0F2F58]">
                                            Tagudin Partner Slot Library
                                        </h4>
                                        <p className="text-[11px] text-slate-500">
                                            Insert a pre-configured partner archetype into your Deal Chain graph.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                        {NODE_ROLE_PRESETS.map((preset) => (
                                            <div
                                                key={preset.slotType}
                                                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-[#0F2F58] transition-all"
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <span
                                                            className="rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase"
                                                            style={{ background: preset.bg, color: preset.color }}
                                                        >
                                                            {preset.roleBadge}
                                                        </span>
                                                        <span className="font-mono text-xs font-bold text-emerald-800">
                                                            +₱{preset.defaultFeePesos}
                                                        </span>
                                                    </div>
                                                    <h5 className="mt-1 text-xs font-extrabold text-slate-900">
                                                        {preset.roleLabel}
                                                    </h5>
                                                    <p className="mt-0.5 text-[10.5px] text-slate-500 line-clamp-2">
                                                        {preset.description}
                                                    </p>
                                                </div>

                                                <div className="mt-3 flex gap-1.5 pt-2 border-t border-slate-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddSlot(preset, false)}
                                                        className="flex-1 rounded-lg bg-[#0F2F58] py-1 text-[10.5px] font-bold text-white hover:bg-[#1A3D6E]"
                                                    >
                                                        + Sequential Step
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddSlot(preset, true)}
                                                        title="Runs concurrently with currently selected slot"
                                                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 py-1 text-[10.5px] font-bold text-slate-700 hover:bg-slate-100"
                                                    >
                                                        + Parallel Branch
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Action Dock */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 font-semibold">
                                Total Partner Addon:{' '}
                                <strong className="font-mono text-sm font-extrabold text-[#0F2F58]">
                                    ₱{(totalPartnerMinor / 100).toFixed(2)}
                                </strong>
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-xs text-slate-500 font-semibold">
                                {slots.length + 1} Coordinated Nodes
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveChain}
                                className="rounded-xl bg-[#FFC72C] px-5 py-2 text-xs font-extrabold text-slate-950 shadow-xs hover:bg-[#e6b327]"
                            >
                                Apply Deal Chain to Listing
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
