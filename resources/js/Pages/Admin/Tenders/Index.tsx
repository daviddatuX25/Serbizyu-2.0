import { Head } from "@inertiajs/react"
import * as React from "react"
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock,
  FileCheck2,
  Flag,
  Lock,
  MapPin,
  Radio,
  Search,
  Send,
  Users,
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
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AdminMetricCard } from "@/components/admin/GraphicMetrics"
import { FunnelAnalytics } from "@/components/admin/FunnelAnalytics"
import { AdminLayout } from "@/layouts/AdminLayout"

export interface TenderRecord {
  id: string
  reference: string
  title: string
  imageUrl: string
  tenderMode: "open_tender" | "sealed_tender" | "direct_invite"
  requester: { name: string; initials: string; barangay: string; phoneMasked: string }
  statement: string
  category: string
  workShape: "A1" | "A3" | "A4" | "A9"
  shapeTitle: string
  budgetMinor: number
  quotesCount: number
  providerViewsCount: number
  ttfqMinutes: number
  phase: "response_window" | "evaluation_window" | "awarded" | "expired"
  deadlineRemaining: string
  isBlinded: boolean
  urgency: string
  createdAt: string
  specs?: Array<{ k: string; v: string }>
  quotes?: Array<{
    providerName: string
    handle: string
    priceMinor: number
    leadTime: string
    status: "submitted" | "shortlisted" | "awarded" | "blinded"
  }>
}

