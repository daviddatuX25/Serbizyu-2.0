import { Head } from "@inertiajs/react"
import * as React from "react"
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Lock,
  RotateCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
  X,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import { AdminMetricCard } from "@/components/admin/GraphicMetrics"
import { AdminLayout } from "@/layouts/AdminLayout"

export interface IdentityReviewTask {
  id: string
  reference: string
  userId: string
  applicantName: string
  initials: string
  phoneMasked: string
  barangay: string
  role: "provider" | "agent" | "buyer"
  documentType: string
  documentClassification: "prc_board_license" | "tesda_nc2_certificate" | "dti_business_registration" | "lgu_barangay_clearance" | "lto_driver_license"
  classificationLabel: string
  documentNumberMasked: string
  imageUrl: string
  requestedCapability: string
  workShapeCode: "A1" | "A3" | "A4" | "A9"
  capabilityDescription: string
  toolChecklist: string[]
  expiryDate: string
  status: "pending_review" | "approved" | "needs_info" | "rejected"
  submittedAt: string
  checks: {
    issuerValid: boolean
    expiryValid: boolean
    nameMatches: boolean
    hologramSealIntact: boolean
  }
}

const SAMPLE_REVIEW_TASKS: IdentityReviewTask[] = [
  {
    id: "rev-01",
    reference: "ID-2026-42",
    userId: "usr-02",
    applicantName: "Arman Electric",
    initials: "AE",
    phoneMasked: "+63 918 *** 7890",
    barangay: "Poblacion, Tagudin",
    role: "provider",
    documentType: "PRC Professional Board License (Registered Master Electrician)",
    documentClassification: "prc_board_license",
    classificationLabel: "PRC Board License",
    documentNumberMasked: "PRC-0042***-E",
    imageUrl: "/photos/req-electrician.jpg",
    requestedCapability: "Residential Electrical Repairs & Wiring",
    workShapeCode: "A1",
    capabilityDescription: "Authorize provider to accept residential breaker replacements, electrical wiring, and capacitor replacements.",
    toolChecklist: ["1000V Insulated Screwdrivers", "Digital Multimeter / Capacitance Meter", "Safety Eyewear"],
    expiryDate: "2028-11-20",
    status: "approved",
    submittedAt: "2026-09-15 09:30 PHT",
    checks: {
      issuerValid: true,
      expiryValid: true,
      nameMatches: true,
      hologramSealIntact: true,
    },
  },
  {
    id: "rev-02",
    reference: "ID-2026-45",
    userId: "usr-05",
    applicantName: "Juan Carpentry Works",
    initials: "JC",
    phoneMasked: "+63 922 *** 9988",
    barangay: "Libtong, Tagudin",
    role: "provider",
    documentType: "DTI Certificate of Business Name Registration (BNR)",
    documentClassification: "dti_business_registration",
    classificationLabel: "DTI Business Registration",
    documentNumberMasked: "DTI-BNR-2026-091124-T",
    imageUrl: "/photos/req-cement.jpg",
    requestedCapability: "Custom Carpentry & Furniture Construction",
    workShapeCode: "A1",
    capabilityDescription: "Authorize workshop to accept bespoke timber furniture construction, commercial millwork, and onsite structural carpentry.",
    toolChecklist: ["Heavy-Duty Circular Saw", "Wood Thickness Planer", "Certified Clamping Jigs"],
    expiryDate: "2029-08-14",
    status: "pending_review",
    submittedAt: "2026-09-16 11:20 PHT",
    checks: {
      issuerValid: true,
      expiryValid: true,
      nameMatches: true,
      hologramSealIntact: true,
    },
  },
  {
    id: "rev-03",
    reference: "ID-2026-48",
    userId: "usr-09",
    applicantName: "Rico Aircon Services",
    initials: "RA",
    phoneMasked: "+63 927 *** 4400",
    barangay: "Ambalayat, Tagudin",
    role: "provider",
    documentType: "TESDA National Certificate II (RAC Servicing & Air-Conditioning)",
    documentClassification: "tesda_nc2_certificate",
    classificationLabel: "TESDA NC2 Certificate",
    documentNumberMasked: "TESDA-NC2-2026-8804",
    imageUrl: "/photos/ac-clean.jpg",
    requestedCapability: "Aircon Cleaning & Chemical Coil Overhaul",
    workShapeCode: "A3",
    capabilityDescription: "Authorize provider to handle chemical coils, R32/R410A refrigerant recovery, and multi-split HVAC diagnostics.",
    toolChecklist: ["High-Pressure Coil Washer", "Digital Manifold Gauge Set", "Refrigerant Recovery Machine"],
    expiryDate: "2027-05-30",
    status: "pending_review",
    submittedAt: "2026-09-17 08:15 PHT",
    checks: {
      issuerValid: true,
      expiryValid: true,
      nameMatches: true,
      hologramSealIntact: true,
    },
  },
  {
    id: "rev-04",
    reference: "ID-2026-38",
    userId: "usr-03",
    applicantName: "Elena Cruz (Tagudin Bakery)",
    initials: "EC",
    phoneMasked: "+63 920 *** 5544",
    barangay: "Farola, Tagudin",
    role: "provider",
    documentType: "Barangay Certificate of Residency & Sanitation Permit",
    documentClassification: "lgu_barangay_clearance",
    classificationLabel: "Barangay Sanitation Permit",
    documentNumberMasked: "LGU-TAG-FAROLA-2026-081",
    imageUrl: "/photos/bibingka.jpg",
    requestedCapability: "Commercial Food Handoff & Retail Delicacies",
    workShapeCode: "A4",
    capabilityDescription: "Authorize merchant for perishable food preparation, public meeting handoffs, and batch catering.",
    toolChecklist: ["Food-Grade Sealed Containers", "Thermal Insulated Carrier Bag"],
    expiryDate: "2026-10-15",
    status: "approved",
    submittedAt: "2026-09-08 14:00 PHT",
    checks: {
      issuerValid: true,
      expiryValid: true,
      nameMatches: true,
      hologramSealIntact: true,
    },
  },
  {
    id: "rev-05",
    reference: "ID-2026-51",
    userId: "usr-14",
    applicantName: "Clara Domestic Cleaning",
    initials: "CD",
    phoneMasked: "+63 919 *** 3321",
    barangay: "Purok West, Tagudin",
    role: "provider",
    documentType: "LGU Tagudin Municipal Police Clearance",
    documentClassification: "lgu_barangay_clearance",
    classificationLabel: "Police Clearance",
    documentNumberMasked: "PNP-TAG-2026-1184",
    imageUrl: "/photos/req-electrician.jpg",
    requestedCapability: "Residential Domestic Care & Deep Cleaning",
    workShapeCode: "A1",
    capabilityDescription: "Authorize worker to accept home domestic sanitization and housekeeping requests under municipal vetting.",
    toolChecklist: ["Commercial HEPA Vacuum", "Safety Eyewear & Rubber Gloves"],
    expiryDate: "2027-02-18",
    status: "needs_info",
    submittedAt: "2026-09-17 10:45 PHT",
    checks: {
      issuerValid: true,
      expiryValid: true,
      nameMatches: true,
      hologramSealIntact: false,
    },
  },
  {
    id: "rev-06",
    reference: "ID-2026-30",
    userId: "usr-11",
    applicantName: "Mark Tagudin Courier",
    initials: "MC",
    phoneMasked: "+63 930 *** 9901",
    barangay: "Poblacion, Tagudin",
    role: "provider",
    documentType: "LTO Professional Driver's License & Motorcycle OR/CR",
    documentClassification: "lto_driver_license",
    classificationLabel: "LTO Driver's License",
    documentNumberMasked: "LTO-N02-18-******",
    imageUrl: "/photos/courier.jpg",
    requestedCapability: "Motorcycle Courier & Deal Chain Extension",
    workShapeCode: "A9",
    capabilityDescription: "Authorize rider for same-day express parcel dispatch, food transport, and Deal-Chain delivery extensions.",
    toolChecklist: ["DOT-Approved Safety Helmet", "Waterproof Delivery Box", "Smartphone Mount"],
    expiryDate: "2030-04-12",
    status: "approved",
    submittedAt: "2026-09-10 10:00 PHT",
    checks: {
      issuerValid: true,
      expiryValid: true,
      nameMatches: true,
      hologramSealIntact: true,
    },
  },
]

