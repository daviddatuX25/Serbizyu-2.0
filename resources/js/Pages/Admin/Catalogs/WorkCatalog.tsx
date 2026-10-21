import { Head } from '@inertiajs/react';
import * as React from 'react';
import {
    Calendar,
    Check,
    CheckCircle2,
    FileCheck2,
    GripVertical,
    Layers,
    Maximize2,
    Minimize2,
    Pencil,
    Plus,
    RotateCcw,
    Save,
    Settings,
    Sparkles,
    Trash2,
    TrendingUp,
    Truck,
    Wrench,
    Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AdminMetricCard } from '@/components/admin/GraphicMetrics';
import type { WorkCatalogRecord } from '@/types';

export interface MilestoneStep {
    id: string;
    ordinal: number;
    title: string;
    description: string;
    evidenceType:
        'photo_required' | 'video_required' | 'meter_log' | 'receipt_upload' | 'dual_sign';
    evidenceDescription: string;
    mandatory: boolean;
    x?: number;
    y?: number;
}

interface ObservedVariation {
    id: string;
    category: string;
    workShape: 'A1' | 'A3' | 'A4' | 'A9';
    title: string;
    stepsCount: number;
    stepsSummary: string;
    adoptedJobsCount: number;
    adoptionRate: number;
    isPromoted: boolean;
    steps: MilestoneStep[];
}

const DEFAULT_STEPS: Record<string, MilestoneStep[]> = {
    A1: [
        {
            id: 'step-1',
            ordinal: 1,
            title: 'Intake Triage & Disassembly',
            description:
                'Initial diagnostic inspection, casing removal, and baseline measurements.',
            evidenceType: 'photo_required',
            evidenceDescription: '1 photo of disassembled casing and motor label.',
            mandatory: true,
            x: 60,
            y: 50,
        },
        {
            id: 'step-2',
            ordinal: 2,
            title: 'Component Replacement & Soldering',
            description: 'Replacement of defective capacitor, relay, or motor wiring.',
            evidenceType: 'receipt_upload',
            evidenceDescription: 'Store parts receipt + photo of installed new component.',
            mandatory: true,
            x: 120,
            y: 230,
        },
        {
            id: 'step-3',
            ordinal: 3,
            title: 'Amperage Load Test & Bench Inspection',
            description: '15-minute continuous run test under operating load.',
            evidenceType: 'meter_log',
            evidenceDescription: 'Digital multimeter or ammeter display photo.',
            mandatory: true,
            x: 180,
            y: 410,
        },
    ],
    A3: [
        {
            id: 'step-a3-1',
            ordinal: 1,
            title: 'Arrival Check-in & Site Safety Triage',
            description:
                'On-site GPS check-in, customer contact verification, and work environment safety check.',
            evidenceType: 'dual_sign',
            evidenceDescription: 'GPS location timestamp + client sign-in confirmation.',
            mandatory: true,
            x: 80,
            y: 60,
        },
        {
            id: 'step-a3-2',
            ordinal: 2,
            title: 'Physical Service Execution',
            description: 'Execution of scheduled inspection, cleaning, or treatment.',
            evidenceType: 'photo_required',
            evidenceDescription: 'Before & after work evidence photos.',
            mandatory: true,
            x: 140,
            y: 260,
        },
    ],
    A4: [
        {
            id: 'step-a4-1',
            ordinal: 1,
            title: 'Sourcing & Package Preparation',
            description: 'Physical pickup from vendor or store packaging verification.',
            evidenceType: 'receipt_upload',
            evidenceDescription: 'Store official receipt or inventory dispatch slip.',
            mandatory: true,
            x: 80,
            y: 60,
        },
        {
            id: 'step-a4-2',
            ordinal: 2,
            title: 'Doorstep Delivery & Dual Receipt Confirmation',
            description: 'Handoff to recipient with physical item count verification.',
            evidenceType: 'dual_sign',
            evidenceDescription: 'Recipient signature + photo of handed-over goods.',
            mandatory: true,
            x: 140,
            y: 260,
        },
    ],
    A9: [
        {
            id: 'step-a9-1',
            ordinal: 1,
            title: 'Draft Artifact Upload & Virus Scanning',
            description: 'Digital delivery file upload to private evidence quarantine bucket.',
            evidenceType: 'photo_required',
            evidenceDescription: 'Automated sha256 checksum and clamav scan pass.',
            mandatory: true,
            x: 80,
            y: 60,
        },
        {
            id: 'step-a9-2',
            ordinal: 2,
            title: 'Client Review & Final Acceptance',
            description: 'Citizen reviews digital deliverable and issues formal sign-off.',
            evidenceType: 'dual_sign',
            evidenceDescription: 'Signed acceptance event in audit trail.',
            mandatory: true,
            x: 140,
            y: 260,
        },
    ],
};

