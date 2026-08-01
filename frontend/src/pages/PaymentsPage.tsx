import { AlertTriangle, ArrowRight, Banknote, Check, FileCheck2, FlaskConical, HandCoins, Info, LockKeyhole, RefreshCcw, ShieldCheck, Smartphone, UserCheck2, WalletCards } from "lucide-react";
import { useOrder, useReportCash, useReportCashMismatch } from "@/api/hooks";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { cn, formatPeso } from "@/lib/cn";
import type { PaymentLane } from "@/types/domain";

const laneData: { id: PaymentLane; title: string; icon: typeof Banknote; status: string; description: string; detail: string; tone: string; available: boolean }[] = [
  { id: "external_cash", title: "External Cash", icon: Banknote, status: "Pilot-facing", description: "Buyer pays Provider directly. Each side independently reports what happened.", detail: "0% commission · no custody · no automatic refund", tone: "forest", available: true },
  { id: "external_digital_proof", title: "External Digital Proof", icon: FileCheck2, status: "Pilot-facing", description: "An external transfer plus submitted evidence. Submission is not automatic verification.", detail: "0% commission · evidence trail · no custody", tone: "blue", available: true },
  { id: "direct_digital_sandbox", title: "Direct Digital", icon: Smartphone, status: "Sandbox only", description: "Simulated provider events and reconciliation. No connected money in this build.", detail: "synthetic events · no revenue · no payout", tone: "mango", available: false },
  { id: "tiwala_sandbox", title: "Tiwala Protected Digital", icon: ShieldCheck, status: "Sandbox only", description: "Guard-checked protected-release simulation. No legal custody or production release claim.", detail: "8 release guards · idempotent demo event", tone: "violet", available: false },
];

export function PaymentsPage() {
  const { role } = useApp();
  const orderQuery = useOrder();
  const reportCash = useReportCash();
  const reportMismatch = useReportCashMismatch();
  const order = orderQuery.data;

  if (!order) return <main className="page-wrap"><div className="h-[620px] animate-pulse rounded-3xl bg-white" /></main>;

  const canReport = role === "buyer" || role === "provider";
  const myReported = role === "buyer" ? order.buyerCashReported : role === "provider" ? order.providerCashReported : false;

  return (
    <main className="page-wrap">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-ink-100 bg-white p-6 shadow-soft sm:p-8"><div className="absolute right-0 top-0 h-full w-[42%] bg-gradient-to-l from-forest-50 to-transparent" /><div className="relative max-w-2xl"><Badge tone="forest"><WalletCards className="h-3 w-3" /> Payment clarity</Badge><h1 className="display-title mt-4">Know where money is — and where it is not.</h1><p className="mt-3 text-sm leading-6 text-ink-500">Every obligation shows purpose, amount, payer, recipient, lane, custody, evidence, protection, and what it does not prove.</p></div></div>

          <section><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Available modes</p><h2 className="mt-1 font-display text-xl font-extrabold text-ink-950">Choose by meaning, not logo</h2></div><Badge tone="neutral">4 lanes</Badge></div><div className="grid gap-4 md:grid-cols-2">{laneData.map((lane) => <LaneCard key={lane.id} {...lane} selected={lane.id === order.paymentLane} />)}</div></section>

          <Card className="overflow-hidden border-forest-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest-100 bg-forest-50 px-5 py-4 sm:px-6"><div><p className="eyebrow">Active obligation</p><h2 className="mt-1 font-display text-lg font-extrabold text-ink-950">External Cash · {order.title}</h2></div><div className="text-right"><strong className="font-display text-2xl font-extrabold text-ink-950">{formatPeso(order.amount)}</strong><p className="text-[10px] font-bold text-forest-700">Buyer → Provider directly</p></div></div>
            <div className="p-5 sm:p-6">
              <div className="grid items-stretch gap-3 md:grid-cols-[1fr_48px_1fr]">
                <ReportSide actor="Buyer" person={order.buyer.name} initials={order.buyer.avatar} reported={order.buyerCashReported} label="Cash paid" tone="mango" active={role === "buyer"} />
                <div className="grid place-items-center"><span className="grid h-10 w-10 place-items-center rounded-full border border-ink-100 bg-cream-50 text-ink-400"><ArrowRight className="h-4 w-4 md:rotate-0 rotate-90" /></span></div>
                <ReportSide actor="Provider" person={order.provider.name} initials={order.provider.avatar} reported={order.providerCashReported} label="Cash received" tone="forest" active={role === "provider"} />
              </div>

              <div className={cn("mt-5 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center", order.cashStatus === "mutually_acknowledged" ? "border-forest-200 bg-forest-50" : order.cashStatus === "mismatch" ? "border-coral-200 bg-coral-50" : "border-mango-200 bg-mango-50")}><span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", order.cashStatus === "mutually_acknowledged" ? "bg-forest-600 text-white" : order.cashStatus === "mismatch" ? "bg-coral-500 text-white" : "bg-mango-300 text-ink-950")}>{order.cashStatus === "mutually_acknowledged" ? <Check className="h-5 w-5" /> : order.cashStatus === "mismatch" ? <AlertTriangle className="h-5 w-5" /> : <RefreshCcw className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-extrabold capitalize text-ink-950">{cashStatusTitle(order.cashStatus)}</p><p className="mt-1 text-xs leading-5 text-ink-600">{cashStatusMeaning(order.cashStatus)}</p></div>{canReport && !myReported && order.cashStatus !== "mismatch" && <Button loading={reportCash.isPending} onClick={() => reportCash.mutate(role as "buyer" | "provider")}>{role === "buyer" ? "Report cash paid" : "Report cash received"}</Button>}</div>

              <div className="mt-5 flex flex-col gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2 text-xs leading-5 text-ink-500"><Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" /><span><strong className="text-ink-800">Work is still {order.workStatus.replaceAll("_", " ")}.</strong> A cash report never completes Work.</span></div><Button variant="danger" size="sm" loading={reportMismatch.isPending} onClick={() => reportMismatch.mutate()}>Report a mismatch</Button></div>
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card><CardHeader><div><p className="eyebrow">Obligation anatomy</p><CardTitle className="mt-1">What you should always know</CardTitle></div></CardHeader><CardContent><dl className="space-y-4"><Definition icon={HandCoins} term="Purpose" detail="Invitation layout and one revision" /><Definition icon={UserCheck2} term="Who pays whom" detail="Rosa pays Maya directly" /><Definition icon={LockKeyhole} term="Custody" detail="None — Serbizyu holds ₱0" /><Definition icon={FileCheck2} term="Evidence" detail="Two independent attestations" /></dl></CardContent></Card>
          <Card className="overflow-hidden bg-ink-950 text-white"><div className="p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-forest-500/20 text-forest-300"><FlaskConical className="h-5 w-5" /></span><h3 className="mt-4 font-display text-lg font-extrabold">Sandbox means simulated.</h3><p className="mt-2 text-xs leading-5 text-white/55">Direct Digital and Tiwala use synthetic events only. Labels remain visible, and release controls stay guarded.</p><Button className="mt-5 w-full bg-white text-ink-950 hover:bg-cream-100" onClick={() => window.location.hash = "#/patterns"}>Open payment patterns</Button></div></Card>
        </aside>
      </section>
    </main>
  );
}

