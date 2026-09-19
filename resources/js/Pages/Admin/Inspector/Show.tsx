import { Head, Link, router } from "@inertiajs/react"
import * as React from "react"
import {
  ArrowDown,
  ArrowRight,
  Boxes,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  GitFork,
  HardHat,
  Layers,
  Lock,
  MapPin,
  Network,
  PauseCircle,
  Receipt,
  RotateCw,
  Search,
  Shield,
  ShieldCheck,
  Smartphone,
  Truck,
  Unlock,
  Wrench,
  X,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { AdminLayout } from "@/layouts/AdminLayout"

interface InspectorShowProps {
  orderRef?: string
}

interface EvidencePhoto {
  url: string
  caption: string
  uploadedAt: string
  location: string
  device: string
  checksum: string
}

export interface DealChainNode {
  nodeId: string
  orderRef?: string
  title: string
  vendorName: string
  vendorRole: "merchant" | "courier" | "technician" | "inspector" | "producer"
  feeFormatted: string
  status: "completed" | "active" | "gated" | "ready"
  gateCondition?: string
  isCurrentOrder?: boolean
}

export interface DealChainData {
  chainId: string
  title: string
  archetypeCode: string
  totalNodes: number
  currentNodeIndex: number
  totalChainValue: string
  nodes: DealChainNode[]
}

export interface WorkBlueprintSpec {
  code: string
  title: string
  workShape: string
  safetyTier: "S0_GENERAL" | "S1_SUPERVISED" | "S2_QUALIFIED_TRADE" | "S3_HEAVY_MACHINERY"
  safetyTierLabel: string
  toolClearanceChecklist: string[]
  mandatoryEvidenceType: string
  acceptanceCriteria: string
  warrantyDays: number
}

interface CaseRecord {
  ref: string
  title: string
  buyer: string
  provider: string
  amount: string
  lane: string
  orderStatus: string
  workShape: string
  workStatus: string
  activeStep: number
  totalSteps: number
  paymentStatus: string
  holdActive: boolean
  holdTarget?: string
  correlationId: string
  evidence?: EvidencePhoto
  dealChain?: DealChainData
  workBlueprint: WorkBlueprintSpec
  steps: Array<{
    stepNumber: number
    title: string
    description: string
    status: "completed" | "in_progress" | "pending"
    timestamp?: string
    evidenceLabel?: string
  }>
  events: Array<{
    time: string
    type: "Order" | "Work" | "Payment" | "Dispute" | "Hold"
    actor: string
    text: string
  }>
}

const KNOWN_RECORDS: Record<string, CaseRecord> = {
  "ORD-2026-09": {
    ref: "ORD-2026-09",
    title: "Ceiling Fan Run Capacitor Replacement",
    buyer: "Maria Santos (BUYER-07)",
    provider: "Arman Electric (PROVIDER-07)",
    amount: "₱90.00",
    lane: "External Cash",
    orderStatus: "accepted",
    workShape: "A1 (Linear Project)",
    workStatus: "in_progress",
    activeStep: 2,
    totalSteps: 3,
    paymentStatus: "buyer_reported / mismatch",
    holdActive: true,
    holdTarget: "Payment Obligation #OBL-881",
    correlationId: "0198a3-c481",
    evidence: {
      url: "/photos/ac-capacitor.jpg",
      caption: "Disassembled run capacitor showing bulging top (1.5uF 450VAC)",
      uploadedAt: "2026-09-17 14:15:20 PHT",
      location: "16.9248° N, 120.4431° E · Brgy. Farola, Tagudin",
      device: "Xiaomi Redmi Note 12 (EXIF verified)",
      checksum: "sha256:8f4c71a9b20e",
    },
    dealChain: {
      chainId: "CHAIN-2026-TAG-01",
      title: "All-In Parts Sourcing, Transit & Installation Relay",
      archetypeCode: "MATERIAL_COURIER_LABOR",
      totalNodes: 4,
      currentNodeIndex: 3,
      totalChainValue: "₱600.00",
      nodes: [
        {
          nodeId: "node-1",
          orderRef: "ORD-2026-09A",
          title: "1.5uF Capacitor Parts Sourcing",
          vendorName: "Tagudin Hardware Supply",
          vendorRole: "merchant",
          feeFormatted: "₱450.00",
          status: "completed",
        },
        {
          nodeId: "node-2",
          orderRef: "ORD-2026-09B",
          title: "Tricycle Express Transit to Site",
          vendorName: "Tagudin Express Delivery",
          vendorRole: "courier",
          feeFormatted: "₱60.00",
          status: "completed",
          gateCondition: "Hardware parts purchase verified at depot",
        },
        {
          nodeId: "node-3",
          orderRef: "ORD-2026-09",
          title: "On-Site Capacitor Electrical Installation",
          vendorName: "Arman Electric",
          vendorRole: "technician",
          feeFormatted: "₱90.00",
          status: "active",
          gateCondition: "Courier transit handoff verified on-site",
          isCurrentOrder: true,
        },
        {
          nodeId: "node-4",
          orderRef: "ORD-2026-09D",
          title: "LGU Safety Audit & Warranty Checkpoint",
          vendorName: "Barangay Electrician Council",
          vendorRole: "inspector",
          feeFormatted: "₱0.00",
          status: "gated",
          gateCondition: "Step 3 amperage load test signed off by technician & citizen",
        },
      ],
    },
    workBlueprint: {
      code: "BP-ELEC-CAP-02",
      title: "Electric Fan Motor Capacitor Replacement",
      workShape: "A1 (Linear Milestone Project)",
      safetyTier: "S2_QUALIFIED_TRADE",
      safetyTierLabel: "S2 Qualified Trade (Live AC Line)",
      toolClearanceChecklist: [
        "1000V Insulated Screwdrivers & Pliers",
        "Digital Multimeter / Capacitance Meter",
        "Heat Shrink Tubing / Soldering Iron",
        "Safety Eyewear & Insulated Work Gloves",
      ],
      mandatoryEvidenceType: "Photographic disassembly + digital capacitance meter readout",
      acceptanceCriteria: "Silent high-speed motor rotation with continuous load run under 0.45A draw.",
      warrantyDays: 30,
    },
    steps: [
      {
        stepNumber: 1,
        title: "Intake & Disassembly",
        description: "Diagnostic inspection, casing removal, capacitor testing.",
        status: "completed",
        timestamp: "14:15:20 PHT",
        evidenceLabel: "Photo verified ✓",
      },
      {
        stepNumber: 2,
        title: "Capacitor Replacement",
        description: "Install 1.5uF replacement unit and insulate wire harnesses.",
        status: "in_progress",
        timestamp: "Elapsed 35 mins",
        evidenceLabel: "Wiring in progress...",
      },
      {
        stepNumber: 3,
        title: "Load Test & High-Speed Spin",
        description: "Measure motor draw and confirm balanced silent rotation.",
        status: "pending",
        timestamp: "Gated until Step 2 complete",
        evidenceLabel: "Sign-off ready",
      },
    ],
    events: [
      {
        time: "14:10:02 PHT",
        type: "Order",
        actor: "BUYER-07",
        text: "Terms accepted for Ceiling Fan Capacitor Replacement. Terms locked at ₱90.00 with External Cash.",
      },
      {
        time: "14:15:20 PHT",
        type: "Work",
        actor: "PROVIDER-07",
        text: "Step 1: Disassembly initiated. Photo evidence uploaded (ac-capacitor.jpg).",
      },
      {
        time: "14:22:11 PHT",
        type: "Payment",
        actor: "BUYER-07",
        text: "Buyer reported declaration: 'External Cash Paid: ₱90.00 in person'. Awaiting provider receipt.",
      },
      {
        time: "14:25:00 PHT",
        type: "Dispute",
        actor: "PROVIDER-07",
        text: "Provider reported cash mismatch: 'Zero cash handed over during disassembly; buyer stated family member would pay'.",
      },
      {
        time: "14:30:15 PHT",
        type: "Hold",
        actor: "Officer Santos",
        text: "Desk Supervisor placed surgical administrative hold on Payment Obligation #OBL-881. Work instance remains unblocked.",
      },
    ],
  },
  "ORD-2026-04": {
    ref: "ORD-2026-04",
    title: "Agricultural Water Pump Diagnostic",
    buyer: "Barangay Coop (BUYER-02)",
    provider: "Danilo Machining (PROVIDER-04)",
    amount: "₱120.00",
    lane: "External Cash",
    orderStatus: "accepted",
    workShape: "A3 (Diagnosis-First)",
    workStatus: "awaiting_quote",
    activeStep: 1,
    totalSteps: 2,
    paymentStatus: "unattested",
    holdActive: false,
    correlationId: "0198a3-b210",
    evidence: {
      url: "/photos/ac-clean.jpg",
      caption: "Initial on-site impeller and casing inspection",
      uploadedAt: "2026-09-17 10:45:12 PHT",
      location: "16.9312° N, 120.4502° E · Brgy. Bitalag, Tagudin",
      device: "Samsung Galaxy A14",
      checksum: "sha256:3a1b94e80f21",
    },
    dealChain: {
      chainId: "CHAIN-2026-TAG-04",
      title: "Agricultural Irrigation Pump Overhaul Relay",
      archetypeCode: "DIAGNOSTIC_FABRICATE_INSTALL",
      totalNodes: 3,
      currentNodeIndex: 1,
      totalChainValue: "₱850.00 Est.",
      nodes: [
        {
          nodeId: "node-1",
          orderRef: "ORD-2026-04",
          title: "On-Site Mechanical Diagnostic",
          vendorName: "Danilo Machining",
          vendorRole: "technician",
          feeFormatted: "₱120.00",
          status: "active",
          isCurrentOrder: true,
        },
        {
          nodeId: "node-2",
          orderRef: "ORD-2026-04B",
          title: "Custom Brass Impeller Machining",
          vendorName: "Ilocos Sur Foundry Works",
          vendorRole: "merchant",
          feeFormatted: "₱550.00 Est.",
          status: "gated",
          gateCondition: "Diagnostic disassembly findings & blueprint measurements approved",
        },
        {
          nodeId: "node-3",
          orderRef: "ORD-2026-04C",
          title: "Pump Prime Seal Re-installation & Flow Test",
          vendorName: "Danilo Machining",
          vendorRole: "technician",
          feeFormatted: "₱180.00",
          status: "gated",
          gateCondition: "Impeller fabrication delivered to irrigation well site",
        },
      ],
    },
    workBlueprint: {
      code: "BP-AGRI-PUMP-03",
      title: "Centrifugal Irrigation Pump Teardown & Inspection",
      workShape: "A3 (Diagnosis-First / Two-Phase)",
      safetyTier: "S3_HEAVY_MACHINERY",
      safetyTierLabel: "S3 Heavy Machinery (Industrial Prime)",
      toolClearanceChecklist: [
        "Mechanical Bearing Puller & Dial Calipers",
        "High-Pressure Pressure Gauge (0-150 PSI)",
        "Lockout-Tagout (LOTO) Power Disconnect Kit",
        "Non-Sparking Brass Mallet & Socket Wrenches",
      ],
      mandatoryEvidenceType: "Impeller clearance gap photograph + gauge pressure log",
      acceptanceCriteria: "Disassembly assessment report with parts fabrication measurements.",
      warrantyDays: 60,
    },
    steps: [
      {
        stepNumber: 1,
        title: "On-Site Mechanical Assessment",
        description: "Inspect pump impeller, prime seal, and motor bearings.",
        status: "in_progress",
        timestamp: "10:45:12 PHT",
        evidenceLabel: "Assessment active",
      },
      {
        stepNumber: 2,
        title: "Repair Quote Formulation",
        description: "Submit parts estimate for bearing overhaul or replacement.",
        status: "pending",
        timestamp: "Awaiting Step 1 findings",
        evidenceLabel: "Quote pending",
      },
    ],
    events: [
      {
        time: "10:15:00 PHT",
        type: "Order",
        actor: "BUYER-02",
        text: "Order agreement initialized under A3 shape. Terms locked for on-site diagnostic phase.",
      },
      {
        time: "10:45:12 PHT",
        type: "Work",
        actor: "PROVIDER-04",
        text: "Provider arrived at site. Diagnostic inspection commenced (ac-clean.jpg uploaded).",
      },
    ],
  },
  "ORD-2026-01": {
    ref: "ORD-2026-01",
    title: "Special Royal Bibingka (24-Piece Box)",
    buyer: "Elena Cruz (BUYER-01)",
    provider: "Tagudin Traditional Delicacies (PROVIDER-01)",
    amount: "₱420.00",
    lane: "External Digital Proof",
    orderStatus: "completed",
    workShape: "A4 (Batch Handoff)",
    workStatus: "delivered",
    activeStep: 2,
    totalSteps: 2,
    paymentStatus: "mutually_acknowledged",
    holdActive: false,
    correlationId: "0198a3-a812",
    evidence: {
      url: "/photos/bibingka.jpg",
      caption: "Freshly baked 24-piece box packaged with tamper-evident seal",
      uploadedAt: "2026-09-17 08:30:00 PHT",
      location: "16.9380° N, 120.4480° E · Poblacion, Tagudin",
      device: "iPhone 13",
      checksum: "sha256:7c91e002a4bf",
    },
    workBlueprint: {
      code: "BP-FOOD-BAKE-01",
      title: "Artisanal Baked Delicacy Handoff",
      workShape: "A4 (Retail Batch Handoff)",
      safetyTier: "S0_GENERAL",
      safetyTierLabel: "S0 General Commerce (Sanitation Sealed)",
      toolClearanceChecklist: [
        "Food Grade Packaging & Tamper Seal",
        "Thermal Delivery Carrier",
        "Barangay Sanitary Permit on File",
      ],
      mandatoryEvidenceType: "Packaging seal photograph prior to handoff",
      acceptanceCriteria: "Dual confirmation at designated public plaza meeting point.",
      warrantyDays: 1,
    },
    steps: [
      {
        stepNumber: 1,
        title: "Batch Preparation & Baking",
        description: "Wood-fired clay oven preparation and quality check.",
        status: "completed",
        timestamp: "08:30:00 PHT",
        evidenceLabel: "Quality sealed ✓",
      },
      {
        stepNumber: 2,
        title: "Public Plaza Handoff",
        description: "Mutual handoff at Tagudin Municipal Plaza safer meeting zone.",
        status: "completed",
        timestamp: "09:15:22 PHT",
        evidenceLabel: "Completed ✓",
      },
    ],
    events: [
      {
        time: "08:00:00 PHT",
        type: "Order",
        actor: "BUYER-01",
        text: "Order placed for 24-piece Royal Bibingka. Payment via GCash external proof.",
      },
      {
        time: "08:30:00 PHT",
        type: "Work",
        actor: "PROVIDER-01",
        text: "Batch ready for handoff. Packaging photo uploaded (bibingka.jpg).",
      },
      {
        time: "09:15:22 PHT",
        type: "Work",
        actor: "BUYER-01",
        text: "Handoff acknowledged at Tagudin Plaza. Order marked completed.",
      },
      {
        time: "09:16:00 PHT",
        type: "Payment",
        actor: "PROVIDER-01",
        text: "Digital proof verified. GCash reference validated against bank statement.",
      },
    ],
  },
}

export default function InspectorShow({ orderRef = "ORD-2026-09" }: InspectorShowProps) {
  const [searchQuery, setSearchQuery] = React.useState(orderRef)
  const [activeRef, setActiveRef] = React.useState(orderRef)
  const [currentRecords, setCurrentRecords] = React.useState<Record<string, CaseRecord>>(KNOWN_RECORDS)
  const [activeTab, setActiveTab] = React.useState<"overview" | "deal_chain" | "blueprint" | "audit">("overview")

  // Modals state
  const [isEvidenceOpen, setIsEvidenceOpen] = React.useState<boolean>(false)
  const [isHoldSheetOpen, setIsHoldSheetOpen] = React.useState<boolean>(false)
  const [releaseReason, setReleaseReason] = React.useState<string>("mutual_acknowledgement")
  const [releaseNotes, setReleaseNotes] = React.useState<string>("")
  const [isSubmittingHold, setIsSubmittingHold] = React.useState<boolean>(false)
  const [holdSuccessBanner, setHoldSuccessBanner] = React.useState<boolean>(false)

  React.useEffect(() => {
    setActiveRef(orderRef)
    setSearchQuery(orderRef)
  }, [orderRef])

  const record = currentRecords[activeRef] ?? currentRecords["ORD-2026-09"]

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim().toUpperCase()
    if (trimmed && currentRecords[trimmed]) {
      setActiveRef(trimmed)
      router.visit(`/admin/inspect?ref=${encodeURIComponent(trimmed)}`, {
        preserveState: true,
        replace: true,
      })
    }
  }

  // Handle in-place hold release
  const handleConfirmReleaseHold = () => {
    setIsSubmittingHold(true)
    setTimeout(() => {
      setIsSubmittingHold(false)
      setIsHoldSheetOpen(false)
      setHoldSuccessBanner(true)

      // Update record in place
      setCurrentRecords((prev) => {
        const existing = prev[activeRef]
        if (!existing) return prev

        const now = new Date().toLocaleTimeString("en-PH", { hour12: false }) + " PHT"
        return {
          ...prev,
          [activeRef]: {
            ...existing,
            holdActive: false,
            paymentStatus: "mutually_acknowledged",
            events: [
              ...existing.events,
              {
                time: now,
                type: "Hold",
                actor: "Officer Santos",
                text: `Administrative hold released: ${releaseReason.replace(/_/g, " ")}. Payment obligation restored to active.`,
              },
            ],
          },
        }
      })
    }, 800)
  }

  return (
    <AdminLayout
      currentSection="inspector"
      title={`Inspector #${record.ref}`}
      breadcrumbs={[
        { label: "Operations", href: "/admin/triage" },
        { label: "Universal Inspector", href: "/admin/inspect" },
        { label: `#${record.ref}` },
      ]}
    >
      <Head title={`Inspector #${record.ref} — Serbizyu Admin`} />

      <div className="flex flex-col gap-6">
        {/* Top Header & Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground">
                Universal Diagnostic Inspector
              </h1>
              <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">
                #{record.ref}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Decoupled aggregate state inspector for order terms, physical work progress, and payment truth.
            </p>
          </div>

          {/* Clean Fast Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search case..."
                className="h-8 pl-8 text-xs bg-muted/20 border-border text-foreground font-mono"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-8 text-xs shrink-0">
              Inspect
            </Button>
          </form>
        </div>

        {/* Active Cases Quick Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-muted-foreground shrink-0 font-medium">Active Cases:</span>
          {Object.keys(currentRecords).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setActiveRef(k)
                setSearchQuery(k)
                setHoldSuccessBanner(false)
                router.visit(`/admin/inspect?ref=${encodeURIComponent(k)}`, {
                  preserveState: true,
                  replace: true,
                })
              }}
              className={`rounded-md px-2.5 py-1 font-mono transition-all cursor-pointer ${
                activeRef === k
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {k}
            </button>
          ))}
          <Badge variant="outline" className="ml-auto text-[10px] text-muted-foreground font-mono">
            Correlation: <span className="ml-1 text-foreground font-bold">{record.correlationId}</span>
          </Badge>
        </div>

        {/* Success Banner upon Hold Release */}
        {holdSuccessBanner && (
          <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            <div className="flex items-center justify-between w-full">
              <div>
                <AlertTitle className="text-xs font-bold text-foreground">
                  Administrative Hold Successfully Released
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                  The surgical hold on <strong className="font-mono text-foreground">{record.holdTarget}</strong> was lifted by Officer Santos. Payment obligation returned to normal flow.
                </AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setHoldSuccessBanner(false)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </Alert>
        )}

        {/* Active Surgical Hold Alert Banner */}
        {record.holdActive && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <PauseCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-500 text-sm">
                  Active Surgical Hold in Effect
                </span>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  Target: <strong className="text-foreground font-mono">{record.holdTarget}</strong>.
                  Payment attestation is frozen for human investigation. Work progress advances independently unblocked.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/admin/disputes">
                <Button size="sm" variant="outline" className="h-8 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10">
                  Open Dispute Chat
                </Button>
              </Link>
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => setIsHoldSheetOpen(true)}
              >
                <Check className="size-3.5 mr-1" />
                <span>Resolve Hold</span>
              </Button>
            </div>
          </div>
        )}

        {/* Sub-Navigation Tabs: Overview, Deal Chain, Work Blueprint & Audit */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`rounded-md px-3 py-1 text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "overview"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="size-3.5" />
              <span>Decoupled Pipelines</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("deal_chain")}
              className={`rounded-md px-3 py-1 text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "deal_chain"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Network className="size-3.5 text-primary" />
              <span>Deal Chain DAG Relay</span>
              {record.dealChain ? (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/40 text-primary">
                  Node {record.dealChain.currentNodeIndex}/{record.dealChain.totalNodes}
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground">(Direct)</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("blueprint")}
              className={`rounded-md px-3 py-1 text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "blueprint"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileCheck2 className="size-3.5 text-blue-400" />
              <span>Work Blueprint Spec</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`rounded-md px-3 py-1 text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "audit"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="size-3.5 text-muted-foreground" />
              <span>Audit Log ({record.events.length})</span>
            </button>
          </div>

          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
            <span>Shape:</span>
            <strong className="text-foreground font-mono">{record.workShape}</strong>
          </div>
        </div>

        {/* ===================================================================
             TAB 1: DECOUPLED PIPELINES OVERVIEW
             =================================================================== */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-6">
            {/* Decoupled Pipeline Health Bar */}
            <div className="rounded-xl border border-border bg-card/60 p-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">1. Order Agreement</span>
                    <span className="font-semibold text-foreground capitalize">
                      {record.orderStatus} (Terms Locked v1)
                    </span>
                  </div>
                </div>

                <div className="hidden sm:block h-6 w-px bg-border" />

                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">2. Work Execution</span>
                    <span className="font-semibold text-foreground">
                      Step {record.activeStep} of {record.totalSteps} (Unblocked)
                    </span>
                  </div>
                </div>

                <div className="hidden sm:block h-6 w-px bg-border" />

                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${record.holdActive ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">3. Payment Settlement</span>
                    <span className={`font-semibold ${record.holdActive ? "text-amber-500" : "text-emerald-500"}`}>
                      {record.holdActive ? "Surgically Held" : "Cleared"}
                    </span>
                  </div>
                </div>
              </div>

              <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
                3 Independent Decoupled State Machines
              </Badge>
            </div>

            {/* Three Decoupled Aggregate Detail Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Card 1: Order Agreement */}
              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="pb-3 border-b border-border/80">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="size-3.5 text-primary" />
                      <span>Order Agreement</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono text-emerald-500 border-emerald-500/30">
                      {record.orderStatus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 flex flex-col gap-2.5 text-xs">
                  <div className="font-semibold text-foreground text-sm leading-snug">
                    {record.title}
                  </div>
                  <div className="flex flex-col gap-1.5 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Agreed Total:</span>
                      <span className="font-bold text-foreground font-mono">{record.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Buyer:</span>
                      <span className="text-foreground font-medium">{record.buyer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Provider:</span>
                      <span className="text-foreground font-medium">{record.provider}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Terms Snapshot:</span>
                    <span className="font-mono text-foreground font-bold">Snapshot v1 Locked</span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Work Execution */}
              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="pb-3 border-b border-border/80">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Wrench className="size-3.5 text-blue-500" />
                      <span>Work Execution</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono text-blue-400 border-blue-500/30">
                      {record.workStatus.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 flex flex-col gap-2.5 text-xs">
                  <div className="font-semibold text-foreground text-sm leading-snug">
                    Shape: {record.workShape}
                  </div>
                  <div className="flex flex-col gap-1.5 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Active Milestone:</span>
                      <span className="font-bold text-foreground font-mono">
                        Step {record.activeStep} of {record.totalSteps}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Checkpoint Evidence:</span>
                      {record.evidence ? (
                        <button
                          type="button"
                          onClick={() => setIsEvidenceOpen(true)}
                          className="text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Camera className="size-3" />
                          <span>1 Photo (View)</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground">None submitted</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span>Execution Lock:</span>
                      <span className="text-foreground font-mono">Capacity Reserved</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Physical Progress:</span>
                    <span className="font-mono text-blue-400 font-semibold">
                      {Math.round((record.activeStep / record.totalSteps) * 100)}% Complete
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Payment Obligation */}
              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="pb-3 border-b border-border/80">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Receipt className="size-3.5 text-amber-500" />
                      <span>Payment Obligation</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono text-amber-400 border-amber-500/30">
                      {record.lane}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 flex flex-col gap-2.5 text-xs">
                  <div className="font-semibold text-foreground text-sm leading-snug">
                    {record.holdActive ? "Target #OBL-881 (Held)" : "Target #OBL-881"}
                  </div>
                  <div className="flex flex-col gap-1.5 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Custody Mode:</span>
                      <span className="text-foreground font-medium">Direct Peer (0% Fee)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Buyer Attestation:</span>
                      <span className="text-foreground font-medium">₱90.00 Reported</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Provider Receipt:</span>
                      <span className={record.holdActive ? "text-amber-500 font-medium" : "text-foreground font-medium"}>
                        {record.holdActive ? "Zero Received (Disputed)" : "Acknowledged ✓"}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Reconciliation:</span>
                    <span className={`font-mono font-bold ${record.holdActive ? "text-amber-500" : "text-emerald-500"}`}>
                      {record.holdActive ? "Unreconciled" : "Balanced ✓"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Linked Deal Chain Relay Mini-Track (if applicable) */}
            {record.dealChain && (
              <Card className="border-border bg-card shadow-xs overflow-hidden">
                <CardHeader className="p-3.5 pb-2.5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Network className="size-4 text-primary" />
                    <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span>Linked Deal Chain: {record.dealChain.title}</span>
                      <Badge variant="outline" className="font-mono text-[9.5px] text-primary border-primary/30">
                        {record.dealChain.chainId}
                      </Badge>
                    </CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("deal_chain")}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inspect Full DAG Relay ({record.dealChain.totalNodes} Nodes)</span>
                    <ArrowRight className="size-3" />
                  </button>
                </CardHeader>
                <CardContent className="p-3.5 pt-3">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                    {record.dealChain.nodes.map((n, i) => (
                      <React.Fragment key={n.nodeId}>
                        <div
                          className={`p-2.5 rounded-lg border flex flex-col gap-1 shrink-0 w-44 transition-all ${
                            n.isCurrentOrder
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-2xs"
                              : n.status === "completed"
                              ? "border-emerald-500/30 bg-emerald-500/5 opacity-85"
                              : "border-border bg-muted/20 opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9.5px] uppercase font-bold text-muted-foreground">
                              {n.vendorRole}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[8.5px] px-1 py-0 font-mono ${
                                n.isCurrentOrder
                                  ? "border-primary text-primary"
                                  : n.status === "completed"
                                  ? "border-emerald-500/40 text-emerald-500"
                                  : ""
                              }`}
                            >
                              {n.isCurrentOrder ? "Current Node" : n.status}
                            </Badge>
                          </div>
                          <span className="font-semibold text-foreground text-[11px] truncate">
                            {n.title}
                          </span>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                            <span className="truncate">{n.vendorName}</span>
                            <span className="font-mono font-bold text-foreground">{n.feeFormatted}</span>
                          </div>
                        </div>

                        {i < record.dealChain!.nodes.length - 1 && (
                          <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Live Work Execution DAG Milestone Pipeline */}
            <Card className="border-border bg-card shadow-xs overflow-hidden">
              <CardHeader className="pb-3 border-b border-border bg-muted/10">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <FileCheck2 className="size-4 text-primary" />
                      <span>Live Work Execution DAG Chain ({record.workShape})</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Sequential milestone dependency graph with verified evidence gates. Progress advances independently of payment holds.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("blueprint")}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect Blueprint Spec</span>
                      <ArrowRight className="size-3" />
                    </button>
                    <Badge variant="outline" className="text-xs font-mono">
                      Step {record.activeStep} of {record.totalSteps} Active
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {/* Connected Flow Canvas Container with Subtle Dot-Matrix Pattern */}
              <CardContent className="p-6 bg-[radial-gradient(rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[size:16px_16px] overflow-x-auto">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 min-w-[720px]">
                  {record.steps.map((step, i) => {
                    const isCompleted = step.status === "completed"
                    const isInProgress = step.status === "in_progress"

                    return (
                      <React.Fragment key={step.stepNumber}>
                        {/* Milestone DAG Node Card */}
                        <div
                          className={`flex-1 rounded-xl p-4 border flex flex-col justify-between gap-3 transition-all relative ${
                            isInProgress
                              ? "border-primary bg-card ring-2 ring-primary/30 shadow-md"
                              : isCompleted
                              ? "border-emerald-500/30 bg-card/90 shadow-xs"
                              : "border-border border-dashed bg-card/60 opacity-60"
                          }`}
                        >
                          {isInProgress && (
                            <div className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-white animate-ping" />
                              <span>Active Milestone</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10.5px] font-bold uppercase flex items-center gap-1.5 ${
                                isCompleted ? "text-emerald-500" : isInProgress ? "text-primary" : "text-muted-foreground"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="size-3.5" />
                              ) : isInProgress ? (
                                <span className="size-2 rounded-full bg-primary animate-pulse" />
                              ) : (
                                <Clock className="size-3.5" />
                              )}
                              <span>Step {step.stepNumber}</span>
                            </span>

                            <Badge
                              variant="outline"
                              className={`text-[9px] font-mono capitalize ${
                                isCompleted
                                  ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                                  : isInProgress
                                  ? "border-primary/40 text-primary bg-primary/5 font-bold"
                                  : ""
                              }`}
                            >
                              {step.status.replace("_", " ")}
                            </Badge>
                          </div>

                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-foreground text-xs leading-snug">
                              {step.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground leading-tight">
                              {step.description}
                            </span>
                          </div>

                          {isInProgress && (
                            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted mt-0.5">
                              <div className="bg-primary w-2/3 animate-pulse"></div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10.5px] text-muted-foreground pt-2 border-t border-border/60">
                            <span>{step.timestamp}</span>
                            {isCompleted && step.evidenceLabel?.includes("Photo") ? (
                              <button
                                type="button"
                                 onClick={() => setIsEvidenceOpen(true)}
                                className="text-emerald-500 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Camera className="size-3" />
                                <span>{step.evidenceLabel}</span>
                              </button>
                            ) : (
                              <span className={isCompleted ? "text-emerald-500 font-semibold" : isInProgress ? "text-primary font-semibold" : ""}>
                                {step.evidenceLabel}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Transition Gate / Arrow Connector between Milestone Nodes */}
                        {i < record.steps.length - 1 && (
                          <div className="flex flex-col items-center justify-center shrink-0 px-1 self-center">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono bg-muted/60 border border-border px-1.5 py-0.5 rounded-full whitespace-nowrap mb-1">
                              {isCompleted ? (
                                <>
                                  <Unlock className="size-2.5 text-emerald-500" />
                                  <span>Gate Cleared</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="size-2.5 text-amber-500" />
                                  <span>Gated</span>
                                </>
                              )}
                            </div>
                            <ArrowRight className="size-4 text-muted-foreground hidden lg:block" />
                            <ArrowDown className="size-4 text-muted-foreground lg:hidden" />
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===================================================================
             TAB 2: DEAL CHAIN DAG RELAY VIEW (Multi-Vendor Dependencies)
             =================================================================== */}
        {activeTab === "deal_chain" && (
          <div className="flex flex-col gap-6">
            {record.dealChain ? (
              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="p-4 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Network className="size-4 text-primary" />
                      <CardTitle className="text-sm font-bold text-foreground">
                        {record.dealChain.title}
                      </CardTitle>
                      <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                        {record.dealChain.chainId}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Multi-vendor DAG relay with upstream prerequisites and downstream delivery gates.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Chain Value</span>
                      <span className="font-mono font-bold text-foreground">{record.dealChain.totalChainValue}</span>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30 font-mono">
                      Node {record.dealChain.currentNodeIndex} of {record.dealChain.totalNodes} Active
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {/* Visual Horizontal DAG Pipeline Nodes */}
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
                    {record.dealChain.nodes.map((node, i) => {
                      const isCompleted = node.status === "completed"
                      const isActive = node.status === "active"
                      const isGated = node.status === "gated"

                      return (
                        <React.Fragment key={node.nodeId}>
                          {/* Node Card */}
                          <div
                            className={`flex-1 rounded-xl p-4 border flex flex-col justify-between gap-3 transition-all relative ${
                              node.isCurrentOrder
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                                : isCompleted
                                ? "border-emerald-500/30 bg-emerald-500/5"
                                : isGated
                                ? "border-dashed border-border bg-muted/10 opacity-60"
                                : "border-border bg-muted/10 opacity-70"
                            }`}
                          >
                            {node.isCurrentOrder && (
                              <div className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shadow-xs">
                                Inspected Order
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                {node.vendorRole === "merchant" && <Boxes className="size-3 text-blue-400" />}
                                {node.vendorRole === "courier" && <Truck className="size-3 text-amber-500" />}
                                {node.vendorRole === "technician" && <Wrench className="size-3 text-primary" />}
                                {node.vendorRole === "inspector" && <ShieldCheck className="size-3 text-emerald-500" />}
                                <span>{node.vendorRole}</span>
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] font-mono ${
                                  isCompleted
                                    ? "border-emerald-500/30 text-emerald-500"
                                    : isActive
                                    ? "border-primary text-primary bg-primary/10"
                                    : "border-border text-muted-foreground"
                                }`}
                              >
                                {node.status}
                              </Badge>
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-foreground text-xs leading-snug">
                                {node.title}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-medium">
                                {node.vendorName}
                              </span>
                            </div>

                            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                              <span className="font-mono text-muted-foreground">
                                {node.orderRef ?? "Scheduled"}
                              </span>
                              <span className="font-mono font-bold text-foreground">
                                {node.feeFormatted}
                              </span>
                            </div>

                            {node.gateCondition && (
                              <div className="text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded flex items-center gap-1 leading-tight">
                                {isCompleted ? <Unlock className="size-3 text-emerald-500 shrink-0" /> : <Lock className="size-3 text-amber-500 shrink-0" />}
                                <span className="truncate">{node.gateCondition}</span>
                              </div>
                            )}
                          </div>

                          {/* Arrow Connector between nodes */}
                          {i < record.dealChain!.nodes.length - 1 && (
                            <div className="flex items-center justify-center shrink-0 text-muted-foreground self-center">
                              <ArrowRight className="size-4 hidden lg:block" />
                              <ArrowDown className="size-4 lg:hidden my-1" />
                            </div>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card shadow-xs p-8 text-center flex flex-col items-center justify-center gap-2">
                <GitFork className="size-8 text-muted-foreground opacity-50" />
                <h3 className="font-heading text-sm font-bold text-foreground">
                  Standalone Direct Order
                </h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  This transaction is a direct bilateral agreement between buyer and provider. It does not depend on an upstream supplier or dispatch a downstream courier relay.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* ===================================================================
             TAB 3: WORK BLUEPRINT & QUALITY SPECIFICATION
             =================================================================== */}
        {activeTab === "blueprint" && (
          <div className="flex flex-col gap-6">
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="p-4 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="size-4 text-primary" />
                    <CardTitle className="text-sm font-bold text-foreground">
                      Governed Work Blueprint Specification
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {record.workBlueprint.code}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Standardized technical deliverables, mandatory evidence checkpoints, and safety clearance requirements.
                  </CardDescription>
                </div>

                <Badge variant="outline" className="border-amber-500/30 text-amber-500 font-mono text-xs">
                  {record.workBlueprint.safetyTierLabel}
                </Badge>
              </CardHeader>

              <CardContent className="p-6 flex flex-col gap-6 text-xs">
                {/* Blueprint Metadata Grid */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="p-3.5 rounded-xl border border-border bg-muted/10 flex flex-col gap-1">
                    <span className="text-muted-foreground text-[11px]">Work Shape Model</span>
                    <span className="font-semibold text-foreground text-sm font-heading">{record.workBlueprint.workShape}</span>
                    <span className="text-[10.5px] text-muted-foreground">Standardized lifecycle pattern</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-muted/10 flex flex-col gap-1">
                    <span className="text-muted-foreground text-[11px]">Mandatory Checkpoint Fact</span>
                    <span className="font-semibold text-foreground text-sm leading-snug">{record.workBlueprint.mandatoryEvidenceType}</span>
                    <span className="text-[10.5px] text-primary">Required for milestone sign-off</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-muted/10 flex flex-col gap-1">
                    <span className="text-muted-foreground text-[11px]">Post-Work Warranty</span>
                    <span className="font-semibold text-foreground text-sm font-mono">{record.workBlueprint.warrantyDays} Calendar Days</span>
                    <span className="text-[10.5px] text-muted-foreground">Platform dispute protection window</span>
                  </div>
                </div>

                {/* Governed Milestone DAG Template Architecture */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <GitFork className="size-3.5 text-primary" />
                      <span>Governed Milestone DAG Flow Architecture</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {record.steps.length} Sequential Milestones
                    </Badge>
                  </div>

                  {/* Connected DAG Flow Canvas */}
                  <div className="rounded-xl border border-border bg-[radial-gradient(rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[size:16px_16px] p-5 overflow-x-auto">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 min-w-[680px]">
                      {record.steps.map((step, i) => (
                        <React.Fragment key={step.stepNumber}>
                          <div className="flex-1 rounded-xl p-3.5 border border-border bg-card shadow-xs flex flex-col justify-between gap-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase text-primary flex items-center gap-1">
                                <span className="size-4 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-[9px]">
                                  {step.stepNumber}
                                </span>
                                <span>Milestone {step.stepNumber}</span>
                              </span>
                              <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
                                Mandatory
                              </Badge>
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-foreground text-xs leading-snug">
                                {step.title}
                              </span>
                              <span className="text-[10.5px] text-muted-foreground leading-tight">
                                {step.description}
                              </span>
                            </div>

                            <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>Evidence:</span>
                              <span className="font-semibold text-foreground">{step.evidenceLabel ?? "Fact Required"}</span>
                            </div>
                          </div>

                          {i < record.steps.length - 1 && (
                            <div className="flex flex-col items-center justify-center shrink-0 px-1 self-center">
                              <span className="text-[9px] font-mono text-muted-foreground bg-muted/80 border border-border px-1.5 py-0.5 rounded-full mb-1">
                                Gate
                              </span>
                              <ArrowRight className="size-4 text-muted-foreground hidden lg:block" />
                              <ArrowDown className="size-4 text-muted-foreground lg:hidden" />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Safety Tool Clearance Checklist */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 font-bold text-foreground text-xs uppercase tracking-wider">
                    <HardHat className="size-3.5 text-amber-500" />
                    <span>Required Safety &amp; Tooling Accreditations</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {record.workBlueprint.toolClearanceChecklist.map((tool, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                          <span className="font-medium text-foreground">{tool}</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">
                          Mandatory
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Acceptance Standard */}
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col gap-1.5">
                  <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <Shield className="size-3.5 text-primary" />
                    <span>Contractual Completion Acceptance Standard</span>
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    {record.workBlueprint.acceptanceCriteria}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===================================================================
             TAB 4: MULTI-AGGREGATE CHRONOLOGICAL AUDIT TIMELINE
             =================================================================== */}
        {activeTab === "audit" && (
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Multi-Aggregate Audit Timeline
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Chronological event stream signed with correlation hashes. History is append-only.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {record.events.length} Events
              </Badge>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-3">
                {record.events.map((ev, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <span className="font-mono text-muted-foreground w-24 shrink-0">{ev.time}</span>
                    <Badge
                      variant={ev.type === "Dispute" ? "destructive" : ev.type === "Hold" ? "default" : "outline"}
                      className={`w-20 justify-center shrink-0 text-[10px] ${
                        ev.type === "Hold" ? "bg-amber-600 text-white" : ""
                      }`}
                    >
                      {ev.type}
                    </Badge>
                    <div className="flex-1 text-foreground leading-relaxed">
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground mr-1.5">
                        [{ev.actor}]
                      </span>
                      {ev.text}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===================================================================
           INTERACTIVE EVIDENCE PHOTO INSPECTION SHEET
           =================================================================== */}
      <Sheet open={isEvidenceOpen} onOpenChange={setIsEvidenceOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border p-6 flex flex-col justify-between overflow-y-auto">
          <div className="flex flex-col gap-4">
            <SheetHeader className="pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-primary">
                <Camera className="size-5 shrink-0" />
                <SheetTitle className="font-heading text-base font-bold text-foreground">
                  Checkpoint Evidence Photo
                </SheetTitle>
              </div>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                Verified physical work checkpoint submitted by technician on-site.
              </SheetDescription>
            </SheetHeader>

            {record.evidence && (
              <div className="flex flex-col gap-3 text-xs">
                {/* Photo Preview Container */}
                <div className="relative rounded-xl overflow-hidden border border-border bg-black/50 aspect-video flex items-center justify-center">
                  <img
                    src={record.evidence.url}
                    alt={record.evidence.caption}
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute bottom-2 left-2 bg-black/70 text-white border-0 text-[10px] font-mono backdrop-blur-xs">
                    EXIF Verified
                  </Badge>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20 flex flex-col gap-2">
                  <span className="font-semibold text-foreground text-xs leading-snug">
                    {record.evidence.caption}
                  </span>
                  <div className="flex flex-col gap-1.5 text-[11px] text-muted-foreground pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3 shrink-0 text-primary" />
                      <span>Uploaded: <strong className="text-foreground font-mono">{record.evidence.uploadedAt}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3 shrink-0 text-emerald-500" />
                      <span>{record.evidence.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="size-3 shrink-0 text-blue-400" />
                      <span>Device: {record.evidence.device}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span>Hash: {record.evidence.checksum}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="text-xs w-full"
              onClick={() => setIsEvidenceOpen(false)}
            >
              Close Evidence
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ===================================================================
           IN-PLACE HOLD RESOLUTION SHEET (Surgical Unfreeze)
           =================================================================== */}
      <Sheet open={isHoldSheetOpen} onOpenChange={setIsHoldSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border p-6 flex flex-col justify-between">
          <div className="flex flex-col gap-5">
            <SheetHeader className="pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-amber-500">
                <PauseCircle className="size-5 shrink-0" />
                <SheetTitle className="font-heading text-base font-bold text-foreground">
                  Resolve Surgical Hold
                </SheetTitle>
              </div>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                Release the administrative freeze on {record.holdTarget}. Physical work progress has continued unblocked.
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 text-xs">
              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Target Aggregate:</span>
                  <Badge variant="outline" className="font-mono text-[10px] text-amber-500 border-amber-500/40">
                    Payment Obligation
                  </Badge>
                </div>
                <span className="font-mono text-muted-foreground">{record.holdTarget}</span>
                <div className="pt-2 border-t border-amber-500/20 text-[11px] text-muted-foreground">
                  Order Ref: <strong className="text-foreground font-mono">{record.ref}</strong>
                </div>
              </div>

              {/* Basis Select */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="resolve-basis" className="text-xs font-semibold text-foreground">
                  Basis for Administrative Release
                </Label>
                <Select value={releaseReason} onValueChange={setReleaseReason}>
                  <SelectTrigger id="resolve-basis" className="text-xs bg-muted/20 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mutual_acknowledgement">Mutual Cash Receipt Confirmed</SelectItem>
                    <SelectItem value="evidence_validated">Digital Payment Screenshot Validated</SelectItem>
                    <SelectItem value="teleconference_reconciled">Reconciled via Operator Mediation</SelectItem>
                    <SelectItem value="supervisor_override">Supervisor Administrative Override</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inspector-notes" className="text-xs font-semibold text-foreground">
                  Operator Case File Notes
                </Label>
                <Textarea
                  id="inspector-notes"
                  placeholder="Record audit reason justifying the unfreeze..."
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  className="text-xs min-h-[90px] bg-muted/20 border-border text-foreground font-mono"
                />
                <span className="text-[10px] text-muted-foreground">
                  Logged under Officer Santos (Desk Supervisor) with immutable correlation timestamp.
                </span>
              </div>
            </div>
          </div>

          <SheetFooter className="pt-4 border-t border-border flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs w-full sm:w-auto"
              onClick={() => setIsHoldSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              className="text-xs w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isSubmittingHold}
              onClick={handleConfirmReleaseHold}
            >
              {isSubmittingHold ? (
                <>
                  <RotateCw className="size-3.5 mr-1.5 animate-spin" />
                  <span>Committing Release...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5 mr-1.5" />
                  <span>Confirm Release Hold</span>
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  )
}