const SAMPLE_OBSERVED: ObservedVariation[] = [
    {
        id: 'var-1',
        category: 'Home Electrical & HVAC',
        workShape: 'A1',
        title: 'Aircon / Fan Diagnostic + Part Swap + 15m Load Run',
        stepsCount: 3,
        stepsSummary:
            '1. Intake Diagnostic Triage -> 2. Motor/Capacitor Part Swap -> 3. Continuous 15m Load Test',
        adoptedJobsCount: 42,
        adoptionRate: 84,
        isPromoted: true,
        steps: [
            {
                id: 'v1-1',
                ordinal: 1,
                title: 'Intake Diagnostic Triage',
                description: 'Motor winding resistance and capacitor capacitance microfarad check.',
                evidenceType: 'meter_log',
                evidenceDescription: 'Multimeter display reading.',
                mandatory: true,
                x: 60,
                y: 50,
            },
            {
                id: 'v1-2',
                ordinal: 2,
                title: 'Capacitor Part Swap',
                description:
                    'Install 1.5uF replacement capacitor with heat-shrink insulated connectors.',
                evidenceType: 'photo_required',
                evidenceDescription: 'Photo of soldered and insulated component.',
                mandatory: true,
                x: 120,
                y: 230,
            },
            {
                id: 'v1-3',
                ordinal: 3,
                title: 'Continuous 15m Load Test',
                description:
                    'Verify motor temperature and amperage under continuous high-speed rotation.',
                evidenceType: 'meter_log',
                evidenceDescription: 'Final ammeter reading under 0.8A threshold.',
                mandatory: true,
                x: 180,
                y: 410,
            },
        ],
    },
    {
        id: 'var-2',
        category: 'Agri Logistics',
        workShape: 'A4',
        title: 'Field Sacks Bagging + Mud Kuliglig Haul + Solar Yard Spread',
        stepsCount: 3,
        stepsSummary:
            '1. 50kg Sack Stitching -> 2. Mud Dike Shuttle -> 3. Moisture Pin Verification & Pavement Layer',
        adoptedJobsCount: 28,
        adoptionRate: 92,
        isPromoted: true,
        steps: [
            {
                id: 'v2-1',
                ordinal: 1,
                title: '50kg Sack Stitching',
                description:
                    'Bagging harvested wet palay into heavy poly sacks with cord stitchers.',
                evidenceType: 'photo_required',
                evidenceDescription: 'Piles of stitched sacks at dike access.',
                mandatory: true,
                x: 60,
                y: 50,
            },
            {
                id: 'v2-2',
                ordinal: 2,
                title: 'Mud Dike Shuttle',
                description: 'Hand-tractor 4x4 trailer haul along irrigation dikes.',
                evidenceType: 'dual_sign',
                evidenceDescription: 'Transfer receipt signed by truck driver at highway.',
                mandatory: true,
                x: 120,
                y: 230,
            },
            {
                id: 'v2-3',
                ordinal: 3,
                title: 'Moisture Pin Test & Pavement Layer',
                description: 'Spread grain to 3cm uniform depth on Bitalag solar drying yard.',
                evidenceType: 'meter_log',
                evidenceDescription: 'Moisture meter pin sample reading + yard photo.',
                mandatory: true,
                x: 180,
                y: 410,
            },
        ],
    },
];
const VALID_EVIDENCE_TYPES: MilestoneStep['evidenceType'][] = [
    'photo_required',
    'video_required',
    'meter_log',
    'receipt_upload',
    'dual_sign',
];

function catalogSteps(record?: WorkCatalogRecord): MilestoneStep[] {
    if (!record || record.steps.length === 0) return [];

    return record.steps.map((rawStep, index) => {
        const evidenceType = String(
            rawStep.evidence_type ?? rawStep.evidenceType ?? 'photo_required',
        );
        const normalizedEvidenceType = VALID_EVIDENCE_TYPES.includes(
            evidenceType as MilestoneStep['evidenceType'],
        )
            ? (evidenceType as MilestoneStep['evidenceType'])
            : 'photo_required';

        return {
            id: String(rawStep.id ?? `${record.work_shape.toLowerCase()}-step-${index + 1}`),
            ordinal: Number(rawStep.ordinal ?? index + 1),
            title: String(rawStep.title ?? 'Untitled milestone'),
            description: String(rawStep.description ?? ''),
            evidenceType: normalizedEvidenceType,
            evidenceDescription: String(
                rawStep.evidence_description ??
                    rawStep.evidenceDescription ??
                    'Evidence required at this gate.',
            ),
            mandatory: Boolean(rawStep.mandatory ?? true),
            x: 60 + index * 60,
            y: 50 + index * 180,
        };
    });
}

function catalogVariations(record?: WorkCatalogRecord): ObservedVariation[] {
    if (!record || record.observed_variations.length === 0) return [];

    return record.observed_variations.map((rawVariation, index) => ({
        id: String(rawVariation.id ?? `${record.work_shape.toLowerCase()}-variation-${index + 1}`),
        category: record.title,
        workShape: record.work_shape as ObservedVariation['workShape'],
        title: String(rawVariation.title ?? 'Observed catalog variation'),
        stepsCount: Number(rawVariation.steps_count ?? record.steps.length),
        stepsSummary: String(
            rawVariation.steps_summary ?? 'Observed variation from seeded catalog data.',
        ),
        adoptedJobsCount: Number(rawVariation.adopted_jobs_count ?? 0),
        adoptionRate: Number(rawVariation.adoption_rate ?? 0),
        isPromoted: index === 0,
        steps: catalogSteps(record),
    }));
}

