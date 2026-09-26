/**
 * Serbizyu 2.0 — Mobile-First Component & Domain Contracts
 * Canonical interfaces for Work Pipeline DAGs, Deal Chains, and Responsive Shells.
 */

export type WorkClearanceMode = 'worker_direct' | 'customer_approval' | 'physical_handoff';

export type HandoffParty = 'recipient_confirm' | 'worker_dropoff';

export type WorkEvidenceType =
    | 'photo_proof'
    | 'metric_reading'
    | 'customer_otp'
    | 'checklist_steps';

export type WorkInteractionType =
    | 'solo_execution'
    | 'co_presence'
    | 'custody_transfer'
    | 'quality_check'
    | 'client_signoff';

export type WorkEvidenceProtocol =
    | 'photo_proof'
    | 'customer_otp'
    | 'file_artifact'
    | 'metric_reading'
    | 'checklist_declaration'
    | 'none';

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
    clearanceMode?: WorkClearanceMode;
    handoffParty?: HandoffParty;
    requiredProofs?: WorkEvidenceType[];
    metricUnit?: string;
    interactionType?: WorkInteractionType;
    evidenceProtocol?: WorkEvidenceProtocol;
    gateType?: WorkStageGateType;
}

export interface WorkNodePrimitive {
    id: string;
    title: string;
    desc: string;
    dur: string;
    clearanceMode: WorkClearanceMode;
    handoffParty?: HandoffParty;
    requiredProofs: WorkEvidenceType[];
    metricUnit?: string;
    evidence: string;
    color: string;
    bg: string;
    lucideIcon: string;
    categoryTag: string;
    interactionType?: WorkInteractionType;
    evidenceProtocol?: WorkEvidenceProtocol;
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