const SAMPLE_TENDERS: TenderRecord[] = [
  {
    id: "tnd-1",
    reference: "REQ-2026-88",
    title: "Commercial 3-Chamber Septic Tank Desludging & Bio Treatment",
    imageUrl: "/photos/req-cement.jpg",
    tenderMode: "sealed_tender",
    requester: { name: "Bitalag Rice Processing", initials: "BR", barangay: "Bitalag", phoneMasked: "+63 917 *** 8811" },
    statement: "Main wastewater collection pit requires complete vacuum desludging, pressure wash, and bio-enzyme starter flush before quarterly audit.",
    category: "Sanitation & Waste",
    workShape: "A1",
    shapeTitle: "Linear Project",
    budgetMinor: 45000,
    quotesCount: 4,
    providerViewsCount: 48,
    ttfqMinutes: 24,
    phase: "evaluation_window",
    deadlineRemaining: "Reveal in 2h 15m",
    isBlinded: true,
    urgency: "Needed within 48h",
    createdAt: "2026-09-17 08:30",
    specs: [
      { k: "Capacity", v: "3 Chambers (approx 12,000L)" },
      { k: "Disposal Gate", v: "Licensed LGU Eco-Facility Slip" },
      { k: "Evidence Gate", v: "Dual Sign-off + Photo of Empty Chamber" },
    ],
    quotes: [
      { providerName: "Ilocos Bio-Waste Cleaners", handle: "@ilocos_clean", priceMinor: 42000, leadTime: "Tomorrow 8 AM", status: "blinded" },
      { providerName: "Northern Vacuum Tank Services", handle: "@north_vacuum", priceMinor: 45000, leadTime: "Today 2 PM", status: "blinded" },
      { providerName: "Sanitary Solutions Tagudin", handle: "@sanitary_tag", priceMinor: 39000, leadTime: "Tomorrow 10 AM", status: "blinded" },
    ],
  },
  {
    id: "tnd-2",
    reference: "REQ-2026-84",
    title: "Kitchen Sub-Breaker Tripping Diagnostic & 20A DIN Replacement",
    imageUrl: "/photos/req-electrician.jpg",
    tenderMode: "open_tender",
    requester: { name: "Aling Nena Dela Cruz", initials: "AN", barangay: "Poblacion", phoneMasked: "+63 918 *** 3344" },
    statement: "Kitchen sub-breaker trips when refrigerator compressor and rice cooker operate simultaneously. Need diagnostic and replacement 20A single-pole breaker.",
    category: "Home Electrical",
    workShape: "A1",
    shapeTitle: "Linear Project",
    budgetMinor: 4000,
    quotesCount: 5,
    providerViewsCount: 62,
    ttfqMinutes: 14,
    phase: "response_window",
    deadlineRemaining: "4h 20m left",
    isBlinded: false,
    urgency: "Needed Today · Afternoon",
    createdAt: "2026-09-17 10:15",
    specs: [
      { k: "Sub-panel Type", v: "DIN-rail modular utility box" },
      { k: "Breaker Rating", v: "20A Single Pole 230V" },
      { k: "Evidence Gate", v: "Photo of replaced breaker + Load Test" },
    ],
    quotes: [
      { providerName: "Arman Electric", handle: "@arman", priceMinor: 3800, leadTime: "Today 1:30 PM", status: "shortlisted" },
      { providerName: "Kuya Ben Electrical", handle: "@ben_pipes", priceMinor: 4200, leadTime: "Today 3:00 PM", status: "submitted" },
      { providerName: "Danilo Machining & Electric", handle: "@danilo_mach", priceMinor: 4000, leadTime: "Today 4:00 PM", status: "submitted" },
    ],
  },
  {
    id: "tnd-3",
    reference: "REQ-2026-79",
    title: "160 Sacks Wet Palay Mud Dike Extraction & Hauling Relay",
    imageUrl: "/photos/courier.jpg",
    tenderMode: "open_tender",
    requester: { name: "Mang Ernesto", initials: "ME", barangay: "Ambalayat", phoneMasked: "+63 920 *** 9876" },
    statement: "Rain expected tonight. Harvested 160 sacks of wet palay need immediate tractor-haul from paddy edge to solar drying floor.",
    category: "Agri Logistics",
    workShape: "A4",
    shapeTitle: "Physical Handoff",
    budgetMinor: 24000,
    quotesCount: 3,
    providerViewsCount: 35,
    ttfqMinutes: 18,
    phase: "awarded",
    deadlineRemaining: "Awarded to ORD-2026-02",
    isBlinded: false,
    urgency: "Emergency Same-Day",
    createdAt: "2026-09-15 07:00",
    specs: [
      { k: "Cargo Volume", v: "160 Sacks (approx 8,000 kg)" },
      { k: "Terrain", v: "Muddy feeder trail to barangay road" },
      { k: "Destination", v: "Tagudin Solar Drying Pavement" },
    ],
    quotes: [
      { providerName: "Bitalag Kuliglig Guild", handle: "@bitalag_haul", priceMinor: 24000, leadTime: "Immediate Dispatch", status: "awarded" },
    ],
  },
  {
    id: "tnd-4",
    reference: "REQ-2026-71",
    title: "Custom 3-Tier Fondant Wedding Cake with Sugar Flower Topper",
    imageUrl: "/photos/bibingka.jpg",
    tenderMode: "sealed_tender",
    requester: { name: "Carla Mendoza", initials: "CM", barangay: "Farola", phoneMasked: "+63 922 *** 5511" },
    statement: "Rustic gold & cream themed 3-tier wedding cake with edible sugar bougainvillea flowers. Needs refrigerated delivery to Farola seaside venue.",
    category: "Catering & Bakes",
    workShape: "A4",
    shapeTitle: "Physical Handoff",
    budgetMinor: 14000,
    quotesCount: 2,
    providerViewsCount: 28,
    ttfqMinutes: 45,
    phase: "response_window",
    deadlineRemaining: "1d 12h left",
    isBlinded: true,
    urgency: "Event Date: 2026-09-28",
    createdAt: "2026-09-16 14:00",
    specs: [
      { k: "Flavors", v: "Ube Macapuno, Red Velvet, Vanilla" },
      { k: "Tier Sizes", v: "12\" + 9\" + 6\" diameter" },
      { k: "Handoff", v: "Temperature controlled delivery" },
    ],
    quotes: [
      { providerName: "Tagudin Traditional Bakes", handle: "@ate_gina", priceMinor: 13500, leadTime: "Event Setup Morning", status: "blinded" },
    ],
  },
  {
    id: "tnd-5",
    reference: "REQ-2026-68",
    title: "Barangay Farola Multi-Purpose Gym Roof Gutter Welding",
    imageUrl: "/photos/req-cement.jpg",
    tenderMode: "open_tender",
    requester: { name: "Barangay Farola Council", initials: "BF", barangay: "Farola", phoneMasked: "+63 921 *** 2233" },
    statement: "Heavy monsoon winds loosened 12 meters of galvanized zinc roof guttering over the community stage. Need on-site arc welding and bracket reinforcement.",
    category: "Metalwork & Welding",
    workShape: "A1",
    shapeTitle: "Linear Project",
    budgetMinor: 18000,
    quotesCount: 0,
    providerViewsCount: 19,
    ttfqMinutes: 0,
    phase: "response_window",
    deadlineRemaining: "Aging 14h (0 Bids)",
    isBlinded: false,
    urgency: "Needed before rains",
    createdAt: "2026-09-17 06:00",
    specs: [
      { k: "Height", v: "6 meters (Scaffolding required)" },
      { k: "Material", v: "Ga 24 Galvanized Iron Gutter" },
      { k: "Safety", v: "Fall harness & safety clearance required" },
    ],
    quotes: [],
  },
  {
    id: "tnd-6",
    reference: "REQ-2026-65",
    title: "Split-Type Aircon 2.5HP Chemical Overhaul & Capacitor Check",
    imageUrl: "/photos/ac-clean.jpg",
    tenderMode: "direct_invite",
    requester: { name: "Dr. Ramos Dental Clinic", initials: "DR", barangay: "Poblacion", phoneMasked: "+63 919 *** 7788" },
    statement: "Direct RFQ sent to Rico Aircon and Arman Electric for full chemical overhaul of clinical surgery AC unit.",
    category: "Appliance Care",
    workShape: "A3",
    shapeTitle: "Appointment",
    budgetMinor: 8500,
    quotesCount: 2,
    providerViewsCount: 2,
    ttfqMinutes: 12,
    phase: "evaluation_window",
    deadlineRemaining: "Reviewing Quotes",
    isBlinded: false,
    urgency: "Clinic Schedule",
    createdAt: "2026-09-16 11:30",
    specs: [
      { k: "Unit Brand", v: "Carrier Inverter 2.5HP" },
      { k: "Service", v: "Chemical bath + Amperage log" },
    ],
    quotes: [
      { providerName: "Rico Aircon Services", handle: "@rico_hvac", priceMinor: 8500, leadTime: "Sunday 9 AM", status: "submitted" },
      { providerName: "Arman Electric", handle: "@arman", priceMinor: 8000, leadTime: "Saturday 5 PM", status: "shortlisted" },
    ],
  },
]

