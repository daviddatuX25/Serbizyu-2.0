import { Head } from "@inertiajs/react"
import * as React from "react"
import {
  Check,
  CheckCircle2,
  GitBranch,
  MoveDown,
  Network,
  Play,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminLayout } from "@/layouts/AdminLayout"
import { AdminMetricCard } from "@/components/admin/GraphicMetrics"

export interface ChainNode {
  id: string
  ordinal: number
  title: string
  vendorRole: "merchant" | "courier" | "technician" | "audit"
  category: string
  sampleProvider: string
  feeMinor: number
  gateCondition?: string
  status: "ready" | "in_transit" | "gated"
}

export interface ChainArchetype {
  id: string
  code: string
  title: string
  categoryFamily: string
  fingerprint: string
  nodes: ChainNode[]
}

interface ObservedRelay {
  id: string
  category: string
  title: string
  nodesCount: number
  vendorsSummary: string
  adoptedJobsCount: number
  completionRate: number
  isPromoted: boolean
  nodes: ChainNode[]
}

const SAMPLE_ARCHETYPES: ChainArchetype[] = [
  {
    id: "arch-1",
    code: "MATERIAL_COURIER_LABOR",
    title: "All-In Parts Sourcing, Transit & Installation Relay",
    categoryFamily: "Home Appliance",
    fingerprint: "sha256:7f3a8b...c91e",
    nodes: [
      {
        id: "node-1",
        ordinal: 1,
        title: "Hardware Sourcing",
        vendorRole: "merchant",
        category: "hardware_supply",
        sampleProvider: "Tagudin Hardware Supply",
        feeMinor: 45000,
        status: "ready",
      },
      {
        id: "node-2",
        ordinal: 2,
        title: "Parts Transit to Site",
        vendorRole: "courier",
        category: "local_courier",
        sampleProvider: "Danny Express Moto",
        feeMinor: 6000,
        gateCondition: "goods_packaged_at_store",
        status: "in_transit",
      },
      {
        id: "node-3",
        ordinal: 3,
        title: "On-Site Installation Labor",
        vendorRole: "technician",
        category: "appliance_repair",
        sampleProvider: "Arman Electric",
        feeMinor: 25000,
        gateCondition: "courier_delivered_to_site",
        status: "gated",
      },
    ],
  },
  {
    id: "arch-2",
    code: "PALAY_HARVEST_RELAY",
    title: "Wet Palay Field Extraction, Mud Haul & Solar Dryer Yard",
    categoryFamily: "Agri Logistics",
    fingerprint: "sha256:4d88e1...b004",
    nodes: [
      {
        id: "node-1",
        ordinal: 1,
        title: "Field Bagging Labor",
        vendorRole: "technician",
        category: "farm_labor",
        sampleProvider: "Ambalayat Farm Laborers",
        feeMinor: 320000,
        status: "ready",
      },
      {
        id: "node-2",
        ordinal: 2,
        title: "Mud Route Shuttle",
        vendorRole: "courier",
        category: "mud_freight",
        sampleProvider: "Bitalag Kuliglig Guild",
        feeMinor: 240000,
        gateCondition: "min_40_sacks_bagged",
        status: "ready",
      },
      {
        id: "node-3",
        ordinal: 3,
        title: "Highway Freight",
        vendorRole: "courier",
        category: "mid_mile_freight",
        sampleProvider: "Ilocos Agro-Logistics",
        feeMinor: 280000,
        gateCondition: "dikeside_transfer_staged",
        status: "gated",
      },
      {
        id: "node-4",
        ordinal: 4,
        title: "Solar Pavement Drying",
        vendorRole: "audit",
        category: "drying_facility",
        sampleProvider: "Bitalag Solar Cooperative",
        feeMinor: 400000,
        gateCondition: "truck_delivered_to_pavement",
        status: "gated",
      },
    ],
  },
]

