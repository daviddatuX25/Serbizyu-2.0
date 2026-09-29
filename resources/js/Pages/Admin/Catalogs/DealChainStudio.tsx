import { Head, router } from '@inertiajs/react';
import * as React from 'react';
import {
    Check,
    CheckCircle2,
    Network,
    Plus,
    Send,
    ShieldCheck,
    Sparkles,
    TrendingUp,
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
import { AdminLayout } from '@/layouts/AdminLayout';
import { AdminMetricCard } from '@/components/admin/GraphicMetrics';
import {
    DealChainPipelineBuilder,
    type PipelineNode,
    type PipelineDependency,
} from '@/components/marketplace/DealChainPipelineBuilder';
import type { PartnerCandidate } from '@/components/marketplace/PartnerSelectionDrawer';
import type { DealChainCatalogRecord } from '@/types';

interface ObservedRelay {
    id: string;
    category: string;
    title: string;
    nodesCount: number;
    vendorsSummary: string;
    adoptedJobsCount: number;
    completionRate: number;
    isPromoted: boolean;
    nodes: PipelineNode[];
    dependencies: PipelineDependency[];
}

const SAMPLE_OBSERVED_RELAYS: ObservedRelay[] = [
    {
        id: 'obs-1',
        category: 'Home Appliance',
        title: 'Emergency Capacitor Replacement & Wiring Shuttle',
        nodesCount: 3,
        vendorsSummary:
            '1. Tagudin Hardware Depot -> 2. Danny Express Moto -> 3. Arman Electric & Refrigeration',
        adoptedJobsCount: 42,
        completionRate: 98,
        isPromoted: true,
        nodes: [
            {
                key: 'obs1_store',
                needKind: 'product',
                title: '35uF AC Run Capacitor',
                role: 'Hardware / Part Supply',
                type: 'store',
                feeMinor: 18000,
                assignedPartner: {
                    id: 'part_tagudin_hw',
                    title: 'Tagudin Hardware Depot',
                    providerName: 'Tagudin Hardware Depot',
                    priceMinor: 18000,
                    barangay: 'Poblacion East',
                },
            },
            {
                key: 'obs1_courier',
                needKind: 'service',
                title: 'Express Doorstep Delivery',
                role: 'Doorstep Courier Runner',
                type: 'delivery',
                feeMinor: 3500,
                assignedPartner: {
                    id: 'rider_danny',
                    title: 'Danny Express Motorcycle Pool',
                    providerName: 'Danny Express Motorcycle Pool',
                    priceMinor: 3500,
                    barangay: 'Poblacion West',
                },
            },
            {
                key: 'obs1_labor',
                needKind: 'service',
                title: 'Aircon Cleaning & Capacitor Wiring',
                role: 'Trade Technician / Labor',
                type: 'labor',
                feeMinor: 25000,
                assignedPartner: {
                    id: 'tech_arman',
                    title: 'Arman Electric & Refrigeration',
                    providerName: 'Arman Electric & Refrigeration',
                    priceMinor: 25000,
                    barangay: 'Bitalag',
                },
            },
        ],
        dependencies: [
            {
                predecessor: 'obs1_store',
                successor: 'obs1_courier',
                conditionCode: 'source_ready',
                allowBypass: false,
            },
            {
                predecessor: 'obs1_courier',
                successor: 'obs1_labor',
                conditionCode: 'delivered_to_site',
                allowBypass: false,
            },
        ],
    },
    {
        id: 'obs-2',
        category: 'Local Food & Bakery',
        title: 'Traditional Bibingka Bakery Batch, Insulated Van & Table Setup',
        nodesCount: 3,
        vendorsSummary:
            '1. Ate Gina Traditional Bakes -> 2. Tagudin Express Courier -> 3. Maya Event Setup',
        adoptedJobsCount: 22,
        completionRate: 94,
        isPromoted: false,
        nodes: [
            {
                key: 'obs2_bakery',
                needKind: 'product',
                title: 'Warm Bibingka Fresh Batch',
                role: 'Local Food Merchant',
                type: 'store',
                feeMinor: 12000,
                assignedPartner: {
                    id: 'bake_gina',
                    title: 'Ate Gina Traditional Bakes',
                    providerName: 'Ate Gina Traditional Bakes',
                    priceMinor: 12000,
                    barangay: 'Del Pilar',
                },
            },
            {
                key: 'obs2_transit',
                needKind: 'service',
                title: 'Insulated Food Route Transit',
                role: 'Doorstep Courier Runner',
                type: 'delivery',
                feeMinor: 4500,
            },
            {
                key: 'obs2_setup',
                needKind: 'service',
                title: 'Event Buffet Catering Staging',
                role: 'Trade Technician / Labor',
                type: 'labor',
                feeMinor: 15000,
            },
        ],
        dependencies: [
            {
                predecessor: 'obs2_bakery',
                successor: 'obs2_transit',
                conditionCode: 'source_ready',
                allowBypass: false,
            },
            {
                predecessor: 'obs2_transit',
                successor: 'obs2_setup',
                conditionCode: 'delivered_to_site',
                allowBypass: false,
            },
        ],
    },
];

function mapCatalogNodesToPipelineNodes(recipe: DealChainCatalogRecord): PipelineNode[] {
    return (recipe.nodes || []).map((node, idx) => ({
        key: node.key || `step_${recipe.recipeId}_${idx + 1}`,
        needKind: node.needKind || (node.type === 'store' ? 'product' : 'service'),
        title: node.title,
        role: node.role,
        type: node.type,
        feeMinor: node.priceMinor ?? (node.type === 'store' ? 18000 : node.type === 'delivery' ? 3500 : 25000),
        assignedPartner: node.providerName
            ? {
                  id: node.listingId || `partner_${idx}`,
                  title: node.title,
                  providerName: node.providerName,
                  priceMinor: node.priceMinor ?? 0,
              }
            : null,
    }));
}

function mapCatalogDependenciesToPipeline(
    recipe: DealChainCatalogRecord,
    mappedNodes: PipelineNode[],
): PipelineDependency[] {
    if (recipe.dependencies && recipe.dependencies.length > 0) {
        return recipe.dependencies.map((dep) => ({
            predecessor: dep.predecessor,
            successor: dep.successor,
            conditionCode: dep.conditionCode,
            allowBypass: dep.allowBypass ?? false,
        }));
    }

    // Default sequential pipeline dependencies
    const deps: PipelineDependency[] = [];
    for (let i = 0; i < mappedNodes.length - 1; i++) {
        const pred = mappedNodes[i];
        const succ = mappedNodes[i + 1];
        deps.push({
            predecessor: pred.key,
            successor: succ.key,
            conditionCode:
                pred.type === 'store'
                    ? 'source_ready'
                    : pred.type === 'delivery'
                      ? 'delivered_to_site'
                      : 'work_completed',
            allowBypass: false,
        });
    }
    return deps;
}

interface DealChainStudioProps {
    dealChainCatalog?: DealChainCatalogRecord[];
    partnerCandidates?: PartnerCandidate[];
    availableCategories?: Array<{ code: string; name: string }>;
}

export default function DealChainStudio({
    dealChainCatalog = [],
    partnerCandidates = [],
    availableCategories = [],
}: DealChainStudioProps) {
    const catalogRecipes = dealChainCatalog;
    const [selectedRecipeCode, setSelectedRecipeCode] = React.useState<string>(
        catalogRecipes[0]?.recipeId || 'turnkey_parts',
    );

    const activeRecipe = React.useMemo(() => {
        return (
            catalogRecipes.find((r) => r.recipeId === selectedRecipeCode) ||
            catalogRecipes[0] ||
            null
        );
    }, [catalogRecipes, selectedRecipeCode]);

    // Active Pipeline State
    const [pipelineNodes, setPipelineNodes] = React.useState<PipelineNode[]>(() => {
        if (!activeRecipe) return [];
        return mapCatalogNodesToPipelineNodes(activeRecipe);
    });

    const [pipelineDependencies, setPipelineDependencies] = React.useState<PipelineDependency[]>(
        () => {
            if (!activeRecipe) return [];
            const mapped = mapCatalogNodesToPipelineNodes(activeRecipe);
            return mapCatalogDependenciesToPipeline(activeRecipe, mapped);
        },
    );

    const [studioView, setStudioView] = React.useState<'builder' | 'observed'>('builder');
    const [observedRelays, setObservedRelays] =
        React.useState<ObservedRelay[]>(SAMPLE_OBSERVED_RELAYS);
    const [promotedRelayId, setPromotedRelayId] = React.useState<string | null>(null);
    const [isPublishing, setIsPublishing] = React.useState(false);
    const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(null);

    // New Recipe Blueprint Modal State
    const [isNewBlueprintOpen, setIsNewBlueprintOpen] = React.useState(false);
    const [newTitle, setNewTitle] = React.useState('');
    const [newRecipeCode, setNewRecipeCode] = React.useState('');
    const [newCategory, setNewCategory] = React.useState(
        availableCategories[0]?.code || 'repairs',
    );
    const [newDescription, setNewDescription] = React.useState('');

    // Keep pipeline in sync when activeRecipe switches
    React.useEffect(() => {
        if (activeRecipe) {
            const mappedNodes = mapCatalogNodesToPipelineNodes(activeRecipe);
            setPipelineNodes(mappedNodes);
            setPipelineDependencies(mapCatalogDependenciesToPipeline(activeRecipe, mappedNodes));
        }
    }, [activeRecipe?.recipeId, activeRecipe?.catalogVersion]);

    const handleSelectRecipe = (recipe: DealChainCatalogRecord) => {
        setSelectedRecipeCode(recipe.recipeId);
        const mappedNodes = mapCatalogNodesToPipelineNodes(recipe);
        setPipelineNodes(mappedNodes);
        setPipelineDependencies(mapCatalogDependenciesToPipeline(recipe, mappedNodes));
        setStudioView('builder');
    };

    const handleInspectRelayOnCanvas = (relay: ObservedRelay) => {
        setPipelineNodes(relay.nodes);
        setPipelineDependencies(relay.dependencies);
        setStudioView('builder');
    };

    const handlePromoteRelay = (id: string) => {
        setPromotedRelayId(id);
        setObservedRelays((prev) =>
            prev.map((r) => (r.id === id ? { ...r, isPromoted: true } : r)),
        );
        setTimeout(() => setPromotedRelayId(null), 3000);
    };

    const handlePublishVersion = () => {
        if (!activeRecipe || isPublishing) return;
        setIsPublishing(true);

        const totalFeeMinor = pipelineNodes.reduce((sum, n) => sum + (n.feeMinor || 0), 0);

        const payload = {
            title: activeRecipe.title,
            pattern: activeRecipe.pattern,
            description: activeRecipe.desc,
            category_codes: activeRecipe.applicableCategories || ['repairs'],
            listing_types: activeRecipe.applicableListingTypes || ['service'],
            work_shapes: activeRecipe.applicableWorkShapes || ['A1', 'A3'],
            extra_fee_amount_minor: totalFeeMinor,
            nodes: pipelineNodes.map((n) => ({
                key: n.key,
                need_kind: n.needKind,
                title: n.title,
                description_template: `${n.title} · provider agreement required`,
                frontend: {
                    role: n.role,
                    title: n.title,
                    sub: n.assignedPartner
                        ? `${n.assignedPartner.providerName} assigned`
                        : 'Provider agreement required',
                    type: n.type,
                },
            })),
            dependencies: pipelineDependencies.map((d) => ({
                predecessor: d.predecessor,
                successor: d.successor,
                condition_code: d.conditionCode,
                allow_bypass: d.allowBypass ?? false,
            })),
        };

        router.post(
            `/admin/catalogs/deal-chains/recipes/${activeRecipe.recipeId}/publish`,
            payload,
            {
                preserveScroll: true,
                onSuccess: () => {
                    const nextVer = (activeRecipe.catalogVersion ?? 1) + 1;
                    setFeedbackMessage(
                        `Successfully bumped '${activeRecipe.title}' to Version ${nextVer}.`,
                    );
                    setTimeout(() => setFeedbackMessage(null), 4000);
                },
                onFinish: () => setIsPublishing(false),
            },
        );
    };

    const handleCreateNewBlueprint = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newRecipeCode.trim()) return;

        const starterNodes = [
            {
                key: 'store_supply',
                need_kind: 'product',
                title: 'Component / Materials Sourcing',
                description_template: 'Sourced from Tagudin merchant',
                frontend: {
                    role: 'Store Merchant',
                    title: 'Tagudin Supply Partner',
                    sub: 'Parts ready at counter',
                    type: 'store',
                },
            },
            {
                key: 'courier_transit',
                need_kind: 'service',
                title: 'Doorstep Courier Transit',
                description_template: 'Transit to destination site',
                frontend: {
                    role: 'Courier Runner',
                    title: 'Danny Express Motorcycle Pool',
                    sub: 'Expedited moto transit',
                    type: 'delivery',
                },
            },
        ];

        const starterDependencies = [
            {
                predecessor: 'store_supply',
                successor: 'courier_transit',
                condition_code: 'source_ready',
                allow_bypass: false,
            },
        ];

        const payload = {
            recipe_code: newRecipeCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            title: newTitle.trim(),
            pattern: 'custom',
            description: newDescription.trim() || `Custom Deal Chain relay for ${newTitle.trim()}`,
            category_codes: [newCategory],
            listing_types: ['service', 'product'],
            work_shapes: ['A1', 'A3'],
            extra_fee_amount_minor: 21500,
            nodes: starterNodes,
            dependencies: starterDependencies,
        };

        router.post('/admin/catalogs/deal-chains/recipes', payload, {
            onSuccess: () => {
                setIsNewBlueprintOpen(false);
                setNewTitle('');
                setNewRecipeCode('');
                setNewDescription('');
                setFeedbackMessage(`Created new recipe blueprint '${newTitle}' (v1).`);
                setTimeout(() => setFeedbackMessage(null), 4000);
            },
        });
    };

    return (
        <AdminLayout currentSection="inspector" title="Deal Chain Studio">
            <Head title="Deal Chain Studio — Serbizyu Admin" />

            {/* Header Overview */}
            <div className="flex flex-col gap-1">
                <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
                    Deal Chain Coordination &amp; Relay Pipeline Studio
                </h1>
                <p className="text-xs text-muted-foreground">
                    Govern versioned multi-vendor coordination recipes, tactile relay pipelines,
                    and bilateral legal isolation rules in Tagudin.
                </p>
            </div>

            {/* 4 Graphic KPI Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <AdminMetricCard
                    title="Chain Archetypes"
                    value={`${catalogRecipes.length.toString().padStart(2, '0')} Templates`}
                    statusBeacon="live"
                    accentColor="#10b981"
                    trendData={[2, 3, 3, 4, catalogRecipes.length]}
                    subtext="Published versioned multi-vendor recipes"
                    badgeText="Catalog"
                />

                <AdminMetricCard
                    title="Active Relays"
                    value="14 Live Chains"
                    statusBeacon="live"
                    accentColor="#38bdf8"
                    donutPct={78}
                    subtext="78% progressing without blocker intervention"
                />

                <AdminMetricCard
                    title="Hand-off Gates"
                    value={`${pipelineDependencies.length.toString().padStart(2, '0')} Gates`}
                    statusBeacon="live"
                    accentColor="#f59e0b"
                    segments={[
                        { label: 'Courier Ready', value: 2, colorClass: 'bg-amber-500' },
                        { label: 'Site Arrival', value: 1, colorClass: 'bg-blue-500' },
                    ]}
                    subtext="Auto-healing condition barriers"
                />

                <AdminMetricCard
                    title="Acyclic Safety"
                    value="0 Cycles / OK"
                    statusBeacon="live"
                    accentColor="#10b981"
                    subtext="Topological DAG verification enforced"
                />
            </div>

            {/* Bilateral Isolation Notice */}
            <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3.5 text-xs text-muted-foreground shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 shrink-0 text-primary" />
                    <span>
                        <strong className="font-semibold text-foreground">
                            Bilateral Escrow Isolation Invariant:
                        </strong>{' '}
                        Relay steps resolve to independent child orders. No pooled parent escrow.
                        Delays on transit never freeze merchant counter payout.
                    </span>
                </div>
                <Badge
                    variant="outline"
                    className="w-fit shrink-0 border-primary/40 text-[9px] text-primary"
                >
                    Acyclic Governed
                </Badge>
            </div>

            {/* Mode Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs font-medium">
                    <button
                        type="button"
                        onClick={() => setStudioView('builder')}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-all ${
                            studioView === 'builder'
                                ? 'bg-background font-semibold text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Network className="size-3.5 text-primary" />
                        <span>
                            Tactile Relay Pipeline (
                            {activeRecipe ? activeRecipe.title.slice(0, 24) + '...' : 'Catalog'})
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStudioView('observed')}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-all ${
                            studioView === 'observed'
                                ? 'bg-background font-semibold text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <TrendingUp className="size-3.5 text-emerald-500" />
                        <span>In-The-Wild Multi-Vendor Relays ({observedRelays.length})</span>
                    </button>
                </div>

                {studioView === 'builder' && activeRecipe && (
                    <Button
                        size="sm"
                        disabled={isPublishing || pipelineNodes.length < 2}
                        className="h-8 cursor-pointer gap-1.5 bg-[#0F2F58] text-xs font-bold text-white hover:bg-[#153e74]"
                        onClick={handlePublishVersion}
                    >
                        <Send className="size-3.5 text-[#FFC72C]" />
                        <span>
                            {isPublishing
                                ? 'Publishing...'
                                : `Publish New Version (v${(activeRecipe.catalogVersion ?? 1) + 1})`}
                        </span>
                    </Button>
                )}
            </div>

            {/* Feedback Alerts */}
            {feedbackMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs font-medium text-green-500 animate-in fade-in">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>{feedbackMessage}</span>
                </div>
            )}

            {promotedRelayId && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs font-medium text-green-500">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Observed multi-vendor relay declared as Default Category Preset!</span>
                </div>
            )}

            {/* VIEW 1: TACTILE RELAY PIPELINE BUILDER */}
            {studioView === 'builder' && (
                <div className="grid gap-6 lg:grid-cols-4">
                    {/* Left Column: Archetypes Selector */}
                    <div className="flex flex-col gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between border-b border-border p-3.5">
                                <div>
                                    <CardTitle className="text-sm font-bold">
                                        Recipe Blueprints
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        Published Tagudin relays
                                    </CardDescription>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsNewBlueprintOpen(true)}
                                    className="h-7 cursor-pointer gap-1 text-[11px] font-bold"
                                >
                                    <Plus className="size-3" />
                                    <span>New</span>
                                </Button>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2 pt-3">
                                {catalogRecipes.map((recipe) => {
                                    const isSelected = selectedRecipeCode === recipe.recipeId;
                                    return (
                                        <button
                                            key={recipe.recipeId}
                                            type="button"
                                            onClick={() => handleSelectRecipe(recipe)}
                                            className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                                                isSelected
                                                    ? 'border-[#0F2F58] bg-[#EBF2FA]/70 shadow-xs'
                                                    : 'border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <Badge
                                                    variant="outline"
                                                    className="font-mono text-[9px] uppercase tracking-wider"
                                                >
                                                    v{recipe.catalogVersion ?? 1}
                                                </Badge>
                                                <span className="font-mono text-xs font-bold text-slate-900">
                                                    ₱{recipe.extraFee.toFixed(2)}
                                                </span>
                                            </div>
                                            <span className="mt-1 text-xs font-extrabold text-[#0F2F58]">
                                                {recipe.title}
                                            </span>
                                            <span className="text-[11px] text-slate-500 line-clamp-2">
                                                {recipe.desc}
                                            </span>
                                        </button>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Columns: Tactile Relay Pipeline Canvas */}
                    <div className="flex flex-col gap-4 lg:col-span-3">
                        {activeRecipe && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base font-extrabold text-[#0F2F58]">
                                                {activeRecipe.title}
                                            </h2>
                                            <Badge
                                                variant="outline"
                                                className="border-emerald-300 bg-emerald-50 text-[10px] font-bold text-emerald-800"
                                            >
                                                Version {activeRecipe.catalogVersion ?? 1} ·
                                                Published
                                            </Badge>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {activeRecipe.desc}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-1">
                                        {(activeRecipe.applicableCategories || []).map((cat) => (
                                            <span
                                                key={cat}
                                                className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600"
                                            >
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <DealChainPipelineBuilder
                                        nodes={pipelineNodes}
                                        dependencies={pipelineDependencies}
                                        partnerCandidates={partnerCandidates}
                                        onChange={(nextNodes, nextDeps) => {
                                            setPipelineNodes(nextNodes);
                                            setPipelineDependencies(nextDeps);
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VIEW 2: IN-THE-WILD MULTI-VENDOR RELAYS */}
            {studioView === 'observed' && (
                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader className="border-b border-border pb-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                                        <Sparkles className="size-4 text-emerald-500" />
                                        <span>Observed Multi-Vendor Combinations in Tagudin</span>
                                    </CardTitle>
                                    <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                                        Real-world multi-provider chains formed in citizen quotes.
                                        Inspect on pipeline canvas or promote to catalog blueprint.
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {observedRelays.length} Chains Analyzed
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 pt-4">
                            {observedRelays.map((relay) => (
                                <div
                                    key={relay.id}
                                    className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-border/80 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex max-w-xl flex-col gap-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="border-primary/30 font-mono text-[9px] text-primary"
                                            >
                                                {relay.category}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-[9px]"
                                            >
                                                {relay.nodesCount} Coordinated Nodes
                                            </Badge>
                                            {relay.isPromoted && (
                                                <Badge
                                                    variant="default"
                                                    className="gap-1 bg-emerald-600 text-[9px] text-white"
                                                >
                                                    <Check className="size-2.5" />
                                                    <span>Default Category Preset</span>
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold text-foreground">
                                            {relay.title}
                                        </div>
                                        <div className="rounded-sm bg-muted/30 p-1.5 font-mono text-[11px] text-muted-foreground">
                                            {relay.vendorsSummary}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-foreground">
                                                {relay.adoptedJobsCount} Jobs
                                            </span>
                                            <span className="font-mono text-[10px] font-semibold text-emerald-500">
                                                ({relay.completionRate}% completion)
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2.5 text-xs"
                                                onClick={() => handleInspectRelayOnCanvas(relay)}
                                            >
                                                Inspect on Pipeline
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="h-7 bg-emerald-600 px-2.5 text-xs text-white hover:bg-emerald-700"
                                                onClick={() => handlePromoteRelay(relay.id)}
                                            >
                                                Promote to Blueprint
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Create New Recipe Blueprint Dialog */}
            <Dialog open={isNewBlueprintOpen} onOpenChange={setIsNewBlueprintOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-extrabold text-[#0F2F58]">
                            New Deal Chain Blueprint
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Create a new versioned multi-vendor archetype. You can customize steps,
                            gates, and fees directly in the pipeline editor once created.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateNewBlueprint} className="space-y-4 pt-2">
                        <div>
                            <Label className="text-xs font-bold">Blueprint Title</Label>
                            <Input
                                value={newTitle}
                                onChange={(e) => {
                                    setNewTitle(e.target.value);
                                    if (!newRecipeCode) {
                                        setNewRecipeCode(
                                            e.target.value
                                                .toLowerCase()
                                                .replace(/[^a-z0-9]+/g, '_')
                                                .slice(0, 30),
                                        );
                                    }
                                }}
                                placeholder="e.g. Rice Mill Field Haul & Sacking Relay"
                                className="mt-1 text-xs"
                                required
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-bold">Recipe Code (Unique Slug)</Label>
                            <Input
                                value={newRecipeCode}
                                onChange={(e) => setNewRecipeCode(e.target.value)}
                                placeholder="e.g. rice_mill_haul_relay"
                                className="mt-1 font-mono text-xs"
                                required
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-bold">Primary Category</Label>
                            <Select value={newCategory} onValueChange={setNewCategory}>
                                <SelectTrigger className="mt-1 text-xs">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableCategories.map((c) => (
                                        <SelectItem key={c.code} value={c.code} className="text-xs">
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs font-bold">Description</Label>
                            <Input
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="Brief description of the coordinated relay..."
                                className="mt-1 text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsNewBlueprintOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                className="bg-[#0F2F58] text-white hover:bg-[#153e74]"
                            >
                                Create Blueprint
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
