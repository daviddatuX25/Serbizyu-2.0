import type { WorkInteractionType, WorkEvidenceProtocol, WorkNodePrimitive } from './types';

export interface InteractionTypeDefinition {
    type: WorkInteractionType;
    icon: string;
    label: string;
    description: string;
    badgeStyle: string;
}

export const INTERACTION_TYPE_DEFINITIONS: InteractionTypeDefinition[] = [
    {
        type: 'solo_execution',
        icon: '⚙️',
        label: 'Solo Execution',
        description: 'Independent craftsmanship or task done autonomously by the provider',
        badgeStyle: 'bg-slate-100 text-slate-800 border-slate-300',
    },
    {
        type: 'co_presence',
        icon: '📍',
        label: 'Mutual Co-Presence',
        description: 'Both parties present on-site (arrival, check-in, attendance session)',
        badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    },
    {
        type: 'custody_transfer',
        icon: '📦',
        label: 'Custody Transfer',
        description: 'Physical handover of goods, tools, or assets between parties',
        badgeStyle: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    },
    {
        type: 'quality_check',
        icon: '📊',
        label: 'Quality / Metric Check',
        description: 'Diagnostic / Measurement Gate · Objective benchmark, diagnostic test, or quantitative reading',
        badgeStyle: 'bg-amber-50 text-amber-800 border-amber-300',
    },
    {
        type: 'client_signoff',
        icon: '✍️',
        label: 'Client Sign-Off',
        description: 'Customer review, milestone sign-off, or escrow release acceptance',
        badgeStyle: 'bg-green-50 text-green-900 border-green-300',
    },
];

export interface EvidenceProtocolDefinition {
    protocol: WorkEvidenceProtocol;
    icon: string;
    label: string;
    description: string;
}

export const EVIDENCE_PROTOCOL_DEFINITIONS: EvidenceProtocolDefinition[] = [
    {
        protocol: 'photo_proof',
        icon: '📸',
        label: 'Photo / Video Proof',
        description: 'Time-stamped before/after or in-progress visual capture',
    },
    {
        protocol: 'customer_otp',
        icon: '🔐',
        label: 'Customer OTP / Signature',
        description: 'Counterparty digital sign-off token or signature verification',
    },
    {
        protocol: 'file_artifact',
        icon: '📁',
        label: 'Digital File / Artifact',
        description: 'Uploaded digital asset, PDF, archive, or repository link',
    },
    {
        protocol: 'metric_reading',
        icon: '⚡',
        label: 'Metric / Value Reading',
        description: 'Numeric measurement with unit (e.g. °C delta, volts, kg)',
    },
    {
        protocol: 'checklist_declaration',
        icon: '☑️',
        label: 'Checklist / Declaration',
        description: 'Itemized verification of safety steps or requirements',
    },
    {
        protocol: 'none',
        icon: '⚪',
        label: 'Simple Declaration',
        description: 'Provider attestation without mandatory media upload',
    },
];

export const WORK_NODE_CATALOG: WorkNodePrimitive[] = [
    {
        id: 'node_site_arrival',
        title: 'Site Arrival & Check-In',
        desc: 'Physical arrival at customer location, safety briefing & site orientation',
        dur: '15m',
        interactionType: 'co_presence',
        evidenceProtocol: 'photo_proof',
        evidence: 'Time-stamped jobsite arrival photo or GPS handshake',
        color: '#0D715F',
        bg: '#E8F7F1',
        icon: '📍',
        categoryTag: 'Site / Field',
    },
    {
        id: 'node_custody_intake',
        title: 'Custody Intake / Stall Pickup',
        desc: 'Collect physical goods, materials or tools; verify count & condition',
        dur: '15m',
        interactionType: 'custody_transfer',
        evidenceProtocol: 'checklist_declaration',
        evidence: 'Item condition checklist and custody intake acknowledgment',
        color: '#4F46E5',
        bg: '#EEF2FF',
        icon: '📦',
        categoryTag: 'Transport / Goods',
    },
    {
        id: 'node_diagnostic_check',
        title: 'Diagnostic Scan & Baseline',
        desc: 'Initial inspection, system diagnostic scan, or fault identification',
        dur: '20m',
        interactionType: 'quality_check',
        evidenceProtocol: 'photo_proof',
        evidence: 'Pre-work inspection photo or fault code diagnostic record',
        color: '#D97706',
        bg: '#FEF3C7',
        icon: '🔍',
        categoryTag: 'Diagnostics',
    },
    {
        id: 'node_core_craft_execution',
        title: 'Core Task Execution',
        desc: 'Focused craftsmanship, repair execution, assembly, or physical service',
        dur: '45m',
        interactionType: 'solo_execution',
        evidenceProtocol: 'photo_proof',
        evidence: 'Workmanship progress photos or chemical treatment proof',
        color: '#0F766E',
        bg: '#CCFBF1',
        icon: '⚙️',
        categoryTag: 'Execution',
    },
    {
        id: 'node_metric_quality_test',
        title: 'Benchmark & Metric Reading',
        desc: 'Quantitative performance test against standard tolerance',
        dur: '15m',
        interactionType: 'quality_check',
        evidenceProtocol: 'metric_reading',
        evidence: 'Multimeter, pressure gauge, or delta temperature reading photo',
        color: '#B45309',
        bg: '#FEF3C7',
        icon: '📊',
        categoryTag: 'Diagnostics',
    },
    {
        id: 'node_digital_delivery',
        title: 'Digital Artifact Delivery',
        desc: 'Upload and transfer of final design, document, code, or report asset',
        dur: '30m',
        interactionType: 'solo_execution',
        evidenceProtocol: 'file_artifact',
        evidence: 'Secured deliverable file upload or versioned repository artifact',
        color: '#2563EB',
        bg: '#EFF6FF',
        icon: '📁',
        categoryTag: 'Digital',
    },
    {
        id: 'node_delivery_dropoff',
        title: 'Delivery Drop-off & Handoff',
        desc: 'Physical delivery handover of items to recipient doorstep or counter',
        dur: '20m',
        interactionType: 'custody_transfer',
        evidenceProtocol: 'customer_otp',
        evidence: 'Customer digital OTP or receipt signature on delivery',
        color: '#4F46E5',
        bg: '#EEF2FF',
        icon: '🛵',
        categoryTag: 'Transport / Goods',
    },
    {
        id: 'node_client_final_signoff',
        title: 'Client Review & Sign-Off',
        desc: 'Client inspects results, validates satisfaction, and authorizes escrow release',
        dur: '15m',
        interactionType: 'client_signoff',
        evidenceProtocol: 'customer_otp',
        evidence: 'Dual customer sign-off signature and digital release OTP',
        color: '#047857',
        bg: '#D1FAE5',
        icon: '✍️',
        categoryTag: 'Settlement',
    },
];