export default function WorkCatalog({ workCatalog }: { workCatalog?: WorkCatalogRecord[] }) {
    const publishedCatalog = React.useMemo(() => workCatalog ?? [], [workCatalog]);
    const initialRecord = publishedCatalog[0];
    const initialShape =
        (initialRecord?.work_shape as 'A1' | 'A3' | 'A4' | 'A9' | undefined) ?? 'A1';
    const [selectedShape, setSelectedShape] = React.useState<'A1' | 'A3' | 'A4' | 'A9'>(
        initialShape,
    );
    const [steps, setSteps] = React.useState<MilestoneStep[]>(
        catalogSteps(initialRecord).length > 0
            ? catalogSteps(initialRecord)
            : DEFAULT_STEPS[initialShape],
    );
    const [varianceThreshold, setVarianceThreshold] = React.useState(
        String(initialRecord?.variance_threshold_percent ?? 10),
    );
    const [evalWindowHours, setEvalWindowHours] = React.useState(
        String(initialRecord?.evaluation_window_hours ?? 48),
    );
    const [catalogView, setCatalogView] = React.useState<'builder' | 'observed'>('builder');
    const [variations, setVariations] = React.useState<ObservedVariation[]>(
        catalogVariations(initialRecord).length > 0
            ? catalogVariations(initialRecord)
            : SAMPLE_OBSERVED,
    );
    const [promotedId, setPromotedId] = React.useState<string | null>(null);
    const [isSaved, setIsSaved] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(false);

    // 2D Canvas Drag State
    const [dragState, setDragState] = React.useState<{
        nodeId: string;
        startX: number;
        startY: number;
        initialNodeX: number;
        initialNodeY: number;
    } | null>(null);

    // Node Selection & Inspector Sheet
    const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
        catalogSteps(initialRecord)[0]?.id ?? DEFAULT_STEPS[initialShape][0]?.id ?? null,
    );
    React.useEffect(() => {
        const record = publishedCatalog.find((candidate) => candidate.work_shape === selectedShape);
        if (!record) return;

        const nextSteps = catalogSteps(record);
        setSteps(nextSteps);
        setSelectedNodeId(nextSteps[0]?.id ?? null);
        setVarianceThreshold(String(record.variance_threshold_percent));
        setEvalWindowHours(String(record.evaluation_window_hours));

        const nextVariations = catalogVariations(record);
        setVariations(nextVariations.length > 0 ? nextVariations : SAMPLE_OBSERVED);
    }, [publishedCatalog, selectedShape]);
    const [isInspectorOpen, setIsInspectorOpen] = React.useState(false);

    // Add Step Dialog State
    const [isAddStepOpen, setIsAddStepOpen] = React.useState(false);
    const [insertAfterOrdinal, setInsertAfterOrdinal] = React.useState<number | null>(null);
    const [newStepTitle, setNewStepTitle] = React.useState('');
    const [newStepDesc, setNewStepDesc] = React.useState('');
    const [newStepEvidenceType, setNewStepEvidenceType] =
        React.useState<MilestoneStep['evidenceType']>('photo_required');
    const [newStepEvidenceDesc, setNewStepEvidenceDesc] = React.useState('');

    const selectedStep = React.useMemo(() => {
        return steps.find((s) => s.id === selectedNodeId) || steps[0] || null;
    }, [steps, selectedNodeId]);

    const handleShapeSelect = (shape: 'A1' | 'A3' | 'A4' | 'A9') => {
        setSelectedShape(shape);
        const record = publishedCatalog.find((candidate) => candidate.work_shape === shape);
        const nextSteps = catalogSteps(record);
        setSteps(nextSteps.length > 0 ? nextSteps : DEFAULT_STEPS[shape] || []);
        setSelectedNodeId(nextSteps[0]?.id || DEFAULT_STEPS[shape]?.[0]?.id || null);
    };

    // Pointer event drag handlers
    const handlePointerDown = (e: React.PointerEvent, step: MilestoneStep) => {
        e.stopPropagation();
        setSelectedNodeId(step.id);
        const currentX = step.x ?? 60 + (step.ordinal - 1) * 30;
        const currentY = step.y ?? 50 + (step.ordinal - 1) * 180;
        setDragState({
            nodeId: step.id,
            startX: e.clientX,
            startY: e.clientY,
            initialNodeX: currentX,
            initialNodeY: currentY,
        });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragState) return;
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        const newX = Math.max(20, Math.min(650, dragState.initialNodeX + dx));
        const newY = Math.max(20, Math.min(950, dragState.initialNodeY + dy));

        setSteps((prev) =>
            prev.map((s) => (s.id === dragState.nodeId ? { ...s, x: newX, y: newY } : s)),
        );
    };

    const handlePointerUp = () => {
        setDragState(null);
    };

    // Auto-layout / reset positions
    const handleAutoLayout = () => {
        setSteps((prev) =>
            prev.map((s, idx) => ({
                ...s,
                x: 60 + idx * 30,
                y: 50 + idx * 180,
            })),
        );
    };

    const handleInsertAfter = (ordinal: number) => {
        setInsertAfterOrdinal(ordinal);
        setIsAddStepOpen(true);
    };

    const handleAddStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStepTitle.trim()) return;

        const targetOrdinal =
            insertAfterOrdinal !== null ? insertAfterOrdinal + 1 : steps.length + 1;
        const anchor =
            insertAfterOrdinal !== null ? steps[insertAfterOrdinal - 1] : steps[steps.length - 1];
        const nextX = anchor ? (anchor.x ?? 60) + 30 : 60;
        const nextY = anchor ? (anchor.y ?? 50) + 180 : 50;

        const newStep: MilestoneStep = {
            id: `step-${Date.now()}`,
            ordinal: targetOrdinal,
            title: newStepTitle.trim(),
            description: newStepDesc.trim() || 'Milestone deliverable verification step.',
            evidenceType: newStepEvidenceType,
            evidenceDescription: newStepEvidenceDesc.trim() || 'Required verifiable proof.',
            mandatory: true,
            x: nextX,
            y: nextY,
        };

        if (insertAfterOrdinal !== null) {
            const updated = [
                ...steps.slice(0, insertAfterOrdinal),
                newStep,
                ...steps.slice(insertAfterOrdinal),
            ].map((s, idx) => ({ ...s, ordinal: idx + 1 }));
            setSteps(updated);
            setInsertAfterOrdinal(null);
        } else {
            setSteps([...steps, newStep]);
        }

        setSelectedNodeId(newStep.id);
        setIsAddStepOpen(false);
        setNewStepTitle('');
        setNewStepDesc('');
        setNewStepEvidenceDesc('');
    };

    const handleRemoveStep = (id: string) => {
        const remaining = steps.filter((s) => s.id !== id);
        const reordered = remaining.map((s, idx) => ({ ...s, ordinal: idx + 1 }));
        setSteps(reordered);
        if (selectedNodeId === id) {
            setSelectedNodeId(reordered[0]?.id || null);
        }
    };

    const handleUpdateSelectedStep = (updated: Partial<MilestoneStep>) => {
        if (!selectedNodeId) return;
        setSteps((prev) => prev.map((s) => (s.id === selectedNodeId ? { ...s, ...updated } : s)));
    };

    const handleInspectVariationOnCanvas = (v: ObservedVariation) => {
        setSelectedShape(v.workShape);
        setSteps(v.steps);
        setSelectedNodeId(v.steps[0]?.id || null);
        setCatalogView('builder');
    };

    const handlePromote = (id: string) => {
        setPromotedId(id);
        setVariations((prev) => prev.map((v) => (v.id === id ? { ...v, isPromoted: true } : v)));
        setTimeout(() => setPromotedId(null), 3000);
    };

    const handleSaveBlueprint = () => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
    };

    return (
        <AdminLayout currentSection="inspector" title="Work Catalog Studio">
            <Head title="Work Catalog Studio — Serbizyu Admin" />

            {/* Header Overview */}
            <div className="flex flex-col gap-1">
                <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
                    Work Contract Blueprint Studio &amp; Milestone Engine
                </h1>
                <p className="text-xs text-muted-foreground">
                    Drag and arrange milestone nodes on the visual canvas. Author canonical
                    execution templates for A1, A3, A4, and A9 shapes with verifiable step gates
                    (Spec 22).
                </p>
            </div>

            {/* 4 Graphic KPI Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <AdminMetricCard
                    title="Canonical Shapes"
                    value="4 Shapes"
                    statusBeacon="live"
                    accentColor="#10b981"
                    trendData={[4, 4, 4, 4, 4, 4]}
                    subtext="A1 Project, A3 Appt, A4 Handoff, A9 Digital"
                    badgeText="Standard"
                />

                <AdminMetricCard
                    title="Milestone Templates"
                    value={`${steps.length} Steps in ${selectedShape}`}
                    statusBeacon="live"
                    accentColor="#38bdf8"
                    donutPct={85}
                    subtext="Active pipeline milestone sequence"
                />

                <AdminMetricCard
                    title="Buy-on-Behalf Variance"
                    value={`±${varianceThreshold}% Max`}
                    statusBeacon="warning"
                    accentColor="#f59e0b"
                    subtext="Allowable delta between budget and receipt"
                />

                <AdminMetricCard
                    title="Auto-Sign-off SLA"
                    value={`${evalWindowHours} Hours`}
                    statusBeacon="purple"
                    accentColor="#a855f7"
                    subtext="Citizen review countdown prior to auto-acceptance"
                />
            </div>

            {/* Sub-Navigation & Mode Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs font-medium">
                    <button
                        type="button"
                        onClick={() => setCatalogView('builder')}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-all ${
                            catalogView === 'builder'
                                ? 'bg-background font-semibold text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Layers className="size-3.5 text-primary" />
                        <span>Interactive Workflow Canvas ({selectedShape})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setCatalogView('observed')}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-all ${
                            catalogView === 'observed'
                                ? 'bg-background font-semibold text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <TrendingUp className="size-3.5 text-emerald-500" />
                        <span>In-The-Wild Work Variations ({variations.length})</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {catalogView === 'builder' && (
                        <Button
                            size="sm"
                            className="h-8 gap-1.5 bg-primary text-xs hover:bg-primary/90"
                            onClick={handleSaveBlueprint}
                        >
                            <Save className="size-3.5" />
                            <span>Save Template Blueprint</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Alerts */}
            {isSaved && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs font-medium text-green-500">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>
                        Work Contract template v2 saved successfully. Checksum committed to catalog.
                    </span>
                </div>
            )}

            {promotedId && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs font-medium text-green-500">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>
                        Variation declared as Recommended Category Blueprint! Published in catalog.
                    </span>
                </div>
            )}

            {/* ===================================================================
           VIEW 1: INTERACTIVE WORKFLOW BUILDER CANVAS (2D DRAG & CONNECTORS)
           =================================================================== */}
            {catalogView === 'builder' && (
                <div className="grid gap-6 lg:grid-cols-4">
                    {/* Left Column: Shape Selector & Invariants */}
                    <div className="flex flex-col gap-4">
                        <Card>
                            <CardHeader className="border-b border-border pb-3">
                                <CardTitle className="text-sm font-bold">Work Shapes</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">
                                    Select fulfillment archetype to configure.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2 pt-3">
                                {[
                                    {
                                        id: 'A1' as const,
                                        title: 'A1 Linear Project',
                                        icon: <Wrench className="size-4 text-blue-500" />,
                                        desc: 'Sequential milestone deliverables with sign-off.',
                                    },
                                    {
                                        id: 'A3' as const,
                                        title: 'A3 Scheduled Appointment',
                                        icon: <Calendar className="size-4 text-emerald-500" />,
                                        desc: 'Time-slotted on-site check-in with attendance.',
                                    },
                                    {
                                        id: 'A4' as const,
                                        title: 'A4 Physical Handoff',
                                        icon: <Truck className="size-4 text-amber-500" />,
                                        desc: 'Preparation, courier handoff & buy-on-behalf.',
                                    },
                                    {
                                        id: 'A9' as const,
                                        title: 'A9 Digital Delivery',
                                        icon: <Zap className="size-4 text-purple-500" />,
                                        desc: 'File artifacts, malware scanning & downloads.',
                                    },
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => handleShapeSelect(s.id)}
                                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                                            selectedShape === s.id
                                                ? 'border-primary bg-primary/5 shadow-xs'
                                                : 'border-border hover:bg-muted/30'
                                        }`}
                                    >
                                        <div className="mt-0.5 shrink-0 rounded-md bg-muted/60 p-1">
                                            {s.icon}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-foreground">
                                                {s.title}
                                            </div>
                                            <div className="mt-0.5 text-[10.5px] leading-tight text-muted-foreground">
                                                {s.desc}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Selected Step Inspector Panel (Quick Edit on Left) */}
                        {selectedStep && (
                            <Card className="border-primary/40 bg-card">
                                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-2.5">
                                    <div>
                                        <CardTitle className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-primary uppercase">
                                            <Settings className="size-3.5" />
                                            <span>Node {selectedStep.ordinal} Properties</span>
                                        </CardTitle>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-1.5 text-[10px]"
                                        onClick={() => setIsInspectorOpen(true)}
                                    >
                                        <Pencil className="mr-1 size-2.5" />
                                        Full Sheet
                                    </Button>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-2.5 pt-3 text-xs">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Title
                                        </span>
                                        <Input
                                            value={selectedStep.title}
                                            onChange={(e) =>
                                                handleUpdateSelectedStep({ title: e.target.value })
                                            }
                                            className="h-7 text-xs"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Evidence Rule
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="w-fit text-[10px] capitalize"
                                        >
                                            {selectedStep.evidenceType.replace('_', ' ')}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">
                                            {selectedStep.evidenceDescription}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t border-border pt-1 font-mono text-[10px] text-muted-foreground">
                                        <span>
                                            Position: ({selectedStep.x ?? 60}px,{' '}
                                            {selectedStep.y ?? 50}px)
                                        </span>
                                        <span className="font-bold text-emerald-500">
                                            Gate Active ✓
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Execution Invariant Gates */}
                        <Card>
                            <CardHeader className="border-b border-border pb-3">
                                <CardTitle className="text-sm font-bold">Execution Gates</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 pt-3 text-xs">
                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-xs font-semibold">
                                        Buy-on-Behalf Variance Limit (±%)
                                    </Label>
                                    <Input
                                        type="number"
                                        value={varianceThreshold}
                                        onChange={(e) => setVarianceThreshold(e.target.value)}
                                        className="h-8 font-mono text-xs"
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                        Receipts exceeding +{varianceThreshold}% require mandatory
                                        citizen re-approval.
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label className="text-xs font-semibold">
                                        Evaluation Window (Hours)
                                    </Label>
                                    <Input
                                        type="number"
                                        value={evalWindowHours}
                                        onChange={(e) => setEvalWindowHours(e.target.value)}
                                        className="h-8 font-mono text-xs"
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                        Uncontested proposals auto-accept after {evalWindowHours}{' '}
                                        hours.
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Columns: The Visual 2D Draggable Node Canvas */}
                    {/* Overlay backdrop when in expanded studio mode */}
                    {isExpanded && (
                        <div
                            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs"
                            onClick={() => setIsExpanded(false)}
                        />
                    )}

                    <div
                        className={
                            isExpanded
                                ? 'fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border-2 border-primary/50 bg-card shadow-2xl'
                                : 'flex flex-col gap-4 lg:col-span-3'
                        }
                    >
                        <Card
                            className={`overflow-hidden border-border ${isExpanded ? 'flex h-full flex-col rounded-none border-none shadow-none' : ''}`}
                        >
                            {/* Canvas Header */}
                            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border bg-card/60 p-4 backdrop-blur-xs">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                                        <Layers className="size-4 text-primary" />
                                        <span>Workflow Canvas: {selectedShape} Pipeline</span>
                                    </CardTitle>
                                    <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                                        Click &amp; drag nodes to rearrange layout. Click node to
                                        edit properties. Click (+) port to extend.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 cursor-pointer gap-1 text-xs"
                                        onClick={handleAutoLayout}
                                        title="Reset node positions to clean layout"
                                    >
                                        <RotateCcw className="size-3" />
                                        <span>Auto-Layout</span>
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 cursor-pointer gap-1.5 text-xs"
                                        onClick={() => setIsExpanded(!isExpanded)}
                                    >
                                        {isExpanded ? (
                                            <Minimize2 className="size-3.5" />
                                        ) : (
                                            <Maximize2 className="size-3.5" />
                                        )}
                                        <span>
                                            {isExpanded ? 'Minimize Studio' : 'Expand Studio'}
                                        </span>
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 cursor-pointer gap-1 text-xs"
                                        onClick={() => {
                                            setInsertAfterOrdinal(null);
                                            setIsAddStepOpen(true);
                                        }}
                                    >
                                        <Plus className="size-3" />
                                        <span>Add Task Node</span>
                                    </Button>
                                </div>
                            </CardHeader>

                            {/* 2D Drag-and-Drop Dot-Grid Canvas */}
                            <div
                                className={`relative w-full overflow-auto select-none ${
                                    isExpanded ? 'min-h-0 flex-1' : 'min-h-[580px]'
                                }`}
                                style={{
                                    backgroundColor: 'var(--card)',
                                    backgroundImage:
                                        'radial-gradient(rgba(148, 163, 184, 0.22) 1px, transparent 1px)',
                                    backgroundSize: '18px 18px',
                                    height: isExpanded ? '100%' : '580px',
                                }}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onClick={() => setSelectedNodeId(null)}
                            >
                                {/* SVG Dynamic Connecting Bezier Wires */}
                                <svg className="pointer-events-none absolute inset-0 z-0 h-[1200px] w-[1200px]">
                                    <defs>
                                        <linearGradient
                                            id="wire-gradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop offset="0%" stopColor="#10b981" />
                                            <stop offset="100%" stopColor="#38bdf8" />
                                        </linearGradient>
                                    </defs>
                                    {steps.slice(0, -1).map((current, idx) => {
                                        const next = steps[idx + 1];
                                        const curX = current.x ?? 60 + (current.ordinal - 1) * 30;
                                        const curY = current.y ?? 50 + (current.ordinal - 1) * 180;
                                        const nextX = next.x ?? 60 + (next.ordinal - 1) * 30;
                                        const nextY = next.y ?? 50 + (next.ordinal - 1) * 180;

                                        // Output port of current node (bottom center of 340px width card)
                                        const x1 = curX + 170;
                                        const y1 = curY + 140;

                                        // Input port of next node (top center)
                                        const x2 = nextX + 170;
                                        const y2 = nextY;

                                        const cY1 = y1 + Math.max(30, (y2 - y1) / 2);
                                        const cY2 = y2 - Math.max(30, (y2 - y1) / 2);

                                        return (
                                            <path
                                                key={`${current.id}-${next.id}`}
                                                d={`M ${x1} ${y1} C ${x1} ${cY1}, ${x2} ${cY2}, ${x2} ${y2}`}
                                                fill="none"
                                                stroke="#10b981"
                                                strokeWidth="2.5"
                                                strokeDasharray="5 5"
                                                className="opacity-70"
                                            />
                                        );
                                    })}
                                </svg>

                                {/* Render Draggable Nodes */}
                                {steps.map((step) => {
                                    const nodeX = step.x ?? 60 + (step.ordinal - 1) * 30;
                                    const nodeY = step.y ?? 50 + (step.ordinal - 1) * 180;
                                    const isSelected = selectedNodeId === step.id;

                                    return (
                                        <div
                                            key={step.id}
                                            style={{
                                                transform: `translate3d(${nodeX}px, ${nodeY}px, 0)`,
                                                width: '340px',
                                            }}
                                            className={`absolute z-10 cursor-pointer rounded-xl border bg-background p-3.5 shadow-md transition-shadow ${
                                                isSelected
                                                    ? 'border-primary shadow-lg ring-2 ring-primary/40'
                                                    : 'border-border hover:border-primary/40 hover:shadow-md'
                                            }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedNodeId(step.id);
                                            }}
                                        >
                                            {/* Drag Handle Top Bar */}
                                            <div
                                                className="flex cursor-grab items-center justify-between border-b border-border/60 pb-2 active:cursor-grabbing"
                                                onPointerDown={(e) => handlePointerDown(e, step)}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <GripVertical className="size-3 text-muted-foreground" />
                                                    <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/15 font-mono text-[10px] font-bold text-primary">
                                                        {step.ordinal}
                                                    </div>
                                                    <span className="max-w-[160px] truncate text-xs font-bold text-foreground">
                                                        {step.title}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-6 text-muted-foreground hover:text-foreground"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedNodeId(step.id);
                                                            setIsInspectorOpen(true);
                                                        }}
                                                        title="Configure Node"
                                                    >
                                                        <Settings className="size-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-6 text-muted-foreground hover:text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveStep(step.id);
                                                        }}
                                                        title="Delete Node"
                                                    >
                                                        <Trash2 className="size-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Node Body */}
                                            <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
                                                {step.description}
                                            </p>

                                            {/* Evidence Footer */}
                                            <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2 text-[10.5px]">
                                                <span className="flex max-w-[200px] items-center gap-1 truncate font-medium text-foreground/80">
                                                    <FileCheck2 className="size-3 shrink-0 text-primary" />
                                                    <span className="truncate">
                                                        {step.evidenceDescription}
                                                    </span>
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="shrink-0 font-mono text-[8.5px] capitalize"
                                                >
                                                    {step.evidenceType.replace('_', ' ')}
                                                </Badge>
                                            </div>

                                            {/* Attached Floating Output Plus Port Button */}
                                            <button
                                                type="button"
                                                className="absolute -bottom-3 left-1/2 z-20 flex size-6 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-primary bg-card text-primary shadow-md transition-all hover:scale-120 hover:bg-primary hover:text-primary-foreground"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleInsertAfter(step.ordinal);
                                                }}
                                                title={`Extend from Step ${step.ordinal}`}
                                            >
                                                <Plus className="size-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* ===================================================================
           VIEW 2: IN-THE-WILD POPULAR VARIATIONS & CURATION ENGINE
           =================================================================== */}
            {catalogView === 'observed' && (
                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader className="border-b border-border pb-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                                        <Sparkles className="size-4 text-emerald-500" />
                                        <span>In-The-Wild Observed Work Variations</span>
                                    </CardTitle>
                                    <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                                        Real-world variations created by providers in proposals.
                                        Inspect on the canvas and declare high-performing patterns
                                        as category standards.
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {variations.length} Detected Patterns
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 pt-4">
                            {variations.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-xs transition-all hover:border-border/80 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex max-w-xl flex-col gap-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="border-primary/30 font-mono text-[9px] text-primary"
                                            >
                                                {item.category}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-[9px]"
                                            >
                                                Shape: {item.workShape}
                                            </Badge>
                                            {item.isPromoted && (
                                                <Badge
                                                    variant="default"
                                                    className="gap-1 bg-emerald-600 text-[9px] text-white"
                                                >
                                                    <Check className="size-2.5" />
                                                    <span>Standard Blueprint</span>
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold text-foreground">
                                            {item.title}
                                        </div>
                                        <div className="rounded-sm bg-muted/30 p-1.5 font-mono text-[11px] text-muted-foreground">
                                            {item.stepsSummary}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-foreground">
                                                {item.adoptedJobsCount} Jobs
                                            </span>
                                            <span className="font-mono text-[10px] font-semibold text-emerald-500">
                                                ({item.adoptionRate}% rate)
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2.5 text-xs"
                                                onClick={() => handleInspectVariationOnCanvas(item)}
                                            >
                                                Inspect on Canvas
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={item.isPromoted ? 'outline' : 'default'}
                                                className="h-7 px-3 text-xs"
                                                disabled={item.isPromoted}
                                                onClick={() => handlePromote(item.id)}
                                            >
                                                {item.isPromoted
                                                    ? 'Promoted to Standard'
                                                    : 'Declare as Category Blueprint'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Add Step Node Dialog */}
            <Dialog open={isAddStepOpen} onOpenChange={setIsAddStepOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                            {insertAfterOrdinal !== null
                                ? `Insert Milestone After Step ${insertAfterOrdinal}`
                                : 'Add Milestone Task Node'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Configure an execution milestone node for shape {selectedShape}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddStep} className="flex flex-col gap-4 pt-1">
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="step-title"
                                className="text-xs font-semibold text-foreground"
                            >
                                Milestone Title
                            </Label>
                            <Input
                                id="step-title"
                                placeholder="e.g. Suction Pressure Gauge Check"
                                value={newStepTitle}
                                onChange={(e) => setNewStepTitle(e.target.value)}
                                className="h-8 border-border bg-muted/20 text-xs text-foreground"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="step-desc"
                                className="text-xs font-semibold text-foreground"
                            >
                                Description / Instructions
                            </Label>
                            <Textarea
                                id="step-desc"
                                placeholder="Describe the physical or digital task the provider must complete..."
                                value={newStepDesc}
                                onChange={(e) => setNewStepDesc(e.target.value)}
                                className="min-h-[65px] border-border bg-muted/20 text-xs leading-relaxed text-foreground"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="evidence-type"
                                className="text-xs font-semibold text-foreground"
                            >
                                Verifiable Evidence Gate Type
                            </Label>
                            <Select
                                value={newStepEvidenceType}
                                onValueChange={(val) =>
                                    setNewStepEvidenceType(val as MilestoneStep['evidenceType'])
                                }
                            >
                                <SelectTrigger
                                    id="evidence-type"
                                    className="h-8 border-border bg-muted/20 text-xs text-foreground"
                                >
                                    <SelectValue placeholder="Select evidence type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="photo_required" className="text-xs">
                                        Photo Evidence Required
                                    </SelectItem>
                                    <SelectItem value="video_required" className="text-xs">
                                        Video Evidence Required
                                    </SelectItem>
                                    <SelectItem value="meter_log" className="text-xs">
                                        Digital Meter / Amperage Log
                                    </SelectItem>
                                    <SelectItem value="receipt_upload" className="text-xs">
                                        Store Receipt / Parts Slip
                                    </SelectItem>
                                    <SelectItem value="dual_sign" className="text-xs">
                                        Dual Sign-off / Signature
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="evidence-desc"
                                className="text-xs font-semibold text-foreground"
                            >
                                Evidence Specification
                            </Label>
                            <Input
                                id="evidence-desc"
                                placeholder="e.g. Digital pressure gauge showing 40 PSI hold."
                                value={newStepEvidenceDesc}
                                onChange={(e) => setNewStepEvidenceDesc(e.target.value)}
                                className="h-8 border-border bg-muted/20 text-xs text-foreground"
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setIsAddStepOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                className="h-8 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                Insert Step Node
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Selected Node Property Inspector Sheet */}
            <Sheet open={isInspectorOpen} onOpenChange={setIsInspectorOpen}>
                <SheetContent
                    side="right"
                    className="flex h-full flex-col overflow-hidden p-0 sm:max-w-lg"
                >
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Settings className="size-4 text-primary" />
                            <span>Configure Node {selectedStep?.ordinal}</span>
                        </SheetTitle>
                        <SheetDescription>
                            Edit milestone parameters, evidence gates, and verification criteria.
                        </SheetDescription>
                    </SheetHeader>

                    {selectedStep && (
                        <div className="flex flex-1 flex-col gap-4.5 overflow-y-auto p-6">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-semibold text-foreground">
                                    Milestone Title
                                </Label>
                                <Input
                                    value={selectedStep.title}
                                    onChange={(e) =>
                                        handleUpdateSelectedStep({ title: e.target.value })
                                    }
                                    className="h-8 border-border bg-muted/20 text-xs text-foreground"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-semibold text-foreground">
                                    Task Instructions
                                </Label>
                                <Textarea
                                    value={selectedStep.description}
                                    onChange={(e) =>
                                        handleUpdateSelectedStep({ description: e.target.value })
                                    }
                                    className="min-h-[85px] border-border bg-muted/20 text-xs leading-relaxed text-foreground"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-semibold text-foreground">
                                    Evidence Gate Type
                                </Label>
                                <Select
                                    value={selectedStep.evidenceType}
                                    onValueChange={(val) =>
                                        handleUpdateSelectedStep({
                                            evidenceType: val as MilestoneStep['evidenceType'],
                                        })
                                    }
                                >
                                    <SelectTrigger className="h-8 border-border bg-muted/20 text-xs text-foreground">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="photo_required" className="text-xs">
                                            Photo Evidence Required
                                        </SelectItem>
                                        <SelectItem value="video_required" className="text-xs">
                                            Video Evidence Required
                                        </SelectItem>
                                        <SelectItem value="meter_log" className="text-xs">
                                            Digital Meter / Amperage Log
                                        </SelectItem>
                                        <SelectItem value="receipt_upload" className="text-xs">
                                            Store Receipt / Parts Slip
                                        </SelectItem>
                                        <SelectItem value="dual_sign" className="text-xs">
                                            Dual Sign-off / Signature
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs font-semibold text-foreground">
                                    Evidence Specification Proof
                                </Label>
                                <Input
                                    value={selectedStep.evidenceDescription}
                                    onChange={(e) =>
                                        handleUpdateSelectedStep({
                                            evidenceDescription: e.target.value,
                                        })
                                    }
                                    className="h-8 border-border bg-muted/20 text-xs text-foreground"
                                />
                            </div>

                            <div className="mt-1 flex flex-col gap-1.5 rounded-lg border border-border bg-muted/20 p-3 text-xs">
                                <span className="font-semibold text-foreground">
                                    Canvas Coordinates
                                </span>
                                <div className="flex gap-4 font-mono text-muted-foreground">
                                    <span>X: {selectedStep.x ?? 60}px</span>
                                    <span>Y: {selectedStep.y ?? 50}px</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <SheetFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setIsInspectorOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="h-8 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
                            onClick={() => setIsInspectorOpen(false)}
                        >
                            Apply Properties
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </AdminLayout>
    );
}