export default function IdentityReviewsIndex() {
  const [tasks, setTasks] = React.useState<IdentityReviewTask[]>(SAMPLE_REVIEW_TASKS)
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [classificationFilter, setClassificationFilter] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const [currentPage, setCurrentPage] = React.useState<number>(1)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const pageSize = 6

  // Slide-Out Vetting Drawer State
  const [activeTask, setActiveTask] = React.useState<IdentityReviewTask | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false)

  // Audited Unmasking State (Data Privacy Act RA 10173)
  const [isDocumentUnmasked, setIsDocumentUnmasked] = React.useState<boolean>(false)
  const [isAuditedRevealPromptOpen, setIsAuditedRevealPromptOpen] = React.useState<boolean>(false)
  const [unmaskReason, setUnmaskReason] = React.useState<string>("watermark_audit")
  const [customUnmaskNotes, setCustomUnmaskNotes] = React.useState<string>("")
  const [auditLogSuccess, setAuditLogSuccess] = React.useState<string | null>(null)

  // Decision Action Dialog State
  const [actionDialog, setActionDialog] = React.useState<{
    type: "approve" | "needs_info" | "reject"
    title: string
  } | null>(null)
  const [actionReason, setActionReason] = React.useState<string>("")
  const [actionExecuted, setActionExecuted] = React.useState<boolean>(false)
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null)

  // Open Drawer handler
  const handleOpenDrawer = (task: IdentityReviewTask) => {
    setActiveTask(task)
    setIsDocumentUnmasked(false)
    setIsDrawerOpen(true)
    setAuditLogSuccess(null)
  }

  // Handle Confirmed Audited Unmasking
  const handleConfirmAuditedUnmask = () => {
    setIsDocumentUnmasked(true)
    setIsAuditedRevealPromptOpen(false)
    const reasonText =
      unmaskReason === "watermark_audit"
        ? "Auditing dry seal / anti-tamper watermark"
        : unmaskReason === "name_crosscheck"
        ? "Cross-checking license number with LGU database"
        : unmaskReason === "photo_match"
        ? "Verifying photographic facial resemblance"
        : customUnmaskNotes || "Supervisor desk compliance audit"

    setAuditLogSuccess(`Access audited: Officer Santos logged reason "${reasonText}" under RA 10173 least-privilege review.`)
  }

  // Handle Action Execution (Approve / Needs Info / Reject)
  const handleExecuteAction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTask) return

    setActionExecuted(true)
    setTimeout(() => {
      const updatedStatus =
        actionDialog?.type === "approve"
          ? "approved"
          : actionDialog?.type === "needs_info"
          ? "needs_info"
          : "rejected"

      const updatedTask: IdentityReviewTask = {
        ...activeTask,
        status: updatedStatus,
      }

      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
      setActiveTask(updatedTask)
      setActionExecuted(false)
      setActionDialog(null)
      setActionReason("")
      setIsDrawerOpen(false)

      setSuccessBanner(
        updatedStatus === "approved"
          ? `Granted ${updatedTask.workShapeCode} trade capability "${updatedTask.requestedCapability}" to ${updatedTask.applicantName}.`
          : updatedStatus === "needs_info"
          ? `Requested additional documentation from ${updatedTask.applicantName}.`
          : `Declined accreditation for ${updatedTask.applicantName}. Category remains locked.`
      )
    }, 800)
  }

  // Filtered Tasks Computation
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (classificationFilter !== "all" && t.documentClassification !== classificationFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          t.applicantName.toLowerCase().includes(q) ||
          t.reference.toLowerCase().includes(q) ||
          t.requestedCapability.toLowerCase().includes(q) ||
          t.documentType.toLowerCase().includes(q) ||
          t.barangay.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [tasks, statusFilter, classificationFilter, searchQuery])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, classificationFilter, searchQuery])

  const totalItems = filteredTasks.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedTasks = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTasks.slice(start, start + pageSize)
  }, [filteredTasks, currentPage, pageSize])

  const isAllPageSelected =
    paginatedTasks.length > 0 && paginatedTasks.every((t) => selectedIds.includes(t.id))
  const isSomePageSelected =
    paginatedTasks.some((t) => selectedIds.includes(t.id)) && !isAllPageSelected

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 bg-emerald-500/5 text-[10px] gap-1">
            <CheckCircle2 className="size-2.5" />
            <span>Approved &amp; Gated</span>
          </Badge>
        )
      case "pending_review":
        return (
          <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/5 text-[10px] gap-1">
            <Clock className="size-2.5" />
            <span>Pending Review</span>
          </Badge>
        )
      case "needs_info":
        return (
          <Badge variant="outline" className="border-blue-500/40 text-blue-400 bg-blue-500/5 text-[10px] gap-1">
            <AlertCircle className="size-2.5" />
            <span>More Info Requested</span>
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="text-[10px] gap-1">
            <X className="size-2.5" />
            <span>Declined</span>
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const pendingCount = tasks.filter((t) => t.status === "pending_review").length

  return (
    <AdminLayout
      currentSection="capabilities"
      title="Identity &amp; Credential Vetting Studio"
      breadcrumbs={[{ label: "Operations", href: "/admin/triage" }, { label: "Identity Review" }]}
    >
      <Head title="Identity & Credential Vetting — Serbizyu Admin" />

      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Identity &amp; Credential Vetting Studio
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review citizen professional licenses, trade certifications, and municipal clearances under least-privilege access.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs font-mono border-emerald-500/30 text-emerald-500 bg-emerald-500/5 px-2.5 py-1"
            >
              <span className="relative flex size-2 mr-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
              </span>
              RA 10173 Privacy Protected · Least Privilege Active
            </Badge>
          </div>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            <div className="flex items-center justify-between w-full">
              <div>
                <AlertTitle className="text-xs font-bold text-foreground">
                  Accreditation Action Confirmed
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                  {successBanner}
                </AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSuccessBanner(null)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </Alert>
        )}

        {/* 4 Graphic Accreditation KPI Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard
            title="Accredited Providers"
            value="38 Verified"
            statusBeacon="live"
            accentColor="#10b981"
            trendData={[24, 28, 31, 35, 38]}
            subtext="Trade cleared across Tagudin barangays"
            badgeText="Active"
          />

          <AdminMetricCard
            title="Pending Reviews"
            value={pendingCount.toString().padStart(2, "0")}
            statusBeacon={pendingCount > 0 ? "warning" : "live"}
            accentColor="#f59e0b"
            subtext="Awaiting desk supervisor credential vetting"
            badgeText={pendingCount > 0 ? "Action Required" : "Clear"}
          />

          <AdminMetricCard
            title="Access Audit Compliance"
            value="100% Attributed"
            statusBeacon="live"
            accentColor="#38bdf8"
            subtext="All document reveals logged with legal reason"
            badgeText="RA 10173"
          />

          <AdminMetricCard
            title="Clearance Expiry Watch"
            value="01 Nearing"
            statusBeacon="live"
            accentColor="#a855f7"
            subtext="Barangay clearance nearing 6-month validity"
            badgeText="SLA Safe"
          />
        </div>

        {/* Filter & Search Toolbar */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-3 border-b border-border flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              {/* Quick Status Tabs */}
              <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-1 text-xs font-medium overflow-x-auto max-w-full">
                {[
                  { id: "all", label: `All Applications (${tasks.length})` },
                  { id: "pending_review", label: `Pending Review (${pendingCount})` },
                  { id: "approved", label: "Approved" },
                  { id: "needs_info", label: "Needs Info" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`rounded-md px-3 py-1 text-xs transition-all whitespace-nowrap cursor-pointer ${
                      statusFilter === tab.id
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Document Classification Select */}
              <div className="flex items-center gap-2 shrink-0">
                <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                  <SelectTrigger className="h-8 text-xs w-48 bg-muted/20 border-border text-foreground">
                    <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Document Classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Document Types</SelectItem>
                    <SelectItem value="prc_board_license">PRC Board Licenses</SelectItem>
                    <SelectItem value="tesda_nc2_certificate">TESDA NC2 Certificates</SelectItem>
                    <SelectItem value="dti_business_registration">DTI Business Registrations</SelectItem>
                    <SelectItem value="lgu_barangay_clearance">Barangay &amp; Police Clearances</SelectItem>
                    <SelectItem value="lto_driver_license">LTO Driver's Licenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fast Clean Search Bar */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search credentials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-9 text-xs bg-muted/20 border-border text-foreground w-full font-mono"
              />
            </div>
          </CardHeader>

          {/* Scan-First Table */}
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/20 text-xs">
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={isAllPageSelected ? true : isSomePageSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const newIds = Array.from(new Set([...selectedIds, ...paginatedTasks.map((t) => t.id)]))
                          setSelectedIds(newIds)
                        } else {
                          const pageIds = new Set(paginatedTasks.map((t) => t.id))
                          setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)))
                        }
                      }}
                      aria-label="Select all applicants"
                    />
                  </TableHead>
                  <TableHead className="w-48">Applicant Citizen</TableHead>
                  <TableHead className="w-64">Credential Document</TableHead>
                  <TableHead className="w-60">Target Trade Capability Gate</TableHead>
                  <TableHead className="w-36">Submitted / Validity</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="text-right w-28">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      No credential review tasks match your filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTasks.map((task) => {
                    const isSelected = selectedIds.includes(task.id)

                    return (
                      <TableRow
                        key={task.id}
                        className={`transition-colors cursor-pointer group text-xs ${
                          isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                        }`}
                        onClick={() => handleOpenDrawer(task)}
                      >
                        <TableCell className="w-10 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds([...selectedIds, task.id])
                              } else {
                                setSelectedIds(selectedIds.filter((id) => id !== task.id))
                              }
                            }}
                            aria-label={`Select ${task.applicantName}`}
                          />
                        </TableCell>

                        {/* Applicant Citizen */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6 rounded-full shrink-0 border border-border">
                              <AvatarFallback className="text-[9px] bg-muted text-foreground font-bold">
                                {task.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col leading-tight overflow-hidden">
                              <span className="font-semibold text-foreground truncate">{task.applicantName}</span>
                              <span className="text-[10px] text-muted-foreground truncate">{task.barangay}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Credential Document */}
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground truncate">{task.documentType}</span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[9px] font-mono border-border">
                                {task.classificationLabel}
                              </Badge>
                              <span className="font-mono text-[9.5px] text-muted-foreground">{task.documentNumberMasked}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Target Trade Capability Gate */}
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-foreground text-xs">{task.requestedCapability}</span>
                            <span className="text-[10px] text-primary font-mono font-bold">
                              Gate: {task.workShapeCode} Trade Accreditation
                            </span>
                          </div>
                        </TableCell>

                        {/* Submitted / Validity */}
                        <TableCell>
                          <div className="flex flex-col text-[11px] font-mono text-muted-foreground">
                            <span>{task.submittedAt.substring(0, 10)}</span>
                            <span className="text-[10px] text-emerald-500">Exp: {task.expiryDate}</span>
                          </div>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell>
                          {getStatusBadge(task.status)}
                        </TableCell>

                        {/* Action Button */}
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 border-border hover:bg-muted/60"
                            onClick={() => handleOpenDrawer(task)}
                          >
                            <UserCheck className="size-3 mr-1 text-primary" />
                            <span>Vetting</span>
                          </Button>
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
              of <span className="font-semibold text-foreground">{totalItems}</span> applicants
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

      {/* ===================================================================
           SLIDE-OUT VETTING & APPROVAL DRAWER (Least-Privilege Review)
           =================================================================== */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl bg-card border-border p-6 flex flex-col justify-between overflow-y-auto">
          {activeTask && (
            <div className="flex flex-col gap-5 text-xs">
              <SheetHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="size-5 text-primary shrink-0" />
                    <div>
                      <SheetTitle className="font-heading text-base font-bold text-foreground">
                        Credential Vetting &amp; Capability Gate
                      </SheetTitle>
                      <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                        Dossier #{activeTask.reference} · {activeTask.applicantName} ({activeTask.barangay})
                      </SheetDescription>
                    </div>
                  </div>
                  {getStatusBadge(activeTask.status)}
                </div>
              </SheetHeader>

              {/* Audit Success Log Notice */}
              {auditLogSuccess && (
                <div className="p-2.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs flex items-center gap-2">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span className="leading-snug">{auditLogSuccess}</span>
                </div>
              )}

              {/* Section 1: Default-Masked Document Viewer with Audited Reveal Prompt */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5 text-primary" />
                    <span>Uploaded Credential Proof</span>
                  </span>
                  <Badge variant="outline" className="font-mono text-[9.5px]">
                    {activeTask.classificationLabel}
                  </Badge>
                </div>

                {/* Document Display Container */}
                <div className="relative rounded-xl overflow-hidden border border-border bg-black/60 aspect-video flex items-center justify-center">
                  <img
                    src={activeTask.imageUrl}
                    alt={activeTask.documentType}
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      !isDocumentUnmasked ? "blur-md scale-105 opacity-50" : "blur-0 scale-100 opacity-100"
                    }`}
                  />

                  {/* Privacy Mask Overlay if Masked */}
                  {!isDocumentUnmasked ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-4 bg-black/40 backdrop-blur-xs text-center">
                      <div className="size-10 rounded-full bg-background/80 border border-border flex items-center justify-center text-amber-500 shadow-sm">
                        <Lock className="size-5" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-white text-xs">
                          PII Document Masked under RA 10173
                        </span>
                        <span className="text-[11px] text-white/70 max-w-xs">
                          Sensitive government identity numbers and portrait are masked by default.
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5 cursor-pointer shadow-md mt-1"
                        onClick={() => setIsAuditedRevealPromptOpen(true)}
                      >
                        <Eye className="size-3.5" />
                        <span>Reveal Document for Vetting</span>
                      </Button>
                    </div>
                  ) : (
                    /* Watermark Badge when Unmasked */
                    <div className="absolute top-2 right-2 bg-black/80 text-emerald-400 border border-emerald-500/30 text-[9.5px] font-mono px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                      <Unlock className="size-2.5" />
                      <span>Audited View · Officer Santos</span>
                    </div>
                  )}
                </div>

                {/* Document Metadata Bar */}
                <div className="p-3 rounded-lg border border-border bg-muted/20 flex flex-col gap-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Document Type:</span>
                    <span className="font-semibold text-foreground text-right max-w-[280px] truncate">{activeTask.documentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Document Number:</span>
                    <span className="font-mono font-bold text-foreground">
                      {isDocumentUnmasked ? activeTask.documentNumberMasked.replace(/\*/g, "9") : activeTask.documentNumberMasked}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Validity Expiry Date:</span>
                    <span className="font-mono text-emerald-500 font-semibold">{activeTask.expiryDate}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: 4-Point Verification Checkpoints */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  <span>Credential Verification Checkpoints</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                    <span className="text-[11px] font-medium text-foreground">Issuer Authority Recognized</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                    <span className="text-[11px] font-medium text-foreground">Validity &amp; Expiry Active</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                    <span className="text-[11px] font-medium text-foreground">Name Matches Citizen Profile</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                    <span className="text-[11px] font-medium text-foreground">Anti-Tamper Hologram OK</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Granular Trade Capability Gate Preview */}
              <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Award className="size-3.5 text-primary" />
                    <span>Target Trade Capability Gate ({activeTask.workShapeCode})</span>
                  </span>
                  <Badge variant="outline" className="font-mono text-[9.5px] border-primary/40 text-primary">
                    Marketplace Authorization
                  </Badge>
                </div>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  {activeTask.capabilityDescription}
                </p>
                <div className="pt-2 border-t border-primary/20 flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Accredited Tooling Standards:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeTask.toolChecklist.map((tool, idx) => (
                      <Badge key={idx} variant="outline" className="text-[9.5px] bg-background">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Drawer Footer Actions */}
          <SheetFooter className="pt-4 border-t border-border flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs w-full sm:w-auto"
              onClick={() => setIsDrawerOpen(false)}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 text-amber-500 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                onClick={() => setActionDialog({ type: "needs_info", title: "Request Additional Documentation" })}
              >
                Request Info
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                onClick={() => setActionDialog({ type: "reject", title: "Decline Credential Accreditation" })}
              >
                Decline
              </Button>
              <Button
                size="sm"
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
                onClick={() => setActionDialog({ type: "approve", title: "Approve & Grant Capability Gate" })}
              >
                <Check className="size-3.5 mr-1" />
                <span>Approve &amp; Gate</span>
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ===================================================================
           AUDITED REVEAL PROMPT DIALOG (RA 10173 Data Privacy Act Compliance)
           =================================================================== */}
      <Dialog open={isAuditedRevealPromptOpen} onOpenChange={setIsAuditedRevealPromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-500" />
              <span>Audited Document Access Challenge</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pursuant to the Data Privacy Act (RA 10173), viewing unmasked citizen credentials requires a logged operational justification.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold text-foreground text-xs">
                Operational Reason for Unmasking
              </Label>
              <Select value={unmaskReason} onValueChange={setUnmaskReason}>
                <SelectTrigger className="text-xs bg-muted/20 border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watermark_audit">Auditing dry seal / anti-tamper watermark</SelectItem>
                  <SelectItem value="name_crosscheck">Cross-checking license number with LGU database</SelectItem>
                  <SelectItem value="photo_match">Verifying photographic facial resemblance</SelectItem>
                  <SelectItem value="other">Supervisor compliance inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {unmaskReason === "other" && (
              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold text-foreground text-xs">
                  Specific Inspection Notes
                </Label>
                <Input
                  value={customUnmaskNotes}
                  onChange={(e) => setCustomUnmaskNotes(e.target.value)}
                  placeholder="Enter specific audit reason..."
                  className="text-xs h-8 bg-muted/20 border-border text-foreground"
                />
              </div>
            )}

            <div className="p-2.5 rounded-lg border border-border bg-muted/20 text-[10.5px] text-muted-foreground leading-snug">
              This unmasking event will be recorded under <strong>Officer Santos (Desk Supervisor)</strong> with an immutable timestamp in the audit trail.
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setIsAuditedRevealPromptOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium cursor-pointer"
              onClick={handleConfirmAuditedUnmask}
            >
              <Unlock className="size-3.5 mr-1" />
              <span>Confirm &amp; Log Access</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================================
           DECISION ACTION DIALOG (Approve / Needs Info / Reject)
           =================================================================== */}
      <Dialog open={actionDialog !== null} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Award className="size-4 text-primary" />
              <span>{actionDialog?.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Candidate: <strong>{activeTask?.applicantName}</strong> · Gate: <strong>{activeTask?.requestedCapability}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExecuteAction} className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="decision-notes" className="font-semibold text-foreground text-xs">
                {actionDialog?.type === "approve"
                  ? "Accreditation Grant Notes"
                  : actionDialog?.type === "needs_info"
                  ? "Instructions to Applicant"
                  : "Mandatory Rejection Justification"}
              </Label>
              <Textarea
                id="decision-notes"
                required={actionDialog?.type !== "approve"}
                placeholder={
                  actionDialog?.type === "approve"
                    ? "Optional notes certifying trade tool checks and validity..."
                    : actionDialog?.type === "needs_info"
                    ? "Specify missing documents (e.g. Please upload rear side showing dry seal)..."
                    : "State specific reason for declination..."
                }
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="text-xs min-h-[80px] bg-muted/20 border-border text-foreground font-mono"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => setActionDialog(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className={`text-xs h-8 font-medium cursor-pointer ${
                  actionDialog?.type === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : actionDialog?.type === "needs_info"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-destructive hover:bg-destructive/90 text-white"
                }`}
                disabled={actionExecuted}
              >
                {actionExecuted ? (
                  <>
                    <RotateCw className="size-3.5 mr-1 animate-spin" />
                    <span>Committing...</span>
                  </>
                ) : (
                  <span>Confirm Decision</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