function LaneCard({ title, icon: Icon, status, description, detail, tone, available, selected }: (typeof laneData)[number] & { selected: boolean }) {
  const toneStyles: Record<string, string> = { forest: "bg-forest-50 text-forest-700", blue: "bg-blue-50 text-blue-700", mango: "bg-mango-50 text-mango-700", violet: "bg-violet-50 text-violet-700" };
  return <Card className={cn("relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lift", selected && "border-forest-300 ring-2 ring-forest-100")}><div className="flex items-start justify-between gap-3"><span className={cn("grid h-11 w-11 place-items-center rounded-2xl", toneStyles[tone])}><Icon className="h-5 w-5" /></span><Badge tone={available ? "forest" : "sandbox"}>{!available && <FlaskConical className="h-3 w-3" />}{status}</Badge></div><h3 className="mt-4 font-display text-base font-extrabold text-ink-950">{title}</h3><p className="mt-2 text-xs leading-5 text-ink-500">{description}</p><p className="mt-4 border-t border-ink-100 pt-3 text-[10px] font-bold text-ink-400">{detail}</p>{selected && <span className="absolute bottom-4 right-4 grid h-6 w-6 place-items-center rounded-full bg-forest-600 text-white"><Check className="h-3.5 w-3.5" /></span>}</Card>;
}

function ReportSide({ actor, person, initials, reported, label, tone, active }: { actor: string; person: string; initials: string; reported: boolean; label: string; tone: "forest" | "mango"; active: boolean }) {
  return <div className={cn("rounded-2xl border p-4", active ? "border-ink-300 bg-white shadow-soft" : "border-ink-100 bg-cream-50")}><div className="flex items-center gap-3"><Avatar initials={initials} tone={tone} /><div><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-ink-400">{actor}{active ? " · your view" : ""}</p><p className="text-sm font-extrabold text-ink-900">{person}</p></div></div><div className={cn("mt-4 rounded-xl p-3", reported ? "bg-forest-50" : "bg-ink-100")}><p className={cn("text-xs font-extrabold", reported ? "text-forest-700" : "text-ink-500")}>{reported ? `✓ ${label} reported` : `${label} not reported`}</p><p className="mt-1 text-[10px] text-ink-400">{reported ? "Attestation recorded · not independent proof" : "Silence is not proof"}</p></div></div>;
}

function Definition({ icon: Icon, term, detail }: { icon: typeof HandCoins; term: string; detail: string }) { return <div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-500"><Icon className="h-4 w-4" /></span><div><dt className="text-[10px] font-extrabold uppercase tracking-[.12em] text-ink-400">{term}</dt><dd className="mt-1 text-xs font-bold text-ink-800">{detail}</dd></div></div>; }
function cashStatusTitle(status: string) { return status === "not_reported" ? "No cash reports yet" : status.replaceAll("_", " "); }
function cashStatusMeaning(status: string) { if (status === "not_reported") return "Buyer and Provider can report independently. Silence is not proof."; if (status === "buyer_reported") return "Buyer reported cash paid; Provider report is still missing. Work is unchanged."; if (status === "provider_reported") return "Provider reported cash received; Buyer report is still missing. Work is unchanged."; if (status === "mutually_acknowledged") return "Both independent reports match. This does not complete Work."; return "Reports do not match. Support review is open; history is preserved."; }
