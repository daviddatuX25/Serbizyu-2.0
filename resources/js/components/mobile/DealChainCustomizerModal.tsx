import { useEffect, useId, useMemo, useState } from 'react';
import {
    ArrowDown,
    ArrowUp,
    CheckCircle2,
    Plus,
    RotateCcw,
    SlidersHorizontal,
    Sparkles,
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

import { savedCombinationSlots } from '../../marketplace/dealChainRecipes';

export interface DealChainCustomizerModalProps {
    open: boolean;
    onClose: () => void;
    combination: DealChainCombination | null;
    primaryListingTitle: string;
    primaryListingPricePesos: number;
    primaryListingType: 'service' | 'product';
    primaryListingCategoryCode: string;
    onSave: (updated: DealChainCombination) => void;
    onPickPartnerForSlot: (
        slotType: SlotType,
        onPicked: (partner: {
            id: string;
            title: string;
            providerName: string;
            priceMinor?: number | null;
            listingVersionId?: string | null;
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
        defaultName: 'Choose a store / parts listing',
        bg: '#FEF3C7',
        color: '#B45309',
        position: 'before',
        tier: 0,
        conditionCode: 'all_inputs_ready',
        description: 'Parts or materials procured from a merchant counter or warehouse stall.',
    },
    {
        slotType: 'delivery',
        roleBadge: 'COURIER',
        roleLabel: 'Doorstep Courier Runner',
        defaultName: 'Choose a delivery listing',
        bg: '#E0F2FE',
        color: '#0284C7',
        position: 'before',
        tier: 1,
        conditionCode: 'all_inputs_ready',
        description: 'Rapid on-demand transit of items from store/merchant directly to jobsite.',
    },
    {
        slotType: 'installation',
        roleBadge: 'LABOR',
        roleLabel: 'Co-Labor / Technician Partner',
        defaultName: 'Choose a labor / installation listing',
        bg: '#DCFCE7',
        color: '#15803D',
        position: 'after',
        tier: 2,
        conditionCode: 'all_inputs_ready',
        description: 'Specialized trade labor performing on-site service installation or prep.',
    },
    {
        slotType: 'audit',
        roleBadge: 'AUDIT',
        roleLabel: 'Certified Safety & Quality Auditor',
        defaultName: 'Choose an audit listing',
        bg: '#F3E8FF',
        color: '#7E22CE',
        position: 'after',
        tier: 3,
        conditionCode: 'all_inputs_ready',
        description: 'Independent inspection certifying safety clearance, electrical integrity, or code compliance.',
    },
    {
        slotType: 'recycle',
        roleBadge: 'RECYCLE',
        roleLabel: 'Recycling / Hauling Partner',
        defaultName: 'Choose a recycling listing',
        bg: '#DCFCE7',
        color: '#15803D',
        position: 'after',
        tier: 3,
        conditionCode: 'all_inputs_ready',
        description: 'Collect and recycle eligible materials through a real provider listing.',
    },
];

/** Display hint only; publication and staging validate the bound listing on the server. */
function primaryNodeType(listingType: 'service' | 'product', categoryCode: string, title: string): string {
    if (listingType === 'product') return 'store';
    const category = categoryCode.trim().toLowerCase();
    const name = title.trim().toLowerCase();
    if (['courier', 'delivery', 'logistics'].includes(category) || name.includes('courier') || name.includes('delivery')) return 'delivery';
    if (name.includes('audit') || category.includes('safety') || category.includes('audit')) return 'audit';
    if (name.includes('recycle') || name.includes('scrap') || category.includes('recycle')) return 'recycle';
    return 'labor';
}

function canonicalNodeType(type: SlotType | DealChainNode['type']): DealChainNode['type'] {
    switch (type) {
        case 'store':
        case 'parts':
        case 'product':
            return 'store';
        case 'delivery':
        case 'courier':
            return 'delivery';
        case 'installation':
        case 'service':
        case 'diagnostic':
        case 'tools':
            return 'labor';
        case 'hauling':
        case 'recycle':
            return 'recycle';
        default:
            return type;
    }
}

function roleLabel(type: SlotType): string {
    switch (type) {
        case 'store':
        case 'parts':
            return 'Store / Parts Partner';
        case 'delivery':
            return 'Courier / Transit Partner';
        case 'installation':
        case 'diagnostic':
        case 'tools':
            return 'Labor / Technician Partner';
        case 'audit':
            return 'Safety / Audit Partner';
        case 'hauling':
        case 'recycle':
            return 'Recycling / Hauling Partner';
    }
}

function conditionForSave(conditionCode: string | undefined): string | undefined {
    return conditionCode === 'source_ready' ? 'part_ready'
        : conditionCode === 'delivered_to_site' ? 'delivery_signed'
            : conditionCode === 'completed' ? 'work_completed' : conditionCode;
}

function conditionMatchesSource(conditionCode: string | undefined, predecessorType: DealChainNode['type']): boolean {
    const condition = conditionForSave(conditionCode);
    return condition === 'work_completed'
        || condition === 'part_ready' && canonicalNodeType(predecessorType) === 'store'
        || condition === 'delivery_signed' && canonicalNodeType(predecessorType) === 'delivery';
}

function unresolvedRoleConditions(nodes: DealChainNode[], dependencies: DealChainCombination['dependencies']): boolean {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    return (dependencies ?? []).some((edge) => {
        if (edge.status === 'removed') return false;
        const predecessor = byId.get(edge.predecessorId);
        return !predecessor || !conditionMatchesSource(edge.conditionCode, predecessor.type);
    });
}

function updatedSavedGraph(
    combination: DealChainCombination,
    nodes: DealChainNode[],
    slots: PartnerSlot[],
    gateConditionCode: string | undefined,
    editedConditionIds: Set<string>,
    primaryConditionEdited: boolean,
): DealChainCombination['dependencies'] {
    const conditions = new Map(slots
        .filter((slot) => slot.id && editedConditionIds.has(slot.id))
        .map((slot) => [slot.id!, slot.conditionCode] as const));
    const primaryId = combination.nodes.find((node) => node.isPrimary)?.id;
    if (primaryId && primaryConditionEdited) conditions.set(primaryId, gateConditionCode);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    return (combination.dependencies ?? []).map((edge) => {
        if (edge.status === 'removed') return edge;
        const selectedCondition = conditions.get(edge.successorId);
        if (!selectedCondition) return edge;
        const predecessor = byId.get(edge.predecessorId);
        const conditionCode = selectedCondition === 'all_inputs_ready' && predecessor
            ? canonicalNodeType(predecessor.type) === 'store' ? 'part_ready'
                : canonicalNodeType(predecessor.type) === 'delivery' ? 'delivery_signed' : 'work_completed'
            : conditionForSave(selectedCondition);
        return conditionCode ? { ...edge, conditionCode } : edge;
    });
}

function rebuildNodesFromSlots(
    slots: PartnerSlot[],
    primaryTitle: string,
    primaryPricePesos: number,
    primaryListingType: 'service' | 'product',
    primaryCategoryCode: string,
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
        const feePesos = typeof slot.feeMinor === 'number' ? slot.feeMinor / 100 : null;

        return {
            id: slot.id || `node-${slot.type}-${idx}`,
            role: isStore ? 'STORE' : isCourier ? 'COURIER' : isAudit ? 'AUDIT' : 'LABOR',
            title: slot.isOpenSlot
                ? 'Open Partner Slot'
                : slot.name.length > 18
                  ? `${slot.name.slice(0, 17)}…`
                  : slot.name,
            sub: slot.isOpenSlot ? 'Buyer picks' : feePesos === null ? 'Partner fee unavailable' : `₱${feePesos.toFixed(2)}`,
            type: slot.type,
            bg: isStore || isAudit ? '#FEF3C7' : isCourier ? '#E0F2FE' : '#ECFDF5',
            color: isStore || isAudit ? '#B45309' : isCourier ? '#0284C7' : '#059669',
            listingId: slot.listingId,
            listingVersionId: slot.listingVersionId,
            feeMinor: slot.feeMinor,
            coverThumbnailUrl: slot.coverThumbnailUrl,
            tier: slot.tier,
            conditionCode: slot.conditionCode,
            isPrimary: false,
            isOpenSlot: slot.isOpenSlot,
            assignmentMode: slot.assignmentMode,
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
        type: primaryNodeType(primaryListingType, primaryCategoryCode, primaryTitle),
        bg: '#ECFDF5',
        color: '#059669',
        tier: primaryListingType === 'product' ? 0 : Math.max(-1, ...beforeSlots.map((slot) => slot.tier ?? 0)) + 1,
        isPrimary: true,
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
    primaryListingCategoryCode,
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
    const [conditionEditedIds, setConditionEditedIds] = useState<Set<string>>(() => new Set());
    const [primaryConditionEdited, setPrimaryConditionEdited] = useState(false);
    const [graphModified, setGraphModified] = useState(false);
    useEffect(() => {
        if (open && combination) {
            setGraphModified(combination.planVersion !== 1);
            setConditionEditedIds(new Set());
            setPrimaryConditionEdited(false);
            const incomingCondition = (nodeId: string | undefined) => {
                const codes = [...new Set((combination.dependencies ?? [])
                    .filter((edge) => edge.status !== 'removed' && edge.successorId === nodeId)
                    .map((edge) => edge.conditionCode))];
                return codes.length === 1 ? codes[0] : 'all_inputs_ready';
            };
            setTitle(combination.title);
            const normalizedSlots = savedCombinationSlots(combination).map((s, idx) => ({
                ...s,
                id: s.id || `slot-${s.type}-${idx}-${Date.now()}`,
                tier: typeof s.tier === 'number' ? s.tier : idx,
                conditionCode: s.conditionCode || incomingCondition(s.id) || 'all_inputs_ready',
            }));
            setSlots(normalizedSlots);
            const primaryNode = combination.nodes.find((node) => node.isPrimary);
            setGateConditionCode(primaryNode?.conditionCode || incomingCondition(primaryNode?.id));
            setGateAllowBypass(Boolean(primaryNode?.allowBypass));
            setSelectedSlotId(normalizedSlots[0]?.id || primaryNode?.id || 'node-primary-anchor');
            setIsModified(Boolean(combination.isCustom));
        } else if (open && !combination) {
            setGraphModified(true);
            setConditionEditedIds(new Set());
            setPrimaryConditionEdited(false);
            setGateConditionCode(undefined);
            setGateAllowBypass(false);
            const defaultSlot: PartnerSlot = {
                id: `slot-delivery-${Date.now()}`,
                type: 'delivery',
                role: 'Doorstep Courier Runner',
                name: 'Choose a delivery listing',
                meta: 'Choose a compatible partner listing',
                feeMinor: null,
                tier: 1,
                conditionCode: primaryListingType === 'product' ? 'part_ready' : 'work_completed',
            };
            setSlots([defaultSlot]);
            setSelectedSlotId(defaultSlot.id ?? null);
            setIsModified(true);
        }
    }, [open, combination]);

    const primaryNodeId = combination?.nodes.find((node) => node.isPrimary)?.id || 'node-primary-anchor';
    const previewNodes = useMemo(() => {
        if (!graphModified && combination?.planVersion === 1) {
            return combination.nodes.map((node) => {
                if (node.isPrimary) return {
                    ...node,
                    title: primaryListingTitle.trim() || node.title,
                    conditionCode: gateConditionCode,
                };
                const slot = slots.find((candidate) => candidate.id === node.id);
                if (!slot) return node;
                const type = canonicalNodeType(slot.type);
                const changedRole = type !== canonicalNodeType(node.type);
                return {
                    ...node,
                    type: changedRole ? type : node.type,
                    role: changedRole ? roleLabel(slot.type) : node.role,
                    title: changedRole && !slot.listingId ? `Choose ${roleLabel(slot.type)}` : slot.name,
                    sub: changedRole && !slot.listingId ? '' : slot.meta,
                    listingId: slot.listingId,
                    listingVersionId: slot.listingVersionId,
                    feeMinor: slot.feeMinor,
                    assignmentMode: slot.assignmentMode,
                    isOpenSlot: slot.isOpenSlot,
                    tier: node.tier,
                    conditionCode: slot.conditionCode,
                };
            });
        }
        return rebuildNodesFromSlots(slots, primaryListingTitle, primaryListingPricePesos, primaryListingType, primaryListingCategoryCode)
            .map((node) => node.isPrimary ? { ...node, id: primaryNodeId, conditionCode: gateConditionCode } : node);
    }, [slots, primaryListingTitle, primaryListingPricePesos, primaryListingType, primaryListingCategoryCode, gateConditionCode, combination, graphModified, primaryNodeId]);

    const selectedSlot = useMemo(() => {
        return slots.find((s) => s.id === selectedSlotId) || null;
    }, [slots, selectedSlotId]);

    const totalPartnerMinor = useMemo(() => {
        if (slots.some((slot) => typeof slot.feeMinor !== 'number')) return null;
        return slots.reduce((sum, slot) => sum + slot.feeMinor!, 0);
    }, [slots]);

    const supportedEditorGates = ['all_inputs_ready', 'part_ready', 'delivery_signed', 'work_completed', 'source_ready', 'delivered_to_site'];
    const projectedDependencies = !graphModified && combination?.planVersion === 1
        ? updatedSavedGraph(combination, previewNodes, slots, gateConditionCode, conditionEditedIds, primaryConditionEdited)
        : undefined;
    const hasUnsupportedSavedGate = gateAllowBypass
        || slots.some((slot) => slot.allowBypass || (slot.conditionCode && !supportedEditorGates.includes(slot.conditionCode)))
        || previewNodes.some((node) => node.allowBypass || (node.conditionCode && !supportedEditorGates.includes(node.conditionCode)))
        || (!graphModified && (projectedDependencies ?? []).some((edge) => edge.status !== 'removed' && !['part_ready', 'delivery_signed', 'work_completed'].includes(edge.conditionCode ?? '')))
        || unresolvedRoleConditions(previewNodes, projectedDependencies)
        || slots.some((slot) => slot.assignmentMode === 'preferred_partner' && !slot.listingId);
    if (!open) return null;

    const handleAddSlot = (preset: (typeof NODE_ROLE_PRESETS)[number], isParallel = false) => {
        const nextId = `slot-${preset.slotType}-${Date.now()}`;
        const maxTier = Math.max(-1, ...slots.map((slot) => slot.tier ?? 0));
        const targetTier = isParallel && selectedSlot ? (selectedSlot.tier ?? 0) : maxTier + 1;
        const nextSlot: PartnerSlot = {
            id: nextId,
            type: preset.slotType,
            role: preset.roleLabel,
            name: preset.defaultName,
            meta: 'Choose a compatible partner listing',
            feeMinor: null,
            tier: targetTier,
            conditionCode: preset.conditionCode,
        };
        setSlots((prev) => [...prev, nextSlot]);
        setGraphModified(true);
        setSelectedSlotId(nextId);
        setInspectorTab('configure');
        setIsModified(true);
    };

    const handleRemoveSlot = (slotId: string) => {
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
        setGraphModified(true);
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
        setGraphModified(true);
        setIsModified(true);
    };

    const handleRunInParallel = (index: number) => {
        const siblingIndex = index > 0 ? index - 1 : index + 1;
        const sibling = slots[siblingIndex];
        if (!sibling) return;
        const targetTier = sibling.tier ?? 0;
        setSlots((prev) => prev.map((slot, i) => i === index ? { ...slot, tier: targetTier } : slot));
        setGraphModified(true);
        setIsModified(true);
    };

    const handleMakeSequential = (index: number) => {
        const slot = slots[index];
        if (!slot) return;
        const targetTier = (slot.tier ?? 0) + 1;
        setGraphModified(true);
        setSlots((prev) => prev.map((item, i) => {
            if (i === index) return { ...item, tier: targetTier };
            return (item.tier ?? 0) >= targetTier ? { ...item, tier: (item.tier ?? 0) + 1 } : item;
        }));
        setIsModified(true);
    };

    const handleUpdateSelectedSlot = (patch: Partial<PartnerSlot>) => {
        if (!selectedSlotId) return;
        if ('tier' in patch || 'predecessorIds' in patch) setGraphModified(true);
        if ('conditionCode' in patch && selectedSlotId) setConditionEditedIds((prev) => new Set(prev).add(selectedSlotId));
        setSlots((prev) => prev.map((slot) => {
            if (slot.id !== selectedSlotId) return slot;
            if ('type' in patch && patch.type && canonicalNodeType(patch.type) !== canonicalNodeType(slot.type)) {
                return {
                    ...slot,
                    ...patch,
                    role: roleLabel(patch.type),
                    name: `Choose ${roleLabel(patch.type)}`,
                    meta: '',
                    listingId: undefined,
                    feeMinor: undefined,
                    listingVersionId: undefined,
                    coverThumbnailUrl: undefined,
                    isOpenSlot: false,
                    assignmentMode: 'preferred_partner',
                };
            }
            return { ...slot, ...patch };
        }));
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
                    : typeof picked.priceMinor === 'number'
                        ? `₱${(picked.priceMinor / 100).toFixed(2)} partner fee`
                        : 'Partner fee unavailable',
                listingId: picked.isOpenSlot ? undefined : picked.id,
                listingVersionId: picked.isOpenSlot ? undefined : picked.listingVersionId ?? null,
                feeMinor: picked.isOpenSlot ? undefined : picked.priceMinor,
                isOpenSlot: Boolean(picked.isOpenSlot),
                assignmentMode: picked.isOpenSlot ? 'buyer_choice' : 'preferred_partner',
            });
        });
    };

    const handleSaveChain = () => {
        const baseId = combination?.id || `combo-custom-${Date.now()}`;
        const basedOnTitle = combination?.basedOnTitle || (combination && !combination.isCustom ? combination.title : undefined);
        const nodes = previewNodes.map((sourceNode) => {
            const node = { ...sourceNode };
            delete node.conditionCode;
            delete node.allowBypass;
            return node;
        });
        const dependencies = !graphModified && combination?.planVersion === 1
            ? updatedSavedGraph(combination, nodes, slots, gateConditionCode, conditionEditedIds, primaryConditionEdited)
            : (() => {
                const tierList = [...new Set(nodes.map((node) => node.tier ?? 0))].sort((a, b) => a - b);
                return tierList.slice(1).flatMap((tier, tierIndex) => {
                    const predecessors = nodes.filter((node) => (node.tier ?? 0) === tierList[tierIndex]);
                    const successors = nodes.filter((node) => (node.tier ?? 0) === tier);
                    return predecessors.flatMap((predecessor) => successors.map((successor) => {
                        const raw = previewNodes.find((node) => node.id === successor.id)?.conditionCode || 'all_inputs_ready';
                        const conditionCode = raw === 'all_inputs_ready'
                            ? predecessor.type === 'store' && successor.type === 'delivery' ? 'part_ready'
                                : predecessor.type === 'delivery' ? 'delivery_signed' : 'work_completed'
                            : conditionForSave(raw) || 'work_completed';
                        return {
                            id: `edge-${predecessor.id}-${successor.id}`,
                            predecessorId: predecessor.id!,
                            successorId: successor.id!,
                            conditionCode,
                            dependencyType: 'blocks' as const,
                            status: 'active' as const,
                        };
                    }));
                });
            })();
        const updated: DealChainCombination = {
            id: baseId,
            title: title.trim() || 'Custom Partnered Deal Chain',
            icon: combination?.icon || 'Sliders',
            isDefault: combination?.isDefault ?? true,
            planVersion: 1,
            recipeId: combination?.recipeId || 'custom_chain',
            catalogVersion: combination?.catalogVersion || 1,
            isCustom: true,
            basedOnTitle,
            nodes,
            slots: slots.map((slot) => {
                const cleanSlot = { ...slot };
                delete cleanSlot.allowBypass;
                return { ...cleanSlot, conditionCode: conditionForSave(slot.conditionCode) };
            }),
            dependencies,
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
                                dependencies={!graphModified && combination?.planVersion === 1 ? projectedDependencies : undefined}
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
                                    onClick={() => setSelectedSlotId(primaryNodeId)}
                                    className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border p-2.5 transition-all ${
                                        selectedSlotId === primaryNodeId
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
                                    const feePesos = typeof slot.feeMinor === 'number' ? slot.feeMinor / 100 : null;

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
                                                    {slot.assignmentMode === 'open_pool' ? (
                                                        <span className="font-bold text-indigo-700">⚡ Community Pool · Tagudin Dispatch</span>
                                                    ) : slot.assignmentMode === 'buyer_choice' || slot.isOpenSlot ? (
                                                        <span className="font-bold text-amber-700">🛒 Open Slot · Buyer Chooses</span>
                                                    ) : (
                                                        <span>Preferred Partner Listing</span>
                                                    )}
                                                </span>
                                                <span className="font-mono font-bold text-emerald-800">
                                                    {feePesos === null ? 'Not selected' : `₱${feePesos.toFixed(2)}`}
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
                                                        .filter((node) => combination?.dependencies?.length
                                                            ? combination.dependencies.some((edge) => edge.status !== 'removed' && edge.predecessorId === node.id && edge.successorId === selectedSlotId)
                                                            : node.tier === (previewNodes.find((item) => item.id === selectedSlotId)?.tier ?? 0) - 1)
                                                        .map((node) => <li key={node.id} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">{node.title}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <label htmlFor="gate-condition-code" className="text-xs font-bold text-slate-700">Condition code</label>
                                                <select
                                                    id="gate-condition-code"
                                                    value={selectedSlot?.conditionCode || gateConditionCode || 'all_inputs_ready'}
                                                    onChange={(e) => {
                                                        if (selectedSlot) {
                                                            handleUpdateSelectedSlot({ conditionCode: e.target.value });
                                                        } else {
                                                            setGateConditionCode(e.target.value);
                                                            setPrimaryConditionEdited(true);
                                                            setIsModified(true);
                                                        }
                                                    }}
                                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-800"
                                                >
                                                    {(() => {
                                                        const condition = selectedSlot?.conditionCode || gateConditionCode || 'all_inputs_ready';
                                                        return !supportedEditorGates.includes(condition)
                                                            ? <option value={condition} disabled>Unsupported saved condition: {condition}</option>
                                                            : null;
                                                    })()}
                                                    <option value="all_inputs_ready">All inputs ready (all_inputs_ready)</option>
                                                    <option value="part_ready">Item ready for pickup (part_ready)</option>
                                                    <option value="delivery_signed">Delivered to site (delivery_signed)</option>
                                                    <option value="work_completed">Work completed (work_completed)</option>
                                                </select>
                                                {(() => {
                                                    const condition = selectedSlot?.conditionCode || gateConditionCode || 'all_inputs_ready';
                                                    return !supportedEditorGates.includes(condition)
                                                        ? <p className="mt-1 text-[11px] font-semibold text-amber-800">Unsupported saved condition; choose a supported condition to apply.</p>
                                                        : null;
                                                })()}
                                            </div>
                                            {selectedSlot?.allowBypass || gateAllowBypass ? (
                                                <div className="flex items-center justify-between gap-2 text-xs text-amber-800">
                                                    <span>Unsupported saved bypass</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => selectedSlot
                                                            ? handleUpdateSelectedSlot({ allowBypass: false })
                                                            : (setGateAllowBypass(false), setIsModified(true))}
                                                        className="rounded-md border border-amber-300 bg-white px-2 py-1 font-bold"
                                                    >
                                                        Remove bypass
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : selectedSlotId === primaryNodeId ? (
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
                                                <label htmlFor="slot-role-type" className="text-xs font-bold text-slate-700">
                                                    Slot Title &amp; Role
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={selectedSlot.name}
                                                        onChange={(e) => handleUpdateSelectedSlot({ name: e.target.value })}
                                                        className="flex-1 rounded-xl border border-slate-200 bg-[#FAFCFB] px-3.5 py-2 text-xs font-extrabold text-slate-900 outline-none focus:border-[#0F2F58] focus:bg-white"
                                                    />
                                                    <select
                                                        id="slot-role-type"
                                                        aria-label="Partner role"
                                                        value={selectedSlot.type}
                                                        onChange={(e) => handleUpdateSelectedSlot({ type: e.target.value as SlotType })}
                                                        className="rounded-xl border border-slate-200 bg-[#FAFCFB] px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#0F2F58]"
                                                    >
                                                        <option value="store">Store / Parts</option>
                                                        <option value="delivery">Courier / Transit</option>
                                                        <option value="installation">Labor / Tech</option>
                                                        <option value="audit">Safety / Audit</option>
                                                        <option value="recycle">Recycle / Hauling</option>
                                                    </select>
                                                </div>
                                            </div>
                                            {selectedSlot.assignmentMode === 'preferred_partner' && !selectedSlot.listingId && (
                                                <p role="alert" className="text-[11px] font-semibold text-amber-800">
                                                    Choose a compatible partner listing to continue.
                                                </p>
                                            )}

                                            {/* Partner Assignment Mode: Bound Listing vs Open Slot */}
                                            <div className="space-y-2 rounded-xl border border-slate-200 bg-[#FAFCFB] p-3.5">
                                                <label className="text-xs font-bold text-slate-800">
                                                    Partner Assignment Mode
                                                </label>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateSelectedSlot({ assignmentMode: 'preferred_partner', isOpenSlot: false })}
                                                        className={`flex cursor-pointer flex-col rounded-lg border p-2.5 text-left transition-all ${
                                                            selectedSlot.assignmentMode === 'preferred_partner' || (!selectedSlot.assignmentMode && !selectedSlot.isOpenSlot)
                                                                ? 'border-[#0F2F58] bg-white shadow-2xs ring-1 ring-[#0F2F58]'
                                                                : 'border-slate-200 bg-white/60 hover:bg-white'
                                                        }`}
                                                    >
                                                        <span className="text-[11px] font-extrabold text-[#0F2F58]">
                                                            Preferred Partner
                                                        </span>
                                                        <span className="mt-0.5 text-[9.5px] text-slate-500">
                                                            Pre-selected verified listing
                                                        </span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateSelectedSlot({ assignmentMode: 'buyer_choice', isOpenSlot: true, listingId: undefined })}
                                                        className={`flex cursor-pointer flex-col rounded-lg border p-2.5 text-left transition-all ${
                                                            selectedSlot.assignmentMode === 'buyer_choice' || (!selectedSlot.assignmentMode && selectedSlot.isOpenSlot)
                                                                ? 'border-[#0F2F58] bg-white shadow-2xs ring-1 ring-[#0F2F58]'
                                                                : 'border-slate-200 bg-white/60 hover:bg-white'
                                                        }`}
                                                    >
                                                        <span className="text-[11px] font-extrabold text-amber-900">
                                                            Buyer's Choice
                                                        </span>
                                                        <span className="mt-0.5 text-[9.5px] text-slate-500">
                                                            Buyer chooses partner at cart
                                                        </span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateSelectedSlot({ assignmentMode: 'open_pool', isOpenSlot: true, listingId: undefined })}
                                                        className={`flex cursor-pointer flex-col rounded-lg border p-2.5 text-left transition-all ${
                                                            selectedSlot.assignmentMode === 'open_pool'
                                                                ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-600'
                                                                : 'border-slate-200 bg-white/60 hover:bg-white'
                                                        }`}
                                                    >
                                                        <span className="text-[11px] font-extrabold text-indigo-900">
                                                            Community Open Pool
                                                        </span>
                                                        <span className="mt-0.5 text-[9.5px] text-slate-500">
                                                            Dispatched to Tagudin pool
                                                        </span>
                                                    </button>
                                                </div>

                                                {(selectedSlot.assignmentMode === 'preferred_partner' || (!selectedSlot.assignmentMode && !selectedSlot.isOpenSlot)) && (
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

                                                {selectedSlot.assignmentMode === 'open_pool' && (
                                                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 p-2.5 text-[11px] text-indigo-900">
                                                        <Sparkles className="size-4 shrink-0 text-indigo-600" />
                                                        <span>This step will be dispatched to verified Tagudin runners/technicians matching required capabilities upon payment.</span>
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
                                                        value={typeof selectedSlot.feeMinor === 'number' ? Math.round(selectedSlot.feeMinor / 100) : ''}
                                                        onChange={(e) =>
                                                            handleUpdateSelectedSlot({
                                                                feeMinor: e.target.value === '' ? undefined : Math.round(parseFloat(e.target.value) * 100),
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
                                                            value={selectedSlot.conditionCode || 'all_inputs_ready'}
                                                            onChange={(e) => handleUpdateSelectedSlot({ conditionCode: e.target.value })}
                                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-[#0F2F58]"
                                                        >
                                                            {selectedSlot.conditionCode && !supportedEditorGates.includes(selectedSlot.conditionCode)
                                                                ? <option value={selectedSlot.conditionCode} disabled>Unsupported saved condition: {selectedSlot.conditionCode}</option>
                                                                : null}
                                                            <option value="all_inputs_ready">All inputs ready (all_inputs_ready)</option>
                                                            <option value="part_ready">Item ready for pickup (part_ready)</option>
                                                            <option value="delivery_signed">Delivered to site (delivery_signed)</option>
                                                            <option value="work_completed">Predecessor work completed (work_completed)</option>
                                                        </select>
                                                        {selectedSlot.conditionCode && !supportedEditorGates.includes(selectedSlot.conditionCode) ? (
                                                            <p className="mt-1 text-[11px] font-semibold text-amber-800">Unsupported saved condition; choose a supported condition to apply.</p>
                                                        ) : null}
                                                    </div>
                                                    {selectedSlot.allowBypass ? (
                                                        <div className="flex items-end justify-between gap-2 text-xs text-amber-800">
                                                            <span>Unsupported saved bypass</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateSelectedSlot({ allowBypass: false })}
                                                                className="rounded-md border border-amber-300 bg-white px-2 py-1 font-bold"
                                                            >
                                                                Remove bypass
                                                            </button>
                                                        </div>
                                                    ) : null}
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
                                                        aria-label={`Add ${preset.roleLabel} as sequential step`}
                                                        className="flex-1 rounded-lg bg-[#0F2F58] py-1 text-[10.5px] font-bold text-white hover:bg-[#1A3D6E]"
                                                    >
                                                        + Sequential Step
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddSlot(preset, true)}
                                                        aria-label={`Add ${preset.roleLabel} as parallel branch`}
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
                                    {totalPartnerMinor === null ? 'Partner fees unavailable' : `₱${(totalPartnerMinor / 100).toFixed(2)}`}
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
                                disabled={hasUnsupportedSavedGate}
                                onClick={handleSaveChain}
                                className="rounded-xl bg-[#FFC72C] px-5 py-2 text-xs font-extrabold text-slate-950 shadow-xs hover:bg-[#e6b327] disabled:cursor-not-allowed disabled:opacity-50"
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
