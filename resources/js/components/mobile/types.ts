import type { SlotCandidateListing } from '../../marketplace/types';

/**
 * Serbizyu 2.0 — Mobile-First Component & Domain Contracts
 * Canonical interfaces for Work Pipeline DAGs, Deal Chains, and Responsive Shells.
 */

export type WorkClearanceMode = 'worker_direct' | 'customer_approval' | 'physical_handoff';

export type HandoffParty = 'recipient_confirm' | 'worker_dropoff';

export type WorkApprovalMethod = 'app_confirm' | 'presence_otp' | 'worker_dropoff' | 'none';

export type WorkEvidenceType =
    | 'photo_proof'
    | 'gps_checkin'
    | 'metric_reading'
    | 'checklist_steps'
    | 'external_connector'
    | 'customer_otp';

export interface WorkToolDefinition {
    toolKey: string;
    kind: 'native' | 'external_connector';
    label: string;
    description: string;
    lucideIcon: string;
    actor: string;
    configSchema: Record<string, unknown>;
}

export interface WorkToolBinding {
    toolKey: string;
    kind: 'native' | 'external_connector';
    config?: Record<string, unknown>;
}

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

export type WorkChecklistItem = { id: string; label: string; required: boolean };
export type WorkMetricRequirement = { id: string; name: string; unit: string; required: boolean; target?: number | null; min?: number | null; max?: number | null };

export interface WorkStage {
    id: string;
    num: string;
    title: string;
    dur: string;
    desc: string;
    evidenceType?: string;
    evidence: string;
    color: string;
    bg: string;
    lane?: 'top' | 'btm' | 'center';
    clearanceMode?: WorkClearanceMode;
    handoffParty?: HandoffParty;
    requiredProofs?: WorkEvidenceType[];
    approvalMethod?: WorkApprovalMethod;
    toolBindings?: WorkToolBinding[];
    checklistItems?: WorkChecklistItem[];
    metricRequirements?: WorkMetricRequirement[];
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
    approvalMethod?: WorkApprovalMethod;
    toolBindings?: WorkToolBinding[];
    checklistItems?: WorkChecklistItem[];
    metricRequirements?: WorkMetricRequirement[];
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
    categoryCodes?: string[];
    catalogCode?: string;
    setVersion?: number;
    sla: string;
    flowType: 'linear' | 'parallel' | 'branch';
    description: string;
    stages: WorkStage[];
}

export type SlotType =
    'store' | 'delivery' | 'installation' | 'audit' | 'hauling' | 'parts' | 'diagnostic' | 'tools';

export interface DealChainDependencyEdge {
    id: string;
    predecessorId: string;
    successorId: string;
    conditionCode?: string;
    dependencyType: 'blocks';
    status?: 'active' | 'removed';
}
export type SlotAssignmentMode = 'preferred_partner' | 'open_pool' | 'buyer_choice';

export interface PartnerSlot extends Partial<Pick<SlotCandidateListing, 'id' | 'title' | 'area' | 'price_minor' | 'priceMinor' | 'provider_name' | 'photo_url'>> {
    role: string;
    type: SlotType;
    name: string;
    meta: string;
    listingId?: string;
    feeMinor?: number;
    coverThumbnailUrl?: string;
    isOpenSlot?: boolean;
    assignmentMode?: SlotAssignmentMode;
    tier?: number;
    predecessorIds?: string[];
    conditionCode?: string;
    allowBypass?: boolean;
}

export interface DealChainNode extends Partial<Pick<SlotCandidateListing, 'id' | 'area' | 'price_minor' | 'priceMinor' | 'provider_name' | 'photo_url'>> {
    role: string;
    title: string;
    sub: string;
    type: string;
    bg: string;
    color: string;
    listingId?: string;
    feeMinor?: number;
    coverThumbnailUrl?: string;
    isPrimary?: boolean;
    isOpenSlot?: boolean;
    assignmentMode?: SlotAssignmentMode;
    tier?: number;
    predecessorIds?: string[];
    conditionCode?: string;
    allowBypass?: boolean;
}

export interface DealChainCombination {
    id: string;
    title: string;
    icon: string;
    isDefault: boolean;
    recipeId?: string;
    catalogVersion?: number;
    isCustom?: boolean;
    basedOnTitle?: string;
    description?: string;
    nodes: DealChainNode[];
    slots: PartnerSlot[];
    dependencies?: DealChainDependencyEdge[];
    flowType?: 'linear' | 'parallel' | 'complex';
}
export interface DealChainTemplate {
    recipeId: string;
    catalogVersion: number;
    pattern: string;
    patternCapsule: string[];
    title: string;
    extraFee: number;
    extraFeeMinor: number;
    rating: string;
    bookedCount: string;
    desc: string;
    applicableCategories: string[];
    applicableListingTypes: string[];
    applicableWorkShapes: string[];
    nodes: Array<{
        key: string;
        role: string;
        title: string;
        sub: string;
        type: string;
        listingId?: string | null;
        providerName?: string | null;
        image?: string | null;
        priceMinor?: number | null;
    }>;
}

export interface ActingContextData {
    actorUserId: string;
    ownerUserId: string;
    ownerName: string;
    consentGrantId: string | null;
    isActingOnBehalf: boolean;
}