export default function TendersIndex() {
  const [tenders] = React.useState<TenderRecord[]>(SAMPLE_TENDERS)
  const [statusTab, setStatusTab] = React.useState<string>("all")
  const [selectedMode, setSelectedMode] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(6)
  const [selectedTender, setSelectedTender] = React.useState<TenderRecord | null>(null)
  const [inspectedTender, setInspectedTender] = React.useState<TenderRecord | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

  const [bulkAction, setBulkAction] = React.useState<{
    type: "extend_deadline" | "broadcast_sourcing" | "flag_audit"
    title: string
  } | null>(null)
  const [bulkReason, setBulkReason] = React.useState("")
  const [bulkExecuted, setBulkExecuted] = React.useState(false)

  // Filter computation
  const filteredTenders = React.useMemo(() => {
    return tenders.filter((item) => {
      // Tab filter
      if (statusTab === "open" && item.tenderMode !== "open_tender") return false
      if (statusTab === "sealed" && item.tenderMode !== "sealed_tender") return false
      if (statusTab === "active" && !["response_window", "evaluation_window"].includes(item.phase)) return false
      if (statusTab === "awarded" && item.phase !== "awarded") return false

      // Mode select
      if (selectedMode !== "all" && item.tenderMode !== selectedMode) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          item.reference.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.requester.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [tenders, statusTab, selectedMode, searchQuery])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [statusTab, selectedMode, searchQuery, pageSize])

  const totalItems = filteredTenders.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedTenders = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTenders.slice(start, start + pageSize)
  }, [filteredTenders, currentPage, pageSize])

  const isAllPageSelected =
    paginatedTenders.length > 0 && paginatedTenders.every((t) => selectedIds.includes(t.id))
  const isSomePageSelected =
    paginatedTenders.some((t) => selectedIds.includes(t.id)) && !isAllPageSelected

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case "open_tender":
        return (
          <Badge variant="outline" className="border-blue-500/40 text-blue-400 bg-blue-500/5 text-[10px] gap-1">
            <Radio className="size-2.5" />
            <span>Open Tender</span>
          </Badge>
        )
      case "sealed_tender":
        return (
          <Badge variant="outline" className="border-purple-500/40 text-purple-400 bg-purple-500/5 text-[10px] gap-1">
            <Lock className="size-2.5" />
            <span>Sealed Blinded</span>
          </Badge>
        )
      case "direct_invite":
        return (
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/5 text-[10px] gap-1">
            <Users className="size-2.5" />
            <span>Direct Invite</span>
          </Badge>
        )
      default:
        return <Badge variant="outline" className="text-[10px]">{mode}</Badge>
    }
  }

  const getPhaseBadge = (phase: string) => {
    switch (phase) {
      case "response_window":
        return <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 text-[10px]">Response Window</Badge>
      case "evaluation_window":
        return <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/5 text-[10px]">Evaluating Bids</Badge>
      case "awarded":
        return <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">Awarded</Badge>
      case "expired":
        return <Badge variant="outline" className="text-muted-foreground text-[10px]">Expired</Badge>
      default:
        return <Badge variant="outline" className="text-[10px]">{phase}</Badge>
    }
  }

  return (
    <AdminLayout
      currentSection="triage"
      title={inspectedTender ? `Tender Workspace #${inspectedTender.reference}` : "Buyer Requests & Sourcing Tenders"}
      breadcrumbs={
        inspectedTender
          ? [
              { label: "Operations", href: "/admin/triage" },
              { label: "Requests & Quotes", href: "/admin/tenders" },
              { label: `#${inspectedTender.reference}` },
            ]
          : undefined
      }
    >
      <Head title={inspectedTender ? `Tender #${inspectedTender.reference} — Serbizyu Admin` : "Buyer Requests & Quotes — Serbizyu Admin"} />

      {/* ===================================================================
           VIEW 1: IN-PLACE DEEP TENDER WORKSPACE (Stay on /admin/tenders!)
           =================================================================== */}
      {inspectedTender ? (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Top Return Bar */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-2 cursor-pointer border-border"
              onClick={() => setInspectedTender(null)}
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Requests Registry</span>
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">
                Urgency: <strong className="text-foreground">{inspectedTender.urgency}</strong>
              </span>
              <Badge variant="outline" className="text-[10px]">Tagudin Sourcing Engine</Badge>
            </div>
          </div>

          {/* Hero Job Site Photo Banner */}
          <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
            <div className="flex flex-col md:flex-row items-stretch">
              <div className="w-full md:w-72 h-52 md:h-auto shrink-0 relative bg-muted/30">
                <img
                  src={inspectedTender.imageUrl}
                  alt={inspectedTender.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  {getModeBadge(inspectedTender.tenderMode)}
                </div>
              </div>

              <div className="flex-1 p-5 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-primary">
                        #{inspectedTender.reference}
                      </span>
                      {getPhaseBadge(inspectedTender.phase)}
                      <Badge variant="outline" className="text-[10px] font-mono">{inspectedTender.category}</Badge>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Estimated Budget</span>
                      <span className="font-mono text-xl font-bold text-foreground">
                        ₱{(inspectedTender.budgetMinor / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <h1 className="font-heading text-lg font-bold text-foreground leading-snug">
                    {inspectedTender.title}
                  </h1>

                  {/* Citizen Statement Quote Box */}
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs leading-relaxed text-foreground italic mt-1">
                    "{inspectedTender.statement}"
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Requester</span>
                    <span className="font-semibold text-foreground">{inspectedTender.requester.name}</span>
                    <span className="text-[10.5px] text-muted-foreground block">{inspectedTender.requester.barangay}, Tagudin</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Bidding Mode</span>
                    <span className="font-semibold text-foreground capitalize">{inspectedTender.tenderMode.replace("_", " ")}</span>
                    <span className="text-[10.5px] text-muted-foreground block">
                      {inspectedTender.isBlinded ? "Competitor Bids Hidden" : "Public Counter-offers"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Sourcing Speed (TTFQ)</span>
                    <span className="font-semibold text-emerald-500 font-mono">
                      {inspectedTender.ttfqMinutes > 0 ? `${inspectedTender.ttfqMinutes} mins` : "Awaiting First Bid"}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground block">{inspectedTender.providerViewsCount} Provider Views</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Status Window</span>
                    <span className="font-semibold text-foreground font-mono">{inspectedTender.deadlineRemaining}</span>
                    <span className="text-[10.5px] text-muted-foreground block">{inspectedTender.quotesCount} Quotes Received</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Specifications Checklist */}
          {inspectedTender.specs && (
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <FileCheck2 className="size-4 text-primary" />
                  <span>Technical Deliverables &amp; Safety Requirements</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {inspectedTender.specs.map((spec, i) => (
                    <div key={i} className="p-2.5 rounded-lg border border-border bg-muted/10 flex flex-col gap-0.5 text-xs">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{spec.k}</span>
                      <span className="font-semibold text-foreground">{spec.v}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Side-by-Side Quote Comparison Matrix */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <span>Submitted Provider Quotes &amp; Proposals ({inspectedTender.quotes?.length ?? 0})</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Bids submitted by accredited providers in Tagudin under {inspectedTender.tenderMode.replace("_", " ")} rules.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Budget: ₱{(inspectedTender.budgetMinor / 100).toFixed(2)}
              </Badge>
            </CardHeader>
            <CardContent className="pt-4">
              {inspectedTender.quotes && inspectedTender.quotes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {inspectedTender.quotes.map((q, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-4 flex flex-col justify-between gap-3 text-xs ${
                        q.status === "awarded"
                          ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
                          : q.status === "shortlisted"
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-muted/10"
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground">{q.providerName}</span>
                            <span className="text-[10.5px] font-mono text-muted-foreground">{q.handle}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[9px] capitalize ${
                              q.status === "awarded"
                                ? "border-emerald-500/40 text-emerald-500 font-bold"
                                : q.status === "shortlisted"
                                ? "border-primary/40 text-primary"
                                : ""
                            }`}
                          >
                            {q.status}
                          </Badge>
                        </div>

                        <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                          <span className="text-[10.5px] text-muted-foreground">Proposed Bid:</span>
                          <span className="font-mono font-bold text-base text-foreground">
                            {q.status === "blinded" ? "₱ •••••• (Blinded)" : `₱${(q.priceMinor / 100).toFixed(2)}`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Dispatch Lead Time:</span>
                          <span className="font-medium text-foreground">{q.leadTime}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Compliance Status:</span>
                        <span className="text-emerald-500 font-semibold">Accredited ✓</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center flex flex-col items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-8 text-amber-500/60" />
                  <span className="font-medium text-foreground">Zero Quotes Submitted</span>
                  <p className="max-w-md text-[11px]">
                    This request has not yet received a provider bid. You can trigger an administrative <strong>Sourcing Push</strong> to notify accredited providers in adjacent barangays.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2 text-xs border-amber-500/40 text-amber-500 gap-1.5">
                    <Send className="size-3" />
                    <span>Broadcast Sourcing Push</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ===================================================================
             VIEW 2: SCAN-FIRST MASTER REQUESTS & TENDERS TABLE
             =================================================================== */
        <div className="flex flex-col gap-6">
          {/* Header Overview */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
                Requests &amp; Quotes
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Oversight of citizen service requests, reverse-bidding, and quotes.
              </p>
            </div>
          </div>

          {/* Macro Sourcing Telemetry Strip */}
          <div className="rounded-xl border border-border bg-card/60 p-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-emerald-500" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Speed to First Quote (TTFQ)</span>
                  <span className="font-semibold text-foreground">18 mins Median SLA <span className="text-emerald-500 font-mono text-[10px]">(Target &lt; 60m)</span></span>
                </div>
              </div>

              <Separator orientation="vertical" className="hidden sm:block h-6" />

              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Quote Coverage</span>
                <span className="font-semibold text-foreground">88% of Requests Quoted <span className="text-muted-foreground font-mono text-[10px]">(Target &ge; 80%)</span></span>
              </div>

              <Separator orientation="vertical" className="hidden sm:block h-6" />

              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Bidding Depth</span>
                <span className="font-semibold text-foreground">3.2 Quotes / Request</span>
              </div>
            </div>

            {/* Low Liquidity Sourcing Alert */}
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-500 text-xs shrink-0">
              <AlertCircle className="size-3.5 shrink-0" />
              <div className="flex items-center gap-1.5 font-medium">
                <span>Sourcing Alert:</span>
                <strong className="text-foreground">REQ-2026-68 aging 14h with 0 quotes</strong>
                <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-500">Farola Welding</Badge>
              </div>
            </div>
          </div>

          {/* 4 Graphic KPI Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminMetricCard
              title="Active Requests"
              value="06 Live"
              statusBeacon="live"
              accentColor="#10b981"
              trendData={[3, 4, 4, 5, 6, 6]}
              subtext="Open reverse-bidding and sealed tenders"
              badgeText="Tenders"
            />

            <AdminMetricCard
              title="Tender Modes Split"
              value="50% Open"
              statusBeacon="live"
              accentColor="#38bdf8"
              segments={[
                { label: "Open Bids", value: 3, colorClass: "bg-blue-500" },
                { label: "Sealed Blind", value: 2, colorClass: "bg-purple-500" },
                { label: "Direct RFQ", value: 1, colorClass: "bg-emerald-500" },
              ]}
              subtext="Confidentiality protocol distribution"
            />

            <AdminMetricCard
              title="Quotes Velocity"
              value="16 Bids"
              statusBeacon="live"
              accentColor="#a855f7"
              donutPct={80}
              subtext="Submitted across Tagudin accredited trades"
            />

            <AdminMetricCard
              title="Zero-Quote Alert"
              value="01 Task"
              statusBeacon="warning"
              accentColor="#f59e0b"
              subtext="Awaiting regional sourcing push"
            />
          </div>

          {/* Scalable Filter & Search Toolbar */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="p-4 pb-3 border-b border-border flex flex-col gap-3">
              {/* Top Toolbar: Status Tabs + Mode Filter */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                {/* Quick Status Tabs */}
                <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-1 text-xs font-medium overflow-x-auto max-w-full">
                  {[
                    { id: "all", label: `All (${tenders.length})` },
                    { id: "open", label: "Open (3)" },
                    { id: "sealed", label: "Sealed (2)" },
                    { id: "active", label: "Active (5)" },
                    { id: "awarded", label: "Awarded (1)" },
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

                {/* Tender Mode Select Filter */}
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={selectedMode} onValueChange={setSelectedMode}>
                    <SelectTrigger className="h-8 w-44 text-xs bg-muted/20 border-border text-foreground">
                      <SelectValue placeholder="Tender Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Tender Modes</SelectItem>
                      <SelectItem value="open_tender" className="text-xs">Open Public Bidding</SelectItem>
                      <SelectItem value="sealed_tender" className="text-xs">Sealed Blinded Tender</SelectItem>
                      <SelectItem value="direct_invite" className="text-xs">Direct Private RFQ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Single Fast Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-9 text-xs bg-muted/20 border-border text-foreground w-full font-mono"
                />
              </div>
            </CardHeader>

            {/* Clean Scan-First Table (6 Columns + Checkbox) */}
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/20 text-xs">
                    <TableHead className="w-10 text-center">
                      <Checkbox
                        checked={isAllPageSelected ? true : isSomePageSelected ? "indeterminate" : false}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const newIds = Array.from(new Set([...selectedIds, ...paginatedTenders.map((t) => t.id)]))
                            setSelectedIds(newIds)
                          } else {
                            const pageIds = new Set(paginatedTenders.map((t) => t.id))
                            setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)))
                          }
                        }}
                        aria-label="Select all requests on this page"
                      />
                    </TableHead>
                    <TableHead className="w-36">Request Reference</TableHead>
                    <TableHead className="w-72">Deliverable &amp; Scope</TableHead>
                    <TableHead className="w-48">Requester &amp; Location</TableHead>
                    <TableHead className="w-40">Mode &amp; Shape</TableHead>
                    <TableHead className="w-40">Budget &amp; Sourcing Speed</TableHead>
                    <TableHead className="w-32">Status Phase</TableHead>
                    <TableHead className="text-right w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTenders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                        No requests match your filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTenders.map((item) => {
                      const isSelected = selectedIds.includes(item.id)
                      return (
                        <TableRow
                          key={item.id}
                          className={`transition-colors cursor-pointer group ${
                            isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                          }`}
                          onClick={() => setSelectedTender(item)}
                        >
                          {/* Checkbox */}
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
                              aria-label={`Select request ${item.reference}`}
                            />
                          </TableCell>

                          {/* 1. Request Ref */}
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-xs text-primary group-hover:underline">
                                {item.reference}
                              </span>
                              <span className="text-[10.5px] text-muted-foreground font-mono">
                                {item.createdAt.split(" ")[0]}
                              </span>
                            </div>
                          </TableCell>

                          {/* 2. Deliverable, Photo & Scope */}
                          <TableCell>
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="size-11 rounded-lg object-cover border border-border shrink-0 shadow-2xs"
                              />
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span
                                  className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate max-w-[240px] block"
                                  title={item.title}
                                >
                                  {item.title}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                                  <span>{item.category}</span>
                                  <span>·</span>
                                  <span className="font-mono text-foreground font-medium">{item.urgency}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* 3. Requester & Location */}
                          <TableCell>
                            <div className="flex flex-col text-xs leading-snug">
                              <span className="font-semibold text-foreground truncate max-w-[160px]">
                                {item.requester.name}
                              </span>
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <MapPin className="size-2.5 text-primary shrink-0" />
                                <span className="truncate">{item.requester.barangay}, Tagudin</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* 4. Mode & Shape */}
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              {getModeBadge(item.tenderMode)}
                              <span className="text-[10px] font-mono text-muted-foreground">
                                Shape: {item.workShape} ({item.shapeTitle})
                              </span>
                            </div>
                          </TableCell>

                          {/* 5. Budget & Sourcing Telemetry */}
                          <TableCell>
                            <div className="flex flex-col text-xs gap-0.5">
                              <span className="font-mono font-bold text-foreground">
                                ₱{(item.budgetMinor / 100).toFixed(2)}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-muted-foreground">
                                <span>📥 {item.quotesCount} bids</span>
                                <span>·</span>
                                <span className={item.ttfqMinutes > 0 ? "text-emerald-500 font-semibold" : "text-amber-500 font-semibold"}>
                                  {item.ttfqMinutes > 0 ? `⏱️ ${item.ttfqMinutes}m` : "No bids"}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* 6. Status Phase */}
                          <TableCell>
                            <div className="flex flex-col gap-0.5 items-start">
                              {getPhaseBadge(item.phase)}
                              <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[130px]">
                                {item.deadlineRemaining}
                              </span>
                            </div>
                          </TableCell>

                          {/* 7. Action: Peek */}
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 gap-1 text-muted-foreground group-hover:text-foreground cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedTender(item)
                              }}
                            >
                              <span>Peek</span>
                              <ChevronRight className="size-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>

              {/* Standard Pagination Bar */}
              <div className="p-3 border-t border-border bg-card/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="text-muted-foreground">
                  Showing <strong className="text-foreground">{Math.min(1 + (currentPage - 1) * pageSize, totalItems)}</strong> to{" "}
                  <strong className="text-foreground">{Math.min(currentPage * pageSize, totalItems)}</strong> of{" "}
                  <strong className="text-foreground">{totalItems}</strong> sourcing requests
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <span>Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="h-7 rounded-md border border-border bg-muted/20 px-2 text-xs text-foreground cursor-pointer"
                    >
                      <option value={6}>6</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>

                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink
                            isActive={p === currentPage}
                            onClick={() => setCurrentPage(p)}
                          >
                            {p}
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Floating Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border border-primary/40 bg-card/95 px-4 py-2.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center gap-2 border-r border-border pr-3">
                <Badge variant="default" className="bg-primary text-primary-foreground font-mono text-xs px-2">
                  {selectedIds.length} Selected
                </Badge>
                <span className="text-xs text-muted-foreground hidden sm:inline">Requests</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 border-border hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    setBulkAction({
                      type: "extend_deadline",
                      title: "Extend Request Bidding Window Deadline",
                    })
                    setBulkReason("")
                    setBulkExecuted(false)
                  }}
                >
                  <Clock className="size-3.5 text-primary" />
                  <span>Extend Deadline</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 border-border hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    setBulkAction({
                      type: "broadcast_sourcing",
                      title: "Broadcast Sourcing Push to Adjacent Barangays",
                    })
                    setBulkReason("")
                    setBulkExecuted(false)
                  }}
                >
                  <Send className="size-3.5 text-blue-400" />
                  <span>Sourcing Push</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 border-border hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    setBulkAction({
                      type: "flag_audit",
                      title: "Flag for Anti-Collusion & Bid Price Audit",
                    })
                    setBulkReason("")
                    setBulkExecuted(false)
                  }}
                >
                  <Flag className="size-3.5 text-amber-500" />
                  <span>Flag for Audit</span>
                </Button>
              </div>

              <div className="border-l border-border pl-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => setSelectedIds([])}
                >
                  Deselect
                </Button>
              </div>
            </div>
          )}

          {/* Guarded Bulk Dialog */}
          <Dialog open={bulkAction !== null} onOpenChange={(open) => !open && setBulkAction(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Radio className="size-4 text-primary" />
                  <span>{bulkAction?.title}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Scope preview: <strong>{selectedIds.length} requests selected</strong> in Tagudin municipal sourcing.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3 py-2 text-xs">
                <div className="p-3 rounded-lg border border-border bg-muted/20 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Affected Sourcing Requests</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tenders
                      .filter((t) => selectedIds.includes(t.id))
                      .map((t) => (
                        <Badge key={t.id} variant="outline" className="font-mono text-[10px]">
                          {t.reference} ({t.category})
                        </Badge>
                      ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-foreground text-xs">
                    Reason for action
                  </label>
                  <Input
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                    placeholder="e.g. Sourcing liquidity push due to low quote response in Farola..."
                    className="text-xs h-8 bg-muted/20 border-border text-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Recorded in audit log.
                  </span>
                </div>

                {bulkExecuted && (
                  <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs flex items-center gap-2">
                    <Check className="size-4 shrink-0" />
                    <span>Batch sourcing command executed successfully in simulation log.</span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setBulkAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  disabled={!bulkReason.trim() || bulkExecuted}
                  onClick={() => {
                    setBulkExecuted(true)
                    setTimeout(() => {
                      setBulkAction(null)
                      setSelectedIds([])
                      setBulkExecuted(false)
                    }, 900)
                  }}
                >
                  {bulkExecuted ? "Executed ✓" : "Confirm Batch Action"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Quick Peek Drawer */}
          <Sheet open={!!selectedTender} onOpenChange={(open) => !open && setSelectedTender(null)}>
            <SheetContent side="right" className="sm:max-w-lg flex flex-col h-full overflow-hidden p-0">
              <SheetHeader>
                <div className="flex items-center justify-between pr-6">
                  <div className="flex items-center gap-2">
                    <Radio className="size-4 text-primary" />
                    <SheetTitle>Sourcing Request Peek</SheetTitle>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <Badge variant="outline">{selectedTender?.reference}</Badge>
                    {selectedTender && getModeBadge(selectedTender.tenderMode)}
                  </div>
                </div>
                <SheetDescription>
                  Quick operational preview of citizen request, bidding mode, and submitted quotes.
                </SheetDescription>
              </SheetHeader>

              {selectedTender && (
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 text-xs">
                  {/* Hero Job Photo */}
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border shadow-xs shrink-0 bg-muted/20">
                    <img
                      src={selectedTender.imageUrl}
                      alt={selectedTender.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getPhaseBadge(selectedTender.phase)}
                          <Badge variant="outline" className="text-[10px] font-mono bg-black/40 text-white border-white/20">
                            {selectedTender.urgency}
                          </Badge>
                        </div>
                        <span className="text-white font-mono font-bold text-base">
                          Est. ₱{(selectedTender.budgetMinor / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Citizen Statement */}
                  <div className="rounded-xl border border-border bg-muted/20 p-3.5 flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Citizen Request Statement</span>
                    <p className="text-xs text-foreground italic leading-relaxed">
                      "{selectedTender.statement}"
                    </p>
                    <div className="flex items-center justify-between text-[10.5px] text-muted-foreground pt-1.5 border-t border-border mt-1">
                      <span>Requester: <strong className="text-foreground">{selectedTender.requester.name}</strong></span>
                      <span>{selectedTender.requester.barangay}, Tagudin</span>
                    </div>
                  </div>

                  {/* Sourcing Funnel */}
                  <FunnelAnalytics
                    title="Sourcing Funnel"
                    description="Response velocity and provider bidding progression"
                    steps={[
                      { id: "s1", label: "Broadcast Reach (Local Providers)", value: 80, color: "bg-blue-600", subtext: "Active accredited providers in category" },
                      { id: "s2", label: "Provider Views (RFQ Opened)", value: selectedTender.providerViewsCount, color: "bg-blue-500", subtext: "Inspected job scope and site photos" },
                      { id: "s3", label: "Quotes Submitted", value: selectedTender.quotesCount, color: "bg-indigo-500", subtext: "Competitive proposals received" },
                      { id: "s4", label: "Agreement Formed", value: selectedTender.phase === "awarded" ? 1 : 0, color: "bg-emerald-600", subtext: "Locked bilateral order agreement" },
                    ]}
                    conversionBadgeText={selectedTender.ttfqMinutes > 0 ? `TTFQ: ${selectedTender.ttfqMinutes}m SLA` : "Pending First Bid"}
                  />

                  {/* Submitted Quotes Overview */}
                  <div className="rounded-xl border border-border bg-card p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                        <Users className="size-3 text-primary" />
                        <span>Submitted Quotes ({selectedTender.quotes?.length ?? 0})</span>
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {selectedTender.isBlinded ? "Blinded Confidential" : "Open Quotes"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {selectedTender.quotes && selectedTender.quotes.length > 0 ? (
                        selectedTender.quotes.map((q, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-border bg-muted/10 p-2.5 flex items-center justify-between text-xs"
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{q.providerName}</span>
                              <span className="text-[10.5px] text-muted-foreground">Lead: {q.leadTime}</span>
                            </div>
                            <span className="font-mono font-bold text-foreground">
                              {q.status === "blinded" ? "₱ ••••••" : `₱${(q.priceMinor / 100).toFixed(2)}`}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-amber-500 py-1">
                          Zero quotes received yet. Time to first quote SLA active.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sheet Footer: In-Place Workspace Trigger */}
              <SheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setSelectedTender(null)}
                >
                  Close Peek
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5 cursor-pointer"
                  onClick={() => {
                    if (selectedTender) {
                      const t = selectedTender
                      setSelectedTender(null)
                      setInspectedTender(t)
                    }
                  }}
                >
                  <span>Open Full Tender Workspace</span>
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </AdminLayout>
  )
}