const SAMPLE_OBSERVED_RELAYS: ObservedRelay[] = [
  {
    id: "relay-1",
    category: "Home Electrical & HVAC",
    title: "Hardware Sourcing + Tagudin Express + Arman Electrical Labor",
    nodesCount: 3,
    vendorsSummary: "1. Tagudin Hardware (Store) -> 2. Danny Express Moto -> 3. Arman Electric (Technician)",
    adoptedJobsCount: 36,
    completionRate: 88,
    isPromoted: true,
    nodes: SAMPLE_ARCHETYPES[0].nodes,
  },
  {
    id: "relay-2",
    category: "Local Food & Bakery",
    title: "Ate Gina Bibingka + Insulated Box Moto Courier + Table Setup",
    nodesCount: 3,
    vendorsSummary: "1. Ate Gina Traditional Bakes -> 2. Tagudin Express Courier -> 3. Local Event Setup Aide",
    adoptedJobsCount: 22,
    completionRate: 94,
    isPromoted: false,
    nodes: [
      {
        id: "r2-1",
        ordinal: 1,
        title: "Perishable Food Prep",
        vendorRole: "merchant",
        category: "local_food",
        sampleProvider: "Ate Gina Traditional Bakes",
        feeMinor: 12000,
        status: "ready",
      },
      {
        id: "r2-2",
        ordinal: 2,
        title: "Insulated Food Transit",
        vendorRole: "courier",
        category: "local_courier",
        sampleProvider: "Tagudin Express Moto",
        feeMinor: 6000,
        gateCondition: "food_boxed_hot",
        status: "in_transit",
      },
      {
        id: "r2-3",
        ordinal: 3,
        title: "Event Table Setup",
        vendorRole: "technician",
        category: "catering_labor",
        sampleProvider: "Maya Setup Services",
        feeMinor: 8000,
        gateCondition: "food_delivered_on_site",
        status: "gated",
      },
    ],
  },
]

