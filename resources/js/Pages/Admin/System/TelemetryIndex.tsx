import { Head } from "@inertiajs/react"
import * as React from "react"
import {
  Activity,
  CheckCircle2,
  Clock,
  Code2,
  Database,
  Filter,
  Play,
  RefreshCw,
  RotateCw,
  Search,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { AdminMetricCard } from "@/components/admin/GraphicMetrics"
import { AdminLayout } from "@/layouts/AdminLayout"

export interface OutboxItem {
  id: string
  eventId: string
  eventType: string
  aggregateType: string
  aggregateId: string
  attempts: number
  lastError: string
  status: "pending" | "published" | "dead_letter"
  nextAttemptAt: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface AuditRecord {
  id: string
  timestamp: string
  actor: string
  actorRole: "Admin" | "Provider" | "Buyer" | "System"
  action: string
  targetType: string
  targetId: string
  reason: string
  correlationId: string
}

const SAMPLE_OUTBOX: OutboxItem[] = [
  {
    id: "obx-1",
    eventId: "EVT-0198-a1",
    eventType: "sms.notification.dispatch",
    aggregateType: "Order",
    aggregateId: "ORD-2026-09",
    attempts: 3,
    lastError: "504 Gateway Timeout: Semaphore API unresponsive after 3 retries",
    status: "dead_letter",
    nextAttemptAt: "Manual Replay Required",
    createdAt: "2026-09-17 14:32:00 PHT",
    payload: {
      recipient_phone: "+639178123456",
      message_template: "ORDER_HOLD_NOTIFICATION",
      order_ref: "ORD-2026-09",
      gateway: "TextBee GSM",
      retries: 3,
      http_status: 504,
    },
  },
  {
    id: "obx-2",
    eventId: "EVT-0198-a2",
    eventType: "ledger.transaction.post",
    aggregateType: "PaymentObligation",
    aggregateId: "OBL-881",
    attempts: 1,
    lastError: "None",
    status: "published",
    nextAttemptAt: "Published ✓",
    createdAt: "2026-09-17 14:30:15 PHT",
    payload: {
      obligation_ref: "OBL-881",
      lane: "external_cash",
      debit_account: "1010",
      credit_account: "1010",
      amount_minor: 9000,
      idempotency_hash: "sha256:0198a3c481",
    },
  },
  {
    id: "obx-3",
    eventId: "EVT-0198-a3",
    eventType: "webhook.delivery.partner",
    aggregateType: "Order",
    aggregateId: "ORD-2026-04",
    attempts: 1,
    lastError: "None",
    status: "published",
    nextAttemptAt: "Published ✓",
    createdAt: "2026-09-17 11:20:00 PHT",
    payload: {
      webhook_id: "WH_PARTNER_042",
      event: "order.variance_reported",
      target_url: "https://lgu.tagudin.gov.ph/api/webhooks/serbizyu",
      delivered_status: 200,
    },
  },
]

const SAMPLE_AUDIT: AuditRecord[] = [
  {
    id: "aud-1",
    timestamp: "2026-09-17 14:30:15 PHT",
    actor: "Officer Santos",
    actorRole: "Admin",
    action: "administrative_hold.placed",
    targetType: "PaymentObligation",
    targetId: "OBL-881",
    reason: "Evidence mismatch under human review (Buyer cash reported vs zero reported)",
    correlationId: "0198a3-c481",
  },
  {
    id: "aud-2",
    timestamp: "2026-09-17 14:25:00 PHT",
    actor: "Arman Electric",
    actorRole: "Provider",
    action: "dispute.opened",
    targetType: "Order",
    targetId: "ORD-2026-09",
    reason: "Cash payment not received at site during capacitor install",
    correlationId: "0198a3-b210",
  },
  {
    id: "aud-3",
    timestamp: "2026-09-17 14:22:11 PHT",
    actor: "Maria Santos",
    actorRole: "Buyer",
    action: "payment_declaration.submitted",
    targetType: "PaymentObligation",
    targetId: "OBL-881",
    reason: "Paid ₱90.00 External Cash directly to field technician",
    correlationId: "0198a3-a005",
  },
  {
    id: "aud-4",
    timestamp: "2026-09-17 14:15:20 PHT",
    actor: "Arman Electric",
    actorRole: "Provider",
    action: "work_step.started",
    targetType: "WorkInstance",
    targetId: "WRK-401",
    reason: "Disassembly step evidence uploaded for A1 linear project",
    correlationId: "0198a3-9821",
  },
  {
    id: "aud-5",
    timestamp: "2026-09-17 10:05:00 PHT",
    actor: "Outbox Engine",
    actorRole: "System",
    action: "dead_letter.parked",
    targetType: "OutboxMessage",
    targetId: "EVT-0198-a1",
    reason: "Exhausted 3 retries against SMS gateway endpoint (504 timeout)",
    correlationId: "0198a3-7140",
  },
]

const INITIAL_DRILL_LOGS = [
  "[2026-09-16 02:00:00 UTC] Automated disposable database spawned: serbizyu_rehearsal_0916",
  "[2026-09-16 02:05:12 UTC] Base backup snapshot restored: snapshot_20260916_full.sql.zst",
  "[2026-09-16 02:08:44 UTC] WAL replays completed to recovery target time: 2026-09-16 02:00:00",
  "[2026-09-16 02:10:01 UTC] Running catalog verification: 58 application tables verified. Checksum OK.",
  "[2026-09-16 02:11:15 UTC] PASS: Disposable database rehearsal verified. Staging environment destroyed safely.",
]

export default function TelemetryIndex() {
  const [activeTab, setActiveTab] = React.useState<"outbox" | "audit" | "recovery">("outbox")
  const [outbox, setOutbox] = React.useState<OutboxItem[]>(SAMPLE_OUTBOX)
  const [audit] = React.useState<AuditRecord[]>(SAMPLE_AUDIT)
  const [outboxStatusFilter, setOutboxStatusFilter] = React.useState<string>("all")
  const [outboxSearchQuery, setOutboxSearchQuery] = React.useState<string>("")
  const [replayingId, setReplayingId] = React.useState<string | null>(null)
  const [inspectedOutboxItem, setInspectedOutboxItem] = React.useState<OutboxItem | null>(null)

  // Audit state
  const [auditSearchQuery, setAuditSearchQuery] = React.useState<string>("")
  const [auditActorFilter, setAuditActorFilter] = React.useState<string>("all")
  const [auditCurrentPage, setAuditCurrentPage] = React.useState<number>(1)
  const auditPageSize = 10

  // Disaster Recovery state
  const [drillLogs, setDrillLogs] = React.useState<string[]>(INITIAL_DRILL_LOGS)
  const [isRunningDrill, setIsRunningDrill] = React.useState<boolean>(false)
  const [drillSuccessBanner, setDrillSuccessBanner] = React.useState<boolean>(false)

  // Outbox Replay Handler
  const handleReplay = (id: string) => {
    setReplayingId(id)
    setTimeout(() => {
      setReplayingId(null)
      setOutbox((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "published",
                attempts: item.attempts + 1,
                lastError: "None (Replayed via TextBee GSM gateway)",
                nextAttemptAt: "Published ✓",
              }
            : item
        )
      )
    }, 1200)
  }

  // Disaster Recovery Drill Simulation
  const handleRunRehearsalDrill = () => {
    setIsRunningDrill(true)
    setDrillSuccessBanner(false)

    const now = new Date().toISOString().replace("T", " ").substring(0, 19)
    const newLogs = [
      `[${now} UTC] Manual disposable rehearsal triggered by Officer Santos (Desk Supervisor)`,
      `[${now} UTC] Provisioning isolated sandbox PostgreSQL container: serbizyu_drill_live`,
      `[${now} UTC] Decompressing Zstandard base image snapshot_latest.sql.zst (58 tables)...`,
    ]
    setDrillLogs((prev) => [...prev, ...newLogs])

    setTimeout(() => {
      const step2 = [
        `[${now} UTC] Verifying foreign keys, constraints, and audit causality hashes...`,
        `[${now} UTC] Schema comparison: 58 tables matched, 0 drift, 100% checksum parity.`,
        `[${now} UTC] PASS: Disposable database rehearsal verified. Container de-provisioned safely.`,
      ]
      setDrillLogs((prev) => [...prev, ...step2])
      setIsRunningDrill(false)
      setDrillSuccessBanner(true)
    }, 2000)
  }

  // Filtered Outbox
  const filteredOutbox = React.useMemo(() => {
    return outbox.filter((item) => {
      if (outboxStatusFilter !== "all" && item.status !== outboxStatusFilter) {
        return false
      }
      if (outboxSearchQuery.trim()) {
        const q = outboxSearchQuery.toLowerCase()
        return (
          item.eventId.toLowerCase().includes(q) ||
          item.eventType.toLowerCase().includes(q) ||
          item.aggregateId.toLowerCase().includes(q) ||
          item.lastError.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [outbox, outboxStatusFilter, outboxSearchQuery])

  // Filtered Audit
  const filteredAudit = React.useMemo(() => {
    return audit.filter((a) => {
      if (auditActorFilter !== "all" && a.actorRole !== auditActorFilter) {
        return false
      }
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase()
        return (
          a.action.toLowerCase().includes(q) ||
          a.targetId.toLowerCase().includes(q) ||
          a.actor.toLowerCase().includes(q) ||
          a.reason.toLowerCase().includes(q) ||
          a.correlationId.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [audit, auditActorFilter, auditSearchQuery])

  const auditTotalPages = Math.max(1, Math.ceil(filteredAudit.length / auditPageSize))
  const paginatedAudit = React.useMemo(() => {
    const start = (auditCurrentPage - 1) * auditPageSize
    return filteredAudit.slice(start, start + auditPageSize)
  }, [filteredAudit, auditCurrentPage, auditPageSize])

  const deadLetterCount = outbox.filter((i) => i.status === "dead_letter").length

  return (
    <AdminLayout
      currentSection="outbox"
      title="System Health & Reliability"
      breadcrumbs={[{ label: "Operations", href: "/admin/triage" }, { label: "System Health" }]}
    >
      <Head title="System Health & Reliability — Serbizyu Admin" />

      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground">
              System Health &amp; Telemetry
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Transactional outbox dead-letter recovery, append-only causality audit logs, and verifiable database backup rehearsals.
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
              PostgreSQL 16 · All Systems Operational
            </Badge>
          </div>
        </div>

        {/* 4 Graphic Reliability Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard
            title="Outbox Published"
            value="1,420 Events"
            statusBeacon="live"
            accentColor="#10b981"
            trendData={[1100, 1190, 1280, 1360, 1420]}
            subtext="100% deduplicated transactional throughput"
            badgeText="Published"
          />

          <AdminMetricCard
            title="Dead-Letter Queue"
            value={deadLetterCount.toString().padStart(2, "0")}
            statusBeacon={deadLetterCount > 0 ? "danger" : "live"}
            accentColor="#ef4444"
            subtext="Failed external tasks parked for idempotent retry"
            badgeText={deadLetterCount > 0 ? "Action Required" : "Clear"}
          />

          <AdminMetricCard
            title="Audit Log Ledger"
            value="4,821 Records"
            statusBeacon="live"
            accentColor="#38bdf8"
            subtext="Immutable causality history across all tables"
            badgeText="Append-Only"
          />

          <AdminMetricCard
            title="Restore Rehearsal SLA"
            value="Verified ✓"
            statusBeacon="live"
            accentColor="#10b981"
            subtext="100% schema checksum match across 58 tables"
            badgeText="PASSED"
          />
        </div>

        {/* Clean Navigation Sub-Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("outbox")}
              className={`rounded-md px-3 py-1 text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "outbox"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Outbox Dead-Letter Queue</span>
              {deadLetterCount > 0 && (
                <Badge variant="outline" className="font-mono text-[9px] px-1.5 py-0 border-destructive/40 text-destructive bg-destructive/10">
                  {deadLetterCount}
                </Badge>
              )}
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
              <span>Append-Only Audit Trail</span>
              <span className="text-[10px] text-muted-foreground">({audit.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("recovery")}
              className={`rounded-md px-3 py-1 text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "recovery"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Database className="size-3 text-emerald-500" />
              <span>Disaster Recovery &amp; Backup Drills</span>
            </button>
          </div>

          <Badge variant="outline" className="text-[10px] font-mono hidden sm:inline-flex text-muted-foreground">
            Zero Data Loss Tolerance
          </Badge>
        </div>

        {/* ===================================================================
             TAB 1: TRANSACTIONAL OUTBOX DEAD-LETTER REPLAY (OPS-007)
             =================================================================== */}
        {activeTab === "outbox" && (
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="p-4 pb-3 border-b border-border flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                {/* Status Tabs */}
                <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setOutboxStatusFilter("all")}
                    className={`rounded-md px-2.5 py-1 transition-colors ${
                      outboxStatusFilter === "all"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Messages ({outbox.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutboxStatusFilter("dead_letter")}
                    className={`rounded-md px-2.5 py-1 transition-colors flex items-center gap-1.5 ${
                      outboxStatusFilter === "dead_letter"
                        ? "bg-background text-destructive shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-destructive" />
                    Blocked ({deadLetterCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutboxStatusFilter("published")}
                    className={`rounded-md px-2.5 py-1 transition-colors flex items-center gap-1.5 ${
                      outboxStatusFilter === "published"
                        ? "bg-background text-emerald-500 shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Published ({outbox.length - deadLetterCount})
                  </button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Idempotency Guarantee: Retrying published events is safe with 0 side effects.
                </div>
              </div>

              {/* Fast Search */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search outbox events..."
                  value={outboxSearchQuery}
                  onChange={(e) => setOutboxSearchQuery(e.target.value)}
                  className="h-8 pl-9 text-xs bg-muted/20 border-border text-foreground w-full font-mono"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/20 text-xs">
                    <TableHead className="w-36">Event ID</TableHead>
                    <TableHead className="w-52">Event Contract</TableHead>
                    <TableHead className="w-36">Aggregate Target</TableHead>
                    <TableHead className="w-24">Retries</TableHead>
                    <TableHead>Last Execution Diagnostic</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="text-right w-44">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOutbox.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                        No outbox messages match the active filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOutbox.map((item) => {
                      const isDead = item.status === "dead_letter"

                      return (
                        <TableRow key={item.id} className="text-xs hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono font-bold text-foreground">
                            {item.eventId}
                          </TableCell>

                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">
                              {item.eventType}
                            </span>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="font-mono text-[10px] text-primary">
                              {item.aggregateType} #{item.aggregateId}
                            </Badge>
                          </TableCell>

                          <TableCell className="font-mono">
                            <span className={isDead ? "text-destructive font-bold" : "text-muted-foreground"}>
                              {item.attempts} / 3
                            </span>
                          </TableCell>

                          <TableCell className="font-mono text-[11px] text-muted-foreground truncate max-w-sm">
                            {item.lastError}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] capitalize ${
                                isDead
                                  ? "border-destructive/40 text-destructive bg-destructive/5"
                                  : "border-emerald-500/40 text-emerald-500 bg-emerald-500/5"
                              }`}
                            >
                              {item.status.replace("_", " ")}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => setInspectedOutboxItem(item)}
                              >
                                <Code2 className="size-3 mr-1" />
                                <span>Payload</span>
                              </Button>

                              {isDead ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-7 text-xs px-2 bg-amber-600 hover:bg-amber-700 text-white"
                                  disabled={replayingId === item.id}
                                  onClick={() => handleReplay(item.id)}
                                >
                                  {replayingId === item.id ? (
                                    <>
                                      <RotateCw className="size-3 mr-1 animate-spin" />
                                      <span>Replaying...</span>
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="size-3 mr-1" />
                                      <span>Replay Event</span>
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Badge variant="outline" className="font-mono text-[10px] text-emerald-500 border-emerald-500/30">
                                  Published ✓
                                </Badge>
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
          </Card>
        )}

        {/* ===================================================================
             TAB 2: APPEND-ONLY AUDIT TRAIL
             =================================================================== */}
        {activeTab === "audit" && (
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="p-4 pb-3 border-b border-border flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Actor Filter Select */}
                  <Select value={auditActorFilter} onValueChange={setAuditActorFilter}>
                    <SelectTrigger className="h-8 text-xs w-36 bg-muted/20 border-border text-foreground">
                      <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="Actor Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actors</SelectItem>
                      <SelectItem value="Admin">Admins Only</SelectItem>
                      <SelectItem value="Provider">Providers</SelectItem>
                      <SelectItem value="Buyer">Buyers</SelectItem>
                      <SelectItem value="System">System Engine</SelectItem>
                    </SelectContent>
                  </Select>

                  <span className="text-xs text-muted-foreground">
                    Chronological audit log signed with SHA-256 state causality hashes.
                  </span>
                </div>

                <Badge variant="outline" className="font-mono text-[10px]">
                  {filteredAudit.length} Filtered Records
                </Badge>
              </div>

              {/* Fast Search */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search audit trail..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="h-8 pl-9 text-xs bg-muted/20 border-border text-foreground w-full font-mono"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/20 text-xs">
                    <TableHead className="w-44">Timestamp</TableHead>
                    <TableHead className="w-44">Actor</TableHead>
                    <TableHead className="w-52">Action</TableHead>
                    <TableHead className="w-48">Target Aggregate</TableHead>
                    <TableHead>Operational Reason</TableHead>
                    <TableHead className="w-32 text-right">Correlation ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAudit.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                        No audit events match the query.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAudit.map((a) => (
                      <TableRow key={a.id} className="text-xs hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-muted-foreground">
                          {a.timestamp}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-5 rounded-full shrink-0 border border-border">
                              <AvatarFallback className="text-[9px] bg-muted text-foreground font-bold">
                                {a.actor.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{a.actor}</span>
                              <span className="text-[9.5px] text-muted-foreground">{a.actorRole}</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="font-mono font-bold text-primary">
                            {a.action}
                          </span>
                        </TableCell>

                        <TableCell className="font-mono text-muted-foreground">
                          {a.targetType} #{a.targetId}
                        </TableCell>

                        <TableCell className="text-foreground leading-snug">
                          {a.reason}
                        </TableCell>

                        <TableCell className="font-mono text-muted-foreground text-right text-[11px]">
                          {a.correlationId}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>

            {/* Pagination Controls */}
            {auditTotalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
                <div>
                  Page <strong className="text-foreground">{auditCurrentPage}</strong> of{" "}
                  <strong className="text-foreground">{auditTotalPages}</strong>
                </div>
                <Pagination className="w-auto mx-0">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setAuditCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={auditCurrentPage <= 1}
                      />
                    </PaginationItem>
                    {Array.from({ length: auditTotalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={auditCurrentPage === i + 1}
                          onClick={() => setAuditCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setAuditCurrentPage((p) => Math.min(auditTotalPages, p + 1))}
                        disabled={auditCurrentPage >= auditTotalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </Card>
        )}

        {/* ===================================================================
             TAB 3: DISASTER RECOVERY & BACKUP DRILLS (OPS-009)
             =================================================================== */}
        {activeTab === "recovery" && (
          <div className="flex flex-col gap-6">
            {drillSuccessBanner && (
              <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <div className="flex items-center justify-between w-full">
                  <div>
                    <AlertTitle className="text-xs font-bold text-foreground">
                      Disposable Database Rehearsal Successfully Passed
                    </AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                      All 58 canonical schema tables restored and verified in isolated sandbox with 100% checksum parity. Staging container terminated safely.
                    </AlertDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setDrillSuccessBanner(false)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </Alert>
            )}

            {/* 3 Executive Recovery Benchmarks */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-blue-400" />
                  <span>Recovery Point Objective (RPO)</span>
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  15 Minutes
                </span>
                <span className="text-xs text-muted-foreground">
                  Continuous PostgreSQL WAL archiving with S3 bucket replication
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Activity className="size-3.5 text-emerald-500" />
                  <span>Recovery Time Objective (RTO)</span>
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  42 Minutes
                </span>
                <span className="text-xs text-muted-foreground">
                  Benchmarked automated restore time into clean container
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span>Schema Checksum Integrity</span>
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-500 tracking-tight">
                  100% Match
                </span>
                <span className="text-xs text-muted-foreground">
                  All 58 canonical tables restored with 0 schema drift
                </span>
              </div>
            </div>

            {/* Terminal Live Execution Rehearsal Log */}
            <Card className="border-border bg-card shadow-xs overflow-hidden">
              <CardHeader className="p-4 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                    <Terminal className="size-4 text-emerald-500" />
                    <span>Empirical Restore Rehearsal Terminal Log</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Live console logs from disposable database restore drills. Readiness is proven via logs, not assumed.
                  </CardDescription>
                </div>

                <Button
                  size="sm"
                  variant="default"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  disabled={isRunningDrill}
                  onClick={handleRunRehearsalDrill}
                >
                  {isRunningDrill ? (
                    <>
                      <RotateCw className="size-3.5 mr-1.5 animate-spin" />
                      <span>Executing Drill...</span>
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5 mr-1.5" />
                      <span>Run Disposable Rehearsal Drill</span>
                    </>
                  )}
                </Button>
              </CardHeader>

              <CardContent className="p-4 bg-black/40 font-mono text-xs text-muted-foreground space-y-1.5 max-h-[320px] overflow-y-auto">
                {drillLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={
                      log.includes("PASS:")
                        ? "text-emerald-400 font-bold"
                        : log.includes("triggered")
                        ? "text-blue-400 font-bold"
                        : log.includes("Decompressing")
                        ? "text-amber-400"
                        : "text-muted-foreground"
                    }
                  >
                    {log}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ===================================================================
           OUTBOX PAYLOAD INSPECTION SHEET
           =================================================================== */}
      <Sheet open={!!inspectedOutboxItem} onOpenChange={(open) => !open && setInspectedOutboxItem(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border p-6 flex flex-col justify-between">
          <div className="flex flex-col gap-6 overflow-y-auto">
            <SheetHeader className="pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Code2 className="size-5 text-primary shrink-0" />
                <SheetTitle className="font-heading text-base font-bold text-foreground">
                  Outbox Message Payload
                </SheetTitle>
              </div>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                Raw JSON payload, idempotency headers, and execution diagnostics.
              </SheetDescription>
            </SheetHeader>

            {inspectedOutboxItem && (
              <div className="flex flex-col gap-4 text-xs">
                <div className="p-3 rounded-lg border border-border bg-muted/20 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Event ID:</span>
                    <span className="font-mono text-primary font-bold">{inspectedOutboxItem.eventId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Contract:</span>
                    <span className="font-mono text-foreground">{inspectedOutboxItem.eventType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Target:</span>
                    <span className="font-mono text-foreground">{inspectedOutboxItem.aggregateType} #{inspectedOutboxItem.aggregateId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Attempts:</span>
                    <span className="font-mono font-semibold">{inspectedOutboxItem.attempts} / 3</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-foreground">Last Execution Diagnostic:</span>
                  <div className="p-2.5 rounded-lg border border-border bg-destructive/5 text-destructive font-mono text-[11px] leading-relaxed">
                    {inspectedOutboxItem.lastError}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-foreground">Message Body (JSON):</span>
                  <pre className="p-3 rounded-lg border border-border bg-muted/20 font-mono text-[11px] text-foreground overflow-x-auto">
                    {JSON.stringify(inspectedOutboxItem.payload, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="pt-4 border-t border-border flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs w-full sm:w-auto"
              onClick={() => setInspectedOutboxItem(null)}
            >
              Close
            </Button>
            {inspectedOutboxItem?.status === "dead_letter" && (
              <Button
                variant="default"
                size="sm"
                className="text-xs w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
                disabled={replayingId === inspectedOutboxItem.id}
                onClick={() => {
                  handleReplay(inspectedOutboxItem.id)
                  setInspectedOutboxItem(null)
                }}
              >
                <RefreshCw className="size-3.5 mr-1.5" />
                <span>Replay Message</span>
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  )
}
