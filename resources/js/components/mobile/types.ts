/**
 * Serbizyu 2.0 — Mobile-First Component & Domain Contracts
 * Canonical interfaces for Work Pipeline DAGs, Deal Chains, and Responsive Shells.
 */

export type WorkStageGateType = 'arrival' | 'execution' | 'diagnostic' | 'signoff';

export interface WorkStage {
    id: string;
    num: string;
    title: string;
    dur: string;
    desc: string;
    evidence: string;
    color: string;
    bg: string;
    lane?: 'top' | 'btm' | 'center';
    gateType?: WorkStageGateType;
}

export interface WorkTemplate {
    id: string;
    category: string;
    title: string;
    shape: string;
    sla: string;
    flowType: 'linear' | 'parallel' | 'branch';
    description: string;
    stages: WorkStage[];
}

export type SlotType =
    'store' | 'delivery' | 'installation' | 'audit' | 'hauling' | 'parts' | 'diagnostic' | 'tools';

export interface PartnerSlot {
    type: SlotType;
    role: string;
    name: string;
    meta: string;
}

export interface DealChainNode {
    role: string;
    title: string;
    sub: string;
    type: string;
    bg: string;
    color: string;
}

export interface DealChainCombination {
    id: string;
    title: string;
    icon: string;
    isDefault: boolean;
    nodes: DealChainNode[];
    slots: PartnerSlot[];
}

export interface ActingContextData {
    actorUserId: string;
    ownerUserId: string;
    ownerName: string;
    consentGrantId: string | null;
    isActingOnBehalf: boolean;
}