export default function DealChainStudio() {
  const [selectedArchetype, setSelectedArchetype] = React.useState<ChainArchetype>(SAMPLE_ARCHETYPES[0])
  const [activeNodes, setActiveNodes] = React.useState<ChainNode[]>(SAMPLE_ARCHETYPES[0].nodes)
  const [studioView, setStudioView] = React.useState<"builder" | "observed">("builder")
  const [observedRelays, setObservedRelays] = React.useState<ObservedRelay[]>(SAMPLE_OBSERVED_RELAYS)
  const [promotedRelayId, setPromotedRelayId] = React.useState<string | null>(null)
  const [isSimulated, setIsSimulated] = React.useState(false)
  const [isSaved, setIsSaved] = React.useState(false)

  // Add Node Dialog State
  const [isAddNodeOpen, setIsAddNodeOpen] = React.useState(false)
  const [nodeTitle, setNodeTitle] = React.useState("")
  const [nodeRole, setNodeRole] = React.useState<ChainNode["vendorRole"]>("courier")
  const [nodeCategory, setNodeCategory] = React.useState("")
  const [nodeProvider, setNodeProvider] = React.useState("")
  const [nodeFee, setNodeFee] = React.useState("60")
  const [nodeGate, setNodeGate] = React.useState("")

  const handleArchetypeSelect = (arch: ChainArchetype) => {
    setSelectedArchetype(arch)
    setActiveNodes(arch.nodes)
  }

  const handleInspectRelayOnCanvas = (relay: ObservedRelay) => {
    setSelectedArchetype({
      id: `arch-${relay.id}`,
      code: relay.title.toUpperCase().replace(/\s+/g, "_").slice(0, 24),
      title: relay.title,
      categoryFamily: relay.category,
      fingerprint: `sha256:${relay.id}...obs`,
      nodes: relay.nodes,
    })
    setActiveNodes(relay.nodes)
    setStudioView("builder")
  }

  const handlePromoteRelay = (id: string) => {
    setPromotedRelayId(id)
    setObservedRelays((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isPromoted: true } : r))
    )
    setTimeout(() => setPromotedRelayId(null), 3000)
  }

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nodeTitle.trim()) return

    const newNode: ChainNode = {
      id: `node-${Date.now()}`,
      ordinal: activeNodes.length + 1,
      title: nodeTitle.trim(),
      vendorRole: nodeRole,
      category: nodeCategory.trim() || "general_service",
      sampleProvider: nodeProvider.trim() || "Independent Provider",
      feeMinor: Math.round(parseFloat(nodeFee || "0") * 100),
      gateCondition: nodeGate.trim() || undefined,
      status: activeNodes.length === 0 ? "ready" : "gated",
    }

    setActiveNodes([...activeNodes, newNode])
    setIsAddNodeOpen(false)
    setNodeTitle("")
    setNodeCategory("")
    setNodeProvider("")
    setNodeGate("")
  }

  const handleRemoveNode = (id: string) => {
    const remaining = activeNodes.filter((n) => n.id !== id)
    setActiveNodes(remaining.map((n, idx) => ({ ...n, ordinal: idx + 1 })))
  }

  const handleSimulateGate = () => {
    setIsSimulated(true)
    setTimeout(() => setIsSimulated(false), 3000)
  }

  const handleSaveArchetype = () => {
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2500)
  }

  const getRoleBadge = (role: ChainNode["vendorRole"]) => {
    switch (role) {
      case "merchant":
        return <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-[9px] font-mono">Store / Goods</Badge>
      case "courier":
        return <Badge variant="outline" className="border-blue-500/40 text-blue-500 text-[9px] font-mono">Courier Transit</Badge>
      case "technician":
        return <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 text-[9px] font-mono">Labor / Trade</Badge>
      case "audit":
        return <Badge variant="outline" className="border-purple-500/40 text-purple-500 text-[9px] font-mono">Facility / Audit</Badge>
    }
  }

  return (
    <AdminLayout currentSection="inspector" title="Deal Chain DAG Studio">
      <Head title="Deal Chain DAG Studio — Serbizyu Admin" />

      {/* Header Overview */}
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
          Deal Chain Coordination &amp; DAG Blueprint Studio
        </h1>
        <p className="text-xs text-muted-foreground">
          Author multi-vendor coordination archetypes, n8n-style dependency wait gates, and bilateral legal isolation rules (Spec 26).
        </p>
      </div>

      {/* 4 Graphic KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          title="Chain Archetypes"
          value="06 Templates"
          statusBeacon="live"
          accentColor="#10b981"
          trendData={[3, 4, 4, 5, 6, 6]}
          subtext="Pre-configured multi-vendor blueprints"
          badgeText="Topology"
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
          title="Armed Wait Gates"
          value="08 Gates"
          statusBeacon="warning"
          accentColor="#f59e0b"
          segments={[
            { label: "Courier (5)", value: 5, colorClass: "bg-amber-500" },
            { label: "Sourcing (3)", value: 3, colorClass: "bg-blue-500" },
          ]}
          subtext="Unblocked via outbox completion events"
        />

        <AdminMetricCard
          title="Acyclic Safety"
          value="0 Cycles / OK"
          statusBeacon="live"
          accentColor="#10b981"
          subtext="Topological cycle verification active"
        />
      </div>

      {/* Sibling Isolation Legal Notice */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary shrink-0" />
          <span>
            <strong className="text-foreground font-semibold">AD-17 Bilateral Escrow Isolation Invariant:</strong> Sibling nodes produce independent child orders. No pooled parent escrow. A courier delay does not confiscate merchant payment.
          </span>
        </div>
        <Badge variant="outline" className="text-[9px] border-primary/40 text-primary shrink-0 w-fit">
          Bilateral Enforced
        </Badge>
      </div>

      {/* Sub-Navigation & Mode Bar */}
      <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setStudioView("builder")}
            className={`rounded-md px-3 py-1 text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              studioView === "builder"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Network className="size-3.5 text-primary" />
            <span>Interactive DAG Canvas ({selectedArchetype.code})</span>
          </button>
          <button
            type="button"
            onClick={() => setStudioView("observed")}
            className={`rounded-md px-3 py-1 text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              studioView === "observed"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="size-3.5 text-emerald-500" />
            <span>In-The-Wild Multi-Vendor Relays ({observedRelays.length})</span>
          </button>
        </div>

        {studioView === "builder" && (
          <Button
            size="sm"
            className="h-8 text-xs bg-primary hover:bg-primary/90 gap-1.5"
            onClick={handleSaveArchetype}
          >
            <Save className="size-3.5" />
            <span>Save DAG Blueprint</span>
          </Button>
        )}
      </div>

      {/* Feedback Alerts */}
      {isSaved && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-500 flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>DAG Archetype blueprint saved and normalized SHA-256 fingerprint registered.</span>
        </div>
      )}

      {isSimulated && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-400 flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-4 shrink-0 text-blue-500" />
          <span>Simulated event courier_delivered_to_site emitted! Dependency gate unblocked downstream labor without database lock contention.</span>
        </div>
      )}

      {promotedRelayId && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-500 flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>Observed multi-vendor relay declared as Default Category Preset! Published to catalog.</span>
        </div>
      )}

      {/* ===================================================================
           VIEW 1: INTERACTIVE DAG BUILDER CANVAS (UI Kit Aesthetic)
           =================================================================== */}
      {studioView === "builder" && (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Left Column: Archetypes Selector */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold">Archetype Blueprints</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Canonical multi-vendor coordination topologies.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3 flex flex-col gap-2">
                {SAMPLE_ARCHETYPES.map((arch) => (
                  <button
                    key={arch.id}
                    type="button"
                    onClick={() => handleArchetypeSelect(arch)}
                    className={`flex flex-col gap-1 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedArchetype.id === arch.id
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-muted-foreground font-bold">{arch.code}</span>
                      <Badge variant="outline" className="text-[9px]">{arch.categoryFamily}</Badge>
                    </div>
                    <div className="text-xs font-bold text-foreground">{arch.title}</div>
                    <div className="text-[10.5px] text-muted-foreground font-mono mt-0.5">
                      {arch.nodes.length} Coordinated Nodes · {arch.fingerprint}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Columns: Interactive DAG Node Flow Canvas */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <Card className="overflow-hidden border-border">
              {/* Canvas Header */}
              <CardHeader className="p-4 border-b border-border bg-card/60 backdrop-blur-xs flex flex-row items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Network className="size-4 text-primary" />
                    <span>Topological Node Pipeline: {selectedArchetype.code}</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Linear block-chain nodes with n8n-style dependency gating connectors.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 cursor-pointer"
                    onClick={() => setIsAddNodeOpen(true)}
                  >
                    <Plus className="size-3" />
                    <span>Add Chain Node</span>
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-primary hover:bg-primary/90 gap-1.5 cursor-pointer"
                    onClick={handleSimulateGate}
                  >
                    <Play className="size-3" />
                    <span>Simulate Gate Unblock</span>
                  </Button>
                </div>
              </CardHeader>

              {/* The Dot Grid Canvas (deal-chain-builder aesthetic) */}
              <div
                className="relative p-6 flex flex-col items-center gap-4 min-h-[460px] w-full overflow-y-auto"
                style={{
                  backgroundColor: "var(--card)",
                  backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.22) 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              >
                {activeNodes.map((node, idx) => (
                  <React.Fragment key={node.id}>
                    {/* Node Card */}
                    <div className="w-full max-w-xl rounded-xl border border-border bg-background p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md relative group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-foreground font-mono text-xs font-bold">
                            {node.ordinal}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">{node.title}</span>
                              {getRoleBadge(node.vendorRole)}
                            </div>
                            <span className="text-[11px] text-muted-foreground mt-0.5">
                              Provider: <strong className="text-foreground font-medium">{node.sampleProvider}</strong> · {node.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-xs font-bold text-foreground">
                            ₱{(node.feeMinor / 100).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                            onClick={() => handleRemoveNode(node.id)}
                            title="Remove Node"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Gate Condition Indicator inside card */}
                      {node.gateCondition && (
                        <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                          <span className="font-mono text-[10.5px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                            <GitBranch className="size-3" />
                            <span>Gated until: {node.gateCondition}</span>
                          </span>
                          <Badge variant="outline" className="text-[9px] font-mono border-amber-500/40 text-amber-500">
                            Async Gate
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Step Connector Wire */}
                    {idx < activeNodes.length - 1 && (
                      <div className="flex flex-col items-center -my-2 z-10">
                        <div className="h-4 w-0.5 bg-border"></div>
                        <div className="size-4 rounded-full border border-border bg-muted flex items-center justify-center text-muted-foreground">
                          <MoveDown className="size-2.5" />
                        </div>
                        <div className="h-4 w-0.5 bg-border"></div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ===================================================================
           VIEW 2: IN-THE-WILD MULTI-VENDOR RELAYS
           =================================================================== */}
      {studioView === "observed" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-500" />
                    <span>Observed Multi-Vendor Combinations in Tagudin</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Real-world multi-provider chains formed in citizen quotes. Inspect the full relay on the canvas and approve high-performing patterns as default presets.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {observedRelays.length} Chains Analyzed
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3">
              {observedRelays.map((relay) => (
                <div
                  key={relay.id}
                  className="rounded-lg border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs hover:border-border/80 transition-all"
                >
                  <div className="flex flex-col gap-1.5 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[9px] font-mono text-primary border-primary/30">
                        {relay.category}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[9px]">
                        {relay.nodesCount} Coordinated Nodes
                      </Badge>
                      {relay.isPromoted && (
                        <Badge variant="default" className="bg-emerald-600 text-white text-[9px] gap-1">
                          <Check className="size-2.5" />
                          <span>Default Category Preset</span>
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs font-bold text-foreground">{relay.title}</div>
                    <div className="text-[11px] font-mono text-muted-foreground bg-muted/30 p-1.5 rounded-sm">
                      {relay.vendorsSummary}
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">{relay.adoptedJobsCount} Jobs</span>
                      <span className="text-[10px] text-emerald-500 font-semibold font-mono">({relay.completionRate}% completion)</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2.5"
                        onClick={() => handleInspectRelayOnCanvas(relay)}
                      >
                        Inspect on Canvas
                      </Button>
                      <Button
                        size="sm"
                        variant={relay.isPromoted ? "outline" : "default"}
                        className="text-xs h-7 px-3"
                        disabled={relay.isPromoted}
                        onClick={() => handlePromoteRelay(relay.id)}
                      >
                        {relay.isPromoted ? "Promoted to Preset" : "Approve as Default Preset"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Chain Node Dialog */}
      <Dialog open={isAddNodeOpen} onOpenChange={setIsAddNodeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Coordination Node</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Insert a new downstream task or vendor handoff into this DAG archetype.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddNode} className="flex flex-col gap-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="node-title" className="text-xs font-semibold text-foreground">
                Node Title / Milestone
              </Label>
              <Input
                id="node-title"
                placeholder="e.g. Courier Transit to Job Site"
                value={nodeTitle}
                onChange={(e) => setNodeTitle(e.target.value)}
                className="text-xs h-8 bg-muted/20 border-border text-foreground"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="node-role" className="text-xs font-semibold text-foreground">
                  Vendor Role
                </Label>
                <Select
                  value={nodeRole}
                  onValueChange={(val) => setNodeRole(val as ChainNode["vendorRole"])}
                >
                  <SelectTrigger id="node-role" className="h-8 text-xs bg-muted/20 border-border text-foreground">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merchant" className="text-xs">Merchant (Parts/Supply)</SelectItem>
                    <SelectItem value="courier" className="text-xs">Courier (Logistics)</SelectItem>
                    <SelectItem value="technician" className="text-xs">Technician (Labor)</SelectItem>
                    <SelectItem value="audit" className="text-xs">Facility / Audit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="node-fee" className="text-xs font-semibold text-foreground">
                  Standard Fee (₱)
                </Label>
                <Input
                  id="node-fee"
                  type="number"
                  placeholder="60.00"
                  value={nodeFee}
                  onChange={(e) => setNodeFee(e.target.value)}
                  className="text-xs h-8 font-mono bg-muted/20 border-border text-foreground"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="node-provider" className="text-xs font-semibold text-foreground">
                Sample / Recommended Provider
              </Label>
              <Input
                id="node-provider"
                placeholder="e.g. Danny Express Motorcycle Pool"
                value={nodeProvider}
                onChange={(e) => setNodeProvider(e.target.value)}
                className="text-xs h-8 bg-muted/20 border-border text-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="node-gate" className="text-xs font-semibold text-foreground">
                Dependency Gate Condition (Optional)
              </Label>
              <Input
                id="node-gate"
                placeholder="e.g. goods_packaged_at_store"
                value={nodeGate}
                onChange={(e) => setNodeGate(e.target.value)}
                className="text-xs h-8 font-mono bg-muted/20 border-border text-foreground"
              />
              <span className="text-[10px] text-muted-foreground">
                Downstream node will pause until this condition emits.
              </span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => setIsAddNodeOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                Insert DAG Node
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
