import { Head } from "@inertiajs/react"
import * as React from "react"
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  EyeOff,
  FileText,
  FolderArchive,
  Landmark,
  MessageSquare,
  Printer,
  RotateCw,
  Scale,
  Search,
  Send,
  ShieldAlert,
  Split,
  Unlock,
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
import { Checkbox } from "@/components/ui/checkbox"
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { AdminMetricCard } from "@/components/admin/GraphicMetrics"
import { AdminLayout } from "@/layouts/AdminLayout"

export interface MediationMessage {
  id: string
  sender: "buyer" | "provider" | "admin" | "system"
  senderName: string
  text: string
  time: string
  isInternalNote?: boolean
  actionProposal?: {
    type: string
    providerPct: number
    buyerPct: number
  }
}

export interface LuponDetails {
  docketNumber: string
  barangay: string
  referralDate: string
  statutoryDeadline: string
  status: "in_conciliation" | "amicable_settled" | "certificate_issued"
  officerInCharge: string
  grounds: string
  physicalCabinetRef?: string
  outcomeNotes?: string
}

export interface DisputeRecord {
  id: string
  reference: string
  ticketNumber: string
  orderRef: string
  obligationRef: string
  listingTitle: string
  imageUrl: string
  claimant: { name: string; role: "buyer" | "provider"; phoneMasked: string; barangay: string; statement: string }
  respondent: { name: string; role: "buyer" | "provider"; phoneMasked: string; barangay: string; statement: string }
  disputeType: string
  amountMinor: number
  paymentLane: "cash" | "proof" | "tiwala"
  status: "open" | "evaluating" | "escalated_lupon" | "resolved"
  hasActiveHold: boolean
  holdTarget?: string
  evidenceCount: number
  openedAt: string
  evidencePhotos?: Array<{ label: string; url: string; time: string; hash?: string }>
  messages: MediationMessage[]
  luponDetails?: LuponDetails
}

const TAGUDIN_BARANGAYS = [
  "Barangay Poblacion",
  "Barangay Farola",
  "Barangay Bitalag",
  "Barangay Bio",
  "Barangay Ambalayat",
  "Barangay Libtong",
  "Barangay Becques",
  "Barangay Dacutan",
  "Barangay Del Pilar",
  "Barangay Garitan",
]

const SAMPLE_DISPUTES: DisputeRecord[] = [
  {
    id: "dsp-1",
    reference: "DSP-082",
    ticketNumber: "TKT-2026-09",
    orderRef: "ORD-2026-09",
    obligationRef: "OBL-881",
    listingTitle: "Ceiling Fan Motor Diagnostics & Capacitor Replacement",
    imageUrl: "/photos/ac-capacitor.jpg",
    claimant: {
      name: "Arman Electric",
      role: "provider",
      phoneMasked: "+63 918 *** 7890",
      barangay: "Barangay Poblacion",
      statement: "Completed Step 1 disassembly and installed 1.5uF capacitor. Buyer Maria stated she handed ₱90 cash to my apprentice, but apprentice was at the shop all day. No cash reached my hand at the job site.",
    },
    respondent: {
      name: "Maria Santos",
      role: "buyer",
      phoneMasked: "+63 917 *** 3456",
      barangay: "Barangay Farola",
      statement: "My 14-year-old son handed ₱90 cash to a rider who arrived with Arman's motorcycle carrying the part. We paid in complete good faith.",
    },
    disputeType: "External Cash Handover Mismatch",
    amountMinor: 9000,
    paymentLane: "cash",
    status: "open",
    hasActiveHold: true,
    holdTarget: "Payment Obligation #OBL-881",
    evidenceCount: 2,
    openedAt: "2026-09-17 14:25 PHT",
    evidencePhotos: [
      { label: "Apprentice Workshop Attendance Log", url: "/photos/ac-clean.jpg", time: "14:20 PHT", hash: "sha256:3a1b94e80f21" },
      { label: "Installed Capacitor Unit Photo", url: "/photos/ac-capacitor.jpg", time: "14:15 PHT", hash: "sha256:8f4c71a9b20e" },
    ],
    messages: [
      {
        id: "m-1",
        sender: "buyer",
        senderName: "Maria Santos (Buyer)",
        text: "My son handed ₱90 cash to the person who delivered the replacement capacitor outside our gate.",
        time: "14:22 PHT",
      },
      {
        id: "m-2",
        sender: "provider",
        senderName: "Arman Electric (Provider)",
        text: "Ma'am, my workshop apprentice was in Centro all afternoon. I worked alone on your fan. I did not receive any cash.",
        time: "14:25 PHT",
      },
      {
        id: "m-3",
        sender: "system",
        senderName: "Serbizyu Trust Engine",
        text: "⚠️ Administrative Hold placed on Payment Obligation #OBL-881. Work instance remains unblocked under surgical isolation.",
        time: "14:26 PHT",
      },
      {
        id: "m-4",
        sender: "system",
        senderName: "Serbizyu Trust Engine",
        text: "📷 Arman Electric submitted attendance verification log (attendance-log.jpg). SHA-256 hash sealed.",
        time: "14:28 PHT",
      },
      {
        id: "m-5",
        sender: "admin",
        senderName: "Officer Santos (Desk Supervisor)",
        text: "Good afternoon Maria and Arman. I am reviewing the site photos and delivery notes. Maria, did the person who took the cash arrive on a private motorcycle or wearing a courier box?",
        time: "14:32 PHT",
      },
      {
        id: "m-6",
        sender: "buyer",
        senderName: "Maria Santos (Buyer)",
        text: "He had an insulated red delivery bag! He said 'Parts delivery for Arman'. We assumed he was authorized to collect payment!",
        time: "14:35 PHT",
      },
    ],
  },
  {
    id: "dsp-2",
    reference: "DSP-081",
    ticketNumber: "TKT-2026-04",
    orderRef: "ORD-2026-04",
    obligationRef: "OBL-840",
    listingTitle: "Special Royal Bibingka (24-Piece Box)",
    imageUrl: "/photos/bibingka.jpg",
    claimant: {
      name: "Elena Cruz",
      role: "buyer",
      phoneMasked: "+63 920 *** 5544",
      barangay: "Barangay Poblacion",
      statement: "Received only 18 pieces in sealed delivery box instead of 24 pieces agreed in accepted quotation. Missing 6 pieces for baptismal event.",
    },
    respondent: {
      name: "Tagudin Bakery Guild",
      role: "provider",
      phoneMasked: "+63 919 *** 1122",
      barangay: "Barangay Farola",
      statement: "Packed full 24 count into two 12-slot boxes taped together. Buyer unboxing photo only shows upper tier of the parcel.",
    },
    disputeType: "Delivered Quantity Variance",
    amountMinor: 12000,
    paymentLane: "proof",
    status: "evaluating",
    hasActiveHold: true,
    holdTarget: "Payment Obligation #OBL-840",
    evidenceCount: 3,
    openedAt: "2026-09-16 16:10 PHT",
    messages: [
      {
        id: "m-10",
        sender: "buyer",
        senderName: "Elena Cruz",
        text: "Only 18 pieces arrived at our church hall. We had to buy extra snacks last minute.",
        time: "16:10 PHT",
      },
      {
        id: "m-11",
        sender: "provider",
        senderName: "Tagudin Bakery Guild",
        text: "Ma'am please inspect the bottom tray beneath the greaseproof banana paper.",
        time: "16:15 PHT",
      },
    ],
  },
  {
    id: "dsp-3",
    reference: "DSP-079",
    ticketNumber: "TKT-2026-02",
    orderRef: "ORD-2026-02",
    obligationRef: "OBL-820",
    listingTitle: "Palay Grain Hauling (Ambalayat Paddy to Solar Dryer)",
    imageUrl: "/photos/courier.jpg",
    claimant: {
      name: "Ernesto Batalag",
      role: "buyer",
      phoneMasked: "+63 922 *** 7654",
      barangay: "Barangay Ambalayat",
      statement: "Kuliglig driver stopped for 2 hours in Barangay Bio during rainfall without covering trailer with tarpaulin. 14 sacks suffered rainwater soak.",
    },
    respondent: {
      name: "Bitalag Kuliglig Guild",
      role: "provider",
      phoneMasked: "+63 915 *** 8811",
      barangay: "Barangay Bitalag",
      statement: "Engine carburetor flooded in flash puddle. Tarpaulin was deployed immediately. Dampness was surface-level on burlap sacks only, grain is undamaged.",
    },
    disputeType: "Cargo Weather Damage & Delay",
    amountMinor: 24000,
    paymentLane: "cash",
    status: "escalated_lupon",
    hasActiveHold: false,
    evidenceCount: 4,
    openedAt: "2026-09-15 11:00 PHT",
    luponDetails: {
      docketNumber: "KP-2026-TAG-003",
      barangay: "Barangay Bio",
      referralDate: "2026-09-15 11:00 PHT",
      statutoryDeadline: "Day 4 of 15-Day Conciliation (RA 7160 Sec. 410)",
      status: "in_conciliation",
      officerInCharge: "Hon. Punong Barangay Danilo Ramos",
      grounds: "Contested grain moisture content & transport delay under RA 7160 Katarungang Pambarangay",
      physicalCabinetRef: "CAB-2026-AGRI-09",
      outcomeNotes: "Certified evidence packet delivered to Barangay Bio Hall. Awaiting physical signed Kasunduan or Katibayan.",
    },
    messages: [
      {
        id: "m-20",
        sender: "system",
        senderName: "Serbizyu Legal Gateway",
        text: "⚖️ Certified Handoff Packet generated and transmitted to Barangay Bio Hall for Hon. Punong Barangay Danilo Ramos (Docket #KP-2026-TAG-003).",
        time: "2026-09-15 11:00 PHT",
      },
    ],
  },
]

