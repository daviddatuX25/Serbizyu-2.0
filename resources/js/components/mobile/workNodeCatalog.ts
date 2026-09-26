import type {
    WorkClearanceMode,
    WorkEvidenceType,
    WorkInteractionType,
    WorkEvidenceProtocol,
    WorkNodePrimitive,
} from './types';

export interface ClearanceModeDefinition {
    mode: WorkClearanceMode;
    label: string;
    description: string;
    badgeStyle: string;
    lucideIcon: 'UserCheck' | 'ShieldAlert' | 'Handshake';
}

export const CLEARANCE_MODE_DEFINITIONS: ClearanceModeDefinition[] = [
    {
        mode: 'worker_direct',
        label: 'Worker Clears Directly',
        description: 'Provider marks step complete autonomously upon performing the work.',
        badgeStyle: 'bg-slate-100 text-slate-800 border-slate-300',
        lucideIcon: 'UserCheck',
    },
    {
        mode: 'customer_approval',
        label: 'Customer Approval Required',
        description: 'Work pauses at this milestone until the customer inspects and approves on their phone.',
        badgeStyle: 'bg-amber-50 text-amber-900 border-amber-300',
        lucideIcon: 'ShieldAlert',
    },
    {
        mode: 'physical_handoff',
        label: 'Physical Handoff',
        description: 'Physical custody transfer of items, equipment, or keys between parties.',
        badgeStyle: 'bg-blue-50 text-[#0F2F58] border-blue-200',
        lucideIcon: 'Handshake',
    },
];

export interface RequiredProofDefinition {
    type: WorkEvidenceType;
    label: string;
    description: string;
    lucideIcon: 'Camera' | 'Gauge' | 'KeyRound' | 'ListChecks';
}

export const REQUIRED_PROOF_DEFINITIONS: RequiredProofDefinition[] = [
    {
        type: 'photo_proof',
        label: 'Photo / Video Capture',
        description: 'Time-stamped before/after photo or visual progress verification.',
        lucideIcon: 'Camera',
    },
    {
        type: 'metric_reading',
        label: 'Metric / Measurement Reading',
        description: 'Quantitative reading entered with unit (e.g. °C delta, volts, psi, kg).',
        lucideIcon: 'Gauge',
    },
    {
        type: 'customer_otp',
        label: 'Customer OTP / Digital Signature',
        description: 'Secure 4-digit customer confirmation token or sign-off signature.',
        lucideIcon: 'KeyRound',
    },
    {
        type: 'checklist_steps',
        label: 'Itemized Safety Checklist',
        description: 'Operator confirms completion of required safety or prep steps.',
        lucideIcon: 'ListChecks',
    },
];

