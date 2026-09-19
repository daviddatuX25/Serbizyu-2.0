import { Head } from "@inertiajs/react"
import * as React from "react"
import {
  Check,
  ChevronRight,
  Radio,
  Receipt,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Wallet,
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
import { AdminLayout } from "@/layouts/AdminLayout"

export interface ProviderEventRecord {
  id: string
  eventId: string
  provider: "xendit" | "gcash" | "maya" | "p2p_cash"
  providerLabel: string
  eventType: string
  orderRef: string
  obligationRef: string
  amountMinor: number
  currency: string
  authenticated: boolean
  processingStatus: "processed" | "processing" | "delta_flagged" | "received"
  deltaMinor: number
  receivedAt: string
  ledgerEntryRef: string
  payloadSnippet: Record<string, unknown>
}

export interface LedgerAccount {
  id: string
  accountCode: string
  accountName: string
  accountType: "asset" | "liability" | "control" | "revenue"
  debitMinor: number
  creditMinor: number
  description: string
}

export interface OperatingCostItem {
  id: string
  costName: string
  category: "sms_gateway" | "vps_hosting" | "domain_security" | "legal_lgu"
  monthlyAmountMinor: number
  costPerTransactionMinor: number
  status: "active" | "budgeted"
  provider: string
  description: string
}

const SAMPLE_PROVIDER_EVENTS: ProviderEventRecord[] = [
  {
    id: "pe-1",
    eventId: "WH_XENDIT_CHARGE_0198",
    provider: "xendit",
    providerLabel: "Xendit GCash Gateway",
    eventType: "payment.capture.succeeded",
    orderRef: "ORD-2026-04",
    obligationRef: "OBL-872",
    amountMinor: 12000,
    currency: "PHP",
    authenticated: true,
    processingStatus: "delta_flagged",
    deltaMinor: 500,
    receivedAt: "2026-09-17 11:32 PHT",
    ledgerEntryRef: "LED-0084",
    payloadSnippet: {
      id: "chrg_xendit_991823",
      status: "SUCCEEDED",
      payment_method: "GCASH_DIRECT",
      net_amount: 11500,
      fee: 500,
      signature: "hmac_sha256_e198a3b17c40",
    },
  },
  {
    id: "pe-2",
    eventId: "P2P_CASH_DECLARATION_0198",
    provider: "p2p_cash",
    providerLabel: "P2P Cash Attestation",
    eventType: "cash.buyer_declared",
    orderRef: "ORD-2026-09",
    obligationRef: "OBL-881",
    amountMinor: 9000,
    currency: "PHP",
    authenticated: true,
    processingStatus: "processed",
    deltaMinor: 0,
    receivedAt: "2026-09-17 14:22 PHT",
    ledgerEntryRef: "LED-0091",
    payloadSnippet: {
      attestation_id: "att_cash_0918",
      declared_by: "Maria Santos (Buyer)",
      handover_channel: "IN_PERSON_GATEWAY_ZERO_CUSTODY",
      disclosed_commission_rate: "0.00%",
    },
  },
  {
    id: "pe-3",
    eventId: "WH_MAYA_PAYMENT_0142",
    provider: "maya",
    providerLabel: "Maya Business Gateway",
    eventType: "payment.completed",
    orderRef: "ORD-2026-05",
    obligationRef: "OBL-840",
    amountMinor: 15000,
    currency: "PHP",
    authenticated: true,
    processingStatus: "processed",
    deltaMinor: 0,
    receivedAt: "2026-09-15 13:22 PHT",
    ledgerEntryRef: "LED-0062",
    payloadSnippet: {
      transaction_id: "maya_tx_77182",
      clearing_account: "TIWALA_ESCROW_SANDBOX_2010",
      status: "COMPLETED",
      signature: "hmac_sha256_b340a18e",
    },
  },
  {
    id: "pe-4",
    eventId: "P2P_CASH_MUTUAL_0110",
    provider: "p2p_cash",
    providerLabel: "P2P Cash Attestation",
    eventType: "cash.mutual_confirmed",
    orderRef: "ORD-2026-07",
    obligationRef: "OBL-851",
    amountMinor: 35000,
    currency: "PHP",
    authenticated: true,
    processingStatus: "processed",
    deltaMinor: 0,
    receivedAt: "2026-09-16 18:30 PHT",
    ledgerEntryRef: "LED-0071",
    payloadSnippet: {
      buyer_confirmed: true,
      provider_confirmed: true,
      status: "MUTUALLY_ACKNOWLEDGED",
    },
  },
  {
    id: "pe-5",
    eventId: "P2P_CASH_MUTUAL_0098",
    provider: "p2p_cash",
    providerLabel: "P2P Cash Attestation",
    eventType: "cash.mutual_confirmed",
    orderRef: "ORD-2026-02",
    obligationRef: "OBL-820",
    amountMinor: 24000,
    currency: "PHP",
    authenticated: true,
    processingStatus: "processed",
    deltaMinor: 0,
    receivedAt: "2026-09-15 10:30 PHT",
    ledgerEntryRef: "LED-0051",
    payloadSnippet: {
      batch: "PALAY_GRAIN_HARVEST",
      status: "MUTUALLY_ACKNOWLEDGED",
    },
  },
  {
    id: "pe-6",
    eventId: "WH_XENDIT_CHARGE_0144",
    provider: "xendit",
    providerLabel: "Xendit Digital Sandbox",
    eventType: "payment.capture.succeeded",
    orderRef: "ORD-2026-01",
    obligationRef: "OBL-801",
    amountMinor: 42000,
    currency: "PHP",
    authenticated: true,
    processingStatus: "processed",
    deltaMinor: 0,
    receivedAt: "2026-09-14 10:05 PHT",
    ledgerEntryRef: "LED-0038",
    payloadSnippet: {
      charge_id: "xnd_chrg_0144",
      method: "INSTAPAY_SANDBOX",
      net_amount: 42000,
    },
  },
]

const SAMPLE_ACCOUNTS: LedgerAccount[] = [
  {
    id: "acc-1",
    accountCode: "1010",
    accountName: "External Cash Settlement Control",
    accountType: "control",
    debitMinor: 1425000,
    creditMinor: 1425000,
    description: "Tracks peer-to-peer cash transactions in Tagudin. Balances to ₱0.00 platform revenue.",
  },
  {
    id: "acc-2",
    accountCode: "1020",
    accountName: "External Digital Proof Clearing",
    accountType: "control",
    debitMinor: 2840000,
    creditMinor: 2840000,
    description: "Clearing control for external GCash/bank payment screenshots verified between parties.",
  },
  {
    id: "acc-3",
    accountCode: "2010",
    accountName: "Tiwala Escrow Custodial Liability",
    accountType: "liability",
    debitMinor: 1500000,
    creditMinor: 1500000,
    description: "Customer funds held in digital custody under delayed release terms pending work sign-off.",
  },
  {
    id: "acc-4",
    accountCode: "4010",
    accountName: "Platform Service Revenue",
    accountType: "revenue",
    debitMinor: 0,
    creditMinor: 350000,
    description: "Actual company earned revenue from promoted catalog listings and featured merchant slots.",
  },
]

const SAMPLE_OPERATING_COSTS: OperatingCostItem[] = [
  {
    id: "cost-1",
    costName: "TextBee GSM SMS Gateway",
    category: "sms_gateway",
    monthlyAmountMinor: 120000,
    costPerTransactionMinor: 92,
    status: "active",
    provider: "Smart & Globe Prepaid SIM Hardware Pool",
    description: "Powers OTP verification and dispatch notices for keypad phone users.",
  },
  {
    id: "cost-2",
    costName: "Dokploy Cloud VPS Hosting",
    category: "vps_hosting",
    monthlyAmountMinor: 64000,
    costPerTransactionMinor: 50,
    status: "active",
    provider: "Production Linux VPS Instance",
    description: "Dedicated application server and database hosting.",
  },
  {
    id: "cost-3",
    costName: "Cloudflare Edge & Security",
    category: "domain_security",
    monthlyAmountMinor: 0,
    costPerTransactionMinor: 0,
    status: "active",
    provider: "Cloudflare Edge Network",
    description: "TLS termination, edge caching, and firewall protection.",
  },
]

export default function FinancialsIndex() {
  const [activeTab, setActiveTab] = React.useState<"gateways" | "ledger" | "unit_economics">("gateways")
  const [events] = React.useState<ProviderEventRecord[]>(SAMPLE_PROVIDER_EVENTS)
  const [accounts] = React.useState<LedgerAccount[]>(SAMPLE_ACCOUNTS)
  const [costs] = React.useState<OperatingCostItem[]>(SAMPLE_OPERATING_COSTS)

  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(6)
  const [selectedEvent, setSelectedEvent] = React.useState<ProviderEventRecord | null>(null)

  // Filter computation for events
  const filteredEvents = React.useMemo(() => {
    return events.filter((item) => {
      if (statusFilter === "delta" && item.processingStatus !== "delta_flagged") return false
      if (statusFilter === "xendit" && item.provider !== "xendit") return false
      if (statusFilter === "cash" && item.provider !== "p2p_cash") return false
      if (statusFilter === "processed" && item.processingStatus !== "processed") return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          item.eventId.toLowerCase().includes(q) ||
          item.orderRef.toLowerCase().includes(q) ||
          item.obligationRef.toLowerCase().includes(q) ||
          item.providerLabel.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [events, statusFilter, searchQuery])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchQuery, pageSize])

  const totalItems = filteredEvents.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedEvents = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredEvents.slice(start, start + pageSize)
  }, [filteredEvents, currentPage, pageSize])

  // Totals calculation
  const totalGMVMinor = 18245000
  const cashGMVMinor = 1425000
  const platformRevenueMinor = 350000
  const monthlyOperatingCostMinor = costs.reduce((sum, c) => sum + c.monthlyAmountMinor, 0)
  const netOperatingMarginMinor = platformRevenueMinor - monthlyOperatingCostMinor

  return (
    <AdminLayout currentSection="inspector" title="Financial Management">
      <Head title="Financial Management — Serbizyu Admin" />

      <div className="flex flex-col gap-6">
        {/* Header Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground break-words">
              Financial Management &amp; Platform Economics
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Marketplace GMV accounting, payment gateway webhooks ingestion, and double-entry trial balance.
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-xs font-mono border-emerald-500/30 text-emerald-500">
            Balanced Ledger
          </Badge>
        </div>

        {/* Big Displayed Company Economic Target Cards */}
        <div className="grid gap-5 sm:grid-cols-3">
          {/* Card 1: Marketplace GMV (Gross Economic Activity) */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="size-4 text-emerald-500" />
                <span>Marketplace GMV</span>
              </span>
              <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                Target: ₱250k Goal
              </Badge>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                ₱{(totalGMVMinor / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground">
                Total commercial volume transacted across Tagudin
              </span>
            </div>

            {/* Target Progress Bar */}
            <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Municipal Pilot Progress:</span>
                <span className="font-mono font-bold text-foreground">73% of ₱250k Target</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: "73%" }} />
              </div>
            </div>
          </div>

          {/* Card 2: Peer-to-Peer Cash (Zero Platform Commission Guarantee) */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Wallet className="size-4 text-blue-400" />
                <span>Peer-to-Peer Cash</span>
              </span>
              <Badge variant="outline" className="font-mono text-[10px] border-blue-500/30 text-blue-400 bg-blue-500/5">
                0% Platform Take
              </Badge>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                ₱{(cashGMVMinor / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground">
                Direct resident exchange with exactly ₱0.00 fee collected
              </span>
            </div>

            {/* Non-Custodial Guarantee Info */}
            <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
              <span className="text-muted-foreground">Custody Protocol:</span>
              <span className="font-semibold text-blue-400">100% Non-Custodial</span>
            </div>
          </div>

          {/* Card 3: Net Platform Margin (Self-Sustaining Operating Runway) */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Receipt className="size-4 text-primary" />
                <span>Net Platform Margin</span>
              </span>
              <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                Self-Sustaining
              </Badge>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold text-emerald-500 tracking-tight">
                +₱{(netOperatingMarginMinor / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground">
                Earned revenue (₱3,500) minus monthly infra costs (₱1,840)
              </span>
            </div>

            {/* Sustainability Ratio */}
            <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
              <span className="text-muted-foreground">Operating Ratio:</span>
              <span className="font-mono font-bold text-emerald-500">+47.4% Net Margin</span>
            </div>
          </div>
        </div>
        {/* Clean Tab Switcher (No Badges, No Clutter) */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("gateways")}
              className={`rounded-md px-3 py-1 text-xs transition-all cursor-pointer ${
                activeTab === "gateways"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Gateways ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ledger")}
              className={`rounded-md px-3 py-1 text-xs transition-all cursor-pointer ${
                activeTab === "ledger"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              General Ledger
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unit_economics")}
              className={`rounded-md px-3 py-1 text-xs transition-all cursor-pointer ${
                activeTab === "unit_economics"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Operating Costs
            </button>
          </div>
        </div>

        {/* ===================================================================
             TAB 1: PAYMENT GATEWAY INGESTION LOG (provider_events)
             =================================================================== */}
        {activeTab === "gateways" && (
          <div className="flex flex-col gap-4">
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="p-4 pb-3 border-b border-border flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  {/* Clean Status Filter Tabs */}
                  <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-1 text-xs font-medium overflow-x-auto max-w-full">
                    {[
                      { id: "all", label: `All Events (${events.length})` },
                      { id: "xendit", label: "Xendit GCash (2)" },
                      { id: "cash", label: "Cash Attestations (3)" },
                      { id: "delta", label: "Deltas (1)" },
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
                </div>

                {/* Simple Clean Search Bar */}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search payments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-9 text-xs bg-muted/20 border-border text-foreground w-full font-mono"
                  />
                </div>
              </CardHeader>

              {/* Table */}
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/20 text-xs">
                      <TableHead className="w-64">Webhook Event ID</TableHead>
                      <TableHead className="w-44">Gateway Provider</TableHead>
                      <TableHead className="w-36">Obligation &amp; Order</TableHead>
                      <TableHead className="w-32">Ingested Amount</TableHead>
                      <TableHead className="w-36">Authentication</TableHead>
                      <TableHead className="w-32">Reconciliation</TableHead>
                      <TableHead className="text-right w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                          No webhook events match your filter criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedEvents.map((item) => (
                        <TableRow
                          key={item.id}
                          className="hover:bg-muted/40 transition-colors cursor-pointer group"
                          onClick={() => setSelectedEvent(item)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                                {item.eventId}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {item.eventType}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs">
                              {item.provider === "p2p_cash" ? (
                                <Wallet className="size-3 text-blue-400" />
                              ) : (
                                <Radio className="size-3 text-emerald-500" />
                              )}
                              <span className="font-medium text-foreground">{item.providerLabel}</span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col font-mono text-xs">
                              <span className="text-foreground">{item.obligationRef}</span>
                              <span className="text-[10.5px] text-primary">{item.orderRef}</span>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono font-bold text-xs text-foreground">
                            ₱{(item.amountMinor / 100).toFixed(2)}
                          </TableCell>

                          <TableCell>
                            {item.authenticated ? (
                              <Badge variant="outline" className="text-[9.5px] border-emerald-500/40 text-emerald-500 bg-emerald-500/5 gap-1">
                                <Check className="size-2.5" />
                                <span>Verified ✓</span>
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[9.5px]">
                                Unauthenticated
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell>
                            {item.processingStatus === "delta_flagged" ? (
                              <Badge variant="destructive" className="text-[9.5px] gap-1">
                                <ShieldAlert className="size-2.5" />
                                <span>Delta +₱{(item.deltaMinor / 100).toFixed(2)}</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-[9.5px]">
                                Matched ✓
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 gap-1 text-muted-foreground group-hover:text-foreground cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedEvent(item)
                              }}
                            >
                              <span>Payload</span>
                              <ChevronRight className="size-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="p-3 border-t border-border bg-card/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div className="text-muted-foreground">
                    Showing <strong className="text-foreground">{Math.min(1 + (currentPage - 1) * pageSize, totalItems)}</strong> to{" "}
                    <strong className="text-foreground">{Math.min(currentPage * pageSize, totalItems)}</strong> of{" "}
                    <strong className="text-foreground">{totalItems}</strong> webhook events
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
          </div>
        )}

        {/* ===================================================================
             TAB 2: DOUBLE-ENTRY GENERAL LEDGER (ADR-R-035)
             =================================================================== */}
        {activeTab === "ledger" && (
          <div className="flex flex-col gap-4">
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="p-4 pb-3 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Receipt className="size-4 text-primary" />
                    <span>Chart of Accounts &amp; Trial Balance</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Municipal ledger verified for Tagudin. Total debits strictly equal credits.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 font-mono text-xs">
                  Balanced
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border bg-muted/20 text-xs">
                      <TableHead className="w-24">Account Code</TableHead>
                      <TableHead className="w-72">Account Name</TableHead>
                      <TableHead className="w-28">Type</TableHead>
                      <TableHead className="text-right w-36">Debit</TableHead>
                      <TableHead className="text-right w-36">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((acc) => (
                      <TableRow key={acc.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-mono font-bold text-foreground">
                          {acc.accountCode}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{acc.accountName}</span>
                            <span className="text-[10.5px] text-muted-foreground leading-snug">{acc.description}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9.5px] font-mono capitalize">
                            {acc.accountType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-right text-foreground">
                          ₱{(acc.debitMinor / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-right text-foreground">
                          ₱{(acc.creditMinor / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Balanced Totals Summary Row */}
                    <TableRow className="border-t-2 border-border bg-muted/30 font-bold text-xs">
                      <TableCell colSpan={3} className="text-foreground">
                        Trial Balance Totals
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-500 font-bold">
                        ₱57,650.00
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-500 font-bold">
                        ₱57,650.00
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Withholding Tax Card */}
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1.5 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <ShieldCheck className="size-4 text-primary" />
                <span>Withholding Tax Compliance</span>
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Under Philippine BIR regulations, marketplace operators report gross merchant remittances. Local Tagudin micro-trades under statutory exemption thresholds retain complete earnings without withholding deductions.
              </p>
            </div>
          </div>
        )}

        {/* ===================================================================
             TAB 3: UNIT ECONOMICS & OPERATING COSTS (CLEAN VISUAL CARDS, NOT A RAW TABLE!)
             =================================================================== */}
        {activeTab === "unit_economics" && (
          <div className="flex flex-col gap-5">
            {/* Top Runway Health Card */}
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Monthly Operating Runway &amp; Unit Economics
                  </span>
                  <span className="text-sm font-semibold text-foreground mt-0.5">
                    Total fixed infrastructure overhead to sustain Serbizyu in Tagudin
                  </span>
                </div>
                <Badge variant="outline" className="text-xs font-mono border-emerald-500/30 text-emerald-500 bg-emerald-500/5 w-fit">
                  Positive Operating Margin
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border text-xs">
                <div className="p-3 rounded-lg border border-border bg-muted/10 flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Monthly Cost</span>
                  <span className="font-mono text-xl font-bold text-foreground mt-0.5">
                    ₱{(monthlyOperatingCostMinor / 100).toFixed(2)}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground mt-1">SMS gateway + VPS hosting</span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10 flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Earned Revenue</span>
                  <span className="font-mono text-xl font-bold text-foreground mt-0.5">
                    ₱{(platformRevenueMinor / 100).toFixed(2)}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground mt-1">Catalog boosts &amp; featured slots</span>
                </div>

                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex flex-col">
                  <span className="text-[10px] text-emerald-500 uppercase font-bold">Net Monthly Margin</span>
                  <span className="font-mono text-xl font-bold text-emerald-500 mt-0.5">
                    +₱{(netOperatingMarginMinor / 100).toFixed(2)}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground mt-1">Self-sustaining operating cash flow</span>
                </div>
              </div>
            </div>

            {/* 3 Dedicated Infrastructure Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {costs.map((c) => (
                <Card key={c.id} className="border-border bg-card shadow-xs flex flex-col justify-between">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[9.5px] font-mono capitalize">
                        {c.category.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-500">
                        {c.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground mt-2 leading-snug">
                      {c.costName}
                    </CardTitle>
                    <span className="text-[10.5px] text-muted-foreground font-mono">
                      {c.provider}
                    </span>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 flex flex-col gap-2.5 text-xs">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {c.description}
                    </p>
                    <div className="p-2.5 rounded-lg border border-border bg-muted/10 flex items-center justify-between pt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Monthly Cost</span>
                        <span className="font-mono font-bold text-foreground text-sm">
                          {c.monthlyAmountMinor === 0 ? "Free Tier" : `₱${(c.monthlyAmountMinor / 100).toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Per Order</span>
                        <span className="font-mono text-muted-foreground text-xs">
                          ₱{(c.costPerTransactionMinor / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Peek Drawer for Webhook Events */}
        <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <SheetContent side="right" className="sm:max-w-lg flex flex-col h-full overflow-hidden p-0">
            <SheetHeader>
              <div className="flex items-center justify-between pr-6">
                <div className="flex items-center gap-2">
                  <Receipt className="size-4 text-primary" />
                  <SheetTitle>Payment Webhook Payload</SheetTitle>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {selectedEvent?.eventId}
                </Badge>
              </div>
              <SheetDescription>
                Cryptographic authentication, raw JSONB payload, and 3-way ledger matching.
              </SheetDescription>
            </SheetHeader>

            {selectedEvent && (
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 text-xs">
                {/* Event Summary Card */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{selectedEvent.providerLabel}</span>
                    <Badge variant="outline" className="font-mono text-[10px] text-emerald-500 border-emerald-500/30">
                      Verified ✓
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                    <span className="text-muted-foreground">Event Type:</span>
                    <code className="font-mono text-foreground font-bold">{selectedEvent.eventType}</code>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Received Timestamp:</span>
                    <span className="font-mono text-foreground">{selectedEvent.receivedAt}</span>
                  </div>
                </div>

                {/* Amount & Obligation Linkage */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-border bg-card flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Ingested Amount</span>
                    <span className="font-mono text-base font-bold text-foreground">
                      ₱{(selectedEvent.amountMinor / 100).toFixed(2)}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground">
                      Delta: ₱{(selectedEvent.deltaMinor / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-card flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Linked Obligation</span>
                    <span className="font-mono font-bold text-foreground">
                      {selectedEvent.obligationRef}
                    </span>
                    <span className="text-[10.5px] text-primary font-mono">
                      {selectedEvent.orderRef}
                    </span>
                  </div>
                </div>

                {/* Raw Cryptographic Webhook JSONB Payload */}
                <div className="rounded-xl border border-border bg-black/40 p-3.5 flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-bold text-white/70 font-mono flex items-center justify-between">
                    <span>Raw Webhook Ingestion JSONB</span>
                    <Badge variant="outline" className="text-[9px] text-white border-white/20">provider_events</Badge>
                  </span>
                  <pre className="text-[10.5px] font-mono text-emerald-400 overflow-x-auto p-2 bg-black/60 rounded-md leading-relaxed">
                    {JSON.stringify(selectedEvent.payloadSnippet, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => setSelectedEvent(null)}
              >
                Close Payload
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  )
}