export default function DisputesIndex() {
  const [disputes, setDisputes] = React.useState<DisputeRecord[]>(SAMPLE_DISPUTES)
  const [statusTab, setStatusTab] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 6
  const [inspectedDispute, setInspectedDispute] = React.useState<DisputeRecord | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

  // Live Mediation Chat State
  const [chatInput, setChatInput] = React.useState("")
  const [chatMode, setChatMode] = React.useState<"public" | "internal">("public")

  // Escrow Settlement Dialog state
  const [isSettlementOpen, setIsSettlementOpen] = React.useState(false)
  const [settlementMode, setSettlementMode] = React.useState<
    "cash_reconciled" | "split_settlement" | "refund_buyer" | "release_provider" | "account_warning"
  >("cash_reconciled")
  const [splitProviderPct, setSplitProviderPct] = React.useState(50)
  const [settlementReason, setSettlementReason] = React.useState("")
  const [settlementExecuted, setSettlementExecuted] = React.useState(false)

  // ===================================================================
  // LUPON TAGAPAMAYAPA EVIDENCE HANDOFF STATE
  // ===================================================================
  const [isLuponReferralOpen, setIsLuponReferralOpen] = React.useState(false)
  const [isDocketLetterOpen, setIsDocketLetterOpen] = React.useState(false)
  const [docketPacketTab, setDocketPacketTab] = React.useState<"letter" | "exhibits" | "kasunduan">("letter")
  const [isRecordOutcomeOpen, setIsRecordOutcomeOpen] = React.useState(false)
  const [docketPrintRecord, setDocketPrintRecord] = React.useState<DisputeRecord | null>(null)

  // Lupon Referral Form State
  const [targetBarangay, setTargetBarangay] = React.useState(TAGUDIN_BARANGAYS[0])
  const [luponGrounds, setLuponGrounds] = React.useState("cash_mismatch")
  const [luponNotes, setLuponNotes] = React.useState("")
  const [dispatchSms, setDispatchSms] = React.useState(true)
  const [isSubmittingLupon, setIsSubmittingLupon] = React.useState(false)

  // Lupon Physical Return Form State
  const [outcomeType, setOutcomeType] = React.useState<"amicable_settlement" | "certificate_issued">("amicable_settlement")
  const [outcomeTerms, setOutcomeTerms] = React.useState("")
  const [outcomeOfficer, setOutcomeOfficer] = React.useState("Hon. Punong Barangay")
  const [cabinetFilingCode, setCabinetFilingCode] = React.useState("CAB-2026-TAG-B04")
  const [isSubmittingOutcome, setIsSubmittingOutcome] = React.useState(false)

  // Success notifications
  const [luponSuccessBanner, setLuponSuccessBanner] = React.useState<string | null>(null)

  // Handle Send Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !inspectedDispute) return

    const now = new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) + " PHT"
    const newMsg: MediationMessage = {
      id: `m-${Date.now()}`,
      sender: "admin",
      senderName: chatMode === "internal" ? "Officer Santos (Internal Note)" : "Officer Santos (Desk Supervisor)",
      text: chatInput.trim(),
      time: now,
      isInternalNote: chatMode === "internal",
    }

    const updated = {
      ...inspectedDispute,
      messages: [...inspectedDispute.messages, newMsg],
    }

    setInspectedDispute(updated)
    setDisputes((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    setChatInput("")
  }

  // Handle Generate & Endorse Handoff Packet to Kapitan
  const handleConfirmLuponReferral = () => {
    if (!inspectedDispute) return
    setIsSubmittingLupon(true)

    setTimeout(() => {
      const now = new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) + " PHT"
      const docketNo = `KP-2026-TAG-${inspectedDispute.reference.replace("DSP-", "")}`

      const luponData: LuponDetails = {
        docketNumber: docketNo,
        barangay: targetBarangay,
        referralDate: `${new Date().toISOString().substring(0, 10)} ${now}`,
        statutoryDeadline: "Day 1 of 15-Day Mediation Window (RA 7160 Sec. 410)",
        status: "in_conciliation",
        officerInCharge: `Hon. Punong Barangay (Kapitan) of ${targetBarangay}`,
        grounds:
          luponGrounds === "cash_mismatch"
            ? "Contested Cash Handover (Zero Platform Custody)"
            : luponGrounds === "quality_breach"
            ? "Physical Work Quality / Milestone Dispute"
            : "Parties Reached Impasse During Platform Conciliation",
        physicalCabinetRef: `CAB-2026-TAG-${inspectedDispute.reference.replace("DSP-", "")}`,
        outcomeNotes: luponNotes || "Official case file endorsed by Officer Santos for Punong Barangay conciliation.",
      }

      const auditMsg: MediationMessage = {
        id: `m-${Date.now()}`,
        sender: "system",
        senderName: "Serbizyu Legal Gateway",
        text: `⚖️ Certified Handoff Packet generated and transmitted to ${targetBarangay} Hall for the Punong Barangay (Docket #${docketNo}). Platform acts as evidentiary custodian.`,
        time: now,
      }

      const updated: DisputeRecord = {
        ...inspectedDispute,
        status: "escalated_lupon",
        luponDetails: luponData,
        messages: [...inspectedDispute.messages, auditMsg],
      }

      setIsSubmittingLupon(false)
      setIsLuponReferralOpen(false)
      setInspectedDispute(updated)
      setDisputes((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      setLuponSuccessBanner(`Handoff Packet for ${targetBarangay} Kapitan generated (Docket #${docketNo}). Ready for physical release.`)
    }, 900)
  }

  // Handle Logging Paper Document Returned from Barangay Hall
  const handleConfirmRecordOutcome = () => {
    if (!inspectedDispute) return
    setIsSubmittingOutcome(true)

    setTimeout(() => {
      const now = new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) + " PHT"
      const isSettled = outcomeType === "amicable_settlement"

      const auditMsg: MediationMessage = {
        id: `m-${Date.now()}`,
        sender: "system",
        senderName: "Serbizyu Legal Gateway",
        text: isSettled
          ? `🤝 Physical Paper Kasunduan Returned: Signed by parties and attested by ${outcomeOfficer}. Terms: ${outcomeTerms || "Amicable settlement reached"}. Filed in ${cabinetFilingCode}. Surgical hold released.`
          : `📜 Katibayan (Certificate to File Action) Returned: Issued by ${outcomeOfficer}. Conciliation concluded without settlement. Filed in ${cabinetFilingCode}. Case closed for court recourse.`,
        time: now,
      }

      const updated: DisputeRecord = {
        ...inspectedDispute,
        status: "resolved",
        hasActiveHold: false,
        luponDetails: inspectedDispute.luponDetails
          ? {
              ...inspectedDispute.luponDetails,
              status: isSettled ? "amicable_settled" : "certificate_issued",
              physicalCabinetRef: cabinetFilingCode,
              outcomeNotes: outcomeTerms,
            }
          : undefined,
        messages: [...inspectedDispute.messages, auditMsg],
      }

      setIsSubmittingOutcome(false)
      setIsRecordOutcomeOpen(false)
      setInspectedDispute(updated)
      setDisputes((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      setLuponSuccessBanner(
        isSettled
          ? `Physical signed Kasunduan logged (Cabinet ${cabinetFilingCode}). Obligation hold released.`
          : `Certificate to File Action logged (Cabinet ${cabinetFilingCode}). Dispute closed.`
      )
    }, 800)
  }

  // Handle Escrow Settlement Execution
  const handleExecuteSettlement = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectedDispute) return

    setSettlementExecuted(true)
    setTimeout(() => {
      const now = new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) + " PHT"
      const auditMsg: MediationMessage = {
        id: `m-${Date.now()}`,
        sender: "system",
        senderName: "Serbizyu Trust Engine",
        text: `⚖️ Administrative Settlement Executed by Officer Santos: ${settlementMode.replace(/_/g, " ").toUpperCase()}. Hold on ${inspectedDispute.obligationRef} released.`,
        time: now,
      }

      const updated: DisputeRecord = {
        ...inspectedDispute,
        status: "resolved",
        hasActiveHold: false,
        messages: [...inspectedDispute.messages, auditMsg],
      }

      setIsSettlementOpen(false)
      setSettlementExecuted(false)
      setInspectedDispute(updated)
      setDisputes((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    }, 900)
  }

  // Filter computation
  const filteredDisputes = React.useMemo(() => {
    return disputes.filter((item) => {
      if (statusTab === "holds" && !item.hasActiveHold) return false
      if (statusTab === "cash" && !item.disputeType.toLowerCase().includes("cash")) return false
      if (statusTab === "evaluating" && item.status !== "evaluating") return false
      if (statusTab === "lupon" && item.status !== "escalated_lupon") return false
      if (statusTab === "resolved" && item.status !== "resolved") return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          item.reference.toLowerCase().includes(q) ||
          item.ticketNumber.toLowerCase().includes(q) ||
          item.orderRef.toLowerCase().includes(q) ||
          item.disputeType.toLowerCase().includes(q) ||
          item.claimant.name.toLowerCase().includes(q) ||
          item.respondent.name.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [disputes, statusTab, searchQuery])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [statusTab, searchQuery, pageSize])

  const totalItems = filteredDisputes.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedDisputes = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredDisputes.slice(start, start + pageSize)
  }, [filteredDisputes, currentPage, pageSize])

  const isAllPageSelected =
    paginatedDisputes.length > 0 && paginatedDisputes.every((d) => selectedIds.includes(d.id))
  const isSomePageSelected =
    paginatedDisputes.some((d) => selectedIds.includes(d.id)) && !isAllPageSelected

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge variant="destructive" className="text-[10px] gap-1">
            <ShieldAlert className="size-2.5" />
            <span>Open Dispute</span>
          </Badge>
        )
      case "evaluating":
        return (
          <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/5 text-[10px] gap-1">
            <Clock className="size-2.5" />
            <span>Under Evaluation</span>
          </Badge>
        )
      case "escalated_lupon":
        return (
          <Badge variant="default" className="bg-purple-600 text-white font-mono text-[10px] gap-1">
            <Landmark className="size-2.5" />
            <span>Referred to Kapitan</span>
          </Badge>
        )
      case "resolved":
        return (
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 bg-emerald-500/5 text-[10px] gap-1">
            <Check className="size-2.5" />
            <span>Resolved</span>
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const luponCount = disputes.filter((d) => d.status === "escalated_lupon").length

  return (
    <AdminLayout
      currentSection="disputes"
      title="Disputes &amp; Administrative Holds"
      breadcrumbs={[{ label: "Operations", href: "/admin/triage" }, { label: "Disputes & Holds" }]}
    >
      <Head title="Disputes & Holds — Serbizyu Admin" />

      <div className="flex flex-col gap-6">
        {/* ===================================================================
             VIEW 1: IN-PLACE FULL DISPUTE MEDIATION WORKSPACE
             =================================================================== */}
        {inspectedDispute ? (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Top Return Bar & Docket Context */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-2 cursor-pointer border-border w-fit"
                onClick={() => setInspectedDispute(null)}
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Disputes Registry</span>
              </Button>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-mono text-muted-foreground">
                  Docket: <strong className="text-foreground">{inspectedDispute.reference}</strong>
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="font-mono text-muted-foreground">
                  Ticket: <strong className="text-primary">{inspectedDispute.ticketNumber}</strong>
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="font-mono text-muted-foreground">
                  Order: <strong className="text-foreground">{inspectedDispute.orderRef}</strong>
                </span>
                {getStatusBadge(inspectedDispute.status)}
              </div>
            </div>

            {/* Success Banner */}
            {luponSuccessBanner && (
              <Alert className="border-purple-500/30 bg-purple-500/10 text-purple-400">
                <Landmark className="size-4 text-purple-400 shrink-0" />
                <div className="flex items-center justify-between w-full">
                  <div>
                    <AlertTitle className="text-xs font-bold text-foreground">
                      Barangay Hall Action Confirmed
                    </AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                      {luponSuccessBanner}
                    </AlertDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setLuponSuccessBanner(null)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </Alert>
            )}

            {/* Main 2-Column Split Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column (2 Cols): Tripartite Mediation Stream */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <Card className="border-border bg-card shadow-xs">
                  <CardHeader className="p-4 pb-3 border-b border-border flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="size-4 text-primary" />
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground">
                          Tripartite Mediation Stream
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          Dialogue between Buyer, Provider, and Municipal Desk Supervisor.
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-500">
                      Active Session
                    </Badge>
                  </CardHeader>

                  {/* Chat Messages Stream */}
                  <CardContent className="p-4 flex flex-col gap-3 min-h-[420px] max-h-[520px] overflow-y-auto">
                    {inspectedDispute.messages.map((msg) => {
                      const isSystem = msg.sender === "system"
                      const isInternal = msg.isInternalNote
                      const isAdmin = msg.sender === "admin" && !isInternal
                      const isBuyer = msg.sender === "buyer"
                      const isProvider = msg.sender === "provider"

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="my-1 flex items-center justify-center">
                            <div className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-mono text-muted-foreground text-center max-w-xl leading-relaxed">
                              {msg.text} <span className="text-[10px] opacity-70 ml-1">({msg.time})</span>
                            </div>
                          </div>
                        )
                      }

                      if (isInternal) {
                        return (
                          <div key={msg.id} className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 flex flex-col gap-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-[11px]">
                                <EyeOff className="size-3" />
                                <span>Staff Note · Hidden from Parties</span>
                              </span>
                              <span className="font-mono text-[10px] text-muted-foreground">{msg.time}</span>
                            </div>
                            <p className="text-foreground leading-relaxed font-sans">{msg.text}</p>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`rounded-xl p-3 flex flex-col gap-1 text-xs max-w-[88%] ${
                            isAdmin
                              ? "border border-primary/40 bg-primary/5 ml-auto text-right"
                              : isBuyer
                              ? "border border-blue-500/30 bg-blue-500/5 mr-auto"
                              : isProvider
                              ? "border border-emerald-500/30 bg-emerald-500/5 mr-auto"
                              : "border border-border bg-muted/10 mr-auto"
                          }`}
                        >
                          <div className={`flex items-center gap-2 ${isAdmin ? "justify-end" : "justify-start"}`}>
                            <span className="font-bold text-foreground text-[11.5px]">{msg.senderName}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">{msg.time}</span>
                          </div>
                          <p className={`text-foreground leading-relaxed font-sans ${isAdmin ? "text-right" : "text-left"}`}>
                            {msg.text}
                          </p>
                        </div>
                      )
                    })}
                  </CardContent>

                  {/* Chat Composer */}
                  <div className="p-3 border-t border-border bg-muted/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setChatMode("public")}
                          className={`rounded-md px-2.5 py-0.5 font-medium transition-colors cursor-pointer ${
                            chatMode === "public"
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Official Reply
                        </button>
                        <button
                          type="button"
                          onClick={() => setChatMode("internal")}
                          className={`rounded-md px-2.5 py-0.5 font-medium transition-colors cursor-pointer ${
                            chatMode === "internal"
                              ? "bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/40"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Staff Note
                        </button>
                      </div>
                      <span className="text-[10.5px] text-muted-foreground">
                        {chatMode === "public" ? "Visible to both citizens" : "Audited internally · Hidden from parties"}
                      </span>
                    </div>

                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={chatMode === "public" ? "Type official mediation message to both parties..." : "Record internal case evaluation note..."}
                        className="h-8 text-xs bg-muted/20 border-border text-foreground"
                      />
                      <Button type="submit" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
                        <Send className="size-3" />
                        <span>Send</span>
                      </Button>
                    </form>
                  </div>
                </Card>
              </div>

              {/* Right Column (1 Col): Hold & Barangay Handoff Consoles */}
              <div className="flex flex-col gap-4">
                {/* Hold & Obligation Settlement Card */}
                <Card className="border-border bg-card shadow-xs">
                  <CardHeader className="p-4 pb-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Scale className="size-3.5 text-amber-500" />
                        <span>Hold &amp; Obligation Settlement</span>
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {inspectedDispute.obligationRef}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-col gap-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Disputed Sum:</span>
                      <span className="font-mono text-base font-bold text-foreground">
                        ₱{(inspectedDispute.amountMinor / 100).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Custody Lane:</span>
                      <Badge variant="outline" className="text-[10px] capitalize font-mono">
                        {inspectedDispute.paymentLane === "cash" ? "External Cash (0% Take)" : "Tiwala Escrow"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Surgical Hold:</span>
                      <span className={inspectedDispute.hasActiveHold ? "text-amber-500 font-bold" : "text-emerald-500 font-semibold"}>
                        {inspectedDispute.hasActiveHold ? "Active (#OBL-881)" : "Released ✓"}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      className="w-full text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5 cursor-pointer mt-1"
                      onClick={() => {
                        setIsSettlementOpen(true)
                        setSettlementExecuted(false)
                      }}
                    >
                      <Unlock className="size-3.5" />
                      <span>Settle Escrow &amp; Release Hold</span>
                    </Button>
                  </CardContent>
                </Card>

                {/* ===================================================================
                     BARANGAY HALL REFERRAL & LEGAL HANDOFF CONSOLE (RA 7160 / PRD §6.5)
                     =================================================================== */}
                <Card className="border-purple-500/30 bg-purple-500/5 shadow-xs">
                  <CardHeader className="p-4 pb-2 border-b border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                        <Landmark className="size-3.5" />
                        <span>Barangay Hall Legal Handoff</span>
                      </CardTitle>
                      <Badge variant="outline" className="text-[9px] font-mono border-purple-500/40 text-purple-400">
                        Evidentiary Handoff (RA 7160)
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-col gap-3 text-xs">
                    {inspectedDispute.status === "escalated_lupon" && inspectedDispute.luponDetails ? (
                      /* Active Referral State */
                      <div className="flex flex-col gap-2.5">
                        <div className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/10 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground text-xs">
                              {inspectedDispute.luponDetails.barangay} Hall
                            </span>
                            <Badge className="bg-purple-600 text-white font-mono text-[9.5px]">
                              {inspectedDispute.luponDetails.docketNumber}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-purple-300 font-mono">
                            {inspectedDispute.luponDetails.statutoryDeadline}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                          <span>Jurisdiction: <strong>Tagudin, Ilocos Sur</strong></span>
                          <span>Referred To: <strong>{inspectedDispute.luponDetails.officerInCharge}</strong></span>
                          {inspectedDispute.luponDetails.physicalCabinetRef && (
                            <span>Physical File Code: <strong className="font-mono text-foreground">{inspectedDispute.luponDetails.physicalCabinetRef}</strong></span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 pt-2 border-t border-purple-500/20">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-8 gap-1.5 border-purple-500/40 text-purple-400 hover:bg-purple-500/10 cursor-pointer"
                            onClick={() => {
                              setDocketPrintRecord(inspectedDispute)
                              setDocketPacketTab("letter")
                              setIsDocketLetterOpen(true)
                            }}
                          >
                            <Printer className="size-3.5" />
                            <span>Print Full Handoff Packet (For Kapitan)</span>
                          </Button>

                          <Button
                            size="sm"
                            className="w-full text-xs h-8 gap-1.5 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                            onClick={() => setIsRecordOutcomeOpen(true)}
                          >
                            <FolderArchive className="size-3.5" />
                            <span>Log Document Returned from Barangay Hall</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Not Yet Escalated State */
                      <div className="flex flex-col gap-2.5">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          When online mediation reaches an impasse, the platform compiles an official certified evidentiary packet for the Punong Barangay (Kapitan) under RA 7160.
                        </p>

                        <div className="p-2.5 rounded-lg border border-border bg-card/60 flex flex-col gap-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Complainant Residence:</span>
                            <span className="font-semibold text-foreground">{inspectedDispute.claimant.barangay}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Respondent Residence:</span>
                            <span className="font-semibold text-foreground">{inspectedDispute.respondent.barangay}</span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="w-full text-xs h-8 gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium cursor-pointer mt-1"
                          onClick={() => {
                            setTargetBarangay(inspectedDispute.respondent.barangay || TAGUDIN_BARANGAYS[0])
                            setIsLuponReferralOpen(true)
                          }}
                        >
                          <FileText className="size-3.5" />
                          <span>Prepare Handoff Packet for Kapitan</span>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Evidence Photos Thumbnail Card */}
                {inspectedDispute.evidencePhotos && inspectedDispute.evidencePhotos.length > 0 && (
                  <Card className="border-border bg-card shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-border flex flex-row items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Evidence Proofs ({inspectedDispute.evidencePhotos.length})
                      </CardTitle>
                      <Badge variant="outline" className="text-[9px]">Sealed</Badge>
                    </CardHeader>
                    <CardContent className="p-4 flex gap-2 overflow-x-auto">
                      {inspectedDispute.evidencePhotos.map((p, i) => (
                        <div key={i} className="size-20 rounded-lg border border-border overflow-hidden shrink-0 shadow-2xs relative group">
                          <img src={p.url} alt={p.label} className="size-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/75 p-1 text-[8.5px] text-white truncate font-mono">
                            {p.time}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ===================================================================
               VIEW 2: SCAN-FIRST MASTER DISPUTES & HOLDS TABLE
               =================================================================== */
          <div className="flex flex-col gap-6">
            {/* Header Overview */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  Disputes &amp; Administrative Holds
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bilateral commercial mediation desk, surgical payment holds, and formal Barangay Lupon Tagapamayapa referrals.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs border-amber-500/30 text-amber-500 bg-amber-500/5 px-2.5 py-1">
                  Tagudin Municipal Pilot
                </Badge>
              </div>
            </div>

            {/* Success Banner */}
            {luponSuccessBanner && (
              <Alert className="border-purple-500/30 bg-purple-500/10 text-purple-400">
                <Landmark className="size-4 text-purple-400 shrink-0" />
                <div className="flex items-center justify-between w-full">
                  <div>
                    <AlertTitle className="text-xs font-bold text-foreground">
                      Barangay Hall Action Recorded
                    </AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                      {luponSuccessBanner}
                    </AlertDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setLuponSuccessBanner(null)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </Alert>
            )}

            {/* 4 Graphic KPI Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AdminMetricCard
                title="Active Dispute Claims"
                value={disputes.filter((d) => d.status === "open" || d.status === "evaluating").length.toString().padStart(2, "0")}
                statusBeacon="danger"
                accentColor="#ef4444"
                badgeText="Bilateral Contests"
                subtext="Under active platform mediation"
              />

              <AdminMetricCard
                title="Surgical Holds Placed"
                value={disputes.filter((d) => d.hasActiveHold).length.toString().padStart(2, "0")}
                statusBeacon="warning"
                accentColor="#f59e0b"
                badgeText="Quarantined"
                subtext="Work advances independently"
              />

              <AdminMetricCard
                title="Barangay Referrals"
                value={luponCount.toString().padStart(2, "0")}
                statusBeacon="purple"
                accentColor="#a855f7"
                badgeText="RA 7160 Handoff"
                subtext="Packet released to Barangay Hall"
              />

              <AdminMetricCard
                title="Settled &amp; Archived"
                value={disputes.filter((d) => d.status === "resolved").length.toString().padStart(2, "0")}
                statusBeacon="live"
                accentColor="#10b981"
                badgeText="Resolved"
                subtext="Amicable accord or court certificate"
              />
            </div>

            {/* Scalable Filter & Search Toolbar */}
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="p-4 pb-3 border-b border-border flex flex-col gap-3">
                {/* Quick Status Tabs */}
                <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-1 text-xs font-medium overflow-x-auto max-w-full">
                  {[
                    { id: "all", label: `All (${disputes.length})` },
                    { id: "holds", label: `Holds (${disputes.filter((d) => d.hasActiveHold).length})` },
                    { id: "cash", label: "Cash Mismatch" },
                    { id: "evaluating", label: "Evaluating" },
                    { id: "lupon", label: `Barangay Referrals (${luponCount})` },
                    { id: "resolved", label: "Resolved" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusTab(tab.id)}
                      className={`rounded-md px-3 py-1 text-xs transition-all whitespace-nowrap cursor-pointer ${
                        statusTab === tab.id
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Single Fast Search Bar */}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search disputes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-9 text-xs bg-muted/20 border-border text-foreground w-full font-mono"
                  />
                </div>
              </CardHeader>

              {/* Informative Banner on Lupon Tab */}
              {statusTab === "lupon" && (
                <div className="p-3 bg-purple-500/5 border-b border-purple-500/20 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-300">
                    <Landmark className="size-4 shrink-0 text-purple-400" />
                    <span>
                      <strong>Barangay Lupon Tagapamayapa Handoff Track (RA 7160):</strong> Disputes where online mediation reached an impasse are compiled into certified packets for the Punong Barangay (Kapitan). When the parties return with signed paper documents, log them below to clear holds.
                    </span>
                  </div>
                </div>
              )}

              {/* Clean Scan-First Table */}
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/20 text-xs">
                      <TableHead className="w-10 text-center">
                        <Checkbox
                          checked={isAllPageSelected ? true : isSomePageSelected ? "indeterminate" : false}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const newIds = Array.from(new Set([...selectedIds, ...paginatedDisputes.map((d) => d.id)]))
                              setSelectedIds(newIds)
                            } else {
                              const pageIds = new Set(paginatedDisputes.map((d) => d.id))
                              setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)))
                            }
                          }}
                          aria-label="Select all disputes"
                        />
                      </TableHead>
                      <TableHead className="w-36">Docket &amp; Ticket</TableHead>
                      <TableHead className="w-64">Commercial Context</TableHead>
                      <TableHead className="w-52">Contesting Parties</TableHead>
                      <TableHead className="w-36">Disputed Sum &amp; Lane</TableHead>
                      <TableHead className="w-44">Resolution Track</TableHead>
                      <TableHead className="text-right w-36">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDisputes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                          No disputes match your filter criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedDisputes.map((item) => {
                        const isSelected = selectedIds.includes(item.id)
                        const isLupon = item.status === "escalated_lupon"

                        return (
                          <TableRow
                            key={item.id}
                            className={`transition-colors cursor-pointer group text-xs ${
                              isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                            }`}
                            onClick={() => setInspectedDispute(item)}
                          >
                            <TableCell className="w-10 text-center" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedIds([...selectedIds, item.id])
                                  } else {
                                    setSelectedIds(selectedIds.filter((id) => id !== item.id))
                                  }
                                }}
                                aria-label={`Select dispute ${item.reference}`}
                              />
                            </TableCell>

                            {/* Docket & Ticket */}
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-xs text-rose-500 group-hover:underline">
                                  {item.reference}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {item.ticketNumber}
                                </span>
                                {item.luponDetails && (
                                  <span className="font-mono text-[9.5px] text-purple-400 font-semibold">
                                    {item.luponDetails.docketNumber}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Commercial Context */}
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-foreground text-xs line-clamp-1">
                                  {item.listingTitle}
                                </span>
                                <span className="text-[11px] text-muted-foreground line-clamp-1">
                                  {item.disputeType}
                                </span>
                              </div>
                            </TableCell>

                            {/* Contesting Parties */}
                            <TableCell>
                              <div className="flex flex-col text-[11px] leading-tight">
                                <span className="font-medium text-foreground">
                                  {item.claimant.name} <span className="text-[10px] text-muted-foreground">({item.claimant.barangay.replace("Barangay ", "")})</span>
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  vs {item.respondent.name} <span className="text-[9.5px]">({item.respondent.barangay.replace("Barangay ", "")})</span>
                                </span>
                              </div>
                            </TableCell>

                            {/* Disputed Sum */}
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-foreground">
                                  ₱{(item.amountMinor / 100).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-muted-foreground capitalize">
                                  {item.paymentLane === "cash" ? "External Cash" : "Digital Escrow"}
                                </span>
                              </div>
                            </TableCell>

                            {/* Resolution Track */}
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {getStatusBadge(item.status)}
                                {item.hasActiveHold && (
                                  <span className="font-mono text-[9.5px] text-amber-500 font-semibold">
                                    Hold on {item.obligationRef}
                                  </span>
                                )}
                                {item.luponDetails && (
                                  <span className="text-[10px] text-purple-300 truncate">
                                    {item.luponDetails.barangay} Hall
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {isLupon ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs px-2 border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
                                    onClick={() => {
                                      setDocketPrintRecord(item)
                                      setDocketPacketTab("letter")
                                      setIsDocketLetterOpen(true)
                                    }}
                                  >
                                    <Printer className="size-3 mr-1" />
                                    <span>Print Packet</span>
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs px-2"
                                    onClick={() => setInspectedDispute(item)}
                                  >
                                    <span>Mediate</span>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
                <div>
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-foreground">
                    {Math.min(currentPage * pageSize, totalItems)}
                  </span>{" "}
                  of <span className="font-semibold text-foreground">{totalItems}</span> disputes
                </div>

                {totalPages > 1 && (
                  <Pagination className="w-auto mx-0">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={currentPage === i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ===================================================================
           PREPARE HANDOFF PACKET MODAL (Platform Evidence Compilation for Kapitan)
           =================================================================== */}
      <Dialog open={isLuponReferralOpen} onOpenChange={setIsLuponReferralOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Landmark className="size-4 text-purple-400" />
              <span>Prepare Barangay Handoff Packet (For Kapitan)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Compiles transaction records and tamper-evident evidence into an official case dossier for the Punong Barangay under RA 7160.
            </DialogDescription>
          </DialogHeader>

          {inspectedDispute && (
            <div className="flex flex-col gap-4 py-2 text-xs">
              {/* Jurisdiction Check Box */}
              <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold text-purple-400">Jurisdiction &amp; Residence Analysis</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Complainant:</span>
                    <p className="font-semibold text-foreground">{inspectedDispute.claimant.name}</p>
                    <span className="text-[10px] text-muted-foreground font-mono">{inspectedDispute.claimant.barangay}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Respondent:</span>
                    <p className="font-semibold text-foreground">{inspectedDispute.respondent.name}</p>
                    <span className="text-[10px] text-muted-foreground font-mono">{inspectedDispute.respondent.barangay}</span>
                  </div>
                </div>
              </div>

              {/* Receiving Barangay Select */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="target-barangay" className="font-semibold text-foreground text-xs">
                  Receiving Barangay Hall (Where Conciliation Takes Place)
                </Label>
                <Select value={targetBarangay} onValueChange={setTargetBarangay}>
                  <SelectTrigger id="target-barangay" className="text-xs bg-muted/20 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAGUDIN_BARANGAYS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b} Hall (Hon. Punong Barangay)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground">
                  Per RA 7160 Sec. 408, disputes between residents of different barangays in the same municipality are heard at the respondent's barangay.
                </span>
              </div>

              {/* Grounds Select */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="referral-grounds" className="font-semibold text-foreground text-xs">
                  Primary Ground for Legal Handoff
                </Label>
                <Select value={luponGrounds} onValueChange={setLuponGrounds}>
                  <SelectTrigger id="referral-grounds" className="text-xs bg-muted/20 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_mismatch">Contested Cash Handover (Zero Platform Custody)</SelectItem>
                    <SelectItem value="quality_breach">Physical Work Quality / Scope Breach</SelectItem>
                    <SelectItem value="impasse">Mediation Impasse (Parties Refuse Online Accord)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mediator Notes */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mediator-notes" className="font-semibold text-foreground text-xs">
                  Municipal Desk Findings (Addressed to Kapitan)
                </Label>
                <Textarea
                  id="mediator-notes"
                  placeholder="Summarize transaction facts and online mediation results for the Kapitan..."
                  value={luponNotes}
                  onChange={(e) => setLuponNotes(e.target.value)}
                  className="text-xs min-h-[75px] bg-muted/20 border-border text-foreground font-mono"
                />
              </div>

              {/* SMS Dispatch Checkbox */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Checkbox
                  id="dispatch-sms"
                  checked={dispatchSms}
                  onCheckedChange={(c) => setDispatchSms(Boolean(c))}
                />
                <Label htmlFor="dispatch-sms" className="text-xs cursor-pointer font-normal text-muted-foreground">
                  Dispatch official SMS advisory notifying citizens that their case dossier has been prepared for the Barangay Hall.
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setIsLuponReferralOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white font-medium cursor-pointer"
              disabled={isSubmittingLupon}
              onClick={handleConfirmLuponReferral}
            >
              {isSubmittingLupon ? (
                <>
                  <RotateCw className="size-3.5 mr-1.5 animate-spin" />
                  <span>Compiling Handoff Packet...</span>
                </>
              ) : (
                <>
                  <FileText className="size-3.5 mr-1.5" />
                  <span>Generate Handoff Packet</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================================
           OFFICIAL PRINTABLE HANDOFF PACKET (Letter to Kapitan + Exhibits + Kasunduan Template)
           =================================================================== */}
      <Dialog open={isDocketLetterOpen} onOpenChange={setIsDocketLetterOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {docketPrintRecord && (
            <div className="flex flex-col gap-4 text-xs font-sans">
              {/* Document Sub-Tabs */}
              <div className="flex items-center justify-between border-b border-border pb-2 pt-1">
                <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setDocketPacketTab("letter")}
                    className={`rounded-md px-2.5 py-1 text-xs transition-all cursor-pointer ${
                      docketPacketTab === "letter"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    1. Letter to Kapitan
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocketPacketTab("exhibits")}
                    className={`rounded-md px-2.5 py-1 text-xs transition-all cursor-pointer ${
                      docketPacketTab === "exhibits"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    2. Evidence Exhibits ({docketPrintRecord.evidencePhotos?.length ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocketPacketTab("kasunduan")}
                    className={`rounded-md px-2.5 py-1 text-xs transition-all cursor-pointer ${
                      docketPacketTab === "kasunduan"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    3. Kasunduan Worksheet
                  </button>
                </div>

                <Button
                  size="sm"
                  className="text-xs h-7 bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5 cursor-pointer shrink-0"
                  onClick={() => window.print()}
                >
                  <Printer className="size-3" />
                  <span>Print Document</span>
                </Button>
              </div>

              {/* -------------------------------------------------------------
                   SECTION 1: TRANSMITTAL LETTER TO PUNONG BARANGAY (KAPITAN)
                   ------------------------------------------------------------- */}
              {docketPacketTab === "letter" && (
                <div className="flex flex-col gap-4 p-4 border rounded-xl bg-card shadow-2xs">
                  {/* Official LGU Header */}
                  <div className="text-center border-b border-border pb-3 flex flex-col items-center gap-0.5">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Republic of the Philippines</span>
                    <span className="text-[11px] font-bold text-foreground">Province of Ilocos Sur · Municipality of Tagudin</span>
                    <span className="text-sm font-bold text-primary uppercase tracking-wide mt-1">
                      Serbizyu Municipal Desk · Official Transmittal
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      In Cooperation with the Katarungang Pambarangay System (RA 7160)
                    </span>
                  </div>

                  <div className="flex justify-between items-start text-[11px]">
                    <div>
                      <p><strong>PETSA:</strong> {docketPrintRecord.luponDetails?.referralDate ?? "2026-09-17"}</p>
                      <p><strong>PARA KAY:</strong> Punong Barangay (Barangay Captain) &amp; Lupon Members</p>
                      <p><strong>TANGGAPAN:</strong> {docketPrintRecord.luponDetails?.barangay ?? "Barangay Farola"} Hall, Tagudin, Ilocos Sur</p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="text-muted-foreground">DOCKET CODE:</p>
                      <p className="font-bold text-foreground text-sm">{docketPrintRecord.luponDetails?.docketNumber ?? "KP-2026-TAG-082"}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-muted/10 flex flex-col gap-1 text-[11.5px] leading-relaxed">
                    <p><strong>Gg. Punong Barangay:</strong></p>
                    <p>
                      Ipinagkakaloob ng Serbizyu Municipal Desk ang opisyal na talaan at dokumentong nauukol sa hindi pagkakaunawaan ng ating mga kababayan:
                    </p>
                    <div className="grid grid-cols-2 gap-2 my-1 p-2 border rounded bg-background">
                      <div>
                        <strong>NAGREREKLAMO:</strong> {docketPrintRecord.claimant.name} ({docketPrintRecord.claimant.barangay})
                      </div>
                      <div>
                        <strong>INIREREKLAMO:</strong> {docketPrintRecord.respondent.name} ({docketPrintRecord.respondent.barangay})
                      </div>
                    </div>
                    <p>
                      <strong>PAKSA:</strong> {docketPrintRecord.listingTitle} (Order #{docketPrintRecord.orderRef}, Halaga: ₱{(docketPrintRecord.amountMinor / 100).toFixed(2)}).
                    </p>
                    <p>
                      Dahil hindi nagkasundo ang mga partido sa online mediation kaugnay sa bayarang cash sa mismong lugar ng trabaho, pormal pong inieendorso ang usaping ito sa inyong Tanggapan para sa nararapat na pagdinig sa ilalim ng <em>Katarungang Pambarangay (Republic Act 7160)</em>. Kalakip po sa ibaba ang sertipikadong ebidensya at blangkong pormularyo ng Kasunduan.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border flex justify-between items-center text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Certified by Evidentiary Custodian:</p>
                      <p className="font-bold text-foreground font-mono">OFFICER SANTOS (Municipal Desk Supervisor)</p>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 font-mono text-[10px]">
                      VERIFIED FACTUAL RECORD
                    </Badge>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                   SECTION 2: CERTIFIED EVIDENTIARY EXHIBITS
                   ------------------------------------------------------------- */}
              {docketPacketTab === "exhibits" && (
                <div className="flex flex-col gap-4 p-4 border rounded-xl bg-card shadow-2xs">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                      Certified Evidentiary Exhibit Index (Tamper-Evident SHA-256)
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      The following documents and photographs are certified true copies extracted from immutable server logs.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-muted/30 border-b border-border text-left">
                        <tr>
                          <th className="p-2">Exhibit Name</th>
                          <th className="p-2">Timestamp</th>
                          <th className="p-2 font-mono text-right">Integrity Hash</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docketPrintRecord.evidencePhotos?.map((ev, idx) => (
                          <tr key={idx} className="border-b border-border/40">
                            <td className="p-2 font-medium">{ev.label}</td>
                            <td className="p-2 font-mono text-muted-foreground">{ev.time}</td>
                            <td className="p-2 font-mono text-right text-[10px] text-primary">{ev.hash ?? "sha256:8f4c71a9b20e"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {docketPrintRecord.evidencePhotos?.map((p, idx) => (
                      <div key={idx} className="border rounded-lg overflow-hidden bg-muted/10 flex flex-col gap-1 p-2">
                        <div className="h-28 w-full rounded overflow-hidden bg-black/40">
                          <img src={p.url} alt={p.label} className="h-full w-full object-cover" />
                        </div>
                        <span className="font-medium text-[10.5px] truncate">{p.label}</span>
                        <span className="text-[9.5px] font-mono text-muted-foreground">{p.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                   SECTION 3: PRE-FORMATTED KASUNDUAN SA PAG-AAYOS WORKSHEET
                   ------------------------------------------------------------- */}
              {docketPacketTab === "kasunduan" && (
                <div className="flex flex-col gap-4 p-5 border rounded-xl bg-card shadow-2xs">
                  <div className="text-center border-b border-border pb-3 flex flex-col items-center gap-0.5">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Katarungang Pambarangay Form</span>
                    <span className="text-sm font-bold text-primary uppercase tracking-wide">
                      Kasunduan sa Pag-aayos (Amicable Settlement)
                    </span>
                    <span className="text-[10.5px] text-muted-foreground">
                      Barangay {docketPrintRecord.luponDetails?.barangay.replace("Barangay ", "")}, Tagudin, Ilocos Sur
                    </span>
                  </div>

                  <p className="text-[11.5px] leading-relaxed text-foreground">
                    Kami, ang nagrereklamo na si <strong>{docketPrintRecord.claimant.name}</strong> at ang inirereklamo na si <strong>{docketPrintRecord.respondent.name}</strong>, sa pamamagitan ng pamamagitan ng Punong Barangay / Pangkat ng Tagapagkasundo, ay malayang nagkasundo na tapusin ang aming alitan ukol sa transaksyon #{docketPrintRecord.orderRef} sa pamamagitan ng mga sumusunod:
                  </p>

                  {/* Pen Lines for Kapitan and Parties to Fill Out */}
                  <div className="p-4 border-2 border-dashed border-border rounded-xl bg-muted/5 flex flex-col gap-3 my-1">
                    <div className="text-[10.5px] font-semibold text-muted-foreground uppercase">
                      Mga Napagkasunduang Kondisyon (Isulat ng kamay sa Barangay Hall):
                    </div>
                    <div className="h-4 border-b border-muted-foreground/40"></div>
                    <div className="h-4 border-b border-muted-foreground/40"></div>
                    <div className="h-4 border-b border-muted-foreground/40"></div>
                  </div>

                  <p className="text-[10.5px] text-muted-foreground italic leading-relaxed">
                    Ang kasunduang ito ay may bisa at lakas ng pinal na hatol ng hukuman matapos ang sampung (10) araw mula sa petsa ng paglagda, alinsunod sa Section 416 ng Republic Act No. 7160.
                  </p>

                  {/* Physical Signature Blocks */}
                  <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <div className="w-full border-b border-foreground/60 h-6"></div>
                      <span className="font-bold text-xs">{docketPrintRecord.claimant.name}</span>
                      <span className="text-[10px] text-muted-foreground">Lagda ng Nagrereklamo</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 text-center">
                      <div className="w-full border-b border-foreground/60 h-6"></div>
                      <span className="font-bold text-xs">{docketPrintRecord.respondent.name}</span>
                      <span className="text-[10px] text-muted-foreground">Lagda ng Inirereklamo</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1 text-center pt-4 mt-2 border-t border-border">
                    <div className="w-64 border-b border-foreground/60 h-6"></div>
                    <span className="font-bold text-xs">HON. PUNONG BARANGAY / LUPON CHAIRMAN</span>
                    <span className="text-[10px] text-muted-foreground">Pinatunayan sa harap ng Punong Barangay</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setIsDocketLetterOpen(false)}
                >
                  Close Packet
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===================================================================
           LOG PAPERWORK RETURNED FROM BARANGAY HALL MODAL
           =================================================================== */}
      <Dialog open={isRecordOutcomeOpen} onOpenChange={setIsRecordOutcomeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderArchive className="size-4 text-purple-400" />
              <span>Log Document Returned from Barangay Hall</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record the physical paper resolution presented by citizen or LGU courier to release the surgical hold.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2 text-xs">
            {/* Outcome Selection */}
            <div className="flex flex-col gap-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Physical Document Presented
              </Label>
              <div className="grid grid-cols-1 gap-2">
                <div
                  onClick={() => setOutcomeType("amicable_settlement")}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                    outcomeType === "amicable_settlement"
                      ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                      : "border-border bg-card/60 hover:bg-muted/30"
                  }`}
                >
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground">Signed Kasunduan (Amicable Settlement)</span>
                    <span className="text-[11px] text-muted-foreground">
                      Physical paper signed by both parties and attested by the Kapitan. Releases hold on obligation.
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setOutcomeType("certificate_issued")}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                    outcomeType === "certificate_issued"
                      ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500"
                      : "border-border bg-card/60 hover:bg-muted/30"
                  }`}
                >
                  <FileText className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground">Katibayan Upang Makadulog sa Hukuman</span>
                    <span className="text-[11px] text-muted-foreground">
                      Certificate to File Action issued by Barangay after 15 days. Certified for Small Claims Court.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Presiding Officer */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="presiding-officer" className="font-semibold text-foreground text-xs">
                Punong Barangay / Signatory on Paper
              </Label>
              <Input
                id="presiding-officer"
                value={outcomeOfficer}
                onChange={(e) => setOutcomeOfficer(e.target.value)}
                placeholder="e.g. Hon. Danilo Ramos (Punong Barangay)"
                className="text-xs h-8 bg-muted/20 border-border text-foreground"
              />
            </div>

            {/* Physical Cabinet Reference */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cabinet-code" className="font-semibold text-foreground text-xs">
                Municipal Cabinet / Physical Archive Code
              </Label>
              <Input
                id="cabinet-code"
                value={cabinetFilingCode}
                onChange={(e) => setCabinetFilingCode(e.target.value)}
                placeholder="e.g. CAB-2026-TAG-B04"
                className="text-xs h-8 bg-muted/20 border-border text-foreground font-mono"
              />
              <span className="text-[10px] text-muted-foreground">
                Location of physical paper copy in the Tagudin municipal archive drawer.
              </span>
            </div>

            {/* Terms / Settlement Notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="outcome-terms" className="font-semibold text-foreground text-xs">
                Settlement Terms Written on Paper
              </Label>
              <Textarea
                id="outcome-terms"
                placeholder="e.g. Buyer paid ₱45, provider waived ₱45 balance as attested on signed Kasunduan..."
                value={outcomeTerms}
                onChange={(e) => setOutcomeTerms(e.target.value)}
                className="text-xs min-h-[70px] bg-muted/20 border-border text-foreground font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setIsRecordOutcomeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white font-medium cursor-pointer"
              disabled={isSubmittingOutcome}
              onClick={handleConfirmRecordOutcome}
            >
              {isSubmittingOutcome ? (
                <>
                  <RotateCw className="size-3.5 mr-1.5 animate-spin" />
                  <span>Filing Paper Record...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5 mr-1.5" />
                  <span>Save &amp; Update Obligation</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================================
           CONCRETE ESCROW & HOLD SETTLEMENT MODAL (Where the Money Goes!)
           =================================================================== */}
      <Dialog open={isSettlementOpen} onOpenChange={setIsSettlementOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Scale className="size-4 text-primary" />
              <span>Escrow &amp; Hold Settlement Resolution</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the financial destination for held obligation <strong>{inspectedDispute?.obligationRef}</strong> (Sum: ₱{((inspectedDispute?.amountMinor ?? 0) / 100).toFixed(2)}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExecuteSettlement} className="flex flex-col gap-4 py-2 text-xs">
            <div className="flex flex-col gap-2">
              <Label className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                Settlement Outcome &amp; Ledger Action
              </Label>

              <div className="grid grid-cols-1 gap-2">
                <div
                  onClick={() => setSettlementMode("cash_reconciled")}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                    settlementMode === "cash_reconciled"
                      ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                      : "border-border bg-card/60 hover:bg-muted/30"
                  }`}
                >
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground">Cash Handover Reconciled</span>
                    <span className="text-[11px] text-muted-foreground">
                      Provider confirms physical cash was located or received. Obligation restored to mutually acknowledged.
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setSettlementMode("split_settlement")}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                    settlementMode === "split_settlement"
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card/60 hover:bg-muted/30"
                  }`}
                >
                  <Split className="size-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground">Compromise Split Settlement</span>
                    <span className="text-[11px] text-muted-foreground">
                      Parties agree to divide the contested balance proportionally.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Split Slider if split mode selected */}
            {settlementMode === "split_settlement" && (
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span>Provider Share: <strong>{splitProviderPct}%</strong> (₱{(((inspectedDispute?.amountMinor ?? 0) * splitProviderPct / 100) / 100).toFixed(2)})</span>
                  <span>Buyer Share: <strong>{100 - splitProviderPct}%</strong> (₱{(((inspectedDispute?.amountMinor ?? 0) * (100 - splitProviderPct) / 100) / 100).toFixed(2)})</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={splitProviderPct}
                  onChange={(e) => setSplitProviderPct(Number(e.target.value))}
                  className="w-full cursor-pointer accent-primary"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold text-foreground text-xs">
                Audited Settlement Note
              </Label>
              <Textarea
                placeholder="Reason justifying the ledger unfreeze..."
                value={settlementReason}
                onChange={(e) => setSettlementReason(e.target.value)}
                className="text-xs min-h-[70px] bg-muted/20 border-border text-foreground font-mono"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => setIsSettlementOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                disabled={settlementExecuted}
              >
                {settlementExecuted ? "Executing..." : "Execute Settlement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