export const WORK_NODE_CATALOG: WorkNodePrimitive[] = [
    {
        id: 'node_site_arrival',
        title: 'Site Arrival & Check-In',
        desc: 'Physical arrival at customer location, safety briefing & site orientation.',
        dur: '15m',
        clearanceMode: 'worker_direct',
        requiredProofs: ['photo_proof'],
        evidence: 'Time-stamped jobsite arrival photo or GPS check-in.',
        color: '#0D715F',
        bg: '#E8F7F1',
        lucideIcon: 'MapPin',
        categoryTag: 'Site / Field',
        interactionType: 'co_presence',
        evidenceProtocol: 'photo_proof',
    },
    {
        id: 'node_custody_intake',
        title: 'Custody Intake / Stall Pickup',
        desc: 'Collect physical goods, materials or tools; verify count & package condition.',
        dur: '15m',
        clearanceMode: 'physical_handoff',
        handoffParty: 'recipient_confirm',
        requiredProofs: ['checklist_steps'],
        evidence: 'Item condition checklist and custody intake confirmation.',
        color: '#4F46E5',
        bg: '#EEF2FF',
        lucideIcon: 'PackageCheck',
        categoryTag: 'Transport / Goods',
        interactionType: 'custody_transfer',
        evidenceProtocol: 'checklist_declaration',
    },
    {
        id: 'node_diagnostic_check',
        title: 'Diagnostic Scan & Baseline',
        desc: 'Initial inspection, system diagnostic scan, or fault identification.',
        dur: '20m',
        clearanceMode: 'worker_direct',
        requiredProofs: ['photo_proof', 'metric_reading'],
        metricUnit: 'V / psi',
        evidence: 'Pre-work inspection photo and diagnostic meter readings.',
        color: '#D97706',
        bg: '#FEF3C7',
        lucideIcon: 'SearchCheck',
        categoryTag: 'Diagnostics',
        interactionType: 'quality_check',
        evidenceProtocol: 'metric_reading',
    },
    {
        id: 'node_core_craft_execution',
        title: 'Core Task Execution',
        desc: 'Focused craftsmanship, repair execution, assembly, or physical service.',
        dur: '45m',
        clearanceMode: 'worker_direct',
        requiredProofs: ['photo_proof'],
        evidence: 'Workmanship progress photo or chemical treatment coverage.',
        color: '#0F766E',
        bg: '#CCFBF1',
        lucideIcon: 'Wrench',
        categoryTag: 'Execution',
        interactionType: 'solo_execution',
        evidenceProtocol: 'photo_proof',
    },
    {
        id: 'node_metric_quality_test',
        title: 'Benchmark & Metric Reading',
        desc: 'Quantitative performance test against standard municipal tolerance.',
        dur: '15m',
        clearanceMode: 'customer_approval',
        requiredProofs: ['photo_proof', 'metric_reading'],
        metricUnit: '°C delta',
        evidence: 'Thermometer or pressure gauge reading photo with recorded metric.',
        color: '#B45309',
        bg: '#FEF3C7',
        lucideIcon: 'Gauge',
        categoryTag: 'Diagnostics',
        interactionType: 'quality_check',
        evidenceProtocol: 'metric_reading',
    },
    {
        id: 'node_digital_delivery',
        title: 'Digital Artifact Delivery',
        desc: 'Upload and transfer of final design, document, code, or report asset.',
        dur: '30m',
        clearanceMode: 'customer_approval',
        requiredProofs: ['photo_proof'],
        evidence: 'Secured deliverable file upload and customer review acceptance.',
        color: '#2563EB',
        bg: '#EFF6FF',
        lucideIcon: 'FileText',
        categoryTag: 'Digital',
        interactionType: 'solo_execution',
        evidenceProtocol: 'file_artifact',
    },
    {
        id: 'node_delivery_dropoff',
        title: 'Delivery Drop-Off & Handoff',
        desc: 'Physical delivery handover of items to recipient doorstep or counter.',
        dur: '20m',
        clearanceMode: 'physical_handoff',
        handoffParty: 'recipient_confirm',
        requiredProofs: ['customer_otp'],
        evidence: 'Customer digital OTP or receipt signature on delivery.',
        color: '#4F46E5',
        bg: '#EEF2FF',
        lucideIcon: 'Truck',
        categoryTag: 'Transport / Goods',
        interactionType: 'custody_transfer',
        evidenceProtocol: 'customer_otp',
    },
    {
        id: 'node_client_final_signoff',
        title: 'Client Review & Sign-Off',
        desc: 'Client inspects results, validates satisfaction, and authorizes escrow release.',
        dur: '15m',
        clearanceMode: 'customer_approval',
        requiredProofs: ['customer_otp'],
        evidence: 'Dual customer sign-off signature and digital release OTP.',
        color: '#047857',
        bg: '#D1FAE5',
        lucideIcon: 'Signature',
        categoryTag: 'Settlement',
        interactionType: 'client_signoff',
        evidenceProtocol: 'customer_otp',
    },
];

// Backward-compatibility definitions for tests and older consumers
export interface InteractionTypeDefinition {
    type: WorkInteractionType;
    label: string;
    description: string;
    badgeStyle: string;
}

export const INTERACTION_TYPE_DEFINITIONS: InteractionTypeDefinition[] = [
    {
        type: 'solo_execution',
        label: 'Solo Execution',
        description: 'Independent craftsmanship or task done autonomously by the provider.',
        badgeStyle: 'bg-slate-100 text-slate-800 border-slate-300',
    },
    {
        type: 'co_presence',
        label: 'Mutual Co-Presence',
        description: 'Both parties present on-site (arrival, check-in, attendance session).',
        badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    },
    {
        type: 'custody_transfer',
        label: 'Custody Transfer',
        description: 'Physical handover of goods, tools, or assets between parties.',
        badgeStyle: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    },
    {
        type: 'quality_check',
        label: 'Quality / Metric Check',
        description: 'Diagnostic / Measurement Gate · Objective benchmark, diagnostic test, or quantitative reading.',
        badgeStyle: 'bg-amber-50 text-amber-800 border-amber-300',
    },
    {
        type: 'client_signoff',
        label: 'Client Sign-Off',
        description: 'Customer review, milestone sign-off, or escrow release acceptance.',
        badgeStyle: 'bg-green-50 text-green-900 border-green-300',
    },
];

export interface EvidenceProtocolDefinition {
    protocol: WorkEvidenceProtocol;
    label: string;
    description: string;
}

export const EVIDENCE_PROTOCOL_DEFINITIONS: EvidenceProtocolDefinition[] = [
    {
        protocol: 'photo_proof',
        label: 'Photo / Video Proof',
        description: 'Time-stamped before/after or in-progress visual capture.',
    },
    {
        protocol: 'customer_otp',
        label: 'Customer OTP / Signature',
        description: 'Counterparty digital sign-off token or signature verification.',
    },
    {
        protocol: 'file_artifact',
        label: 'Digital File / Artifact',
        description: 'Uploaded digital asset, PDF, archive, or repository link.',
    },
    {
        protocol: 'metric_reading',
        label: 'Metric / Value Reading',
        description: 'Numeric measurement with unit (e.g. °C delta, volts, kg).',
    },
    {
        protocol: 'checklist_declaration',
        label: 'Checklist / Declaration',
        description: 'Itemized verification of safety steps or requirements.',
    },
    {
        protocol: 'none',
        label: 'Simple Declaration',
        description: 'Provider attestation without mandatory media upload.',
    },
];
